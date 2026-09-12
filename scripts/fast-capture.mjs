#!/usr/bin/env node
// fast-capture.mjs — high-speed video render for HTML compositions that
// expose `window.__stage` (the Xotion React/Stage variant).
//
// Wins vs scripts/capture-html.mjs:
//   A. h264_videotoolbox encoder — hardware-accelerated on Apple Silicon
//   B. JPEG screenshots @ quality 95 instead of PNG — Puppeteer captures faster
//   C. Stream JPEGs into ffmpeg stdin — skip per-frame disk round-trip
//   D. Persistent-browser mode — reuse one Chrome across many renders (biggest
//      real-world win: ~2.85× by amortizing cold start across iterations)
//   E. Parallel worker pages with frame striding (the [workers] arg)
//
// CLI:
//   node scripts/fast-capture.mjs <html> <out.mp4> [dur=15] [fps=30] [w=1080] [h=1920] [workers=4]
//                                  ^ workers is the 7th POSITIONAL arg (not a --flag)
//   node scripts/fast-capture.mjs --persistent <port>   # boot a server; POST {…, workers} per render
//
// Same target contract as capture-html.mjs:
//   • Page must expose window.__stage with .setPlaying(bool) and .setTime(seconds).
//   • Renderer pauses the timeline, scrubs every frame, screenshots.

import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import path from 'path';
import http from 'http';
import { createRequire } from 'module';

const { resolveChrome, encoderArgs } = createRequire(import.meta.url)('./lib/chrome.cjs');
const CHROME = resolveChrome();

// ── Set up one worker page: navigate, await stage, hide playback bar. ────
async function preparePage(browser, url, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });
  await page.waitForFunction(
    () => window.__stage && typeof window.__stage.setTime === 'function',
    { timeout: 30_000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__stage.setPlaying(false));
  await page.addStyleTag({
    content: `
      html, body { margin:0!important; padding:0!important; overflow:hidden!important; background:transparent; }
      #root, #root > div, #root > div > div:first-child {
        position: fixed !important; inset: 0 !important;
        width: 100vw !important; height: 100vh !important;
        max-width: none !important; max-height: none !important;
        transform: none !important;
      }
      #root > div > *:nth-child(n+2) { display: none !important; }
    `,
  });
  return page;
}

// ── Renderer core. Reusable across single-shot and persistent modes. ─────
// Win E: spawn N worker pages within ONE browser. Each owns a stride of
// frames (worker k captures frames k, k+N, k+2N…). Frames are buffered into
// an in-order slot array as they arrive, then drained sequentially into
// ffmpeg stdin so the encoder still sees a monotonic stream.
async function render({ browser, htmlPath, outMp4, dur, fps, w, h, workers = 4, log }) {
  const absHtml = path.resolve(htmlPath);
  const url = 'file://' + absHtml;
  const totalFrames = Math.round(dur * fps);

  log(`[fast] ${path.basename(htmlPath)} → ${path.basename(outMp4)}  (${w}×${h}, ${dur}s @ ${fps}fps = ${totalFrames} frames, ${workers} workers)`);

  const t0 = process.hrtime.bigint();

  // Prepare N pages in parallel.
  const pages = await Promise.all(
    Array.from({ length: workers }, () => preparePage(browser, url, w, h)),
  );
  // small settle pause — gives fonts.ready a beat across all tabs
  await new Promise((r) => setTimeout(r, 400));

  const t1 = process.hrtime.bigint();
  log(`[fast] ${workers} pages ready in ${((Number(t1 - t0) / 1e9)).toFixed(2)}s`);

  // ── ffmpeg child: read JPEGs from stdin → encode VideoToolbox ────────
  const ff = spawn(
    'ffmpeg',
    [
      '-hide_banner', '-loglevel', 'error',
      '-y',
      '-f', 'image2pipe',
      '-vcodec', 'mjpeg',
      '-r', String(fps),
      '-i', 'pipe:0',
      ...encoderArgs(),
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outMp4,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const encodeDone = new Promise((resolve, reject) => {
    ff.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error('ffmpeg exited ' + code)),
    );
    ff.on('error', reject);
  });

  // In-order buffer + drain loop. Capture writes to slots[i]; drain reads
  // slots[next] when ready and pushes to ffmpeg.stdin in monotonic order.
  const slots = new Array(totalFrames).fill(null);
  let nextToWrite = 0;
  let captured = 0;
  let drainResolve = null;
  const wake = () => { if (drainResolve) { const r = drainResolve; drainResolve = null; r(); } };
  const wait = () => new Promise((r) => (drainResolve = r));

  const drainer = (async () => {
    while (nextToWrite < totalFrames) {
      const buf = slots[nextToWrite];
      if (buf === null) {
        await wait();
        continue;
      }
      slots[nextToWrite] = null; // free
      if (!ff.stdin.write(buf)) {
        await new Promise((r) => ff.stdin.once('drain', r));
      }
      nextToWrite++;
      if (nextToWrite % 30 === 0) {
        process.stdout.write(`  ${nextToWrite}/${totalFrames}\r`);
      }
    }
    ff.stdin.end();
  })();

  // N workers, each striding through its share of frames.
  const workerLoops = pages.map(async (page, k) => {
    for (let i = k; i < totalFrames; i += workers) {
      const sec = i / fps;
      await page.evaluate((s) => { window.__stage.setTime(s); }, sec);
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );
      const buf = await page.screenshot({
        type: 'jpeg',
        quality: 95,
        omitBackground: false,
        clip: { x: 0, y: 0, width: w, height: h },
      });
      slots[i] = buf;
      captured++;
      wake();
    }
    await page.close();
  });

  await Promise.all(workerLoops);
  // drainer keeps going until nextToWrite reaches totalFrames; one final wake
  // in case the last slot arrived after the drainer's await.
  wake();
  await drainer;
  await encodeDone;

  process.stdout.write(`  ${totalFrames}/${totalFrames}\n`);
  const tEnd = process.hrtime.bigint();
  log(`[fast] done → ${outMp4} in ${((Number(tEnd - t0) / 1e9)).toFixed(2)}s (captured ${captured})`);
  return { wallSec: Number(tEnd - t0) / 1e9, frames: totalFrames };
}

