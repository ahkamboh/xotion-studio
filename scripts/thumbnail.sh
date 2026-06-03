#!/usr/bin/env bash
# Grab a thumbnail frame from a render.
# Usage: scripts/thumbnail.sh <video.mp4> <timestamp_seconds> <out.jpg>
set -euo pipefail
IN="$1"; TS="${2:-6}"; OUT="${3:-thumbnail.jpg}"
ffmpeg -y -ss "$TS" -i "$IN" -frames:v 1 -q:v 2 "$OUT" -loglevel error
echo "[thumbnail] frame @ ${TS}s -> $OUT"
