#!/usr/bin/env bash
# Re-encode a render to YouTube upload spec (1080p, H.264 High, AAC 320k, faststart).
# Usage: scripts/encode-youtube.sh <input.mp4> <output.mp4> ["Title"]
set -euo pipefail
IN="$1"; OUT="$2"; TITLE="${3:-}"
ffmpeg -y -i "$IN" \
  -c:v libx264 -profile:v high -level 4.2 -preset slow -crf 18 \
  -b:v 8M -maxrate 12M -bufsize 16M \
  -pix_fmt yuv420p -g 60 -keyint_min 60 -sc_threshold 0 \
  -movflags +faststart \
  -c:a aac -b:a 320k -ar 48000 -ac 2 \
  ${TITLE:+-metadata title="$TITLE"} \
  "$OUT"
echo "[encode-youtube] -> $OUT"
