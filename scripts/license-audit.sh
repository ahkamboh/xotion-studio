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
    'internal-synth','internal-synth-fallback','self-generated',
    'cc0','public-domain','royalty-free-stock','user-provided',
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

MEDIA_EXT = {'.jpg','.jpeg','.png','.webp','.gif','.svg','.mp4','.mov','.webm',
             '.mp3','.wav','.m4a','.flac','.glb','.gltf',
             '.ttf','.otf','.woff','.woff2'}  # fonts roll up to assets/fonts/LICENSES.json
def media_ext(p):
    return os.path.splitext(p.split('?')[0].split('#')[0])[1].lower() in MEDIA_EXT
def is_remote(p):
    return p.startswith(('http://','https://','//'))

# 1) Collect referenced paths from index.html AND every referenced/inline .js + .css.
#    A render that pulls media from JS or a remote CDN must NOT slip past the gate.
ref_local, ref_remote = set(), set()
def harvest(text):
    for m in re.finditer(r'''(?:src|href)\s*=\s*["\']([^"\']+)["\']''', text):
        yield m.group(1)
    for m in re.finditer(r'''srcset\s*=\s*["\']([^"\']+)["\']''', text):
        for part in m.group(1).split(','):
            yield part.strip().split(' ')[0]
    for m in re.finditer(r'''url\(\s*["\']?([^"\')]+)["\']?\s*\)''', text):
        yield m.group(1)
    # any quoted string literal that looks like a media path (catches JS img.src / data arrays)
    for m in re.finditer(r'''["\']([^"\']+\.(?:jpg|jpeg|png|webp|gif|svg|mp4|mov|webm|mp3|wav|m4a|flac|glb|gltf))(?:\?[^"\']*)?["\']''', text, re.I):
        yield m.group(1)

texts = []
script_srcs = set()
if os.path.exists(idx):
    html = open(idx, encoding='utf-8', errors='ignore').read()
    texts.append(html)
    for m in re.finditer(r'''<script[^>]+src\s*=\s*["\']([^"\']+)["\']''', html):
        script_srcs.add(m.group(1))
# also read referenced local .js/.css + every .js/.css on disk in the project (excluding deps)
for s in list(script_srcs):
    if not is_remote(s):
        p = os.path.join(proj, s.lstrip('./'))
        if os.path.isfile(p):
            texts.append(open(p, encoding='utf-8', errors='ignore').read())
for dp, dirs, files in os.walk(proj):
    dirs[:] = [d for d in dirs if d not in ('work','renders','node_modules','.git')]
    for f in files:
        if f.endswith(('.js','.css')):
            try: texts.append(open(os.path.join(dp,f), encoding='utf-8', errors='ignore').read())
            except Exception: pass

for text in texts:
    for r in harvest(text):
        if r.startswith('data:'): continue
        if not media_ext(r): continue
        (ref_remote if is_remote(r) else ref_local).add(r)

# 2) Walk the WHOLE project tree for on-disk media (not just assets/) — any media that
#    ships must carry a license regardless of where it sits.
asset_files = []
for dp, dirs, files in os.walk(proj):
    dirs[:] = [d for d in dirs if d not in ('work','renders','node_modules','.git')]
    for f in files:
        if media_ext(f):
            asset_files.append(os.path.relpath(os.path.join(dp, f), proj))

candidates = set(asset_files)
for r in ref_local:
    candidates.add(r.lstrip('./'))

# Load optional rollups — fonts are licensed either at the project level OR by
# the repo-root bundled library (projects reuse assets/fonts/ from the repo).
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(proj)))
fonts_ok = (os.path.exists(os.path.join(proj, 'assets', 'fonts', 'LICENSES.json'))
            or os.path.exists(os.path.join(repo_root, 'assets', 'fonts', 'LICENSES.json')))
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

# 3) Remote media is a hard FAIL — compositions must be network-free (CLAUDE.md),
#    and a remote asset has no auditable license on disk.
for r in sorted(ref_remote):
    missing.append({'asset': r, 'reason': 'remote URL — compositions must be network-free; vendor it locally with a license'})

for rel in sorted(candidates):
    abspath = os.path.join(proj, rel)
    # 4) A referenced asset whose file does not exist on disk is a FAIL (ghost reference).
    if not os.path.isfile(abspath):
        missing.append({'asset': rel, 'reason': 'referenced media file missing on disk'})
        continue
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

# 5) An empty audit must not masquerade as success: if a composition exists but the
#    auditor saw zero media (and zero remote refs), that's suspicious → FAIL, not pass.
suspicious_empty = (len(candidates) == 0 and not ref_remote and os.path.exists(idx))

status = 'pass' if (not missing and not suspicious_empty) else 'fail'
manifest = {
    'status': status,
    'checked': len(candidates),
    'licensed': len(results),
    'remote_refs': sorted(ref_remote),
    'assets': results,
    'missing': missing,
    'note': 'empty audit on an existing composition is treated as FAIL' if suspicious_empty else None,
}
out = os.path.join(proj, 'work', 'license-manifest.json')
import tempfile
_d = os.path.dirname(os.path.abspath(out)) or '.'
_fd, _tmp = tempfile.mkstemp(dir=_d, suffix='.tmp')
with os.fdopen(_fd, 'w') as _f: json.dump(manifest, _f, indent=2)
os.replace(_tmp, out)
print(f"[license-audit] {status.upper()} — {len(results)}/{len(candidates)} licensed, {len(ref_remote)} remote -> {out}")
for m in missing:
    print(f"  MISSING: {m['asset']}  ({m['reason']})", file=sys.stderr)
if suspicious_empty:
    print("  EMPTY AUDIT on an existing index.html — failing closed (no media seen)", file=sys.stderr)
sys.exit(0 if status == 'pass' else 1)
PY
