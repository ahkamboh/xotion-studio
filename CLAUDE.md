# xotion-studio — Video Autopilot

This repo is a **clone-and-go video editing engine**. On any new machine: clone, run
`./scripts/setup.sh`, open Claude Code here, and start giving prompts. The agent already
knows the full workflow from this file — the user should NOT have to re-explain anything.

## What this repo does

Given **a video and/or an image + audio**, produce polished social videos with:
- Animated captions / lyrics (any language, default English)
- Word-by-word reveal animations (blur-clear, rise, stagger)
- Brand logos, callout graphics, music-visualizer bars
- Auto thumbnails
- YouTube uploads + vertical Shorts/Reels cut from a master

The user's working style: **"just give me a video/image, you do the edit on autopilot."**
Infer intent, pick sensible defaults, render, show frames, iterate. Only ask when truly blocked.

## The golden workflow (follow every time)

1. **Probe the input**
   `ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate -show_entries format=duration -of default=noprint_wrappers=1 <file>`
   - Decide orientation: landscape source → 1920×1080; vertical/reel source → 1080×1920.
   - Duration drives the composition `data-duration`.

2. **Scaffold a project** under `projects/<name>/` (kebab-case):
   `cd projects && npx hyperframes init <name> --width W --height H --fps 30 --duration D --non-interactive`
   Copy media into `projects/<name>/assets/`, copy needed fonts from repo `assets/fonts/`.

3. **Transcribe** (if there's speech/lyrics):
   `python3 ../../scripts/transcribe.py assets/<audio_or_video> --model small --out work/transcript.json`
   - ALWAYS use whisper **small** (base hallucinates; never `*.en` for non-English).
   - For known non-English audio: add `--lang <code>` (ur, hi, es, fr, ...). Captions stay in that
     language unless the user says "romanize" or "translate". Default language = English.

4. **Amplitude** (if using music-visualizer bars during instrumental gaps):
   `python3 ../../scripts/amplitude.py assets/<audio> --out assets/amp.js`

5. **Pick a template** from repo `templates/` that matches the job, copy to `index.html`, adapt:
   - `lyric-video-landscape.html` — music lyric video, 16:9 (YouTube)
   - `lyric-video-vertical.html` — music lyric video, 9:16 (Shorts/Reels/Pinterest)
   - `ugc-ad-vertical.html` — talking-head ad: captions + brand logo + callout graphics
   - `reactive-captions-landscape.html` — overlay HUD/captions on talking-head footage
   Re-point `@font-face` paths and `assets/` references. Update `data-width/height/duration`.

6. **Lint until clean**: `npx hyperframes lint` → must be `0 errors, 0 warnings`.

7. **Render**: `npx hyperframes render --output renders/<name>.mp4`

8. **Verify**: extract 3 frames with ffmpeg (~5s, mid, a key moment), Read them, confirm
   captions/graphics look right. Fix and re-render before declaring done.

9. **Deliverables** depending on ask:
   - YouTube master: `./scripts/encode-youtube.sh renders/x.mp4 renders/x-youtube.mp4 "TITLE"`
   - Thumbnail: `./scripts/thumbnail.sh renders/x.mp4 6 renders/x-thumb.jpg`
   - Reels: render a vertical master, then `./scripts/cut-reels.sh master.mp4 segments.txt renders/reels`

## NON-NEGOTIABLE rules (learned the hard way — do not relitigate)

- **Whisper model = `small`.** `base` produced wrong lyrics and missed an entire bridge verse.
- **Pre-render caption HTML into the DOM**, then animate the existing `.w` word spans.
  NEVER create spans inside `tl.call(...)` then target them — GSAP resolves selector strings at
  timeline-construction time, finds nothing, and the captions silently never appear.
- **No `Math.random()` / `Date.now()` / network fetches** in compositions — capture engine is
  deterministic and seeks to exact frames.
- **Finite GSAP repeats only.** `repeat: -1` breaks the renderer. Use
  `repeat: Math.floor(total/cycle) - 1`.
- **Scope every GSAP selector** with `Q(s) => '[data-composition-id="main"] ' + s`.
- **Don't set `opacity:0` in CSS on elements you animate with `gsap.from({opacity:0})`** — use
  `fromTo` when CSS already holds an initial transform.
- **Local fonts only.** Google Fonts `<link>` fails in sandboxed renders. Use `@font-face` →
  `assets/fonts/*.ttf` (the repo ships Inter, Poppins, Instrument Serif, JetBrains Mono).
- **Re-encode source video with dense keyframes before compositing** if the render warns about
  sparse keyframes: `ffmpeg -i in.mp4 -c:v libx264 -r 30 -g 30 -keyint_min 30 -movflags +faststart -crf 18 -c:a aac out.mp4`
- **Audio is a separate `<audio data-track-index="0">`**; video must be `muted playsinline`.

## Caption style defaults (the house look)

- Font: **Poppins Bold** for lyrics/social; Inter for UI/data; Instrument Serif italic for editorial.
- Lyrics: **ALL CAPS**, pure white `#fff`, no shadow unless legibility demands it.
- Long lines: split into TWO sequential one-line captions (timed from word data); avoid 3-line wraps.
- Landscape: `white-space: nowrap`, ~78px. Vertical: allow 2-line wrap, ~70px, `width: 920px`.
- Word reveal: opacity 0→1, y 22→0, scale 0.96→1, blur 6px→0, dur 0.65s, stagger 0.06s, `power3.out`.
- Word exit: opacity→0, y→-14, blur→4px, dur 0.5s, stagger 0.03s, `power2.in`.
- Music bars: 7 white pills, shown ONLY in instrumental gaps ≥3s, read `window.__AMP` at 100ms
  steps with phase offsets `[0,2,4,6,4,2,0]`, `scaleY = 0.12 + min(1,amp)*1.35`.
- For ads (Fintokei-style): 3-tier hierarchy — tiny brand chip, BIG gradient emphasis word,
  small white support line. Highlight = vertical gradient `#B8C5FF→#7B91FF→#4A6EFF` with glow.

## Encoding specs

- **YouTube (16:9)**: 1920×1080, H.264 High@4.2, yuv420p, 2s GOP, AAC 320k/48k, `+faststart`.
- **Shorts / Reels / Pinterest (9:16)**: 1080×1920, same codec, AAC 256k, 15–30s clips.
- Always `-movflags +faststart` so the file streams instantly.

## Per-project layout

```
projects/<name>/
  index.html         # the composition
  assets/            # bg image, audio, amp.js, fonts (or symlink repo fonts)
  work/              # transcript.json, extracted wavs, verification frames (gitignored)
  renders/           # output mp4s (gitignored unless small)
```

## Prompts library

`prompts/` holds copy-paste prompt templates. The most-used is `prompts/lyric-video.md`
("here's an image + audio → make a lyric video + thumbnail + 12 reels"). Read it, fill the
INPUTS, follow it exactly.

## Skills / tooling reference

- HyperFrames skill docs: run `npx hyperframes docs <topic>` (data-attributes, gsap, rendering...).
- Installed agent skills live under `~/.agents/skills/` after `./scripts/setup.sh`
  (`hyperframes`, `hyperframes-cli`, `hyperframes-media`, `gsap`, etc.).
- Helper scripts in `scripts/`: `transcribe.py`, `amplitude.py`, `encode-youtube.sh`,
  `cut-reels.sh`, `thumbnail.sh`, `setup.sh`.