// ── Launch a Chrome we can reuse across renders. ─────────────────────────
async function launchBrowser(w, h) {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    protocolTimeout: 120_000,
    defaultViewport: { width: w, height: h, deviceScaleFactor: 1 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--hide-scrollbars',
      '--mute-audio',
      `--window-size=${w},${h}`,
      '--allow-file-access-from-files',
      // Multi-page capture: stop headless Chrome throttling RAF in backgrounded
      // tabs, which would stall the per-frame double-RAF settle.
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  });
}

// ── CLI entrypoints. ─────────────────────────────────────────────────────
const argv = process.argv.slice(2);

if (argv[0] === '--persistent') {
  // Persistent mode: HTTP server that accepts render jobs. Reuses one Chrome
  // for the whole process lifetime — Win D in the speedup list.
  const port = +(argv[1] || 5180);
  let browser = null;
  const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/render') {
      res.writeHead(404);
      res.end('expected POST /render with JSON body { htmlPath, outMp4, dur, fps, w, h }');
      return;
    }
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const { htmlPath, outMp4, dur = 15, fps = 30, w = 1080, h = 1920, workers = 4 } = JSON.parse(body);
        if (!browser) browser = await launchBrowser(w, h);
        const result = await render({
          browser,
          htmlPath,
          outMp4,
          dur,
          fps,
          w,
          h,
          workers,
          log: console.log,
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500);
        res.end(String(e.stack || e));
      }
    });
  });
  server.listen(port, () => {
    console.log(`[fast] persistent renderer listening on http://127.0.0.1:${port}`);
    console.log(`[fast] POST { htmlPath, outMp4, dur, fps, w, h } to /render`);
  });
  process.on('SIGINT', async () => {
    if (browser) await browser.close();
    server.close(() => process.exit(0));
  });
} else {
  // Single-shot
  const [htmlPath, outMp4, durArg, fpsArg, wArg, hArg, workersArg] = argv;
  if (!htmlPath || !outMp4) {
    console.error(
      'usage: fast-capture.mjs <html> <out.mp4> [dur=15] [fps=30] [w=1080] [h=1920] [workers=4]',
    );
    process.exit(1);
  }
  const dur = +(durArg || 15);
  const fps = +(fpsArg || 30);
  const w = +(wArg || 1080);
  const h = +(hArg || 1920);
  const workers = Math.max(1, Math.min(8, +(workersArg || 4)));

  const browser = await launchBrowser(w, h);
  try {
    await render({ browser, htmlPath, outMp4, dur, fps, w, h, workers, log: console.log });
  } finally {
    await browser.close();
  }
}
