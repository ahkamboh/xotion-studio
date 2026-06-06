#!/usr/bin/env bash
# music-fetch.sh — fetch a royalty-free track from Pixabay Music (commercial-OK, no attribution).
#
#   PIXABAY_API_KEY=xxx scripts/music-fetch.sh "<query>" <out.mp3> [genre] [min_dur=15]
#
# Pixabay music license: free for commercial use, no attribution required.
# https://pixabay.com/service/license-summary/  https://pixabay.com/api/docs/
#
# Also writes <out>.license.json with source URL + license + Pixabay metadata
# (per the audio-engineer agent's "log the license" mandate).
#
# If no API key is set or the fetch fails, returns a clear error pointing at
# the fallback (synth pad via scripts/music-bed.sh, or drop a track manually).
set -euo pipefail
Q="${1:?usage: music-fetch.sh <query> <out.mp3> [genre] [min_dur=15]}"
OUT="${2:?need output path}"
GENRE="${3:-}"
MINDUR="${4:-15}"

if [ -z "${PIXABAY_API_KEY:-}" ]; then
  cat <<EOF >&2
[music-fetch] PIXABAY_API_KEY is not set.

  Get one (free, instant) at: https://pixabay.com/api/docs/
  Then: export PIXABAY_API_KEY=xxxxxxxx

Or fall back to:
  scripts/music-bed.sh <out.wav> <duration> <mood>    # synth pad
  # or drop a track manually:  cp /path/to/track.mp3 $OUT
EOF
  exit 2
fi

QENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$Q")
URL="https://pixabay.com/api/music/?key=${PIXABAY_API_KEY}&q=${QENC}&per_page=20"
[ -n "$GENRE" ] && URL="${URL}&category=${GENRE}"

JSON=$(curl -sS -H "User-Agent: xotion-studio/1.0" "$URL") || { echo "[music-fetch] API request failed" >&2; exit 3; }

# Pixabay's /api/music/ endpoint is NOT a JSON API — it returns HTML.
# Detect this and tell the user to download manually OR use Jamendo.
if echo "$JSON" | head -c 200 | grep -qi '<!doctype html\|<html'; then
  cat <<EOF >&2
[music-fetch] Pixabay's music search is web-only (no public JSON API).
              Your API key is fine — it works for photos/videos endpoints,
              but pixabay.com/api/music/ returns HTML, not JSON.

Workarounds:
  1. MANUAL — browse https://pixabay.com/music/search/${QENC}/ , click
              "Download" on a track, then:
                  cp ~/Downloads/track.mp3 $OUT
              The rest of the pipeline (bpm-detect → beat-align → mix-ducked)
              works on the resulting MP3 regardless of source.
  2. JAMENDO — use scripts/music-fetch-jamendo.sh if added (Jamendo has a
              real JSON API).
  3. SYNTH FALLBACK — scripts/music-bed.sh <out.wav> <duration> <mood>
EOF
  exit 5
fi

# Pick the longest track that's at least MINDUR seconds and has a usable audio URL.
PICK=$(python3 - "$JSON" "$MINDUR" <<'PY'
import sys, json
data = json.loads(sys.argv[1])
mindur = int(sys.argv[2])
hits = data.get('hits') or data.get('results') or []
best = None
for h in hits:
    dur = h.get('duration', 0)
    if dur < mindur: continue
    src = h.get('audio') or h.get('src')
    if not src: continue
    if best is None or dur > best['duration']:
        best = h
        best['_src'] = src
if not best:
    sys.exit(1)
print(json.dumps({
    'src':      best['_src'],
    'id':       best.get('id'),
    'user':     best.get('user'),
    'tags':     best.get('tags'),
    'duration': best.get('duration'),
    'pageURL':  best.get('pageURL'),
}))
PY
) || { echo "[music-fetch] no track matched '$Q' (dur>=${MINDUR}s)" >&2; exit 4; }

mkdir -p "$(dirname "$OUT")"
SRC=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['src'])" "$PICK")
curl -sS -L -H "User-Agent: xotion-studio/1.0" -o "$OUT" "$SRC"

# Log license metadata next to the file
META="${OUT%.*}.license.json"
python3 - "$PICK" "$META" <<'PY'
import json, sys
m = json.loads(sys.argv[1])
out = {
  'source':      'pixabay-music',
  'license':     'Pixabay Content License (commercial-OK, no attribution required)',
  'license_url': 'https://pixabay.com/service/license-summary/',
  'track_id':    m.get('id'),
  'uploader':    m.get('user'),
  'tags':        m.get('tags'),
  'duration_s':  m.get('duration'),
  'source_url':  m.get('pageURL'),
}
with open(sys.argv[2], 'w') as f: json.dump(out, f, indent=2)
print(f"[music-fetch] license logged -> {sys.argv[2]}")
PY

DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT")
echo "[music-fetch] '$Q' -> $OUT  (${DUR}s)"
