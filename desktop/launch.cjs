'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const PROMPT_FILE = '.xotion-last-prompt.md';

function resolveClaudeBin(found, { exists = fs.existsSync, home = os.homedir() } = {}) {
  if (!found) return null;
  const exeFromShim = /\.(cmd|bat)$/i.test(found)
    ? found.replace(/\.(cmd|bat)$/i, '.exe')
    : found;
  const local = path.join(home, '.local', 'bin', 'claude.exe');
  for (const p of [exeFromShim, local, found]) {
    if (p && exists(p)) return p;
  }
  return found;
}

function writeLaunchPrompt(engine, text, { writeFile = fs.writeFileSync } = {}) {
  const file = path.join(engine, PROMPT_FILE);
  writeFile(file, String(text || ''), 'utf8');
  return file;
}

function claudeLaunchArgs() {
  return [
    `Read ${PROMPT_FILE} in this folder and do exactly what it says. That file is the full job. Do not clone any repo. Do not run /auto-mode-setup unless I ask.`,
  ];
}

function spawnOptions() {
  return {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
    shell: false,
    windowsVerbatimArguments: process.platform === 'win32',
  };
}

module.exports = {
  PROMPT_FILE,
  resolveClaudeBin,
  writeLaunchPrompt,
  claudeLaunchArgs,
  spawnOptions,
};
