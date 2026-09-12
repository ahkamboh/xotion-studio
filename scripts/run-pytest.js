#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');

function tryRun(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', windowsHide: true });
  if (r.error && r.error.code === 'ENOENT') return null;
  return r.status == null ? 1 : r.status;
}

const args = ['-m', 'pytest', 'tests', '-q'];
for (const [cmd, extra] of [['py', ['-3']], ['python', []], ['python3', []]]) {
  const code = tryRun(cmd, extra.concat(args));
  if (code !== null) process.exit(code);
}
console.error('pytest runner: no Python on PATH');
process.exit(1);
