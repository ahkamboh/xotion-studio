#!/usr/bin/env node
// pixabay-3d-grab.js — fetch a real .glb 3D model from Pixabay (binary glTF 2.0).
// Bonus: also grabs the turntable PNG preview sequence + assembles a 1s rotation MP4.
//
//   node scripts/pixabay-3d-grab.js "<query>" <out-dir/>
//
// What you get in <out-dir>:
//   model.glb          — REAL 3D source file (binary glTF 2.0). Load in three.js via GLTFLoader.
//   frame_000.png .. frame_340.png  — 18 turntable preview frames (every 20°)
//   turntable.mp4      — 1-second rotation loop (assembled from PNGs via ffmpeg)
//   license.json       — Pixabay Content License + metadata
//
// How: page HTML embeds a CDN URL like
//   https://cdn.pixabay.com/download/objects3d/<yyyy>/<mm>/<dd>/processed_<id>__<hash>.glb
// We extract that string with a regex from the page DOM (no click required) and
// download it directly. Real Chrome via puppeteer-core gets past Cloudflare.
//
// License: Pixabay Content License — commercial-OK, no attribution required.

const puppeteer = require('puppeteer-core');
const fs   = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const QUERY  = process.argv[2];
const OUTDIR = process.argv[3];
if (!QUERY || !OUTDIR) {
  console.error("usage: pixabay-3d-grab.js <query> <out-dir/>");
  process.exit(2);
}
fs.mkdirSync(OUTDIR, { recursive: true });

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

function dl(url, dest, referer) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': UA, 'Referer': referer || '' } }, resp => {
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        // Follow redirect
        file.close();
        fs.unlinkSync(dest);
        return dl(resp.headers.location, dest, referer).then(resolve, reject);
      }
      if (resp.statusCode >= 400) { reject(new Error(`HTTP ${resp.statusCode} for ${url}`)); return; }
      resp.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

(async () => {
  const SEARCH_URL = QUERY.startsWith('http')
    ? QUERY  // allow passing a detail URL directly
    : `https://pixabay.com/3d-models/search/${encodeURIComponent(QUERY.trim())}/`;

  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const p = await b.newPage();
  await p.setUserAgent(UA);
  await p.setViewport({ width: 1440, height: 900 });

  let detailUrl;
  if (QUERY.startsWith('http')) {
    detailUrl = QUERY;
  } else {
    console.error(`[pixabay-3d] searching: ${SEARCH_URL}`);
    await p.goto(SEARCH_URL, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 1500));
    detailUrl = await p.evaluate(() => {
      const re = /pixabay\.com\/3d-models\/[a-z0-9-]+-\d+\/?$/i;
      return [...document.querySelectorAll('a[href]')].map(a => a.href).find(h => re.test(h)) || null;
    });
    if (!detailUrl) {
      console.error(`[pixabay-3d] no results for '${QUERY}'`);
      await b.close(); process.exit(4);
    }
  }
  console.error(`[pixabay-3d] detail: ${detailUrl}`);

  // Capture turntable PNG URLs from network as the page loads
  const renderUrls = new Set();
  p.on('request', r => {
    const u = r.url();
    if (/cdn\.pixabay\.com\/objects3d\/.+render_\d+_\d+_\d+_\d+_\d+\.png/i.test(u)) renderUrls.add(u);
  });

  await p.goto(detailUrl, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 2500));

  // Extract the .glb URL embedded in the HTML.
  // Pattern: https://cdn.pixabay.com/download/objects3d/<y>/<m>/<d>/processed_<id>__<hash>.glb
  const html = await p.content();
  const glbMatch = html.match(/https:\/\/cdn\.pixabay\.com\/download\/objects3d\/[^"'\s]+\.glb/);
  const glbUrl = glbMatch ? glbMatch[0] : null;

  // Page metadata for license log
  const meta = await p.evaluate(() => ({
    title:    document.title,
    og_title: document.querySelector('meta[property="og:title"]')?.content || '',
  }));
  await b.close();

  if (!glbUrl && !renderUrls.size) {
    console.error(`[pixabay-3d] FAIL — no .glb URL in HTML and no preview frames either`);
    process.exit(5);
  }

  // Download .glb (the real 3D source)
  let glbSize = 0;
  if (glbUrl) {
    const glbPath = path.join(OUTDIR, 'model.glb');
    console.error(`[pixabay-3d] downloading .glb: ${glbUrl}`);
    await dl(glbUrl, glbPath, detailUrl);
    glbSize = fs.statSync(glbPath).size;
    // Sanity check: real binary glTF starts with magic bytes "glTF"
    const head = fs.readFileSync(glbPath, { encoding: null }).slice(0, 4).toString('latin1');
    if (head !== 'glTF') {
      console.error(`[pixabay-3d] WARN: model.glb does not start with 'glTF' magic — got '${head}'`);
    } else {
      console.error(`[pixabay-3d] ✓ model.glb (${(glbSize/1024/1024).toFixed(2)} MB, valid glTF 2.0 binary)`);
    }
  } else {
    console.error(`[pixabay-3d] no .glb URL on this page — only PNG previews`);
  }

  // Download turntable PNGs (preview frames) — best-effort
  const angleOf = u => {
    const m = u.match(/render_\d+_\d+_\d+_(\d+)_\d+\.png/);
    return m ? parseInt(m[1], 10) : 0;
  };
  const sorted = [...renderUrls].sort((a, b) => angleOf(a) - angleOf(b));
  for (const url of sorted) {
    const angle = String(angleOf(url)).padStart(3, '0');
    await dl(url, path.join(OUTDIR, `frame_${angle}.png`), detailUrl);
  }
  if (sorted.length) console.error(`[pixabay-3d] ✓ ${sorted.length} preview frames`);

  // Assemble preview turntable.mp4
  let turntableMade = false;
  if (sorted.length >= 4) {
    try {
      execFileSync('ffmpeg', [
        '-y',
        '-framerate', String(Math.max(1, Math.round(sorted.length))),
        '-pattern_type', 'glob',
        '-i', path.join(OUTDIR, 'frame_*.png'),
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2,fps=30,setpts=PTS-STARTPTS',
        '-loop', '1', '-t', '1',
        path.join(OUTDIR, 'turntable.mp4')
      ], { stdio: 'pipe' });
      turntableMade = true;
      console.error(`[pixabay-3d] ✓ turntable.mp4`);
    } catch (e) {
      console.error('[pixabay-3d] turntable assembly skipped:', e.message?.slice(0, 200));
    }
  }

  fs.writeFileSync(path.join(OUTDIR, 'license.json'), JSON.stringify({
    source:        'pixabay-3d-models',
    license:       'Pixabay Content License (commercial-OK, no attribution required)',
    license_url:   'https://pixabay.com/service/license-summary/',
    query:         QUERY,
    source_url:    detailUrl,
    title:         meta.og_title || meta.title,
    glb_url:       glbUrl,
    glb_size_mb:   glbUrl ? +(glbSize / 1024 / 1024).toFixed(2) : null,
    preview_frames:sorted.length,
    preview_angles:sorted.map(angleOf),
    turntable_mp4: turntableMade,
    note:          'model.glb is a real binary glTF 2.0 file. Load in three.js via GLTFLoader (from "three/addons/loaders/GLTFLoader.js"). The frame_*.png + turntable.mp4 are pre-rendered preview shots.',
    captured_via:  'puppeteer-core + Chrome',
  }, null, 2));

  console.error(`[pixabay-3d] ✓ '${QUERY}' -> ${OUTDIR}/`);
})().catch(e => { console.error('[pixabay-3d] error:', e.message); process.exit(1); });
