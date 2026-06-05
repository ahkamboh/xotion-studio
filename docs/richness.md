# Richness — make EVERY motion-graphics video look designed, not templated

The #1 thing that separates "rich" motion graphics from "AI-template" output is **not the engine** —
it's **density + motion + texture**. Two videos with the same content read completely differently
if one is flat/sparse/static and the other is textured/layered/always-moving.

This is universal — it applies to **every style and every video type**. The *style* (`presets/styles.md`)
picks **color + font**; **richness** sets **density + motion + texture**. Use both, always.

> Library: **`templates/lib/charts.js`** (correct data-graphics) + **`templates/lib/richness.js`** (`window.Rich`).
> `cp templates/lib/richness.js projects/<name>/richness.js`, include after GSAP, call `Rich.css()` once.

## The 7 richness rules (hold ALL on every scene)

1. **NEVER STATIC.** A dead-still frame reads as broken/cheap. Every scene's content keeps a slow
   breathe/drift the whole time. → `Rich.idle(sceneWrapEl, tl, s, e)`. This is the single biggest fix:
   GSAP's default is "tween in, then freeze" — `Rich.idle` keeps it alive.
2. **TEXTURE EVERY BACKGROUND.** No flat fills. Add halftone dots / grain / stripes / glow.
   → `Rich.texture(sceneEl, 'dots'|'grain'|'stripes'|'glow', color)`.
3. **LAYER ≥ 5 elements per scene.** eyebrow label + page counter + hero + support card + accent/sticker.
   Thin scenes (1 headline) read as templates. → `Rich.eyebrow/counter/sticker`.
4. **DEPTH via stacked shadows.** Hero type/cards use a double offset shadow, not a single one.
   → class `.r-shadow2` (box) or `text-shadow:10px 10px 0 #fff, 20px 20px 0 #111` (type).
5. **CHOREOGRAPH, don't pop-all-together.** Each element its own delay + ease + slight rotation.
   → `Rich.cascade(items, tl, t)` · single: `Rich.enter(el, tl, t, 'slam'|'pop'|'rise'|'drop')`.
6. **HERO SCALE.** Anchor each scene with one oversized graphic — a number (240–560px) or headline
   (130–230px). Big type IS the graphic.
7. **FURNITURE on every scene.** eyebrows ("▶ STEP 01"), page counters ("01 / 06"), rotated stickers,
   rules. Furniture = ~50% of the "published, not generated" feel. → `Rich.stamp` for sticker slams.

## `Rich` API (window.Rich)
```js
Rich.css();                                   // inject utilities once
Rich.idle(wrapEl, tl, s, e, {scale:.014});    // continuous breathe — NEVER static
Rich.texture(sceneEl, 'dots', 'rgba(0,0,0,.9)');  // 'dots'|'grain'|'stripes'|'glow'
Rich.cascade(el.querySelectorAll('.line'), tl, t, {stagger:.12, rot:3});
Rich.enter(hero, tl, t, 'slam');              // slam|pop|rise|drop (rotation + overshoot)
Rich.stamp(stickerEl, tl, t, -7);             // oversized rotated slam
el.appendChild(Rich.eyebrow('▶ Step 01', accent));
el.appendChild(Rich.counter('01','06'));
el.appendChild(Rich.sticker('NEW!', '#B8F84A', 12));
```
CSS classes: `.r-shadow` (single), `.r-shadow2` (double depth), `.r-eyebrow`, `.r-counter`, `.r-sticker`.
Set `--mono` / `--rs1` / `--rs2` CSS vars to theme. All deterministic (no random) — seek-safe.

## Per scene, minimum:
```
sceneEl  ← Rich.texture (dots/grain)               // rule 2
  wrap   ← Rich.idle(wrap, tl, s, e)               // rule 1
    eyebrow + counter (furniture)                  // rule 3,7
    HERO (big type/number, .r-shadow2)             // rule 4,6
    support card / tags                            // rule 3
    rotated sticker ← Rich.stamp                   // rule 7
  entrances via Rich.cascade / Rich.enter          // rule 5
```

## Why this is the fix (not switching engines)
HyperFrames + GSAP renders the same DOM/CSS as any React-timeline engine — it can draw anything.
The gap was *authoring density + continuous motion*. `richness.js` makes the dense, textured,
never-static pattern a **one-line-per-scene default**, so every future video — any style, any topic —
clears the bar. Pair with `presets/styles.md` (look) + `scene-sync.py` (timing) + `charts.js` (data).
