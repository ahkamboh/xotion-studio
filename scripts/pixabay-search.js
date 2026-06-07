#!/usr/bin/env node
// pixabay-search.js — list top N candidates for any Pixabay media type as JSON.
// This is the SEARCH-FIRST capability the agent needs: see multiple options,
// vet thumbnails, then call pixabay-grab.sh on the chosen one.
//
//   node scripts/pixabay-search.js <type> "<query>" [--n=10] [--page=1]
//                                  [--orient=horizontal|vertical|all]
//                                  [--category=<cat>] [--colors=<csv>]
//                                  [--editors-choice] [--min-width=N]
//
// Types: photo | illustration | vector | video | music | sfx | gif | 3d
//
// Output: JSON array of {title, thumbnail, source_url, ...type-specific fields}
// Use thumbnails (via Read) to vet relevance, then pass the chosen source_url
// to the type's grab script.

const fs = require('fs');
const https = require('https');
const puppeteer = require('puppeteer-core');

// --- arg parsing ---
const ARGV = process.argv.slice(2);
const TYPE  = ARGV.shift();
const QUERY = ARGV.shift();
if (!TYPE || !QUERY) {
  console.error("usage: pixabay-search.js <type> <query> [flags]");
  process.exit(2);
}
const flags = {};
for (const a of ARGV) {
  const m = a.match(/^--([\w-]+)(?:=(.+))?$/);
  if (m) flags[m[1]] = m[2] === undefined ? true : m[2];
}
const N    = parseInt(flags.n || flags.limit || 10);
const PAGE = parseInt(flags.page || 1);

// --- load API key from .env.pixabay (parent-of-script) ---
const path = require('path');
const ENV = path.join(__dirname, '..', '.env.pixabay');
if (fs.existsSync(ENV)) {
  for (const line of fs.readFileSync(ENV, 'utf8').split('\n')) {
    const m = line.match(/^\s*(\w+)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const KEY = process.env.PIXABAY_API_KEY;

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

function getJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'xotion-studio/1.0' } }, resp => {
      let body = '';
      resp.on('data', d => body += d);
      resp.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(new Error(`bad JSON: ${body.slice(0,200)}`)); }
      });
    }).on('error', reject);
  });
}

// ---- IMAGE API (photo / illustration / vector) ----
async function searchImage(imageType) {
  const params = new URLSearchParams({
    key: KEY, q: QUERY, image_type: imageType,
    per_page: String(Math.min(N, 200)), page: String(PAGE),
    safesearch: 'true',
  });
  if (flags.orient && flags.orient !== 'all') params.set('orientation', flags.orient);
  if (flags.category)        params.set('category', flags.category);
  if (flags.colors)          params.set('colors', flags.colors);
  if (flags['editors-choice']) params.set('editors_choice', 'true');
  if (flags['min-width'])    params.set('min_width', String(flags['min-width']));
  if (flags['min-height'])   params.set('min_height', String(flags['min-height']));
  const data = await getJSON(`https://pixabay.com/api/?${params}`);
  return (data.hits || []).slice(0, N).map(h => ({
    id: h.id,
    title: h.tags,
    thumbnail: h.previewURL,
    web_preview: h.webformatURL,
    source_url: h.pageURL,
    download_url: h.vectorURL || h.largeImageURL,
    dimensions: `${h.imageWidth}x${h.imageHeight}`,
    user: h.user,
    views: h.views,
    downloads: h.downloads,
    is_svg: !!h.vectorURL,
  }));
}

// ---- VIDEO API ----
async function searchVideo() {
  const params = new URLSearchParams({
    key: KEY, q: QUERY, video_type: 'all',
    per_page: String(Math.min(N, 200)), page: String(PAGE),
    safesearch: 'true',
  });
  if (flags.category)         params.set('category', flags.category);
  if (flags['editors-choice']) params.set('editors_choice', 'true');
  const data = await getJSON(`https://pixabay.com/api/videos/?${params}`);
  return (data.hits || []).slice(0, N).map(h => {
    const vids = h.videos || {};
    const best = Object.entries(vids).sort((a, b) => (b[1].width||0) - (a[1].width||0))[0]?.[1] || {};
    // orient filter (client side)
    if (flags.orient === 'horizontal' && best.height > best.width) return null;
    if (flags.orient === 'vertical'   && best.width  > best.height) return null;
    return {
      id: h.id,
      title: h.tags,
      thumbnail: `https://i.vimeocdn.com/video/${h.picture_id}_295x166.jpg`,
      source_url: h.pageURL,
      download_url: best.url,
      dimensions: `${best.width}x${best.height}`,
      duration: h.duration,
      user: h.user,
      views: h.views,
    };
  }).filter(Boolean);
}

// ---- PUPPETEER SEARCH (music / sfx / gif / 3d) ----
async function searchScrape(kind) {
  const slugMap = { music: 'music', sfx: 'sound-effects', gif: 'gifs', '3d': '3d-models' };
  const slug = slugMap[kind];
  if (!slug) throw new Error(`unknown scrape kind: ${kind}`);
  const url = `https://pixabay.com/${slug}/search/${encodeURIComponent(QUERY.trim())}/?pagi=${PAGE}`;

  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args:['--no-sandbox','--disable-blink-features=AutomationControlled']});
  const p = await b.newPage();
  await p.setUserAgent(UA);
  await p.setViewport({width:1440, height:900});

  await p.goto(url, { waitUntil:'networkidle2', timeout:45000 });
  await new Promise(r => setTimeout(r, 1500));

  const detailRegex = {
    music: /pixabay\.com\/music\/[a-z0-9-]+-\d+\/?$/i,
    sfx:   /pixabay\.com\/sound-effects\/[a-z0-9-]+-\d+\/?$/i,
    gif:   /pixabay\.com\/gifs\/[a-z0-9-]+-\d+\/?$/i,
    '3d':  /pixabay\.com\/3d-models\/[a-z0-9-]+-\d+\/?$/i,
  }[kind];

  const candidates = await p.evaluate((re) => {
    const links = [...document.querySelectorAll('a[href]')].map(a => a.href);
    const detail = [...new Set(links)].filter(h => new RegExp(re).test(h));
    return detail.map(href => {
      // try to find a thumbnail near the link
      const a = [...document.querySelectorAll('a[href]')].find(x => x.href === href);
      const img = a?.querySelector('img') || a?.closest('div')?.querySelector('img');
      const title = (a?.getAttribute('aria-label') || img?.alt || '').trim();
      return { source_url: href, thumbnail: img?.src || null, title };
    });
  }, detailRegex.source);

  await b.close();
  return candidates.slice(0, N);
}

// ---- dispatch ----
(async () => {
  let results = [];
  switch (TYPE) {
    case 'photo':        results = await searchImage('photo');        break;
    case 'illustration': results = await searchImage('illustration'); break;
    case 'vector':       results = await searchImage('vector');       break;
    case 'video':        results = await searchVideo();               break;
    case 'music': case 'sfx': case 'gif': case '3d':
      results = await searchScrape(TYPE); break;
    default:
      console.error(`unknown type '${TYPE}'`); process.exit(2);
  }
  console.log(JSON.stringify({
    type: TYPE, query: QUERY, page: PAGE, count: results.length, results
  }, null, 2));
})().catch(e => { console.error('[pixabay-search]', e.message); process.exit(1); });
