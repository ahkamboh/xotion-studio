'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const {
  PROMPT_FILE,
  resolveClaudeBin,
  writeLaunchPrompt,
  claudeLaunchArgs,
  spawnOptions,
} = require('../desktop/launch.cjs');

test('prefers claude.exe over the cmd shim so Windows does not split the prompt', () => {
  const shim = 'C:\\Users\\me\\.local\\bin\\claude.cmd';
  const exe = 'C:\\Users\\me\\.local\\bin\\claude.exe';
  const got = resolveClaudeBin(shim, {
    exists: (p) => p === exe,
    home: 'C:\\Users\\me',
  });
  assert.equal(got, exe);
});

test('writes the full prompt to a file and launches with a short argv', () => {
  const written = {};
  const file = writeLaunchPrompt('C:\\engine', 'You are operating Xotion. Do not clone.', {
    writeFile: (p, body) => {
      written.path = p;
      written.body = body;
    },
  });
  assert.equal(file, path.join('C:\\engine', PROMPT_FILE));
  assert.match(written.body, /You are operating Xotion/);
  const args = claudeLaunchArgs();
  assert.equal(args.length, 1);
  assert.ok(!args[0].includes('You are operating'));
  assert.match(args[0], new RegExp(PROMPT_FILE.replace('.', '\\.')));
  assert.match(args[0], /Do not run \/auto-mode-setup/);
});

test('spawn options never use cmd.exe', () => {
  assert.equal(spawnOptions().shell, false);
});
