#!/usr/bin/env bash
# Cut a vertical master render into N Shorts/Reels at YouTube Shorts spec.
# Reads a segments file: one "start|duration|hook-label" per line.
#
# Usage: scripts/cut-reels.sh <master.mp4> <segments.txt> <out_dir>
#
# segments.txt example:
#   0.0|17|In the quiet of the night
#   20.5|20|Every shadow / echo of your love
set -euo pipefail
M="$1"; SEGS="$2"; OUT="$3"
mkdir -p "$OUT"
i=0
while IFS='|' read -r start dur hook; do
  [ -z "${start:-}" ] && continue
  i=$((i+1)); n=$(printf "%02d" "$i")
  ffmpeg -y -ss "$start" -i "$M" -t "$dur" \
    -c:v libx264 -profile:v high -level 4.2 -preset medium -crf 19 \
    -b:v 8M -maxrate 12M -bufsize 16M -pix_fmt yuv420p -g 60 -keyint_min 60 -sc_threshold 0 \
    -movflags +faststart -c:a aac -b:a 256k -ar 48000 -ac 2 \
    "$OUT/reel-$n.mp4" -loglevel error
  echo "reel-$n.mp4  (${dur}s)  ->  $hook"
done < "$SEGS"
echo "[cut-reels] $i reels -> $OUT"
