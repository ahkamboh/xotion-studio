#!/usr/bin/env python3
"""beat-grid.py — emit a READ-ONLY beat grid for a track. Never touches scenes.

  python3 scripts/beat-grid.py --bpm 96 --duration 30 [--offset 0.0] [--downbeat-mod 4] --out work/beats.json
  python3 scripts/beat-grid.py --audio assets/music/bed.mp3 --duration 30 --out work/beats.json   # auto-detect BPM via librosa

This is the audio-engineer's tool for producing a DECORATIVE beat overlay that
motion-builder can snap auxiliary micro-tweens to. It is deliberately INCAPABLE
of moving a scene's start/end/peak — it does not read scenes.json at all. The
canonical scene boundaries come from sync-master (window.__SCENES, voice-derived).

Output work/beats.json:
  {
    "bpm": 96.0,
    "beat_interval": 0.625,
    "offset": 0.0,
    "downbeat_mod": 4,
    "beats":     [0.0, 0.625, 1.25, ...],   # every beat up to duration
    "downbeats": [0.0, 2.5, 5.0, ...]        # every Nth beat (the big hits)
  }
"""
import argparse, json, sys

ap = argparse.ArgumentParser()
ap.add_argument("--bpm", type=float, help="tempo; omit to auto-detect from --audio")
ap.add_argument("--audio", help="audio file to detect BPM from (if --bpm omitted)")
ap.add_argument("--duration", type=float, required=True, help="video duration in seconds")
ap.add_argument("--offset", type=float, default=0.0, help="seconds before the first beat (intro pickup)")
ap.add_argument("--downbeat-mod", type=int, default=4, help="every Nth beat is a downbeat (4 = 4/4)")
ap.add_argument("--out", required=True)
args = ap.parse_args()

bpm = args.bpm
if bpm is None:
    if not args.audio:
        sys.exit("need --bpm or --audio")
    try:
        import librosa
    except ImportError:
        sys.exit("librosa not installed; pass --bpm explicitly or use the whisperx venv")
    y, sr = librosa.load(args.audio, sr=22050, mono=True)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr, units='time')
    bpm = float(tempo[0]) if hasattr(tempo, '__len__') else float(tempo)

if bpm <= 0:
    sys.exit(f"invalid BPM ({bpm}); a track with no rhythm can't drive a beat grid")

interval = 60.0 / bpm
beats, downbeats = [], []
n = 0
t = args.offset
while t <= args.duration + 1e-9:
    beats.append(round(t, 4))
    if n % args.downbeat_mod == 0:
        downbeats.append(round(t, 4))
    n += 1
    t = args.offset + n * interval

out = {
    "bpm": round(bpm, 2),
    "beat_interval": round(interval, 4),
    "offset": args.offset,
    "downbeat_mod": args.downbeat_mod,
    "beats": beats,
    "downbeats": downbeats,
}
with open(args.out, "w") as f:
    json.dump(out, f, indent=2)
print(f"[beat-grid] {bpm:.2f} BPM · {len(beats)} beats · {len(downbeats)} downbeats (every {args.downbeat_mod}) -> {args.out}")
print(f"[beat-grid] READ-ONLY grid — scene boundaries untouched (those are sync-master's).")
