#!/usr/bin/env bash
# pixabay-video.sh — fetch a stock video (b-roll) from Pixabay.
#
#   scripts/pixabay-video.sh "<query>" <out.mp4> [orient=horizontal|vertical|all] [min_w=1920]
#
# License: Pixabay Content License (commercial-OK, no attribution).
set -euo pipefail
Q="${1:?usage: pixabay-video.sh <query> <out.mp4> [orient=horizontal|vertical|all] [min_w=1920]}"
OUT="${2:?need output path}"
ORIENT="${3:-horizontal}"
MINW="${4:-1920}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[ -f "$ROOT/.env.pixabay" ] && { set -a; . "$ROOT/.env.pixabay"; set +a; }
KEY="${PIXABAY_API_KEY:?PIXABAY_API_KEY not set; check .env.pixabay}"

QENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$Q")
URL="https://pixabay.com/api/videos/?key=${KEY}&q=${QENC}&video_type=film&safesearch=true&per_page=20"

JSON=$(curl -sS -H "User-Agent: xotion-studio/1.0" "$URL")
PICK=$(python3 - "$JSON" "$ORIENT" "$MINW" <<'PY'
import json, sys
data = json.loads(sys.argv[1])
orient = sys.argv[2]
minw   = int(sys.argv[3])
hits = data.get('hits') or []
if not hits: sys.exit(1)
best = None
for h in hits:
    vids = h.get('videos') or {}
    # Try resolutions in order: large > medium > small > tiny, pick first ≥ minw
    candidates = sorted(vids.items(), key=lambda kv: -kv[1].get('width', 0))
    chosen = None
    for size_name, vid in candidates:
        if vid.get('width', 0) >= minw and vid.get('url'):
            chosen = (size_name, vid); break
    if not chosen and candidates:
        chosen = candidates[0]
    if not chosen: continue
    size_name, vid = chosen
    # orientation filter
    if orient == 'horizontal' and vid.get('height', 0) > vid.get('width', 0): continue
    if orient == 'vertical'   and vid.get('width', 0)  > vid.get('height', 0): continue
    candidate = {
      'src':      vid['url'],
      'w':        vid.get('width'),
      'h':        vid.get('height'),
      'duration': h.get('duration'),
      'id':       h.get('id'),
      'user':     h.get('user'),
      'tags':     h.get('tags'),
      'pageURL':  h.get('pageURL'),
      'size_label': size_name,
      'views':    h.get('views', 0),
    }
    if best is None or candidate['views'] > best['views']:
        best = candidate
if not best: sys.exit(2)
print(json.dumps(best))
PY
) || { echo "[pixabay-video] no match for '$Q' ($ORIENT, ≥${MINW}px)" >&2; exit 3; }

mkdir -p "$(dirname "$OUT")"
SRC=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['src'])" "$PICK")
echo "[pixabay-video] downloading..." >&2
curl -sS -L -H "User-Agent: xotion-studio/1.0" -o "$OUT" "$SRC"

META="${OUT%.*}.license.json"
python3 - "$PICK" "$META" <<'PY'
import json, sys
m = json.loads(sys.argv[1])
out = {
  'source':      'pixabay-video',
  'license':     'Pixabay Content License (commercial-OK, no attribution required)',
  'license_url': 'https://pixabay.com/service/license-summary/',
  'id':          m.get('id'),
  'uploader':    m.get('user'),
  'tags':        m.get('tags'),
  'dimensions':  f"{m.get('w')}x{m.get('h')}",
  'duration_s':  m.get('duration'),
  'res_label':   m.get('size_label'),
  'source_url':  m.get('pageURL'),
}
with open(sys.argv[2], 'w') as f: json.dump(out, f, indent=2)
PY
SIZE=$(ls -lh "$OUT" | awk '{print $5}')
DUR=$(python3 -c "import json; print(json.load(open('$META'))['duration_s'])")
echo "[pixabay-video] '$Q' -> $OUT  ($SIZE, ${DUR}s)"
