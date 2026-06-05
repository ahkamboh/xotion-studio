# XChart — reusable data-graphics (charts) for compositions

Stop re-coding charts per video (and re-introducing the same small bugs). `templates/lib/charts.js`
is one **tested, deterministic** chart library. Copy it into a project and call it; it injects its
own CSS, builds correct DOM/SVG, and times the climax to a scene's spoken-word `peak` (pairs with
the scene-sync agent). Requires GSAP on the page.

## Setup
```bash
cp templates/lib/charts.js projects/<name>/charts.js
```
```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script src="scenes.js"></script>   <!-- window.__SCENES from scene-sync (optional) -->
<script src="charts.js"></script>   <!-- window.XChart -->
```

## API
`el` = a flex-centered scene container. `t` = `{s, e, peak}` (use a scene-sync scene, or any object;
`peak` = the time the climax should land on, e.g. the spoken number).

```js
XChart.counter(el, {to:100, dec:0, pre:'', suf:'M+', label:'people reached'}, tl, t);
XChart.bar(el, {title:'Economy ($T)', years:[2020,2025,2030], vals:[0.1,2.6,15.7],
                fmt:v=>'$'+v.toFixed(1)+'T'}, tl, t);     // last bar lands on t.peak
XChart.donut(el, {to:70, label:'of companies use AI'}, tl, t);   // fills to t.peak
XChart.line(el, {title:'Investment', sub:'accelerating', points:[[0,360],[1000,32]]}, tl, t);
```
- **counter** — big gradient number counting up, ending exactly on `t.peak`.
- **bar** — rising bars + per-bar value count; the LAST bar lands on `t.peak`, others step back.
- **donut** — ring that fills to `to`% using `stroke-dasharray:"pct 100"` (correct arc, not a full
  ring — this was the recurring donut bug; fixed once, here).
- **line** — area + line that draws on, dots pop; finishes on `t.peak`. `points` in a 0–1000 × 0–400
  viewBox (y down).

## Why use it
Every chart bug (donut showing full instead of N%, value labels flashing before bars grow,
climax landing off the spoken word) is fixed **once** in the library. New videos call `XChart.*`
and inherit correct, synced graphics — no re-debugging. Restyle globally by editing the injected
CSS in `charts.js`.

## Pattern: scene-sync + XChart (the full reliable pipeline)
1. TTS + transcribe the VO → `vo.json`.
2. Write a scene spec → run `scripts/scene-sync.py` → `scenes.js` (`window.__SCENES` with `peak`s).
3. Composition loops `window.__SCENES`; for chart scenes call `XChart.<kind>(el, data, tl, scene)`.
Graphics are then always correct AND locked to the voice.
