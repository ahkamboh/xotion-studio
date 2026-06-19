#!/usr/bin/env bash
# make-song.sh — turn ONE song + ONE bg image into an upload-ready KAMBOJH visualizer.
#
#   scripts/make-song.sh <song.mp3> <bg.jpg> "TITLE" "SUBTITLE" "Output Name" [--trim]
#
# Example:
#   scripts/make-song.sh ~/Downloads/"blurred dream.mp3" ~/Downloads/cover.jpg \
#       "BLURRED DREAM" "Official Visualizer" "Blurred Dream - KAMBOJH"
#
# --trim  removes leading silence (punchier start).
# Output lands in projects/visualizer/renders/<Output Name>.mp4 (1080p, YouTube spec).
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="projects/visualizer"; A="$ROOT/assets"

SONG="${1:?need <song.mp3>}"; BG="${2:?need <bg.jpg>}"
TITLE="${3:?need \"TITLE\"}"; SUB="${4:-Official Visualizer}"; NAME="${5:?need \"Output Name\"}"
TRIM=0; [ "${6:-}" = "--trim" ] && TRIM=1
[ -f "$SONG" ] || { echo "song not found: $SONG" >&2; exit 1; }
[ -f "$BG" ]   || { echo "bg not found: $BG" >&2; exit 1; }

echo "[1/5] bg + song -> assets"
[ "$(cd "$(dirname "$BG")"&&pwd)/$(basename "$BG")" = "$(cd "$A"&&pwd)/bg.jpg" ] || cp -f "$BG" "$A/bg.jpg"
if [ "$TRIM" = 1 ]; then
  ffmpeg -y -i "$SONG" -af "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15" -c:a libmp3lame -q:a 2 "$A/song.mp3" -loglevel error
else
  ffmpeg -y -i "$SONG" -c:a libmp3lame -q:a 2 "$A/song.mp3" -loglevel error
fi

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$A/song.mp3")
echo "[2/5] duration ${DUR}s -> song.js"
printf 'window.__TITLE=%s;\nwindow.__SUBTITLE=%s;\nwindow.__DUR=%s;\n' \
  "$(python3 -c "import json,sys;print(json.dumps(sys.argv[1]))" "$TITLE")" \
  "$(python3 -c "import json,sys;print(json.dumps(sys.argv[1]))" "$SUB")" \
  "$DUR" > "$A/song.js"
# keep data-duration attribute in sync (hyperframes reads it)
python3 - "$ROOT/index.html" "$DUR" <<'PY'
import re,sys
p,dur=sys.argv[1],sys.argv[2]
s=open(p).read()
s=re.sub(r'(data-composition-id="main"[^>]*?data-duration=")[0-9.]+(")', r'\g<1>'+dur+r'\g<2>', s, count=1)
open(p,'w').write(s)
PY

echo "[3/5] amplitude envelope -> amp.js"
python3 scripts/amplitude.py "$A/song.mp3" --out "$A/amp.js" --hz 10 >/dev/null

echo "[4/5] render frames (1080p)"
mkdir -p "$ROOT/renders"
SILENT="$ROOT/renders/.silent.mp4"
node_modules/.bin/hyperframes render "$ROOT" --output "$SILENT" --fps 30 >/dev/null

echo "[5/5] mux song + encode (YouTube spec)"
OUT="$ROOT/renders/$NAME.mp4"
ffmpeg -y -i "$SILENT" -i "$A/song.mp3" \
  -map 0:v:0 -map 1:a:0 -shortest \
  -c:v libx264 -profile:v high -level 4.2 -preset slow -crf 18 \
  -b:v 8M -maxrate 12M -bufsize 16M -pix_fmt yuv420p -g 60 -keyint_min 60 -sc_threshold 0 \
  -movflags +faststart -c:a aac -b:a 320k -ar 48000 -ac 2 \
  -metadata title="$NAME" "$OUT" -loglevel error
rm -f "$SILENT"
echo "✅ DONE -> $OUT"
