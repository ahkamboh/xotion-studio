#!/usr/bin/env node
// frame-cache.mjs — partial re-render via per-scene frame caching.
//
// THE ITERATION WIN: when an agent (or a human) changes ONE scene and
// re-renders, only that scene's frames are re-captured. Every unchanged
// scene's frames are reused from disk. A 6-scene video where you tweak scene 4
// re-renders ~1/6 of the frames instead of all of them.
//
// HOW IT KNOWS WHAT CHANGED — a frame's pixels depend on (a) which scene owns
// that frame's time and (b) the frame number. So if we hash each scene's
// source and map frame→scene, we re-capture only frames whose owning scene's
// hash changed since the last render.
//
//   node scripts/frame-cache.mjs <html> <out.mp4> --scenes <scenes.json> \
//        [--cache-dir <dir>] [--fps 30] [--w 1080] [--h 1920] [--workers 2]
//
// scenes.json (the caller / build step produces this):
//   {
//     "fps": 30, "w": 1080, "h": 1920, "totalFrames": 360,
//     "scenes": [
//       { "id": "s1", "start": 0,   "end": 60,  "hash": "ab12…" },
//       { "id": "s2", "start": 60,  "end": 120, "hash": "cd34…" },
//       ...
//     ]
//   }
//   • start/end are FRAME indices (end exclusive).
//   • hash is any content hash of that scene's source (sha1 of the scene's
//     JSX/HTML block is ideal). Change the scene → change the hash → re-render.
//
// Page contract: same as fast-capture.mjs — window.__stage.setTime(seconds) +
// .setPlaying(bool).
//
// Cache layout: <cache-dir>/{manifest.json, f00000.jpg, f00001.jpg, …}
// The JPEGs ARE the cache; manifest.json records which scene-hash produced
// each frame range so the next run can diff.

import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// ── arg parsing ──────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const pos = [];
const opt = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    const key = argv[i].slice(2);
    const val = (i + 1 < argv.length && !argv[i + 1].startsWith('--')) ? argv[++i] : 'true';
    opt[key] = val;
  } else pos.push(argv[i]);
}
const [htmlPath, outMp4] = pos;
if (!htmlPath || !outMp4 || !opt.scenes) {
  console.error('usage: frame-cache.mjs <html> <out.mp4> --scenes <scenes.json> [--cache-dir DIR] [--fps 30] [--w 1080] [--h 1920] [--workers 2]');
  process.exit(1);
}

const scenesSpec = JSON.parse(await fs.readFile(opt.scenes, 'utf8'));
const FPS = +(opt.fps || scenesSpec.fps || 30);
const W = +(opt.w || scenesSpec.w || 1080);
const H = +(opt.h || scenesSpec.h || 1920);
const WORKERS = Math.max(1, Math.min(6, +(opt.workers || 2)));
const TOTAL = scenesSpec.totalFrames
  || Math.max(...scenesSpec.scenes.map((s) => s.end));
const cacheDir = path.resolve(opt['cache-dir']
  || path.join(path.dirname(outMp4), '.framecache'));

await fs.mkdir(cacheDir, { recursive: true });

// ── load previous manifest (if any) ──────────────────────────────────────
const manifestPath = path.join(cacheDir, 'manifest.json');
let prev = null;
try { prev = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch { /* cold */ }

// Geometry change invalidates the whole cache.
const geomChanged = prev && (prev.fps !== FPS || prev.w !== W || prev.h !== H || prev.totalFrames !== TOTAL);
if (geomChanged) prev = null;

// ── diff: which frames must be (re)captured? ─────────────────────────────
const prevById = {};
if (prev) for (const s of prev.scenes) prevById[s.id] = s;

const frameFile = (i) => path.join(cacheDir, `f${String(i).padStart(5, '0')}.jpg`);
const fileExists = async (p) => { try { await fs.access(p); return true; } catch { return false; } };

const toCapture = []; // frame indices to (re)capture
let reused = 0;
for (const sc of scenesSpec.scenes) {
  const p = prevById[sc.id];
  const unchanged = p && p.hash === sc.hash && p.start === sc.start && p.end === sc.end;
  // Even if unchanged, every cached frame file must still exist.
  let allCached = unchanged;
  if (unchanged) {
    for (let i = sc.start; i < sc.end; i++) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await fileExists(frameFile(i)))) { allCached = false; break; }
    }
  }
  if (allCached) {
    reused += sc.end - sc.start;
  } else {
    for (let i = sc.start; i < sc.end; i++) toCapture.push(i);
  }
}

