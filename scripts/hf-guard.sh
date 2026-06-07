#!/usr/bin/env bash
# hf-guard.sh — xotion pre-render static guard for the footguns HyperFrames'
# own lint does NOT catch. Run it BEFORE `npx hyperframes render --strict`.
#
#   scripts/hf-guard.sh <project-dir-or-index.html>
#
# Catches (verified gaps in the upstream CLI lint, edit-engine stress-test):
#   1. ERROR — DOM creation (createElement / innerHTML= / appendChild /
#      insertAdjacentHTML) INSIDE a tl.call()/.call() callback. GSAP resolves
#      selectors at construction time, so animating such an element is a silent
#      no-op — it appears but never animates, and lint stays 0/0. This is the
#      single most dangerous footgun and the CLI gives zero signal.
#   2. WARN — a GSAP tween with a BARE string selector (gsap.to('#x'…) /
#      tl.from('.y'…)) that is neither scoped via Q(...) nor contains
#      data-composition-id — can leak across compositions when bundled.
#
# Exit 0 = clean. Exit 1 = an ERROR-class footgun present (block the render).
set -euo pipefail
ARG="${1:?usage: hf-guard.sh <project-dir|index.html>}"
IDX="$ARG"; [ -d "$ARG" ] && IDX="$ARG/index.html"
[ -f "$IDX" ] || { echo "[hf-guard] no index.html at: $IDX" >&2; exit 2; }

python3 - "$IDX" <<'PY'
import re, sys
idx = sys.argv[1]
src = open(idx, encoding='utf-8', errors='ignore').read()

errors, warns = [], []
DOM_CREATE = re.compile(r'createElement|insertAdjacentHTML|appendChild|\.innerHTML\s*=|\.outerHTML\s*=')

# 1) DOM creation inside a .call(...) callback — scan each ".call(" and read its
#    balanced-paren argument region, then check for DOM creation in it.
for m in re.finditer(r'\.call\s*\(', src):
    i = m.end() - 1  # position of the '('
    depth, j = 0, i
    while j < len(src):
        c = src[j]
        if c == '(': depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0: break
        j += 1
    body = src[i:j+1]
    if DOM_CREATE.search(body):
        line = src.count('\n', 0, m.start()) + 1
        errors.append(f"line ~{line}: DOM creation inside a .call() callback — "
                      "GSAP can't animate an element created at playback (silent no-op). "
                      "Pre-render the element into the DOM, then animate the existing node.")

# 2) bare string selector in a GSAP tween (not Q(...)-scoped, no data-composition-id)
for m in re.finditer(r'''(?:gsap|tl)\s*\.\s*(?:to|from|fromTo|set|add)\s*\(\s*(['"])([^'"]+)\1''', src):
    sel = m.group(2)
    if sel.strip().startswith(('#', '.')) and 'data-composition-id' not in sel:
        line = src.count('\n', 0, m.start()) + 1
        warns.append(f"line ~{line}: bare GSAP selector '{sel}' — scope it via "
                     "Q(s)=>'[data-composition-id=\"main\"] '+s so it can't leak across compositions.")

for e in errors: print(f"  ERROR {e}", file=sys.stderr)
for w in warns:  print(f"  warn  {w}", file=sys.stderr)
if errors:
    print(f"[hf-guard] ❌ {len(errors)} ERROR(s), {len(warns)} warning(s) — fix ERRORs before render.", file=sys.stderr)
    sys.exit(1)
print(f"[hf-guard] ✓ no silent footguns ({len(warns)} warning(s))")
sys.exit(0)
PY
