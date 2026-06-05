# Prompt: App / product showcase (3D device + liquid-glass UI)

Premium product-launch video using HyperFrames 3D + glass blocks.

```
Make an app/product showcase in the xotion-studio engine.

INPUTS:
- SCREENS = "<app screenshot(s) or mockup image(s)>"   (shown on the device / in the UI)
- PRODUCT = "<name + one-line pitch>"
- LOOK    = "device" | "liquid-glass"   (device = 3D phone/laptop; liquid-glass = Apple glass UI)
- FORMAT  = "9:16" | "16:9"
- BRAND   = ""   (style from presets/styles.md or brand.json)
- AUDIO   = ""   (narration --content speech, or upbeat music bed)

DO:
1. Pick the block (see docs/blocks.md):
     3D device      -> vfx-iphone-device (real iPhone 15 Pro Max / MacBook GLTF, live HTML screen)
                       or app-showcase (3 floating phone screens)  or ui-3d-reveal
     Apple glass UI -> ios26-liquid-glass / macos-tahoe-liquid-glass / liquid-glass-widgets
   Install: scripts/add-block.sh <block> projects/<name>
2. Put SCREENS into the device/glass slots; add PRODUCT headline + feature callouts (motion presets).
   Apply a style; optional vfx-liquid-background behind for depth.
3. Audio: narration or upbeat bed; end with logo-outro (branded).
4. Lint -> render -> acceptance loop (read frames; screens legible, device clean, text correct).
5. Deliver (+ thumbnail). For app launches, SaaS promos, feature drops.
```
