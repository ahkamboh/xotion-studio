'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = Number(process.env.XOTION_CDP || 9222);
const OUT = path.join(__dirname, 'build');
const PROMPT =
  'UI smoke only. Read .xotion-last-prompt.md then stop. Do not clone. Do not run /auto-mode-setup.';

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`${url} ${body.slice(0, 200)}`));
          }
        });
      })
      .on('error', reject);
  });
}

function cdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    ws.addEventListener('open', () => resolve({ ws, send }));
    ws.addEventListener('error', reject);
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && pending.has(msg.id)) {
        const { resolve: ok, reject: no } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) no(new Error(JSON.stringify(msg.error)));
        else ok(msg.result);
      }
    });
    function send(method, params = {}) {
      const next = ++id;
      return new Promise((ok, no) => {
        pending.set(next, { resolve: ok, reject: no });
        ws.send(JSON.stringify({ id: next, method, params }));
      });
    }
  });
}

async function waitForPages(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const list = await getJson(`http://127.0.0.1:${PORT}/json`);
      const page = list.find((p) => p.type === 'page' && /index\.html|Xotion/i.test(p.url + p.title));
      if (page) return page;
      if (list[0]) return list.find((p) => p.type === 'page') || list[0];
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('Electron CDP did not come up on :' + PORT);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const page = await waitForPages();
  const session = await cdp(page.webSocketDebuggerUrl);
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await new Promise((r) => setTimeout(r, 1500));

  async function shot(name) {
    const { data } = await session.send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(OUT, name);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    return file;
  }

  async function evalExpr(expr) {
    const r = await session.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }

  const first = await evalExpr(`({
    title: document.title,
    studioHidden: document.getElementById('studio').classList.contains('hidden'),
    checks: [...document.querySelectorAll('#checks li')].map(li => li.innerText),
    hint: document.getElementById('hint').textContent,
    runDisabled: document.getElementById('run').disabled,
  })`);
  await shot('verify-window.png');

  async function clickId(id) {
    const box = await evalExpr(`(function(){
      const el = document.getElementById(${JSON.stringify(id)});
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width/2, y: r.y + r.height/2 };
    })()`);
    await session.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
    await session.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  }

  await clickId('refresh');
  await new Promise((r) => setTimeout(r, 600));
  const afterRefresh = await evalExpr(`({
    studioHidden: document.getElementById('studio').classList.contains('hidden'),
    hint: document.getElementById('hint').textContent,
    runDisabled: document.getElementById('run').disabled,
    checks: [...document.querySelectorAll('#checks li')].map(li => li.innerText),
  })`);

  await evalExpr(`(function(){
    const t = document.getElementById('prompt');
    t.value = ${JSON.stringify(PROMPT)};
    t.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await clickId('copy');
  await new Promise((r) => setTimeout(r, 400));
  const copied = await evalExpr(`document.getElementById('hint').textContent`);

  await clickId('run');
  await new Promise((r) => setTimeout(r, 1200));
  const afterRun = await evalExpr(`document.getElementById('hint').textContent`);
  await shot('verify-run.png');

  const promptFile = path.join('C:', 'Drive', 'Xaibridge', 'xotion-studio', '.xotion-last-prompt.md');
  const promptOnDisk = fs.existsSync(promptFile) ? fs.readFileSync(promptFile, 'utf8') : '';

  const report = {
    title: first.title,
    first,
    afterRefresh,
    copied,
    afterRun,
    promptOnDisk: promptOnDisk.slice(0, 200),
    promptMatches: promptOnDisk.trim() === PROMPT,
  };
  fs.writeFileSync(path.join(OUT, 'ui-smoke.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!afterRefresh.checks.some((c) => /Engine/i.test(c))) throw new Error('Engine row missing');
  if (afterRefresh.studioHidden) throw new Error('Studio stayed hidden after refresh');
  if (copied !== 'Prompt copied.') throw new Error('Copy did not update hint: ' + copied);
  if (!report.promptMatches) throw new Error('Run did not write the full prompt file');
  if (!/Claude started \(pid /.test(afterRun) && !/not on PATH/.test(afterRun)) {
    throw new Error('Run hint unexpected: ' + afterRun);
  }
  session.ws.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
