# Video presets — pick one by the user's prompt

Each preset is a complete recipe: audio mode, scene structure, motion presets, template. Map the
user's request to the closest preset; combine/adjust as needed. **Audio mode** is the key choice:
- **NARRATED** = male/female voiceover + background music (music ducks under the voice).
- **MUSIC-ONLY** = no voice; visuals react to the music (beat/amplitude).
- **MIXED** = voice + music + sound design.
- **SILENT** = motion only (rare; e.g. a logo sting or a looping background).

Voices: see `docs/voices.md` (Kokoro, male & female, multiple accents/languages). Generate with
`scripts/tts.sh`. Mix voice+music with `scripts/mix-audio.sh` (auto-ducking). Music bed via
`scripts/music-bed.sh` or a provided track. Amplitude bars via `scripts/amplitude.py`.

---

## 1. NARRATED EXPLAINER  (voice + music)
**Use:** "explain X", educational, how-it-works, brand story.
**Audio:** write a script → `tts.sh script.txt <voice> vo.wav` → `transcribe.py vo.wav` for scene
timing → `music-bed.sh bed.wav <dur> calm` (or provided track) → `mix-audio.sh vo.wav bed.wav master.wav`.
**Structure:** hook title → 3–5 point scenes (each: eyebrow + big stat/word + supporting line) →
summary → CTA. Scene changes land on sentence boundaries from the VO transcript.
**Motion:** rise-blur titles, count-up for stats, word-stagger lines, crossfade between points, slow
ken-burns/orbs background. **Template:** `templates/narrated-motion.html`. Captions optional (on for
social, off for polished). Format 16:9 (YouTube) or 9:16 (Shorts).

## 2. PROMO / HYPE  (voice + music, high energy)
**Use:** product launch, sale, app promo, prop-firm ad.
**Audio:** energetic voice (`am_michael`, `af_sky`) + driving bed (`uplift`/`tense`), music louder
than explainer. **Structure:** fast cuts, punch-in headlines, big numbers, logo, hard CTA.
**Motion:** punch-in, scale-pop, shake/glow emphasis, hard-cut transitions. **Template:**
`templates/narrated-motion.html` (energetic vars) or `templates/ugc-ad-vertical.html` for talking-head.

## 3. MUSIC VISUALIZER  (music-only, reactive)
**Use:** "make a music video / visualizer", beat-driven loop, track teaser.
**Audio:** the music track only. `amplitude.py track.mp3 --out assets/amp.js`.
**Structure:** centered art/gradient + reactive bars/orbs/rings that move with `window.__AMP`;
optional kinetic title that pulses on the beat. **Motion:** amplitude-driven scaleY bars, breathing
orbs, beat pulses. **Template:** `templates/music-visualizer.html`. No captions.

## 4. LYRIC VIDEO  (music + lyrics)
**Use:** song with on-screen lyrics. **Audio:** the song. `transcribe.py song --model small` →
split long lines. Music bars fill instrumental gaps (≥3s). **Template:**
`templates/lyric-video-landscape.html` / `-vertical.html`. See `prompts/lyric-video.md`.

## 5. QUOTE / KINETIC TYPOGRAPHY  (music or voice)
**Use:** a quote, a mantra, a poem, an ad line. **Audio:** soft bed, or a voice reading it.
**Structure:** one powerful line at a time, big, centered. **Motion:** letter-cascade / word-stagger
/ mask-wipe, color-shift on key words. **Template:** `templates/title-card.html` looped per line,
or kinetic-type example (`npx hyperframes init --example kinetic-type`).

## 6. PRODUCT SHOWCASE  (voice or music)
**Use:** feature highlights, app screens, device mockups. **Audio:** narrated or upbeat music.
**Structure:** feature cards stagger in, device frame with parallax, spec count-ups. **Motion:**
fly-in, count-up, float ambient, swipe transitions. Example base: `--example product-promo`.

## 7. DATA / INFOGRAPHIC  (voice or music)
**Use:** stats, charts, "by the numbers". **Audio:** narrated explainer or bed. **Motion:** count-up,
draw-line/bars grow, sequential reveal. Base: `--example nyt-graph`.

## 8. LOGO STING / INTRO-OUTRO  (silent or music)
**Use:** short branded intro/outro (2–4s). **Motion:** spin-in logo, draw-line, glow-flash, scale
settle. **Template:** `templates/title-card.html` (short duration). Add a whoosh/riser if music.

## 9. SLIDESHOW / PHOTO MONTAGE  (music + optional captions)
**Use:** image set → video. **Audio:** music bed. **Structure:** ken-burns each photo, crossfade,
caption per slide. Build images as `<img>` layers in HyperFrames or assemble with ffmpeg + xfade.

---

### Decision shortcuts
- prompt says "explain / how / story / narrate" → **Narrated Explainer** (ask/choose voice gender).
- "promo / launch / sale / ad / hype" → **Promo**.
- "music video / visualizer / beat / track" (no lyrics) → **Music Visualizer**.
- "lyrics / song with words" → **Lyric Video**.
- "quote / poem / mantra / one line" → **Kinetic Typography**.
- "product / features / app" → **Product Showcase**.
- "stats / numbers / chart" → **Data/Infographic**.
- "intro / outro / logo reveal" → **Logo Sting**.
- "photos / slideshow / memories" → **Slideshow**.

When NARRATED/MIXED and the user didn't specify, pick a voice that fits the tone (see docs/voices.md)
and mention which you used so they can swap. Always run the acceptance loop before delivering.
