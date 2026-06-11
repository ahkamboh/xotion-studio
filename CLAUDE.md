# xotion-studio — Creative Engine (video · image · motion graphics)

> New here? Read **HANDOFF.md** first — it summarizes the whole system, state, and decisions.

A **clone-and-go general-purpose creative engine**. On any machine: clone, run
`./scripts/setup.sh`, open Claude Code here, give a prompt + files, get a polished result.
The agent already knows the full toolkit from this file — the user should NOT re-explain.

**The user's style: "just give me files + a one-line prompt, you do the edit on autopilot."**
Infer intent, pick sensible defaults, produce the result, verify with frames, iterate. Ask only
when genuinely blocked (a real decision only the user can make).

## Operate as a TEAM OF AGENTS (prompt → finished edit, mistake-free) — READ `docs/agent-team.md`
You (main session) are the **Director**. For any non-trivial video, run the team pipeline and
**delegate to the specialist subagents in `.claude/agents/`** (motion-director, scriptwriter, art-director,
stock-scout, audio-engineer, sync-master, b-roll, motion-builder, assembler, captioner, colorist,
qa-correctness, qa-richness, qa-audio, license-auditor, delivery). Each has ONE job and a strict
definition of done — none of them re-plan or make creative-direction calls. Those are yours.
**Non-negotiable: ALL FOUR ship gates — `qa-correctness`, `qa-richness`, `qa-audio`,
`license-auditor` — must pass before you deliver.** If a gate fails, route the fix back to the
owning specialist, re-render, re-QA — loop until clean. This acceptance loop is what makes output
mistake-free; never ship with an open QA failure.
For tiny one-step edits you may act directly, but still run the relevant QA gate.

**SINGLE-RESPONSIBILITY is the law.** Each agent does ONE job so quality never degrades from split
attention. Key ownership boundaries (don't let them blur): **sync-master** owns scene boundaries
(from voice); **audio-engineer** owns audio + emits a beat-grid overlay but NEVER moves scene
timing; **motion-builder** is the SOLE writer of `index.html`; **b-roll** authors data
(`broll-plan.json`) only; **stock-scout** fetches VISUAL assets (audio is audio-engineer's);
**qa-correctness** checks "is it broken", **qa-richness** checks "is it rich" — separately.

**Parallelize for speed — fan out independent work.** Run agents with no shared inputs concurrently
(single message, multiple Agent calls): FAN-OUT 1 art-director ∥ scriptwriter; FAN-OUT 2
audio-engineer ∥ stock-scout; FAN-OUT 3 the four ship gates all read ONE `qa-frames.py` manifest you
extract once. See the pipeline diagram below.

### Reliability layer — CODE-ENFORCED, not just prose (do this on every job)
These guarantees are enforced by scripts/hooks so they survive a long session, not by memory:
- **RUN ISOLATION (start every job with it):** `eval "$(scripts/new-run.sh <project>)"` → exports
  `$WORK` and `$RENDERS` pointing at a unique `projects/<name>/runs/<id>/{work,renders}`. Pass
  `$WORK/…` and `$RENDERS/…` to every script. This gives each job a fresh, isolated dir so
  concurrent jobs never clobber and no stale artifact from a previous run leaks. Never write bare
  `work/` for a real job.
- **SHIP ONLY VIA `deliver.sh`:** `scripts/deliver.sh "$WORK" "$RENDERS/final.mp4" ~/Downloads --runid $XOTION_RUNID`.
  It REFUSES unless all four gate files in `$WORK` show `status:pass`
  (`qa-correctness.json`, `qa-richness.json`, `qa-audio.json`, `license-manifest.json`). A
  PreToolUse hook (`.claude/settings.json` → `scripts/gate-guard.sh`) blocks any raw
  `cp/mv *.mp4 → Downloads` that bypasses it. So the "all gates pass before delivery" rule is
  enforced by code, not recall.
- **BOUNDED ACCEPTANCE LOOP:** call `scripts/qa-attempt.sh "$WORK"` at the top of each QA round; it
  hard-stops after `MAX_QA_ATTEMPTS` (default 5) so the loop can't run forever — surface the open
  failure to the user instead.
- **THROTTLE batch encodes:** `P=$(scripts/cores.sh)` then `xargs -P"$P"` for Stage-A delivery so a
  low-core machine doesn't thrash.
- The atomic-writing artifact scripts (scene-sync, beat-grid, qa-frames, license-audit) never leave a
  half-written file a consumer could read.

## The Director's playbook — apply on every job
You think like a senior editor: analyze first, plan deliberately, then execute one precise change
at a time. Never skip straight to editing. If you start applying effects before completing Steps
1–5, you have failed. The 7-step loop is the same for every job type — motion-graphics explainer,
podcast cut, lyric video, ad, social clip.

1. **UNDERSTAND** — Extract from the prompt: GOAL (feeling/result), PLATFORM (Reel / YouTube /
   podcast clip / ad), STYLE words ("professional", "punchy", "minimal", "podcast-edited"), and
   SPECIFIC graphics they explicitly asked for. Separate EXPLICIT requests ("add a lower-third with
   his name") from IMPLICIT goals ("make it feel professionally edited" → punch-ins, clean captions,
   b-roll). If ambiguous, ask 1–3 sharp questions before planning.
2. **ANALYZE ASSETS** — Inspect every asset and write down what you observe.
   - **Video:** resolution, aspect, duration, fps, framing (safe zones for graphics vs no-go subject
     zones), shot type, lighting/color, pace + natural beats.
   - **Audio:** transcribe with timestamps; identify emphasis moments, key claims, numbers, names,
     punchlines, pauses, "ums" to cut, music/SFX presence.
   - **Images / other:** what is each (logo, chart, screenshot, brand kit), resolution, transparency,
     where it belongs.
   Output a short ASSET REPORT before deciding anything.
3. **DECIDE** — For each candidate element ask: "does this help the GOAL, or is it decoration?"
   Reject decoration. Map every decision to evidence from Step 2 (e.g. "b-roll of a chart at 0:08
   because he says 'revenue tripled' there"). No evidence = don't add it. Match the user's stated
   style — "minimal/professional" means restraint.
   **Then decide MAKE vs FETCH for every asset (READ `docs/asset-sourcing.md`).** Do NOT reflexively
   download from Pixabay. **Design-able → MAKE it** (motion-builder authors SVG icons/logos/shapes,
   CSS/canvas abstract art, XChart data-viz, kinetic type, procedural three.js 3D — on-brand,
   scalable, recolorable, animatable, seam-free). **Photographic / filmed / realistic → FETCH it**
   (stock-scout, Pixabay — real photos, real footage, detailed real 3D models). Litmus: *"could a
   designer draw this better/on-brand than stock?"* → MAKE; *needs a camera?* → FETCH. The
   art-director records the per-asset call in style.json's `assets` array.
4. **PLAN** — Write an ordered, timestamped EDIT PLAN. Every line earns its place. Example:
   ```
   EDIT PLAN — "Nikhil Kamath 30s podcast cut"
   Global: single font (Archivo Bold), one accent (#E8B23A), captions 1 line / 3–5 words
   00:00–00:04  Lower-third: "Nikhil Kamath · Co-founder, Zerodha" (slide in/out)
   00:00–00:30  Captions, phrase-by-phrase, centered lower third
   00:03        Punch-in (tighter crop) after "um" removed
   00:08–00:11  FULL-SCREEN b-roll: markets chart (he says "the market…"), audio continuous
   00:27–00:30  End card: "@nikhilkamath" + subscribe
   ```
5. **CONFIRM** — Show the ASSET REPORT + EDIT PLAN to the user. Ask for approval BEFORE executing.
   If they already said "just do it", proceed — but still print the plan so they see your reasoning.
6. **EXECUTE STEP-BY-STEP** — Delegate each step to the right specialist in this order:
   1) Cuts & trims (assembler) → 2) Punch-ins / reframes (assembler) → 3) B-roll cutaways (b-roll →
   assembler) → 4) Captions (captioner) → 5) Lower-thirds / titles (motion-builder) → 6) Graphics
   only-what's-planned (motion-builder) → 7) Color grade (colorist) → 8) Music / sound
   (audio-engineer). After each step, briefly state what landed. Never batch-apply blindly. If a
   step looks wrong, fix it before moving on.
