# Acceptance Loop — the built-in QA agent (MANDATORY)

Every job runs through this self-verification loop. **Do not deliver until it passes.** You are
your own reviewer: build → verify → compare against the user's requirements → fix → re-verify,
looping until every criterion is met. Only then tell the user it's ready.

## Step 0 — Write the acceptance criteria (before building)

Turn the user's request into an explicit, checkable list. Be concrete. Example for
"add captions to my clip in Urdu, blue brand, 9:16":

```
ACCEPTANCE CRITERIA
[ ] Output is 1080x1920, 30fps, duration == source (±0.5s)
[ ] Captions present for the whole spoken section, synced to the audio
[ ] Captions are in Urdu (correct script, not romanized)
[ ] Brand blue (#xxxxxx) used for highlights; legible on the footage
[ ] No caption overflows the frame or overlaps the speaker's face
[ ] Audio intact and normalized; faststart enabled
[ ] Every explicit user instruction honored (list them individually)
```

Keep this list visible. It is the definition of "done" — not your own taste.

## Step 1 — Build
Produce the composition / edit per the workflow in CLAUDE.md.

## Step 2 — Mechanical gate
```
scripts/qa.sh <render.mp4> --w W --h H --fps 30 --dur D --project projects/<name>
```
This checks: file exists, exact resolution/fps/duration, not blank/black, lint 0 errors,
HyperFrames visual inspect (text overflow), and extracts `qa_*.jpg` frames.
Mechanical gate must be **PASS**. If FAIL → fix the cause, rebuild, re-run.

## Step 3 — Visual acceptance review
**Read every `qa_*.jpg` frame.** Walk the criteria list one by one and mark each ✓ or ✗ from
what you actually SEE — not from what you intended. For timed/animated content, sample frames
inside each key moment (caption entrance, brand reveal, the hook, the exit). Specifically confirm:
- Text is present, correct, spelled right, in the right language, fully on-screen.
- Animations actually fired (not stuck invisible — the classic pre-render-spans bug).
- Colors/fonts/logo match the brand or the request.
- Nothing overlaps badly; safe zones respected for Shorts (avoid bottom ~15% UI band).
- Audio: spot-check it exists and is normalized.

## Step 4 — Loop
For each ✗: diagnose the root cause, fix the composition/edit, rebuild, and **re-run Steps 2–3**.
Repeat until **all criteria are ✓ and mechanical gate is PASS**. Don't stop at "close enough."

## Step 5 — Deliver decision
- **All ✓ → deliver.** Show the output path + a short report: each criterion with ✓, the final
  specs, and any variant outputs (reels, thumbnail, subs).
- **A criterion is genuinely unachievable** (e.g. source audio too noisy to transcribe a word,
  a request that conflicts with itself) → do NOT silently ship. Deliver what works, clearly flag
  the unmet item, explain why, and offer the options to resolve it.
- **Never** declare done on a criterion you couldn't visually verify.

## Anti-patterns (these = not done)
- "Rendered successfully" ≠ verified. A clean render can still have invisible captions.
- Lint 0/0 ≠ correct. Lint can't see wrong lyrics, wrong language, or off-brand color.
- Shipping after one pass without reading frames.
- Marking a criterion ✓ from intent instead of from the actual frame.

## Quick invocation
Use `prompts/qa-review.md` to run this loop explicitly on an existing render, or just follow it
automatically at the end of any build (it's mandatory regardless).
