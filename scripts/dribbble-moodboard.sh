#!/usr/bin/env bash
# dribbble-moodboard.sh — build a local mood-board from Dribbble for premium
# designer-quality reference. REFERENCE ONLY — designers retain copyright.
#
#   scripts/dribbble-moodboard.sh "<query>" <out-dir/> [--n=20] [--recent]
#
# Output:
#   <out-dir>/moodboard.json     — shots + extracted palette per image
#   <out-dir>/contact-sheet.jpg  — N thumbnails tiled for at-a-glance review
#   <out-dir>/palette.json       — combined palette across all shots (top 8 colors)
#   <out-dir>/thumbs/<id>.jpg    — thumbnail per shot
set -euo pipefail

QUERY="${1:?usage: dribbble-moodboard.sh <query> <out-dir/> [--n=20]}"
OUTDIR="${2:?need output dir}"
N=20
EXTRA=()
for a in "${@:3}"; do
  case "$a" in
    --n=*) N="${a#--n=}";;
    *) EXTRA+=("$a");;
  esac
done

DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$OUTDIR/thumbs"

echo "[dribbble-moodboard] searching for '$QUERY' (n=$N)" >&2
SEARCH_JSON=$(node "$DIR/dribbble-search.js" "$QUERY" --n="$N" "${EXTRA[@]}")

python3 - "$SEARCH_JSON" "$OUTDIR" "$DIR" <<'PY'
import json, sys, urllib.request, subprocess, os
data = json.loads(sys.argv[1])
outdir = sys.argv[2]
scriptdir = sys.argv[3]
results = data.get('results', [])
print(f"[dribbble-moodboard] downloading {len(results)} thumbs...", file=sys.stderr)

ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
def fetch(url, dest):
    req = urllib.request.Request(url, headers={'User-Agent': ua, 'Referer': 'https://dribbble.com/'})
    with urllib.request.urlopen(req, timeout=20) as r:
        open(dest, 'wb').write(r.read())

enriched = []
for r in results:
    dest = os.path.join(outdir, 'thumbs', f"{r['id']}.jpg")
    try:
        fetch(r['image_url'] or r['thumb_url'], dest)
    except Exception as e:
        print(f"  fail {r['id']}: {e}", file=sys.stderr); continue
    try:
        palette = json.loads(subprocess.check_output(
            ['python3', os.path.join(scriptdir, '_palette.py'), dest, '--n', '5']))
    except Exception:
        palette = {'colors': []}
    enriched.append({**r, 'thumb_local': dest, 'palette': palette['colors']})

out = {**data, 'results': enriched}
json.dump(out, open(os.path.join(outdir, 'moodboard.json'), 'w'), indent=2)

from collections import Counter
combined = Counter()
for e in enriched:
    if e['palette']:
        combined[e['palette'][0]['hex']] += 1
top = combined.most_common(8)
json.dump({'top_colors': [{'hex': h, 'count': c} for h, c in top]},
          open(os.path.join(outdir, 'palette.json'), 'w'), indent=2)
print(f"[dribbble-moodboard] saved {len(enriched)} shots + palette to {outdir}", file=sys.stderr)
PY

python3 "$DIR/_contact-sheet.py" "$OUTDIR/thumbs" "$OUTDIR/contact-sheet.jpg"

echo "[dribbble-moodboard] ✓ '$QUERY' → $OUTDIR/"
echo "[dribbble-moodboard] REFERENCE ONLY — designers retain copyright." >&2
