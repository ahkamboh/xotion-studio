#!/usr/bin/env bash
# Text-to-speech voiceover via Kokoro (HyperFrames).
# Usage: scripts/tts.sh "text or path/to/script.txt" [voice] [out.wav] [speed]
# Voices: af_heart af_nova af_sky am_adam am_michael bf_emma bm_george ef_dora jf_alpha ...
#   (first letter = language: a=US en, b=UK en, e=es, f=fr, h=hi, i=it, j=ja, p=pt, z=zh)
set -euo pipefail
TEXT="${1:?usage: scripts/tts.sh \"text\" [voice] [out.wav] [speed]}"
VOICE="${2:-af_nova}"; OUT="${3:-narration.wav}"; SPEED="${4:-1.0}"
npx -y hyperframes tts "$TEXT" --voice "$VOICE" --output "$OUT" --speed "$SPEED"
echo "[tts] $VOICE @ ${SPEED}x -> $OUT"
