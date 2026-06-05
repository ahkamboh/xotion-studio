#!/usr/bin/env bash
# enrich.sh — the "make it look expensive" finishing pass for any plain clip.
# Applies a cohesive premium grade + bloom/glow + film grain + vignette + subtle sharpen
# in a single ffmpeg pass. This is what separates a flat edit from a cinematic one.
#
#   scripts/enrich.sh <in.mp4> <out.mp4> [look] [strength]
#
#   look      cine | teal-orange | warm | moody | clean | vibrant   (default: cine)
#   strength  0.0 .. 1.5  — scales bloom + grain (default: 0.6; keep subtle)
#
# Tip: stack with graphics overlays — run overlay.sh first (particles/3D/atmosphere),
# then enrich.sh on the result for the final premium finish.
set -euo pipefail

IN="${1:?usage: enrich.sh <in.mp4> <out.mp4> [look] [strength]}"
OUT="${2:?need output path}"
LOOK="${3:-cine}"
STR="${4:-0.6}"

[ -f "$IN" ] || { echo "input not found: $IN" >&2; exit 1; }

# --- grade per look (eq + curves) ---
case "$LOOK" in
  cine)        EQ="eq=contrast=1.08:saturation=1.06:gamma=0.97:gamma_r=1.02:gamma_b=1.05";
               CURVE="curves=r='0/0.02 0.5/0.5 1/0.98':b='0/0.05 0.5/0.5 1/0.95'";;
  teal-orange) EQ="eq=contrast=1.10:saturation=1.18:gamma=0.97";
               CURVE="curves=r='0/0 0.5/0.55 1/1':b='0/0.06 0.5/0.45 1/0.92'";;
  warm)        EQ="eq=contrast=1.06:saturation=1.10:gamma_r=1.05:gamma_b=0.95";
               CURVE="curves=all='0/0.02 0.5/0.52 1/1'";;
  moody)       EQ="eq=contrast=1.12:saturation=0.92:brightness=-0.02:gamma=0.92";
               CURVE="curves=all='0/0.04 0.5/0.46 1/0.92'";;
  clean)       EQ="eq=contrast=1.04:saturation=1.05:gamma=1.0";
               CURVE="curves=all='0/0 1/1'";;
  vibrant)     EQ="eq=contrast=1.10:saturation=1.30:gamma=0.98";
               CURVE="curves=all='0/0 0.5/0.5 1/1'";;
  *) echo "unknown look '$LOOK' (cine|teal-orange|warm|moody|clean|vibrant)" >&2; exit 1;;
esac

# bloom opacity + grain amount scale with strength
BLOOM=$(awk "BEGIN{printf \"%.3f\", 0.45*$STR}")
GRAIN=$(awk "BEGIN{printf \"%d\", 9*$STR}")

echo "[enrich] look=$LOOK strength=$STR bloom=$BLOOM grain=$GRAIN"

# Single pass: grade -> bloom (blur bright + screen) -> vignette -> grain -> sharpen
ffmpeg -y -i "$IN" -filter_complex "
  [0:v]$EQ,$CURVE,format=gbrp[g];
  [g]split[a][b];
  [b]gblur=sigma=22[bl];
  [a][bl]blend=all_mode=screen:all_opacity=$BLOOM[bloomed];
  [bloomed]vignette=PI/5,
           noise=alls=$GRAIN:allf=t,
           unsharp=5:5:0.4:5:5:0.0,
           format=yuv420p[v]
" -map "[v]" -map "0:a?" -c:v libx264 -crf 18 -preset medium -movflags +faststart \
  -c:a copy "$OUT"

echo "[enrich] done -> $OUT"
