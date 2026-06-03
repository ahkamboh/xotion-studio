#!/usr/bin/env bash
# Normalize loudness to broadcast/streaming standard (EBU R128, -14 LUFS = YouTube/Spotify target).
# Two-pass loudnorm for accuracy. Works on audio OR video (video stream copied untouched).
# Usage: scripts/normalize-audio.sh <in> <out> [target_LUFS]
set -euo pipefail
IN="$1"; OUT="$2"; I="${3:--14}"
echo "[normalize] pass 1 (measure)..."
MEAS=$(ffmpeg -hide_banner -i "$IN" -af "loudnorm=I=${I}:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 \
  | awk '/"input_i"/,/"output_ta"/' )
get() { echo "$MEAS" | grep "\"$1\"" | sed -E 's/.*: *"?([-0-9.a-z]+)"?,?/\1/'; }
MI=$(get input_i); MTP=$(get input_tp); MLRA=$(get input_lra); MTH=$(get input_thresh)
echo "[normalize] measured I=$MI TP=$MTP LRA=$MLRA"
echo "[normalize] pass 2 (apply -> ${I} LUFS)..."
# detect if input has video
if ffprobe -v error -select_streams v -show_entries stream=codec_type -of csv=p=0 "$IN" | grep -q video; then
  VMAP="-c:v copy"; else VMAP="-vn"; fi
ffmpeg -y -i "$IN" $VMAP \
  -af "loudnorm=I=${I}:TP=-1.5:LRA=11:measured_I=${MI}:measured_TP=${MTP}:measured_LRA=${MLRA}:measured_thresh=${MTH}:linear=true:print_format=summary" \
  -ar 48000 ${VMAP:+-movflags +faststart} "$OUT"
echo "[normalize] -> $OUT"
