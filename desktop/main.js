'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PREFS = path.join(app.getPath('userData'), 'prefs.json');

function readPrefs() {
  try {
    return JSON.parse(fs.readFileSync(PREFS, 'utf8'));
  } catch {
    return {};
  }
}

function writePrefs(next) {
  fs.mkdirSync(path.dirname(PREFS), { recursive: true });
  fs.writeFileSync(PREFS, JSON.stringify(next, null, 2));
}

function looksLikeEngine(dir) {
  if (!dir) return false;
  return (
    fs.existsSync(path.join(dir, 'CLAUDE.md')) &&
    fs.existsSync(path.join(dir, 'scripts', 'doctor.js'))
  );
}

function defaultEngineCandidates() {
  const home = os.homedir();
  const list = [process.env.XOTION_ENGINE];
  if (!app.isPackaged) list.push(path.resolve(__dirname, '..'));
  list.push(
    path.join(home, 'Documents', 'claude', 'xotion-studio'),
    path.join(home, 'Documents', 'xotion-studio'),
    path.join(home, 'xotion-studio'),
    path.join('C:', 'Drive', 'Xaibridge', 'xotion-studio'),
  );
  return list.filter(Boolean);
}

function resolveEngine() {
  const prefs = readPrefs();
  if (looksLikeEngine(prefs.enginePath)) return prefs.enginePath;
  for (const c of defaultEngineCandidates()) {
    if (looksLikeEngine(c)) return c;
  }
  return '';
}

function which(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (r.status !== 0) return null;
  return String(r.stdout || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean) || null;
}

function findFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  const fromPath = which('ffmpeg');
  if (fromPath) return fromPath;
  const pf = process.env.PROGRAMFILES || 'C:\\Program Files';
  const local = process.env.LOCALAPPDATA || '';
  const guessed = [
    path.join(pf, 'ffmpeg', 'bin', 'ffmpeg.exe'),
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
  ];
  for (const p of guessed) {
    if (fs.existsSync(p)) return p;
  }
  const winget = path.join(local, 'Microsoft', 'WinGet', 'Packages');
  if (fs.existsSync(winget)) {
    try {
      for (const name of fs.readdirSync(winget)) {
        if (!/ffmpeg/i.test(name)) continue;
        const stack = [path.join(winget, name)];
        while (stack.length) {
          const dir = stack.pop();
          let ents = [];
          try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
          for (const e of ents) {
            const p = path.join(dir, e.name);
            if (e.isDirectory()) stack.push(p);
            else if (e.name.toLowerCase() === 'ffmpeg.exe') return p;
          }
        }
      }
    } catch { /* ignore */ }
  }
  const engine = resolveEngine();
  const helper = looksLikeEngine(engine)
    ? path.join(engine, 'scripts', 'lib', 'chrome.cjs')
    : null;
  if (helper && fs.existsSync(helper)) {
    try {
      const { resolveFfmpeg } = require(helper);
      return resolveFfmpeg();
    } catch { /* fall through */ }
  }
  return null;
}

function nodeVersionOk(ver) {
  const n = parseInt(String(ver || '').replace(/^v/, ''), 10);
  return n >= 22;
}

function collectStatus() {
  const engine = resolveEngine();
  const nodePath = process.execPath && !app.isPackaged ? process.execPath : which('node');
  let nodeVer = process.versions.node;
  if (app.isPackaged) {
    const nv = spawnSync('node', ['-v'], { encoding: 'utf8', windowsHide: true });
    nodeVer = nv.status === 0 ? String(nv.stdout).trim().replace(/^v/, '') : '';
  }
  const ffmpeg = findFfmpeg();
  const python = which('py') || which('python') || which('python3');
  const claude = which('claude');
  const doctor = looksLikeEngine(engine)
    ? path.join(engine, 'scripts', 'doctor.js')
    : null;
  let doctorReport = null;
  if (doctor && fs.existsSync(doctor) && which('node')) {
    const r = spawnSync('node', [doctor, '--json'], {
      encoding: 'utf8',
      windowsHide: true,
      cwd: engine,
      timeout: 20000,
    });
    if (r.status === 0) {
      try { doctorReport = JSON.parse(r.stdout); } catch { doctorReport = null; }
    }
  }
  const items = {
    engine: { ok: looksLikeEngine(engine), path: engine },
    node: { ok: Boolean(which('node')) && nodeVersionOk(nodeVer), path: which('node'), version: nodeVer },
    ffmpeg: { ok: Boolean(ffmpeg), path: ffmpeg },
    python: { ok: Boolean(python), path: python },
    claude: { ok: Boolean(claude), path: claude },
  };
  const ready = items.engine.ok && items.node.ok && items.ffmpeg.ok && items.python.ok;
  return { ready, items, doctor: doctorReport, platform: process.platform };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 920,
    height: 800,
    minWidth: 720,
    minHeight: 560,
    backgroundColor: '#f4f0e6',
    title: 'Xotion',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('status', () => collectStatus());

ipcMain.handle('pick-engine', async () => {
  const res = await dialog.showOpenDialog({
    title: 'Select the xotion-studio engine folder',
    properties: ['openDirectory'],
  });
  if (res.canceled || !res.filePaths[0]) return collectStatus();
  const prefs = readPrefs();
  prefs.enginePath = res.filePaths[0];
  writePrefs(prefs);
  return collectStatus();
});

ipcMain.handle('open-engine', async () => {
  const engine = resolveEngine();
  if (!looksLikeEngine(engine)) return { ok: false, error: 'Engine folder not found' };
  await shell.openPath(engine);
  return { ok: true };
});

ipcMain.handle('run-prompt', async (_evt, prompt) => {
  const text = String(prompt || '').trim();
  if (!text) return { ok: false, error: 'Write a prompt first.' };
  const engine = resolveEngine();
  if (!looksLikeEngine(engine)) return { ok: false, error: 'Engine folder not found. Set it in the checklist.' };
  const claude = which('claude');
  if (!claude) {
    return {
      ok: false,
      error: 'Claude CLI is not on PATH. Install it, run `claude login`, or open the engine folder and paste the prompt in Cursor / Claude Code.',
      prompt: text,
    };
  }
  const child = spawn(claude, [text], {
    cwd: engine,
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
    shell: process.platform === 'win32',
  });
  child.unref();
  return { ok: true, pid: child.pid };
});
