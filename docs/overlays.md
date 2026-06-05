# Overlays & end-cards — drop onto any video

Install with `scripts/add-block.sh <name> projects/<name>`, then include the snippet on top of your
composition (overlays sit above the video; give them a high z-index). Time them where you want.

## Social CTAs (engagement)
- **yt-lower-third** — YouTube subscribe lower-third (avatar + channel)
- **tiktok-follow** · **instagram-follow** — animated follow card + button
- **x-post** · **reddit-post** · **spotify-card** — post / now-playing cards
- **macos-notification** — notification banner
Use at a natural beat (mid-video for follow, or the outro). Keep one CTA per moment.

## Branded end-card
- **logo-outro** — cinematic logo assembly + glow bloom. Reusable outro for every video.
  Drop your logo in; pull colors from brand.json. Place in the last 2–4s.

## Atmosphere (subtle, full-video)
- **grain-overlay** — film grain warmth · **vignette** — cinematic edges · **light-leak** — warm sweep
  Layer at low opacity for texture; great over flat footage or solid-color motion graphics.

## Premium text FX
- **vfx-text-cursor** — chromatic cursor reveal · **shimmer-sweep** — light sweep across text
- **texture-mask-text** — 66 luminance-mask presets · **caption-blend-difference** — auto-invert text

See docs/blocks.md for the full 111-block catalog.
