# Prompt: Edit / Create an Image (general)

Paste into Claude Code inside `xotion-studio`.

```
Edit my image in the xotion-studio engine (see CLAUDE.md + docs/ffmpeg-recipes.md Image section).

INPUTS:
- IMAGE = "<absolute path>"           (or several to composite/collage)
- DO    = "<what you want>"            e.g. "crop to 1080x1080, warm grade, add the title
           'SUMMER' in Poppins centered, drop my logo bottom-right, export PNG + a 1080x1920 story version"
- EXTRAS = ""                          logo, brand colors, fonts, output formats

DO:
1. Inspect the image (dimensions, format).
2. Simple ops (resize/crop/convert/filter/overlay/collage) -> ffmpeg or ImageMagick recipes.
3. DESIGNED graphics (text + layout + brand typography, thumbnails, social posts) ->
   build a 1-frame HyperFrames composition at the target size, render, grab the frame
   (scripts/thumbnail.sh or `-frames:v 1`). Full CSS control beats drawtext.
4. Remove background if asked: scripts/remove-bg.sh.
5. Export every requested format/size. Verify by Reading the output. Report paths.
```
