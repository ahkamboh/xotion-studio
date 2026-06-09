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
#   3. ERROR — caption-at-top layout bug: a `<div class="layer ...">` with an
#      inline `bottom:Npx` style. Because `.scene .layer{ inset:0 }` pins top:0
#      too, the bottom override only collapses the box from below — text flows
#      from the TOP of a 1700+px box. Symptom: captions/signoffs appear at the
#      top of the frame instead of the bottom. Fix: wrap in Anchor() (see
#      templates/lib/layout.js).
#   4. WARN — large-font overflow risk: any `font-size:NNNpx` ≥ 100px that is
#      NOT wrapped in a FitDisplay or .fit-display container. At 1080×1920 a
#      200px headline can exceed the safe area; FitDisplay auto-scales after
#      fonts.ready. Symptom: "Hook fast."-style clipping at frame edges.
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

# The genuine footgun is CREATING a new node at playback and then expecting a
# pre-declared GSAP tween to animate it (GSAP resolved its selector at
# construction time → silent no-op). We must NOT flag the LEGITIMATE and
# explicitly-endorsed caption-swap pattern: setting `.innerHTML` on a
# PRE-RENDERED element (e.g. #cap-text) whose CONTAINER is animated separately.
#
#   FOOTGUN (ERROR):  createElement(...) + appendChild/insertBefore/.after(...)  → new node inserted
#                     insertAdjacentHTML(...)                                      → new nodes parsed+inserted
#   ENDORSED (WARN):  el.innerHTML = html   on an existing element (caption text swap)
NODE_CREATE   = re.compile(r'createElement\s*\(')
NODE_INSERT   = re.compile(r'appendChild\s*\(|\.append\s*\(|insertAdjacentElement\s*\(|insertBefore\s*\(|\.before\s*\(|\.after\s*\(|\.replaceWith\s*\(|\.prepend\s*\(')
INSERT_HTML   = re.compile(r'insertAdjacentHTML\s*\(')
INNER_SWAP    = re.compile(r'\.(?:inner|outer)HTML\s*=')

# 1) DOM creation inside a .call(...) callback — scan each ".call(" and read its
#    balanced-paren argument region, then classify what it does.
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
    line = src.count('\n', 0, m.start()) + 1
    creates_and_inserts = NODE_CREATE.search(body) and NODE_INSERT.search(body)
    inserts_html        = INSERT_HTML.search(body)
    if creates_and_inserts or inserts_html:
        errors.append(f"line ~{line}: NEW DOM node created+inserted inside a .call() callback — "
                      "GSAP resolved selectors at construction time, so any pre-declared tween "
                      "targeting it is a silent no-op (it appears but never animates). "
                      "Pre-render the element into the DOM, then animate the existing node.")
    elif INNER_SWAP.search(body):
        # Endorsed caption-swap pattern when the target is pre-rendered. Surface
        # as a WARNING so a human can confirm the element exists and only its
        # text is swapped (not animated children).
        warns.append(f"line ~{line}: innerHTML/outerHTML swap inside a .call() callback — OK only if "
                     "the target element is PRE-RENDERED and you animate its container (not the "
                     "replaced children). If you're swapping caption text on an existing node, this is fine.")

# 2) bare string selector in a GSAP tween (not Q(...)-scoped, no data-composition-id)
for m in re.finditer(r'''(?:gsap|tl)\s*\.\s*(?:to|from|fromTo|set|add)\s*\(\s*(['"])([^'"]+)\1''', src):
    sel = m.group(2)
    if sel.strip().startswith(('#', '.')) and 'data-composition-id' not in sel:
        line = src.count('\n', 0, m.start()) + 1
        warns.append(f"line ~{line}: bare GSAP selector '{sel}' — scope it via "
                     "Q(s)=>'[data-composition-id=\"main\"] '+s so it can't leak across compositions.")

