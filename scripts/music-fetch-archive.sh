#!/usr/bin/env bash
# music-fetch-archive.sh — fetch a track from the Internet Archive's music collection.
#
#   scripts/music-fetch-archive.sh "<query>" <out.mp3> [min_dur=15] [max_dur=300]
#
# Internet Archive's audio_music collection is *largely* public-domain or
# CC-licensed material. No API key required. Real JSON endpoint.
#
# Workflow:
#   1. advancedsearch.php → find candidate items matching the query
#   2. For each candidate, fetch /metadata/<id> → list available MP3 files
#      and read the item's licenseurl
#   3. Pick the first item with a usable MP3 in the duration window AND a
#      commercial-friendly license (publicdomain, CC0, CC-BY)
#   4. Download the MP3
#   5. Write <out>.license.json with the exact license URL
#
# If no commercial-OK item matches, we fall through with exit 5 so the caller
# can try the next source in the chain.
set -euo pipefail

Q="${1:?usage: music-fetch-archive.sh <query> <out.mp3> [min_dur=15] [max_dur=300]}"
OUT="${2:?need output path}"
MINDUR="${3:-15}"
MAXDUR="${4:-300}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[ -f "$ROOT/.env.music" ] && { set -a; . "$ROOT/.env.music"; set +a; }
UA="${ARCHIVE_API_USER_AGENT:-xotion-studio/1.0}"

QENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$Q")

SEARCH_URL="https://archive.org/advancedsearch.php?q=${QENC}+AND+mediatype%3Aaudio+AND+collection%3Aaudio_music&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=licenseurl&rows=50&output=json"

echo "[music-fetch-archive] searching IA for '$Q'..." >&2
SEARCH=$(curl -sS -H "User-Agent: $UA" "$SEARCH_URL")

PICK=$(python3 - "$SEARCH" "$MINDUR" "$MAXDUR" "$UA" <<'PY'
import json, sys, urllib.request, urllib.error
search = json.loads(sys.argv[1])
mindur = float(sys.argv[2])
maxdur = float(sys.argv[3])
ua     = sys.argv[4]

docs = (search.get('response') or {}).get('docs') or []
if not docs:
    sys.stderr.write(f"[music-fetch-archive] 0 results from IA search\n")
    sys.exit(1)

# Testing phase: accept ANY license, just classify it.
def license_commercial_ok(url):
    if not url: return False
    u = url.lower()
    if 'by-nc' in u or 'by-nd' in u or 'nc-' in u or '-nd' in u: return False
    return any(p in u for p in ('/by/', '/by-sa/', '/publicdomain', '/zero/'))

def fetch_metadata(identifier):
    url = f"https://archive.org/metadata/{identifier}"
    req = urllib.request.Request(url, headers={'User-Agent': ua})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

best = None
checked = 0
for doc in docs:
    if checked >= 15:   # don't hammer metadata API
        break
    ident = doc.get('identifier')
    if not ident: continue
    try:
        meta = fetch_metadata(ident)
    except Exception as e:
        continue
    checked += 1
    item_licu = (meta.get('metadata') or {}).get('licenseurl') or doc.get('licenseurl') or ''
    files = meta.get('files') or []
    # Prefer 'VBR MP3' (full quality); fall back to any mp3
    mp3s = [f for f in files if (f.get('format') == 'VBR MP3')]
    if not mp3s:
        mp3s = [f for f in files if str(f.get('name','')).lower().endswith('.mp3')]
    for f in mp3s:
        try:
            dur = float(f.get('length') or 0)
        except (ValueError, TypeError):
            # IA sometimes formats length as "MM:SS"
            s = str(f.get('length') or '')
            if ':' in s:
                parts = s.split(':')
                try:
                    dur = sum(float(p) * (60 ** i) for i, p in enumerate(reversed(parts)))
                except: dur = 0
            else:
                dur = 0
        if dur < mindur or dur > maxdur:
            continue
        url = f"https://archive.org/download/{ident}/{urllib.parse.quote(f['name'])}"
        cand = {
            'src':           url,
            'identifier':    ident,
            'title':         doc.get('title') or (meta.get('metadata') or {}).get('title'),
            'creator':       doc.get('creator') or (meta.get('metadata') or {}).get('creator'),
            'license':       item_licu or 'unspecified (IA item has no licenseurl)',
            'commercial_ok': license_commercial_ok(item_licu),
            'duration_s':    dur,
            'page':          f"https://archive.org/details/{ident}",
        }
        if best is None or dur > best['duration_s']:
            best = cand
        break   # one MP3 per item is enough

if not best:
    sys.stderr.write(f"[music-fetch-archive] checked {checked} items; none had a commercial-OK MP3 in [{mindur},{maxdur}]s\n")
    sys.exit(1)

# urllib.parse needs import in this scope
import urllib.parse
best['src'] = best['src']  # already quoted above
print(json.dumps(best))
PY
) || { echo "[music-fetch-archive] no match" >&2; exit 5; }

mkdir -p "$(dirname "$OUT")"
SRC=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['src'])" "$PICK")
echo "[music-fetch-archive] downloading $SRC" >&2
curl -sS -L -H "User-Agent: $UA" -o "$OUT" "$SRC"

META="${OUT%.*}.license.json"
python3 - "$PICK" "$META" <<'PY'
import json, sys
m = json.loads(sys.argv[1])
licu = m.get('license') or ''
commercial_ok = bool(m.get('commercial_ok'))
out = {
  'source':         'internet-archive',
  'license':        licu,
  'license_url':    licu if licu.startswith('http') else None,
  'commercial_ok':  commercial_ok,
  'needs_licensing_before_prod': not commercial_ok,
  'identifier':     m.get('identifier'),
  'title':          m.get('title'),
  'creator':        m.get('creator'),
  'duration_s':     m.get('duration_s'),
  'source_url':     m.get('page'),
  'note':           'Internet Archive audio_music. TESTING-PHASE fetch: license not filtered. Verify and re-license before commercial launch if needs_licensing_before_prod=true.',
}
with open(sys.argv[2], 'w') as f: json.dump(out, f, indent=2)
print(f"[music-fetch-archive] license logged -> {sys.argv[2]}")
if not commercial_ok:
    print(f"[music-fetch-archive] ⚠️  TEST-ONLY LICENSE: {licu}", file=sys.stderr)
    print(f"[music-fetch-archive] ⚠️  Re-license '{m.get('title')}' by {m.get('creator')} before prod.", file=sys.stderr)
PY

DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT" 2>/dev/null || echo "?")
echo "[music-fetch-archive] '$Q' -> $OUT  (${DUR}s)"
