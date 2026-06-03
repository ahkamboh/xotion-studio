#!/usr/bin/env bash
# Apply a named cinematic color grade to a video or image (ffmpeg, no LUT files needed).
# Usage: scripts/grade.sh <in> <out> <preset>
# Presets: teal-orange | warm | cool | moody | vintage | clean | bw | vibrant | cine
set -euo pipefail
IN="$1"; OUT="$2"; P="${3:-clean}"
case "$P" in
  teal-orange) VF="curves=preset=increase_contrast,colorbalance=rs=.06:gs=.0:bs=-.06:rm=.04:bm=-.04:rh=-.04:bh=.06,eq=saturation=1.12" ;;
  warm)        VF="colorbalance=rs=.05:gs=.02:bs=-.06,eq=brightness=.02:saturation=1.1" ;;
  cool)        VF="colorbalance=rs=-.05:gs=.0:bs=.07,eq=saturation=1.05" ;;
  moody)       VF="curves=preset=darker,eq=contrast=1.15:saturation=.85,colorbalance=bs=.05" ;;
  vintage)     VF="curves=r='0/0.1 1/0.9':g='0/0.05 1/0.92':b='0/0.15 1/0.85',eq=saturation=.78:contrast=.95,vignette" ;;
  clean)       VF="eq=brightness=.03:contrast=1.08:saturation=1.12:gamma=1.02" ;;
  vibrant)     VF="eq=saturation=1.35:contrast=1.12:brightness=.02,unsharp=5:5:.6" ;;
  bw)          VF="hue=s=0,eq=contrast=1.18:brightness=.02" ;;
  cine)        VF="curves=preset=increase_contrast,eq=saturation=1.05,vignette=PI/5" ;;
  *) echo "unknown preset: $P (teal-orange|warm|cool|moody|vintage|clean|vibrant|bw|cine)"; exit 1 ;;
esac
case "$IN" in
  *.jpg|*.jpeg|*.png|*.webp) ffmpeg -y -i "$IN" -vf "$VF" "$OUT" -loglevel error ;;
  *) ffmpeg -y -i "$IN" -vf "$VF" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p \
       -movflags +faststart -c:a copy "$OUT" -loglevel error ;;
esac
echo "[grade] $P -> $OUT"
