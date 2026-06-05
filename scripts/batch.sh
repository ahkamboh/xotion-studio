#!/usr/bin/env bash
# Apply one operation to many files at once.
# Usage: scripts/batch.sh <op> <out_dir> <file1> [file2 ...]
#   ops:  grade:<preset>   (teal-orange|warm|moody|vintage|clean|vibrant|bw|cine)
#         youtube          (encode to YouTube spec)
#         reel             (16:9 -> 9:16 blurred-pad vertical)
#         thumbnail        (grab a poster frame at 1s)
#         normalize        (loudness -14 LUFS)
set -euo pipefail
S="$(cd "$(dirname "$0")" && pwd)"
OP="${1:?op}"; OUT="${2:?out_dir}"; shift 2; mkdir -p "$OUT"
for f in "$@"; do
  b="$(basename "${f%.*}")"
  case "$OP" in
    grade:*) bash "$S/grade.sh" "$f" "$OUT/$b.mp4" "${OP#grade:}";;
    youtube) bash "$S/encode-youtube.sh" "$f" "$OUT/$b-yt.mp4";;
    thumbnail) bash "$S/thumbnail.sh" "$f" 1 "$OUT/$b.jpg";;
    normalize) bash "$S/normalize-audio.sh" "$f" "$OUT/$b.mp4";;
    reel) ffmpeg -y -i "$f" -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=30[bg];[0:v]scale=1080:-1:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2" -c:a copy -movflags +faststart "$OUT/$b-reel.mp4" -loglevel error;;
    *) echo "unknown op: $OP"; exit 1;;
  esac
  echo "  $OP -> $OUT/$b"
done
echo "[batch] $# files, op=$OP -> $OUT"
