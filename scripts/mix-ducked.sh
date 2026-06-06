#!/usr/bin/env bash
# mix-ducked.sh — mix VO + music with sidechain ducking; master to -14 LUFS.
#
#   scripts/mix-ducked.sh <vo.wav> <music.mp3|wav> <master.wav> [music_gain=0.5]
#
# What it does (per the audio-engineer agent spec):
#   1. Trim/loop music to exact VO duration.
#   2. 0.5s fade-in, 1.5s fade-out on the music.
#   3. Apply user-set base gain to the music.
#   4. SIDECHAIN COMPRESS the music using VO as the trigger so it drops
#      8–12 dB whenever VO is present, recovers in gaps. (Real ducking,
#      not a static volume cut.)
#   5. Mix VO + ducked music.
#   6. loudnorm to -14 LUFS / -1 dBTP.
#
# Targets: VO ≈ -3 dBFS peak, ducked music ≈ -18 to -22 dBFS under VO.
set -euo pipefail
VO="${1:?usage: mix-ducked.sh <vo.wav> <music> <master.wav> [music_gain=0.5]}"
MUSIC="${2:?need music input}"
OUT="${3:?need master.wav output}"
MUSIC_GAIN="${4:-0.5}"

[ -f "$VO"    ] || { echo "VO not found: $VO" >&2; exit 1; }
[ -f "$MUSIC" ] || { echo "music not found: $MUSIC" >&2; exit 1; }

VO_DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$VO")
FADE_OUT_START=$(python3 -c "print(max(0, ${VO_DUR}-1.5))")
echo "[mix-ducked] vo=${VO_DUR}s music_gain=${MUSIC_GAIN} sidechain compress threshold=0.04 ratio=8 → ${OUT}"

# Sidechain compress: the 2nd input (music) is compressed when the 1st input (VO) exceeds threshold.
# Ratio 8, attack 20ms, release 400ms = transparent broadcast ducking.
ffmpeg -y \
  -i "$VO" -i "$MUSIC" \
  -filter_complex "
    [1:a]aloop=loop=-1:size=2147483647,atrim=0:${VO_DUR},
         afade=t=in:st=0:d=0.5,afade=t=out:st=${FADE_OUT_START}:d=1.5,
         volume=${MUSIC_GAIN},aresample=48000[mraw];
    [0:a]aresample=48000[vraw];
    [mraw][vraw]sidechaincompress=threshold=0.04:ratio=8:attack=20:release=400:makeup=1[mducked];
    [vraw][mducked]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0[premix];
    [premix]loudnorm=I=-14:TP=-1.0:LRA=11[out]
  " \
  -map "[out]" -ar 48000 -ac 2 -c:a pcm_s16le \
  "$OUT" -loglevel warning
echo "[mix-ducked] master → $OUT"
