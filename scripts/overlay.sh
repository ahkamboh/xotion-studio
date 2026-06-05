#!/usr/bin/env bash
# overlay.sh — render a transparent HyperFrames graphics layer and composite it over a plain video.
# Makes a flat clip graphically rich (particles, kinetic text, shaders, 3D, etc.).
#
#   scripts/overlay.sh <base_video> <overlay_project_dir> <out.mp4> [start_sec] [fps]
#
#   base_video           the plain clip to enrich
#   overlay_project_dir  a HyperFrames project with a TRANSPARENT-background composition
#                        (start from templates/graphics-overlay.html)
#   out.mp4              result
#   start_sec            when the overlay begins on the base timeline (default 0)
#   fps                  render fps (default 30)
#
# The overlay project is rendered to a ProRes 4444 MOV (alpha), then ffmpeg overlays it.
# Determinism: the overlay must use the GSAP timeline and/or the `hf-seek` clock only
# (no Math.random()/Date.now() at render time). See docs/graphics-libraries.md.
set -euo pipefail

BASE="${1:?usage: overlay.sh <base_video> <overlay_project_dir> <out.mp4> [start_sec] [fps]}"
PROJ="${2:?need overlay project dir}"
OUT="${3:?need output path}"
START="${4:-0}"
FPS="${5:-30}"

[ -f "$BASE" ] || { echo "base video not found: $BASE" >&2; exit 1; }
[ -d "$PROJ" ] || { echo "overlay project not found: $PROJ" >&2; exit 1; }

ALPHA="$PROJ/renders/overlay-alpha.mov"
mkdir -p "$PROJ/renders"

echo "[overlay] 1/3 lint"
npx hyperframes lint "$PROJ" || true

echo "[overlay] 2/3 render transparent layer -> $ALPHA"
npx hyperframes render "$PROJ" --format mov --fps "$FPS" --output "$ALPHA"

echo "[overlay] 3/3 composite over $BASE (start ${START}s)"
# Overlay starts at START seconds; audio is taken from the base video untouched.
ffmpeg -y -i "$BASE" -itsoffset "$START" -i "$ALPHA" -filter_complex \
  "[0:v][1:v]overlay=0:0:eof_action=pass:format=auto[v]" \
  -map "[v]" -map 0:a? -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p \
  -movflags +faststart -c:a copy "$OUT"

echo "[overlay] done -> $OUT"
