# HANDOFF — read this first (for a new session / new account)

This file is the single onboarding doc. Read it, then `CLAUDE.md`, then you're caught up.

**What this repo is:** **Xotion** — a *prompt-native video editor* ("Cursor for editors"). You give a
prompt + files; a team of agents plans, builds, **self-verifies**, and ships a finished video.
Offline, no API keys. Built on HyperFrames (HTML+GSAP→MP4) + ffmpeg + Whisper + Kokoro TTS.

GitHub: `ahkamboh/xotion-studio` · everything important is committed & pushed.

---

## 1. Get running on a new machine
```bash
brew install git-lfs && git lfs install
git clone https://github.com/ahkamboh/xotion-studio.git
cd xotion-studio && git lfs pull && ./scripts/setup.sh
```
Open Claude Code in the folder. It auto-reads `CLAUDE.md` (the brain) — you just prompt.

---

## 2. How the system works (the mental model)
Three things combine on every motion-graphics video — keep all three:
1. **Style** (`presets/styles.md`) → picks **color + font + layout** (16 named styles).
2. **Richness** (`templates/lib/richness.js`, `window.Rich`) → enforces **density + motion + texture**
   so nothing looks flat/static/thin. THE fix that made our output match top external engines.
3. **Correctness** → `scene-sync.py` (graphics locked to the spoken word) + `charts.js` (XChart:
   correct counter/bar/donut/line) + the **QA gates**.

The whole thing runs as a **team of agents** (`.claude/agents/`, orchestrated per `docs/agent-team.md`):
**Director** (main session) plans + delegates; specialists each do ONE step; **qa-audio + qa-visual
gate delivery — nothing ships until they pass**, and the Director loops until clean. That acceptance
loop is what makes output mistake-free. Read `docs/agent-team.md` for the 12-step pipeline.

---

## 3. The key tools/agents (and the mistake each one kills)
| Tool / Agent | Fixes |
|---|---|
| `scripts/caption.py` (caption agent) | caption drift / wrong language. 41 langs, 7 famous styles (`--preset hormozi/pill/neon/tiktok/...`) |
| `scripts/scene-sync.py` | graphics leading/lagging the voice → emits `scenes.js` (`window.__SCENES` with per-scene `peak`) |
| `templates/lib/charts.js` (XChart) | broken charts (donut full-ring, label flicker). counter/bar/donut/line |
| `templates/lib/richness.js` (Rich) | flat/static/thin scenes. `Rich.idle` (never static), `Rich.texture`, `Rich.cascade/enter`, `.r-shadow2`, furniture |
| `scripts/capture-html.mjs` | renders external browser animations (React `window.__stage` Stage) frame-by-frame → MP4 |
| `scripts/pexels.py` | watermark-free stock b-roll |
| `scripts/tts.sh` (Kokoro) | VO. female `af_heart`/`af_nova`, male `am_onyx`; UK `bf_emma` |
| `scripts/mix-audio.sh` + `qa-audio.sh` | bad mix / clipping. ducks music under VO, masters −14 LUFS, gates it |
| `scripts/enrich.sh` | flat finish. grade + bloom + grain + vignette + motion-blur |
| `scripts/qa-frames.py` + qa-visual agent | wrong/illegible/static scenes (samples mid+peak frames vs expected) |
| `b-roll` agent | graphic-over-broll leak (graphics finish BEFORE cutaway; b-roll plays naked) |
| `:` commands (`COMMANDS.md`, `scripts/help.sh`) | shorthand: `:short @clip`, `:stat <topic>`, `:caption :hormozi`, etc. |

---

## 4. Brand
Official logo set in `assets/brand/` — **Play-O**: ink tile + red ring/▶ play, wordmark **X◉tion**
(Fraunces, the first "o" is the play mark). Palette: cream `#f4f0e6` · ink `#0e0d0c` · red `#e0451f`.
Variants: `xotion-logo{,-dark,-white,-cream-bg,-transparent}` + `xotion-icon{,-dark,-white}` (SVG+PNG).

---

## 5. Proof — what's been made (`demos/`)
~11 finished demos across very different looks, all via the pipeline:
editorial explainer (16:9 + reel, female VO) · Neo-Brutalist (reel + 16:9 + a male-VO render) ·
Musk Multiplier (editorial) · BOLD / DREAM reels · Psychedelic Poster · AI-impact explainer ·
Nikhil Kamath × Elon 30s podcast cut. Posters in `demos/posters/`, linked from the README.

---

## 6. Where we stopped (current state)
- Repo is **clean and pushed** through commit `08af048` (Psychedelic Poster reel).
- Only untracked: `projects/xotion-riso/` (a Risograph-style experiment — commit or discard).
- **No open bugs.** The journey covered: built the agent team + QA gates → fixed caption/sync/chart
  correctness → added `richness.js` after comparing to a stronger external engine (the gap was
  density+motion+texture in *authoring*, NOT the rendering engine) → added styles (Editorial
  Brutalist, Warm Documentary, Neo-Brutalist, Psychedelic) → official logo → b-roll agent +
  capture-html.mjs → many demos. Also did real edits (split-screen, podcast graphic-removal + 30s cut).

## 7. Decisions worth remembering
- **No API keys / offline** is a deliberate product choice — don't add paid services without asking.
- **`:` is the command symbol** (not `/ @ #`, which Claude Code reserves).
- **Don't switch the render engine.** HyperFrames+GSAP can match anything; richness is the lever.
- **Never hand-roll** charts (use XChart) or scene timing (use scene-sync) — that caused past bugs.
- **External React-Stage videos** (the other agent's format) → render via `capture-html.mjs`; their
  browser-TTS voice is NOT captured in export, so add Kokoro VO and mix it in.
- Compress demo MP4s before committing (GitHub 100 MB limit) or use Git LFS.

## 8. Likely next steps
- Commit/decide `projects/xotion-riso/`.
- Frontier = product layer (standalone desktop IDE + on-device model), not more editing features.
- Optional: more QA agents (safe-area, stock-relevance), `:make` one-command end-to-end.
