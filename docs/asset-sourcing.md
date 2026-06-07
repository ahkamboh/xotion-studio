# Asset Sourcing — MAKE vs FETCH (decide before every asset)

The engine is not a stock-photo downloader. It can **author** vectors, illustrations,
abstract art, charts, kinetic type, and procedural 3D from scratch. Reaching for Pixabay
first is often the WRONG call — a made asset is on-brand, scalable, recolorable,
animatable, license-free, and has no rectangular-edge seam.

> **Governing bias: design-able → MAKE it. Photographic / filmed / real → FETCH it.**

## The decision (run it per asset, before any fetch)

| The asset is… | Decision | How |
|---|---|---|
| Icon · logo · symbol · badge · arrow · pictogram · shape | **MAKE** | hand-author SVG (`<svg>` paths) in the comp |
| Abstract background · gradient · pattern · texture · geometric art | **MAKE** | CSS gradients / canvas / SVG (deterministic, seeded) |
| Chart · graph · diagram · map · data-viz | **MAKE** | `XChart` (templates/lib/charts.js) or data blocks |
| Kinetic type · title · lower-third · word-art | **MAKE** | always — it's type, never a stock image |
| Procedural 3D · device mockup · rotating primitive · particle field · globe · abstract geometry | **MAKE** | three.js procedural geometry (hf-seek clock) |
| Animated reaction (confetti, sparkle, burst) | **MAKE** (preferred) | canvas particles, seeded; FETCH a gif only if a *specific real look* is required |
| Real photograph — person, place, product, food, nature, real texture | **FETCH** | `pixabay-photo.sh` (you can't hand-draw a photo) |
| Real video b-roll / footage | **FETCH** | `pixabay-video.sh` |
| Detailed realistic 3D model you cannot author | **FETCH** | `pixabay-3d.sh` (real `.glb`) |
| Brand asset the user provided | **USE as-is** | from brand.json / supplied files |

## Why MAKE wins when the asset is design-able
- **On-brand exactly** — your palette/style, not a stock "close enough."
- **Infinitely scalable** — SVG never pixelates at any size or overshoot scale.
- **Recolorable + per-element animatable** — animate the rocket's flame, the icon's stroke, the badge's ring independently. A flat stock raster can't be taken apart.
- **Deterministic, license-free, zero fetch latency.**
- **No rectangular-edge seam** — the #1 composite bug. A fetched raster carries its background; an authored SVG is transparent by construction. (This is exactly the bug the pipeline-test rocket hit.)

## Why FETCH wins for realism
You cannot hand-draw a photorealistic human face, a real skyline, real filmed motion, or a detailed real product. For anything that needs a **camera or photographic realism**, stock is the right tool — and Pixabay is the source (commercial-OK, license logged).

## The litmus test
> *"Could a designer draw this from scratch and would drawing it look BETTER (more on-brand) than the best stock match?"*
> **Yes → MAKE.  Needs a camera → FETCH.**

When genuinely unsure for a *graphic* element, default to MAKE (it's controllable and seam-free). For a *realistic* element, default to FETCH.

## Ownership
- **art-director** makes the per-asset MAKE/FETCH call during DECIDE and records it in `style.json` under an `assets` array: `[{name, role, decision:"make"|"fetch", method, rationale}]`.
- **motion-builder** authors every MAKE asset (SVG / CSS / canvas / three.js).
- **stock-scout** fetches only FETCH-classified assets; if handed a make-able request (icon/logo/shape/abstract/chart), it pushes back to art-director rather than fetching a worse stock match.
