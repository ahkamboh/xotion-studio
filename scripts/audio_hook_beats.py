#!/usr/bin/env python3
"""
audio_hook_beats.py — find the highest-energy hook window + beat times.
Run with the whisperx venv (has librosa). Prints JSON to stdout:
  {"hook_start": 41.5, "tempo": 122.0, "beats": [0.0, 0.49, ...]}  (beats relative to hook_start)

Usage: python audio_hook_beats.py SONG.mp3 --hook 18 --skip 12 [--start S]
"""
import sys, json, argparse
import numpy as np
import librosa

ap = argparse.ArgumentParser()
ap.add_argument("audio")
ap.add_argument("--hook", type=float, default=18.0)
ap.add_argument("--skip", type=float, default=12.0)   # ignore intro seconds
ap.add_argument("--start", type=float, default=-1)     # force hook start (skip search)
a = ap.parse_args()

y, sr = librosa.load(a.audio, sr=22050, mono=True)
dur = len(y)/sr

if a.start >= 0:
    hs = min(a.start, max(0, dur - a.hook))
else:
    hop = sr // 2
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]    # 2 frames/sec
    win = int(a.hook * 2)
    if len(rms) <= win:
        hs = 0.0
    else:
        start_f = min(int(a.skip * 2), len(rms) - win)
        best, bs = start_f, -1
        for i in range(start_f, len(rms) - win):
            s = rms[i:i+win].sum()
            if s > bs:
                bs = s; best = i
        hs = round(best / 2.0, 2)

# beats over the whole track, then keep those inside the hook window
tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units="frames")
beat_times = librosa.frames_to_time(beat_frames, sr=sr)
hook_beats = [round(float(b - hs), 3) for b in beat_times if hs <= b <= hs + a.hook]

print(json.dumps({
    "hook_start": float(hs),
    "tempo": float(np.atleast_1d(tempo)[0]),
    "beats": hook_beats,
    "duration": float(dur),
}))
