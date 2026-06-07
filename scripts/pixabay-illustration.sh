#!/usr/bin/env bash
# pixabay-illustration.sh — fetch a stock illustration from Pixabay.
#
#   scripts/pixabay-illustration.sh "<query>" <out.png> [orient=all] [min_w=1280]
#
# License: Pixabay Content License (commercial-OK, no attribution).
set -euo pipefail
Q="${1:?usage: pixabay-illustration.sh <query> <out.png> [orient] [min_w=1280]}"
OUT="${2:?need output path}"
ORIENT="${3:-all}"
MINW="${4:-1280}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[ -f "$ROOT/.env.pixabay" ] && { set -a; . "$ROOT/.env.pixabay"; set +a; }
KEY="${PIXABAY_API_KEY:?PIXABAY_API_KEY not set; check .env.pixabay}"

QENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$Q")
URL="https://pixabay.com/api/?key=${KEY}&q=${QENC}&image_type=illustration&orientation=${ORIENT}&min_width=${MINW}&safesearch=true&per_page=30"

JSON=$(curl -sS -H "User-Agent: xotion-studio/1.0" "$URL")
PICK=$(python3 - "$JSON" <<'PY'
import json, sys
data = json.loads(sys.argv[1])
hits = data.get('hits') or []
if not hits: sys.exit(1)
best = max(hits, key=lambda h: (h.get('downloads',0), h.get('imageWidth',0)))
print(json.dumps({
  'src':      best.get('largeImageURL'),
  'id':       best.get('id'),
  'user':     best.get('user'),
  'tags':     best.get('tags'),
  'w':        best.get('imageWidth'),
  'h':        best.get('imageHeight'),
  'pageURL':  best.get('pageURL'),
}))
PY
) || { echo "[pixabay-illustration] no match for '$Q'" >&2; exit 3; }

mkdir -p "$(dirname "$OUT")"
SRC=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['src'])" "$PICK")
curl -sS -L -H "User-Agent: xotion-studio/1.0" -o "$OUT" "$SRC"

META="${OUT%.*}.license.json"
python3 - "$PICK" "$META" <<'PY'
import json, sys
m = json.loads(sys.argv[1])
out = {
  'source':      'pixabay-illustration',
  'license':     'Pixabay Content License (commercial-OK, no attribution required)',
  'license_url': 'https://pixabay.com/service/license-summary/',
  'id':          m.get('id'), 'uploader': m.get('user'), 'tags': m.get('tags'),
  'dimensions':  f"{m.get('w')}x{m.get('h')}",
  'source_url':  m.get('pageURL'),
}
with open(sys.argv[2], 'w') as f: json.dump(out, f, indent=2)
PY
SIZE=$(ls -lh "$OUT" | awk '{print $5}')
echo "[pixabay-illustration] '$Q' -> $OUT  ($SIZE)"
