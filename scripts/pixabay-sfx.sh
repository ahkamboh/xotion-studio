#!/usr/bin/env bash
# pixabay-sfx.sh — fetch a sound effect from Pixabay (puppeteer scrape).
#   scripts/pixabay-sfx.sh "<query>" <out.mp3>
set -euo pipefail
Q="${1:?usage: pixabay-sfx.sh <query> <out.mp3>}"
OUT="${2:?need output path}"
DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$(dirname "$OUT")"
node "$DIR/pixabay-search-grab.js" sfx "$Q" "$OUT"
