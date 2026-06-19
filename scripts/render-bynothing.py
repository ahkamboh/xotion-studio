#!/usr/bin/env python3
"""
Batch-render byNothing lyric videos.
  - Loops all 10 nature footage clips to 270s (one-time prep)
  - For each song: writes song.js, patches data-duration, renders visual, muxes MP3
  - Output: ~/Downloads/byNothing-videos/SongName.mp4

Usage:
  python3 scripts/render-bynothing.py               # render all
  python3 scripts/render-bynothing.py "Paper Boats" # render one song
"""
import os, re, sys, shutil, subprocess, json
HOME = os.path.expanduser("~")
PROJ = os.path.join(os.path.dirname(__file__), "..", "projects", "bynothing")
FOOTAGE = os.path.join(HOME, "Downloads", "byNothing-footage")
LOOPS   = os.path.join(PROJ, "assets", "bg_loops")
AUDIO   = os.path.join(HOME, "Downloads")
OUTDIR  = os.path.join(HOME, "Downloads", "byNothing-videos")
SONGS_MD1 = os.path.join(HOME, "Documents", "claude", "byNothing-30-songs.md")
SONGS_MD2 = os.path.join(HOME, "Documents", "claude", "byNothing-songs-31-60.md")
SYNC_PY   = os.path.join(os.path.dirname(__file__), "sync-bynothing-lyrics.py")
MAX_DUR = 270  # loop footage to this many seconds

os.makedirs(LOOPS, exist_ok=True)
os.makedirs(OUTDIR, exist_ok=True)

# ── Background assignment ─────────────────────────────────────────────────────
BG_MAP = {
    "Paper Boats":          "forest",
    "Wildflower":           "field",
    "Quiet Hours":          "stars",
    "The Long Way Home":    "mountains",
    "Saltwater":            "ocean",
    "Borrowed Light":       "stars",
    "Embers":               "autumn",
    "Cedar & Smoke":        "forest",
    "Tied to the Tide":     "ocean",
    "Hollow":               "rain",
    "Golden Field":         "field",
    "Driftwood":            "ocean",
    "Rivers Don't Look Back":"lake",
    "Lanterns":             "stars",
    "Winter Coat":          "snow",
    "The Hush":             "snow",
    "Ghost of June":        "field",
    "Mountains Move Slow":  "mountains",
    "Rain on Tin":          "rain",
    "Faded Polaroid":       "autumn",
    "Wandering":            "clouds",
    "Still Water":          "lake",
    "Autumn Leaving":       "autumn",
    "Hometown Lights":      "stars",
    "Open Window":          "clouds",
    "Moth to the Moon":     "stars",
    "Cold Coffee":          "rain",
    "Threadbare":           "forest",
    "The Tide Will Turn":   "ocean",
    "Soft Goodbye":         "autumn",
    # songs 31-60
    "Marigold":             "field",
    "The Space Between":    "lake",
    "Old Sweaters":         "forest",
    "Letters I Never Sent": "rain",
    "Sundown":              "mountains",
    "Glass Houses":         "clouds",
    "Half a Memory":        "autumn",
    "The Quiet After":      "rain",
    "Coastline":            "ocean",
    "Two Birds":            "clouds",
    "Honey & Rust":         "autumn",
    "The Last Train Home":  "rain",
    "Paper Hearts":         "field",
    "Willow":               "forest",
    "Dust & Gold":          "mountains",
    "Long December":        "snow",
    "Skipping Stones":      "lake",
    "Bare Feet":            "field",
    "Homesick":             "stars",
    "Lavender":             "field",
    "Anchor":               "ocean",
    "Matchstick":           "stars",
    "Porchlight":           "stars",
    "Wishing Well":         "lake",
    "Sandcastles":          "ocean",
    "Fireflies":            "field",
    "Sunday Morning":       "clouds",
    "Carry You":            "mountains",
    "The In-Between":       "clouds",
    "Lighthouse":           "ocean",
}

# ── Parse lyrics from markdown ────────────────────────────────────────────────
def parse_songs(md_path):
    """Return dict title → list-of-lyric-lines (strings)."""
    songs = {}
    cur_title = None
    cur_lines = []
    in_code = False
    with open(md_path, encoding="utf-8") as f:
        for raw in f:
            line = raw.rstrip("\n")
            if line.startswith("```"):
                if in_code and cur_title:
                    # end of lyrics block
                    songs[cur_title] = [l for l in cur_lines if l.strip()]
                    cur_lines = []
                in_code = not in_code
                continue
            if in_code:
                stripped = line.strip()
                # skip section tags like [Verse 1], [Chorus], etc.
                if stripped.startswith("[") and stripped.endswith("]"):
                    continue
                if stripped:
                    cur_lines.append(stripped)
            else:
                # detect song titles: ## N. Title
                m = re.match(r'^##\s+\d+\.\s+(.+)', line)
                if m:
                    cur_title = m.group(1).strip()
                    cur_lines = []
    return songs

ALL_SONGS = {}
for md in [SONGS_MD1, SONGS_MD2]:
    ALL_SONGS.update(parse_songs(md))

# ── Loop footage (one-time) ───────────────────────────────────────────────────
def ensure_loop(name):
    src = os.path.join(FOOTAGE, f"{name}.mp4")
    dst = os.path.join(LOOPS,   f"{name}.mp4")
    if os.path.exists(dst):
        return dst
    print(f"  looping {name}.mp4 → {MAX_DUR}s …")
    subprocess.run([
        "ffmpeg", "-y",
        "-stream_loop", "-1", "-i", src,
        "-t", str(MAX_DUR),
        "-vf", "fps=24,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080",
        "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p",
        "-an",
        dst
    ], check=True, capture_output=True)
    return dst

