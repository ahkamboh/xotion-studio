#!/usr/bin/env bash
# pixabay-gif.sh — fetch an animated GIF from Pixabay.
#   scripts/pixabay-gif.sh "<query>" <out.gif>
set -euo pipefail
Q="${1:?usage: pixabay-gif.sh <query> <out.gif>}"
OUT="${2:?need output path}"
DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$(dirname "$OUT")"
node "$DIR/pixabay-gif-grab.js" "$Q" "$OUT"
