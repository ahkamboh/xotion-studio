#!/usr/bin/env bash
# Automated mechanical QA gate for a render. Checks specs, lint, visual inspect, and
# extracts frames for the agent's visual acceptance review. Emits a PASS/FAIL report.
#
# Usage:
#   scripts/qa.sh <render.mp4> [--w W] [--h H] [--fps 30] [--dur SECONDS] [--project DIR] [--frames N]
#
# Exit code: 0 = all mechanical checks passed, 1 = at least one FAIL.
# NOTE: this gate handles the *mechanical* checks. The agent must still Read the extracted
# frames and confirm every user acceptance criterion is visually met before delivering.
set -uo pipefail
IN="${1:?usage: scripts/qa.sh render.mp4 [--w --h --fps --dur --project --frames]}"; shift || true
W=""; H=""; FPS=""; DUR=""; PROJ=""; NF=6
while [ "$#" -gt 0 ]; do case "$1" in
  --w) W="$2"; shift 2;; --h) H="$2"; shift 2;; --fps) FPS="$2"; shift 2;;
  --dur) DUR="$2"; shift 2;; --project) PROJ="$2"; shift 2;; --frames) NF="$2"; shift 2;;
  *) shift;; esac; done

fails=0
pass(){ echo "  ✓ $1"; }
fail(){ echo "  ✗ $1"; fails=$((fails+1)); }
near(){ awk -v a="$1" -v b="$2" -v t="${3:-0.6}" 'BEGIN{d=a-b;if(d<0)d=-d;exit !(d<=t)}'; }

echo "== QA: $IN =="
[ -f "$IN" ] || { echo "  ✗ file missing"; exit 1; }

# --- specs ---
aw=$(ffprobe -v error -select_streams v -show_entries stream=width  -of default=nk=1:nw=1 "$IN" | head -1)
ah=$(ffprobe -v error -select_streams v -show_entries stream=height -of default=nk=1:nw=1 "$IN" | head -1)
afps=$(ffprobe -v error -select_streams v -show_entries stream=r_frame_rate -of default=nk=1:nw=1 "$IN" | head -1 | awk -F/ '{printf "%.0f", ($2?$1/$2:$1)}')
adur=$(ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "$IN")
ahas_a=$(ffprobe -v error -select_streams a -show_entries stream=codec_type -of default=nk=1:nw=1 "$IN" | head -1)

echo "[specs] ${aw}x${ah} @ ${afps}fps  dur=${adur}s  audio=${ahas_a:-none}"
[ -n "$W" ]   && { [ "$aw" = "$W" ] && pass "width $aw" || fail "width $aw (want $W)"; }
[ -n "$H" ]   && { [ "$ah" = "$H" ] && pass "height $ah" || fail "height $ah (want $H)"; }
[ -n "$FPS" ] && { [ "$afps" = "$FPS" ] && pass "fps $afps" || fail "fps $afps (want $FPS)"; }
[ -n "$DUR" ] && { near "$adur" "$DUR" 0.6 && pass "duration ${adur}s" || fail "duration ${adur}s (want ${DUR}s)"; }

# --- not silent / not all-black (sample luminance) ---
mid=$(awk -v d="$adur" 'BEGIN{printf "%.1f", d/2}')
YAVG=$(ffmpeg -hide_banner -ss "$mid" -i "$IN" -frames:v 1 -vf "signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null - 2>&1 | grep -o "YAVG=[0-9.]*" | head -1 | cut -d= -f2)
if [ -n "${YAVG:-}" ]; then
  awk -v y="$YAVG" 'BEGIN{exit !(y>8)}' && pass "mid-frame not black (YAVG=$YAVG)" || fail "mid-frame near-black (YAVG=$YAVG) — render may be blank"
fi

# --- lint + inspect (if project given) ---
if [ -n "$PROJ" ] && [ -d "$PROJ" ]; then
  if (cd "$PROJ" && npx -y hyperframes lint 2>&1 | grep -q "0 errors"); then pass "lint 0 errors"; else fail "lint has errors (run: cd $PROJ && npx hyperframes lint)"; fi
  echo "  · running hyperframes inspect (visual overflow check)…"
  (cd "$PROJ" && npx -y hyperframes inspect --json 2>/dev/null | tail -c 600) || echo "    (inspect skipped)"
fi

# --- extract frames for the agent's visual acceptance review ---
OUTDIR="$(dirname "$IN")/../work"; mkdir -p "$OUTDIR"
echo "[frames] for visual review:"
for i in $(seq 1 "$NF"); do
  t=$(awk -v d="$adur" -v i="$i" -v n="$NF" 'BEGIN{printf "%.1f", d*i/(n+1)}')
  out="$OUTDIR/qa_$(printf '%02d' "$i")_${t}s.jpg"
  ffmpeg -y -ss "$t" -i "$IN" -frames:v 1 -vf scale=640:-1 "$out" -loglevel error && echo "  $out"
done

echo "== mechanical: $([ "$fails" -eq 0 ] && echo PASS || echo "FAIL ($fails)") =="
echo ">> Now READ the qa_*.jpg frames and confirm EVERY user acceptance criterion is visually met."
echo ">> Only deliver when mechanical=PASS AND every criterion is checked off. Otherwise fix + re-run."
[ "$fails" -eq 0 ]
