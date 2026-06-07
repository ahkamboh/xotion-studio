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
| Animated reaction (confetti, sparkle, burst) | **MAKE** (preferred) | seeded canvas particles. FETCH a gif only if a *specific real look* is required — and then it MUST be supplied transparent or chroma-/luma-keyed + recolored before compositing (a raw gif reintroduces the #1 rectangular-edge seam bug); if it can't be made seam-free, author it as canvas particles instead |
| Real photograph — person, place, product, food, nature, real texture | **FETCH** | `pixabay-photo.sh` (you can't hand-draw a photo) |
| Real video b-roll / footage | **FETCH** | `pixabay-video.sh` |
| Detailed realistic 3D model you cannot author | **FETCH** | `pixabay-3d.sh` (real `.glb`) |
| Brand asset the user provided | **USE-AS-IS** | from brand.json / supplied files — exempt from the theme reject; the deck adapts AROUND it (frame / scrim / neutral backing), never alters it |

## Why MAKE wins when the asset is design-able
- **On-brand exactly** — your palette/style, not a stock "close enough."
- **Infinitely scalable** — SVG never pixelates at any size or overshoot scale.
- **Recolorable + per-element animatable** — animate the rocket's flame, the icon's stroke, the badge's ring independently. A flat stock raster can't be taken apart.
- **Deterministic, license-free, zero fetch latency.**
- **No rectangular-edge seam** — the #1 composite bug. A fetched raster carries its background; an authored SVG is transparent by construction. (This is exactly the bug the pipeline-test rocket hit.)

## Why FETCH wins for realism
You cannot hand-draw a photorealistic human face, a real skyline, real filmed motion, or a detailed real product. For anything that needs a **camera or photographic realism**, stock is the right tool — and Pixabay is the source (commercial-OK, license logged).

## The two tests (run both, in order)
1. **Theme-fit test (mandatory, first):** *"Does this asset match the deck's theme_fit spec?"* If no → normalize then re-judge (see grade-before-judge), or re-author, within the bounded loop below. An off-vibe asset never ships.
2. **Make-vs-fetch test:** *"Could a designer draw this better/on-brand than the best theme-matching stock?"* → MAKE. *Needs a camera?* → FETCH.

When unsure for a *graphic* element, default to MAKE (controllable, seam-free, in-theme by construction). For a *realistic* element, default to FETCH — then normalize + vet against theme-fit.

## The `theme_fit` contract (ONE schema — all agents read THIS, no ad-hoc field sets)
art-director writes one entry per asset into `style.json` `assets[]`:
```json
{
  "name": "...", "role": "...",
  "decision": "make" | "fetch" | "use-as-is",
  "method": "inline-svg | css | canvas | three.js | pixabay-photo | pixabay-video | pixabay-3d | user-brand",
  "theme_fit": {
    "palette":     ["#hex", ...],          // colors the asset must use (make) or be GRADED into (fetch)
    "style":       "flat|gradient|line-art|3d-render|photographic",
    "stroke":      "line weight for vectors/icons, e.g. 4px | n/a",
    "radius":      "corner language, e.g. 16px | sharp | n/a",
    "detail":      "minimal|moderate|rich",
    "vibe":        "mood words, e.g. calm premium",
    "era":         "visual era, e.g. modern-flat-2020s",
    "subject":     "FETCH only: what must be in frame (real subject/composition)",
    "orientation": "horizontal|vertical|square|n/a"
  },
  "rationale": "..."
}
```
Which fields each consumer reads:
- **motion-builder (make):** palette, style, stroke, radius, detail, vibe, era — authors to match by construction.
- **stock-scout (fetch):** subject, orientation, era, vibe, style for the *out-of-box* match; palette via **grading** (below).
- **use-as-is:** none enforced — brand asset is exempt (deck adapts around it).

## Grade-before-judge (the mandatory order for FETCH — prevents rejecting every real photo)
A raw photo's native colors will almost always clash with a stylized palette. So palette-fit is achieved by NORMALIZING, not by hoping the raw shot matches:
1. Fetch the candidate whose **subject / composition / era / orientation** match out of the box (these are NOT fixable downstream).
2. **GRADE it toward the palette first** — `scripts/grade.sh <in> <out> <look>`, a duotone, or a LUT → `assets/stock/<name>-graded.<ext>`.
3. **THEN judge fit.** Reject ONLY if subject / era / mood is wrong — never because the *raw* colors differed (color is routinely fixable; subject is not).

## Termination (the re-source loop provably ends — no infinite bounce)
Theme-fit is mandatory but the loop is **bounded**, mirroring CLAUDE.md acceptance-loop step 6:
- **FETCH:** stock-scout makes at most **2 re-query + grade passes**. If after 2 passes no candidate's subject/era/mood fits and it can't be authored, stock-scout **surfaces a blocker to the Director** (best candidate flagged, `work/stock-blockers.json`). The **Director decides** (specialists don't re-plan): accept-with-grade · swap the concept · drop the element. The loop always terminates here.
- **MAKE:** if motion-builder can't author it in-theme, it surfaces to the Director too.

## Ownership
- **art-director** sets each asset's `theme_fit` + decision during DECIDE, using the schema above. Notes when a theme-matching stock asset already exists (skip making). Sets `decision:"fetch"` for the reuse-check exception (an intricate real illustration better fetched than drawn) — that is the ONLY time a vector/illustration is fetched.
- **motion-builder** authors every `make` asset in-theme (reads the make field-set). Sole writer of index.html.
- **stock-scout** fetches `fetch` assets, runs grade-before-judge, vets the out-of-box fields, and on failure surfaces a blocker to the Director (it does not silently drop or infinitely retry).
- **qa-richness** runs the theme-coherence gate at review time and routes a fail BY the asset's `decision` (make→motion-builder · fetch→stock-scout/art-director · use-as-is→exempt).
- **b-roll** may only place clips already theme-vetted by stock-scout — it inherits the vet, never introduces an unvetted clip.

## No-mistake guardrails (off-theme asset caught at 3 points; loop always terminates)
- **Plan:** art-director writes the `theme_fit` spec up front (the constraint exists before anyone makes/fetches).
- **Build:** motion-builder authors to it; stock-scout grades-then-vets to it; b-roll only uses vetted clips.
- **Review:** qa-richness re-checks coherence on final frames; a clash is a blocking FAIL routed by `decision`.
- **Brand carve-out:** `use-as-is` assets are exempt from the reject — the deck frames/scrims around them; never altered.
- **Termination:** every re-source/re-author loop is bounded (2 passes) then escalates to the Director — it cannot bounce forever or silently drop.
