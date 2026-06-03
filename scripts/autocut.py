#!/usr/bin/env python3
"""
Auto-cut a talking video: remove dead space (long pauses) and filler words, with 30ms audio
fades at every cut to avoid pops. Tightens raw footage into a clean edit. No API needed —
uses the word-level transcript (scripts/transcribe.py) + ffmpeg.

Usage:
  python3 scripts/autocut.py <video> <transcript.json> [options]

Options:
  --out FILE          output (default: <video>-cut.mp4)
  --max-gap SECONDS   pauses longer than this get trimmed (default 0.6)
  --pad SECONDS       keep this much around each word (default 0.08)
  --remove-fillers    drop um/uh/er/ah/mm/hmm (+ aggressive set with --aggressive)
  --aggressive        also drop like/you know/i mean/basically/actually/literally/so/right
  --fade MS           audio fade at each cut, ms (default 30)
  --report            print kept/removed segments + time saved, don't render
  --keep-list FILE    also write the keep-segments as JSON (for the agent / review)

The transcript must be WORD-LEVEL: [{"text","start","end"}, ...] (transcribe.py default output).
"""
import sys, json, argparse, subprocess, os, re, tempfile

FILLERS_BASIC = {"um","umm","uh","uhh","uhm","er","err","ah","ahh","mm","mmm","hmm","huh","eh"}
FILLERS_AGGR  = {"like","basically","actually","literally","so","right","well","okay","ok"}
FILLERS_PHRASE = ["you know","i mean","sort of","kind of","you know what i mean"]

def norm(w): return re.sub(r"[^a-z']", "", w.lower())

def is_filler(text, aggressive):
    t = norm(text)
    if t in FILLERS_BASIC: return True
    if aggressive and t in FILLERS_AGGR: return True
    return False

def probe_dur(path):
    out = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration",
                          "-of","default=nk=1:nw=1",path], capture_output=True, text=True)
    return float(out.stdout.strip())

def build_keep(words, max_gap, pad, remove_fillers, aggressive, dur):
    # keep non-filler words with original index
    kept = []
    for i, w in enumerate(words):
        if remove_fillers and is_filler(w["text"], aggressive):
            continue
        kept.append((i, float(w["start"]), float(w["end"])))
    if not kept:
        return []
    # build intervals, merging consecutive-original words with small gaps
    segs = []
    cs, ce, cidx = kept[0][1]-pad, kept[0][2]+pad, kept[0][0]
    for idx, s, e in kept[1:]:
        gap = s - (ce - pad)            # real gap to previous word end
        adjacent = (idx == cidx + 1)    # nothing (incl. filler) was dropped between them
        if adjacent and gap <= max_gap:
            ce = e + pad                 # extend current segment (keep natural pause)
        else:
            segs.append([max(0,cs), ce]) # close current, start new (cut the gap/filler)
            cs, ce = s-pad, e+pad
        cidx = idx
    segs.append([max(0,cs), min(dur,ce)])
    # clamp + merge overlaps
    merged = []
    for s,e in segs:
        s=max(0,s); e=min(dur,e)
        if e-s < 0.05: continue
        if merged and s <= merged[-1][1] + 0.02:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s,e])
    return merged

def render(video, segs, out, fade_ms):
    fade = fade_ms/1000.0
    parts = []
    for i,(s,e) in enumerate(segs):
        d = e - s
        fo = max(0, d - fade)
        parts.append(
            f"[0:v]trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS[v{i}];"
            f"[0:a]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS,"
            f"afade=t=in:d={fade:.3f},afade=t=out:st={fo:.3f}:d={fade:.3f}[a{i}];")
    concat_in = "".join(f"[v{i}][a{i}]" for i in range(len(segs)))
    fc = "".join(parts) + f"{concat_in}concat=n={len(segs)}:v=1:a=1[v][a]"
    # filter_complex can get long; write to a script file to avoid arg limits
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as f:
        f.write(fc); fcfile = f.name
    cmd = ["ffmpeg","-y","-i",video,"-/filter_complex",fcfile,
           "-map","[v]","-map","[a]","-c:v","libx264","-crf","18","-preset","medium",
           "-pix_fmt","yuv420p","-movflags","+faststart","-c:a","aac","-b:a","256k",out]
    r = subprocess.run(cmd, capture_output=True, text=True)
    os.unlink(fcfile)
    if r.returncode != 0:
        # fallback: older ffmpeg without -/filter_complex file support
        cmd2 = ["ffmpeg","-y","-i",video,"-filter_complex",fc,
                "-map","[v]","-map","[a]","-c:v","libx264","-crf","18","-preset","medium",
                "-pix_fmt","yuv420p","-movflags","+faststart","-c:a","aac","-b:a","256k",out]
        r = subprocess.run(cmd2, capture_output=True, text=True)
        if r.returncode != 0:
            sys.stderr.write(r.stderr[-1500:]); sys.exit("autocut render failed")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("transcript")
    ap.add_argument("--out"); ap.add_argument("--max-gap", type=float, default=0.6)
    ap.add_argument("--pad", type=float, default=0.08)
    ap.add_argument("--remove-fillers", action="store_true")
    ap.add_argument("--aggressive", action="store_true")
    ap.add_argument("--fade", type=int, default=30)
    ap.add_argument("--report", action="store_true")
    ap.add_argument("--keep-list")
    a = ap.parse_args()

    words = json.load(open(a.transcript))
    if words and isinstance(words[0], dict) and "words" in words[0]:
        flat=[]; [flat.extend(s.get("words",[])) for s in words]; words=flat
    dur = probe_dur(a.video)
    segs = build_keep(words, a.max_gap, a.pad, a.remove_fillers, a.aggressive, dur)
    if not segs: sys.exit("autocut: nothing to keep (check transcript)")

    kept = sum(e-s for s,e in segs)
    out = a.out or os.path.splitext(a.video)[0] + "-cut.mp4"
    print(f"[autocut] original {dur:.1f}s -> kept {kept:.1f}s in {len(segs)} segments "
          f"(removed {dur-kept:.1f}s, {100*(dur-kept)/dur:.0f}%)")
    if a.keep_list:
        json.dump([{"start":round(s,3),"end":round(e,3)} for s,e in segs],
                  open(a.keep_list,"w"), indent=2)
    if a.report:
        for s,e in segs: print(f"  keep {s:7.2f} - {e:7.2f}  ({e-s:.2f}s)")
        return
    render(a.video, segs, out, a.fade)
    print(f"[autocut] -> {out}")

if __name__ == "__main__":
    main()
