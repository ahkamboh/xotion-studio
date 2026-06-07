# Motion-Graphics KITS — the coherent package per archetype

Each motion graphic is built from ONE locked **kit** chosen by archetype, so fonts, color,
text-animation, transitions, music, SFX, voice, hook, and ending all cohere **by construction**.
The **motion-director** classifies the archetype + locks the kit into `work/style.json`;
motion-builder + audio-engineer read it. Never pick these elements à la carte.

Read alongside: `docs/motion-graphics-decisions.md` (kit schema, motion-hit `kind` vocabulary,
tempo-clock + precedence rules), `presets/styles.md` (palette/font token blocks),
`docs/voices.md` (voice roster), `docs/motion-graphics-kit-spec.md` (full rationale).

## The kit fields (what gets locked)
`platform` · `fonts {display, support, mono}` · `type_scale {display_px, label_px, tracking, leading}` ·
`text_anim {entrance, emphasis, exit}` · `color {bg, ink, accent, grade}` · `transitions` · `pacing {dwell, beat}` ·
`music {genre, bpm, arc, query}` · `sfx {kind→sound map, density}` · `voice {id, speed, profile} | none` ·
`hook` · `ending` · `atmosphere`

---

## 1. kinetic-typography / quote
- **fonts:** Space Grotesk 700 / Bricolage 800 display · Instrument Serif italic accent word · JetBrains Mono label
- **type_scale:** display 150–220px (one line at a time), tracking −0.03em, leading 0.95
- **text_anim:** entrance letter-cascade (per-letter y40→0, blur8→0, .7s expo.out, stagger .03) · emphasis color-shift the key word in place · exit fade except final line
- **color:** high-contrast mono bg/ink + ONE accent on the key word · grade: clean
- **transitions:** hard cut spine + mask-wipe on emphasis lines · **pacing** ~2 beats/line
- **music:** minimal cinematic piano + sub pulse, **70–90 BPM**, near-flat + ONE swell on the key line · query `minimal emotional cinematic piano sub-bass 80bpm instrumental no drums`
- **sfx:** transition→whoosh (−16 LUFS, −150ms lead) · the single climax word→impact + sparkle tail · NO sub-drop · density low
- **voice:** **none** (type is the delivery). If insisted: `af_bella`/`bm_lewis` @ 0.90, profile cinematic
- **hook:** open on the most provocative word at hero scale + whoosh — never fade up from black
- **ending:** final line assembled on the last beat, hold dead-center 0.6s, fade everything else

## 2. product-reveal
- **fonts:** Sora/Manrope 700 head · Inter 500 body · JetBrains Mono labels
- **type_scale:** name 96–120px (−0.02em), feature 40–52px, eyebrow mono 28px +0.18em UPPER
- **text_anim:** name mask-wipe (inner y120→0, .7s expo.out) · feature rise-blur · exit scale-down
- **color:** deep bg + warm rim/accent glow · grade: clean or warm
- **transitions:** cinematic-zoom into hero · mask-wipe/sdf-iris between features · crossfade 0.5s · **pacing** 2.5–3s/feature
- **music:** clean minimal electronic swell (Apple-keynote), **80–100 BPM**, ticking intro→filtered build→bass DROP on hero · query `clean minimal electronic product reveal build swell 90bpm instrumental`
- **sfx:** pre-roll riser (1.2s) → reveal: impact + sub-drop stacked → feature cards: click/tick · density med
- **voice:** `af_nova` (F) / `am_liam` (M) @ 1.0, profile house (warm-doc → warm)
- **hook:** teaser silhouette/angle of the product + riser starting immediately
- **ending:** product scales to upper-2/3 · logo lockup + tagline rise-blur · CTA + price held

## 3. logo-sting  (the sting IS the whole 2–4s piece)
- **fonts:** brand font (brand.json) / Sora 700 geometric wordmark ~55% canvas · mono tagline 26px +0.22em
- **text_anim:** mark spin-in (scale0, rot−180→0, 1.0s back.out(1.7)) or mask-reveal · glow-flash on lockup
- **color:** brand palette · grade: punchy
- **transitions:** flash-through-white / chromatic burst at lockup · no scene transitions · **pacing** total 2.5–3.5s
- **music:** single cinematic riser + impact + tail (NOT a loop) · query `cinematic logo reveal riser whoosh impact boom sting 3 seconds instrumental`
- **sfx:** riser pre-roll → sub-drop (signature) + impact on lockup → sparkle shine sweep · push master to −1 dBTP
- **voice:** **none** (unless a 1-line tagline → `am_onyx` @ 0.92, profile cinematic)
- **hook = whole thing:** elements converge → lockup → glow flash → hold legible 0.8s
- **ending:** hold the lockup, tagline settled, freeze-frame legible

