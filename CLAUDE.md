# xotion-studio — Creative Engine (video · image · motion graphics)

A **clone-and-go general-purpose creative engine**. On any machine: clone, run
`./scripts/setup.sh`, open Claude Code here, give a prompt + files, get a polished result.
The agent already knows the full toolkit from this file — the user should NOT re-explain.

**The user's style: "just give me files + a one-line prompt, you do the edit on autopilot."**
Infer intent, pick sensible defaults, produce the result, verify with frames, iterate. Ask only
when genuinely blocked (a real decision only the user can make).

---

## The three pillars

| Pillar | Engine | Use for |
|---|---|---|
| **A. Motion Graphics** | **HyperFrames** (HTML + GSAP → MP4) | Title cards, lower-thirds, kinetic type, logo reveals, promos, explainers, data-viz, intros/outros, animated infographics, lyric/caption videos, ad overlays. Anything *designed and animated*. |
| **B. Video Editing** | **ffmpeg** | Trim, cut, concat, speed, reverse, crop, rotate, resize, color grade, stabilize, overlay/PiP, green-screen, transitions (xfade), burn subtitles, watermark, extract/replace audio, GIF, format/aspect conversion. Anything *operating on existing footage*. |
| **C. Image Editing** | **ffmpeg / ImageMagick** | Resize, crop, convert, filters, text overlay, compositing, collages, background removal, thumbnails, social-graphic generation (often via a 1-frame HyperFrames render). |

**Most real jobs combine pillars.** e.g. "edit my clip + add an animated title" = B (cut/grade the
footage) + A (HyperFrames title overlay) composited together. Decide the pipeline first, then build.

### Decision flow
1. **Operating on existing footage/photo?** → start with **B/C** (ffmpeg).
2. **Designing/animating something new?** → **A** (HyperFrames).
3. **Overlaying designed graphics on footage?** → both: load the video as the base layer in a
   HyperFrames composition (`<video class="clip" muted playsinline>` + separate `<audio>`), animate
   overlays on top, render. (This is how captions/HUD/lower-thirds go onto real footage.)
4. **Need speech, captions, or a transparent subject?** → asset prep step (transcribe / TTS / bg-removal).

---

## A. Motion Graphics (HyperFrames)

HyperFrames is the motion-graphics core. HTML is the source of truth; GSAP animates a paused
timeline registered as `window.__timelines["<id>"]`; the CLI renders deterministically to MP4.

**Don't hand-write from scratch when an example fits.** Scaffold from a built-in example:
```bash
cd projects && npx hyperframes init <name> --width W --height H --fps 30 --duration D \
  --example <example> --non-interactive
```
Examples: `blank`, `warm-grain`, `play-mode`, `swiss-grid`, `vignelli`, `decision-tree`,
`kinetic-type`, `product-promo`, `nyt-graph`. Map intent → example:
- promo / product launch → `product-promo`
- kinetic typography / lyric / quote → `kinetic-type`
- data viz / chart / infographic → `nyt-graph`
- editorial / grid layout → `swiss-grid` or `vignelli`
- flowchart / process → `decision-tree`
- film-grain / warm brand → `warm-grain`
- start clean → `blank`

Then read the HyperFrames skill docs as needed: `npx hyperframes docs <topic>`
(`gsap`, `data-attributes`, `compositions`, `rendering`, `examples`, `troubleshooting`).
Deeper guidance lives in the installed skills at `~/.agents/skills/` (`hyperframes`,
`hyperframes-cli`, `hyperframes-media`, `gsap`, `three`, `lottie`, `tailwind`, ...).

**Repo templates** (proven, copy into `index.html` and adapt):
- `templates/lyric-video-landscape.html` / `lyric-video-vertical.html` — music lyric / caption video
- `templates/ugc-ad-vertical.html` — talking-head ad: 3-tier captions + brand chip + callouts
- `templates/reactive-captions-landscape.html` — HUD + captions over real footage
- `templates/title-card.html` — clean animated title / intro / lower-third starter

