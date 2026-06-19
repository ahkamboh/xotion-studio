#!/usr/bin/env bash
# motion-blur.sh — TRUE accumulation motion blur (real shutter, not a smear filter).
#
#   scripts/motion-blur.sh <in.mp4> <out.mp4> [target_fps=24] [samples=3] [shutter=1.0]
#
# How it works: a real camera's motion blur = light accumulated over the shutter window.
# We reproduce it by AVERAGING `samples` sub-frames per output frame.
#   - If the input was rendered at >= target*samples fps (the right way — render high-fps in
#     HyperFrames), we just average consecutive sub-frames down to target fps. Deterministic, exact.
#   - Otherwise we synthesize the missing sub-frames with optical-flow interpolation first.
# `shutter` (0..1) scales how many of the window's sub-frames are blended (1.0 = 360-deg shutter).
set -euo pipefail
IN="${1:?usage: motion-blur.sh <in.mp4> <out.mp4> [target_fps=24] [samples=3] [shutter=1.0]}"
OUT="${2:?need output path}"
TFPS="${3:-24}"
SAMPLES="${4:-3}"
SHUTTER="${5:-1.0}"

# blended frames within the window = round(samples*shutter), clamped to [1,samples]
BLEND=$(python3 -c "print(max(1,min($SAMPLES,round($SAMPLES*$SHUTTER))))")
SRC_FPS=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of default=noprint_wrappers=1:nokey=1 "$IN" | awk -F/ '{ if($2) print $1/$2; else print $1 }')
NEED=$(python3 -c "print($TFPS*$SAMPLES)")
WEIGHTS=$(python3 -c "print(' '.join(['1']*$BLEND))")

echo "[motion-blur] src=${SRC_FPS}fps  target=${TFPS}fps  samples=${SAMPLES}  blend=${BLEND}  (need ${NEED}fps source)"

if python3 -c "exit(0 if $SRC_FPS+0.5 >= $NEED else 1)"; then
  # high-fps source → average `blend` consecutive sub-frames, then decimate to target fps
  VF="tmix=frames=${BLEND}:weights=${WEIGHTS},fps=${TFPS}"
  echo "[motion-blur] accumulation path (exact)"
else
  # low-fps source → synthesize sub-frames with optical flow, then accumulate
  VF="minterpolate=fps=${NEED}:mi_mode=mci:mc_mode=aobmc:vsbmc=1,tmix=frames=${BLEND}:weights=${WEIGHTS},fps=${TFPS}"
  echo "[motion-blur] optical-flow path (synthesized sub-frames)"
fi

# preserve audio if present
HAS_A=$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$IN" | head -1)
if [ -n "$HAS_A" ]; then MAP=(-map 0:v -map 0:a -c:a copy); else MAP=(-map 0:v); fi

ffmpeg -y -i "$IN" -vf "$VF" "${MAP[@]}" -r "$TFPS" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart "$OUT" -loglevel error
echo "[motion-blur] -> $OUT ($(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of default=noprint_wrappers=1:nokey=1 "$OUT"))"