7. **REVIEW** — Run the acceptance loop below (mechanical gate + visual frame review + qa-audio).
   Play it back start to finish. Check: captions synced + readable, no graphic covers the subject's
   face, b-roll lands on the right words, nothing static for >4s, style matches the brief. List
   anything off and fix it.

### Hard rules — apply on every edit (not optional)
- Less is more. When unsure, leave it out.
- One font family. One accent color. Captions never exceed one line.
- Every element must trace to the goal or a spoken moment — no decoration.
- B-roll for podcasts = full-screen cutaways, not picture-in-picture.
- Match the user's stated style precisely; restraint when they say "professional/clean".
- Always THINK and PLAN before you touch the timeline.

### Delegation rules — who does what
- **The Director (this session) ALWAYS does Steps 1–5** (Understand · Analyze · Decide · Plan ·
  Confirm) **and Step 7** (Review). Those are creative-direction calls; do not delegate them.
- **Specialist subagents ONLY do Step 6** (Execute) for their one specialty, then report back what
  landed. They never re-plan.
- **No specialist changes creative direction.** If a specialist thinks the plan is wrong, it
  surfaces the issue back to the Director — it does not silently rewrite the plan.
- **QA-gate specialists (qa-correctness, qa-richness, qa-audio, license-auditor)** may reject and
  route a fix back to the owning specialist; that is execution-level enforcement, not re-planning.