// Any frames not owned by a listed scene (gaps) → always capture.
const owned = new Set();
for (const sc of scenesSpec.scenes) for (let i = sc.start; i < sc.end; i++) owned.add(i);
for (let i = 0; i < TOTAL; i++) {
  if (!owned.has(i)) { toCapture.push(i); }
}
toCapture.sort((a, b) => a - b);

const mode = prev ? 'incremental' : 'cold';
console.log(`[frame-cache] ${mode} · ${reused} frames reused · ${toCapture.length}/${TOTAL} to (re)capture`);

// ── capture the needed frames (persistent-ish: one browser, N pages) ─────
if (toCapture.length > 0) {
  const url = 'file://' + path.resolve(htmlPath);
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    protocolTimeout: 120_000,
    defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars', '--mute-audio',
           `--window-size=${W},${H}`, '--allow-file-access-from-files',
           // CRITICAL for multi-page capture: headless Chrome throttles RAF in
           // backgrounded tabs, which stalls the per-frame double-RAF settle.
           '--disable-background-timer-throttling',
           '--disable-renderer-backgrounding',
           '--disable-backgrounding-occluded-windows'],
  });
  try {
    const prepare = async () => {
      const page = await browser.newPage();
      await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });
      await page.waitForFunction(
        () => window.__stage && typeof window.__stage.setTime === 'function', { timeout: 30_000 });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.__stage.setPlaying(false));
      await page.addStyleTag({ content: `
        html, body { margin:0!important; padding:0!important; overflow:hidden!important; background:transparent; }
        #root, #root > div, #root > div > div:first-child {
          position: fixed !important; inset: 0 !important;
          width: 100vw !important; height: 100vh !important; transform: none !important; }
        #root > div > *:nth-child(n+2) { display: none !important; }` });
      return page;
    };
    const pages = await Promise.all(Array.from({ length: WORKERS }, prepare));
    await new Promise((r) => setTimeout(r, 300));

    let done = 0;
    await Promise.all(pages.map(async (page, k) => {
      for (let idx = k; idx < toCapture.length; idx += WORKERS) {
        const i = toCapture[idx];
        const sec = i / FPS;
        // eslint-disable-next-line no-await-in-loop
        await page.evaluate((s) => window.__stage.setTime(s), sec);
        // Node-side settle (NOT page-RAF — backgrounded headless tabs throttle
        // RAF and stall). 32ms is ample for React to commit the paused frame.
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 32));
        // eslint-disable-next-line no-await-in-loop
        await page.screenshot({ path: frameFile(i), type: 'jpeg', quality: 95,
          clip: { x: 0, y: 0, width: W, height: H } });
        done++;
        if (done % 30 === 0) process.stdout.write(`  captured ${done}/${toCapture.length}\r`);
      }
    }));
    process.stdout.write(`  captured ${toCapture.length}/${toCapture.length}\n`);
  } finally {
    await browser.close();
  }
}

// ── encode the full ordered frame set (cached + fresh) → mp4 ─────────────
// All frames now live on disk as f%05d.jpg. VideoToolbox encode.
console.log('[frame-cache] encoding…');
await new Promise((resolve, reject) => {
  const ff = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-framerate', String(FPS),
    '-i', path.join(cacheDir, 'f%05d.jpg'),
    '-frames:v', String(TOTAL),
    '-c:v', 'h264_videotoolbox', '-b:v', '12M',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    outMp4,
  ], { stdio: ['ignore', 'inherit', 'inherit'] });
  ff.on('exit', (c) => c === 0 ? resolve() : reject(new Error('ffmpeg ' + c)));
  ff.on('error', reject);
});

// ── persist the new manifest ─────────────────────────────────────────────
const newManifest = {
  fps: FPS, w: W, h: H, totalFrames: TOTAL,
  builtAtFrameCount: TOTAL,
  scenes: scenesSpec.scenes.map((s) => ({ id: s.id, start: s.start, end: s.end, hash: s.hash })),
};
const tmp = manifestPath + '.tmp';
await fs.writeFile(tmp, JSON.stringify(newManifest, null, 2));
await fs.rename(tmp, manifestPath);

console.log(`[frame-cache] done → ${outMp4}  (${reused} reused, ${toCapture.length} captured)`);

// Tiny helper others can import to hash a scene's source block deterministically.
export function hashSource(s) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
}
