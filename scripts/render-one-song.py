#!/usr/bin/env python3
"""
Render ONE byNothing lyric video in an isolated temp dir so multiple instances
can run in parallel without fighting over shared project files.

Usage:
  python3 scripts/render-one-song.py "Paper Boats"
  python3 scripts/render-one-song.py "Paper Boats" --force   # re-render even if exists
"""
import os, re, sys, json, shutil, subprocess, tempfile

# Ensure Homebrew binaries (ffmpeg, ffprobe, node/npx) are on PATH for subprocesses
_BREW_BIN = "/opt/homebrew/bin"
if _BREW_BIN not in os.environ.get("PATH", ""):
    os.environ["PATH"] = _BREW_BIN + ":" + os.environ.get("PATH", "")

HOME      = os.path.expanduser("~")
SDIR      = os.path.dirname(os.path.abspath(__file__))
PROJ      = os.path.join(SDIR, "..", "projects", "bynothing")
LOOPS     = os.path.join(PROJ, "assets", "bg_loops")
FOOTAGE   = os.path.join(HOME, "Downloads", "byNothing-footage")
AUDIO     = HOME + "/Downloads"
OUTDIR    = HOME + "/Downloads/byNothing-videos"
MD1       = HOME + "/Documents/claude/byNothing-30-songs.md"
MD2       = HOME + "/Documents/claude/byNothing-songs-31-60.md"
SYNC_PY   = os.path.join(SDIR, "sync-bynothing-lyrics.py")
MAX_DUR   = 270

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

def parse_songs(*md_paths):
    songs = {}
    for md in md_paths:
        if not os.path.exists(md):
            continue
        cur, lines, in_code = None, [], False
        for raw in open(md, encoding="utf-8"):
            line = raw.rstrip("\n")
            if line.startswith("```"):
                if in_code and cur:
                    songs[cur] = [l for l in lines if l.strip()]
                    lines = []
                in_code = not in_code
                continue
            if in_code:
                s = line.strip()
                if s and not (s.startswith("[") and s.endswith("]")):
                    lines.append(s)
            else:
                m = re.match(r'^##\s+\d+\.\s+(.+)', line)
                if m:
                    cur = m.group(1).strip()
                    lines = []
    return songs

def ensure_loop(name):
    dst = os.path.join(LOOPS, f"{name}.mp4")
    if os.path.exists(dst):
        return dst
    src = os.path.join(FOOTAGE, f"{name}.mp4")
    if not os.path.exists(src):
        raise FileNotFoundError(f"Footage not found: {src}")
    print(f"  looping {name}.mp4 …", flush=True)
    os.makedirs(LOOPS, exist_ok=True)
    subprocess.run([
        "ffmpeg", "-y", "-stream_loop", "-1", "-i", src,
        "-t", str(MAX_DUR),
        "-vf", "fps=24,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080",
        "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p", "-an",
        dst
    ], check=True, capture_output=True)
    return dst

def get_dur(mp3):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", mp3], capture_output=True, text=True)
    return float(r.stdout.strip())

def render(title, force=False):
    out = os.path.join(OUTDIR, f"{title}.mp4")
    if os.path.exists(out) and not force:
        print(f"[DONE] {title}", flush=True); return True

    mp3 = os.path.join(AUDIO, f"{title}.mp3")
    if not os.path.exists(mp3):
        print(f"[SKIP] no MP3: {title}", flush=True); return False

    all_songs = parse_songs(MD1, MD2)
    lyrics = all_songs.get(title)
    if not lyrics:
        print(f"[SKIP] no lyrics: {title}", flush=True); return False

    bg   = BG_MAP.get(title, "forest")
    loop = ensure_loop(bg)
    dur  = get_dur(mp3)
    dur_int = int(dur)
    print(f"[START] {title}  ({dur:.0f}s bg={bg} lines={len(lyrics)})", flush=True)

    tmp = tempfile.mkdtemp(prefix=f"bn_{title[:20].replace(' ','_')}_")
    try:
        assets = os.path.join(tmp, "assets")
        fonts  = os.path.join(assets, "fonts")
        renders_dir = os.path.join(tmp, "renders")
        os.makedirs(fonts, exist_ok=True)
        os.makedirs(renders_dir, exist_ok=True)

        # symlink fonts
        shared_fonts = os.path.join(PROJ, "assets", "fonts")
        for fn in os.listdir(shared_fonts):
            os.symlink(os.path.join(shared_fonts, fn), os.path.join(fonts, fn))

        # symlink bg
        os.symlink(os.path.abspath(loop), os.path.join(assets, "bg.mp4"))

        # generate song.js with WhisperX timestamps
        song_js = os.path.join(assets, "song.js")
        subprocess.run([
            sys.executable, SYNC_PY,
            mp3, title, song_js, json.dumps(lyrics)
        ], check=True)

        # patch index.html
        with open(os.path.join(PROJ, "index.html")) as f:
            html = f.read()
        html = re.sub(r'(data-composition-id="main"[^>]*data-duration=")(\d+)',
                      lambda m: m.group(1) + str(dur_int), html)
        html = re.sub(r'(id="bgv"[^>]*data-duration=")(\d+)',
                      lambda m: m.group(1) + str(dur_int), html)
        with open(os.path.join(tmp, "index.html"), "w") as f:
            f.write(html)

        # render visual
        safe    = title.replace(" ", "_").replace("&", "and").replace("'", "")
        visual  = os.path.join(renders_dir, f"{safe}.mp4")
        r = subprocess.run(
            ["npx", "hyperframes", "render", "--output", visual, "--fps", "30", "--quiet", "."],
            cwd=tmp, capture_output=True, text=True
        )
        if r.returncode != 0:
            print(f"[ERROR] render {title}:\n{r.stderr[-600:]}", flush=True); return False

        if not os.path.exists(visual):
            cands = [f for f in os.listdir(renders_dir) if f.endswith(".mp4")]
            if not cands:
                print(f"[ERROR] no render output for {title}", flush=True); return False
            visual = os.path.join(renders_dir, max(cands, key=lambda f: os.path.getmtime(os.path.join(renders_dir, f))))

        # mux audio
        os.makedirs(OUTDIR, exist_ok=True)
        subprocess.run([
            "ffmpeg", "-y", "-i", visual, "-i", mp3,
            "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
            "-shortest", "-movflags", "+faststart", out
        ], check=True, capture_output=True)

        mb = os.path.getsize(out) / 1048576
        print(f"[OK] {title}  ({mb:.1f} MB) → {out}", flush=True)
        return True
    except Exception as e:
        print(f"[ERROR] {title}: {e}", flush=True)
        return False
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: render-one-song.py <title> [--force]"); sys.exit(1)
    title = sys.argv[1]
    force = "--force" in sys.argv
    ok = render(title, force=force)
    sys.exit(0 if ok else 1)
