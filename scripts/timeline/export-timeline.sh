#!/usr/bin/env bash
# export-timeline.sh — start_export: the ONLY timeline.json -> MP4 path.
#
# Reuses the EXISTING canonical render chain verbatim (no render script modified):
#   1. eval scripts/new-run.sh <project>           -> isolated $WORK / $RENDERS
#   2. compile-timeline.py --out $WORK/build --copy (full asset copy for a portable build)
#   3. scripts/render-with-qa.sh $WORK/build -o $RENDERS/final.mp4
#        (hf-guard gate -> npx hyperframes render -> qa-frames.py -> sanity-strip)
#
# Does NOT bypass the gate/guard. Prints a final JSON line: {runId, index_html, output_mp4}.
#
#   Usage: scripts/timeline/export-timeline.sh <project> [--fps N] [-o out.mp4]
#
set -euo pipefail

PROJ="${1:?usage: export-timeline.sh <project> [--fps N] [-o out.mp4]}"
shift || true

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Parse optional --fps / -o passthrough.
FPS=""
OUT=""
PASS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --fps) FPS="$2"; shift 2;;
    --fps=*) FPS="${1#--fps=}"; shift;;
    -o|--output) OUT="$2"; shift 2;;
    -o=*) OUT="${1#-o=}"; shift;;
    --output=*) OUT="${1#--output=}"; shift;;
    *) PASS+=("$1"); shift;;
  esac
done

# Default fps from timeline.json if not given.
if [ -z "$FPS" ]; then
  FPS="$(python3 - "$PROJ" <<'PY'
import sys, os
sys.path.insert(0, os.path.join(os.environ.get("ROOT","."), "scripts", "timeline"))
sys.path.insert(0, "scripts/timeline")
import timeline_model as tm
try:
    tl = tm.load(sys.argv[1], create=False)
    print(int(tl.get("fps", 30)))
except Exception:
    print(30)
PY
)"
fi

# 1. isolated run dir.
eval "$(ROOT="$ROOT" bash "$ROOT/scripts/new-run.sh" "$PROJ")"
BUILD="$WORK/build"
mkdir -p "$BUILD"

# 2. compile timeline.json -> $WORK/build (full asset copy).
python3 "$ROOT/scripts/timeline/compile-timeline.py" --project "$PROJ" --out "$BUILD" --copy >/dev/null

# 3. canonical render-with-qa on the compiled build dir.
if [ -z "$OUT" ]; then
  OUT="$RENDERS/final.mp4"
fi
bash "$ROOT/scripts/render-with-qa.sh" "$BUILD" -o "$OUT" --fps "$FPS" "${PASS[@]+"${PASS[@]}"}" >&2

# final machine-readable line.
python3 - "$XOTION_RUNID" "$BUILD/index.html" "$OUT" <<'PY'
import json, sys
print(json.dumps({"runId": sys.argv[1], "index_html": sys.argv[2], "output_mp4": sys.argv[3]}))
PY
