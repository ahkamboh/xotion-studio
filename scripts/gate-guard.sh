#!/usr/bin/env bash
# gate-guard.sh — PreToolUse(Bash) hook. Blocks shipping a rendered .mp4 to a
# delivery destination UNLESS it goes through scripts/deliver.sh (which enforces
# the 4 ship gates). This is the harness-level guarantee that a deliverable
# cannot bypass the gates even if the LLM Director forgets the rule mid-session.
#
# Reads the hook JSON on stdin; exit 0 = allow, exit 2 = block (stderr → model).
set -euo pipefail
INPUT="$(cat)"
CMD="$(printf '%s' "$INPUT" | python3 -c "import json,sys
try:
    d=json.load(sys.stdin); print((d.get('tool_input') or {}).get('command',''))
except Exception:
    print('')" 2>/dev/null || echo '')"

# Already routed through the enforced ship path → always allow.
case "$CMD" in *deliver.sh*) exit 0;; esac

# Block a raw copy/move/rsync of an .mp4 into a delivery destination (Downloads / deliver / output).
if printf '%s' "$CMD" | grep -Eq '(^|[;&| ])(cp|mv|rsync|install)([[:space:]]).*\.mp4.*([Dd]ownloads|/deliver|/output)'; then
  echo "BLOCKED by gate-guard: ship rendered .mp4 via 'scripts/deliver.sh <work-dir> <final.mp4> <dest>'. It refuses unless all 4 ship gates (qa-correctness, qa-richness, qa-audio, license-auditor) wrote status=pass. A direct cp/mv bypasses the gates and is not allowed." >&2
  exit 2
fi
exit 0
