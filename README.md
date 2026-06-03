# xotion-studio

Private **creative engine** — clone on any machine, give Claude Code files + a one-line prompt,
get the result on autopilot. **Video editing · image editing · motion graphics.**

Built on [HyperFrames](https://hyperframes.heygen.com) (HTML+GSAP→MP4) for motion graphics,
**ffmpeg / ImageMagick** for video & image editing, **Whisper** for captions, **Kokoro** for TTS,
**u2net** for background removal.

## Quick start (new machine)

```bash
# git-lfs is required — the Whisper model ships in the repo (no re-download).
brew install git-lfs        # or: apt-get install git-lfs    (one time per machine)
git lfs install

git clone https://github.com/ahkamboh/xotion-studio.git
cd xotion-studio
git lfs pull                # pulls the bundled Whisper small model (~460 MB)
./scripts/setup.sh          # one-time: installs hyperframes locally (pinned, from
                            #   package-lock.json), fetches the render browser, copies
                            #   the Whisper model into cache, installs python deps
```

After `setup.sh`, the render engine is installed locally (pinned) and runs offline with no
further downloads — `npx hyperframes` resolves to the local copy instantly.

> The **Whisper `small` model is bundled** in `models/small.pt` via Git LFS, so transcription
> works offline immediately and never re-downloads (also avoids the model-hub SHA-corruption issue).
> `setup.sh` copies it to `~/.cache/whisper/small.pt`.

Open **Claude Code** in this folder and paste a prompt from `prompts/`. Claude reads `CLAUDE.md`
automatically and follows the full toolkit — you just provide files.

## What it can do

| Pillar | Engine | Examples |
|---|---|---|
| **Motion graphics** | HyperFrames | title cards, intros/outros, promos, explainers, kinetic type, data-viz, logo reveals, lower-thirds, lyric/caption videos, animated infographics |
| **Video editing** | ffmpeg | trim, cut, concat, speed, reverse, crop, rotate, scale, color grade, stabilize, overlay/PiP, green-screen, xfade transitions, burn subtitles, watermark, audio swap, GIF, aspect conversion |
| **Image editing** | ffmpeg / ImageMagick | resize, crop, convert, filters, text, compositing, collages, background removal, thumbnails, social graphics |

Most jobs combine pillars (e.g. grade footage + overlay an animated title).

## Prompts

| Prompt | Use |
|---|---|
| `prompts/edit-video.md` | "edit this video [trim / speed / reel / logo / grade...]" |
| `prompts/edit-image.md` | "edit/convert/compose this image" |
| `prompts/motion-graphics.md` | "make a [title / promo / explainer / data-viz / intro]" |
| `prompts/captioned-video.md` | add captions / lyrics / brand graphics to any video |
| `prompts/lyric-video.md` | image + audio → lyric video + thumbnail + reels |

## Layout

```
CLAUDE.md                 # the brain: 3 pillars, workflows, rules, house style
README.md
new-project.sh            # ./new-project.sh name [W] [H] [duration]
brand.example.json        # copy to brand.json -> auto-apply client colors/fonts/logo
templates/                # title-card, thumbnail, lyric (16:9 & 9:16), ugc-ad,
                          #   reactive-captions, lottie-overlay
scripts/                  # transcribe, amplitude, tts, remove-bg, concat, export-subs,
                          #   translate-subs, normalize-audio, grade, music-bed, find-hooks,
                          #   verify, encode-youtube, cut-reels, thumbnail, download-fonts, setup
prompts/                  # copy-paste job prompts
docs/                     # ffmpeg-recipes, caption-styles, FONTS, encoding-cheatsheet
assets/fonts/             # ~73-family design library (.ttf, local)
models/small.pt           # bundled Whisper model (Git LFS) — offline transcription
projects/                 # one folder per job (renders/work gitignored)
```

## Worked example — explainer video about Xotion (end-to-end, verified ✅)

A **narrated explainer video about Xotion itself** — a female AI voice speaks over background
music while animated scenes explain what the engine does. Built entirely from the engine's own
scripts in one pass. ▶️ **Full video (with audio):**
[`projects/demo-promo/renders/demo-promo.mp4`](projects/demo-promo/renders/demo-promo.mp4)

![Xotion explainer video preview](docs/demo-promo.gif)

*Preview above is a silent GIF — download the MP4 for the female voiceover + music.*

**What it is:** a 7.5-second 16:9 explainer in the **Tech Gradient** style (blue-purple, Sora font,
glassmorphism). A **female voice** (Kokoro `af_nova`) narrates *"This is Xotion studio. Give it any
prompt. It picks the style, the voice, and the motion. Then renders your video, ready to post."* —
over an **uplift music bed that auto-ducks under the voice**. Four animated scenes are timed to the
narration: **xotion studio → Give it any prompt → glass Style / Voice / Motion chips → Then renders
your video**.

**Prompt that made it:** *"Make a short narrated explainer about Xotion, female voice, tech style, 16:9."*

**What the agent did (all no-API):**
```bash
# 1. Art direction: prompt -> Tech Gradient style (blue-purple, Sora + Inter), 16:9   [presets/styles.md]
# 2. Voiceover (female)
scripts/tts.sh projects/demo-promo/work/script.txt af_nova work/vo.wav        # docs/voices.md
# 3. Scene timing from the voice
python3 scripts/transcribe.py work/vo.wav --model small --lang en --out work/vo-transcript.json
# 4. Background music + duck it under the voice, master to -14 LUFS
scripts/music-bed.sh work/bed.wav 8 uplift
scripts/mix-audio.sh work/vo.wav work/bed.wav assets/master.wav 0.30
# 5. Build from templates/narrated-motion.html, scenes timed to the VO words
npx hyperframes lint            # 0 errors
npx hyperframes render --output renders/demo-promo.mp4
# 6. Acceptance loop — mechanical gate + read every frame
scripts/qa.sh renders/demo-promo.mp4 --w 1920 --h 1080 --fps 30 --dur 7.5
```

**Result:** 1920×1080 · 30fps · 7.5s · **female voiceover (`af_nova`) over ducked music** (mastered
to −14 LUFS) · 4 animated scenes timed to the narration. QA mechanical gate **PASS**; all four
scenes visually verified.

This confirms the pipeline works: art-direction style → TTS → transcription → music bed →
auto-ducked mix → motion-graphics render → QA. Reproduce or restyle by changing the prompt.

## Capabilities at a glance

- **Transcribe** (offline, bundled model) · **TTS voiceover** · **subtitles** (.srt/.vtt) ·
  **offline translation** to any language
- **Caption styles**: 6 looks (house, karaoke, bold punch-in, typewriter, slide-up, word-pop)
- **Color grades**: teal-orange, warm, moody, vintage, clean, vibrant, b&w, cine
- **Audio**: loudness normalize (−14 LUFS), generate ambient music beds, mix/duck
- **Auto reels**: hook detection scores the best segments for Shorts
- **Brand kits**: `brand.json` auto-applies colors/fonts/logo
- **QA**: `verify.sh` frame-extraction + HyperFrames visual inspect
- **Thumbnails** & **Lottie** icon animations · **SFX pack** (whoosh/riser/impact/…)

## Requirements

Node.js ≥ 22, ffmpeg, Python 3.9+ (whisper installs via setup). ImageMagick optional for some
image ops (`brew install imagemagick`). macOS / Linux (Windows: WSL).

See `CLAUDE.md` for the non-negotiable engineering rules and house style.

## Credits

Xotion is built on top of these open-source projects — thank you to their authors:

- **[HyperFrames](https://github.com/heygen-com/hyperframes)** by HeyGen (Apache-2.0) — HTML→video render engine
- **[FFmpeg](https://ffmpeg.org)** — video/image/audio processing
- **[OpenAI Whisper](https://github.com/openai/whisper)** (MIT) — speech-to-text
- **[GSAP](https://gsap.com)** — animation · **Google Fonts** (OFL) — typography

Full attribution in [THIRD_PARTY.md](THIRD_PARTY.md).
