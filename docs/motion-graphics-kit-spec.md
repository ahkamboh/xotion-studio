# Motion-Graphics KIT Spec — PROPOSAL (not yet applied)

> Status: **awaiting approval.** Synthesized from a 10-dimension senior-director design pass
> (typography, color, music, SFX, voice, hook, ending, transitions, atmosphere, platform) +
> a 14-item adversarial gap-check. Do NOT apply until the user says so.

## The problem (root cause)
xotion picks fonts / music / SFX / animation / voice **à la carte** — no layer binds them, so a
motion graphic's music doesn't match its SFX, its text-animation doesn't match its transitions, and
none of it is chosen *for the specific kind of motion graphic requested*. The fix is a **KIT
system**: one coherent locked package per archetype, chosen by reading the prompt + reference, so
every element coheres **by construction**.

## The kit template — every decision ONE kit locks
1. **Platform/format** — ratio + duration + safe-area + −14 LUFS (decided FIRST, before art).
2. **Typography** — display + support + mono family; px size hierarchy @1080 (display 4–7× label);
   weight; tracking (display negative, caps-labels positive); leading; **text-animation verb**
   (entrance/emphasis/exit with easing + duration + per-letter/word stagger); color-on-type.
3. **Color** — bg/ink/**accent** roles (70-20-10 pixel budget), accent scarcity (≤1/scene),
   contrast floor, gradient-vs-flat, one whole-frame grade pass.
4. **Music** — genre + BPM + **energy arc** (quiet→build→drop→resolve) + mood → a *precise* fetch
   query; entry/exit; intro-trim; beat-sync; where the drop lands; duck depth; resolve/tail.
5. **SFX** — kind→SFX map keyed to motion-hits; 3-part grammar (anticipation→impact→tail); dB/LUFS
   hierarchy under the VO; density per archetype.
6. **Voice** — voice cast (gender/character) or NONE; speed; the 4-stage post chain
   (HPF → compress → presence EQ → de-ess [→ reverb]); mix placement (VO −3 dBFS, music −9 to −12 dB under).
7. **Hook** (0–3s) — the scroll-stop pattern: first frame already loaded, first motion ≤330ms,
   first sound a hard transient.
8. **Ending** (last 2–4s) — climax-land → end-card-settle → hold + music tail; a freeze-frame-legible
   last frame (handle/CTA/logo).
9. **Transitions & pacing** — cut grammar (hard cut default; softer must be earned) + dwell time +
   beat-aligned rhythm + tempo curve.
10. **Atmosphere & richness** — back-to-front layer stack (wash→texture→depth→content→bloom→grade→grain),
    hero-scale anchor, ≥5 layers, per-archetype grade, banned defaults (bokeh balls, lens flare, crushed teal-orange).

## The 10 archetype kits (concrete)

### 1. Kinetic Typography / Quote
- **Type:** Space Grotesk 700 / Bricolage 800, Instrument Serif italic accent word; 150–220px, tracking −0.03em, leading 0.95; letter-cascade entrance.
- **Color:** high-contrast mono + 1 accent on the key word.
- **Music:** minimal cinematic piano + sub pulse, 70–90 BPM, near-flat + ONE swell. Query: `minimal emotional cinematic piano sub-bass 80bpm instrumental`.
- **SFX:** whoosh per line (−16 LUFS, −150ms lead); impact on the single climax word + sparkle tail. No sub-drop.
- **Voice:** usually NONE (type is the delivery). If insisted: af_bella/bm_lewis @ 0.90.
- **Transitions:** hard cut spine + mask-wipe on emphasis lines.
- **Hook:** open on the most provocative word at hero scale + whoosh.
- **Ending:** final line assembled on the last beat; fade everything except it; hold 0.6s.

### 2. Product Reveal
- **Type:** Sora/Manrope 700 head + Inter 500 + JetBrains Mono labels; name 96–120px, mask-wipe entrance.
- **Color:** deep bg + warm rim/accent; restrained.
- **Music:** clean minimal electronic swell, 80–100 BPM, ticking intro→filtered build→bass DROP on the hero. Query: `clean minimal electronic product reveal build swell 90bpm instrumental`.
- **SFX:** riser (1.2s) pre-roll → impact + sub-drop stacked on the reveal frame → click on feature cards.
- **Voice:** af_nova / am_liam @ 1.0; house chain.
- **Transitions:** cinematic-zoom into reveal; mask-wipe/sdf-iris between features.
- **Hook:** silhouette/teaser of the product + riser starting immediately.
- **Ending:** product scales to upper-2/3, logo lockup + tagline rise-blur, CTA, price.

### 3. Logo Sting (the sting IS the whole piece, 2–4s)
- **Type:** brand font / Sora 700 wordmark ~55% canvas; mono tagline 26px +0.22em.
- **Music:** single cinematic riser + impact + tail (NOT a loop). Query: `cinematic logo reveal riser whoosh impact boom sting 3 seconds instrumental`.
- **SFX:** riser pre-roll → sub-drop (signature) + impact on lockup → sparkle shine sweep.
- **Voice:** NONE (unless a 1-line tagline → am_onyx @ 0.92, plate reverb).
- **Transitions:** flash-through-white / chromatic burst at lockup; no scene transitions.
- **Hook = whole thing:** elements converge → lockup → glow flash → hold.

### 4. Data / Stat Explainer
- **Type:** Fraunces 900 giant italic numbers OR Space Grotesk 700 + Inter + mono; hero stat 240–400px tabular-nums, −0.04em.
- **Color:** editorial restrained + 1 accent on the number.
- **Music:** understated documentary bed, soft piano + pulse, 70–95 BPM, lift per stat. Query: `understated documentary underscore soft piano light pulse 85bpm instrumental`.
- **SFX:** click/tick on the counter run (accelerate→settle, last tick on peak); whoosh on bar/line draw; impact when the stat lands.
- **Voice:** am_adam / af_sarah @ 0.98–1.0 (numbers need air).
- **Transitions:** hard cut between stats; push-up for ranked items; resolve in-scene.
- **Hook:** open on the single most shocking number, full screen, + impact.
- **Ending:** number shrinks to a chip; one-line "so what" takeaway; CTA.

### 5. Hype Promo / Trailer
- **Type:** Anton / Archivo Black + Poppins 700; headline 180–300px ALL CAPS, punch-in back.out(2.6).
- **Color:** high-energy, bold accent, flashes.
- **Music:** driving trap / big-room / hybrid-orchestral, 120–150 BPM (140 sweet spot), tense intro→build→HARD DROP on the value. Query: `driving trap hybrid orchestral braam riser hard drop 140bpm instrumental`.
- **SFX:** DENSEST — riser into every cut, whoosh+impact on hard cuts, long riser→sub-drop on the drop, screen-shake hits.
- **Voice:** am_michael / af_sky @ 1.08–1.12, AGGRESSIVE processing (4:1, +5 presence) to cut the loud bed.
- **Transitions:** hard cut + whip-pan + glitch on hits + flash before CTA; every cut on a beat. Pacing 0.6–1.2s/scene, accelerating.
- **Hook:** hardest headline + beat-drop entrance in the first second.
- **Ending:** offer punch-in ON the drop + shake → hard-cut end-card "GET IT NOW →" + URL.

### 6. Lyric Video
- **Type:** Poppins Bold ALL CAPS white (house) / Instrument Serif italic accent; 90–130px, 2–3 words/line, word-by-word blur reveal.
- **Music:** the USER'S SONG (no fetch). Trim leading silence ≤0.3s.
- **SFX:** minimal — whoosh on section changes (downbeat); sparkle on instrumental-gap pulses. No per-word impacts.
- **Voice:** NONE — the sung vocal is the voice; `caption.py --content music`.
- **Transitions:** crossfade within a phrase, hard cut on section downbeat.
- **Hook:** title card on the intro bars, drop into lyrics on the first sung word.
- **Ending:** last hook line held; amplitude bars carry an instrumental outro.
- ⚠️ **License:** user song = `user-provided` → needs `licenses/manual-attestation.json` or it fails the license gate (see gaps).

### 7. Title / Lower-third (overlay on footage, not a full video)
- **Type:** DM Sans 700 / Inter 600 name 52–64px + Inter 500 role + draw-line accent.
- **Color:** brand accent rule; legible scrim over footage.
- **Music:** none (rides footage audio) or barely-there pad.
- **SFX:** ONE soft whoosh on slide-in (−19 LUFS); optional matching on exit. Nothing more (a lower-third with a sub-drop = amateur).
- **Voice:** none usually.
- **Transitions:** slide-in / mask-wipe in + out; exit ~0.5s before the speaker's name need ends.

### 8. Narrated Explainer (the default voice archetype)
- **Type:** Inter 500/600 one family (or Instrument Serif accent for Warm Documentary); headline 88–120px.
- **Color:** clean, calm, 1 accent.
- **Music:** warm neutral underscore, no vocals/no lead melody, 75–95 BPM, slight lift at hook + CTA. Query: `warm neutral underscore soft piano no vocals 85bpm instrumental`.
- **SFX:** SPARSE, VO-first — title whoosh, soft impact per key point IN the VO gap, crossfade whooshes, CTA pop. Sidechain-duck under VO.
- **Voice:** af_nova / am_adam @ 1.0, house chain; voice-locked via scene-sync.py (cuts on sentence boundaries).
- **Transitions:** crossfade workhorse; hard cut only at topic shift.
- **Hook:** the core promise/question in the first sentence + matching visual.
- **Ending:** summary recap → end-card logo + value prop + CTA + @handle.

### 9. Social Sticker-Pop
- **Type:** Bowlby One / Bagel Fat One / Archivo Black bubble display, 240–420px, double-offset shadow; squash-stretch entrance.
- **Color:** bright, playful, high-sat.
- **Music:** bouncy pop/hip-hop, 100–128 BPM, instant energy, bounce drop on the slam. Query: `bouncy upbeat playful pop hip hop claps bright 120bpm instrumental`.
- **SFX:** PLAYFUL — pop on every sticker slam (workhorse), click on sparkle blinks, tiny sparkle on twinkles. No sub-drop/long riser.
- **Voice:** af_sky / am_liam @ 1.1, OR no voice + active-word captions; phone-speaker mix (HPF 110 Hz, loud).
- **Transitions:** hard cut only + scale/iris pop; 0.5–1.0s/scene, beat-locked.
- **Hook:** sticker slam + pop in the first 0.5s.
- **Ending:** @handle sticker slam center-bottom + "FOLLOW".

### 10. Cinematic Intro
- **Type:** Oswald 600 / Anton head + Inter 500 sub; title 120–180px ALL CAPS, slow mask-wipe (0.9s expo.out).
- **Color:** moody, letterboxed, low-key + restrained accent.
- **Music:** orchestral/ambient, low drone + braam + slow swell, 50–70 BPM (or rubato), braam IMPACT on the title. Query: `orchestral ambient cinematic drone braam slow swell 60bpm instrumental`.
- **SFX:** slow + weighty + sparse — long riser into title, sub-drop + impact on the reveal, slow whoosh on the ken-burns push.
- **Voice:** am_onyx @ 0.90 (trailer narrator) / af_bella @ 0.92; chest-body EQ, slow release.
- **Transitions:** long luxurious crossfade (0.8–1.2s) + cinematic-zoom + light-leak; SLOW-FAST-SLOW arc.
- **Hook:** hold on an atmospheric first frame (never black) + drone rising.
- **Ending:** title held over calmed full-bleed image, letterbox, slow 1.01 idle.

## The decision brain (prompt + reference → kit)
A **motion-director** step that: (1) reads the prompt + any reference image/video/URL (moodboard it),
(2) **classifies the archetype** (and sub-style from presets/styles.md), (3) confirms in one line so
the user can redirect, (4) **locks the kit into style.json** so motion-builder (type/transitions/
overlays), audio-engineer (music brief + SFX set + voice chain), and qa-richness all read ONE source.

## Adversarial gaps the build MUST resolve (the "etc." — pro things easy to miss)
- **HIGH — SFX-vs-VO ducking has no owner:** `mix-ducked.sh` sidechains only MUSIC under VO, not SFX. A loud impact can still bury a word. → SFX must also duck under VO (extend the mix or place SFX in VO gaps).
- **HIGH — classifier mismatch:** the 10 archetypes have no classifier in the engine (only a 9-row preset table). → build the archetype classifier.
- **HIGH — ambiguous / multi-type / non-matching-reference requests** are unhandled. → confirm-with-user fallback + "primary archetype + borrowed element" rule.
- **HIGH — tempo authority conflict:** Music BPM, Transitions pacing, and Hook timing each claim the beat with no reconciler. → music BPM is the single clock; transitions + hits snap to it.
- **HIGH — font lock vs brand/platform conflict:** kit hard-locks one display family but brand.json / platform may override. → precedence: brand.json > kit > default.
- **HIGH — lyric-video licensing:** user song = `user-provided`, fails the license gate without attestation. → auto-write attestation or prompt the user.
- **MED:** motion-hits.json `kind` has no controlled vocabulary (SFX + hook + ending all read it) → enumerate the kinds. · responsive type-scale tokens assumed by 9 dims but richness.js hard-codes px → add a width-aware scale. · voice roster: some recommended voices may not exist in docs/voices.md → reconcile to the real roster. · grade-vs-palette temperature cohesion needs one owner. · title/lower-third overlay-on-footage path under-integrated.
- **LOW:** accent-scarcity per-archetype exceptions; brand-kit can't seed derived tints/2nd accent.

## Final changes to build (when approved)
1. **`presets/motion-kits.md`** — the 10 archetype kits above as the canonical library (effort: medium).
2. **`motion-director` agent** — classify archetype from prompt/reference → confirm → lock kit into style.json; owns the tempo clock + brand/platform precedence + ambiguity fallback (effort: medium).
3. **`docs/motion-graphics-decisions.md` taxonomy** — the `kind` vocabulary for motion-hits + the kit_template schema (effort: low).
4. **Wire motion-builder** (type/transitions/overlays/hook/ending from kit) **+ audio-engineer** (music query + SFX map + voice chain from kit) (effort: medium).
5. **Voice post-chain** — add HPF→compress→presence→de-ess to the audio scripts (today there is NONE) (effort: medium).
6. **SFX ducking** — extend the mix so SFX also duck under VO / land in gaps (effort: low-medium).
7. **qa-richness kit-coherence check** — verify the kit was applied as one package (effort: low).
8. **Responsive type-scale tokens** in richness.js (width-aware) (effort: low).

## Bottom line
This converts motion-graphics from à-la-carte element-picking into one coherent kit per type, chosen
by reading the brief — fonts, color, animation, transitions, music, SFX, voice, hook, and ending all
flow from a single locked source, so they cohere every time. Highest-leverage single change: the
**motion-director + presets/motion-kits.md** (the brain + the library) — everything else is wiring.
