#!/usr/bin/env python3
"""
build_reel.py — build ONE KAMBOJH ASCII-Magic reel (vertical 1080x1920).

Pipeline: hook+beats (librosa) → extract hook audio → prep vertical bg →
ascii_fx (color ASCII + beat pulse) → HyperFrames caption/tag/CTA overlay on black →
screen-blend overlay over ascii bg → mux hook audio.

Driven by a JSON spec (one song, one variant). See REELS_SPEC in make_reels.py.
"""
import os, sys, json, subprocess, tempfile, argparse

HOME = os.path.expanduser("~")
SDIR = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.join(SDIR, "..")
PROJ = os.path.join(STUDIO, "projects", "kambojh-reel")
WHISPER_PY = os.path.join(STUDIO, ".venv-whisperx", "bin", "python")
OUT = os.path.join(HOME, "Downloads", "KAMBOJH-REELS")
BGCACHE = os.path.join(HOME, "Downloads", "reel-bg-cache")
os.makedirs(OUT, exist_ok=True); os.makedirs(BGCACHE, exist_ok=True)
HOOK = 18.0


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def fetch_bg(query, slug):
    """Fetch (and cache) a vibrant vertical bg loop for a query."""
    cached = os.path.join(BGCACHE, f"{slug}.mp4")
    if os.path.exists(cached):
        return cached
    raw = os.path.join(BGCACHE, f"{slug}.raw")
    r = run(["bash", os.path.join(SDIR, "pixabay-any.sh"), "video", query, raw])
    src = raw if os.path.exists(raw) else None
    if not src:
        return None
    # crop to vertical
    run(["ffmpeg","-y","-v","error","-i",src,"-r","30",
         "-vf","scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1",
         "-an","-t","20", cached])
    if os.path.exists(raw): os.remove(raw)
    return cached if os.path.exists(cached) else None