# 3) ERROR — caption-at-top bug. `<.. class="layer ..." style="..bottom:Npx..">`
#    Because `.scene .layer{ inset:0 }` pins top:0 too, the bottom override
#    creates a giant top-anchored box and text flows from the top. Recognised
#    fixes: wrapping in Anchor() (we look for class="anchor" or data-anchor),
#    or explicit top:auto in the inline style. Scope: built `class="layer"`
#    tags only — we deliberately skip the .scene .layer base CSS rule itself.
LAYER_OPEN = re.compile(r'<[a-zA-Z][^<>]*\bclass\s*=\s*"([^"]*\blayer\b[^"]*)"[^<>]*>')
for m in LAYER_OPEN.finditer(src):
    tag = m.group(0)
    cls = m.group(1)
    if 'anchor' in cls or 'fit-display' in cls:  # already using a safe primitive
        continue
    sty_m = re.search(r'\bstyle\s*=\s*"([^"]*)"', tag)
    if not sty_m: continue
    style = sty_m.group(1)
    has_bottom = re.search(r'(?:^|;|\s)bottom\s*:\s*[^;]+', style)
    has_top_auto = re.search(r'(?:^|;|\s)top\s*:\s*auto', style)
    if has_bottom and not has_top_auto:
        line = src.count('\n', 0, m.start()) + 1
        errors.append(f"line ~{line}: caption-at-top bug — `class=\"layer\"` + inline `bottom:` "
                      "without `top:auto`. The .layer{inset:0} base rule pins top:0 too, so the "
                      "box stretches top:0 → bottom:N and text flows from the top. "
                      "Fix: wrap in Anchor({where:'bottom', offset:N}, ...) or add `top:auto` to "
                      "the inline style.")

# 4) WARN — large display headline that's not auto-fit. Any inline `font-size:Npx`
#    with N >= 100 that isn't inside a FitDisplay (class="fit-display") or wrapped
#    in `white-space:nowrap` + max-width:Mpx. At 1080×1920 a hard-coded large size
#    can overflow the safe area; FitDisplay scales it after fonts.ready.
#
#    EXEMPTION: if the file ships its own runtime auto-fit pass — autofitBig(),
#    fitAllDisplays(), or includes layout.js / FitDisplay() — every big headline
#    is shrunk to the safe area at boot, so the static warning is a false alarm.
HAS_AUTOFIT = bool(re.search(r'\bautofitBig\s*\(|\bfitAllDisplays\s*\(|\bFitDisplay\s*\(|layout\.js', src))
for m in re.finditer(r'font-size\s*:\s*(\d{2,4})\s*px', src):
    px = int(m.group(1))
    if px < 100: continue
    if HAS_AUTOFIT: continue  # template auto-fits all big type at runtime
    # Look back ~600 chars for a fit-display class on the enclosing element
    window = src[max(0, m.start()-600):m.start()]
    if 'class="fit-display"' in window or "class='fit-display'" in window or 'FitDisplay(' in window:
        continue
    # Tolerate explicit `max-width` or `transform:scale(` on the same span
    surround = src[max(0, m.start()-200):min(len(src), m.start()+200)]
    if re.search(r'max-width\s*:\s*\d+', surround) or 'transform:scale(' in surround:
        continue
    line = src.count('\n', 0, m.start()) + 1
    warns.append(f"line ~{line}: large headline `font-size:{px}px` without FitDisplay — risks "
                 "overflowing the safe area on long copy. Wrap with FitDisplay() "
                 "(templates/lib/layout.js) so it auto-shrinks after fonts.ready.")

for e in errors: print(f"  ERROR {e}", file=sys.stderr)
for w in warns:  print(f"  warn  {w}", file=sys.stderr)
if errors:
    print(f"[hf-guard] ❌ {len(errors)} ERROR(s), {len(warns)} warning(s) — fix ERRORs before render.", file=sys.stderr)
    sys.exit(1)
print(f"[hf-guard] ✓ no silent footguns ({len(warns)} warning(s))")
sys.exit(0)
PY
