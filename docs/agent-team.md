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
 PRE-PRODUCTION        PRODUCTION                                  QA GATES        DELIVERY
 ─────────────         ──────────                                  ────────        ────────
 scriptwriter   ─┐     sync-master ─┐                              qa-visual ─┐    delivery
 art-director   ─┼──►  motion-builder ├─► assembler ─► colorist ─►            ├──► (ship)
 stock-scout    ─┤     captioner    ─┤                              qa-audio  ─┘
 audio-engineer ─┘     b-roll       ─┘
```

## The pipeline (Director runs this every job)
1. **Plan** — parse the prompt: type, format, duration, voice, style. (art-director writes `style.json`.)
2. **Script** — scriptwriter → `work/script.txt` (+ key facts list).
3. **Audio** — audio-engineer → `assets/vo.wav`, `work/vo.json`, ducked `work/master.wav` (self-passes qa-audio).
4. **Stock** — stock-scout → vetted clips in `assets/stock/`.
5. **Sync** — sync-master → `scenes.js` (window.__SCENES with per-scene `peak`).
6. **B-roll plan** (if cutaways needed) — b-roll → `work/broll-plan.json` + `BROLL_WINDOWS`.
7. **Motion** — motion-builder → `index.html` (XChart + __SCENES), lint 0 errors → render `overlay.mov`.
8. **Assemble** — assembler → montage + composite overlay + mux audio + b-roll cutaways.
9. **Finish** — colorist → `enrich.sh`.
10. **Captions** (if requested) — captioner.
11. **QA GATES (must all pass):** qa-audio → qa-visual.
12. **Deliver** — delivery (thumbnail/encode/subs/reels) → copy out + report paths.

## The acceptance loop (this is what makes it mistake-free)
After step 11, if ANY gate fails:
- qa-visual fail → back to **motion-builder / sync-master / assembler / colorist / b-roll** (per the issue) → re-render → re-QA.
- qa-audio fail → back to **audio-engineer** → re-mix → re-QA.
- Director's Step-7 review fail (style/decoration/plan mismatch) → fix at the planning level → re-execute → re-QA.

**Never deliver with an open QA failure.** Loop until clean (cap retries; if stuck, surface the exact blocker to the user).

## Each agent's contract (definition of done) lives in `.claude/agents/<name>.md`
| Agent | Owns | Done when |
|---|---|---|
| scriptwriter | script, hook, length-fit | script.txt fits duration, reads aloud |
| art-director | propose style/palette/font/format/backdrop in style.json | style.json complete |
| stock-scout | vetted b-roll | relevant, watermark-free, ≥1280w, covers scene |
| audio-engineer | VO + music + mix | passes qa-audio; voice clear |
| sync-master | graphics↔voice timing | scenes.js; peaks on spoken words |
| b-roll | clean cutaway boundaries | full-screen cutaways; no graphics on b-roll; aligned to spoken beats |
| motion-builder | composition + charts | lint clean; XChart + __SCENES; no balls/bar |
| assembler | ffmpeg montage/composite/mux/reframe | correct dims/fps/dur; nothing cropped |
| colorist | premium finish | graded, bloom, restrained |
| captioner | synced captions | exact, legible, right language |
| qa-audio | mix gate | −14±2 LUFS, no clip |
| qa-visual | frame gate | every scene legible/correct/on-time |
| delivery | export + ship | assets out; paths reported |

## Why this reaches "mistake-less"
Every recurring mistake is owned by exactly one agent and caught by a gate:
caption drift → captioner+qa-visual · graphic drift → sync-master · broken charts → motion-builder(XChart) ·
bad mix → audio-engineer+qa-audio · typos/wrong stats → Director's Step-7 review · cut-off/illegible text → qa-visual · b-roll edge leak → b-roll ·
mismatched/watermarked b-roll → stock-scout · crop on reframe → assembler. The Director won't ship until all pass.
