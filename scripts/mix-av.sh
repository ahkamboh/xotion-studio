#!/usr/bin/env bash
# mix-av.sh — the full motion-graphics audio mixer: VO + music + SFX in one pass.
# Music ducks under VO (sidechain), SFX are placed at motion-hit timestamps AND
# also duck under VO so the voice ALWAYS wins (the gap mix-ducked.sh left open),
# everything padded to the exact video duration, mastered to -14 LUFS.
#
#   scripts/mix-av.sh <out.wav> <duration> [--vo vo.wav] [--music bed.mp3 [gain]] \
#                     [--sfx "t:file[:gain],t:file[:gain],..."]
#
# Examples:
#   mix-av.sh master.wav 12 --vo vo.wav --music bed.mp3 0.55 --sfx "0.5:impact.mp3,3.0:whoosh.mp3:0.6"
#   mix-av.sh master.wav 8  --music bed.mp3 0.9                 # music-only
#
# VO should already be processed by voice-process.sh. SFX gains default 0.7.
set -euo pipefail
OUT="${1:?usage: mix-av.sh <out.wav> <duration> [--vo f] [--music f [gain]] [--sfx spec]}"
DUR="${2:?need duration seconds}"
shift 2
VO=""; MUSIC=""; MGAIN="0.55"; SFX=""
while [ $# -gt 0 ]; do
  case "$1" in
    --vo) VO="$2"; shift 2;;
    --music) MUSIC="$2"; shift 2; if [ $# -gt 0 ] && [[ "$1" =~ ^[0-9.]+$ ]]; then MGAIN="$1"; shift; fi;;
    --sfx) SFX="$2"; shift 2;;
    *) echo "[mix-av] unknown arg: $1" >&2; exit 2;;
  esac
done

INPUTS=(); FILT=""; NIN=0; _IDX=0
# NOTE: must NOT run in a subshell ($(...)) or the array mutation is lost — set a global _IDX.
addin(){ INPUTS+=(-i "$1"); _IDX=$NIN; NIN=$((NIN+1)); }

# VO bus (index if present)
VO_IDX=""
if [ -n "$VO" ]; then [ -f "$VO" ] || { echo "[mix-av] VO not found: $VO" >&2; exit 1; }; addin "$VO"; VO_IDX=$_IDX; fi
# Music
MU_IDX=""
if [ -n "$MUSIC" ]; then [ -f "$MUSIC" ] || { echo "[mix-av] music not found: $MUSIC" >&2; exit 1; }; addin "$MUSIC"; MU_IDX=$_IDX; fi
# SFX inputs
SFX_IDX=(); SFX_T=(); SFX_G=()
if [ -n "$SFX" ]; then
  IFS=',' read -ra ITEMS <<< "$SFX"
  for it in "${ITEMS[@]}"; do
    t="${it%%:*}"; rest="${it#*:}"; f="${rest%%:*}"; g="0.7"
    case "$rest" in *:*) g="${rest##*:}";; esac
    [ -f "$f" ] || { echo "[mix-av] SFX not found: $f" >&2; exit 1; }
    addin "$f"; SFX_IDX+=("$_IDX"); SFX_T+=("$t"); SFX_G+=("$g")
  done
fi

FO=$(python3 -c "print(max(0,$DUR-1.5))")

# Build filter graph
# music → trim/loop/pad to DUR, fades, gain
if [ -n "$MU_IDX" ]; then
  FILT+="[${MU_IDX}:a]aloop=loop=-1:size=2147483647,atrim=0:${DUR},afade=t=in:st=0:d=0.5,afade=t=out:st=${FO}:d=1.5,volume=${MGAIN},aresample=48000[mus];"
fi
# sfx → delay each to its time*1000ms, gain, then mix into one sfx bus
SFXMIX=""
for i in "${!SFX_IDX[@]}"; do
  ms=$(python3 -c "print(int(float(${SFX_T[$i]})*1000))")
  FILT+="[${SFX_IDX[$i]}:a]adelay=${ms}|${ms},volume=${SFX_G[$i]},aresample=48000[sfx${i}];"
  SFXMIX+="[sfx${i}]"
done
if [ -n "$SFXMIX" ]; then
  n=${#SFX_IDX[@]}
  FILT+="${SFXMIX}amix=inputs=${n}:duration=longest:normalize=0[sfxbus];"
fi

if [ -n "$VO_IDX" ]; then
  FILT+="[${VO_IDX}:a]aresample=48000,apad=whole_dur=${DUR}[vo];"
  # duck music under VO
  if [ -n "$MU_IDX" ]; then FILT+="[mus][vo]sidechaincompress=threshold=0.04:ratio=8:attack=20:release=400:makeup=1[musd];"; else FILT+="anullsrc=r=48000:cl=mono,atrim=0:${DUR}[musd];"; fi
  # duck SFX lightly under VO (keeps them present but never burying the voice)
  if [ -n "$SFXMIX" ]; then FILT+="[sfxbus][vo]sidechaincompress=threshold=0.06:ratio=4:attack=5:release=250:makeup=1[sfxd];"; else FILT+="anullsrc=r=48000:cl=mono,atrim=0:${DUR}[sfxd];"; fi
  FILT+="[vo][musd][sfxd]amix=inputs=3:duration=first:normalize=0[premix];"
else
  # no VO — music + sfx only
  if [ -n "$MU_IDX" ]; then BASE="[mus]"; else FILT+="anullsrc=r=48000:cl=stereo,atrim=0:${DUR}[mus];"; BASE="[mus]"; fi
  if [ -n "$SFXMIX" ]; then FILT+="${BASE}[sfxbus]amix=inputs=2:duration=first:normalize=0[premix];"; else FILT+="${BASE}apad=whole_dur=${DUR}[premix];"; fi
fi
FILT+="[premix]apad=whole_dur=${DUR},atrim=0:${DUR},loudnorm=I=-14:TP=-1.5:LRA=11[out]"

ffmpeg -y "${INPUTS[@]}" -filter_complex "$FILT" -map "[out]" -ar 48000 -ac 2 -c:a pcm_s16le "$OUT" -loglevel error
echo "[mix-av] ${DUR}s  vo=${VO:+yes} music=${MUSIC:+yes}(g$MGAIN) sfx=${#SFX_IDX[@]}  -> $OUT (-14 LUFS)"
