#!/usr/bin/env bash
# pixabay-music.sh — fetch a music track from Pixabay (puppeteer scrape).
#   scripts/pixabay-music.sh "<query>" <out.mp3>
set -euo pipefail
Q="${1:?usage: pixabay-music.sh <query> <out.mp3>}"
OUT="${2:?need output path}"
DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$(dirname "$OUT")"
node "$DIR/pixabay-search-grab.js" music "$Q" "$OUT"
