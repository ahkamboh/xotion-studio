# Motion presets (After-Effects-style)

Drop-in GSAP recipes for animating text/elements. Treat them like AE animation presets: pick one
per element by the vibe you want. All assume a paused timeline + scoped selector
`Q = s => '[data-composition-id="main"] ' + s`. Pre-render word/letter spans before animating.

Speed language: fast .15–.3s (energy) · medium .3–.5s (pro) · slow .5–.8s (gravity).
Ease language: `.out` for entrances, `.in` for exits, `.inOut` for moves. Vary eases per scene.

---

## ENTRANCES

**slide-up** — confident reveal
`tl.from(el,{y:60,opacity:0,duration:.6,ease:"expo.out"},t)`

**rise-blur** (house) — premium, soft
`tl.from(el,{y:24,scale:.96,opacity:0,filter:"blur(8px)",duration:.7,ease:"power3.out"},t)`

**scale-pop** — punchy, social
`tl.from(el,{scale:0,opacity:0,duration:.5,ease:"back.out(1.8)"},t)`

**punch-in** — TikTok/hype (overshoot then settle)
`tl.from(el,{scale:1.6,opacity:0,duration:.18,ease:"back.out(2.6)"},t)`

**letter-cascade** — kinetic typography (per-letter)
`tl.from(letters,{y:40,opacity:0,rotateX:-90,duration:.5,stagger:.03,ease:"back.out(1.7)"},t)`

**word-stagger** — readable line reveal (per-word)
`tl.from(words,{y:22,opacity:0,filter:"blur(6px)",duration:.6,stagger:.06,ease:"power3.out"},t)`

**mask-wipe** — editorial (wrap in overflow:hidden parent)
`tl.from(inner,{yPercent:120,duration:.7,ease:"expo.out"},t)`

**typewriter** — technical (per-word, no overlap)
`tl.to(words,{opacity:1,duration:.01,stagger:.12,ease:"none"},t)`

**fly-in-left / right** — directional
`tl.from(el,{x:-200,opacity:0,duration:.6,ease:"expo.out"},t)` (use +200 for right)

**spin-in** — logo/icon
`tl.from(el,{scale:0,rotation:-180,opacity:0,duration:1.0,ease:"back.out(1.7)"},t)`

**count-up** — numbers/stats (animate a proxy, write to el)
```js
const o={v:0}; tl.to(o,{v:target,duration:1.2,ease:"power2.out",
  onUpdate:()=>el.textContent=Math.round(o.v).toLocaleString()},t);
```

**draw-line** — underline/divider (transform-origin set in CSS)
`tl.from(rule,{scaleX:0,duration:.6,ease:"expo.out"},t)`

---

## EMPHASIS (mid-scene)

**pulse** — `tl.to(el,{scale:1.06,duration:.4,yoyo:true,repeat:1,ease:"sine.inOut"},t)`
**glow-flash** — `tl.to(el,{textShadow:"0 0 30px var(--accent)",duration:.2,yoyo:true,repeat:1},t)`
**shake** — `tl.to(el,{x:"+=8",duration:.05,yoyo:true,repeat:5,ease:"none"},t)`
**color-shift** — `tl.to(el,{color:"var(--accent)",duration:.4,ease:"power2.out"},t)`
**float (ambient)** — `tl.to(el,{y:-10,duration:2,yoyo:true,repeat:N,ease:"sine.inOut"},t)` (finite N)

## EXITS (faster than entrances)

**fade-up** — `tl.to(el,{y:-14,opacity:0,filter:"blur(4px)",duration:.4,ease:"power2.in"},t)`
**scale-down** — `tl.to(el,{scale:.9,opacity:0,duration:.35,ease:"power2.in"},t)`
**fly-out** — `tl.to(el,{x:200,opacity:0,duration:.45,ease:"power2.in"},t)`
**mask-out** — `tl.to(inner,{yPercent:-120,duration:.5,ease:"power2.in"},t)`

## SCENE TRANSITIONS (HyperFrames overlay layers)

**crossfade** — overlap two scene divs' opacity. = "this continues"
**hard-cut** — `tl.set(a,{autoAlpha:0},t); tl.set(b,{autoAlpha:1},t)` = "wake up / disrupt"
**swipe** — exit scene A `x:-W`, enter scene B `x:W→0` same t.
**push-up** — A `y:-H`, B `y:H→0`.
**iris/scale** — A `scale:1.1 opacity:0`, B `scale:.9→1`.

## BACKGROUND MOTION (one ambient per scene — never static)

**breathing orbs** — `tl.to(orb,{scale:1.12,duration:4,yoyo:true,repeat:N,ease:"sine.inOut"},0)`
**slow ken-burns** — `tl.fromTo(bg,{scale:1},{scale:1.15,duration:TOTAL,ease:"none"},0)`
**drift gradient** — `tl.to(grad,{backgroundPosition:"100% 50%",duration:TOTAL,ease:"none"},0)`
**grain/scanline pulse** — finite-repeat opacity yoyo on a noise/line overlay.

> Rule of thumb per scene: 1 background motion + staggered entrances + 1 emphasis + decisive exit.
> Don't reuse the same ease/speed/direction across a scene. See docs/qa-protocol.md before delivery.
