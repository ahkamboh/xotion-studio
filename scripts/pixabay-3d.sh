#!/usr/bin/env bash
# pixabay-3d.sh — fetch a Pixabay "3D model" turntable sequence (15 PNGs)
# plus a 1-second turntable.mp4 loop.
#
# Pixabay's 3D Models category is rendered-image stock, NOT .glb/.obj source.
# What you get: 15 PNGs around the Y axis + an assembled MP4 loop.
#
#   scripts/pixabay-3d.sh "<query>" <out-dir/>
set -euo pipefail
Q="${1:?usage: pixabay-3d.sh <query> <out-dir/>}"
OUT="${2:?need output dir}"
DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$OUT"
node "$DIR/pixabay-3d-grab.js" "$Q" "$OUT"
