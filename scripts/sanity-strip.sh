#!/usr/bin/env bash
# sanity-strip.sh — extract 3 representative frames from an MP4 (25/50/75 %),
# scale to 540 wide, stack vertically into ONE PNG so a human (or the Director)
# can glance at a render and instantly see if anything is broken.
#
#   sanity-strip.sh <video.mp4> [out.png]
#
# Catches by inspection (no ML needed):
#   • text cut off at frame edges
#   • caption/signoff anchored to the wrong edge
#   • giant headlines that overshot the safe area
#   • scenes that came up blank
#
# Writes the strip next to the MP4 by default. Exits 0 even if some frames
# fail (e.g. for very short videos) — the strip is informational, not a gate.
set -euo pipefail

MP4="${1:?usage: sanity-strip.sh <video.mp4> [out.png]}"
[ -f "$MP4" ] || { echo "[sanity-strip] no such file: $MP4" >&2; exit 2; }
OUT="${2:-${MP4%.*}-sanity.png}"

DUR=$(ffprobe -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 "$MP4")
if [ -z "$DUR" ] || [ "$DUR" = "N/A" ]; then
  echo "[sanity-strip] could not read duration from $MP4" >&2
  exit 2
fi

T1=$(awk "BEGIN { printf \"%.3f\", $DUR * 0.25 }")
T2=$(awk "BEGIN { printf \"%.3f\", $DUR * 0.50 }")
T3=$(awk "BEGIN { printf \"%.3f\", $DUR * 0.75 }")

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Each frame: scale to 540 wide (half a 1080-wide vertical reel — fits in a
# Markdown render at a sensible size); pad to 540×960 if dimensions differ.
for i in 1 2 3; do
  TS_VAR="T$i"; TS="${!TS_VAR}"
  ffmpeg -y -loglevel error -ss "$TS" -i "$MP4" -vframes 1 \
    -vf "scale=540:-1" "$TMP/f$i.png"
done

# Vertical stack with thin separators. The separator lines double as "this is
# the strip, not a single screenshot" hint.
ffmpeg -y -loglevel error \
  -i "$TMP/f1.png" -i "$TMP/f2.png" -i "$TMP/f3.png" \
  -filter_complex "[0][1][2]vstack=inputs=3" "$OUT"

SIZE=$(ls -lh "$OUT" | awk '{print $5}')
echo "[sanity-strip] ${T1}s · ${T2}s · ${T3}s → $OUT ($SIZE)"
