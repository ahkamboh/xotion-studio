'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { candidates, encoderArgs, resolveChrome, resolveFfmpeg } = require('../scripts/lib/chrome.cjs');

test('chrome candidates are absolute-looking paths', () => {
  const list = candidates();
  assert.ok(Array.isArray(list));
  assert.ok(list.length >= 3);
  for (const p of list) {
    assert.equal(typeof p, 'string');
    assert.ok(p.length > 2);
  }
});

test('encoder args are portable H.264', () => {
  const prev = process.env.XOTION_ENCODER;
  delete process.env.XOTION_ENCODER;
  try {
    const args = encoderArgs();
    assert.equal(args[0], '-c:v');
    assert.ok(['libx264', 'h264_videotoolbox'].includes(args[1]));
  } finally {
    if (prev === undefined) delete process.env.XOTION_ENCODER;
    else process.env.XOTION_ENCODER = prev;
  }
});

test('XOTION_ENCODER override', () => {
  process.env.XOTION_ENCODER = 'libx264';
  try {
    assert.deepEqual(encoderArgs(), ['-c:v', 'libx264']);
  } finally {
    delete process.env.XOTION_ENCODER;
  }
});

test('resolveFfmpeg returns a string or null', () => {
  const p = resolveFfmpeg();
  assert.ok(p === null || typeof p === 'string');
});

test('resolveChrome finds a browser or throws a clear error', () => {
  try {
    const p = resolveChrome();
    assert.ok(path.isAbsolute(p));
  } catch (e) {
    assert.match(String(e.message), /Chrome|Edge|Chromium|CHROME_PATH/);
  }
});
