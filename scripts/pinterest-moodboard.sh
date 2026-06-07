#!/usr/bin/env bash
# pinterest-moodboard.sh — build a local mood-board from a Pinterest search.
# FOR REFERENCE ONLY. Pinterest images are NOT used in deliverables — they
# inform art direction (palette, composition, mood, trend) only.
#
#   scripts/pinterest-moodboard.sh "<query>" <out-dir/> [--n=20]
#
# Output:
#   <out-dir>/moodboard.json     — pins + extracted palette per image
#   <out-dir>/contact-sheet.jpg  — N thumbnails tiled for at-a-glance review
#   <out-dir>/palette.json       — combined palette across all pins (top 8 colors)
#   <out-dir>/thumbs/<id>.jpg    — thumbnail per pin (small, reference only)
set -euo pipefail

QUERY="${1:?usage: pinterest-moodboard.sh <query> <out-dir/> [--n=20]}"
OUTDIR="${2:?need output dir}"
N=20
for a in "$@"; do case "$a" in --n=*) N="${a#--n=}";; esac; done

DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$OUTDIR/thumbs"

echo "[moodboard] searching Pinterest for '$QUERY' (n=$N)" >&2
SEARCH_JSON=$(node "$DIR/pinterest-search.js" "$QUERY" --n="$N")

# Extract URLs + download thumbs
echo "$SEARCH_JSON" > "$OUTDIR/moodboard.json"

python3 - "$SEARCH_JSON" "$OUTDIR" "$DIR" <<'PY'
import json, sys, urllib.request, subprocess, os
data = json.loads(sys.argv[1])
outdir = sys.argv[2]
scriptdir = sys.argv[3]
results = data.get('results', [])
print(f"[moodboard] downloading {len(results)} thumbs...", file=sys.stderr)

ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
def fetch(url, dest):
    req = urllib.request.Request(url, headers={'User-Agent': ua, 'Referer': 'https://www.pinterest.com/'})
    with urllib.request.urlopen(req, timeout=20) as r:
        open(dest, 'wb').write(r.read())

enriched = []
for r in results:
    dest = os.path.join(outdir, 'thumbs', f"{r['id']}.jpg")
    try:
        fetch(r['image_url'] or r['thumb_url'], dest)
    except Exception as e:
        print(f"  fail {r['id']}: {e}", file=sys.stderr); continue
    # palette extraction (PIL-only, no external deps)
    try:
        palette = json.loads(subprocess.check_output(
            ['python3', os.path.join(scriptdir, '_palette.py'), dest, '--n', '5']))
    except Exception as e:
        palette = {'colors': []}
    enriched.append({**r, 'thumb_local': dest, 'palette': palette['colors']})

# Save enriched moodboard
out = {**data, 'results': enriched}
json.dump(out, open(os.path.join(outdir, 'moodboard.json'), 'w'), indent=2)

# Combined palette: pick the highest-weighted color from each pin, then dedupe close hues
from collections import Counter
combined = Counter()
for e in enriched:
    if e['palette']:
        combined[e['palette'][0]['hex']] += 1
top = combined.most_common(8)
json.dump({'top_colors': [{'hex': h, 'count': c} for h, c in top]},
          open(os.path.join(outdir, 'palette.json'), 'w'), indent=2)
print(f"[moodboard] saved {len(enriched)} pins + palette to {outdir}", file=sys.stderr)
PY

# Build a contact sheet via PIL (ffmpeg tile filter is finicky with sparse inputs)
python3 - "$OUTDIR" <<'PY'
import os, sys, glob
from PIL import Image
outdir = sys.argv[1]
thumbs = sorted(glob.glob(os.path.join(outdir, 'thumbs', '*.jpg')))
if not thumbs:
    sys.exit(0)
COLS, CELL, PAD = 5, 400, 8
n = len(thumbs)
rows = (n + COLS - 1) // COLS
W = COLS * CELL + (COLS + 1) * PAD
H = rows * CELL + (rows + 1) * PAD
sheet = Image.new('RGB', (W, H), (16, 16, 18))
for i, path in enumerate(thumbs):
    try:
        im = Image.open(path).convert('RGB')
        # cover-crop to CELL x CELL
        r = max(CELL / im.width, CELL / im.height)
        im = im.resize((int(im.width*r), int(im.height*r)), Image.LANCZOS)
        left = (im.width - CELL) // 2
        top  = (im.height - CELL) // 2
        im = im.crop((left, top, left + CELL, top + CELL))
        col, row = i % COLS, i // COLS
        x = PAD + col * (CELL + PAD)
        y = PAD + row * (CELL + PAD)
        sheet.paste(im, (x, y))
    except Exception as e:
        print(f"  skip {path}: {e}", file=sys.stderr)
sheet.save(os.path.join(outdir, 'contact-sheet.jpg'), 'JPEG', quality=88, optimize=True)
print(f"[moodboard] contact-sheet.jpg {sheet.size[0]}x{sheet.size[1]}, {n} thumbs", file=sys.stderr)
PY

ls -lh "$OUTDIR/" 2>/dev/null
echo "[moodboard] ✓ '$QUERY' → $OUTDIR/"
echo "[moodboard] REFERENCE ONLY — do not use these images in deliverables." >&2
