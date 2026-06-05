<div align="center">

<img src="assets/brand/xotion-logo-cream-bg.png" alt="Xotion — prompt-native video editor" width="640"/>

### The prompt-native video editor — **Cursor for editors.**

**You describe the edit. A team of agents produces it, checks its own work, and ships it.**
No timeline scrubbing. No keyframing. Just a prompt.

`video editing · image editing · motion graphics — offline, no per-render fees`

</div>

---

## The vision

Text-to-image and text-to-video models generate **pixels** from a prompt.
**xotion generates the *edit*** from a prompt.

Tell it *"make a 1-minute video on how AI is changing the world, female voice, with stock b-roll
and animated stats"* — or *"put these two clips side by side, mute the first, speed the second
1.6×"* — and it plans the shot list, writes the script, voices it, pulls the footage, animates the
graphics in sync with the words, mixes the audio, grades it, **verifies every frame**, and hands you
the finished file.

It's an **editing IDE**: the same way Cursor turned *describe the change → working code*, xotion
turns *describe the edit → finished video.* Effortless editing, for editors, with prompts.

> **Today** it runs as this repo inside Claude Code (clone → prompt → result).
> **The roadmap** is a standalone desktop app — the editor's IDE — driven by the same engine.

---

## Made with xotion

Real outputs — **click any thumbnail to play.** Each was produced from a single prompt.

<table>
  <tr>
    <td align="center" width="50%">
      <a href="https://customer-e3dcu5z0wpq1kd92.cloudflarestream.com/96d3417fb46b556690686e775bff8c1b/watch">
        <img src="https://customer-e3dcu5z0wpq1kd92.cloudflarestream.com/96d3417fb46b556690686e775bff8c1b/thumbnails/thumbnail.jpg?time=2.15s&height=600" width="260" alt="Vertical split-screen edit"/>
      </a><br/><sub>▶ Split-screen edit (3:4)</sub>
    </td>
    <td align="center" width="50%">
      <a href="https://customer-e3dcu5z0wpq1kd92.cloudflarestream.com/8f5c345dd8181f5fcce2cb39d7538f51/watch">
        <img src="https://customer-e3dcu5z0wpq1kd92.cloudflarestream.com/8f5c345dd8181f5fcce2cb39d7538f51/thumbnails/thumbnail.jpg?time=1s&height=600" width="260" alt="Vertical reel"/>
      </a><br/><sub>▶ Vertical reel (9:16)</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <a href="https://customer-e3dcu5z0wpq1kd92.cloudflarestream.com/c2eb21236681cc2efbbcbfc7ff1c3abd/watch">
        <img src="https://customer-e3dcu5z0wpq1kd92.cloudflarestream.com/c2eb21236681cc2efbbcbfc7ff1c3abd/thumbnails/thumbnail.jpg?time=1s&height=600" width="560" alt="AI-impact explainer"/>
      </a><br/><sub>▶ AI-impact explainer — stock b-roll + animated stats + female VO (16:9)</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <a href="https://customer-e3dcu5z0wpq1kd92.cloudflarestream.com/6aa8409d186be77e0e9874e65ae9b14e/watch">
        <img src="https://customer-e3dcu5z0wpq1kd92.cloudflarestream.com/6aa8409d186be77e0e9874e65ae9b14e/thumbnails/thumbnail.jpg?time=3s&height=600" width="560" alt="Narrated motion-graphics explainer"/>
      </a><br/><sub>▶ Narrated motion-graphics explainer (16:9)</sub>
    </td>
  </tr>
</table>

---

## Why it doesn't make mistakes: a team of agents with QA gates

xotion isn't one model winging it. It's a **production team** — each agent owns one job with a strict
"definition of done," and **QA agents gate delivery: nothing ships until it passes.**

```
              DIRECTOR  (plans · delegates · loops until clean)
 PRE-PROD            PRODUCTION                 QA GATES (must all pass)    SHIP
 scriptwriter        sync-master                proofreader                delivery
 art-director   ─►   motion-builder ─► editor ─► colorist ─► qa-audio ─► qa-visual ─► ✅
 stock-scout         captioner
 audio-engineer
```

