#!/usr/bin/env bash
# key-bg.sh — strip a solid-color background from a still image via ffmpeg colorkey.
# Output is a transparent PNG ready for compositing in HyperFrames / overlays.
#
#   scripts/key-bg.sh <in.jpg|png> <out.png> [hex_color=000000] [similarity=0.30] [blend=0.10]
#
#   hex_color    — bg color to key out, no '#'. Default black.
#                   examples: 000000 (black) · ffffff (white) · 1a1a1a (near-black)
#   similarity   — 0.0–1.0. How close a pixel must be to hex_color to drop. 0.30 = ~30% tolerance.
#                   raise (0.40+) if edges still show the bg, lower (0.15) if it eats too much subject.
#   blend        — 0.0–1.0. Soft-edge feathering. 0.10 is gentle; 0.20+ heavily softens.
#
# Quick rule for product shots (Apple PR on black):
#   scripts/key-bg.sh hero.jpg hero.png 000000 0.30 0.10
#
# For white-bg studio shots:
#   scripts/key-bg.sh shoe.jpg shoe.png ffffff 0.25 0.08
#
# After running, verify in Preview that the bg is checkerboard transparent.
set -euo pipefail
IN="${1:?usage: key-bg.sh <in> <out.png> [hex=000000] [similarity=0.30] [blend=0.10]}"
OUT="${2:?need output .png}"
COLOR="${3:-000000}"
SIM="${4:-0.30}"
BLEND="${5:-0.10}"

[ -f "$IN" ] || { echo "input not found: $IN" >&2; exit 1; }

ffmpeg -y -i "$IN" \
  -vf "colorkey=0x${COLOR}:${SIM}:${BLEND},format=rgba" \
  "$OUT" -loglevel error
echo "[key-bg] $IN → $OUT  (keyed #$COLOR sim=$SIM blend=$BLEND)"
