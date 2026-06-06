#!/usr/bin/env bash
# music-fetch-jamendo.sh — fetch a CC-licensed track from Jamendo (real public JSON API).
#
#   JAMENDO_CLIENT_ID=xxx scripts/music-fetch-jamendo.sh "<query>" <out.mp3> [min_dur=15]
#
# Jamendo's free tier returns tracks under various Creative Commons licenses.
# Get a client_id: https://developer.jamendo.com/ (free, instant; no OAuth needed
# for read-only track searches).
#
# Always writes <out>.license.json next to the audio with the track's exact
# Creative Commons license URL so you know what attribution (if any) is needed.
set -euo pipefail
Q="${1:?usage: music-fetch-jamendo.sh <query> <out.mp3> [min_dur=15]}"
OUT="${2:?need output path}"
MINDUR="${3:-15}"

# Auto-source credentials from .env.music if present.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[ -f "$ROOT/.env.music" ] && { set -a; . "$ROOT/.env.music"; set +a; }

if [ -z "${JAMENDO_CLIENT_ID:-}" ]; then
  cat <<EOF >&2
[music-fetch-jamendo] JAMENDO_CLIENT_ID is not set.
  Get one (free, instant, no credit card): https://developer.jamendo.com/
  Then: export JAMENDO_CLIENT_ID=xxxxxxxx
EOF
  exit 2
fi

QENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$Q")
# Testing phase: no commercial filter — picks the best-matching track from the
# full Jamendo catalog. The license URL is always logged to <out>.license.json
# so we know what to re-license before commercial launch.
URL="https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=50&search=${QENC}&audioformat=mp32&include=musicinfo+licenses"

JSON=$(curl -sS -H "User-Agent: xotion-studio/1.0" "$URL") || { echo "[music-fetch-jamendo] API request failed" >&2; exit 3; }

PICK=$(python3 - "$JSON" "$MINDUR" <<'PY'
import json, sys
data = json.loads(sys.argv[1])
mindur = int(sys.argv[2])
if data.get('headers',{}).get('status') != 'success':
    print(json.dumps(data.get('headers',{})), file=sys.stderr); sys.exit(2)
results = data.get('results', [])

# Flag commercial-OK vs needs-licensing — log but don't reject.
def is_commercial_ok(licu):
    if not licu: return False
    u = licu.lower()
    if 'by-nc' in u or 'by-nd' in u or 'nc-' in u or '-nd' in u: return False
    return any(p in u for p in ('/by/', '/by-sa/', '/publicdomain', '/zero/'))

best = None
for t in results:
    dur = t.get('duration', 0)
    if dur < mindur: continue
    src = t.get('audiodownload') or t.get('audio')
    if not src: continue
    if best is None or dur > best['duration']:
        best = t
        best['_src'] = src
        best['_commercial_ok'] = is_commercial_ok(t.get('license_ccurl') or t.get('license_url') or '')
if not best:
    sys.exit(1)
print(json.dumps({
    'src':           best['_src'],
    'id':            best.get('id'),
    'name':          best.get('name'),
    'artist':        best.get('artist_name'),
    'duration':      best.get('duration'),
    'license':       best.get('license_ccurl') or best.get('license_url'),
    'shareurl':      best.get('shareurl'),
    'commercial_ok': best.get('_commercial_ok'),
}))
PY
) || { echo "[music-fetch-jamendo] no track matched '$Q' (dur>=${MINDUR}s)" >&2; exit 4; }

mkdir -p "$(dirname "$OUT")"
SRC=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['src'])" "$PICK")
curl -sS -L -H "User-Agent: xotion-studio/1.0" -o "$OUT" "$SRC"

META="${OUT%.*}.license.json"
python3 - "$PICK" "$META" <<'PY'
import json, sys
m = json.loads(sys.argv[1])
licu = m.get('license') or ''
commercial_ok = bool(m.get('commercial_ok'))
out = {
  'source':         'jamendo',
  'license':        licu or 'Creative Commons (check license URL)',
  'license_url':    licu,
  'commercial_ok':  commercial_ok,
  'needs_licensing_before_prod': not commercial_ok,
  'track_id':       m.get('id'),
  'track_name':     m.get('name'),
  'artist':         m.get('artist'),
  'duration_s':     m.get('duration'),
  'source_url':     m.get('shareurl'),
  'note':           'Jamendo CC track. TESTING-PHASE fetch: license not filtered. Re-license via Jamendo Pro (jamendo.com/start) before commercial launch if needs_licensing_before_prod=true.',
}
with open(sys.argv[2], 'w') as f: json.dump(out, f, indent=2)
print(f"[music-fetch-jamendo] license logged -> {sys.argv[2]}")
if not commercial_ok:
    print(f"[music-fetch-jamendo] ⚠️  TEST-ONLY LICENSE: {licu}", file=sys.stderr)
    print(f"[music-fetch-jamendo] ⚠️  Re-license '{m.get('name')}' by {m.get('artist')} via jamendo.com/start before prod.", file=sys.stderr)
PY

DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT")
echo "[music-fetch-jamendo] '$Q' -> $OUT  (${DUR}s)"
