#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'tests');
const files = fs.readdirSync(dir)
  .filter((f) => f.startsWith('test_') && f.endsWith('.cjs'))
  .map((f) => path.join(dir, f));

if (!files.length) {
  console.error('no tests/*.cjs files');
  process.exit(1);
}

const r = spawnSync(process.execPath, ['--test', ...files], {
  stdio: 'inherit',
  windowsHide: true,
});
process.exit(r.status == null ? 1 : r.status);