def build(spec):
    name = spec["name"]; variant = spec.get("variant", 1)
    audio = os.path.join(HOME, "Downloads", spec["audio"])
    out = os.path.join(OUT, f"{name} - REEL {variant}.mp4")
    if not os.path.exists(audio):
        print(f"[SKIP] no audio: {audio}"); return None
    print(f"[BUILD] {name} reel {variant}", flush=True)

    tmp = tempfile.mkdtemp(prefix=f"reel_{name.replace(' ','_')}_")
    try:
        # 1a) VOCAL hook window + MMS_FA forced-aligned word timing. Captions MUST sit on
        #     real singing. Run under WHISPER_PY so mms_align's torch/torchaudio are available.
        sc = run([WHISPER_PY, os.path.join(SDIR,"sync_reel_caption.py"), audio,
                  json.dumps(spec["lines"], ensure_ascii=False),
                  "--lang", spec.get("lang","hi"), "--hook", str(HOOK),
                  "--window-model", spec.get("window_model","small"),
                  "--start", str(spec.get("hook_start",-1))])
        sync = json.loads(sc.stdout.strip().splitlines()[-1])
        hs = sync["hook_start"]; timed_words = sync["words"]; nlines = sync["nlines"]
        print(f"  align_path={sync.get('align_path')} warnings={len(sync.get('warnings',[]))}", flush=True)

        # 1b) beats within that vocal window (for the bg pulse)
        ab = run([WHISPER_PY, os.path.join(SDIR,"audio_hook_beats.py"), audio,
                  "--hook", str(HOOK), "--start", str(hs)])
        info = json.loads(ab.stdout.strip().splitlines()[-1])
        beats = info["beats"]
        print(f"  vocal hook@{hs}s  words={len(timed_words)} lines={nlines} beats={len(beats)}", flush=True)

        # 2) hook audio with fades
        hook_mp3 = os.path.join(tmp, "hook.mp3")
        run(["ffmpeg","-y","-v","error","-ss",str(hs),"-t",str(HOOK),"-i",audio,
             "-af",f"afade=t=in:st=0:d=0.3,afade=t=out:st={HOOK-1.5}:d=1.5,aresample=44100",
             "-c:a","libmp3lame","-q:a","2", hook_mp3])

        # 3+4) ascii bg: procedural (preferred — no clip lottery) or from a fetched video
        beatsf = os.path.join(tmp, "beats.json")
        json.dump(beats, open(beatsf,"w"))
        ascii_mp4 = os.path.join(tmp, "ascii.mp4")
        common = ["--cols", str(spec.get("cols",128)), "--dur", str(HOOK),
                  "--beats", beatsf, "--accent", spec["accent_rgb"]]
        if spec.get("gen"):
            af = run(["python3", os.path.join(SDIR,"ascii_fx.py"), "x", ascii_mp4,
                      "--gen", spec["gen"]] + common)
        else:
            bg = fetch_bg(spec["bg_query"], spec["bg_slug"])
            if not bg:
                print("  [ERROR] no bg"); return None
            bg_trim = os.path.join(tmp, "bg.mp4")
            run(["ffmpeg","-y","-v","error","-stream_loop","-1","-i",bg,"-t",str(HOOK),
                 "-r","30","-an", bg_trim])
            af = run(["python3", os.path.join(SDIR,"ascii_fx.py"), bg_trim, ascii_mp4]
                     + common + (["--mono"] if spec.get("mono") else []))
        if not os.path.exists(ascii_mp4):
            print("  [ERROR] ascii_fx:", af.stderr[-300:]); return None

        # 5) overlay song.js + render captions on black
        tag = spec.get("tag", f'{name.upper()} <span>·</span> KAMBOJH')
        with open(os.path.join(PROJ,"assets","song.js"),"w") as f:
            f.write(f"window.__DUR={HOOK};\n")
            f.write(f"window.__ACCENT={json.dumps(spec['accent'])};\n")
            f.write(f"window.__TAG={json.dumps(tag)};\n")
            f.write("window.__BEATS="+json.dumps(beats)+";\n")
            f.write("window.__NLINES="+json.dumps(nlines)+";\n")
            f.write("window.__WORDS="+json.dumps(timed_words,ensure_ascii=False)+";\n")
        overlay = os.path.join(tmp, "overlay.mp4")
        r = run(["npx","hyperframes","render","--output",overlay,"--fps","30","--quiet","."], cwd=PROJ)
        if not os.path.exists(overlay):
            # fallback: latest render
            rd = os.path.join(PROJ,"renders")
            c = [x for x in os.listdir(rd) if x.endswith(".mp4")] if os.path.isdir(rd) else []
            if not c: print("  [ERROR] overlay render:", r.stderr[-300:]); return None
            overlay = os.path.join(rd, max(c, key=lambda x: os.path.getmtime(os.path.join(rd,x))))

        # 6) screen-blend overlay over ascii bg, mux hook audio
        # screen-blend MUST run in RGB (gbrp) — blending YUV chroma planes corrupts hue
        run(["ffmpeg","-y","-v","error","-i",ascii_mp4,"-i",overlay,"-i",hook_mp3,
             "-filter_complex",
             "[0:v]format=gbrp[a];[1:v]format=gbrp[b];[a][b]blend=all_mode=screen,format=yuv420p[v]",
             "-map","[v]","-map","2:a",
             "-c:v","libx264","-preset","medium","-crf","19","-pix_fmt","yuv420p",
             "-g","60","-movflags","+faststart","-c:a","aac","-b:a","256k","-ar","48000",
             "-shortest", out])
        if os.path.exists(out):
            mb = os.path.getsize(out)/1048576
            print(f"  [OK] {out} ({mb:.1f} MB)", flush=True)
            return out
        print("  [ERROR] final mux failed"); return None
    finally:
        import shutil; shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("spec_json", help="path to a JSON spec file (single reel)")
    a = ap.parse_args()
    spec = json.load(open(a.spec_json))
    build(spec)
