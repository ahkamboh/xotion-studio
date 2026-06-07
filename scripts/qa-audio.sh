#!/usr/bin/env bash
# qa-audio.sh — audio mix QA gate. Reports PASS/FAIL on loudness, peak, clipping, silence.
# Usage: scripts/qa-audio.sh <video_or_audio> [out.json]
#   (targets: -14 LUFS +/-1.5, true-peak <= -1 dBTP)
# If [out.json] is given, writes {"status":"pass"|"fail",...} there so deliver.sh
# can machine-verify the gate (atomic write).
set -uo pipefail
F="${1:?usage: qa-audio.sh <file> [out.json]}"
OUTJSON="${2:-}"
[ -f "$F" ] || { echo "not found: $F"; exit 2; }
echo "[qa-audio] $F"
J=$(ffmpeg -hide_banner -i "$F" -af loudnorm=I=-14:TP=-1:LRA=11:print_format=json -f null - 2>&1 | awk '/^\{/{p=1} p{print} /^\}/{p=0}')
LUFS=$(echo "$J" | grep input_i      | head -1 | grep -oE '\-?[0-9.]+')
TP=$(echo "$J"   | grep input_tp     | head -1 | grep -oE '\-?[0-9.]+')
LRA=$(echo "$J"  | grep input_lra    | head -1 | grep -oE '\-?[0-9.]+')
THRESH=$(echo "$J"| grep input_thresh| head -1 | grep -oE '\-?[0-9.]+')
SIL=$(ffmpeg -hide_banner -i "$F" -af silencedetect=n=-35dB:d=1.2 -f null - 2>&1 | grep -c silence_start)
PASS=1
chk(){ awk "BEGIN{exit !($1)}"; }
printf "  integrated loudness : %s LUFS  (target -14)\n" "${LUFS:-?}"
printf "  true peak           : %s dBTP  (max -1)\n" "${TP:-?}"
printf "  loudness range      : %s LU\n" "${LRA:-?}"
printf "  long silences (>1.2s): %s\n" "${SIL:-0}"
[ -n "${LUFS:-}" ] && chk "$LUFS >= -16 && $LUFS <= -12" || { echo "  ✗ loudness off target (want -14±2)"; PASS=0; }
[ -n "${TP:-}" ]   && chk "$TP <= -0.5" || { echo "  ✗ true peak too hot / clipping risk (>-0.5 dBTP)"; PASS=0; }
[ "${SIL:-0}" -le 2 ] || { echo "  ✗ too many long silences ($SIL) — check VO gaps"; PASS=0; }
STATUS=$([ "$PASS" = 1 ] && echo pass || echo fail)
if [ -n "$OUTJSON" ]; then
  TMP="$OUTJSON.tmp.$$"
  printf '{"status":"%s","lufs":"%s","true_peak":"%s","lra":"%s","long_silences":%s}\n' \
    "$STATUS" "${LUFS:-}" "${TP:-}" "${LRA:-}" "${SIL:-0}" > "$TMP" && mv -f "$TMP" "$OUTJSON"
fi
if [ "$PASS" = 1 ]; then echo "  ✅ AUDIO QA PASS"; exit 0; else echo "  ❌ AUDIO QA FAIL — fix the mix (scripts/mix-audio.sh / normalize-audio.sh)"; exit 1; fi
