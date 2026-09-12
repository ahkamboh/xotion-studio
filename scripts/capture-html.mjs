#!/usr/bin/env node
// capture-html.mjs — deterministic frame capture for browser animations.
// Loads an HTML file in headless Chrome, pauses window.__stage, scrubs frame
// by frame, screenshots each, then ffmpeg-encodes to MP4.
//
//   node scripts/capture-html.mjs <html_file> <out.mp4> [duration_s=15] [fps=30] [w=1080] [h=1920]
//
// Requires: puppeteer-core (uses system Chrome) + ffmpeg in PATH.
//
// The target HTML must expose `window.__stage` with .setPlaying(bool) and
// .setTime(seconds). The Xotion demo Stage component already does this.

import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const { resolveChrome } = createRequire(import.meta.url)('./lib/chrome.cjs');
const CHROME = resolveChrome();

const [,, htmlPath, outMp4, durArg, fpsArg, wArg, hArg] = process.argv;
if (!htmlPath || !outMp4) {
  console.error('usage: capture-html.mjs <html> <out.mp4> [dur=15] [fps=30] [w=1080] [h=1920]');
  process.exit(1);
}
const DUR = +(durArg || 15);
const FPS = +(fpsArg || 30);
const W   = +(wArg   || 1080);
const H   = +(hArg   || 1920);
const TOTAL_FRAMES = Math.round(DUR * FPS);

const absHtml = path.resolve(htmlPath);
const url = 'file://' + absHtml;
const framesDir = path.resolve(path.dirname(outMp4), '_frames-' + Date.now());
await fs.mkdir(framesDir, { recursive: true });

console.log(`[capture] ${path.basename(htmlPath)} → ${path.basename(outMp4)}  (${W}×${H}, ${DUR}s @ ${FPS}fps = ${TOTAL_FRAMES} frames)`);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: [
    '--no-sandbox', '--disable-setuid-sandbox',
    '--hide-scrollbars', '--mute-audio',
    `--window-size=${W},${H}`,
    '--allow-file-access-from-files',
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  console.log('[capture] loading…');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });

  console.log('[capture] waiting for fonts + Stage…');
  await page.waitForFunction(() => window.__stage && typeof window.__stage.setTime === 'function', { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  // Give react/babel one tick to settle scene content
  await new Promise(r => setTimeout(r, 500));

  // Pause the timeline so RAF doesn't fight our seeks
  await page.evaluate(() => window.__stage.setPlaying(false));

  // CAPTURE MODE: hide Stage's PlaybackBar, force canvas to fill viewport exactly.
  // Stage renders: #root > div(wrap) > [div(canvas-content), PlaybackBar].
  // We hide PlaybackBar (any direct child after the first) and pin the canvas
  // container to inset:0 so the scale-to-fit math sees the full viewport.
  await page.addStyleTag({content: `
    html, body { margin:0!important; padding:0!important; overflow:hidden!important; background:transparent; }
    #root, #root > div, #root > div > div:first-child {
      position: fixed !important; inset: 0 !important;
      width: 100vw !important; height: 100vh !important;
      max-width: none !important; max-height: none !important;
      transform: none !important;
    }
    /* Hide any sibling after the first inside the Stage wrapper (the PlaybackBar) */
    #root > div > *:nth-child(n+2) { display: none !important; }
    /* Belt-and-suspenders: kill all bar buttons in case the structure differs */
    button { display: none !important; }
    /* Ensure no scrollbars / outlines anywhere */
    *::-webkit-scrollbar { display: none !important; }
    * { outline: none !important; }
  `});
  // Stage uses a ResizeObserver / window resize listener; nudge it so it
  // re-measures the viewport now that the bar is gone.
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await new Promise(r => setTimeout(r, 200));

  // FORCE the inner canvas content to native size + no transform. Stage's
  // scale-to-fit math reserves room for the (hidden) bar, leaving ~30px
  // letterbox. We override the inline styles directly so the content sits
  // at viewport 0,0 at 1:1. Targets the first div child of the Stage wrapper.
  await page.evaluate((W, H) => {
    const root = document.getElementById('root');
    const findCanvas = () => {
      // Walk depth-first to find a div with explicit width/height styles
      const stack = [root];
      while (stack.length) {
        const el = stack.pop();
        if (el !== root && el.tagName === 'DIV') {
          const s = el.style;
          // Heuristic: canvas content has explicit width/height + (likely) a transform
          if (s.width && s.height && parseInt(s.width) >= 200 && parseInt(s.height) >= 200) return el;
        }
        for (const c of el.children) stack.push(c);
      }
      return null;
    };
    const el = findCanvas();
    if (el) {
      el.style.transform = 'none';
      el.style.transformOrigin = '0 0';
      el.style.position = 'fixed';
      el.style.left = '0';
      el.style.top = '0';
      el.style.width = W + 'px';
      el.style.height = H + 'px';
      window.__canvasEl = el;  // remember for screenshots
    }
  }, W, H);
  await new Promise(r => setTimeout(r, 100));

  console.log(`[capture] capturing ${TOTAL_FRAMES} frames…`);
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const t = i / FPS;
    await page.evaluate((sec) => {
      window.__stage.setTime(sec);
    }, t);
    // wait for next animation frame to ensure DOM updates render
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const padded = String(i).padStart(5, '0');
    await page.screenshot({
      path: path.join(framesDir, `f${padded}.png`),
      type: 'png',
      omitBackground: false,
      clip: { x: 0, y: 0, width: W, height: H },
    });
    if (i % 30 === 0) process.stdout.write(`  ${i}/${TOTAL_FRAMES}\r`);
  }
  process.stdout.write(`  ${TOTAL_FRAMES}/${TOTAL_FRAMES}\n`);
} finally {
  await browser.close();
}

console.log('[capture] encoding mp4…');
await new Promise((resolve, reject) => {
  const ff = spawn('ffmpeg', [
    '-y',
    '-framerate', String(FPS),
    '-i', path.join(framesDir, 'f%05d.png'),
    '-c:v', 'libx264',
    '-crf', '18',
    '-preset', 'medium',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outMp4,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  ff.stderr.on('data', d => process.stderr.write(d));
  ff.on('exit', code => code === 0 ? resolve() : reject(new Error('ffmpeg exited ' + code)));
});

// Clean up frame dir
await fs.rm(framesDir, { recursive: true, force: true });
console.log(`[capture] done → ${outMp4}`);
