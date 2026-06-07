#!/usr/bin/env bash
# license-audit.sh — verify every asset referenced by a project's composition
# has a valid recorded license BEFORE delivery. Fails closed.
#
#   scripts/license-audit.sh projects/<name>
#
# Walks index.html (<video>/<audio>/<img>/<source>/srcset + CSS url()) plus the
# project's assets/ tree, resolves each referenced LOCAL asset, and requires
# each to carry an acceptable license — via a sibling <asset>.license.json, a
# rolled-up assets/fonts/LICENSES.json, or a licenses/manual-attestation.json.
#
# Emits work/license-manifest.json {status, assets:[...], missing:[...]}.
# Exit 0 = all licensed (status:pass). Exit 1 = at least one unlicensed (fail).
set -euo pipefail
PROJ="${1:?usage: license-audit.sh projects/<name>}"
[ -d "$PROJ" ] || { echo "[license-audit] no such project dir: $PROJ" >&2; exit 2; }
mkdir -p "$PROJ/work"

python3 - "$PROJ" <<'PY'
import json, os, re, sys
proj = sys.argv[1]
idx  = os.path.join(proj, 'index.html')

# Acceptable license classes (commercial-OK / CC0 / synth / attested)
OK_SOURCES = {
    'pixabay-photo','pixabay-illustration','pixabay-vector','pixabay-video',
    'pixabay-music','pixabay-sfx','pixabay-3d-models',
    'internal-synth','self-generated','cc0','public-domain','royalty-free-stock',
    'user-provided',
}
def license_ok(meta):
    src = str(meta.get('source','')).lower()
    lic = str(meta.get('license','')).lower()
    if src in OK_SOURCES: return True
    if 'self-generated' in lic or 'internal-synth' in lic: return True
    if 'pixabay content license' in lic: return True
    if 'cc0' in lic or 'public domain' in lic or 'public-domain' in lic: return True
    if 'royalty-free' in lic: return True
    return False

# Gather referenced local asset paths from index.html
refs = set()
if os.path.exists(idx):
    html = open(idx, encoding='utf-8', errors='ignore').read()
    for m in re.finditer(r'''(?:src|href)\s*=\s*["\']([^"\']+)["\']''', html):
        refs.add(m.group(1))
    for m in re.finditer(r'''srcset\s*=\s*["\']([^"\']+)["\']''', html):
        for part in m.group(1).split(','):
            refs.add(part.strip().split(' ')[0])
    for m in re.finditer(r'''url\(\s*["\']?([^"\')]+)["\']?\s*\)''', html):
        refs.add(m.group(1))

# Keep only local media assets (skip http(s), data:, fonts handled separately, js/css/html)
def is_media(p):
    if p.startswith(('http://','https://','data:','//')): return False
    ext = os.path.splitext(p)[1].lower()
    return ext in {'.jpg','.jpeg','.png','.webp','.gif','.svg','.mp4','.mov','.webm',
                   '.mp3','.wav','.m4a','.flac','.glb','.gltf'}

# Also scan assets/ tree for media that exists (catch assets referenced indirectly)
asset_files = []
for root in ('assets',):
    base = os.path.join(proj, root)
    if os.path.isdir(base):
        for dirpath, _, files in os.walk(base):
            for f in files:
                if is_media(f):
                    asset_files.append(os.path.relpath(os.path.join(dirpath, f), proj))

# Union of html refs (local media) + on-disk assets
candidates = set()
for r in refs:
    if is_media(r):
        candidates.add(r.lstrip('./'))
for a in asset_files:
    candidates.add(a)

# Load optional rollups
fonts_license = os.path.join(proj, 'assets', 'fonts', 'LICENSES.json')
fonts_ok = os.path.exists(fonts_license)
attest_path = os.path.join(proj, 'licenses', 'manual-attestation.json')
attested = {}
if os.path.exists(attest_path):
    try:
        att = json.load(open(attest_path))
        for e in (att if isinstance(att, list) else att.get('assets', [])):
            attested[e.get('path','')] = e
    except Exception:
        pass

results, missing = [], []
for rel in sorted(candidates):
    abspath = os.path.join(proj, rel)
    # Fonts roll up to LICENSES.json
    if '/fonts/' in ('/' + rel) or rel.startswith('assets/fonts/'):
        if fonts_ok:
            results.append({'asset': rel, 'license': 'bundled-font-library', 'ok': True})
        else:
            missing.append({'asset': rel, 'reason': 'no assets/fonts/LICENSES.json'})
        continue
    # Sibling .license.json
    stem = os.path.splitext(abspath)[0]
    sidecars = [stem + '.license.json', abspath + '.license.json']
    # 3D models live in a dir with a single license.json
    if abspath.lower().endswith(('.glb', '.gltf')):
        sidecars.append(os.path.join(os.path.dirname(abspath), 'license.json'))
    meta = None
    for sc in sidecars:
        if os.path.exists(sc):
            try: meta = json.load(open(sc)); break
            except Exception: pass
    if meta and license_ok(meta):
        results.append({'asset': rel, 'license': meta.get('license') or meta.get('source'), 'ok': True})
    elif rel in attested:
        results.append({'asset': rel, 'license': 'user-attested', 'ok': True})
    else:
        missing.append({'asset': rel, 'reason': 'no valid .license.json / attestation'})

status = 'pass' if not missing else 'fail'
manifest = {
    'status': status,
    'checked': len(candidates),
    'licensed': len(results),
    'assets': results,
    'missing': missing,
}
out = os.path.join(proj, 'work', 'license-manifest.json')
json.dump(manifest, open(out, 'w'), indent=2)
print(f"[license-audit] {status.upper()} — {len(results)}/{len(candidates)} licensed -> {out}")
for m in missing:
    print(f"  MISSING: {m['asset']}  ({m['reason']})", file=sys.stderr)
sys.exit(0 if status == 'pass' else 1)
PY
