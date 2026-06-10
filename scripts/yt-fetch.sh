#!/usr/bin/env bash
# yt-fetch.sh — bring a YouTube video into the engine, gate-compliant.
#
#   scripts/yt-fetch.sh <url> <out.mp4> [--subs] [--lang en] [--reencode] [--audio-only]
#
# What it does:
#   1. Downloads the best MP4 (h264+m4a preferred — plays everywhere in the pipeline).
#   2. Writes the MANDATORY license sidecar <out>.license.json (license-auditor reads it).
#      • Creative-Commons videos → license recorded as such (commercial-OK).
#      • Standard YouTube License → marked user-provided-attested + requires_attestation:true.
#        The Director MUST confirm the user owns/has rights to the footage (typical use:
#        repurposing YOUR OWN long-form into Shorts). The gate stays honest.
#   3. --subs: also fetches subtitles as .srt next to the video (manual subs if the
#      channel uploaded them, else YouTube auto-captions). NOTE: for caption-grade
#      word timing, still run scripts/caption.py on the media — YouTube subs are
#      line-level, not word-level. The .srt here is for reference/translation seeds.
#   4. --reencode: keyframe-dense re-encode (g=30) so the clip scrubs frame-accurately
#      as a <video class="clip"> source in HyperFrames (per CLAUDE.md source-video rule).
#   5. --audio-only: m4a audio only (podcast → reels workflows).
#
# The "paste a link → Shorts" chain after this script:
#   yt-fetch.sh URL work/source.mp4 --subs
#   python3 scripts/transcribe.py work/source.mp4 --model small
#   python3 scripts/find-hooks.py work/source.wav work/segments.json --n 12 --len 18
#   scripts/cut-reels.sh work/source.mp4 work/segments.txt out/
#   python3 scripts/caption.py out/reel_01.mp4 --style karaoke --preset hormozi ...
#
set -euo pipefail

URL="${1:?usage: yt-fetch.sh <url> <out.mp4> [--subs] [--lang en] [--reencode] [--audio-only] [--max-height N] [--cookies <browser>]}"
OUT="${2:?usage: yt-fetch.sh <url> <out.mp4> [--subs] [--lang en] [--reencode] [--audio-only] [--max-height N] [--cookies <browser>]}"
shift 2

SUBS=0; LANG_CODE="en"; REENCODE=0; AUDIO_ONLY=0; MAX_H=""; COOKIES_BROWSER=""
while [ $# -gt 0 ]; do
  case "$1" in
    --subs) SUBS=1 ;;
    --lang) LANG_CODE="${2:?--lang needs a code}"; shift ;;
    --lang=*) LANG_CODE="${1#--lang=}" ;;
    --reencode) REENCODE=1 ;;
    --audio-only) AUDIO_ONLY=1 ;;
    --max-height) MAX_H="${2:?--max-height needs a number}"; shift ;;
    --max-height=*) MAX_H="${1#--max-height=}" ;;
    --cookies) COOKIES_BROWSER="${2:?--cookies needs a browser name}"; shift ;;
    --cookies=*) COOKIES_BROWSER="${1#--cookies=}" ;;
    *) echo "[yt-fetch] unknown flag: $1" >&2; exit 2 ;;
  esac
  shift
done

command -v yt-dlp >/dev/null || { echo "[yt-fetch] yt-dlp not installed (brew install yt-dlp)" >&2; exit 3; }
mkdir -p "$(dirname "$OUT")"

# Flags are plain strings, not arrays — bash 3.2 (macOS default) dies expanding
# an empty array under `set -u`. All values are space-free.
#
# YouTube's bot wall (2026) blocks the default client from many IPs — even with
# browser cookies. Empirically the mweb/tv player clients pass. Strategy ladder:
#   1. as-given (with --cookies browser if the caller passed one)
#   2. mweb,tv player clients
#   3. Chrome cookies + mweb,tv
# Whichever rung fetches metadata is reused for the download + subs calls.
BASE_FLAGS=""
[ -n "$COOKIES_BROWSER" ] && BASE_FLAGS="--cookies-from-browser $COOKIES_BROWSER"

ok_json() { [ -n "$1" ] && [ "$1" != "null" ]; }
try_meta() { yt-dlp --no-warnings -J --no-playlist $1 "$URL" 2>/dev/null || true; }

WORK_FLAGS="$BASE_FLAGS"
META_JSON="$(try_meta "$WORK_FLAGS")"
if ! ok_json "$META_JSON"; then
  echo "[yt-fetch] default client blocked — trying mweb/tv player client…"
  WORK_FLAGS="$BASE_FLAGS --extractor-args youtube:player_client=mweb,tv"
  META_JSON="$(try_meta "$WORK_FLAGS")"
fi
if ! ok_json "$META_JSON" && [ -z "$COOKIES_BROWSER" ]; then
  echo "[yt-fetch] still blocked — trying Chrome cookies…"
  WORK_FLAGS="--cookies-from-browser chrome --extractor-args youtube:player_client=mweb,tv"
  META_JSON="$(try_meta "$WORK_FLAGS")"
