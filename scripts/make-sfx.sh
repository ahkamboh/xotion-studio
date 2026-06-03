#!/usr/bin/env bash
# Generate a small royalty-free SFX pack (synthesized with ffmpeg, no external assets).
# Usage: scripts/make-sfx.sh [out_dir]   (default: sfx/)
# Produces: whoosh, riser, impact, click, pop, sub-drop, sparkle  (.wav, 48k stereo)
set -euo pipefail
OUT="${1:-sfx}"; mkdir -p "$OUT"
g(){ ffmpeg -y -f lavfi -i "$1" -af "${2:-anull}" -ac 2 -ar 48000 "$OUT/$3" -loglevel error; echo "  $OUT/$3"; }

echo "[sfx] generating pack -> $OUT/"
# whoosh: white noise swept by a moving bandpass, quick in/out
g "anoisesrc=color=white:d=0.6:a=0.5" "highpass=f=400,lowpass=f=4000,afade=t=in:d=0.15,afade=t=out:st=0.3:d=0.3,volume=0.9" "whoosh.wav"
# riser: rising tone over 1.2s building tension
g "aevalsrc='0.3*sin(2*PI*(180+t*900)*t)':d=1.2:s=48000" "afade=t=in:d=0.6,afade=t=out:st=1.0:d=0.2,volume=0.8" "riser.wav"
# impact / boom: low sine with fast decay
g "aevalsrc='sin(2*PI*65*t)*exp(-t*7)+0.4*sin(2*PI*120*t)*exp(-t*10)':d=0.7:s=48000" "volume=1.0" "impact.wav"
# click / tick: short transient
g "aevalsrc='sin(2*PI*1400*t)*exp(-t*70)':d=0.12:s=48000" "volume=0.7" "click.wav"
# pop: playful blip
g "aevalsrc='sin(2*PI*(500+t*600)*t)*exp(-t*22)':d=0.25:s=48000" "volume=0.7" "pop.wav"
# sub-drop: deep falling tone
g "aevalsrc='0.5*sin(2*PI*(160-t*120)*t)*exp(-t*3)':d=1.0:s=48000" "lowpass=f=300,volume=0.9" "sub-drop.wav"
# sparkle: high shimmer for reveals
g "aevalsrc='0.2*(sin(2*PI*2200*t)+sin(2*PI*3300*t)+sin(2*PI*4400*t))*exp(-t*6)':d=0.8:s=48000" "afade=t=out:st=0.4:d=0.4,volume=0.5" "sparkle.wav"

echo "[sfx] done. Use as extra <audio data-track-index=N> layers at the moment they hit,"
echo "      or mix into the master with ffmpeg amix. Pair with motion: whoosh on swipes,"
echo "      impact on hard-cuts, riser before reveals, pop/click on UI, sparkle on shine."
