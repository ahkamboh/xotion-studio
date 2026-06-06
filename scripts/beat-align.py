#!/usr/bin/env python3
"""beat-align.py — nudge scene start times to land on the music's beat grid.

Reads a scenes JSON (list of {id, start, end, ...}), the music BPM, and an
optional intro offset (seconds of silence/pickup before the first downbeat),
then writes a new scenes file where each scene start is snapped to the
nearest beat (within --snap-window). Scene ends are re-stitched so the
timeline stays contiguous.

  python3 scripts/beat-align.py scenes.json --bpm 100 --out work/scenes-synced.json
  python3 scripts/beat-align.py scenes.json --bpm 96 --offset 0.4 --downbeat-mod 4 --out work/scenes-synced.json

Scenes flagged with `is_big_hit: true` are forced to a DOWNBEAT (every Nth
beat where N = --downbeat-mod, default 4 for 4/4 time). Mark the hero,
reveal, and CTA scenes that way and they'll land on the kick.

Inputs:
  scenes.json — array of objects with at minimum {id, start, end}. Extra
  fields (peak, anchor, content, etc.) are preserved untouched.

Outputs:
  scenes-synced.json — same array, with start times snapped, end times
  re-stitched (scene N.end = scene N+1.start, last scene keeps its end),
  and three new fields per scene:
    original_start  — what the start was before snapping
    beat_aligned    — true if snap drift ≤ snap_window
    is_downbeat     — true if snapped start is on a downbeat
"""
import argparse, json, sys

ap = argparse.ArgumentParser()
ap.add_argument("scenes")
ap.add_argument("--bpm", type=float, required=True)
ap.add_argument("--offset", type=float, default=0.0, help="seconds before first beat (intro delay)")
ap.add_argument("--out", required=True)
ap.add_argument("--downbeat-mod", type=int, default=4, help="every Nth beat is a downbeat (4 = 4/4 time)")
ap.add_argument("--snap-window", type=float, default=0.35, help="max seconds to snap a scene start; further than that we leave alone")
args = ap.parse_args()

beat_interval = 60.0 / args.bpm

with open(args.scenes) as f:
    scenes = json.load(f)
if not isinstance(scenes, list):
    sys.exit("scenes.json must be a JSON array of scene objects")

def nearest_beat_time(t):
    n = round((t - args.offset) / beat_interval)
    return max(0.0, args.offset + n * beat_interval), n

def nearest_downbeat_time(t):
    # find nearest beat, then snap to nearest downbeat (multiple of mod)
    _, n = nearest_beat_time(t)
    nd = round(n / args.downbeat_mod) * args.downbeat_mod
    return max(0.0, args.offset + nd * beat_interval), nd

for s in scenes:
    orig = float(s.get('start', 0))
    if s.get('is_big_hit'):
        snapped, n = nearest_downbeat_time(orig)
    else:
        snapped, n = nearest_beat_time(orig)
    drift = abs(snapped - orig)
    aligned = drift <= args.snap_window
    if not aligned:
        snapped = orig  # keep original, mark as not aligned
    s['original_start'] = round(orig, 3)
    s['start'] = round(snapped, 3)
    s['beat_aligned'] = aligned
    s['is_downbeat'] = (n % args.downbeat_mod == 0) if aligned else False

# Re-stitch ends so the timeline stays contiguous (scene N.end = scene N+1.start)
for i in range(len(scenes) - 1):
    scenes[i]['end'] = scenes[i+1]['start']
# Last scene keeps its original end (or it stays where it is).

with open(args.out, "w") as f:
    json.dump(scenes, f, indent=2)

print(f"[beat-align] {args.bpm} BPM (beat interval {beat_interval:.3f}s, downbeat every {args.downbeat_mod})")
for s in scenes:
    flag = "✓" if s['beat_aligned'] else "✗ drift>snap"
    db = " ⬇ DOWNBEAT" if s['is_downbeat'] else ""
    print(f"  {s.get('id','?'):>12}  {s['original_start']:>6.2f}s → {s['start']:>6.2f}s  {flag}{db}")
print(f"[beat-align] -> {args.out}")
