#!/usr/bin/env bash
# QA a render: extract frames at given timestamps (or evenly) for the agent to Read,
# and optionally run HyperFrames visual inspect on a project.
# Usage:
#   scripts/verify.sh <render.mp4> [ts1,ts2,...]          # frames at timestamps
#   scripts/verify.sh <render.mp4>                         # 5 evenly-spaced frames
#   scripts/verify.sh --inspect <project_dir>             # hyperframes inspect
set -euo pipefail
if [ "${1:-}" = "--inspect" ]; then
  cd "$2"; npx -y hyperframes inspect --json; exit 0
fi
IN="$1"; TS="${2:-}"
OUTDIR="$(dirname "$IN")/../work"; mkdir -p "$OUTDIR"
DUR=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 "$IN")
if [ -z "$TS" ]; then
  TS=$(awk -v d="$DUR" 'BEGIN{for(i=1;i<=5;i++) printf "%.1f%s", d*i/6, (i<5?",":"")}')
fi
i=0; IFS=','; for t in $TS; do
  i=$((i+1)); out="$OUTDIR/verify_$(printf '%02d' $i)_${t}s.jpg"
  ffmpeg -y -ss "$t" -i "$IN" -frames:v 1 -vf scale=640:-1 "$out" -loglevel error
  echo "$out"
done
echo "[verify] $i frames in $OUTDIR/ — Read them to confirm the render."
