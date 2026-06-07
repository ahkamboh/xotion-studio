#!/usr/bin/env node
// pixabay-3d-grab.js — fetch a Pixabay "3D model" (actually a 15-frame
// turntable PNG sequence — Pixabay serves rendered images, not .glb/.obj).
//
//   node scripts/pixabay-3d-grab.js "<query>" <out-dir/>
//
// Output: <out-dir>/frame_000.png .. frame_280.png (15 angles × 20°)
//         <out-dir>/turntable.mp4  — assembled rotation as a 1s loop
//         <out-dir>/license.json   — metadata
//
// Use cases in xotion-studio:
//   - Animate rotation in motion graphics (cycle frames at 30 fps = 1s loop)
//   - Composite a single angle as a transparent-looking product shot
//   - HyperFrames overlay via <img src="frame_140.png">

const puppeteer = require('puppeteer-core');
const fs = require('fs');
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
const SEARCH_URL = `https://pixabay.com/3d-models/search/${encodeURIComponent(QUERY.trim())}/`;

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const p = await b.newPage();
  await p.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36");
  await p.setViewport({ width: 1440, height: 900 });

  console.error(`[pixabay-3d] searching: ${SEARCH_URL}`);
  await p.goto(SEARCH_URL, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 1500));

  const detailUrl = await p.evaluate(() => {
    const re = /pixabay\.com\/3d-models\/[a-z0-9-]+-\d+\/?$/i;
    return [...document.querySelectorAll('a[href]')].map(a => a.href).find(h => re.test(h)) || null;
  });
  if (!detailUrl) { console.error(`[pixabay-3d] no results for '${QUERY}'`); await b.close(); process.exit(4); }
  console.error(`[pixabay-3d] top: ${detailUrl}`);

  // Capture every objects3d render URL
  const renderUrls = new Set();
  p.on('request', r => {
    const u = r.url();
    if (/cdn\.pixabay\.com\/objects3d\/.+render_\d+_\d+_\d+_\d+_\d+\.png/i.test(u)) renderUrls.add(u);
  });

  await p.goto(detailUrl, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 3000));

  const meta = await p.evaluate(() => ({
    title:    document.title,
    og_title: document.querySelector('meta[property="og:title"]')?.content || '',
  }));
  await b.close();

  if (!renderUrls.size) {
    console.error(`[pixabay-3d] FAIL — no render URLs captured`);
    process.exit(5);
  }

  // Sort by the rotation-Y angle (the second-to-last number in the filename)
  // render_<w>_<h>_<rotX>_<rotY>_<rotZ>.png
  const angleOf = u => {
    const m = u.match(/render_\d+_\d+_\d+_(\d+)_\d+\.png/);
    return m ? parseInt(m[1], 10) : 0;
  };
  const sorted = [...renderUrls].sort((a, b) => angleOf(a) - angleOf(b));
  console.error(`[pixabay-3d] ${sorted.length} frames captured (angles: ${sorted.map(angleOf).join(', ')})`);

  // Download each
  async function dl(url, dest) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https.get(url, {
        headers: {
          'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
          'Referer': detailUrl,
        }
      }, resp => {
        if (resp.statusCode >= 400) { reject(new Error(`HTTP ${resp.statusCode} for ${url}`)); return; }
        resp.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', reject);
    });
  }

  for (const url of sorted) {
    const angle = String(angleOf(url)).padStart(3, '0');
    const dest = path.join(OUTDIR, `frame_${angle}.png`);
    await dl(url, dest);
  }
  console.error(`[pixabay-3d] downloaded ${sorted.length} frames`);

  // Assemble into a 1-second mp4 loop (ffmpeg)
  // Glob pattern: frame_*.png at the sorted angles
  const turntablePath = path.join(OUTDIR, 'turntable.mp4');
  try {
    execFileSync('ffmpeg', [
      '-y',
      '-framerate', String(Math.max(1, Math.round(sorted.length))), // N frames over 1s
      '-pattern_type', 'glob',
      '-i', path.join(OUTDIR, 'frame_*.png'),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2,fps=30,setpts=PTS-STARTPTS',
      '-loop', '1', '-t', '1',
      turntablePath
    ], { stdio: 'pipe' });
    console.error(`[pixabay-3d] turntable.mp4 assembled (${sorted.length} fps)`);
  } catch (e) {
    console.error('[pixabay-3d] turntable assembly skipped:', e.message?.slice(0, 200));
  }

  fs.writeFileSync(path.join(OUTDIR, 'license.json'), JSON.stringify({
    source:      'pixabay-3d-models',
    license:     'Pixabay Content License (commercial-OK, no attribution required)',
    license_url: 'https://pixabay.com/service/license-summary/',
    query:       QUERY,
    source_url:  detailUrl,
    title:       meta.og_title || meta.title,
    frames:      sorted.length,
    angles:      sorted.map(angleOf),
    note:        'Pixabay 3D Models serves a turntable PNG sequence (rendered images at 20° increments), NOT source .glb/.obj/.fbx files. For real 3D source files, use Poly Haven or Sketchfab.',
    captured_via:'puppeteer-core + Chrome',
  }, null, 2));

  console.error(`[pixabay-3d] ✓ '${QUERY}' -> ${OUTDIR}/ (frames + turntable.mp4 + license.json)`);
})().catch(e => { console.error('[pixabay-3d] error:', e.message); process.exit(1); });
