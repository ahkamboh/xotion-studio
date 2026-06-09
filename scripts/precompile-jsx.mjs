#!/usr/bin/env node
// precompile-jsx.mjs — turn a Babel-in-browser Stage project into a
// pre-compiled one so the renderer doesn't pay the ~500ms/worker in-browser
// JSX parse on every page load.
//
//   node scripts/precompile-jsx.mjs <project-dir>
//
// What it does:
//   1. Transforms every `*.jsx` the project loads via `<script type="text/babel"
//      src="…">` into a plain `.precompiled.js` (Babel, react preset).
//   2. Transforms the INLINE `<script type="text/babel">…</script>` block too.
//   3. Emits `index.precompiled.html` that:
//        • drops the @babel/standalone CDN <script> (no longer needed)
//        • points each script at its `.precompiled.js`
//        • inlines the compiled boot block as plain JS
//   Keeps React/ReactDOM CDN scripts untouched.
//
// Render the `.precompiled.html` for the speed win; keep `index.html` as the
// editable source (Babel-in-browser is nicer for live preview/iteration).
//
// Babel is loaded from @babel/standalone (the SAME version the page already
// pulls from unpkg) via a one-time local cache under .babelcache/ — no
// permanent devDependency added to the project.

import { promises as fs } from 'fs';
import path from 'path';
import https from 'https';
import { createRequire } from 'module';
import os from 'os';

const projDir = process.argv[2];
if (!projDir) {
  console.error('usage: precompile-jsx.mjs <project-dir>');
  process.exit(1);
}
const root = path.resolve(projDir);
const indexPath = path.join(root, 'index.html');
let html = await fs.readFile(indexPath, 'utf8');

// ── obtain @babel/standalone (cache in a temp dir, no project dep) ───────
const BABEL_VER = (html.match(/@babel\/standalone@([\d.]+)/) || [, '7.29.0'])[1];
const cacheDir = path.join(os.tmpdir(), 'xotion-babelcache');
await fs.mkdir(cacheDir, { recursive: true });
const babelFile = path.join(cacheDir, `babel-${BABEL_VER}.js`);

async function ensureBabel() {
  try { await fs.access(babelFile); return; } catch { /* download */ }
  const url = `https://unpkg.com/@babel/standalone@${BABEL_VER}/babel.min.js`;
  process.stdout.write(`[precompile] fetching @babel/standalone@${BABEL_VER}…\n`);
  await new Promise((resolve, reject) => {
    const get = (u) => https.get(u, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location);
      }
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', async () => { await fs.writeFile(babelFile, Buffer.concat(chunks)); resolve(); });
    });
    get(url).on('error', reject);
  });
}
await ensureBabel();

const require = createRequire(import.meta.url);
const Babel = require(babelFile);

const transform = (code) =>
  Babel.transform(code, { presets: ['react'], filename: 'inline.jsx' }).code;

// ── compile external `<script type="text/babel" src="X.jsx">` files ──────
const extRe = /<script\s+type=["']text\/babel["']\s+src=["']([^"']+)["']\s*><\/script>/g;
const externals = [...html.matchAll(extRe)].map((m) => m[1]);
for (const src of externals) {
  const abs = path.join(root, src);
  const code = await fs.readFile(abs, 'utf8');
  const out = src.replace(/\.jsx?$/, '') + '.precompiled.js';
  await fs.writeFile(path.join(root, out), transform(code));
  html = html.replace(
    new RegExp(`<script\\s+type=["']text/babel["']\\s+src=["']${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s*></script>`),
    `<script src="${out}"></script>`,
  );
  process.stdout.write(`[precompile] ${src} → ${out}\n`);
}

// ── compile the INLINE `<script type="text/babel">…</script>` boot block ─
html = html.replace(
  /<script\s+type=["']text\/babel["']\s*>([\s\S]*?)<\/script>/g,
  (_, body) => `<script>\n${transform(body)}\n</script>`,
);

// ── drop the now-unneeded @babel/standalone CDN script ───────────────────
html = html.replace(
  /<script[^>]*@babel\/standalone[^>]*><\/script>\s*/,
  '<!-- @babel/standalone removed: JSX pre-compiled by scripts/precompile-jsx.mjs -->\n',
);

const outHtml = path.join(root, 'index.precompiled.html');
await fs.writeFile(outHtml, html);
process.stdout.write(`[precompile] → ${path.relative(process.cwd(), outHtml)}  (render THIS for the speed win)\n`);
