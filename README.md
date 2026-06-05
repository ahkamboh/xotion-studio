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

## Worked example 2 — add a female voiceover to an existing video ✅

Take a finished motion-graphics video that has **only music**, and add a **female AI narration**
on top — music auto-ducks under the voice. Source: `projects/ai-cost-explainer/`.
▶️ **Full video (with audio):**
[`projects/ai-cost-explainer/renders/final.mp4`](projects/ai-cost-explainer/renders/final.mp4)

![AI cost explainer preview](docs/ai-cost-explainer.gif)

*Silent GIF preview — download the MP4 for the female voiceover + music.*

**What it is:** a 15s vertical (1080×1920) editorial piece, *"The real cost of scaling an AI"*
(Grok $300M/qtr, Cursor 1,000× token spend, AIBridge cutting 112 features). It already had a
music track but no narration. The engine added a **female voice** (`af_nova`) that reads:
*"The real cost of scaling AI? Brutal. Grok burns three hundred million a quarter. Cursor's token
spend jumped a thousand times. AIBridge cut a hundred features down to a few. The lesson from all
three: pick fewer, and use them deeper."* — timed to start after the title, with the original
music **ducked underneath**.

```bash
# 1. female voiceover from a script
scripts/tts.sh work/script.txt af_nova work/vo.wav
# 2. keep the video's existing music, delay the voice to start after the title
ffmpeg -i assets/source.mp4 -vn work/music.wav
ffmpeg -i work/vo.wav -af "adelay=800|800,apad=whole_dur=15" work/vo-timed.wav
# 3. mix voice over the ducked music (-14 LUFS)
scripts/mix-audio.sh work/vo-timed.wav work/music.wav assets/master.wav 0.6
# 4. mux the new audio back onto the original video (no re-encode of video)
ffmpeg -i assets/source.mp4 -i assets/master.wav -map 0:v -map 1:a -c:v copy -c:a aac \
  -movflags +faststart -shortest renders/final.mp4
```

This shows the engine works on **footage you already made** — not just videos it builds from scratch.

## Worked example 3 — male-voice narrated data video ✅

A 32s vertical editorial piece, *"The Musk multiplier"* — six companies, one operator — with a
**male AI voice** (`am_onyx`, deep/cinematic) over a dark music bed. Source:
`projects/musk-multiplier/`. ▶️ **Full video (with audio):**
[`projects/musk-multiplier/renders/musk-multiplier.mp4`](projects/musk-multiplier/renders/musk-multiplier.mp4)

![Musk multiplier preview](docs/musk-multiplier.gif)

*Silent GIF preview — download the MP4 for the male voiceover + music.*

**What it is:** a "Field Notes" editorial study (dark `#1a120c`, Instrument Serif + JetBrains Mono)
across 6 data scenes — **The Musk multiplier → Tesla $1.1T → SpaceX 134 launches → X −23% →
$1.7T combined → "Love him or not, he runs more than you."** A **male voice** narrates each scene,
timed to the animation, over a dark bed that ducks under the voice. Rebuilt natively in the engine
from a source spec, with proper renderable TTS (male `am_onyx`).

Together the three examples show the full range: **build from a prompt** (female voice, ex.1) ·
**add voice to existing footage** (female, ex.2) · **rebuild a spec into a narrated data video**
(male, ex.3) — every audio mode, both voices, all offline.

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
- **111 ready-made blocks** (`scripts/add-block.sh`): 30 shader transitions, data charts, maps, caption styles, social overlays
- **Data videos**: CSV/numbers → animated charts/maps (`prompts/data-video.md`)

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
