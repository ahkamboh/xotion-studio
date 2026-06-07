# The xotion agent team — prompt → finished edit, mistake-free

Goal: you give a prompt + files, the team produces a finished, **self-verified** video. Each agent
owns one job and has a strict **definition of done**; QA agents **gate delivery** — nothing ships
until it passes. The main session is the **Director** (it reads this file and `CLAUDE.md`, plans
the job, and delegates). Specialists never re-plan — they execute one step and report back.

## Org chart
```
                          ┌─────────── DIRECTOR (main session) ───────────┐
                          │  plans · delegates · runs the acceptance loop  │
                          │  owns Steps 1–5 + Step 7 of the 7-step loop    │
                          └───────────────────────────────────────────────┘
 PRE-PRODUCTION        PRODUCTION                              QA GATES (∥)         DELIVERY
 ─────────────         ──────────                              ────────────         ────────
 scriptwriter ──┐      sync-master ─► b-roll ─►               qa-correctness ─┐    delivery
 art-director ──┘ ║    motion-builder ─► assembler ─►         qa-richness    ─┤    (Stage A ∥)
 ──FAN-OUT 1──         audio-engineer(SFX pass) ─►            qa-audio       ─┼──► (ship)
 stock-scout  ──┐      captioner ─► colorist                  license-auditor ┘
 audio-engineer ┘ ║                                            ▲ all 4 read ONE qa-frames manifest
 ──FAN-OUT 2──
```
**Fan-out for speed:** FAN-OUT 1 (art-director ∥ scriptwriter), FAN-OUT 2 (audio-engineer ∥
stock-scout), and the four QA gates all run in parallel against one `qa-frames.py` manifest the
Director extracts once. See `CLAUDE.md` for the full diagram + FAIL routing.

## The pipeline (Director runs this every job)
1. **Plan** — parse the prompt: type, format, duration, voice, style. **Motion graphics? → motion-director FIRST:** classify the archetype, lock the coherent kit into `work/style.json → kit` (fonts/type-anim/color/transitions/music-query/SFX-map/voice/hook/ending) per `presets/motion-kits.md`. Everything below reads the kit.
2. **FAN-OUT 1 (∥)** — art-director → `work/style.json` ∥ scriptwriter → `work/script.txt` (+ key facts). (Script needs only duration, not palette — run them concurrently.)
3. **FAN-OUT 2 (∥)** — audio-engineer → `assets/vo.wav`, `work/vo.json`, music+SFX, beat grid `work/beats.json`, ducked `work/master.wav` (self-passes qa-audio) ∥ stock-scout → vetted VISUAL assets in `assets/stock/`, `assets/img/`, `assets/3d/`.
4. **Sync** — sync-master → `scenes.js` (window.__SCENES with per-scene `peak`) — canonical scene boundaries from the voice; runs FIRST before any beat layering.
5. **B-roll plan** (if cutaways) — b-roll → `work/broll-plan.json` (clips + windows + filter_complex) — DATA only, no index.html writes.
6. **Motion** — motion-builder → `index.html` (XChart + __SCENES + 3D GLTFLoader + read broll-plan.windows→BROLL_WINDOWS + read beats.json→snap aux tweens), emit `work/motion-hits.json`, lint 0 → render `overlay.mov`.
7. **SFX pass** — audio-engineer reads `work/motion-hits.json`, layers SFX on the exact visual hits, re-masters.
8. **Assemble** — assembler → montage + composite overlay + mux audio + b-roll cutaways.
9. **Finish** — colorist → `enrich.sh`. **Captions** (if requested) — captioner.
10. **Director extracts frames ONCE** — `scripts/qa-frames.py` → `work/qa-frames-manifest.json`.
11. **QA GATES — FAN-OUT 3 (∥, all read the one manifest):** qa-correctness · qa-richness · qa-audio · license-auditor. All four must PASS.
12. **Deliver** — delivery (Stage A parallel: thumbnail + encode + subs + reels; Stage B: multilang after subs) → copy out + report paths.

## The acceptance loop (this is what makes it mistake-free)
After step 11, if ANY gate fails:
- qa-correctness fail → back to **motion-builder / sync-master / assembler / colorist** (per the issue) → re-render → re-QA.
- qa-richness fail → **density/motion** to **motion-builder**; **theme-coherence** routed BY the asset's `decision` (make→motion-builder · fetch→stock-scout, then Director→art-director if unfetchable · b-roll clip→b-roll · use-as-is/brand→exempt) → re-render → re-QA.
- stock-scout asset-sourcing blocker (2 passes, no theme-fit) → **Director** (reads `work/stock-blockers.json`) → relays to **art-director** to flip `decision→make` or revise the plan. Bounds the re-source loop.
- qa-audio fail → back to **audio-engineer** → re-mix → re-QA.
- license-auditor fail → **Director** surfaces the missing asset path → stock-scout / audio-engineer re-fetches with a valid license → re-QA.
- Director's Step-7 review fail (style/decoration/plan mismatch) → fix at the planning level → re-execute → re-QA.

**Never deliver with an open QA failure.** Loop until clean (cap retries; if stuck, surface the exact blocker to the user).

## Each agent's contract (definition of done) lives in `.claude/agents/<name>.md`
| Agent | Owns | Done when |
|---|---|---|
| motion-director | classify archetype → lock the coherent kit (motion graphics) | work/style.json has a complete `kit` |
| scriptwriter | script, hook, length-fit | script.txt fits duration, reads aloud |
| art-director | propose style/palette/font/format/backdrop in style.json (+ moodboard research) | style.json complete |
| stock-scout | vetted VISUAL stock (photo/illustration/vector/video/gif/3d) | relevant, watermark-free, covers scene; license.json written |
| audio-engineer | VO + music + SFX + mix + beat grid | passes qa-audio; voice clear; beats.json emitted (scene timing untouched) |
| sync-master | graphics↔voice timing (canonical scene boundaries) | scenes.js; peaks on spoken words |
| b-roll | cutaway PLAN (data only) | broll-plan.json with clips+windows+filter_complex; no index.html writes |
| motion-builder | composition + charts + 3D + sole writer of index.html | lint clean; XChart + __SCENES; GLTFLoader; motion-hits.json emitted |
| assembler | ffmpeg montage/composite/mux/reframe | correct dims/fps/dur; nothing cropped |
| colorist | premium finish | graded, bloom, restrained |
| captioner | synced captions | exact, legible, right language |
| qa-correctness | broken-output gate | no cut-off/black/overlap/miscenter/off-beat |
| qa-richness | density + motion gate | contrast/layers/hero-scale/two-beat/not-static |
| qa-audio | mix gate | −14±2 LUFS, no clip |
| license-auditor | pre-ship legal gate | every asset has a valid .license.json |
| delivery | export + ship (parallel Stage A) | assets out; paths reported |

## Why this reaches "mistake-less"
Every recurring mistake is owned by exactly one agent and caught by a gate:
caption drift → captioner+qa-correctness · graphic drift → sync-master · broken charts → motion-builder(XChart) ·
bad mix → audio-engineer+qa-audio · flat/static/thin scene → qa-richness → motion-builder · typos/wrong stats → Director's Step-7 review ·
cut-off/illegible text → qa-correctness · b-roll edge leak → b-roll · unlicensed asset → license-auditor ·
mismatched/watermarked stock → stock-scout · crop on reframe → assembler. The Director won't ship until all four gates pass.
