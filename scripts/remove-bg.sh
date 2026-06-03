#!/usr/bin/env bash
# Remove background from a video or image (u2net via HyperFrames) -> transparent overlay.
# Usage: scripts/remove-bg.sh <subject.mp4|.jpg> [out.webm|.png]
#   video -> .webm (VP9 alpha) by default; image -> .png
set -euo pipefail
IN="${1:?usage: scripts/remove-bg.sh <subject> [out]}"
case "$IN" in
  *.jpg|*.jpeg|*.png|*.webp) DEF="cutout.png" ;;
  *) DEF="transparent.webm" ;;
esac
OUT="${2:-$DEF}"
npx -y hyperframes remove-background "$IN" -o "$OUT"
echo "[remove-bg] $IN -> $OUT"
