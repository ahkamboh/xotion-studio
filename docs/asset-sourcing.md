# Asset Sourcing — THEME-FIT first, then MAKE vs FETCH (decide before every asset)

The engine is not a stock-photo downloader. It can **author** vectors, illustrations,
abstract art, charts, kinetic type, and procedural 3D from scratch. Reaching for Pixabay
first is often the WRONG call — a made asset is on-brand, scalable, recolorable,
animatable, license-free, and has no rectangular-edge seam.

## ⛔ THE MASTER GATE — every asset must FIT THE THEME (made OR fetched)
Before anything is accepted into the comp, it must cohere with `style.json`:
**palette · visual style (flat / gradient / line-art / 3D-render / photographic) · stroke weight ·
corner radius · level of detail · era · mood/vibe · layout role.** An asset that clashes with the
theme is REJECTED regardless of source — **never ship an off-vibe asset just because it exists or
was easy to make.** A flat-pastel deck does not get a glossy 3D icon; a brutalist mono board does
not get a soft gradient illustration. Theme-fit is non-negotiable and overrides convenience.

> **Decision order: (1) define the theme-fit spec → (2) does a theme-matching one already exist on
> Pixabay? → (3) MAKE vs FETCH. Governing bias: design-able → MAKE it; photographic / filmed /
> real → FETCH it — but only if it matches the theme.**

## Don't reinvent — but don't settle either (the reuse check)
Before spending effort to MAKE a design-able asset, quick-check whether Pixabay already has one that
**genuinely** matches the theme (right style, palette-adjacent or cleanly recolorable, the right
vibe). If a true theme match exists and saves real effort → fetch it (recolor to palette if needed).
But if the existing one is only "close" / off-vibe → MAKE it in-theme. **Theme-fit + animatability
decide, not effort.** For icons/logos/simple shapes, making almost always wins (exact brand, per-part
animatable); for complex illustrations a theme-matching stock piece can be the better call.

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

## The two tests (run both, in order)
1. **Theme-fit test (mandatory, first):** *"Does this asset match the deck's palette, visual style, stroke/radius, era, and vibe?"* If no → reject it (re-query, recolor, or re-author until it fits). An off-vibe asset never ships.
2. **Make-vs-fetch test:** *"Could a designer draw this better/on-brand than the best theme-matching stock?"* → MAKE. *Needs a camera?* → FETCH.

When unsure for a *graphic* element, default to MAKE (controllable, seam-free, in-theme by construction). For a *realistic* element, default to FETCH — then vet it hard against theme-fit.

## Ownership
- **art-director** sets each asset's **theme-fit spec** and the MAKE/FETCH call during DECIDE, recording both in `style.json` under an `assets` array: `[{name, role, decision:"make"|"fetch", method, theme_fit:{palette, style, stroke, radius, vibe}, rationale}]`. Also notes when a theme-matching stock asset already exists (skip making it).
- **motion-builder** authors every MAKE asset **in-theme** — pulls palette/stroke/radius/flatness/era from style.json so the made asset matches by construction (SVG `currentColor`/`var(--accent)`, CSS, canvas, three.js). The made asset must pass the theme-fit gate.
- **stock-scout** fetches only FETCH-classified assets AND vets each against the theme-fit spec (not just relevance/watermark) — recolor-to-palette where possible; reject off-vibe matches; if nothing on Pixabay fits the theme, kick back to art-director (make it, or revise the plan). It pushes back on make-able requests rather than fetching a worse stock match.
- **qa-richness** enforces theme coherence at review time — any asset that clashes with style.json fails the gate.

## No-mistake guardrails (so asset choice never clashes)
- art-director writes the theme-fit spec **before** anyone fetches or makes — the constraint exists up front, not as an afterthought.
- stock-scout vets every fetch against that spec; motion-builder authors against it.
- qa-richness re-checks theme coherence on the final frames; a clashing asset is a blocking FAIL routed back to the owning specialist.
- Net effect: an off-theme asset is caught at three points (plan, build, review) — it cannot reach the deliverable.
