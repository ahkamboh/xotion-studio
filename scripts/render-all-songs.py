#!/usr/bin/env python3
"""
Parallel batch render for all 60 byNothing lyric videos.
Uses multiprocessing pool (default 3 workers) so CPU/Chrome stay manageable.

Usage:
  python3 scripts/render-all-songs.py          # render missing songs, 3 workers
  python3 scripts/render-all-songs.py --workers 4
  python3 scripts/render-all-songs.py --force  # re-render all
"""
import os, sys, subprocess, multiprocessing, time

WD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(WD, "scripts", "render-one-song.py")
OUTDIR = os.path.expanduser("~/Downloads/byNothing-videos")

SONGS = [
    "Paper Boats", "Wildflower", "Quiet Hours", "The Long Way Home",
    "Saltwater", "Borrowed Light", "Embers", "Cedar & Smoke",
    "Tied to the Tide", "Hollow", "Golden Field", "Driftwood",
    "Rivers Don't Look Back", "Lanterns", "Winter Coat", "The Hush",
    "Ghost of June", "Mountains Move Slow", "Rain on Tin", "Faded Polaroid",
    "Wandering", "Still Water", "Autumn Leaving", "Hometown Lights",
    "Open Window", "Moth to the Moon", "Cold Coffee", "Threadbare",
    "The Tide Will Turn", "Soft Goodbye",
    "Marigold", "The Space Between", "Old Sweaters", "Letters I Never Sent",
    "Sundown", "Glass Houses", "Half a Memory", "The Quiet After",
    "Coastline", "Two Birds", "Honey & Rust", "The Last Train Home",
    "Paper Hearts", "Willow", "Dust & Gold", "Long December",
    "Skipping Stones", "Bare Feet", "Homesick", "Lavender",
    "Anchor", "Matchstick", "Porchlight", "Wishing Well",
    "Sandcastles", "Fireflies", "Sunday Morning", "Carry You",
    "The In-Between", "Lighthouse",
]

def render_one(args):
    title, force = args
    out = os.path.join(OUTDIR, f"{title}.mp4")
    if os.path.exists(out) and not force:
        print(f"[SKIP] {title} (already exists)", flush=True)
        return (title, "skip")
    cmd = [sys.executable, SCRIPT, title] + (["--force"] if force else [])
    t0 = time.time()
    r = subprocess.run(cmd, cwd=WD, capture_output=False)
    elapsed = time.time() - t0
    ok = r.returncode == 0 and os.path.exists(out)
    status = "ok" if ok else "error"
    print(f"[{status.upper()}] {title}  ({elapsed:.0f}s)", flush=True)
    return (title, status)

if __name__ == "__main__":
    force   = "--force" in sys.argv
    workers = 3
    for i, a in enumerate(sys.argv):
        if a == "--workers" and i + 1 < len(sys.argv):
            workers = int(sys.argv[i + 1])

    queue = [(s, force) for s in SONGS]
    todo  = [s for s in SONGS if force or not os.path.exists(os.path.join(OUTDIR, f"{s}.mp4"))]
    print(f"=== byNothing batch render: {len(todo)} songs, {workers} workers ===\n", flush=True)

    if not todo:
        print("All songs already rendered."); sys.exit(0)

    queue = [(s, force) for s in SONGS if s in todo]
    with multiprocessing.Pool(workers) as pool:
        results = pool.map(render_one, queue)

    ok_count = sum(1 for _, s in results if s == "ok")
    err_count = sum(1 for _, s in results if s == "error")
    print(f"\n=== Done: {ok_count} ok, {err_count} errors, {len(todo)-ok_count-err_count} skipped ===")
    if err_count:
        for title, s in results:
            if s == "error":
                print(f"  FAILED: {title}")
