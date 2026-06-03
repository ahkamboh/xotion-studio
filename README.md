# xotion-studio

Private **video-editing autopilot**. Clone on any machine, give Claude Code an image/video/audio,
get polished captioned videos, thumbnails, and Shorts/Reels — without re-explaining the workflow.

Built on [HyperFrames](https://hyperframes.heygen.com) (HTML + GSAP → MP4) + Whisper + ffmpeg.

## Quick start (new machine)

```bash
git clone https://github.com/ahkamboh/xotion-studio.git
cd xotion-studio
./scripts/setup.sh          # installs HyperFrames skills, whisper, checks ffmpeg/node
```

Then open **Claude Code** in this folder and paste a prompt from `prompts/`:
- `prompts/lyric-video.md` — image + audio → lyric video + thumbnail + reels
- `prompts/captioned-video.md` — any video → captions / lyrics / brand graphics

Claude reads `CLAUDE.md` automatically and follows the full workflow. You just provide the files.

## What's inside

| Folder | Contents |
|---|---|
| `CLAUDE.md` | The brain — full workflow, house style, hard-won rules. Agent reads this on every session. |
| `templates/` | Proven compositions: lyric (16:9 & 9:16), UGC ad, reactive captions. |
| `scripts/` | `transcribe.py`, `amplitude.py`, `encode-youtube.sh`, `cut-reels.sh`, `thumbnail.sh`, `setup.sh`. |
| `prompts/` | Copy-paste prompt templates for common jobs. |
| `assets/fonts/` | Inter, Poppins, Instrument Serif, JetBrains Mono (`.ttf`, local). |
| `projects/` | One folder per video you make. Renders are gitignored. |
| `docs/` | Extra notes / encoding cheatsheet. |

## Requirements

- Node.js >= 22, ffmpeg, Python 3.9+ (whisper installs via setup).
- macOS / Linux. (Windows: use WSL.)

## House style (summary)

- Captions: Poppins Bold, ALL CAPS, pure white, word-by-word blur-clear reveal.
- Default language English; any language supported (pass `--lang`).
- Music bars in instrumental gaps. Auto thumbnails. 12 hook-centered reels on request.
- Encoding: YouTube 1080p H.264/AAC `+faststart`; Shorts 1080×1920.

See `CLAUDE.md` for the non-negotiable engineering rules.
