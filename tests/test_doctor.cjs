'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const path = require('path');

const doctor = path.join(__dirname, '..', 'scripts', 'doctor.js');

test('doctor --json reports platform and node', () => {
  const r = spawnSync(process.execPath, [doctor, '--json'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.equal(r.status === 0 || r.status === 2, true, r.stderr || r.stdout);
  const data = JSON.parse(r.stdout);
  assert.equal(data.platform, process.platform);
  assert.equal(data.node.ok, process.versions.node.split('.')[0] >= 22);
  assert.ok(data.engine);
  assert.equal(typeof data.ffmpeg.ok, 'boolean');
  assert.equal(typeof data.python.ok, 'boolean');
  assert.equal(typeof data.chrome.ok, 'boolean');
});
