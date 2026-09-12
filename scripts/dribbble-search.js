#!/usr/bin/env node
// dribbble-search.js — list designer shots matching a query as JSON.
// REFERENCE-ONLY. Designers retain copyright; do NOT use these images
// in deliverables. For visual research only — informs art-direction.
//
//   node scripts/dribbble-search.js "<query>" [--n=24] [--popular] [--recent]
//
// Output: JSON {query, count, results:[{id,title,image_url,thumb_url,shot_url,designer,likes}]}

const puppeteer = require('puppeteer-core');

const QUERY = process.argv[2];
if (!QUERY) {
  console.error("usage: dribbble-search.js <query> [--n=24] [--popular] [--recent]");
  process.exit(2);
}
const flags = {};
for (const a of process.argv.slice(3)) {
  const m = a.match(/^--(\w+)(?:=(.+))?$/);
  if (m) flags[m[1]] = m[2] === undefined ? true : m[2];
}
const N = parseInt(flags.n || 24);
// Dribbble sort: ?sort=popular (default) or ?sort=recent
const sort = flags.recent ? 'recent' : 'popular';

const { resolveChrome } = require('./lib/chrome.cjs');
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const SEARCH_URL = `https://dribbble.com/search/shots/${encodeURIComponent(QUERY.trim())}?sort=${sort}`;

(async () => {
  const b = await puppeteer.launch({ executablePath: resolveChrome(), headless: 'new',
    args: ['--no-sandbox','--disable-blink-features=AutomationControlled']});
  const p = await b.newPage();
  await p.setUserAgent(UA);
  await p.setViewport({ width: 1440, height: 900 });

  console.error(`[dribbble] searching: ${SEARCH_URL}`);
  await p.goto(SEARCH_URL, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 2000));

  // Scroll to load more shots
  let prev = 0, stable = 0;
  while (stable < 3) {
    const count = await p.evaluate(() => document.querySelectorAll('a[href*="/shots/"]').length);
    if (count >= N * 2) break;
    if (count === prev) stable++; else { stable = 0; prev = count; }
    await p.evaluate(() => window.scrollBy(0, 1800));
    await new Promise(r => setTimeout(r, 1200));
  }

  const shots = await p.evaluate(() => {
    const out = [];
    const seen = new Set();
    document.querySelectorAll('a[href*="/shots/"]').forEach(a => {
      const m = a.href.match(/\/shots\/(\d+)(?:-([\w-]+))?/);
      if (!m || seen.has(m[1])) return;
      seen.add(m[1]);
      const img = a.querySelector('img') || a.closest('li, article, figure, div')?.querySelector('img');
      const src = img?.src || img?.getAttribute('data-src') || '';
      // Dribbble serves multi-size: bump to "large" or "1x" full
      const upgrade = u => u.replace(/_4x\./, '_1x.').replace(/_2x\./, '_1x.').replace(/thumb-/, 'still-');
      // Find the designer name (nearby author link)
      const authorA = a.closest('li, article')?.querySelector('a[href^="/"][href*="/"]:not([href*="/shots/"])');
      const designer = authorA?.textContent?.trim() || null;
      out.push({
        id: m[1],
        slug: m[2] || '',
        title: (img?.alt || a.getAttribute('aria-label') || '').slice(0, 200),
        image_url: upgrade(src),
        thumb_url: src,
        shot_url: 'https://dribbble.com' + a.getAttribute('href').split('?')[0],
        designer,
      });
    });
    return out;
  });

  await b.close();
  const results = shots.slice(0, N);
  console.log(JSON.stringify({
    query: QUERY, sort, count: results.length, results,
    license_note: 'Dribbble shots are designer portfolios — copyrights retained by their creators. REFERENCE / mood-board use only. Never use in deliverables.',
  }, null, 2));
})().catch(e => { console.error('[dribbble]', e.message); process.exit(1); });
