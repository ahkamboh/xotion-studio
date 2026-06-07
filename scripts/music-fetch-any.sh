#!/usr/bin/env bash
# music-fetch-any.sh — unified music fetcher. Tries every approved source in
# order until one returns a track. This is what the audio-engineer agent calls.
#
#   scripts/music-fetch-any.sh "<query>" <out.mp3> [min_dur=15] [max_dur=300]
#
# Source order:
#   1. Pixabay music   (puppeteer scrape — no public API for music)
#   2. Internet Archive (real JSON API, no key)
#   3. Synth fallback  (scripts/music-bed.sh) — DEGRADED, exits 3 (not a real success)
#
# Exit codes: 0 = real track fetched · 3 = degraded synth fallback (confirm/re-fetch) · 1 = total failure.
# Writes <out>.license.json next to the audio (degraded fallback tagged degraded:true).
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

# 1. Pixabay (puppeteer scrape)
if try_source "pixabay" "$DIR/pixabay-music.sh" "$Q" "$OUT"; then
  exit 0
fi

# 2. Internet Archive (keyless, real API)
if try_source "internet-archive" "$DIR/music-fetch-archive.sh" "$Q" "$OUT" "$MINDUR" "$MAXDUR"; then
  exit 0
fi

# 3. Synth fallback — this is a DEGRADED result, not a real success. We still
#    produce a bed so the project has something, but we tag it distinctly and
#    EXIT 3 so the caller/Director cannot mistake it for a real fetch.
echo "[music-fetch-any] ⚠️  all real sources failed; using DEGRADED synth fallback" >&2
TMP="${OUT%.*}.wav"
# music-bed.sh only knows these moods; validate or the fallback itself crashes.
VALID_MOODS="calm warm tense uplift dark"
RAW_MOOD=$(echo "$Q" | awk '{print tolower($1)}')
MOOD="uplift"
for m in $VALID_MOODS; do [ "$RAW_MOOD" = "$m" ] && MOOD="$RAW_MOOD"; done
DUR=$(python3 -c "print(max(${MINDUR}, 30))")
if [ -x "$DIR/music-bed.sh" ] && "$DIR/music-bed.sh" "$TMP" "$DUR" "$MOOD"; then
  ffmpeg -y -i "$TMP" -codec:a libmp3lame -qscale:a 2 "$OUT" -loglevel error
  rm -f "$TMP"
  cat > "${OUT%.*}.license.json" <<EOF
{ "source": "internal-synth-fallback", "degraded": true, "mood": "$MOOD", "query": "$Q",
  "note": "Real fetch FAILED — this is a generic synth bed, not a mood-matched track. The Director must confirm or re-fetch before shipping." }
EOF
  echo "[music-fetch-any] ⚠️  DEGRADED synth bed -> $OUT (mood=$MOOD). Exit 3 = confirm or re-fetch." >&2
  exit 3
fi

echo "[music-fetch-any] FATAL — every source failed including synth" >&2
exit 1
