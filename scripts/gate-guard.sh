#!/usr/bin/env bash
# gate-guard.sh — PreToolUse(Bash) hook. Blocks writing a rendered .mp4 to a
# delivery destination (Downloads / output / deliver) UNLESS it goes through
# scripts/deliver.sh (which enforces the 4 ship gates). Harness-level guarantee
# that a deliverable cannot bypass the gates even if the Director forgets.
#
# Catches the destination across cp/mv/rsync/install, shell redirects (> >>),
# and tool outputs (ffmpeg/encode-youtube/-o) by inspecting the WRITE TARGET,
# so it is not fooled by the command verb. Reading an .mp4 FROM Downloads is
# allowed (the mp4 is a source, not the destination).
#
# Reads hook JSON on stdin; exit 0 = allow, exit 2 = block (stderr → model).
set -euo pipefail
INPUT="$(cat)"
python3 - "$INPUT" <<'PY'
import json, re, sys, shlex
try:
    cmd = (json.loads(sys.argv[1]).get('tool_input') or {}).get('command', '') or ''
except Exception:
    print(); sys.exit(0)

# Already routed through the enforced ship path → always allow.
if 'deliver.sh' in cmd:
    sys.exit(0)

SHIP_DEST = re.compile(r'(Downloads|/output\b|/deliver\b)', re.I)
def is_ship_mp4(tok):
    t = tok.strip().strip('"\'')
    return t.lower().endswith('.mp4') and SHIP_DEST.search(t) is not None

# Collect candidate WRITE TARGETS (not sources):
targets = []
# 1) shell redirect:  > dest  /  >> dest
for m in re.finditer(r'>>?\s*("[^"]+"|\'[^\']+\'|\S+)', cmd):
    targets.append(m.group(1))
# 2) explicit output flag:  -o dest  / --output dest
for m in re.finditer(r'(?:-o|--output)\s+("[^"]+"|\'[^\']+\'|\S+)', cmd):
    targets.append(m.group(1))
# 3) last token of each ;/&&/| segment = conventional destination for cp/mv/ffmpeg
#    (this allows `cp ~/Downloads/in.mp4 ./local` — source-from-Downloads — since
#     the last token there is the local dest, not a ship-mp4).
# 3b) for KNOWN shipping scripts (encode-youtube/cut-reels), the output mp4 may not
#     be the last arg (trailing TITLE), so check ALL their tokens.
SHIP_SCRIPTS = re.compile(r'(encode-youtube|cut-reels)\.sh')
for seg in re.split(r'[;&|]+', cmd):
    toks = seg.split()
    if not toks: continue
    targets.append(toks[-1])
    if SHIP_SCRIPTS.search(seg):
        targets.extend(toks)

if any(is_ship_mp4(t) for t in targets):
    sys.stderr.write(
        "BLOCKED by gate-guard: a rendered .mp4 may only reach a delivery "
        "destination via 'scripts/deliver.sh <work-dir> <final.mp4> <dest>', which "
        "refuses unless all 4 ship gates (qa-correctness, qa-richness, qa-audio, "
        "license-auditor) wrote status=pass. Direct cp/mv/ffmpeg/redirect to "
        "Downloads/output bypasses the gates and is not allowed.\n")
    sys.exit(2)
sys.exit(0)
PY
