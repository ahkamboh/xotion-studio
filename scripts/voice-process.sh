#!/usr/bin/env bash
# voice-process.sh — turn raw Kokoro TTS into a broadcast-grade VO with the
# 4-stage chain pros use: high-pass → compress → presence EQ → de-ess.
# This is what makes synthetic TTS read as a hired narrator instead of a robot.
# (The pipeline had NO voice processing before — raw WAV went straight to the mix.)
#
#   scripts/voice-process.sh <in.wav> <out.wav> [profile]
#   profile: house (default) | warm | hype | cinematic
#
# Profiles map to the motion-kit voice spec:
#   house     — narrated-explainer / product (neutral, clear)
#   warm      — brand-story / wellness (body + softer)
#   hype      — promo / social (aggressive, cuts a loud bed)
#   cinematic — trailer / cinematic-intro (deep, chest body, slow)
set -euo pipefail
IN="${1:?usage: voice-process.sh <in.wav> <out.wav> [house|warm|hype|cinematic]}"
OUT="${2:?need output path}"
PROFILE="${3:-house}"
[ -f "$IN" ] || { echo "[voice-process] not found: $IN" >&2; exit 1; }

# Per-profile: HPF Hz | comp threshold:ratio:attack:release:makeup | presence f:gain | deess(7k) cut | extra low-shelf
case "$PROFILE" in
  house)     HPF=85;  COMP="threshold=-20dB:ratio=2.5:attack=15:release=180:makeup=3"; PRES="4500:3"; DEESS="-4"; LOWSH="";;
  warm)      HPF=90;  COMP="threshold=-20dB:ratio=3:attack=12:release=180:makeup=3";   PRES="4000:2"; DEESS="-3"; LOWSH="equalizer=f=120:width_type=q:w=0.9:g=2,";;
  hype)      HPF=100; COMP="threshold=-22dB:ratio=4:attack=8:release=120:makeup=5";    PRES="5000:5"; DEESS="-5"; LOWSH="";;
  cinematic) HPF=80;  COMP="threshold=-18dB:ratio=3:attack=12:release=350:makeup=3";   PRES="4200:3"; DEESS="-4"; LOWSH="equalizer=f=110:width_type=q:w=0.9:g=3,";;
  *) echo "[voice-process] unknown profile '$PROFILE' (house|warm|hype|cinematic)" >&2; exit 2;;
esac
PF="${PRES%%:*}"; PG="${PRES##*:}"   # presence freq / gain
AIR=""; [ "$PROFILE" = "hype" ] && AIR="equalizer=f=12000:width_type=q:w=0.7:g=2,"

# chain: HPF → low-shelf(opt) → compress → presence boost → de-ess(7kHz dynamic-ish cut) → air(opt) → safety limiter
ffmpeg -y -i "$IN" -af "\
highpass=f=${HPF},\
${LOWSH}\
acompressor=${COMP},\
equalizer=f=${PF}:width_type=q:w=1.2:g=${PG},\
deesser=i=0.5:m=0.5:f=0.5,\
equalizer=f=7000:width_type=q:w=1.5:g=${DEESS},\
${AIR}\
alimiter=limit=0.95" \
  -ar 48000 -ac 1 -c:a pcm_s16le "$OUT" -loglevel error 2>/dev/null || {
  # fallback if 'deesser' filter unavailable in this ffmpeg build — drop it, rely on the 7k EQ cut
  ffmpeg -y -i "$IN" -af "\
highpass=f=${HPF},\
${LOWSH}\
acompressor=${COMP},\
equalizer=f=${PF}:width_type=q:w=1.2:g=${PG},\
equalizer=f=7000:width_type=q:w=1.5:g=${DEESS},\
${AIR}\
alimiter=limit=0.95" \
    -ar 48000 -ac 1 -c:a pcm_s16le "$OUT" -loglevel error
}
echo "[voice-process] ${PROFILE} chain (HPF ${HPF} · comp · +${PG}dB@${PF} · de-ess) -> $OUT"