**Workflow:** scaffold → build end-state layout first (static), then add GSAP entrances/exits →
`npx hyperframes lint` (must be 0/0) → `npx hyperframes render --output renders/x.mp4` → extract
frames, Read them, verify, fix.

## B. Video Editing (ffmpeg)

Full recipe book: **`docs/ffmpeg-recipes.md`** (trim, concat, speed, crop, rotate, scale, pad,
color, overlay/PiP, chroma-key, xfade transitions, burn subtitles, watermark, audio swap, GIF,
aspect conversion with blurred pad, stabilize). Reach for it for any footage operation.

Common quick refs:
- Probe: `ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate -show_entries format=duration -of default=noprint_wrappers=1 FILE`
- Lossless trim: `ffmpeg -ss S -to E -i in.mp4 -c copy out.mp4` (re-encode for frame accuracy)
- Vertical-fill a landscape (blurred pad): see recipe `aspect-fill`.
- Concatenate clips: `scripts/concat.sh out.mp4 a.mp4 b.mp4 ...`

## C. Image Editing (ffmpeg / ImageMagick)

Recipes in `docs/ffmpeg-recipes.md` (Image section). For *designed* social graphics / thumbnails
with text + layout, prefer a **1-frame HyperFrames render** (full CSS/typography control), then
grab the frame. `scripts/thumbnail.sh` pulls a frame from any video.

---

## Asset prep & utilities (shared)

| Need | Tool | Command |
|---|---|---|
| Speech → captions | Whisper | `python3 scripts/transcribe.py <media> --model small [--lang xx]` |
| Text → voiceover | Kokoro TTS | `scripts/tts.sh "text or file" af_nova out.wav` |
| Remove background | u2net | `scripts/remove-bg.sh subject.mp4 out.webm` (transparent) |
| Music-reactive bars | RMS envelope | `python3 scripts/amplitude.py <audio> --out assets/amp.js` |
| **Subtitles (.srt/.vtt)** | from transcript | `python3 scripts/export-subs.py work/transcript.json --out subs` |
| **Translate subs (offline)** | Argos MT | `python3 scripts/translate-subs.py subs.srt --to es` |
| **Normalize loudness** | ffmpeg loudnorm | `scripts/normalize-audio.sh in out [-14]` (−14 LUFS, streaming std) |
| **Color grade / LUT look** | ffmpeg | `scripts/grade.sh in out <teal-orange\|warm\|moody\|vintage\|clean\|vibrant\|bw\|cine>` |
| **Generate music bed** | ffmpeg synth | `scripts/music-bed.sh bed.wav 30 <calm\|warm\|tense\|uplift\|dark>` |
| **Auto-pick reel hooks** | energy+keywords | `python3 scripts/find-hooks.py audio segments.json --n 12 --len 18` → segments.txt |
| **Verify a render (QA)** | frames + inspect | `scripts/verify.sh render.mp4 [ts,ts,...]` or `scripts/verify.sh --inspect <dir>` |
| **Concatenate clips** | ffmpeg | `scripts/concat.sh out.mp4 a.mp4 b.mp4 ...` |
| **Thumbnail (designed)** | template | render `templates/thumbnail.html` → grab frame 1 |
| **Animated icons** | Lottie | `templates/lottie-overlay.html` + a `.json` from lottiefiles.com |

**Caption styles:** `docs/caption-styles.md` has 6 drop-in looks (house, karaoke, bold punch-in,
typewriter, slide-up mask, word-pop). Pick to match the brief.

**Brand kits:** if a `brand.json` (or `brands/<name>.json`, see `brand.example.json`) exists, READ
it first and apply its colors/fonts/logo/tone to every composition for that client.

**Subtitle the deliverable:** for talking videos, also export `.srt` so YouTube captions are
selectable/searchable (SEO + accessibility). Normalize loudness on final audio for consistent volume.

