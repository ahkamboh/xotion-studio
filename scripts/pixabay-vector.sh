#!/usr/bin/env bash
# pixabay-vector.sh — fetch a scalable SVG vector from Pixabay.
# Vectors are gold for motion graphics: scale infinitely, recolor via CSS,
# animate path by path.
#
#   scripts/pixabay-vector.sh "<query>" <out.svg> [orient=all]
#
# License: Pixabay Content License (commercial-OK, no attribution).
set -euo pipefail
Q="${1:?usage: pixabay-vector.sh <query> <out.svg> [orient]}"
OUT="${2:?need output path}"
ORIENT="${3:-all}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[ -f "$ROOT/.env.pixabay" ] && { set -a; . "$ROOT/.env.pixabay"; set +a; }
KEY="${PIXABAY_API_KEY:?PIXABAY_API_KEY not set; check .env.pixabay}"

QENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$Q")
URL="https://pixabay.com/api/?key=${KEY}&q=${QENC}&image_type=vector&orientation=${ORIENT}&safesearch=true&per_page=30"

JSON=$(curl -sS -H "User-Agent: xotion-studio/1.0" "$URL")
PICK=$(python3 - "$JSON" <<'PY'
import json, sys
data = json.loads(sys.argv[1])
hits = data.get('hits') or []
if not hits: sys.exit(1)
best = max(hits, key=lambda h: (h.get('downloads',0), h.get('views',0)))
# Pixabay vector items expose largeImageURL (PNG raster) and a vectorURL (SVG).
# We want the SVG if available; the field name in the API is `vectorURL`.
src = best.get('vectorURL') or best.get('largeImageURL')
print(json.dumps({
  'src':      src,
  'is_svg':   bool(best.get('vectorURL')),
  'id':       best.get('id'),
  'user':     best.get('user'),
  'tags':     best.get('tags'),
  'pageURL':  best.get('pageURL'),
}))
PY
) || { echo "[pixabay-vector] no match for '$Q'" >&2; exit 3; }

mkdir -p "$(dirname "$OUT")"
SRC=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['src'])" "$PICK")
IS_SVG=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['is_svg'])" "$PICK")
if [ "$IS_SVG" = "False" ]; then
  echo "[pixabay-vector] WARN: top result has no SVG, falling back to PNG raster" >&2
fi
curl -sS -L -H "User-Agent: xotion-studio/1.0" -o "$OUT" "$SRC"

META="${OUT%.*}.license.json"
python3 - "$PICK" "$META" <<'PY'
import json, sys
m = json.loads(sys.argv[1])
out = {
  'source':      'pixabay-vector',
  'license':     'Pixabay Content License (commercial-OK, no attribution required)',
  'license_url': 'https://pixabay.com/service/license-summary/',
  'id':          m.get('id'),
  'uploader':    m.get('user'),
  'tags':        m.get('tags'),
  'format':      'svg' if m.get('is_svg') else 'png-raster-fallback',
  'source_url':  m.get('pageURL'),
}
with open(sys.argv[2], 'w') as f: json.dump(out, f, indent=2)
PY
SIZE=$(ls -lh "$OUT" | awk '{print $5}')
echo "[pixabay-vector] '$Q' -> $OUT  ($SIZE, svg=$IS_SVG)"
