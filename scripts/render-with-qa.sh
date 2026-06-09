#!/usr/bin/env bash
# render-with-qa.sh — the ONLY render path humans + agents should invoke.
#
# Wraps `npx hyperframes render` with the safety net that prevents the
# class of bugs that keep slipping through bare `hyperframes render`:
#
#   1. Pre-render static analysis  (scripts/hf-guard.sh)
#        • caption-at-top layout bug
#        • headline-overflow risk
#        • DOM-in-tl.call silent no-op
#        • bare GSAP selector leak
#
#   2. Render via HyperFrames CLI (warn-and-ship; NOT --strict — see note below)
#        • hf-guard (step 1) is the real blocking gate. HyperFrames' own
#          --strict lint has false positives on var(--font) indirection, so we
#          do NOT force it. Pass --strict yourself in "$@" to opt in.
#
#   3. Post-render visual artifacts
#        • scripts/qa-frames.py     — frame manifest for qa-correctness
#        • scripts/sanity-strip.sh  — instant 3-frame visual review
#
# Refuses to deliver if (1) finds an ERROR or (2) the render fails.
# Always produces the sanity strip even on render failure (helpful for debug).
#
#   Usage:
#     scripts/render-with-qa.sh <project-name>
#     scripts/render-with-qa.sh <project-name> -o <out.mp4>
#     scripts/render-with-qa.sh <project-name> --resolution=portrait-4k
#
# When invoked from inside a `new-run.sh` shell, RENDERS env var directs
# the output to the isolated run dir automatically.
#
set -euo pipefail

PROJ_ARG="${1:?usage: render-with-qa.sh <project-name> [hyperframes-render-args...]}"
shift || true

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Resolve project: accept either a bare name (projects/<name>) or a path.
if [ -d "$ROOT/projects/$PROJ_ARG" ]; then
  PROJ="$ROOT/projects/$PROJ_ARG"
elif [ -d "$PROJ_ARG" ]; then
  PROJ="$(cd "$PROJ_ARG" && pwd)"
else
  echo "[render-with-qa] project not found: $PROJ_ARG" >&2
  exit 2
fi

IDX="$PROJ/index.html"
[ -f "$IDX" ] || { echo "[render-with-qa] no index.html at: $IDX" >&2; exit 2; }

# Determine output path. If --output / -o not in args, default to a sensible
# location. Prefer the isolated $RENDERS dir if new-run.sh has been eval'd;
# otherwise $PROJ/renders/<name>-<timestamp>.mp4.
HAVE_OUTPUT=0
for a in "$@"; do
  case "$a" in
    -o|--output|-o=*|--output=*) HAVE_OUTPUT=1 ;;
  esac
done
OUT_DEFAULT=""
if [ $HAVE_OUTPUT -eq 0 ]; then
  PROJ_NAME="$(basename "$PROJ")"
  STAMP="$(date +%Y%m%d-%H%M%S)"
  if [ -n "${RENDERS:-}" ] && [ -d "${RENDERS:-/__nope__}" ]; then
    OUT_DEFAULT="$RENDERS/${PROJ_NAME}-${STAMP}.mp4"
  else
    mkdir -p "$PROJ/renders"
    OUT_DEFAULT="$PROJ/renders/${PROJ_NAME}-${STAMP}.mp4"
  fi
  set -- -o "$OUT_DEFAULT" "$@"
fi

# Recover the eventual output path for post-render artifacts.
OUT_PATH=""
PREV=""
for a in "$@"; do
  case "$PREV" in
    -o|--output) OUT_PATH="$a";;
  esac
  case "$a" in
    --output=*) OUT_PATH="${a#--output=}";;
    -o=*)       OUT_PATH="${a#-o=}";;
  esac
  PREV="$a"
done

echo "[render-with-qa] project: $PROJ"
echo "[render-with-qa] target:  $OUT_PATH"
echo "[render-with-qa] ── 1/3 hf-guard static analysis ──"
"$ROOT/scripts/hf-guard.sh" "$IDX" || {
  echo "[render-with-qa] ❌ hf-guard blocked the render. Fix the ERROR(s) above and retry." >&2
  exit 1
}

# hf-guard (step 1) is our REAL blocking gate — it catches the dangerous
# footguns HyperFrames' own lint MISSES (silent tl.call no-ops, caption-at-top,
# overflow). We do NOT force `--strict` here because HyperFrames' built-in lint
# has false positives on this template family (it flags `var(--display)` fonts
# as "missing @font-face" because it can't follow the CSS-variable indirection,
# even though the @font-face IS declared and the fonts render correctly).
# Opt into HyperFrames strict mode by passing --strict yourself in "$@".
echo "[render-with-qa] ── 2/3 hyperframes render ──"
( cd "$PROJ" && npx hyperframes render "$@" ) || {
  echo "[render-with-qa] ❌ hyperframes render failed. Generating sanity strip if a partial MP4 exists." >&2
  if [ -n "$OUT_PATH" ] && [ -s "$OUT_PATH" ]; then
    "$ROOT/scripts/sanity-strip.sh" "$OUT_PATH" || true
  fi
  exit 1
}

if [ -z "$OUT_PATH" ] || [ ! -s "$OUT_PATH" ]; then
  # hyperframes wrote elsewhere — try its default location
  CAND="$PROJ/renders/$(basename "$PROJ").mp4"
  [ -s "$CAND" ] && OUT_PATH="$CAND"
fi
if [ -z "$OUT_PATH" ] || [ ! -s "$OUT_PATH" ]; then
  echo "[render-with-qa] ❌ render reported success but no MP4 found." >&2
  exit 1
fi

echo "[render-with-qa] ── 3/3 visual sanity artifacts ──"
# 3a: frame manifest for the qa-correctness agent (if scenes.json exists)
SCENES_JSON=""
[ -f "$PROJ/work/scenes.json" ] && SCENES_JSON="--scenes $PROJ/work/scenes.json"
python3 "$ROOT/scripts/qa-frames.py" "$OUT_PATH" $SCENES_JSON --out "$(dirname "$OUT_PATH")" 2>&1 \
  | sed 's/^/  /'

# 3b: instant 3-frame strip (works regardless of scenes.json)
STRIP_PATH="${OUT_PATH%.*}-sanity.png"
"$ROOT/scripts/sanity-strip.sh" "$OUT_PATH" "$STRIP_PATH" 2>&1 | sed 's/^/  /'

SIZE=$(ls -lh "$OUT_PATH" | awk '{print $5}')
echo ""
echo "[render-with-qa] ✅ render + qa artifacts done"
echo "                 mp4:        $OUT_PATH ($SIZE)"
echo "                 sanity:     $STRIP_PATH"
echo "                 frames:     $(dirname "$OUT_PATH")/qa/"
echo ""
echo "Open the sanity strip to eyeball; pass it to qa-correctness for the formal gate."