Transcription language rule: model **small** (base hallucinates; never `*.en` for non-English).
Known non-English → `--lang <code>`. Captions stay in source language unless asked to translate/romanize.
**Default caption language = English.**

---

## NON-NEGOTIABLE rules (hard-won — don't relitigate)

- Whisper model = **small**, not base.
- **Pre-render caption/animated text into the DOM**, then animate the existing spans. NEVER create
  elements inside `tl.call()` then target them — GSAP resolves selectors at construction time and
  finds nothing → elements silently never appear.
- **No `Math.random()` / `Date.now()` / network fetches** in compositions (deterministic renderer).
- **Finite GSAP repeats only** — `repeat: -1` breaks rendering. Use `Math.floor(total/cycle)-1`.
- **Scope every GSAP selector**: `Q = s => '[data-composition-id="main"] ' + s`.
- **Local fonts only** (`@font-face` → `assets/fonts/*.ttf`). Google Fonts `<link>` fails in
  sandbox renders. The repo ships a **~73-family design library** (`assets/fonts/`, named
  `<slug>-<weight>.ttf`) — see **`docs/FONTS.md`** for the catalog, "pick by job" table, and
  pairing cheat sheet. Choose fonts that fit the brief; don't default to Inter every time.
  Top up the library anytime with `python3 scripts/download-fonts.py`.
- **Source video on a track**: `<video class="clip" muted playsinline>` + separate
  `<audio data-track-index>`. Re-encode sources with dense keyframes first if render warns:
  `ffmpeg -i in.mp4 -c:v libx264 -r 30 -g 30 -keyint_min 30 -movflags +faststart -crf 18 -c:a aac out.mp4`
- **Always verify** by extracting frames and Reading them before declaring done.

## House caption / type style (default look — override on request)

- Lyrics/social captions: **Poppins Bold**, ALL CAPS, pure white, word-by-word blur-clear reveal
  (in: opacity0→1, y22→0, scale.96→1, blur6→0, .65s, stagger .06, power3.out; out: →0, y-14, blur4,
  .5s, stagger .03, power2.in). Split long lines into two sequential one-liners.
- UI/data: Inter. Editorial: Instrument Serif italic. Code/mono: JetBrains Mono.
- Music bars: 7 white pills, instrumental gaps ≥3s only, read `window.__AMP` @100ms, offsets
  `[0,2,4,6,4,2,0]`, `scaleY=0.12+min(1,amp)*1.35`.

## Encoding / delivery specs

- **YouTube 16:9**: 1920×1080, H.264 High@4.2, yuv420p, 2s GOP, AAC 320k/48k, `+faststart`
  → `scripts/encode-youtube.sh in.mp4 out.mp4 "TITLE"`.
- **Shorts / Reels / TikTok / Pinterest 9:16**: 1080×1920, AAC 256k, 15–30s.
- **Square (IG feed)**: 1080×1080. **Story**: 1080×1920.
- **GIF**: see recipe `to-gif`.
- Cut a vertical master into N reels: `scripts/cut-reels.sh master.mp4 segments.txt out_dir`.
- Thumbnail/poster: `scripts/thumbnail.sh video.mp4 <ts> out.jpg`.

## Per-project layout
```
projects/<name>/
  index.html         # HyperFrames composition (if motion-graphics involved)
  assets/            # media, amp.js, fonts
  work/              # transcripts, intermediate files, verification frames (gitignored)
  renders/           # output mp4/png/gif (gitignored)
```

## Prompts library (`prompts/`)
- `edit-video.md` — general "edit this video [do X]".
- `edit-image.md` — general "edit/convert/compose this image".
- `motion-graphics.md` — "make a [title card / promo / explainer / data-viz / intro] about X".
- `captioned-video.md` — add captions/lyrics/graphics onto any video.
- `lyric-video.md` — image + audio → lyric video + thumbnail + reels.

Read the relevant one, fill the INPUTS, follow it. If a request blends pillars, combine workflows.
