#!/usr/bin/env bash
# Concatenate clips, normalizing them to the first clip's resolution/fps (re-encode).
# Usage: scripts/concat.sh <out.mp4> <clip1> <clip2> [clip3 ...]
set -euo pipefail
OUT="${1:?usage: scripts/concat.sh out.mp4 clip1 clip2 ...}"; shift
[ "$#" -ge 2 ] || { echo "need >=2 clips"; exit 1; }

# target = first clip's W,H,fps
read W H < <(ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=p=0:s=" " "$1")
FPS=$(ffprobe -v error -select_streams v -show_entries stream=r_frame_rate -of default=noprint_wrappers=1:nokey=1 "$1" | head -1)

inputs=(); filters=""; i=0
for c in "$@"; do
  inputs+=(-i "$c")
  filters+="[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${FPS}[v${i}];"
  i=$((i+1))
done
vlabels=""; for ((j=0;j<i;j++)); do vlabels+="[v${j}][${j}:a]"; done
ffmpeg -y "${inputs[@]}" -filter_complex "${filters}${vlabels}concat=n=${i}:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p \
  -movflags +faststart -c:a aac -b:a 256k "$OUT"
echo "[concat] $i clips -> $OUT"