fi
ok_json "$META_JSON" || { echo "[yt-fetch] could not fetch metadata — YouTube blocked all strategies (try --cookies safari|firefox, or a VPN)" >&2; exit 5; }
TITLE=$(echo "$META_JSON"   | python3 -c 'import json,sys; print(json.load(sys.stdin).get("title",""))')
CHANNEL=$(echo "$META_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("channel") or json.load(sys.stdin).get("uploader",""))' 2>/dev/null \
  || echo "$META_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("uploader",""))')
YT_LICENSE=$(echo "$META_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("license") or "Standard YouTube License")')
VIDEO_ID=$(echo "$META_JSON"  | python3 -c 'import json,sys; print(json.load(sys.stdin).get("id",""))')
DURATION=$(echo "$META_JSON"  | python3 -c 'import json,sys; print(json.load(sys.stdin).get("duration",0))')

echo "[yt-fetch] \"$TITLE\" — $CHANNEL (${DURATION}s) · license: $YT_LICENSE"

# ── 2. download ──────────────────────────────────────────────────────────────
HCAP=""
[ -n "$MAX_H" ] && HCAP="[height<=$MAX_H]"
if [ "$AUDIO_ONLY" = 1 ]; then
  yt-dlp --no-warnings --no-playlist $WORK_FLAGS -f "ba[ext=m4a]/ba" -o "$OUT" "$URL"
else
  # h264 mp4 + m4a preferred: plays in <video> tags, QuickTime, and every ffmpeg path
  yt-dlp --no-warnings --no-playlist $WORK_FLAGS \
    -f "bv*[ext=mp4][vcodec^=avc1]${HCAP}+ba[ext=m4a]/b[ext=mp4]${HCAP}/b${HCAP}/b" \
    --merge-output-format mp4 \
    -o "$OUT" "$URL"
fi
[ -s "$OUT" ] || { echo "[yt-fetch] download produced no file" >&2; exit 4; }

# ── 3. subtitles (optional) ──────────────────────────────────────────────────
if [ "$SUBS" = 1 ]; then
  SRT_BASE="${OUT%.*}"
  # manual subs first, then auto-captions; convert to srt
  yt-dlp --no-warnings --no-playlist $WORK_FLAGS --skip-download \
    --write-subs --write-auto-subs --sub-langs "$LANG_CODE" --convert-subs srt \
    -o "$SRT_BASE" "$URL" || true
  FOUND_SRT=$(ls "${SRT_BASE}"*.srt 2>/dev/null | head -1 || true)
  if [ -n "$FOUND_SRT" ]; then
    mv "$FOUND_SRT" "${SRT_BASE}.srt" 2>/dev/null || true
    echo "[yt-fetch] subs → ${SRT_BASE}.srt"
  else
    echo "[yt-fetch] no subs available for lang=$LANG_CODE (use scripts/caption.py for word-level timing)"
  fi
fi

# ── 4. license sidecar (license-auditor reads this; fail-closed gate) ───────
IS_CC=0
case "$YT_LICENSE" in *Creative\ Commons*|*creative\ commons*) IS_CC=1 ;; esac
python3 - "$OUT" <<PY
import json, sys, os
out = sys.argv[1]
is_cc = $IS_CC
sidecar = {
  "source": "youtube",
  "source_url": "https://www.youtube.com/watch?v=$VIDEO_ID",
  "title": """$TITLE""",
  "uploader": """$CHANNEL""",
  "license": "$YT_LICENSE",
  # CC-BY on YouTube is commercial-OK with attribution. Standard license means the
  # user must own or have rights to the footage (their own channel / licensed).
  "attestation": "cc-by-youtube" if is_cc else "user-provided-attested",
  "requires_attestation": (not is_cc),
  "note": "" if is_cc else "Standard YouTube License: Director must confirm the user owns/has rights to this footage before delivery (typical: repurposing the user's own long-form)."
}
with open(out + ".license.json", "w") as f:
    json.dump(sidecar, f, indent=2)
print(f"[yt-fetch] sidecar → {out}.license.json  (attestation: {sidecar['attestation']})")
PY

# ── 5. optional keyframe-dense re-encode for HyperFrames timeline use ───────
if [ "$REENCODE" = 1 ] && [ "$AUDIO_ONLY" = 0 ]; then
  TMP="${OUT%.*}.reenc.mp4"
  echo "[yt-fetch] re-encoding with dense keyframes (g=30) for frame-accurate scrubbing…"
  ffmpeg -y -loglevel error -i "$OUT" \
    -c:v libx264 -r 30 -g 30 -keyint_min 30 -crf 18 -pix_fmt yuv420p \
    -c:a aac -b:a 192k -movflags +faststart "$TMP"
  mv "$TMP" "$OUT"
fi

SIZE=$(ls -lh "$OUT" | awk '{print $5}')
echo "[yt-fetch] done → $OUT ($SIZE)"
