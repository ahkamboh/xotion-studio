#!/usr/bin/env node
// pixabay-search-grab.js — search Pixabay (music OR sfx), pick top result,
// extract the audio CDN URL, download it. End-to-end automated despite
// Pixabay's Cloudflare protection (real Chrome via puppeteer-core).
//
//   node scripts/pixabay-search-grab.js <music|sfx> "<query>" <out.mp3>
//
// Pixabay's /music/ and /sound-effects/ catalogs are NOT exposed by their
// public JSON API. This is the only path to fully automated music+SFX fetch.
//
// License logged to <out>.license.json. Pixabay Content License = commercial OK, no attribution.

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const https = require('https');

const TYPE  = process.argv[2];
const QUERY = process.argv[3];
const OUT   = process.argv[4];
if (!TYPE || !QUERY || !OUT) {
  console.error("usage: pixabay-search-grab.js <music|sfx> <query> <out.mp3>");
  process.exit(2);
}
if (!['music', 'sfx'].includes(TYPE)) {
  console.error(`type must be 'music' or 'sfx', got '${TYPE}'`);
  process.exit(2);
}

const { resolveChrome } = require('./lib/chrome.cjs');
const SEARCH_PATH = TYPE === 'music' ? '/music/search/' : '/sound-effects/search/';
// QUERY may be a search term OR a direct Pixabay detail URL — agent often passes
// the URL after vetting candidates via pixabay-search.sh.
const IS_URL = /^https?:\/\//.test(QUERY);
const SEARCH_URL = IS_URL ? QUERY : `https://pixabay.com${SEARCH_PATH}${encodeURIComponent(QUERY.trim())}/`;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: resolveChrome(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124 Safari/537.36"
  );
  await page.setViewport({ width: 1440, height: 900 });

  let detailUrl;
  if (IS_URL) {
    detailUrl = QUERY;
    console.error(`[pixabay-search-grab/${TYPE}] direct URL: ${detailUrl}`);
  } else {
    console.error(`[pixabay-search-grab/${TYPE}] searching: ${SEARCH_URL}`);
    await page.goto(SEARCH_URL, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 1500));
    const detailPaths = TYPE === 'music' ? /\/music\/[^/"']+-\d+\//g
                                         : /\/sound-effects\/[^/"']+-\d+\//g;
    const html = await page.content();
    const matches = [...new Set(html.match(detailPaths) || [])].filter(p => !p.includes('/search/'));
    if (!matches.length) {
      console.error(`[pixabay-search-grab/${TYPE}] no results for '${QUERY}'`);
      await browser.close(); process.exit(4);
    }
    detailUrl = 'https://pixabay.com' + matches[0];
    console.error(`[pixabay-search-grab/${TYPE}] top result: ${detailUrl}`);
  }

  // Capture any audio CDN URLs hit during page load + play
  const audioUrls = new Set();
  page.on('request', req => {
    const u = req.url();
    if (u.includes('cdn.pixabay.com/audio/') || /cdn\.pixabay\.com.*\.mp3/i.test(u)) {
      audioUrls.add(u);
    }
  });
  page.on('response', async res => {
    const ct = res.headers()['content-type'] || '';
    if (ct.startsWith('audio/')) audioUrls.add(res.url());
  });

  await page.goto(detailUrl, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 1500));

  // Try clicking play button to force the audio request
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label*="Play" i], button[aria-label*="play" i]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  // Read inline <audio> tags / JSON-LD as backup
  const inline = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('audio,source').forEach(a => { if (a.src) out.push(a.src); });
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      try {
        const j = JSON.parse(s.textContent);
        const walk = o => {
          if (!o || typeof o !== 'object') return;
          for (const v of Object.values(o)) {
            if (typeof v === 'string' && /\.mp3/i.test(v)) out.push(v);
            else if (typeof v === 'object') walk(v);
          }
        };
        walk(j);
      } catch {}
    });
    return out;
  });
  inline.forEach(u => audioUrls.add(u));

  // Metadata for license log
  const meta = await page.evaluate(() => {
    const get = sel => document.querySelector(sel)?.content || '';
    return {
      title:    document.title,
      og_title: get('meta[property="og:title"]'),
      og_url:   get('meta[property="og:url"]'),
    };
  });

  await browser.close();

  if (!audioUrls.size) {
    console.error(`[pixabay-search-grab/${TYPE}] FAIL — no audio URL captured on detail page`);
    process.exit(5);
  }
  const best = Array.from(audioUrls).find(u => u.includes('/download/')) || Array.from(audioUrls)[0];

  // Download
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(OUT);
    https.get(best, {
      headers: {
        'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        'Referer': detailUrl,
      }
    }, resp => {
      if (resp.statusCode >= 400) { reject(new Error(`HTTP ${resp.statusCode}`)); return; }
      resp.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });

  const licensePath = OUT.replace(/\.[^.]+$/, '') + '.license.json';
  fs.writeFileSync(licensePath, JSON.stringify({
    source:      `pixabay-${TYPE}`,
    license:     'Pixabay Content License (commercial-OK, no attribution required)',
    license_url: 'https://pixabay.com/service/license-summary/',
    query:       QUERY,
    source_url:  detailUrl,
    title:       meta.og_title || meta.title,
    audio_url:   best,
    captured_via:'puppeteer-core + Chrome (Pixabay music/SFX has no public API)',
  }, null, 2));

  const size = fs.statSync(OUT).size;
  console.error(`[pixabay-search-grab/${TYPE}] ✓ '${QUERY}' -> ${OUT} (${(size/1024).toFixed(0)} KB)`);
})().catch(e => {
  console.error("[pixabay-search-grab] error:", e.message);
  process.exit(1);
});
