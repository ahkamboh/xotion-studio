# The xotion agent team — prompt → finished edit, mistake-free

Goal: you give a prompt + files, the team produces a finished, **self-verified** video. Each agent
owns one job and has a strict **definition of done**; QA agents **gate delivery** — nothing ships
until it passes. The main session is the **Director** (it reads this file and delegates).

## Org chart
```
                          ┌─────────── DIRECTOR (main session) ───────────┐
                          │  plans · delegates · runs the acceptance loop  │
                          └───────────────────────────────────────────────┘
 PRE-PRODUCTION        PRODUCTION                      QA GATES            DELIVERY
 ─────────────         ──────────                      ────────            ────────
 scriptwriter   ─┐     sync-master ─┐                  proofreader  ─┐     delivery
 art-director   ─┼──►  motion-builder├─► editor ─► colorist ─► qa-visual ─┼──► (ship)
 stock-scout    ─┤     captioner    ─┘                  qa-audio     ─┘
 audio-engineer ─┘
```

## The pipeline (Director runs this every job)
1. **Plan** — parse the prompt: type, format, duration, voice, style. (art-director writes `style.json`.)
2. **Script** — scriptwriter → `work/script.txt` (+ key facts list).
3. **Audio** — audio-engineer → `assets/vo.wav`, `work/vo.json`, ducked `work/master.wav` (self-passes qa-audio).
4. **Stock** — stock-scout → vetted clips in `assets/stock/`.
5. **Sync** — sync-master → `scenes.js` (window.__SCENES with per-scene `peak`).
6. **Motion** — motion-builder → `index.html` (XChart + __SCENES), lint 0 errors → render `overlay.mov`.
7. **Assemble** — editor → montage + composite overlay + mux audio.
8. **Finish** — colorist → `enrich.sh`.
9. **Captions** (if requested) — captioner.
10. **QA GATES (must all pass):** proofreader → qa-audio → qa-visual.
11. **Deliver** — delivery (thumbnail/encode/subs/reels) → copy out + report paths.

## The acceptance loop (this is what makes it mistake-free)
After step 10, if ANY gate fails:
- qa-visual fail → back to **motion-builder / sync-master / editor / colorist** (per the issue) → re-render → re-QA.
- qa-audio fail → back to **audio-engineer** → re-mix → re-QA.
- proofreader fail → fix text/stat → re-render → re-QA.
**Never deliver with an open QA failure.** Loop until clean (cap retries; if stuck, surface the exact blocker to the user).

## Each agent's contract (definition of done) lives in `.claude/agents/<name>.md`
| Agent | Owns | Done when |
|---|---|---|
| scriptwriter | script, hook, length-fit | script.txt fits duration, reads aloud |
| art-director | style/palette/font/format/backdrop | style.json set; consistent |
| stock-scout | vetted b-roll | relevant, watermark-free, ≥1280w, covers scene |
| audio-engineer | VO + music + mix | passes qa-audio; voice clear |
| sync-master | graphics↔voice timing | scenes.js; peaks on spoken words |
| motion-builder | composition + charts | lint clean; XChart + __SCENES; no balls/bar |
| editor | montage/composite/mux/reframe | correct dims/fps/dur; nothing cropped |
| colorist | premium finish | graded, bloom, restrained |
| captioner | synced captions | exact, legible, right language |
| proofreader | text + stat correctness | no typos; stats sane/sourced |
| qa-audio | mix gate | −14±2 LUFS, no clip |
| qa-visual | frame gate | every scene legible/correct/on-time |
| delivery | export + ship | assets out; paths reported |

## Why this reaches "mistake-less"
Every recurring mistake is owned by exactly one agent and caught by a gate:
caption drift → captioner+qa-visual · graphic drift → sync-master · broken charts → motion-builder(XChart) ·
bad mix → audio-engineer+qa-audio · typos/wrong stats → proofreader · cut-off/illegible text → qa-visual ·
mismatched/watermarked b-roll → stock-scout · crop on reframe → editor. The Director won't ship until all pass.
