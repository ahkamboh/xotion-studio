#!/usr/bin/env bash
# preview-frame.sh — get_preview_frame: render ONE frame of the CURRENT timeline.json.
#
# Flow (read-only w.r.t. timeline.json):
#   1. compile-timeline.py --out projects/<project>/work/preview   (throwaway build; symlinks assets)
#   2. npx hyperframes snapshot work/preview --at <t> --frames 1 --describe false   (offline)
#   3. echo the produced PNG path: work/preview/snapshots/frame-00-at-<t.1>s.png
#
# --describe false disables the Gemini vision step -> fully offline/deterministic, no API key.
# The snapshot filename pattern (frame-00-at-<at.toFixed(1)>s.png) is the EXACT verified hyperframes
# output (confirmed in node_modules/hyperframes/dist/cli.js).
#
#   Usage: scripts/timeline/preview-frame.sh <project> <at-seconds>
#
set -euo pipefail

PROJ="${1:?usage: preview-frame.sh <project> <at-seconds>}"
AT="${2:?usage: preview-frame.sh <project> <at-seconds>}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Resolve project dir (bare name under projects/, or a path).
if [ -d "$ROOT/projects/$PROJ" ]; then
  PROJ_DIR="$ROOT/projects/$PROJ"
elif [ -d "$PROJ" ]; then
  PROJ_DIR="$(cd "$PROJ" && pwd)"
else
  echo "[preview-frame] project not found: $PROJ" >&2
  exit 2
fi

BUILD="$PROJ_DIR/work/preview"
mkdir -p "$BUILD"

# 1. compile the CURRENT timeline.json into the throwaway preview build dir.
python3 "$ROOT/scripts/timeline/compile-timeline.py" --project "$PROJ" --out "$BUILD" >/dev/null

# 2. single-frame snapshot, offline.
( cd "$ROOT" && npx hyperframes snapshot "$BUILD" --at "$AT" --frames 1 --describe false ) >&2

# 3. deterministic filename: frame-00-at-<at.toFixed(1)>s.png
LABEL="$(python3 -c "import sys;print(f'{float(sys.argv[1]):.1f}')" "$AT")"
FRAME="$BUILD/snapshots/frame-00-at-${LABEL}s.png"

if [ ! -f "$FRAME" ]; then
  echo "[preview-frame] expected frame not found: $FRAME" >&2
  # fall back to whatever single PNG landed in snapshots/
  FRAME="$(ls "$BUILD"/snapshots/*.png 2>/dev/null | head -1 || true)"
  [ -n "$FRAME" ] || { echo "[preview-frame] no snapshot produced" >&2; exit 1; }
fi

echo "$FRAME"
