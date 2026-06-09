#!/usr/bin/env node
// scene-manifest.mjs — build the scenes.json that frame-cache.mjs consumes.
//
// Parses a Stage-variant scenes file (the React/Babel "*-scenes.jsx" form):
//   • finds each  <Sprite start={A} end={B}> <Sn /> </Sprite>  → frame range
//   • extracts each  function Sn() { … }  body              → content hash
// so that editing one scene's code changes only that scene's hash, and
// frame-cache re-renders only that scene's frames.
//
//   node scripts/scene-manifest.mjs <scenes.jsx> --fps 24 [--w 1080] [--h 1920] [--out scenes.json]
//
// Emits: { fps, w, h, totalFrames, scenes:[{id,start,end,hash}] }

import { promises as fs } from 'fs';
import crypto from 'crypto';

const argv = process.argv.slice(2);
const pos = [];
const opt = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    const k = argv[i].slice(2);
    const v = (i + 1 < argv.length && !argv[i + 1].startsWith('--')) ? argv[++i] : 'true';
    opt[k] = v;
  } else pos.push(argv[i]);
}
const scenesFile = pos[0];
if (!scenesFile) {
  console.error('usage: scene-manifest.mjs <scenes.jsx> --fps 24 [--w 1080] [--h 1920] [--out scenes.json]');
  process.exit(1);
}
const FPS = +(opt.fps || 24);
const W = +(opt.w || 1080);
const H = +(opt.h || 1920);

const src = await fs.readFile(scenesFile, 'utf8');

// 1) Sprite ranges:  <Sprite start={0.0} end={2.5}> <S1 /> ...
const ranges = {};
const spriteRe = /<Sprite\s+start=\{([\d.]+)\}\s+end=\{([\d.]+)\}>\s*<([A-Za-z0-9_]+)\s*\/>/g;
let m;
while ((m = spriteRe.exec(src)) !== null) {
  const startSec = parseFloat(m[1]);
  const endSec = parseFloat(m[2]);
  const comp = m[3];
  ranges[comp] = {
    start: Math.round(startSec * FPS),
    end: Math.round(endSec * FPS),
  };
}

// 2) Per-scene source body:  function Sn() { … }  (balanced-brace scan)
function extractFn(name) {
  const sig = new RegExp(`function\\s+${name}\\s*\\(`);
  const sm = sig.exec(src);
  if (!sm) return null;
  // find the opening brace after the signature
  let i = src.indexOf('{', sm.index);
  if (i < 0) return null;
  let depth = 0, j = i;
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) { j++; break; } }
  }
  return src.slice(sm.index, j);
}

const sceneIds = Object.keys(ranges);
const scenes = sceneIds.map((id) => {
  const body = extractFn(id) || id; // fall back to id if not a function
  const hash = crypto.createHash('sha1').update(body).digest('hex').slice(0, 12);
  return { id, start: ranges[id].start, end: ranges[id].end, hash };
}).sort((a, b) => a.start - b.start);

const totalFrames = Math.max(...scenes.map((s) => s.end));
const manifest = { fps: FPS, w: W, h: H, totalFrames, scenes };

const outPath = opt.out || 'scenes.json';
await fs.writeFile(outPath, JSON.stringify(manifest, null, 2));
console.log(`[scene-manifest] ${scenes.length} scenes → ${outPath}`);
for (const s of scenes) console.log(`  ${s.id}  frames ${s.start}-${s.end}  hash ${s.hash}`);
