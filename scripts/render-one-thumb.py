#!/usr/bin/env python3
"""
Render ONE byNothing thumbnail (1280×720 JPEG) in an isolated temp dir.

Usage:
  python3 scripts/render-one-thumb.py "Paper Boats"
  python3 scripts/render-one-thumb.py "Paper Boats" --force
"""
import os, re, sys, shutil, subprocess, tempfile

HOME    = os.path.expanduser("~")
SDIR    = os.path.dirname(os.path.abspath(__file__))
TPROJ   = os.path.join(SDIR, "..", "projects", "bynothing-thumb")
VPROJ   = os.path.join(SDIR, "..", "projects", "bynothing")
OUTDIR  = HOME + "/Downloads/byNothing-thumbnails"

BG_MAP = {
    "Paper Boats": "forest", "Wildflower": "field", "Quiet Hours": "stars",
    "The Long Way Home": "mountains", "Saltwater": "ocean", "Borrowed Light": "stars",
    "Embers": "autumn", "Cedar & Smoke": "forest", "Tied to the Tide": "ocean",
    "Hollow": "rain", "Golden Field": "field", "Driftwood": "ocean",
    "Rivers Don't Look Back": "lake", "Lanterns": "stars", "Winter Coat": "snow",
    "The Hush": "snow", "Ghost of June": "field", "Mountains Move Slow": "mountains",
    "Rain on Tin": "rain", "Faded Polaroid": "autumn", "Wandering": "clouds",
    "Still Water": "lake", "Autumn Leaving": "autumn", "Hometown Lights": "stars",
    "Open Window": "clouds", "Moth to the Moon": "stars", "Cold Coffee": "rain",
    "Threadbare": "forest", "The Tide Will Turn": "ocean", "Soft Goodbye": "autumn",
    "Marigold": "field", "The Space Between": "lake", "Old Sweaters": "forest",
    "Letters I Never Sent": "rain", "Sundown": "mountains", "Glass Houses": "clouds",
    "Half a Memory": "autumn", "The Quiet After": "rain", "Coastline": "ocean",
    "Two Birds": "clouds", "Honey & Rust": "autumn", "The Last Train Home": "rain",
    "Paper Hearts": "field", "Willow": "forest", "Dust & Gold": "mountains",
    "Long December": "snow", "Skipping Stones": "lake", "Bare Feet": "field",
    "Homesick": "stars", "Lavender": "field", "Anchor": "ocean",
    "Matchstick": "stars", "Porchlight": "stars", "Wishing Well": "lake",
    "Sandcastles": "ocean", "Fireflies": "field", "Sunday Morning": "clouds",
    "Carry You": "mountains", "The In-Between": "clouds", "Lighthouse": "ocean",
}

BG_IMAGES = os.path.join(TPROJ, "assets")

def render(title, force=False):
    out = os.path.join(OUTDIR, f"{title}.jpg")
    if os.path.exists(out) and not force:
        print(f"[DONE] {title}", flush=True); return True

    bg = BG_MAP.get(title, "forest")
    print(f"[START] {title}  (bg={bg})", flush=True)

    tmp = tempfile.mkdtemp(prefix=f"bnt_{title[:15].replace(' ','_')}_")
    try:
        assets   = os.path.join(tmp, "assets")
        fonts    = os.path.join(assets, "fonts")
        renders_dir = os.path.join(tmp, "renders")
        os.makedirs(fonts, exist_ok=True)
        os.makedirs(renders_dir, exist_ok=True)

        # symlink fonts from bynothing project (shared)
        shared_fonts = os.path.join(VPROJ, "assets", "fonts")
        for fn in os.listdir(shared_fonts):
            os.symlink(os.path.join(shared_fonts, fn), os.path.join(fonts, fn))

        # symlink the bg JPEG
        bg_src = os.path.join(BG_IMAGES, f"{bg}.jpg")
        if not os.path.exists(bg_src):
            print(f"[WARN] no bg image {bg}.jpg, using forest fallback", flush=True)
            bg_src = os.path.join(BG_IMAGES, "forest.jpg")
        os.symlink(os.path.abspath(bg_src), os.path.join(assets, f"{bg}.jpg"))

        # patch index.html
        with open(os.path.join(TPROJ, "index.html")) as f:
            html = f.read()
        title_esc = title.replace("&", "&amp;").replace('"', "&quot;")
        html = re.sub(r'(<div id="title">)([^<]*)(</div>)',
                      rf'\g<1>{title_esc}\g<3>', html)
        html = re.sub(r'(<img id="bgimg" src=")[^"]*(")',
                      rf'\g<1>assets/{bg}.jpg\g<2>', html)
        # fix font paths to be relative to tmp (fonts are at assets/fonts/)
        html = html.replace("../bynothing/assets/fonts/", "assets/fonts/")
        with open(os.path.join(tmp, "index.html"), "w") as f:
            f.write(html)

        safe   = title.replace(" ", "_").replace("&", "and").replace("'", "")
        mp4    = os.path.join(renders_dir, f"thumb_{safe}.mp4")
        r = subprocess.run(
            ["npx", "hyperframes", "render", "--output", mp4,
             "--fps", "1", "--quiet", "."],
            cwd=tmp, capture_output=True, text=True
        )
        if r.returncode != 0:
            print(f"[ERROR] render {title}:\n{r.stderr[-400:]}", flush=True); return False

        if not os.path.exists(mp4):
            cands = [f for f in os.listdir(renders_dir) if f.endswith(".mp4")]
            if not cands:
                print(f"[ERROR] no render output for {title}", flush=True); return False
            mp4 = os.path.join(renders_dir, max(cands, key=lambda f: os.path.getmtime(os.path.join(renders_dir, f))))

        os.makedirs(OUTDIR, exist_ok=True)
        subprocess.run([
            "ffmpeg", "-y", "-i", mp4, "-vframes", "1", "-q:v", "2", out
        ], check=True, capture_output=True)

        kb = os.path.getsize(out) // 1024
        print(f"[OK] {title}  ({kb} KB) → {out}", flush=True)
        return True
    except Exception as e:
        print(f"[ERROR] {title}: {e}", flush=True)
        return False
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: render-one-thumb.py <title> [--force]"); sys.exit(1)
    title = sys.argv[1]
    force = "--force" in sys.argv
    ok = render(title, force=force)
    sys.exit(0 if ok else 1)
