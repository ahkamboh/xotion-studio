'use strict';

const fs = require('fs');
const path = require('path');

function exists(p) {
  try {
    return Boolean(p) && fs.existsSync(p);
  } catch {
    return false;
  }
}

function candidates() {
  const env = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  const list = [];
  if (env) list.push(env);

  if (process.platform === 'win32') {
    const pf = process.env.PROGRAMFILES || 'C:\\Program Files';
    const pf86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
    const local = process.env.LOCALAPPDATA || '';
    list.push(
      path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(local, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(pf, 'Chromium', 'Application', 'chrome.exe'),
    );
  } else if (process.platform === 'darwin') {
    list.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    );
  } else {
    list.push(
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/microsoft-edge',
      '/snap/bin/chromium',
    );
  }
  return list;
}

function resolveChrome() {
  for (const p of candidates()) {
    if (exists(p)) return p;
  }
  throw new Error(
    'No Chrome, Edge, or Chromium found. Install one, or set CHROME_PATH to the browser binary.',
  );
}

/** ffmpeg args after the input: portable H.264. Override with XOTION_ENCODER (e.g. h264_nvenc). */
function ffmpegCandidates() {
  const list = [];
  if (process.env.FFMPEG_PATH) list.push(process.env.FFMPEG_PATH);
  const local = process.env.LOCALAPPDATA || '';
  const pf = process.env.PROGRAMFILES || 'C:\\Program Files';
  if (process.platform === 'win32') {
    list.push(
      path.join(pf, 'ffmpeg', 'bin', 'ffmpeg.exe'),
      path.join(pf, 'Gyan', 'FFmpeg', 'bin', 'ffmpeg.exe'),
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
    );
    if (local) {
      const winget = path.join(local, 'Microsoft', 'WinGet', 'Packages');
      try {
        for (const name of fs.readdirSync(winget)) {
          if (!/ffmpeg/i.test(name)) continue;
          const root = path.join(winget, name);
          const stack = [root];
          while (stack.length) {
            const dir = stack.pop();
            let ents = [];
            try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
            for (const e of ents) {
              const p = path.join(dir, e.name);
              if (e.isDirectory()) stack.push(p);
              else if (e.name.toLowerCase() === 'ffmpeg.exe') list.push(p);
            }
          }
        }
      } catch { /* no WinGet packages dir */ }
    }
  }
  return list;
}

function resolveFfmpeg() {
  const { execFileSync } = require('child_process');
  try {
    const out = execFileSync(process.platform === 'win32' ? 'where' : 'which', ['ffmpeg'], {
      encoding: 'utf8', timeout: 8000, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'],
    });
    const p = String(out).split(/\r?\n/).map((s) => s.trim()).find(Boolean);
    if (p && exists(p)) return p;
  } catch { /* fall through */ }
  for (const p of ffmpegCandidates()) {
    if (exists(p)) return p;
  }
  return null;
}

function encoderArgs() {
  const forced = process.env.XOTION_ENCODER;
  if (forced) {
    if (forced === 'h264_videotoolbox' || forced === 'h264_nvenc' || forced === 'h264_qsv' || forced === 'h264_amf') {
      return ['-c:v', forced, '-b:v', '12M'];
    }
    return ['-c:v', forced];
  }
  if (process.platform === 'darwin') {
    return ['-c:v', 'h264_videotoolbox', '-b:v', '12M'];
  }
  return ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18'];
}

module.exports = { resolveChrome, resolveFfmpeg, encoderArgs, candidates, ffmpegCandidates };
