# Prompt: Make a Motion Graphic (general)

Paste into Claude Code inside `xotion-studio`. For anything designed + animated.

```
Make a motion graphic in the xotion-studio engine (see CLAUDE.md, "A. Motion Graphics").

INPUTS:
- WHAT     = "<title card | intro/outro | promo | explainer | data-viz | logo reveal |
              lower-third | kinetic typography | product showcase | infographic>"
- CONTENT  = "<the actual text / data / message>"   (real content, not lorem)
- BRAND    = ""    colors, fonts, logo path (else use house style + repo fonts)
- FORMAT   = "16:9"   (or 9:16 reel, 1:1 square)
- DURATION = "auto"   (pick what suits the content)
- MUSIC    = ""       optional bg track or "generate a bed"

DO:
1. Pick the closest HyperFrames example (product-promo, kinetic-type, nyt-graph, swiss-grid,
   vignelli, decision-tree, warm-grain, blank) OR a repo template (templates/title-card.html etc.).
   Scaffold: cd projects && npx hyperframes init <name> --width W --height H --fps 30 --duration D
   --example <e> --non-interactive
2. Build the END-STATE layout first (static HTML+CSS, real content, local fonts from repo).
3. Add GSAP: staggered entrances (expo/back.out), one ambient motion, decisive exits. Scope
   selectors with Q(). Finite repeats only. Register window.__timelines["main"].
4. Add voiceover/music if asked (scripts/tts.sh, then an <audio> track; or generate a bed).
5. Lint 0/0 -> render -> extract frames -> Read -> verify -> fix.
6. Deliver at the requested format/spec. Offer reels/thumbnail variants if useful.
```
