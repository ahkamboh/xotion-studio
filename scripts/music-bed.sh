#!/usr/bin/env bash
# Generate a royalty-free ambient music bed (synth pad, no external assets).
# Usage: scripts/music-bed.sh <out.wav> <duration_sec> [mood]
# Moods: calm (Am) | warm (C) | tense (Dm) | uplift (G) | dark (Em)
set -euo pipefail
OUT="${1:-bed.wav}"; DUR="${2:-30}"; MOOD="${3:-calm}"
# chord root frequencies (Hz) for a simple triad pad
case "$MOOD" in
  calm)   F1=220.00; F2=261.63; F3=329.63 ;;  # A minor
  warm)   F1=261.63; F2=329.63; F3=392.00 ;;  # C major
  tense)  F1=293.66; F2=349.23; F3=440.00 ;;  # D minor
  uplift) F1=392.00; F2=493.88; F3=587.33 ;;  # G major
  dark)   F1=164.81; F2=196.00; F3=246.94 ;;  # E minor low
  *) echo "unknown mood: $MOOD"; exit 1 ;;
esac
EXPR="0.12*sin(2*PI*${F1}*t)*((1-exp(-t*2))*exp(-t*0.015)) \
+0.09*sin(2*PI*${F2}*t)*((1-exp(-t*2.2))*exp(-t*0.015)) \
+0.07*sin(2*PI*${F3}*t)*((1-exp(-t*1.8))*exp(-t*0.015)) \
+0.05*sin(2*PI*$(echo "$F1/2" | bc -l)*t)*((1-exp(-t*1.5))*exp(-t*0.015))"
ffmpeg -y -f lavfi -i "aevalsrc=${EXPR}:d=${DUR}:s=48000:c=stereo" \
  -af "lowpass=f=2200,aecho=0.8:0.7:60|140:0.4|0.3,afade=t=in:d=2,afade=t=out:st=$((DUR-3)):d=3,volume=0.7" \
  "$OUT" -loglevel error
echo "[music-bed] $MOOD pad, ${DUR}s -> $OUT"
