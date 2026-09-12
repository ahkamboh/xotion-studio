#!/usr/bin/env node
// Cross-platform prerequisite report. Used by setup, the desktop app, and CI.
//   node scripts/doctor.js            # human
//   node scripts/doctor.js --json     # machine

'use strict';

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { candidates, resolveFfmpeg } = require('./lib/chrome.cjs');

const ROOT = path.resolve(__dirname, '..');

function which(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (r.status !== 0) return null;
  const line = String(r.stdout || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean);
  return line || null;
}

function versionOf(cmd, args) {
  try {
    const out = execFileSync(cmd, args, { encoding: 'utf8', timeout: 15000, windowsHide: true });
    return String(out).trim().split(/\r?\n/)[0];
  } catch {
    return null;
  }
}

function firstExisting(paths) {
  for (const p of paths) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function findChrome() {
  return firstExisting(candidates());
}

function findPython() {
  if (process.platform === 'win32') {
    try {
      const out = execFileSync('py', ['-3', '-c', 'import sys; print(sys.executable)'], {
        encoding: 'utf8', timeout: 10000, windowsHide: true,
      });
      const p = String(out).trim();
      if (p) return p;
    } catch { /* fall through */ }
  }
  return which('python3') || which('python');
}

function findClaude() {
  return which('claude');
}

function findFfmpeg() {
  return resolveFfmpeg() || which('ffmpeg');
}

function nodeOk() {
  const m = process.versions.node.split('.').map(Number);
  return m[0] >= 22;
}

function whisperModel() {
  const repo = path.join(ROOT, 'models', 'small.pt');
  const cache = path.join(os.homedir(), '.cache', 'whisper', 'small.pt');
  const src = firstExisting([repo, cache]);
  if (!src) return { path: null, bytes: 0, ok: false };
  const bytes = fs.statSync(src).size;
  return { path: src, bytes, ok: bytes > 100_000_000 };
}

function report() {
  const chrome = findChrome();
  const python = findPython();
  const ffmpeg = findFfmpeg();
  const claude = findClaude();
  const whisper = whisperModel();
  const nodePath = process.execPath;
  return {
    ok: nodeOk() && Boolean(ffmpeg) && Boolean(python),
    platform: process.platform,
    engine: ROOT,
    node: { path: nodePath, version: process.versions.node, ok: nodeOk() },
    ffmpeg: { path: ffmpeg, version: ffmpeg ? versionOf(ffmpeg, ['-version']) : null, ok: Boolean(ffmpeg) },
    python: { path: python, version: python ? versionOf(python, ['--version']) : null, ok: Boolean(python) },
    chrome: { path: chrome, ok: Boolean(chrome) },
    claude: { path: claude, ok: Boolean(claude) },
    whisper: whisper,
    hyperframes: { ok: fs.existsSync(path.join(ROOT, 'node_modules', 'hyperframes')) },
  };
}

const data = report();
if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
} else {
  const row = (name, item, extra = '') => {
    const mark = item.ok ? 'ok' : '!!';
    const loc = item.path || item.version || '';
    console.log(`${mark}  ${name.padEnd(12)} ${loc} ${extra}`.trimEnd());
  };
  console.log(`xotion doctor  (${data.platform})  engine=${data.engine}`);
  row('node', data.node, data.node.ok ? '' : '(need >= 22)');
  row('ffmpeg', data.ffmpeg);
  if (data.ffmpeg.ok && !which('ffmpeg')) {
    console.log('    (not on PATH — use `node scripts/hf-render.js` so HyperFrames can encode)');
  }
  row('python', data.python);
  row('chrome', data.chrome, data.chrome.ok ? '' : '(needed for HTML capture / stock scrape)');
  row('claude', data.claude, data.claude.ok ? '' : '(desktop Run button; optional for engine scripts)');
  row('whisper', { ok: data.whisper.ok, path: data.whisper.path }, data.whisper.ok ? '' : '(git lfs pull)');
  row('hyperframes', data.hyperframes, data.hyperframes.ok ? '' : '(run setup)');
  console.log(data.ok ? '\nengine core: ready' : '\nengine core: missing node>=22, ffmpeg, or python');
  process.exit(data.ok ? 0 : 2);
}

module.exports = { report };
