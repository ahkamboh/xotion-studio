# Prompt: Image + Audio → Lyric Video (+ thumbnail + reels)

Paste this into Claude Code inside the `xotion-studio` repo. Fill the 3 INPUTS.

```
Make a lyric video in the xotion-studio house style (see CLAUDE.md).

INPUTS:
- AUDIO = "<absolute path to .mp3/.wav>"
- IMAGE = "<absolute path to .png/.jpg>"   (background)
- SONG_NAME = "<TITLE>"
- LANGUAGE = "english"   (or: urdu, hindi, spanish... captions stay in this language)

DO:
1. Probe audio duration. Create projects/<song-kebab>/ at 1920x1080, 30fps, full duration.
2. Copy IMAGE -> assets/bg.png, AUDIO -> assets/song.mp3, fonts from repo assets/fonts/.
3. Transcribe with scripts/transcribe.py (model small; add --lang if not English).
4. amplitude.py -> assets/amp.js for the instrumental music bars.
5. Start from templates/lyric-video-landscape.html. Fill the lyrics array from the transcript,
   splitting long lines into two sequential one-liners. Detect instrumental gaps >=3s -> bars.
6. Lint 0/0, render, verify 3 frames, fix if needed.
7. Deliver: YouTube master (scripts/encode-youtube.sh) + thumbnail (scripts/thumbnail.sh).

THEN ASK if I also want 12 vertical reels. If yes:
- Duplicate as a 1080x1920 vertical project (templates/lyric-video-vertical.html), render master,
  pick 12 hook-centered segments, cut with scripts/cut-reels.sh.
```
