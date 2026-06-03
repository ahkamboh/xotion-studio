#!/usr/bin/env bash
# Mix a voiceover over background music with automatic ducking (music drops while the voice speaks),
# then normalize the master to -14 LUFS. Output is ready to drop on an <audio> track.
# Usage: scripts/mix-audio.sh <voice.wav> <music.(wav|mp3)> <out.wav> [music_vol] [duck_amount]
#   music_vol   base music level (default 0.35)
#   duck_amount how hard to duck under voice 0..1 (default 0.65 = music drops to ~35%)
set -euo pipefail
VO="$1"; MUSIC="$2"; OUT="$3"; MV="${4:-0.35}"; DUCK="${5:-0.65}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# sidechaincompress: use the voice as the key to duck the music; then mix voice on top.
ffmpeg -y -i "$VO" -i "$MUSIC" -filter_complex "
  [1:a]volume=${MV},aresample=48000[music];
  [0:a]aresample=48000[voice];
  [music][voice]sidechaincompress=threshold=0.02:ratio=12:attack=15:release=350:makeup=1[ducked];
  [voice][ducked]amix=inputs=2:duration=longest:normalize=0,
  afade=t=in:d=0.4,
  alimiter=limit=0.95[mix]
" -map "[mix]" "$TMP/mix.wav" -loglevel error

# master loudness normalize to streaming standard
ffmpeg -y -i "$TMP/mix.wav" -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 "$OUT" -loglevel error
echo "[mix-audio] voice + ducked music (-14 LUFS) -> $OUT"
