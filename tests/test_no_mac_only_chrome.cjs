'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const scripts = path.join(__dirname, '..', 'scripts');

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(js|mjs|cjs)$/.test(name)) acc.push(p);
  }
  return acc;
}

test('no script hardcodes the macOS Chrome app path as the only browser', () => {
  const assigned = /(?:const|let|var)\s+CHROME\s*=\s*['"]\/Applications\/Google Chrome\.app/;
  const hits = [];
  for (const file of walk(scripts)) {
    const rel = path.relative(scripts, file);
    if (rel.replace(/\\/g, '/') === 'lib/chrome.cjs') continue;
    const text = fs.readFileSync(file, 'utf8');
    if (assigned.test(text)) hits.push(rel);
  }
  assert.deepEqual(hits, [], `hardcoded Mac Chrome in: ${hits.join(', ')}`);
});

test('no capture script hardcodes videotoolbox-only encode', () => {
  const hits = [];
  for (const file of ['fast-capture.mjs', 'frame-cache.mjs']) {
    const text = fs.readFileSync(path.join(scripts, file), 'utf8');
    if (text.includes("'h264_videotoolbox'") || text.includes('"h264_videotoolbox"')) {
      hits.push(file);
    }
  }
  assert.deepEqual(hits, [], `hardcoded VideoToolbox in: ${hits.join(', ')}`);
});
