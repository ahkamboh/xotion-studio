#!/usr/bin/env node
// pinterest-search.js — list pins matching a query as JSON.
// REFERENCE-ONLY tool. The output (titles, descriptions, image URLs, palette
// data) is meant for the art-director agent to study trends + style choices.
// We NEVER use Pinterest images directly in deliverables — licensing on
// Pinterest is per-pin, often unauthorized reposts, never commercial-safe.
//
//   node scripts/pinterest-search.js "<query>" [--n=30]
//
// Output: JSON {query, count, results:[{id,title,description,image_url,thumb_url,pin_url}]}

const puppeteer = require('puppeteer-core');

const QUERY = process.argv[2];
if (!QUERY) {
  console.error("usage: pinterest-search.js <query> [--n=30]");
  process.exit(2);
}
const flags = {};
for (const a of process.argv.slice(3)) {
  const m = a.match(/^--(\w+)(?:=(.+))?$/);
  if (m) flags[m[1]] = m[2] === undefined ? true : m[2];
}
const N = parseInt(flags.n || 30);

const { resolveChrome } = require('./lib/chrome.cjs');
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const SEARCH_URL = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(QUERY.trim())}`;

(async () => {
  const b = await puppeteer.launch({ executablePath: resolveChrome(), headless: 'new',
    args:['--no-sandbox','--disable-blink-features=AutomationControlled']});
  const p = await b.newPage();
  await p.setUserAgent(UA);
  await p.setViewport({ width: 1440, height: 900 });

  console.error(`[pinterest] searching: ${SEARCH_URL}`);
  await p.goto(SEARCH_URL, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 2000));

  // Scroll to load more pins until we have enough or hit a wall
  const seen = new Set();
  let lastSize = 0, stable = 0;
  while (seen.size < N && stable < 3) {
    const ids = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('a[href*="/pin/"]').forEach(a => {
        const m = a.href.match(/\/pin\/(\d+)\//);
        if (m) out.push(m[1]);
      });
      return [...new Set(out)];
    });
    ids.forEach(i => seen.add(i));
    await p.evaluate(() => window.scrollBy(0, 1800));
    await new Promise(r => setTimeout(r, 1200));
    if (seen.size === lastSize) stable++;
    else { stable = 0; lastSize = seen.size; }
  }
  console.error(`[pinterest] found ${seen.size} unique pin IDs (target ${N})`);

  // Extract structured data for each pin link visible on the page
  const pins = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('a[href*="/pin/"]').forEach(a => {
      const m = a.href.match(/\/pin\/(\d+)\//);
      if (!m) return;
      const id = m[1];
      const img = a.querySelector('img') || a.closest('div')?.querySelector('img');
      const src = img?.src || img?.getAttribute('srcset')?.split(' ')[0] || '';
      // Pinterest serves multiple sizes via i.pinimg.com path; bump to highest by rewriting
      // /236x/ → /originals/ when possible (originals not always present, /736x/ is safe).
      const upgrade = u => u
        .replace(/\/(75x75_RS|140x140|170x|236x|474x|564x)\//, '/736x/')
        .replace(/_RS\./, '.');
      return out.push({
        id,
        pin_url: 'https://www.pinterest.com' + (a.getAttribute('href') || `/pin/${id}/`),
        image_url: upgrade(src),
        thumb_url: src,
        title: (img?.alt || a.getAttribute('aria-label') || '').slice(0, 200),
      });
    });
    return out;
  });

  // Dedupe by id, take first N
  const byId = new Map();
  pins.forEach(p => { if (!byId.has(p.id)) byId.set(p.id, p); });
  const results = [...byId.values()].slice(0, N);

  await b.close();
  console.log(JSON.stringify({
    query: QUERY,
    count: results.length,
    results,
    license_note: 'Pinterest images have UNKNOWN per-pin licenses — often unauthorized reposts. NEVER use these directly in deliverables. Reference / mood-board use only.',
  }, null, 2));
})().catch(e => { console.error('[pinterest]', e.message); process.exit(1); });
