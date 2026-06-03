# Prompt: Music-driven motion video (music only, reactive)

Paste into Claude Code inside `xotion-studio`.

```
Make a music-driven motion video (visuals react to the track, no voice) — see presets/video-presets.md
(#3 Music Visualizer) or #4 Lyric Video if it has on-screen words.

INPUTS:
- MUSIC  = "<path to track.mp3>"
- TITLE  = "<track name>"   ARTIST = "<name>"
- FORMAT = "9:16" | "16:9" | "1:1"
- LYRICS = "no"   (yes = make a lyric video instead, prompts/lyric-video.md)
- VIBE   = ""     (colors/mood, e.g. "neon purple", "warm sunset")

DO:
1. Copy track -> assets/track.mp3. amplitude.py assets/track.mp3 --out assets/amp.js.
2. Build from templates/music-visualizer.html. Set data-duration = track length. Apply VIBE
   colors. Bars/orbs/title react to window.__AMP. Add a beat-pulse on the title if it fits.
3. Lint 0/0 -> render.
4. ACCEPTANCE LOOP: scripts/qa.sh + read frames at several timestamps; confirm bars actually move
   with the music (sample loud vs quiet moments), title/colors right, audio intact. Loop, deliver.
```