# ── Get MP3 duration ──────────────────────────────────────────────────────────
def get_duration(mp3_path):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", mp3_path],
        capture_output=True, text=True
    )
    return float(r.stdout.strip())

# ── Build LINES array for song.js ────────────────────────────────────────────
def build_lines(lines):
    """Wrap each lyric line into a JS array element."""
    js_lines = []
    for l in lines:
        escaped = l.replace("\\", "\\\\").replace('"', '\\"').replace("'", "\\'")
        js_lines.append(f' ["{escaped}"]')
    return "window.__LINES=[\n" + ",\n".join(js_lines) + "\n];"

# ── Render one song ───────────────────────────────────────────────────────────
def render_song(title):
    mp3 = os.path.join(AUDIO, f"{title}.mp3")
    if not os.path.exists(mp3):
        print(f"  [SKIP] No MP3: {mp3}")
        return

    out_mp4 = os.path.join(OUTDIR, f"{title}.mp4")
    if os.path.exists(out_mp4):
        print(f"  [DONE] Already rendered: {title}")
        return

    lyrics = ALL_SONGS.get(title)
    if not lyrics:
        print(f"  [SKIP] No lyrics found for: {title}")
        return

    bg_name = BG_MAP.get(title, "forest")
    bg_loop = ensure_loop(bg_name)

    dur = get_duration(mp3)
    dur_int = int(dur) + 1  # +1 buffer for outro fade

    print(f"\n  → {title}  ({dur:.1f}s, bg={bg_name}, {len(lyrics)} lines)")

    # 1) Write song.js
    song_js = os.path.join(PROJ, "assets", "song.js")
    with open(song_js, "w") as f:
        f.write(f'window.__TITLE="{title}";\n')
        f.write(f'window.__DUR={int(dur)};\n')
        f.write(build_lines(lyrics) + "\n")

    # 2) Copy looped bg
    bg_dst = os.path.join(PROJ, "assets", "bg.mp4")
    shutil.copy2(bg_loop, bg_dst)

    # 3) Patch data-duration in index.html
    html_path = os.path.join(PROJ, "index.html")
    with open(html_path, "r") as f:
        html = f.read()
    # patch root div and bgv video tag durations
    html_patched = re.sub(
        r'(data-composition-id="main"[^>]*data-duration=")(\d+)',
        lambda m: m.group(1) + str(int(dur)),
        html
    )
    html_patched = re.sub(
        r'(id="bgv"[^>]*data-duration=")(\d+)',
        lambda m: m.group(1) + str(int(dur)),
        html_patched
    )
    with open(html_path, "w") as f:
        f.write(html_patched)

    # 4) Render visual (no audio)
    safe = title.replace(" ", "_").replace("&", "and").replace("'", "")
    visual = os.path.join(PROJ, "renders", f"{safe}.mp4")
    os.makedirs(os.path.join(PROJ, "renders"), exist_ok=True)
    print(f"     rendering visual …")
    result = subprocess.run(
        ["npx", "hyperframes", "render",
         "--output", visual,
         "--fps", "30",
         "--quiet",
         "."],
        cwd=PROJ,
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"     [ERROR] render failed:\n{result.stderr[-800:]}")
        return
    if not os.path.exists(visual):
        # HyperFrames may have used its own name — find latest mp4 in renders/
        renders_dir = os.path.join(PROJ, "renders")
        candidates = [f for f in os.listdir(renders_dir) if f.endswith(".mp4") and not f.startswith(".")]
        if not candidates:
            print(f"     [ERROR] no visual found in renders/")
            return
        latest = max(candidates, key=lambda f: os.path.getmtime(os.path.join(renders_dir, f)))
        visual = os.path.join(renders_dir, latest)
        print(f"     (using latest render: {latest})")

    # 5) Mux in MP3
    print(f"     muxing audio …")
    subprocess.run([
        "ffmpeg", "-y",
        "-i", visual,
        "-i", mp3,
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "256k",
        "-shortest",
        "-movflags", "+faststart",
        out_mp4
    ], check=True, capture_output=True)

    size_mb = os.path.getsize(out_mp4) / 1024 / 1024
    print(f"     ✓ {out_mp4}  ({size_mb:.1f} MB)")

    # 6) Clean up visual
    os.remove(visual)

# ── Main ──────────────────────────────────────────────────────────────────────
SONGS_1_30 = [
    "Paper Boats", "Wildflower", "Quiet Hours", "The Long Way Home",
    "Saltwater", "Borrowed Light", "Embers", "Cedar & Smoke",
    "Tied to the Tide", "Hollow", "Golden Field", "Driftwood",
    "Rivers Don't Look Back", "Lanterns", "Winter Coat", "The Hush",
    "Ghost of June", "Mountains Move Slow", "Rain on Tin", "Faded Polaroid",
    "Wandering", "Still Water", "Autumn Leaving", "Hometown Lights",
    "Open Window", "Moth to the Moon", "Cold Coffee", "Threadbare",
    "The Tide Will Turn", "Soft Goodbye",
]

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    queue = [target] if target else SONGS_1_30

    print("=== byNothing batch render ===")
    print(f"Songs: {len(queue)} | Output: {OUTDIR}\n")

    for title in queue:
        render_song(title)

    print("\n=== Done ===")
    done = [f for f in os.listdir(OUTDIR) if f.endswith(".mp4")]
    print(f"{len(done)} videos in {OUTDIR}")
