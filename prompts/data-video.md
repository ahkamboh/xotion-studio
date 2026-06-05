# Prompt: Data video (CSV / numbers → animated chart video)

Turn data into an animated video using the HyperFrames data blocks.

```
Make a data video in the xotion-studio engine.

INPUTS:
- DATA   = "<CSV path, or the numbers/stats inline>"
- TYPE   = "auto"   (bar-chart | bar-race | line | map | choropleth)
- TOPIC  = "<title / what the data shows>"
- FORMAT = "16:9" | "9:16"
- BRAND  = ""   (style from presets/styles.md, or a brand.json)
- AUDIO  = ""   (optional narration --content speech, or a music bed)

DO:
1. Pick the block from the registry (see docs/blocks.md):
     bars/stats        -> data-chart
     ranking over time -> (animate data-chart values / bar-race style)
     geography         -> world-map / us-map / us-map-bubble / spain-map
   Install it:  scripts/add-block.sh <block> projects/<name>
2. Scaffold the project (format/duration), apply a visual style (presets/styles.md), wire the
   block with your real data (parse the CSV -> the block's data array). Add title + source label.
3. Optional audio: narration (caption agent --content speech) or a music bed (scripts/music-bed.sh).
4. Lint -> render -> acceptance loop (read frames; confirm numbers/labels are correct + legible).
5. Deliver (+ thumbnail). Great for prop-firm stats, sports numbers, growth charts, rankings.
```
