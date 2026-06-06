#!/usr/bin/env python3
"""bpm-detect.py — detect a music file's tempo via librosa beat tracking.

  python3 scripts/bpm-detect.py track.mp3              # prints BPM rounded to 2 decimals
  python3 scripts/bpm-detect.py track.mp3 --json       # prints {"bpm":120.0,"beats":[...]}
  python3 scripts/bpm-detect.py track.mp3 --out work/bpm.json

Uses librosa.beat.beat_track (onset envelope + dynamic programming). For most
royalty-free dance/electronic/cinematic tracks this lands within ±0.5 BPM of
the true tempo. If you've already got the BPM from the source library (Pixabay,
Uppbeat metadata), trust that instead — this is the fallback.

Exit 0 always (prints BPM); non-zero only on file-not-found / bad format.
"""
import argparse, json, sys, os

ap = argparse.ArgumentParser()
ap.add_argument("audio", help="audio file (mp3/wav/m4a/flac)")
ap.add_argument("--json", action="store_true", help="emit full JSON instead of plain BPM")
ap.add_argument("--out",  help="write JSON to this file (implies --json)")
args = ap.parse_args()

if not os.path.exists(args.audio):
    sys.exit(f"file not found: {args.audio}")

try:
    import librosa
except ImportError:
    sys.exit("librosa not installed. install with: pip install librosa  (or use the whisperx venv: .venv-whisperx/bin/python3)")

y, sr = librosa.load(args.audio, sr=22050, mono=True)
tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units='time')
try:
    bpm = float(tempo[0]) if hasattr(tempo, '__len__') else float(tempo)
except Exception:
    bpm = float(tempo)
beats_list = [float(b) for b in (beats if hasattr(beats, '__iter__') else [beats])]

if bpm <= 0 or not beats_list:
    sys.stderr.write(
        f"[bpm-detect] WARNING: no beats detected in {args.audio}.\n"
        f"  This is normal for sustained pads / drones (no transients).\n"
        f"  For beat-sync, use a track with a real rhythm (drums, kick, percussion).\n"
        f"  Defaulting BPM=0 so downstream tools can detect 'unsync-able' and skip beat-align.\n"
    )
    bpm = 0.0

if args.out or args.json:
    beat_interval = round(60.0/bpm, 4) if bpm > 0 else None
    out = {"bpm": round(bpm, 2), "beat_interval_s": beat_interval, "beats": beats_list, "rhythmic": bpm > 0}
    if args.out:
        with open(args.out, "w") as f: json.dump(out, f, indent=2)
        print(f"[bpm-detect] {bpm:.2f} BPM ({len(beats_list)} beats) -> {args.out}")
    else:
        print(json.dumps(out))
else:
    print(f"{bpm:.2f}")
