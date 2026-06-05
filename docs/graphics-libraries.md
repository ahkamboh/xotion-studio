# JS graphics libraries — make a plain clip graphically rich

HyperFrames renders **HTML + CSS + JS → MP4**, so almost any client-side JS graphics library
works *as long as it is driven deterministically*. Use these to add particles, kinetic type,
shaders, 3D, charts, and atmosphere — then composite over plain footage with `scripts/overlay.sh`.

All libraries below are **free, client-side, no API key**.

---

## The two deterministic integration patterns (non-negotiable)

The engine forbids `Math.random()`, `Date.now()`, and network fetches **at render time** — every
frame must be a pure function of the playhead. There are exactly two ways to hook a library in:

**Pattern A — GSAP timeline** (for DOM / SVG libraries)
Register a paused timeline on `window.__timelines["main"]` and animate via tweens. For libraries
that have their own playhead (Lottie, anime.js), drive it from a GSAP proxy:
```js
const tl = gsap.timeline({ paused:true });
const proxy = { f:0 };
tl.to(proxy, { f: anim.totalFrames-1, duration:5, ease:"none",
               onUpdate:()=>anim.goToAndStop(proxy.f, true) }, 0);
window.__timelines["main"] = tl;
```

**Pattern B — `hf-seek` clock** (for Canvas / WebGL libraries)
HyperFrames dispatches a `hf-seek` CustomEvent with `detail.time` (seconds) for every captured
frame. Draw your canvas/WebGL scene as a pure function of that time:
```js
function draw(t){ /* render scene at time t — deterministic */ }
draw(0);
window.addEventListener("hf-seek", e => draw(e.detail?.time || 0));
```
If a library needs random initial values (particle positions, etc.), generate them **once at init
with a SEEDED PRNG** (e.g. `mulberry32(fixedSeed)`), never with `Math.random()` during draw.

> Most "RAF-driven" libraries (tsParticles, Vanta) run their own real-time loop and will **not**
> render deterministically as-is. Either pause their loop and step them by `hf-seek` time, or
> reproduce the effect on a plain canvas (Pattern B) — which is usually simpler and bulletproof.
> The bundled `templates/graphics-overlay.html` shows a hand-rolled deterministic particle field.

---

## Library shortlist (by job)

### Motion / tweening — pair with GSAP
| Library | Adds | Pattern |
|---|---|---|
| **GSAP core + free plugins** (SplitText, DrawSVG, MorphSVG, MotionPath, Flip) | kinetic type, shape morph, line-draw, path motion | A |
| **anime.js** | lightweight tween/stagger, SVG | A (drive its progress) |
| **Motion One** | WAAPI transforms | A |

### Backgrounds / particles / atmosphere (overlay gold)
| Library | Adds | Pattern |
|---|---|---|
| **Custom canvas** (see template) | particles, bokeh, starfield, snow | B |
| **Pixi.js** | fast 2D WebGL: glow, displacement, filters, light leaks | B |
| **tsParticles** | particles/confetti — must be stepped by hf-seek | B (advanced) |
| **GLSL shader** (regl / raw WebGL) | gradients, liquid, grain, distortion | B |

### 3D / depth
| Library | Adds | Pattern |
|---|---|---|
| **three.js** | full 3D (also via the engine's 3D blocks) | B |
| **OGL** | tiny WebGL | B |
| **Zdog** | pseudo-3D round logos/shapes | B |

### Data / charts (richer than the built-in chart block)
| Library | Adds | Pattern |
|---|---|---|
| **D3.js** | fully custom data-driven graphics | A (tween scales) |
| **Apache ECharts** | animated charts/maps | A (setOption per frame) |
| **Chart.js** | quick bar/line/pie | A |

### Text effects
| Library | Adds | Pattern |
|---|---|---|
| **SplitType / Splitting.js** | per-char/word/line targets | A |
| **Typed.js** | typewriter (or use the engine's code blocks) | A |
| **Lottie** (`templates/lottie-overlay.html`) | After Effects animations as JSON | A (proxy) |

### Generative / creative coding
| Library | Adds | Pattern |
|---|---|---|
| **p5.js** | flow fields, noise, generative art (use `t`, not `frameCount` wall-clock) | B |
| **Two.js / Paper.js** | clean 2D vector drawing | B |
| **Rough.js** | hand-drawn / sketchy look | B |

### Physics / SVG
| Library | Adds | Pattern |
|---|---|---|
| **Matter.js** | 2D physics — seed it and `Engine.update(fixedDt)` per hf-seek | B |
| **Vivus / SVG.js / Snap.svg** | SVG line-draw, vector manipulation | A |

---

## Recommended starting set (best effort-to-payoff)
1. **GSAP free plugins** (SplitText + DrawSVG + MorphSVG) — instant pro motion, no new dependency.
2. **Custom canvas particles** — `templates/graphics-overlay.html` (proven, deterministic).
3. **Pixi.js / GLSL** — glow, displacement, light leaks over footage.
4. **ECharts / D3** — premium data scenes.

## How to add graphics to a plain video (proven pipeline)
```bash
# 1. scaffold an overlay project at the SAME dimensions as your clip
./new-project.sh my-overlay 1920 1080 5

# 2. start from the overlay template (transparent background) and edit the headline / effect
cp templates/graphics-overlay.html projects/my-overlay/index.html

# 3. render the transparent layer + composite it over your plain clip (audio kept from base)
scripts/overlay.sh path/to/plain.mp4 projects/my-overlay out.mp4 [start_sec] [fps]
```
`overlay.sh` renders the overlay to a ProRes 4444 MOV (alpha) via `hyperframes render --format mov`,
then ffmpeg-overlays it onto the base. For full-scene (non-overlay) use, just render the project to
MP4 normally with a solid background.

## CDN pins (deterministic)
Pin exact versions so renders are reproducible, e.g.:
- `gsap@3.14.2`, `lottie-web@5.12.2`, `pixi.js@8.x`, `three@0.160.x`, `d3@7.x`, `echarts@5.x`.
Avoid `@latest`. Test-render after any version bump.