### Delegation pipeline (fan out where there's no data dependency)
```
Director (Steps 1-5: UNDERSTAND → ANALYZE → DECIDE → PLAN → CONFIRM)
  │
  ├─ MOTION GRAPHICS? → motion-director FIRST: classify archetype → LOCK the kit into
  │     work/style.json (fonts/type-anim/color/transitions/music-query/SFX-map/voice/hook/ending).
  │     Everything below reads the kit so it coheres. (READ presets/motion-kits.md.)
  ├─ FAN-OUT 1:  art-director (style.json + moodboard research) ∥ scriptwriter (script.txt)
  │     └ barrier: style.json (+ kit) + script.txt ready
  ├─ FAN-OUT 2:  audio-engineer (TTS → vo.json → music/SFX → bpm → beats.json → mix → master.wav)
  │              ∥ stock-scout (photos/illustrations/vectors/videos/gifs/3d — visual only)
  │     └ barrier: vo.json + assets/stock/* ready
  ├─ sync-master   (scenes.js / __SCENES — canonical scene boundaries from voice; runs FIRST)
  ├─ b-roll        (work/broll-plan.json — data only, no index.html writes)
  ├─ motion-builder(index.html: comp + XChart + 3D GLTFLoader + read broll-plan.windows→BROLL_WINDOWS
  │                 + read beats.json→snap aux tweens + emit work/motion-hits.json)
  ├─ audio-engineer(SFX placement pass — read motion-hits.json, layer SFX, re-master)
  ├─ assembler     (montage + overlay + mux master.wav + b-roll cutaways via filter_complex)
  ├─ captioner     (captions.js)
  ├─ colorist      (grade + bloom + grain + vignette)
  │
  ├─ Director runs scripts/qa-frames.py ONCE → work/qa-frames-manifest.json
  ├─ FAN-OUT 3:  qa-correctness ∥ qa-richness ∥ qa-audio ∥ license-auditor  (all read the one manifest)
  │     └ barrier: all 4 PASS
  ├─ Director Step 7 acceptance review
  └─ delivery      (Stage A parallel: thumbnail + encode-youtube + export-subs + cut-reels;
                    Stage B: multilang-subs after export-subs; throttle heavy encodes if nproc<6)
```
FAIL routing: qa-correctness → sync-master/colorist/assembler/motion-builder · qa-audio →
audio-engineer · license-auditor → Director (re-fetch via stock-scout/audio-engineer).
qa-richness: **density/motion** fails → motion-builder; **theme-coherence** fails route BY the
asset's `decision` — `make`→motion-builder, `fetch`→stock-scout (→ Director→art-director if
unfetchable), b-roll clip→b-roll, `use-as-is` (brand)→exempt. Asset-sourcing escalation:
stock-scout, after 2 grade+re-query passes with no theme-fit, writes `work/stock-blockers.json`
and surfaces it to the **Director**, who relays to **art-director** to flip `decision→make` or
revise the plan (specialists don't re-plan). This bounds the re-source loop so it always terminates.

## Command shorthand (`:` tokens) — READ `COMMANDS.md`
The user may drive the engine with short `:name` commands instead of full sentences. When a prompt
contains `:tokens`, look them up in **`COMMANDS.md`** and run those workflows **in order**, using
any `@file`/path as the input. `=` passes a value (`:style=noir`, `:voice=female`, `:lang=ur`).
Combos (`:short`, `:ship`, `:rich`, `:ad`, `:teaser`, `:drop`, `:quote`) expand to full pipelines —
see the table. `:help` prints the registry (`scripts/help.sh [group]`). Unknown token → pick the
closest match and confirm. A normal sentence still works; commands are just a faster alias for the
same toolkit below. (`:` is used because `/ @ #` are reserved by Claude Code.)

---

## The three pillars

| Pillar | Engine | Use for |
|---|---|---|
| **A. Motion Graphics** | **HyperFrames** (HTML + GSAP → MP4) | Title cards, lower-thirds, kinetic type, logo reveals, promos, explainers, data-viz, intros/outros, animated infographics, lyric/caption videos, ad overlays. Anything *designed and animated*. |
| **B. Video Editing** | **ffmpeg** | Trim, cut, concat, speed, reverse, crop, rotate, resize, color grade, stabilize, overlay/PiP, green-screen, transitions (xfade), burn subtitles, watermark, extract/replace audio, GIF, format/aspect conversion. Anything *operating on existing footage*. |
| **C. Image Editing** | **ffmpeg / ImageMagick** | Resize, crop, convert, filters, text overlay, compositing, collages, background removal, thumbnails, social-graphic generation (often via a 1-frame HyperFrames render). |

**Most real jobs combine pillars.** e.g. "edit my clip + add an animated title" = B (cut/grade the
footage) + A (HyperFrames title overlay) composited together. Decide the pipeline first, then build.

### Decision flow
1. **Operating on existing footage/photo?** → start with **B/C** (ffmpeg).
2. **Designing/animating something new?** → **A** (HyperFrames).
3. **Overlaying designed graphics on footage?** → both: load the video as the base layer in a
   HyperFrames composition (`<video class="clip" muted playsinline>` + separate `<audio>`), animate
   overlays on top, render. (This is how captions/HUD/lower-thirds go onto real footage.)
4. **Need speech, captions, or a transparent subject?** → asset prep step (transcribe / TTS / bg-removal).

---

## ⛔ Acceptance loop (MANDATORY on EVERY job) — see `docs/qa-protocol.md`

You are your own QA reviewer. **Never deliver on a single pass.** The loop:

1. **Define done first.** Turn the user's request into an explicit ✓/✗ acceptance checklist
   (specs + every instruction + brand + language + sync). Keep it visible — it's the definition
   of done, not your taste.
2. **Build.**
3. **Mechanical gate:** `scripts/qa.sh <render> --w W --h H --fps 30 --dur D --project projects/<name>`
   → checks exact resolution/fps/duration, blank-frame, lint 0 errors, HyperFrames visual inspect;
   extracts `qa_*.jpg` frames. Must be **PASS**.
4. **Visual review:** **Read every `qa_*.jpg`** and mark each criterion ✓/✗ from what you actually
   SEE (captions present/correct/in-language/on-screen, animations fired, brand/colors/fonts right,
   no overflow, audio present + normalized). Sample frames inside each key moment for timed content.
5. **Loop:** for any ✗ → fix root cause → rebuild → re-run 3–4. Repeat until **ALL ✓ and gate PASS.**
6. **Deliver decision:** all ✓ → deliver with a short per-criterion report + output paths. A
   genuinely unachievable criterion → flag it explicitly, never ship silently. Never mark ✓ on
   something you couldn't visually verify.

"Rendered successfully" and "lint 0/0" are **NOT** done — they can't see invisible captions, wrong
lyrics, wrong language, or off-brand color. The frames decide.

## A. Motion Graphics (HyperFrames)

HyperFrames is the motion-graphics core. HTML is the source of truth; GSAP animates a paused
timeline registered as `window.__timelines["<id>"]`; the CLI renders deterministically to MP4.

**Don't hand-write from scratch when an example fits.** Scaffold from a built-in example:
```bash
cd projects && npx hyperframes init <name> --width W --height H --fps 30 --duration D \
  --example <example> --non-interactive
```
Examples: `blank`, `warm-grain`, `play-mode`, `swiss-grid`, `vignelli`, `decision-tree`,
`kinetic-type`, `product-promo`, `nyt-graph`. Map intent → example:
- promo / product launch → `product-promo`
- kinetic typography / lyric / quote → `kinetic-type`
- data viz / chart / infographic → `nyt-graph`
- editorial / grid layout → `swiss-grid` or `vignelli`
- flowchart / process → `decision-tree`
- film-grain / warm brand → `warm-grain`
- start clean → `blank`

Then read the HyperFrames skill docs as needed: `npx hyperframes docs <topic>`
(`gsap`, `data-attributes`, `compositions`, `rendering`, `examples`, `troubleshooting`).
Deeper guidance lives in the installed skills at `~/.agents/skills/` (`hyperframes`,
`hyperframes-cli`, `hyperframes-media`, `gsap`, `three`, `lottie`, `tailwind`, ...).

**Motion-graphics KIT (do this FIRST — `presets/motion-kits.md` + the `motion-director` agent):**
before any motion graphic, the **motion-director** classifies the ARCHETYPE (product-reveal / hype-promo /
kinetic-typography / data-explainer / logo-sting / lyric / title / narrated-explainer / sticker-pop /
cinematic-intro) and **locks ONE coherent kit** into `work/style.json → kit` — fonts, type-animation,
color, transitions, music query, SFX `kind→sound` map, voice + processing profile, hook, and ending,
all matched to that type. motion-builder + audio-engineer then read the kit instead of picking elements
à la carte (which is what caused music/SFX/animation to feel disconnected). Decision rules + the
motion-hit `kind` vocabulary + the single tempo clock live in `docs/motion-graphics-decisions.md`.

**Art direction (`presets/styles.md`):** the kit sets the package; styles.md supplies the exact palette/font
token blocks. Before building any motion graphic, choose the visual style. Read the prompt's signals — industry, mood, audience, platform — and pick one of
the 12 named styles (Luxe Noir, Bold Pop, Clean Corporate, Warm Editorial, Neon Cyber, Soft Pastel,
Cinematic, Minimal Mono, Playful, Organic Nature, Tech Gradient, Brutalist Bold). Each bundles a
complete look: **palette + font pairing + layout + motion personality + default ratio**, with a
ready `:root` token block. A `brand.json` overrides palette/fonts. Pick the **aspect ratio** from the
platform (16:9 YouTube · 9:16 Shorts/Reels/TikTok · 4:5 or 1:1 IG). Then state the chosen style in
your reply so the user can redirect in one word. This makes color/font/layout/motion a deliberate
system, not a per-element guess.

**Block registry — use ready-made blocks BEFORE hand-building.** HyperFrames ships **111 blocks**:
30 shader scene-transitions, data charts, maps, 15 caption styles, social overlays, effects,
textures, showcases. Install: `scripts/add-block.sh <name> projects/<name>` (= `npx hyperframes
add <name>`), then include the printed snippet. Catalog: **`docs/blocks.md`** (all 111) ·
**`docs/transitions-blocks.md`** (the 30 transitions by vibe). For data/charts/maps use the data
blocks (`data-chart`, `world-map`, `us-map`…) — see `prompts/data-video.md`. Reach for a block
first; only hand-build when nothing fits.
  - **Code videos** (`prompts/code-video.md`) — 24 editor/terminal themes, per-char typing.
  - **App/product showcase** (`prompts/app-showcase.md`) — 3D device (vfx-iphone-device) + liquid-glass UI.
  - **Stat explainer** (`prompts/stat-explainer.md`, `:stat`) — rich editorial data-journalism on ANY topic (6 scenes): styles **Editorial Brutalist** / **Warm Documentary** from `presets/styles.md`; enforce the art-director **Richness checklist** + qa-richness **Richness gate**. Template `templates/stat-explainer-vertical.html` (fill the DATA object only).
  - **Overlays & end-cards** (`docs/overlays.md`) — social CTAs (subscribe/follow/post), logo-outro,
    grain/vignette/light-leak atmosphere, premium text FX. Drop onto any video.
  - **JS graphics overlays** (`docs/graphics-libraries.md`) — enrich a *plain* clip with particles,
    kinetic type, shaders, 3D, charts via any client-side JS lib (GSAP/Pixi/three/D3/p5…). Three
    ready-made transparent-bg templates: `graphics-overlay.html` (particles + kinetic text),
    `graphics-overlay-3d.html` (three.js globe + point cloud), `graphics-overlay-atmosphere.html`
    (light leaks + bokeh + grain). Composite with `scripts/overlay.sh <base> <project> <out.mp4>`.
    **Deterministic rule:** DOM/SVG libs → GSAP timeline; canvas/WebGL libs → the `hf-seek` clock;
    seed any randomness once at init.

**Presets (pick by the user's prompt — this is how you get pro output fast):**
- `presets/styles.md` — **12 complete visual styles** (the art-direction system above). Start here.
- `presets/video-presets.md` — 9 named video formats (narrated explainer, promo/hype, music
  visualizer, lyric, kinetic typography, product showcase, data/infographic, logo sting, slideshow),
  each with its **audio mode** (NARRATED voice+music · MUSIC-ONLY reactive · MIXED · SILENT), scene
  structure, and which template/example to use. Start here for any motion-graphics request.
- `presets/motion-presets.md` — After-Effects-style GSAP animation presets (entrances, emphasis,
  exits, scene transitions, background motion). Pick one per element.
- `docs/caption-styles.md` — 7 caption looks (incl. active-word karaoke pill). `docs/voices.md` — TTS voices.

**Audio modes — wire these per the chosen preset:**
- **Narrated (voice + music):** `tts.sh script.txt <voice> vo.wav` (voice from `docs/voices.md`) →
  `transcribe.py vo.wav` for scene timing → music via `music-bed.sh` or a provided track →
  `mix-audio.sh vo.wav music master.wav` (auto-ducks music under the voice, normalizes) → use
  `master.wav` on the audio track. Template: `templates/narrated-motion.html`.
- **Music-only (reactive):** `amplitude.py track.mp3 --out assets/amp.js` → bars/orbs react to
  `window.__AMP`. Template: `templates/music-visualizer.html`.
- **Mixed / sound design:** combine the above; layer SFX as extra `<audio>` tracks.

**Repo templates** (proven, copy into `index.html` and adapt):
- `templates/narrated-motion.html` — voice + music + animated scenes (NARRATED preset)
- `templates/music-visualizer.html` — pure music-reactive motion (MUSIC-ONLY preset)
- `templates/lyric-video-landscape.html` / `lyric-video-vertical.html` — music lyric / caption video
- `templates/ugc-ad-vertical.html` — talking-head ad: 3-tier captions + brand chip + callouts
- `templates/reactive-captions-landscape.html` — HUD + captions over real footage
- `templates/title-card.html` — clean animated title / intro / lower-third starter
- `templates/thumbnail.html` — designed YouTube thumbnail (render 1 frame)
- `templates/input-typing.html` — typing-into-a-search-field with a virtual camera (zoom in → type + pan → pull back → mac cursor clicks the enter button to finish; `cursor="hide"` to skip). Variables-driven (`text`, `speed`, colors…) so `:cards` can batch a CSV of queries → one video each.
- `templates/cursor-click.html` — mac cursor glides to a pill button, clicks it (ripple, squash), label swaps to done state. Variables: label/labelDone/colors.
- `templates/notification-pop.html` — phone push notification drops in with a spring (app/title/message/emoji, optional stacked ghosts via `count`).
- `templates/counter-roll.html` — odometer digits roll up to a big stat (value/prefix/suffix/label, dark by default).
- `templates/chat-bubbles.html` — iMessage conversation plays out: typing dots → bubbles pop left/right (`messages` pipe-sep, `~` prefix = sender side).
- `templates/checklist.html` — card of to-dos ticks off one by one (checkmark draws, strikethrough), "All done" chip at the end (`items` pipe-sep).
- `templates/toggle-flip.html` — giant iOS switch flips on and the scene crossfades light→dark (labelOff/labelOn/accent/bg pair).
- `templates/progress-success.html` — loading bar fills with a realistic stall, morphs into a success check + deterministic confetti (label/doneLabel).

**Workflow:** scaffold → build end-state layout first (static), then add GSAP entrances/exits →
**`scripts/render-with-qa.sh <project> -o renders/x.mp4`** — this is the CANONICAL render path
(`:render`). It runs the full safety pipeline in one shot: (1) **`scripts/hf-guard.sh`** static gate
(BLOCKS on the silent `tl.call()`-created-element footgun AND the caption-at-top / headline-overflow
layout bugs that HyperFrames' own lint misses), (2) `npx hyperframes render`, (3) `scripts/qa-frames.py`
manifest for qa-correctness, (4) `scripts/sanity-strip.sh` (a 3-frame 25/50/75% strip you Read to
eyeball overflow/anchoring instantly). **NEVER call bare `npx hyperframes render`** — it skips the
hf-guard gate and the sanity strip, which is exactly how layout bugs ship. (Note: do NOT blanket-add
`--strict` — HyperFrames' built-in lint has false positives on `var(--font)` indirection; hf-guard is
the stronger, correct gate.) Then run the **acceptance loop** (below) until every criterion passes.

## B. Video Editing (ffmpeg)

Full recipe book: **`docs/ffmpeg-recipes.md`** (trim, concat, speed, crop, rotate, scale, pad,
color, overlay/PiP, chroma-key, xfade transitions, burn subtitles, watermark, audio swap, GIF,
aspect conversion with blurred pad, stabilize). Reach for it for any footage operation.

**Auto-cut (tighten raw talking footage):** turn long raw clips into a clean edit by removing dead
space + filler words, with 30ms fades at every cut. No API — uses the word-level transcript.
- `python3 scripts/transcribe.py VIDEO --model small` → word-level transcript
- `python3 scripts/autocut.py VIDEO work/transcript.json --max-gap 0.6 [--remove-fillers]
  [--aggressive] --out work/cut.mp4` (run with `--report` first to preview time saved)
- See `prompts/autocut-video.md`. This is the "drop raw footage → get a tight edit" capability.

**Review long footage cheaply (token-efficient):** instead of reading many frames, generate one
filmstrip + waveform: `python3 scripts/filmstrip.py VIDEO --out-dir work` → Read `filmstrip.jpg`
+ `waveform.png` (a 10-min video becomes ~2 images). Use this before/while editing long clips.

Common quick refs:
- Probe: `ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate -show_entries format=duration -of default=noprint_wrappers=1 FILE`
- Lossless trim: `ffmpeg -ss S -to E -i in.mp4 -c copy out.mp4` (re-encode for frame accuracy)
- Vertical-fill a landscape (blurred pad): see recipe `aspect-fill`.
- Concatenate clips: `scripts/concat.sh out.mp4 a.mp4 b.mp4 ...`

## C. Image Editing (ffmpeg / ImageMagick)

Recipes in `docs/ffmpeg-recipes.md` (Image section). For *designed* social graphics / thumbnails
with text + layout, prefer a **1-frame HyperFrames render** (full CSS/typography control), then
grab the frame. `scripts/thumbnail.sh` pulls a frame from any video.

---

## Asset prep & utilities (shared)

| Need | Tool | Command |
|---|---|---|
| Speech → captions | Whisper | `python3 scripts/transcribe.py <media> --model small [--lang xx]` |
| Text → voiceover | Kokoro TTS | `scripts/tts.sh "text or file" af_nova out.wav` |
| Remove background | u2net | `scripts/remove-bg.sh subject.mp4 out.webm` (transparent) |
| Music-reactive bars | RMS envelope | `python3 scripts/amplitude.py <audio> --out assets/amp.js` |
| **Subtitles (.srt/.vtt)** | from transcript | `python3 scripts/export-subs.py work/transcript.json --out subs` |
| **Translate subs (offline)** | Argos MT | `python3 scripts/translate-subs.py subs.srt --to es` |
| **Normalize loudness** | ffmpeg loudnorm | `scripts/normalize-audio.sh in out [-14]` (−14 LUFS, streaming std) |
| **Color grade / LUT look** | ffmpeg | `scripts/grade.sh in out <teal-orange\|warm\|moody\|vintage\|clean\|vibrant\|bw\|cine>` |
| **Generate music bed** | ffmpeg synth | `scripts/music-bed.sh bed.wav 30 <calm\|warm\|tense\|uplift\|dark>` |
| **SFX pack** | `sfx/*.wav` | whoosh/riser/impact/click/pop/sub-drop/sparkle — layer as extra `<audio>` tracks on motion hits (regen: `scripts/make-sfx.sh`) |
| **Mix voice + music** | ffmpeg duck | `scripts/mix-audio.sh vo.wav music.mp3 master.wav` (auto-ducks music under voice, −14 LUFS) |
| **Voice processing** | broadcast chain | `scripts/voice-process.sh vo-raw.wav vo.wav <house\|warm\|hype\|cinematic>` (HPF→compress→presence→de-ess — makes TTS sound hired, not robotic) |
| **Full A/V mix** | 3-layer | `scripts/mix-av.sh master.wav <dur> --vo vo.wav --music bed.mp3 <gain> --sfx "t:file:gain,…"` (VO + ducked music + SFX-on-hits, SFX duck under VO too, −14 LUFS) |
| **Auto-pick reel hooks** | energy+keywords | `python3 scripts/find-hooks.py audio segments.json --n 12 --len 18` → segments.txt |
| **Verify a render (QA)** | frames + inspect | `scripts/verify.sh render.mp4 [ts,ts,...]` or `scripts/verify.sh --inspect <dir>` |
| **Concatenate clips** | ffmpeg | `scripts/concat.sh out.mp4 a.mp4 b.mp4 ...` |
| **Multi-language subs** | offline MT | `.venv-whisperx/bin/python scripts/multilang-subs.py subs.en.srt --top 30 [--burn video.mp4]` |
| **Batch process** | per-file | `scripts/batch.sh <grade:cine\|youtube\|reel\|thumbnail\|normalize> out_dir files...` |
| **Live preview** | hot-reload | `scripts/preview.sh [project_dir] [port]` (tweak before render) |
| **Graphics overlay** | enrich a clip | `scripts/overlay.sh <base.mp4> <overlay_project> <out.mp4> [start] [fps]` (particles/3D/atmosphere/glass-title → alpha → composite; 4 templates `graphics-overlay*.html`) |
| **Premium finish** | look expensive | `scripts/enrich.sh <in.mp4> <out.mp4> [cine\|teal-orange\|warm\|moody\|clean\|vibrant] [strength] [mblur]` (grade + bloom/glow + grain + vignette + sharpen + optional motion blur). Stack AFTER overlay for rich, non-amateur output. |
| **Data-driven batch** | N videos from data | `python3 scripts/render-batch.py <project> <data.csv\|.json> [--name COL]` — one template + a CSV/JSON → one personalized MP4 per row (uses HyperFrames `--variables`; template = `data-driven-card.html`). See `docs/data-driven.md`. |
| **Scene-sync agent** | lock graphics to VO | `python3 scripts/scene-sync.py <vo.json> <spec.json> --offset <s> --total <s> --out <proj>` → `scenes.js` (`window.__SCENES`). Derives every scene start/end + a `peak` time from the actual spoken words so graphics NEVER lead/lag the voice. The composition reads `__SCENES` and lands each climax (counter end / last bar / donut fill / line draw) on `peak`. |
| **Stock fetch (all media)** | Pixabay | `scripts/pixabay-any.sh <photo\|illustration\|vector\|video\|gif\|3d> "query" out` (visual, stock-scout) · `scripts/music-fetch-any.sh "query" out.mp3` + `scripts/pixabay-sfx.sh "query" out.mp3` (audio, audio-engineer). Search first: `scripts/pixabay-search.sh <type> "query" --n=10`. Key in `.env.pixabay`. All commercial-OK; writes `<out>.license.json`. |
| **Reference research** | Pinterest/Dribbble/Vimeo | `scripts/{pinterest,dribbble,vimeo}-moodboard.sh "query" out/` — contact sheet + palette for art-direction. REFERENCE ONLY, never used as deliverable assets. |
| **Audio QA gate** | mix check | `scripts/qa-audio.sh <file>` → PASS/FAIL on −14 LUFS, true-peak/clipping, silences. |
| **Visual QA gate** | frame check | `python3 scripts/qa-frames.py <video> --scenes scenes.json` → frames+manifest extracted ONCE by the Director; then `qa-correctness` (broken-output) and `qa-richness` (density/motion) read the SAME manifest in parallel. |
| **License gate** | pre-ship audit | `scripts/license-audit.sh projects/<name>` → `work/license-manifest.json`; `license-auditor` agent blocks delivery on any asset missing a valid `.license.json`. |
| **Thumbnail (designed)** | template | render `templates/thumbnail.html` → grab frame 1 |
| **Animated icons** | Lottie | `templates/lottie-overlay.html` + a `.json` from lottiefiles.com |

**Captions — ALWAYS use the caption agent `scripts/caption.py`.** It is the canonical, tested path.
**Pass `--content`** (this is proven by side-by-side testing, do not second-guess it):
- **`--content music`** (songs/singing) → uses **small.pt** — perfect *perceived* timing on sung vocals.
- **`--content speech`** (talking/UGC/explainer/narration) → uses **whisperX** — far tighter on speech.
The agent also handles: no lead/lag, continuous display, collapses repeated words, z-index above video,
41-language whisperX + small.pt fallback.
Do NOT hand-roll caption timing or re-introduce a lead offset — that's what caused repeated
sync bugs. One command:
`python3 scripts/caption.py MEDIA --lang xx --style word|line|karaoke --out projects/<name>` → writes
`captions.js`; in the composition add `<script src="captions.js"></script>` then
`window.mountCaptions(tl, {suppress:[[a,b]]})`. See `prompts/captions.md`. For visual *looks*
beyond the agent's defaults, `docs/caption-styles.md` has 6 styles.
- **`--style karaoke`** = paginated lines with the ACTIVE word highlighted as spoken (Submagic/
  Hormozi/TikTok). Use **`--preset`** for famous looks: `hormozi` (green active + black stroke,
  the benchmark), `beast`, `pill` (springy yellow pill), `neon`, `gradient`, `minimal`, `tiktok`
  (black bar). Or roll your own: `--box "#hex"` (springy pill) / `--hl "#hex"` (active color),
  `--maxwords N`. Best for short-form speech (`--content speech`). See `docs/caption-styles.md`.

**RICHNESS — every motion-graphics video MUST use `templates/lib/richness.js` (`Rich`). READ `docs/richness.md`.**
The difference between "rich" and "AI-template" is density + motion + texture, NOT the engine. The
style (`presets/styles.md`) sets color/font; **Rich sets density/motion/texture** — use both, always.
`cp templates/lib/richness.js projects/<name>/richness.js`, `Rich.css()` once, then per scene:
**(1) NEVER STATIC** — `Rich.idle(wrap, tl, s, e)` keeps content breathing (GSAP's default is pop-then-
freeze; a dead-still frame reads as broken). **(2) TEXTURE** every bg — `Rich.texture(scene,'dots'|'grain'|
'stripes'|'glow')`, never a flat fill. **(3) LAYER ≥5** — eyebrow + counter + hero + support + sticker
(`Rich.eyebrow/counter/sticker/stamp`). **(4) DEPTH** — `.r-shadow2` stacked shadows. **(5) CHOREOGRAPH** —
`Rich.cascade`/`Rich.enter` (per-element delay+ease+rotation, not pop-all-together). **(6) HERO SCALE** —
one oversized number/headline per scene. This applies to ALL 12 styles and every video type.

**Charts/data-graphics — use the tested `templates/lib/charts.js` (XChart), never hand-roll.**
`cp templates/lib/charts.js projects/<name>/charts.js`, then `XChart.counter/bar/donut/line(el, data,
tl, scene)`. It injects its own CSS, renders correct DOM/SVG, and lands the climax on `scene.peak`.
Every recurring chart bug (donut showing a full ring instead of N%, value labels flashing before
bars grow, climax off the spoken word) is fixed once in the library. See `docs/charts.md`.

**Narrated motion graphics — graphics MUST sync to the voice (use `scripts/scene-sync.py`).**
Never hand-time scenes by eye — that causes graphics to appear before/after the words or climaxes
to land off the spoken number. Instead: transcribe the VO (word level), write a scene spec (each
scene anchored to a spoken phrase + a `peak` word), run `scene-sync` → `scenes.js`, and have the
composition read `window.__SCENES` and land every climax (counter end, last bar, donut fill, line
draw) on `peak`. Scenes are auto-contiguous so nothing overlaps or gaps. This is the scene
equivalent of the caption agent. **Progress/timeline bars are opt-in, not default** — only add a
bottom progress bar if the user asks for one.

**Brand kits:** if a `brand.json` (or `brands/<name>.json`, see `brand.example.json`) exists, READ
it first and apply its colors/fonts/logo/tone to every composition for that client.

**Subtitle the deliverable:** for talking videos, also export `.srt` so YouTube captions are
selectable/searchable (SEO + accessibility). Normalize loudness on final audio for consistent volume.

Transcription language rule: model **small** (base hallucinates; never `*.en` for non-English).
Known non-English → `--lang <code>`. Captions stay in source language unless asked to translate/romanize.
**Default caption language = English.**

---

## NON-NEGOTIABLE rules (hard-won — don't relitigate)

- Whisper model = **small**, not base.
- **Pre-render caption/animated text into the DOM**, then animate the existing spans. NEVER create
  elements inside `tl.call()` then target them — GSAP resolves selectors at construction time and
  finds nothing → the element appears but its animation is a SILENT no-op (lint stays 0/0; only frame
  inspection or `scripts/hf-guard.sh` catches it — run hf-guard before every render).
- **No `Math.random()` / `Date.now()` / network fetches** in compositions (deterministic renderer).
- **Finite GSAP repeats only** — `repeat: -1` breaks rendering. Use `Math.floor(total/cycle)-1`.
- **Scope every GSAP selector**: `Q = s => '[data-composition-id="main"] ' + s`.
- **Local fonts only** (`@font-face` → `assets/fonts/*.ttf`). Google Fonts `<link>` fails in
  sandbox renders. The repo ships a **~73-family design library** (`assets/fonts/`, named
  `<slug>-<weight>.ttf`) — see **`docs/FONTS.md`** for the catalog, "pick by job" table, and
  pairing cheat sheet. Choose fonts that fit the brief; don't default to Inter every time.
  Top up the library anytime with `python3 scripts/download-fonts.py`.
- **Source video on a track**: `<video class="clip" muted playsinline>` + separate
  `<audio data-track-index>`. Re-encode sources with dense keyframes first if render warns:
  `ffmpeg -i in.mp4 -c:v libx264 -r 30 -g 30 -keyint_min 30 -movflags +faststart -crf 18 -c:a aac out.mp4`
- **Always run the acceptance loop** (top of this file / `docs/qa-protocol.md`) before declaring
  done. Read the frames; verify every criterion; loop until all pass. One-pass delivery is a bug.

## House caption / type style (default look — override on request)

- Lyrics/social captions: **Poppins Bold**, ALL CAPS, pure white, word-by-word blur-clear reveal
  (in: opacity0→1, y22→0, scale.96→1, blur6→0, .65s, stagger .06, power3.out; out: →0, y-14, blur4,
  .5s, stagger .03, power2.in). Split long lines into two sequential one-liners.
- UI/data: Inter. Editorial: Instrument Serif italic. Code/mono: JetBrains Mono.
- Music bars: 7 white pills, instrumental gaps ≥3s only, read `window.__AMP` @100ms, offsets
  `[0,2,4,6,4,2,0]`, `scaleY=0.12+min(1,amp)*1.35`.

## Encoding / delivery specs

- **YouTube 16:9**: 1920×1080, H.264 High@4.2, yuv420p, 2s GOP, AAC 320k/48k, `+faststart`
  → `scripts/encode-youtube.sh in.mp4 out.mp4 "TITLE"`.
- **Shorts / Reels / TikTok / Pinterest 9:16**: 1080×1920, AAC 256k, 15–30s.
- **Square (IG feed)**: 1080×1080. **Story**: 1080×1920.
- **GIF**: see recipe `to-gif`.
- Cut a vertical master into N reels: `scripts/cut-reels.sh master.mp4 segments.txt out_dir`.
- Thumbnail/poster: `scripts/thumbnail.sh video.mp4 <ts> out.jpg`.

## Session memory — `project.md` (use it)

Each project keeps a `projects/<name>/project.md` (template: `templates/project.md`). At the START
of working on an existing project, READ its `project.md` to continue where the last session left
off — the brief, chosen style/voice/fonts, acceptance criteria, status, and outputs. UPDATE it
after meaningful changes (decisions made, status ticked, outputs produced). This persists context
across chats and machines so you never re-derive what was already decided.

## Per-project layout
```
projects/<name>/
  index.html         # HyperFrames composition (if motion-graphics involved)
  assets/            # media, amp.js, fonts
  work/              # transcripts, intermediate files, verification frames (gitignored)
  renders/           # output mp4/png/gif (gitignored)
```

## Prompts library (`prompts/`)
- `edit-video.md` — general "edit this video [do X]".
- `edit-image.md` — general "edit/convert/compose this image".
- `motion-graphics.md` — "make a [title card / promo / explainer / data-viz / intro] about X".
- `captioned-video.md` — add captions/lyrics/graphics onto any video.
- `lyric-video.md` — image + audio → lyric video + thumbnail + reels.

Read the relevant one, fill the INPUTS, follow it. If a request blends pillars, combine workflows.
