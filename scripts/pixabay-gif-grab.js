#!/usr/bin/env node
// pixabay-gif-grab.js — search Pixabay /gifs/, pick top result, extract the
// CDN .gif URL, download.
//
//   node scripts/pixabay-gif-grab.js "<query>" <out.gif>
//
// Pixabay has no public API for GIFs. Real Chrome via puppeteer-core.
// License: Pixabay Content License (commercial-OK, no attribution).

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const https = require('https');

const QUERY = process.argv[2];
const OUT   = process.argv[3];
if (!QUERY || !OUT) {
  console.error("usage: pixabay-gif-grab.js <query> <out.gif>");
  process.exit(2);
}
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const IS_URL = /^https?:\/\//.test(QUERY);
const SEARCH_URL = IS_URL ? QUERY : `https://pixabay.com/gifs/search/${encodeURIComponent(QUERY.trim())}/`;

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const p = await b.newPage();
  await p.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36");
  await p.setViewport({ width: 1440, height: 900 });

  let detailUrl;
  if (IS_URL) {
    detailUrl = QUERY;
    console.error(`[pixabay-gif] direct URL: ${detailUrl}`);
  } else {
    console.error(`[pixabay-gif] searching: ${SEARCH_URL}`);
    await p.goto(SEARCH_URL, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 1500));
    detailUrl = await p.evaluate(() => {
      const re = /pixabay\.com\/gifs\/[a-z0-9-]+-\d+\/?$/i;
      return [...document.querySelectorAll('a[href]')].map(a => a.href).find(h => re.test(h)) || null;
    });
    if (!detailUrl) { console.error(`[pixabay-gif] no results for '${QUERY}'`); await b.close(); process.exit(4); }
    console.error(`[pixabay-gif] top: ${detailUrl}`);
  }

  // Capture animation CDN URLs (the actual GIF)
  const gifUrls = new Set();
  p.on('request', r => {
    const u = r.url();
    if (/cdn\.pixabay\.com\/animation\/.+\.gif(\?|$)/i.test(u)) gifUrls.add(u);
  });

  await p.goto(detailUrl, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 2000));

  // Page metadata
  const meta = await p.evaluate(() => ({
    title:    document.title,
    og_title: document.querySelector('meta[property="og:title"]')?.content || '',
  }));
  await b.close();

  if (!gifUrls.size) {
    console.error(`[pixabay-gif] FAIL — no GIF URL captured`);
    process.exit(5);
  }
  // Prefer the highest-res (Pixabay serves both _512.gif and _256.gif)
  const sorted = [...gifUrls].sort((a, b) => {
    const sz = u => (parseInt((u.match(/_(\d+)\.gif/) || [])[1]) || 0);
    return sz(b) - sz(a);
  });
  const best = sorted[0];
  console.error(`[pixabay-gif] downloading: ${best}`);

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

  fs.writeFileSync(OUT.replace(/\.[^.]+$/, '') + '.license.json', JSON.stringify({
    source:      'pixabay-gif',
    license:     'Pixabay Content License (commercial-OK, no attribution required)',
    license_url: 'https://pixabay.com/service/license-summary/',
    query:       QUERY,
    source_url:  detailUrl,
    title:       meta.og_title || meta.title,
    cdn_url:     best,
    captured_via:'puppeteer-core + Chrome (Pixabay GIFs have no public API)',
  }, null, 2));

  const size = fs.statSync(OUT).size;
  console.error(`[pixabay-gif] ✓ '${QUERY}' -> ${OUT} (${(size/1024).toFixed(0)} KB)`);
})().catch(e => { console.error('[pixabay-gif] error:', e.message); process.exit(1); });
