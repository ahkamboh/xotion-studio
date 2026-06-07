# Motion-Graphics Decision Rules — the contracts that keep a kit coherent

Companion to `presets/motion-kits.md`. These are the cross-cutting rules that resolve conflicts
between dimensions so a kit produces ONE coherent result. The **motion-director** owns these.

## 1. The kit schema (written to `work/style.json` → `kit`)
```json
{
  "archetype": "product-reveal",
  "platform": { "ratio": "9:16", "w": 1080, "h": 1920, "fps": 30, "duration_s": 12, "lufs": -14 },
  "fonts":    { "display": "Sora 700", "support": "Inter 500", "mono": "JetBrains Mono 700" },
  "type_scale": { "display_px": 110, "label_px": 28, "tracking": "-0.02em", "leading": 1.0 },
  "text_anim": { "entrance": "mask-wipe", "emphasis": "rise-blur", "exit": "scale-down" },
  "color":    { "bg": "#06080f", "ink": "#F4F6FF", "accent": "#FF5A3C", "grade": "warm" },
  "transitions": "cinematic-zoom→hero; crossfade 0.5s between features",
  "pacing":   { "dwell_s": 2.8, "beat_locked": true },
  "music":    { "genre": "clean minimal electronic", "bpm": 90, "arc": "tick→build→drop",
                "query": "clean minimal electronic product reveal build swell 90bpm instrumental" },
  "sfx":      { "density": "med", "map": { "transition":"whoosh", "reveal":"impact+subdrop",
                "feature":"click", "climax":"impact" } },
  "voice":    { "id": "af_nova", "speed": 1.0, "profile": "house" },   // or "voice": null
  "hook":     "teaser silhouette + riser from 0s",
  "ending":   "logo lockup + tagline + CTA + price held",
  "atmosphere": "warm spotlight + grain + vignette"
}
```
Downstream: **motion-builder** reads fonts/type_scale/text_anim/color/transitions/pacing/hook/ending/atmosphere
and emits `work/motion-hits.json`. **audio-engineer** reads music/sfx/voice. **qa-richness** verifies coherence.

## 2. motion-hits.json — the controlled `kind` vocabulary
motion-builder emits `[{ "t": <sec>, "kind": <one of below>, "scene": <id> }]`. audio-engineer maps
`kind` → SFX via the kit's `sfx.map`. **These are the ONLY allowed kinds** (so builder + engineer never disagree):

| kind | fires on | default SFX |
|---|---|---|
| `transition` | a scene cut / wipe / whip | whoosh (−150ms lead) |
| `reveal` | hero/product/title entrance | impact (on-frame) [+ sub-drop] |
| `pre-climax` | the build before the big moment | riser (leads in) |
| `climax` | the drop / logo lockup / final stat | impact + sub-drop |
| `counter-tick` | a number counting | click/tick (last tick on peak) |
| `accent` | sticker slam / sparkle / emphasis word | pop / sparkle |
| `cta` | the call-to-action appears | pop |

## 3. The single tempo clock (resolves Music-vs-Transitions-vs-Hook conflict)
**Music BPM is the master clock. Everything snaps to it; nothing else sets tempo.**
- audio-engineer fetches the track, detects BPM (`bpm-detect.py`) → writes `work/beats.json` (`beat-grid.py`).
- motion-builder snaps scene cuts to **downbeats** and micro-hits to **beats** from beats.json.
- The hook's first hard transient lands on beat 1; the ending's climax lands on a downbeat.
- For voice-led archetypes (narrated-explainer), **sync-master's voice timing wins for scene boundaries**;
  the beat grid only governs auxiliary motion. (Voice > beat for boundaries; beat > eye for hits.)
- **MANDATORY: any video with a VO must derive scene times from `scene-sync.py` (vo.json word timings) — never hand-timed.** Hand-timed scenes + a separate VO track is the #1 first-attempt sync failure. Order: VO → transcribe (word level) → scene spec (scene↔phrase anchors) → scene-sync.py → scenes.js → motion-builder reads `window.__SCENES`. qa-correctness check #8 rejects hand-timed scenes when a VO is present.

## 8. Text animation = a TextFX call, never hand-coded
The kit's `text_anim.entrance` is a **name** that maps to a real function in `templates/lib/textfx.js`
(`mask-wipe · letter-cascade · punch-in · rise-blur · typewriter · squash-pop · glitch`). motion-builder
calls `TextFX.enter(el, tl, t, kit.text_anim.entrance)` — it must NOT hand-write a `scale→back.out` pop.
Hand-coding is why every video defaulted to the same pop-up; the engine makes the named animation render
and differ per archetype. qa-richness's kit-coherence gate checks the entrance matches the kit.

## 4. Precedence (resolves font/color/voice conflicts)
When sources disagree, apply in this order (later overrides earlier):
1. **Kit default** (presets/motion-kits.md for the archetype)
2. **Platform constraint** (ratio/duration/safe-area/LUFS are hard — they reshape but never break the kit)
3. **brand.json** (a client brand overrides fonts/palette/logo — but NOT the text-anim/transition language)
4. **Explicit user request** ("make it red", "use Bebas", "male voice") — always wins
The motion-director records the resolved values in `kit`; downstream never re-derives them.

## 5. Classification + ambiguity fallback (the decision brain)
motion-director classifies the request into ONE primary archetype:
- **Clear** ("logo intro", "product promo", "lyric video") → lock that kit.
- **Reference given** (image/video/url) → moodboard it (`*-moodboard.sh`); match the closest archetype,
  then override the kit's color/atmosphere/type-feel from the reference (REFERENCE-ONLY — never use the pixels).
- **Multi-type** ("a product reveal that ends like a hype promo") → pick the PRIMARY archetype as the base kit,
  borrow ONLY the named element from the secondary (e.g. base=product-reveal, ending=hype-promo). Never blend music/SFX from two kits.
- **Ambiguous / no signal** → apply the universal default kit (narrated-explainer, 9:16, 15s) and **confirm with the Director in one line** before building.
- **Reference matches no archetype** → derive a custom kit (pick nearest archetype skeleton + reference-driven color/type/music brief), name it, and offer to save it to motion-kits.md.

## 6. Voice roster (reconciled to docs/voices.md — all kit voices exist)
F: af_heart af_nova af_sky af_bella af_sarah · bf_emma bf_alice(UK) ·
M: am_adam am_michael am_onyx am_echo am_liam · bm_george bm_lewis(UK).
Voice-processing **profile** (voice-process.sh): house · warm · hype · cinematic — chosen by the kit, not ad hoc.

## 7. No-voice rule
These archetypes ship with NO spoken VO by default: logo-sting, kinetic-typography, lyric-video,
title/lower-third, and any music-only/visualizer. Adding TTS there dilutes the visuals — don't.
