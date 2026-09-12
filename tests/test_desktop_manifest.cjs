'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const desktop = path.join(__dirname, '..', 'desktop');

test('desktop ships an NSIS Windows installer config', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(desktop, 'package.json'), 'utf8'));
  assert.equal(pkg.build.win.target[0].target, 'nsis');
  assert.equal(pkg.build.nsis.oneClick, false);
  assert.equal(pkg.build.nsis.allowToChangeInstallationDirectory, true);
  assert.ok(pkg.build.nsis.license);
  assert.ok(fs.existsSync(path.join(desktop, 'main.js')));
  assert.ok(fs.existsSync(path.join(desktop, 'renderer', 'index.html')));
  assert.ok(fs.existsSync(path.join(desktop, 'build', 'icon.ico')));
});
