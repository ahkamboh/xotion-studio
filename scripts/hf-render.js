#!/usr/bin/env node
// Windows: HyperFrames only looks for `ffmpeg` on PATH. Doctor can see a winget
// install that `npx hyperframes render` cannot. Put the resolved binary first.
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const { resolveFfmpeg } = require('./lib/chrome.cjs');

const ff = resolveFfmpeg();
if (ff) {
  process.env.PATH = `${path.dirname(ff)}${path.delimiter}${process.env.PATH}`;
  process.env.FFMPEG_PATH = ff;
}

const r = spawnSync('npx', ['hyperframes', 'render', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(r.status == null ? 1 : r.status);
