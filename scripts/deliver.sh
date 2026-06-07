#!/usr/bin/env bash
# deliver.sh — the ONLY sanctioned ship path. CODE-ENFORCES the 4 ship gates:
# it refuses to deliver unless qa-correctness, qa-richness, qa-audio, and
# license-auditor all wrote status=pass into the run's work dir. This makes the
# "all gates must pass before delivery" rule survive the LLM Director forgetting it.
#
#   scripts/deliver.sh <work-dir> <final.mp4> <dest-dir-or-file> [--runid ID]
#
# Exit 0 = delivered (all gates green). Exit 1 = REFUSED (a gate missing/not pass).
set -euo pipefail
WORKDIR="${1:?usage: deliver.sh <work-dir> <final.mp4> <dest> [--runid ID]}"
FINAL="${2:?need final .mp4}"
DEST="${3:?need destination dir or file}"
RUNID=""
[ "${4:-}" = "--runid" ] && RUNID="${5:-}"

[ -f "$FINAL" ] || { echo "[deliver] REFUSED: final not found: $FINAL" >&2; exit 1; }

gate_pass () {  # <file> <human-name>
  local f="$1" name="$2"
  if [ ! -f "$f" ]; then
    echo "[deliver] ✗ gate MISSING: $name ($f)" >&2; return 1
  fi
  if python3 -c "import json,sys;d=json.load(open('$f'));sys.exit(0 if str(d.get('status','')).lower()=='pass' else 1)" 2>/dev/null; then
    echo "[deliver] ✓ $name PASS" >&2; return 0
  fi
  echo "[deliver] ✗ gate NOT PASS: $name ($f)" >&2; return 1
}

FAIL=0
gate_pass "$WORKDIR/qa-correctness.json"   "qa-correctness"  || FAIL=1
gate_pass "$WORKDIR/qa-richness.json"      "qa-richness"     || FAIL=1
gate_pass "$WORKDIR/qa-audio.json"         "qa-audio"        || FAIL=1
gate_pass "$WORKDIR/license-manifest.json" "license-auditor" || FAIL=1
if [ "$FAIL" != 0 ]; then
  echo "[deliver] ❌ REFUSED — not all 4 ship gates are PASS. Fix + re-QA, then re-run." >&2
  exit 1
fi

# All gates green → ship. Stamp the run id into the filename for traceability.
base="$(basename "$FINAL")"
if [ -n "$RUNID" ]; then base="${base%.*}-${RUNID}.${base##*.}"; fi
if [ -d "$DEST" ]; then target="$DEST/$base"; else target="$DEST"; fi
cp "$FINAL" "$target"
echo "[deliver] ✅ all 4 gates PASS → $target"
