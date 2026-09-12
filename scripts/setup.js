#!/usr/bin/env node
// Dispatches to setup.ps1 on Windows, setup.sh elsewhere.
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const win = process.platform === 'win32';
const script = win
  ? path.join(root, 'scripts', 'setup.ps1')
  : path.join(root, 'scripts', 'setup.sh');

const r = spawnSync(
  win ? 'powershell' : 'bash',
  win
    ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script]
    : [script],
  { stdio: 'inherit', cwd: root, windowsHide: true },
);

process.exit(r.status == null ? 1 : r.status);
