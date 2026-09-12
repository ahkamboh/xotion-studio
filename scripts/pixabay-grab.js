#!/usr/bin/env node
// pixabay-sfx-grab.js — extract direct audio URL from a Pixabay sound-effect page
// using real Chrome (passes Cloudflare). Then download it.
//
//   node scripts/pixabay-sfx-grab.js "<pixabay-sfx-page-url>" <out.mp3>
//
// Pixabay has no public API for sound effects. The page itself is Cloudflare-
// protected so a plain curl gets 403. Real Chrome + puppeteer-core gets through.
//
// Writes <out>.license.json next to the audio (Pixabay Content License,
// commercial-OK, no attribution).

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const https = require('https');

const URL_ARG = process.argv[2];
const OUT     = process.argv[3];
if (!URL_ARG || !OUT) {
  console.error("usage: pixabay-sfx-grab.js <pixabay-sfx-page-url> <out.mp3>");
  process.exit(2);
}

const { resolveChrome } = require('./lib/chrome.cjs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: resolveChrome(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124 Safari/537.36"
  );
  await page.setViewport({width: 1440, height: 900});

  // Capture any audio request URLs the page makes — that's the direct CDN file.
  const audioUrls = new Set();
  page.on('request', req => {
    const u = req.url();
    if (u.includes('cdn.pixabay.com') && /\.mp3(\?|$)/i.test(u)) audioUrls.add(u);
    if (u.includes('cdn.pixabay.com/audio/') ) audioUrls.add(u);
  });
  page.on('response', async res => {
    const ct = res.headers()['content-type'] || '';
    if (ct.startsWith('audio/')) audioUrls.add(res.url());
  });

  console.error(`[pixabay-sfx-grab] navigating: ${URL_ARG}`);
  await page.goto(URL_ARG, { waitUntil: 'networkidle2', timeout: 45000 });

  // Wait for the audio player to render + try playing to trigger network request
  await new Promise(r => setTimeout(r, 1500));

  // Try clicking play if there's a player button (best-effort)
  const playClicked = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label*="Play" i], button[aria-label*="play" i]');
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (playClicked) console.error("[pixabay-sfx-grab] clicked play to trigger audio load");
  await new Promise(r => setTimeout(r, 2500));

  // Also try reading any <audio src=…> or data attribute
  const inline = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('audio').forEach(a => { if (a.src) out.push(a.src); });
    document.querySelectorAll('source').forEach(s => { if (s.src) out.push(s.src); });
    // Pixabay tags audio URLs in JSON-LD too
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      try {
        const j = JSON.parse(s.textContent);
        const findAudio = (o) => {
          if (!o || typeof o !== 'object') return;
          for (const [k, v] of Object.entries(o)) {
            if (typeof v === 'string' && /\.mp3/i.test(v)) out.push(v);
            else if (typeof v === 'object') findAudio(v);
          }
        };
        findAudio(j);
      } catch {}
    });
    return out;
  });
  inline.forEach(u => audioUrls.add(u));

  // Page metadata for license log
  const meta = await page.evaluate(() => {
    const get = sel => document.querySelector(sel)?.content || '';
    return {
      title:    document.title,
      og_title: get('meta[property="og:title"]'),
      og_url:   get('meta[property="og:url"]'),
      og_audio: get('meta[property="og:audio"]'),
    };
  });

  await browser.close();

  if (!audioUrls.size) {
    console.error("[pixabay-sfx-grab] FAIL — no audio URL captured on the page.");
    console.error("Network requests + DOM both came up empty. The page may have changed.");
    process.exit(3);
  }

  // Prefer a downloadable CDN URL with .mp3
  const candidates = Array.from(audioUrls);
  const best = candidates.find(u => u.includes('/download/')) || candidates[0];
  console.error(`[pixabay-sfx-grab] audio URL: ${best}`);

  // Download via https
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(OUT);
    https.get(best, {
      headers: {
        'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        'Referer': URL_ARG,
      }
    }, resp => {
      if (resp.statusCode >= 400) {
        reject(new Error(`HTTP ${resp.statusCode} downloading audio`));
        return;
      }
      resp.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });

  // License log
  const licensePath = OUT.replace(/\.[^.]+$/, '') + '.license.json';
  fs.writeFileSync(licensePath, JSON.stringify({
    source:      'pixabay-sound-effects',
    license:     'Pixabay Content License (commercial-OK, no attribution required)',
    license_url: 'https://pixabay.com/service/license-summary/',
    source_url:  URL_ARG,
    title:       meta.og_title || meta.title,
    audio_url:   best,
    captured_via:'puppeteer-core + Chrome (no public API for sound effects)',
  }, null, 2));

  const size = fs.statSync(OUT).size;
  console.error(`[pixabay-sfx-grab] ✓ saved ${OUT} (${(size/1024).toFixed(0)} KB)`);
})().catch(e => {
  console.error("[pixabay-sfx-grab] error:", e.message);
  process.exit(1);
});
