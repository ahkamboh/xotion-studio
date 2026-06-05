# Job prompt — Stat Explainer (rich editorial motion graphics, ANY topic)

> Produces a 6-scene vertical (1080×1920) data-journalism explainer with the
> "rich" editorial look — the Editorial Brutalist or Warm Documentary style.
> Works for **any topic** that can be framed as *2–3 numbers + a takeaway*.

## Use it

```
:stat <topic>                      # auto: research → 3 stats → script → render
:stat <topic> =style=documentary   # force Warm Documentary look
:stat <topic> =style=brutalist     # force Editorial Brutalist look
:stat @data.csv                    # build from your own numbers
```

Examples:
```
:stat the real cost of scaling an AI product
:stat how much energy AI data centers use, documentary style, female VO
:stat Elon Musk's companies by valuation
:stat the decline of local news 2000–2025
```

## What the agent does (pipeline)

1. **scriptwriter** — frame the topic as a **6-beat arc**:
   `title → stat A → stat B → tension/comparison → synthesis stack → takeaway`.
   Pull 2–3 **real, dated, sourced** numbers (web or the provided CSV). If a number
   can't be confirmed, mark it `[UNVERIFIED]` — never invent and present as fact.
2. **art-director** — pick the style (default: Editorial Brutalist for AI/tech/data;
   Warm Documentary for founder/announcement/calm). Enforce the **Richness checklist**
   (see `.claude/agents/art-director.md`).
3. **motion-builder** — fill the `DATA` object in
   `templates/stat-explainer-vertical.html`. **Only fill DATA — never touch layout.**
4. **audio-engineer** — TTS voiceover in **two-beat cadence**: say the *label* when it
   lands, the *number* when it counts. Music bed: cinematic-editorial (brutalist) or
   warm-ambient (documentary), ducked under VO.
5. **sync-master** — lock each scene's reveal to the VO word (the value graphic fires on
   the figure word). Zero drift.
6. **qa-visual + qa-audio** — gate on the richness rules + legibility + loudness.
   Reject & re-render on any failure.
7. **delivery** — render MP4 via HyperFrames, ship.

## The DATA contract (what motion-builder fills)

```js
const DATA = {
  theme: "editorial-brutalist" | "warm-documentary",
  brand: "FIELD NOTES", issue: "015", year: "2026",
  title: { eyebrow, lines:[l1,l2,l3], subtitle },      // last line auto-italic accent
  stats: [                                              // scenes 2 & 3
    { eyebrow, label, prefix, from, to, suffix, caption, stamp|null }
  ],
  comparison: {                                         // scene 4 (dark)
    eyebrow, label, beforeCap, beforeVal, afterCap, afterFrom, afterTo, pct, shrink, caption
  },
  stack: { eyebrow, head:[l1,l2], rows:[{name,tag,value}] },   // scene 5
  takeaway: { lineA, lineB, signoff }                  // scene 6
};
```

Plus `SCENES[]` timings — stretch each to fit its VO line (keep 4–6s/scene).

## Rules that make it "rich" (motion-builder MUST hold)

1. **Type contrast ≥ 8:1** — giant italic serif number vs tiny wide mono label.
2. **Accent on ≤1 element per scene** — the number OR one word, never both-and-more.
3. **Magazine chrome on every scene** — brand mark, `0X/06` counter, hairline, year.
4. **tabular-nums on counters; italic only on the one accent word.**
5. **Textured background** — grain + vignette + glow. Never flat.
6. **Two-beat reveal** — label, then value ~0.5s later, VO-synced.
7. **One ease personality per video, varied within each scene.**

## Topic → arc cheatsheet

| Topic shape | Stat A | Stat B | Tension (scene 4) | Takeaway |
|---|---|---|---|---|
| "cost of X" | the headline cost | a multiplier | before/after cut | the lesson |
| "rise of X" | adoption number | growth rate | old vs new | what it means |
| "decline of X" | peak number | current number | then vs now | the warning |
| "X by the numbers" | biggest metric | surprising metric | comparison | the punchline |

If a topic only has ONE strong number, drop scene 3 and stretch the others;
if it has 4+, use the stack (scene 5) to carry the extras.
