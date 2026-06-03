# Prompt: Edit a Video (general)

Paste into Claude Code inside `xotion-studio`. Use for any footage operation.

```
Edit my video in the xotion-studio engine (see CLAUDE.md + docs/ffmpeg-recipes.md).

INPUTS:
- VIDEO = "<absolute path>"          (or multiple, comma-separated, to combine)
- DO    = "<what you want>"           e.g. "trim 0:05-0:30, speed up 1.5x, add my logo
           top-right, convert to a 9:16 reel with blurred background, add a fade out"
- EXTRAS = ""                         logo path, music path, target platform, etc.

DO:
1. Probe each input (resolution, fps, duration, audio).
2. Plan the ffmpeg pipeline from docs/ffmpeg-recipes.md (chain filters in one pass when possible).
   - If it needs DESIGNED graphics/animated titles/captions, build those in HyperFrames and
     composite (video as base layer) instead of drawtext.
3. Execute, writing to projects/<name>/renders/ (or a sensible output path).
4. Verify: probe the output + extract a frame or two, Read them, confirm it matches the ask.
5. Deliver the final file at the right spec (use scripts/encode-youtube.sh or cut-reels.sh as
   appropriate). Mention the output path.
```