If a frame is illegible, a stat is wrong, a graphic drifts off the words, or the mix clips — the QA
agent catches it and routes the fix back, re-renders, and re-checks. **The Director won't deliver
with an open failure.** Every recurring mistake is owned by one agent and killed by a gate.
→ see [`docs/agent-team.md`](docs/agent-team.md) and [`.claude/agents/`](.claude/agents).

Specialized, reusable agents already power this:
- **caption agent** — frame-accurate captions, 41 languages, 7 famous styles (Hormozi/pill/neon/TikTok…)
- **scene-sync agent** — locks every graphic to the spoken word (zero drift)
- **XChart** — tested chart library (counter/bar/donut/line) so data-graphics are always correct
- **qa-audio / qa-visual** — self-checks loudness, clipping, legibility, and per-scene correctness

---

## What you can make

| Pillar | Engine | Examples |
|---|---|---|
| **Motion graphics** | HyperFrames (HTML+GSAP→MP4) | explainers, promos, kinetic type, **animated data/charts**, lyric & caption videos, logo reveals, 3D/glass showcases |
| **Video editing** | ffmpeg | trim · speed · split-screen · concat · grade · stabilize · green-screen · transitions · reels · auto-cut · aspect convert |
| **Image editing** | ffmpeg / ImageMagick | resize · crop · compose · background removal · thumbnails · social graphics |

Plus: stock b-roll (Pexels), TTS voiceover, music beds + ducking, premium finish (bloom/grain/grade),
JS graphics overlays (particles/3D/aurora/glass), multi-language subtitles, data-driven batch video.

---

## Quick start

```bash
brew install git-lfs && git lfs install          # the Whisper model ships in-repo via LFS
git clone https://github.com/ahkamboh/xotion-studio.git
cd xotion-studio && git lfs pull
./scripts/setup.sh                               # installs the render engine (pinned), python deps, models
```

Open **Claude Code** in the folder and just say what you want:

```
make a 30s explainer on <topic>, female voice, tech style, with stock b-roll and animated stats
add Hormozi captions to @clip.mp4
put @a.mp4 and @b.mp4 side by side, 3:4, mute the first, speed the second 1.6×
```

Everything runs **offline, no API keys** — bundled Whisper model + fonts, pinned engine.

---

## Prompt it — the `:` shorthand

`@file` = input · `:cmd` = action · chain them · `=value` passes options. Full list: [`COMMANDS.md`](COMMANDS.md).

```
:short @podcast.mp4                 # talking clip → captioned, finished Short
:lyric @song.mp3 :style=noir        # noir lyric video
:caption :neon :lang=ur @reel.mp4   # Urdu neon captions
:rich :aurora @plain.mp4            # graphic overlay + premium finish
:help                               # list every command
```

---

## Under the hood

```
CLAUDE.md            # the engine brain: pillars, rules, the agent-team operating model
.claude/agents/      # 13 specialist subagents (the team)
docs/agent-team.md   # the Director pipeline + QA gates
COMMANDS.md          # the : command vocabulary
scripts/             # caption · scene-sync · pexels · tts · mix · enrich · overlay · qa-audio · qa-frames …
templates/           # compositions + lib/charts.js (XChart)
presets/             # 12 visual styles · motion presets · video presets
prompts/             # copy-paste job prompts
models/small.pt      # bundled Whisper model (offline captions)
assets/fonts/        # 73-family type library
projects/            # one folder per job
```

Built on **[HyperFrames](https://github.com/heygen-com/hyperframes)** (Apache-2.0, HTML→video),
**FFmpeg**, **OpenAI Whisper** (MIT), **Kokoro** TTS, **GSAP**, **Pexels** stock, and Google Fonts (OFL).
Full attribution in [THIRD_PARTY.md](THIRD_PARTY.md).

---

## Roadmap

- ✅ Prompt → finished video, offline, via Claude Code + the agent team
- ✅ Self-verifying QA gates (audio + visual) so it ships mistake-free
- ⏭ Standalone **desktop IDE** for editors (timeline-optional, prompt-first)
- ⏭ On-device model (MLX/Ollama) driving the team — fully local, private
- ⏭ More QA agents (safe-area, stock-relevance) + one-command `:make` end-to-end

---

<div align="center">

**xotion — describe the edit, get the video.**

</div>
