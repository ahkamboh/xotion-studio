#!/usr/bin/env node
// vimeo-search.js — list motion-design videos as reference (Vimeo Staff Picks
// or generic Vimeo search). REFERENCE-ONLY: motion designers retain copyright.
//
//   node scripts/vimeo-search.js "<query>" [--n=12] [--staffpicks]
//   node scripts/vimeo-search.js ""        --staffpicks --n=20
//
// Output: JSON {query, count, results:[{id,title,description,thumb_url,video_url,duration,creator}]}

const puppeteer = require('puppeteer-core');

const QUERY = (process.argv[2] || '').trim();
const flags = {};
for (const a of process.argv.slice(3)) {
  const m = a.match(/^--(\w+)(?:=(.+))?$/);
  if (m) flags[m[1]] = m[2] === undefined ? true : m[2];
}
const N = parseInt(flags.n || 12);
const STAFF = !!flags.staffpicks;

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

let URL_;
if (STAFF && !QUERY) {
  URL_ = `https://vimeo.com/channels/staffpicks`;
} else if (STAFF) {
  URL_ = `https://vimeo.com/search?q=${encodeURIComponent(QUERY)}&type=staffpicks`;
} else {
  URL_ = `https://vimeo.com/search?q=${encodeURIComponent(QUERY)}`;
}

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox','--disable-blink-features=AutomationControlled']});
  const p = await b.newPage();
  await p.setUserAgent(UA);
  await p.setViewport({ width: 1440, height: 900 });

  console.error(`[vimeo] loading: ${URL_}`);
  await p.goto(URL_, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 2500));

  // Scroll to load more
  let prev = 0, stable = 0;
  while (stable < 3) {
    const count = await p.evaluate(() => document.querySelectorAll('a[href^="/"]').length);
    if (count >= N * 4) break;
    if (count === prev) stable++; else { stable = 0; prev = count; }
    await p.evaluate(() => window.scrollBy(0, 1600));
    await new Promise(r => setTimeout(r, 1200));
  }

  const videos = await p.evaluate(() => {
    const out = [];
    const seen = new Set();
    document.querySelectorAll('a[href]').forEach(a => {
      // Vimeo video URLs: /<id> (numeric) or /channels/<chan>/<id>
      const href = a.getAttribute('href') || '';
      const m = href.match(/^\/(?:channels\/[^/]+\/)?(\d{6,})(?:[\/?#].*)?$/);
      if (!m || seen.has(m[1])) return;
      const id = m[1];
      seen.add(id);
      const img = a.querySelector('img') || a.closest('div,li,article')?.querySelector('img');
      const src = img?.src || img?.getAttribute('data-src') || '';
      // Upgrade thumbnail size: Vimeo thumbs end in _<w>x<h> or _<size>; bump to 960
      const upgrade = u => u
        .replace(/_(?:295x166|640x360|480x270)\./, '_960x540.')
        .replace(/&w=\d+/, '&w=1280');
      const title = (img?.alt || a.getAttribute('aria-label') || '').slice(0, 200);
      out.push({
        id, title,
        thumb_url:    src,
        image_url:    upgrade(src),
        video_url:    'https://vimeo.com/' + id,
      });
    });
    return out;
  });

  await b.close();
  const results = videos.slice(0, N);
  console.log(JSON.stringify({
    query: QUERY,
    mode: STAFF ? 'staffpicks' : 'search',
    count: results.length,
    results,
    license_note: 'Vimeo videos are creator copyrights. REFERENCE ONLY — use to study motion design (timing, easing, composition). Never embed/reuse the source.',
  }, null, 2));
})().catch(e => { console.error('[vimeo]', e.message); process.exit(1); });