## 4. data-stat-explainer
- **fonts:** Fraunces 900 giant italic numbers OR Space Grotesk 700 + Inter 500 + JetBrains Mono · use XChart for charts
- **type_scale:** hero stat 240–400px tabular-nums (−0.04em, leading 0.9), unit 64px, context 32–40px, eyebrow mono 28px
- **text_anim:** count-up to peak · bar/line draw · number lands then holds 0.5s
- **color:** editorial restrained + 1 accent on the number · grade: clean/editorial
- **transitions:** hard cut between stats · push-up for ranked items · resolve in-scene · **pacing** 3–4s/stat
- **music:** understated documentary bed — soft piano + light pulse + low strings, **70–95 BPM**, lift per stat · query `understated documentary underscore soft piano light pulse 85bpm instrumental`
- **sfx:** counter→click/tick (accelerate→settle, LAST tick on the counter's peak) · draw→soft whoosh · stat lands→impact · density med, VO-ducked
- **voice:** `am_adam` (M) / `af_sarah` (F) @ 0.98–1.0 (numbers need air), profile house · UK-formal → `bf_emma`
- **hook:** open on the single most shocking number, full-screen, + impact
- **ending:** number shrinks to a chip top-left · one-line "so what" takeaway rises · CTA

## 5. hype-promo / trailer
- **fonts:** Anton 400 / Archivo Black 400 display · Poppins 700 body
- **type_scale:** headline 180–300px ALL CAPS (often 2 stacked words), −0.02em, leading 0.92
- **text_anim:** punch-in per word (scale1.6→1, .18s back.out(2.6), stagger .05) · screen-shake on the drop
- **color:** high-energy bold accent + flashes · grade: vibrant/teal-orange
- **transitions:** hard cut + whip-pan + glitch/chromatic on big hits + flash-through-white before CTA · **every cut on a beat** · **pacing** 0.6–1.2s/scene, accelerating
- **music:** driving trap / big-room / hybrid-orchestral with braams, **120–150 BPM (140 sweet spot)**, tense intro→build→HARD DROP at the value moment · query `driving trap hybrid orchestral braam riser hard drop 140bpm instrumental`
- **sfx:** DENSEST — riser into every cut · whoosh+impact on hard cuts · long riser→sub-drop on the drop · headline stamps→click · density high
- **voice:** `am_michael` (M) / `af_sky` (F) @ 1.08–1.12, profile **hype** (aggressive, cuts the loud bed)
- **hook:** hardest headline + beat-drop entrance inside the first second
- **ending:** offer punch-in ON the drop + shake → hard-cut end-card "GET IT NOW →" + URL/handle

## 6. lyric-video
- **fonts:** Poppins Bold ALL CAPS white (house) / Instrument Serif italic accent · 90–130px, 2–3 words/line, leading 1.05
- **text_anim:** per word opacity0→1, y22→0, scale.96→1, blur6→0, .65s, stagger .06 (`caption.py --content music`)
- **color:** per the song's mood · grade: matched to vibe
- **transitions:** crossfade within a phrase · hard cut on section downbeat · whip/light-leak at lifts · **beat-locked to the SONG**
- **music:** **the user's song IS the track** (no fetch). Trim leading silence ≤0.3s.
- **sfx:** minimal — whoosh on section changes (downbeat) · sparkle on instrumental-gap pulses · NO per-word impacts · density low
- **voice:** **none** — the sung vocal is the voice
- **hook:** title card on the intro bars, drop into lyrics on the first sung word
- **ending:** last/hook line held; 7-bar amplitude visualizer carries an instrumental outro ≥3s
- ⚠️ **license:** user song = `user-provided` → needs `licenses/manual-attestation.json` (motion-director prompts for it) or it fails the license gate.

## 7. title / lower-third  (overlay on continuous footage, not a full video)
- **fonts:** DM Sans 700 / Inter 600 name · Inter 500 role · optional mono kicker
- **type_scale:** name 52–64px (−0.01em), role 28–34px muted, kicker mono 22px +0.2em
- **text_anim:** slide-in (y60→0, .6s expo.out) + draw-line accent rule · exit slide-out+fade ~0.5s before the name need ends
- **color:** brand accent rule + legible scrim over footage
- **transitions:** NO scene transition — it's an overlay; the "transition" is in/out
- **music:** none (rides footage audio) or barely-there pad
- **sfx:** ONE soft whoosh on slide-in (−19 LUFS), optional matching on exit · NOTHING else (a lower-third with a sub-drop = amateur)
- **voice:** usually none
- **hook/ending:** n/a (overlay)

## 8. narrated-explainer  (the default voice archetype)
- **fonts:** Inter 500/600 one family (Warm Documentary → Instrument Serif italic accent)
- **type_scale:** scene headline 88–120px (−0.02em, leading 1.05), supporting 32–40px muted, eyebrow mono 28px
- **text_anim:** word/line rise-blur entrance · gentle idle · crossfade exit
- **color:** clean calm + 1 accent · grade: clean/warm
- **transitions:** crossfade workhorse (0.5s) · hard cut ONLY at a topic shift · **voice-locked via scene-sync.py** (cuts on sentence boundaries) · **pacing** by VO
- **music:** warm neutral underscore, no vocals/no lead melody, **75–95 BPM**, slight lift at hook + CTA · query `warm neutral underscore soft piano no vocals 85bpm instrumental`
- **sfx:** SPARSE, VO-first — title whoosh · soft impact per key point IN the VO gap · crossfade whooshes · CTA pop · density low, AV-ducked
- **voice:** `af_nova` (F) / `am_adam` (M) @ 1.0, profile house · wellness → `af_heart` · UK → `bf_emma`/`bm_george`
- **hook:** the core promise/question in the first sentence + matching visual
- **ending:** summary recap → end-card logo + value prop + CTA "Subscribe / Visit X" + @handle/URL

## 9. social-sticker-pop
- **fonts:** Bowlby One / Bagel Fat One / Archivo Black bubble display · JetBrains Mono 28px kicker · double-offset shadow on type (cream +6px, ink +18px)
- **type_scale:** hero word 240–420px, kicker 28px +0.18em UPPER
- **text_anim:** squash-stretch slam (scaleY 0.6→1.15→1, back.out(3)) · sparkle stars blink
- **color:** bright high-sat playful · grade: vibrant
- **transitions:** hard cut ONLY + scale/iris pop (snappy, no soft anything) · **pacing** 0.5–1.0s/scene beat-locked
- **music:** bouncy pop / hip-hop / playful electronic with claps, **100–128 BPM**, instant energy→bounce drop on the slam · query `bouncy upbeat playful pop hip hop claps bright 120bpm instrumental`
- **sfx:** pop on every sticker slam (workhorse) · click on sparkle blinks · tiny sparkle on twinkles · NO sub-drop/long riser · density high but small-band
- **voice:** `af_sky` (F) / `am_liam` (M) @ 1.1, profile hype · OR none + active-word captions
- **hook:** sticker slam + pop in the first 0.5s
- **ending:** @handle sticker slam center-bottom (Rich.stamp, rot −7) + "FOLLOW"

## 10. cinematic-intro
- **fonts:** Oswald 600 / Anton head · Inter 500 sub
- **type_scale:** title 120–180px ALL CAPS (−0.01em, leading 1.0; thin weight can take +0.04em for grandeur), subtitle 30–38px +0.15em muted
- **text_anim:** slow mask-wipe (inner y120→0, .9s expo.out) · slow 1.01 idle
- **color:** moody letterboxed low-key + restrained accent · grade: cine/moody
- **transitions:** long luxurious crossfade (0.8–1.2s) + cinematic-zoom + light-leak sweep · flash-through-white only for a beat-drop reveal · **pacing** SLOW-FAST-SLOW
- **music:** orchestral/ambient with low drone + braam + slow swell, **50–70 BPM** (or rubato), braam IMPACT on the title · query `orchestral ambient cinematic drone braam slow swell 60bpm instrumental`
- **sfx:** slow + weighty + sparse — long riser into title · sub-drop + impact stacked on the reveal · slow whoosh on the ken-burns push · density low
- **voice:** `am_onyx` (M) @ 0.90 (trailer narrator) / `af_bella` (F) @ 0.92, profile **cinematic**
- **hook:** hold on an atmospheric first frame (NEVER black) + drone rising
- **ending:** title held over the calmed full-bleed image, letterbox bars, slow idle, music resolve

---

## Universal defaults (when archetype is ambiguous)
9:16 1080×1920 @30fps · 15s · −14 LUFS · narrated-explainer kit · display Space Grotesk 700 132px /
support Inter 500 30px / mono JetBrains 28px · hard-cut transitions · warm neutral 85 BPM bed ·
SFX sparse · voice `af_nova`/`am_adam` @1.0 house. The motion-director confirms before building.
