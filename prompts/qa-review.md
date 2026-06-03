# Prompt: QA / Acceptance review

Run the built-in acceptance loop on a render (or re-verify after changes).

```
Run the acceptance loop (docs/qa-protocol.md) on this render.

INPUTS:
- RENDER   = "<path to the mp4>"
- PROJECT  = "<projects/<name>>"      (for lint + inspect; optional)
- CRITERIA = "<the requirements>"      e.g. "1080x1920 30fps, Urdu captions synced,
             brand blue highlights, no overflow, audio normalized, logo on outro"

DO:
1. Restate CRITERIA as an explicit ✓/✗ checklist.
2. scripts/qa.sh RENDER --w W --h H --fps F --dur D --project PROJECT
3. Read every qa_*.jpg frame; mark each criterion ✓/✗ from what you SEE.
4. For each ✗: fix root cause, rebuild, re-run steps 2–3. Loop until all ✓ + mechanical PASS.
5. Deliver only when all ✓. Report each criterion's status, final specs, and output paths.
   If something is genuinely unachievable, flag it explicitly instead of shipping silently.
```
