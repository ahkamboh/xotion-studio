#!/usr/bin/env bash
# music-fetch-any.sh — unified music fetcher. Tries every approved source in
# order until one returns a track. This is the script the audio-engineer agent
# calls; the per-source scripts are the implementations.
#
#   scripts/music-fetch-any.sh "<query>" <out.mp3> [min_dur=15] [max_dur=300]
#
# Source order (all free + commercial-friendly):
#   1. Jamendo (real JSON API, CC-licensed catalog, scalable)
#   2. Internet Archive (real JSON API, public-domain + CC catalog, no key)
#   3. Synth fallback (scripts/music-bed.sh — deterministic, always works)
#
# Writes <out>.license.json next to the audio with the exact license + source.
# This is what the agent reads to know whether attribution is required.
set -euo pipefail

Q="${1:?usage: music-fetch-any.sh <query> <out.mp3> [min_dur=15] [max_dur=300]}"
OUT="${2:?need output path}"
MINDUR="${3:-15}"
MAXDUR="${4:-300}"

DIR="$(dirname "$0")"

try_source() {
  local name="$1"; shift
  echo "[music-fetch-any] trying $name..." >&2
  if "$@"; then
    echo "[music-fetch-any] ✓ got track from $name" >&2
    return 0
  fi
  local rc=$?
  echo "[music-fetch-any] ✗ $name failed (exit $rc), falling through" >&2
  return 1
}

# 1. Jamendo
if try_source "jamendo" "$DIR/music-fetch-jamendo.sh" "$Q" "$OUT" "$MINDUR"; then
  exit 0
fi

# 2. Internet Archive
if try_source "internet-archive" "$DIR/music-fetch-archive.sh" "$Q" "$OUT" "$MINDUR" "$MAXDUR"; then
  exit 0
fi

# 3. Synth fallback — generate a bed at the requested duration (default 30s)
echo "[music-fetch-any] all real sources failed; falling back to synth bed" >&2
TMP="${OUT%.*}.wav"
MOOD=$(echo "$Q" | awk '{print $1}')   # use first query word as mood hint
DUR=$(python3 -c "print(max(${MINDUR}, 30))")
if [ -x "$DIR/music-bed.sh" ] && "$DIR/music-bed.sh" "$TMP" "$DUR" "${MOOD:-uplift}"; then
  ffmpeg -y -i "$TMP" -codec:a libmp3lame -qscale:a 2 "$OUT" -loglevel error
  rm -f "$TMP"
  cat > "${OUT%.*}.license.json" <<EOF
{ "source": "internal-synth", "query": "$Q" }
EOF
  echo "[music-fetch-any] ✓ synth bed -> $OUT"
  exit 0
fi

echo "[music-fetch-any] FATAL — every source failed including synth" >&2
exit 1
