#!/usr/bin/env python3
"""
Batch-render byNothing thumbnails (1280×720 JPEGs).
Each song gets a unique bg frame + title. Uses the bynothing-thumb HyperFrames template.

Usage:
  python3 scripts/render-bynothing-thumbs.py               # all 30 songs
  python3 scripts/render-bynothing-thumbs.py "Paper Boats" # one song
"""
import os, re, sys, subprocess, shutil
HOME = os.path.expanduser("~")
SCRIPTS = os.path.dirname(__file__)
THUMB_PROJ = os.path.join(SCRIPTS, "..", "projects", "bynothing-thumb")
OUTDIR = os.path.join(HOME, "Downloads", "byNothing-thumbnails")
os.makedirs(OUTDIR, exist_ok=True)

BG_MAP = {
    "Paper Boats":           "forest",
    "Wildflower":            "field",
    "Quiet Hours":           "stars",
    "The Long Way Home":     "mountains",
    "Saltwater":             "ocean",
    "Borrowed Light":        "stars",
    "Embers":                "autumn",
    "Cedar & Smoke":         "forest",
    "Tied to the Tide":      "ocean",
    "Hollow":                "rain",
    "Golden Field":          "field",
    "Driftwood":             "ocean",
    "Rivers Don't Look Back":"lake",
    "Lanterns":              "stars",
    "Winter Coat":           "snow",
    "The Hush":              "snow",
    "Ghost of June":         "field",
    "Mountains Move Slow":   "mountains",
    "Rain on Tin":           "rain",
    "Faded Polaroid":        "autumn",
    "Wandering":             "clouds",
    "Still Water":           "lake",
    "Autumn Leaving":        "autumn",
    "Hometown Lights":       "stars",
    "Open Window":           "clouds",
    "Moth to the Moon":      "stars",
    "Cold Coffee":           "rain",
    "Threadbare":            "forest",
    "The Tide Will Turn":    "ocean",
    "Soft Goodbye":          "autumn",
    # songs 31-60
    "Marigold":              "field",
    "The Space Between":     "lake",
    "Old Sweaters":          "forest",
    "Letters I Never Sent":  "rain",
    "Sundown":               "mountains",
    "Glass Houses":          "clouds",
    "Half a Memory":         "autumn",
    "The Quiet After":       "rain",
    "Coastline":             "ocean",
    "Two Birds":             "clouds",
    "Honey & Rust":          "autumn",
    "The Last Train Home":   "rain",
    "Paper Hearts":          "field",
    "Willow":                "forest",
    "Dust & Gold":           "mountains",
    "Long December":         "snow",
    "Skipping Stones":       "lake",
    "Bare Feet":             "field",
    "Homesick":              "stars",
    "Lavender":              "field",
    "Anchor":                "ocean",
    "Matchstick":            "stars",
    "Porchlight":            "stars",
    "Wishing Well":          "lake",
    "Sandcastles":           "ocean",
    "Fireflies":             "field",
    "Sunday Morning":        "clouds",
    "Carry You":             "mountains",
    "The In-Between":        "clouds",
    "Lighthouse":            "ocean",
}

TEMPLATE_HTML = os.path.join(THUMB_PROJ, "index.html")

def render_thumb(title):
    out_jpg = os.path.join(OUTDIR, f"{title}.jpg")
    if os.path.exists(out_jpg):
        print(f"  [DONE] {title}")
        return

    bg = BG_MAP.get(title, "forest")
    print(f"  → {title}  (bg={bg})")

    # Patch index.html: title text + bg image
    with open(TEMPLATE_HTML) as f:
        html = f.read()

    # replace title
    title_escaped = title.replace("&", "&amp;").replace('"', "&quot;")
    html = re.sub(r'(<div id="title">)([^<]*)(</div>)',
                  rf'\g<1>{title_escaped}\g<3>', html)
    # replace bg image src
    html = re.sub(r'(<img id="bgimg" src=")[^"]*(")',
                  rf'\g<1>assets/{bg}.jpg\g<2>', html)

    with open(TEMPLATE_HTML, "w") as f:
        f.write(html)

    # Render 1 frame (1s at 1fps = 1 frame)
    safe = title.replace(" ", "_").replace("&", "and").replace("'", "")
    mp4 = os.path.join(THUMB_PROJ, "renders", f"thumb_{safe}.mp4")
    os.makedirs(os.path.join(THUMB_PROJ, "renders"), exist_ok=True)

    r = subprocess.run(
        ["npx", "hyperframes", "render",
         "--output", mp4,
         "--fps", "1",
         "--quiet",
         "."],
        cwd=THUMB_PROJ,
        capture_output=True, text=True
    )
    if r.returncode != 0:
        print(f"     [ERROR] render: {r.stderr[-400:]}")
        return

    if not os.path.exists(mp4):
        # fallback: find latest mp4 in renders/
        renders_dir = os.path.join(THUMB_PROJ, "renders")
        candidates = [f for f in os.listdir(renders_dir) if f.endswith(".mp4")]
        if not candidates:
            print(f"     [ERROR] no render output found")
            return
        latest = max(candidates, key=lambda f: os.path.getmtime(os.path.join(renders_dir, f)))
        mp4 = os.path.join(renders_dir, latest)

    # Extract frame 0 as JPEG
    subprocess.run([
        "ffmpeg", "-y", "-i", mp4,
        "-vframes", "1", "-q:v", "2",
        out_jpg
    ], check=True, capture_output=True)

    os.remove(mp4)
    size_kb = os.path.getsize(out_jpg) // 1024
    print(f"     ✓ {out_jpg}  ({size_kb} KB)")


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

    print(f"=== byNothing thumbnail batch ({len(queue)} songs) ===\n")
    for title in queue:
        render_thumb(title)

    done = [f for f in os.listdir(OUTDIR) if f.endswith(".jpg")]
    print(f"\n=== Done: {len(done)} thumbnails in {OUTDIR} ===")
