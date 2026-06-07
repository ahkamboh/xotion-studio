#!/usr/bin/env bash
# qa-attempt.sh — bound the acceptance loop so it can't run forever. Call it at
# the TOP of every QA round; it increments a per-run counter and HARD-STOPS past
# MAX_QA_ATTEMPTS, forcing the Director to surface the blocker to the user
# instead of looping indefinitely.
#
#   scripts/qa-attempt.sh <work-dir>          # bump + check (default max 5)
#   MAX_QA_ATTEMPTS=8 scripts/qa-attempt.sh <work-dir>
#   scripts/qa-attempt.sh <work-dir> --reset  # reset the counter (new job)
#
# Exit 0 = under the cap (proceed). Exit 1 = cap reached (STOP, escalate to user).
set -euo pipefail
WORKDIR="${1:?usage: qa-attempt.sh <work-dir> [--reset]}"
mkdir -p "$WORKDIR"
COUNTER="$WORKDIR/.qa-attempts"
MAX="${MAX_QA_ATTEMPTS:-5}"

if [ "${2:-}" = "--reset" ]; then echo 0 > "$COUNTER"; echo "[qa-attempt] reset"; exit 0; fi

N=0; [ -f "$COUNTER" ] && N=$(cat "$COUNTER" 2>/dev/null || echo 0)
N=$((N + 1))
echo "$N" > "$COUNTER"
if [ "$N" -gt "$MAX" ]; then
  echo "[qa-attempt] ❌ acceptance loop hit the cap ($N > $MAX). STOP — surface the open QA failure to the user; do not keep re-rendering." >&2
  exit 1
fi
echo "[qa-attempt] round $N/$MAX"
