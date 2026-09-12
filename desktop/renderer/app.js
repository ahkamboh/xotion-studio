const LABELS = {
  engine: 'Engine',
  node: 'Node 22+',
  ffmpeg: 'ffmpeg',
  python: 'Python',
  claude: 'Claude CLI',
};

const checks = document.getElementById('checks');
const studio = document.getElementById('studio');
const hint = document.getElementById('hint');
const prompt = document.getElementById('prompt');
const runBtn = document.getElementById('run');
let userHintUntil = 0;

function setUserHint(text) {
  hint.textContent = text;
  userHintUntil = Date.now() + 8000;
}

function render(status) {
  checks.innerHTML = '';
  for (const [key, item] of Object.entries(status.items)) {
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'dot ' + (item.ok ? 'ok' : 'bad');
    const name = document.createElement('strong');
    name.textContent = LABELS[key] || key;
    const path = document.createElement('span');
    path.className = 'path';
    path.textContent = item.path || item.version || 'not found';
    li.append(dot, name, path);
    checks.append(li);
  }
  studio.classList.toggle('hidden', !status.ready);
  runBtn.disabled = !status.items.claude.ok;
  if (Date.now() < userHintUntil) return;
  hint.textContent = status.items.claude.ok
    ? 'Ready. This launches Claude CLI in the engine folder.'
    : status.ready
      ? 'Engine is ready. Install Claude CLI to use Run, or copy the prompt into Cursor.'
      : 'Finish the red rows, then the prompt box appears.';
}

async function refresh() {
  render(await window.xotion.status());
}

document.getElementById('refresh').addEventListener('click', refresh);
document.getElementById('pick').addEventListener('click', async () => {
  render(await window.xotion.pickEngine());
});
document.getElementById('open').addEventListener('click', () => window.xotion.openEngine());
document.getElementById('copy').addEventListener('click', async () => {
  await navigator.clipboard.writeText(prompt.value);
  setUserHint('Prompt copied.');
});
document.getElementById('run').addEventListener('click', async () => {
  const res = await window.xotion.runPrompt(prompt.value);
  setUserHint(res.ok ? `Claude started (pid ${res.pid}).` : res.error);
});

refresh();
setInterval(refresh, 4000);
