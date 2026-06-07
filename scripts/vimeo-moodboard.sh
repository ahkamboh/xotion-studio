#!/usr/bin/env bash
# vimeo-moodboard.sh — build a motion-design reference board from Vimeo.
# REFERENCE ONLY — for studying composition, color, motion language. Never
# embed or reuse the source videos.
#
#   scripts/vimeo-moodboard.sh "<query>" <out-dir/> [--n=12] [--staffpicks]
#
# Output:
#   <out-dir>/moodboard.json     — videos + extracted palette per thumbnail
#   <out-dir>/contact-sheet.jpg  — N poster thumbs tiled (vimeo posters are 16:9)
#   <out-dir>/palette.json       — combined palette across all videos (top 8)
#   <out-dir>/thumbs/<id>.jpg    — poster thumbnail per video
set -euo pipefail

QUERY="${1:?usage: vimeo-moodboard.sh <query> <out-dir/> [--n=12] [--staffpicks]}"
OUTDIR="${2:?need output dir}"
N=12
EXTRA=()
for a in "${@:3}"; do
  case "$a" in
    --n=*) N="${a#--n=}";;
    *) EXTRA+=("$a");;
  esac
done

DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$OUTDIR/thumbs"

echo "[vimeo-moodboard] loading Vimeo results for '$QUERY' (n=$N) ${EXTRA[*]}" >&2
SEARCH_JSON=$(node "$DIR/vimeo-search.js" "$QUERY" --n="$N" "${EXTRA[@]}")

python3 - "$SEARCH_JSON" "$OUTDIR" "$DIR" <<'PY'
import json, sys, urllib.request, subprocess, os
data = json.loads(sys.argv[1])
outdir = sys.argv[2]
scriptdir = sys.argv[3]
results = data.get('results', [])
print(f"[vimeo-moodboard] downloading {len(results)} posters...", file=sys.stderr)

ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
def fetch(url, dest):
    req = urllib.request.Request(url, headers={'User-Agent': ua, 'Referer': 'https://vimeo.com/'})
    with urllib.request.urlopen(req, timeout=20) as r:
        open(dest, 'wb').write(r.read())

enriched = []
for r in results:
    url = r.get('image_url') or r.get('thumb_url')
    if not url: continue
    dest = os.path.join(outdir, 'thumbs', f"{r['id']}.jpg")
    try:
        fetch(url, dest)
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
print(f"[vimeo-moodboard] saved {len(enriched)} videos + palette to {outdir}", file=sys.stderr)
PY

python3 "$DIR/_contact-sheet.py" "$OUTDIR/thumbs" "$OUTDIR/contact-sheet.jpg" --cell=480 --cols=4

echo "[vimeo-moodboard] ✓ '$QUERY' → $OUTDIR/"
echo "[vimeo-moodboard] REFERENCE ONLY — creators retain copyright." >&2
