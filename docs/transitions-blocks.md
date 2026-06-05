# Scene transitions (HyperFrames shader blocks)

30 GPU shader transitions for pro polish between scenes/clips. Install with
`scripts/add-block.sh <name> projects/<name>`, then follow the printed snippet (each wraps the
outgoing + incoming layer and animates the transition over a GSAP-driven uniform).

## Cinematic
- **cinematic-zoom** — push/zoom blend · **whip-pan** — fast directional pan
- **light-leak** — warm leak sweep · **flash-through-white** — quick white flash cut
- **gravitational-lens** — lens warp · **cross-warp-morph** — morph between shots

## Energetic / hype
- **glitch** — RGB glitch · **chromatic-radial-split** — chromatic burst
- **swirl-vortex** — spin vortex · **thermal-distortion** — heat shimmer
- **ridged-burn** — burn dissolve · **domain-warp-dissolve** — organic dissolve

## Clean / geometric
- **sdf-iris** — iris open/close · **ripple-waves** — ripple · **grid-pixelate-wipe** — pixel grid wipe
- **transitions-blur** — blur dissolve · **transitions-3d** — 3D flip/cube

## Use by vibe
- music video / sports → whip-pan, glitch, light-leak, flash-through-white
- luxury / cinematic → cinematic-zoom, cross-warp-morph, gravitational-lens
- tech / promo → chromatic-radial-split, glitch, grid-pixelate-wipe
- editorial / clean → sdf-iris, transitions-blur, ripple-waves

Full catalog (111 blocks incl. data, maps, caption styles, social overlays): docs/blocks.md.
