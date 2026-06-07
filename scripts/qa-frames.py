#!/usr/bin/env python3
"""
qa-frames.py — sample frames for the qa-visual agent to inspect (with EXPECTED content per frame).
Extracts a frame at each scene's mid + peak (from scenes.json) so the visual-QA agent can verify
each scene shows the right thing, legibly. Falls back to every --every seconds if no scenes.json.

  python3 scripts/qa-frames.py <video.mp4> [--scenes scenes.json] [--out <dir>] [--every 4]

Writes <out>/qa/frame_<t>.png + <out>/qa/manifest.json (time -> file + expected text/values).
The qa-visual agent then Reads each frame and checks: expected text present, legible (contrast),
not cut off / overlapping, no black frame, charts correct.
"""
import sys, os, json, argparse, subprocess

def grab(video, t, dst):
    subprocess.run(["ffmpeg","-y","-ss",f"{t:.2f}","-i",video,"-frames:v","1",dst],
                   capture_output=True)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("--scenes",default=None)
    ap.add_argument("--out",default=None); ap.add_argument("--every",type=float,default=4.0)
    a=ap.parse_args()
    out=a.out or os.path.dirname(os.path.abspath(a.video))
    qa=os.path.join(out,"qa"); os.makedirs(qa,exist_ok=True)
    man=[]
    if a.scenes and os.path.exists(a.scenes):
        for sc in json.load(open(a.scenes)):
            # tolerate BOTH the canonical scene-sync schema (s/e) and the start/end schema
            s = sc.get("s", sc.get("start")); e = sc.get("e", sc.get("end"))
            if s is None or e is None:
                sys.stderr.write(f"[qa-frames] skipping scene with no s/e or start/end: {sc.get('id')}\n"); continue
            mid=(float(s)+float(e))/2.0
            for tag,t in [("mid",mid),("peak",sc.get("peak"))]:
                if t is None: continue
                f=os.path.join(qa,f"{sc.get('id','sc')}_{tag}.png"); grab(a.video,t,f)
                exp={k:sc[k] for k in ("title","label","sub","to","suf","pre","vals") if k in sc}
                man.append({"t":round(float(t),2),"file":f,"scene":sc.get("id"),"expect":exp})
    else:
        dur=float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration",
            "-of","default=nokey=1:noprint_wrappers=1",a.video],capture_output=True,text=True).stdout or 0)
        t=1.0
        while t<dur:
            f=os.path.join(qa,f"frame_{t:.0f}.png"); grab(a.video,t,f)
            man.append({"t":round(t,2),"file":f}); t+=a.every
    # Write the manifest to BOTH the per-dir path AND the canonical path the QA agents read
    # (work/qa-frames-manifest.json when run with --out work) so the shared-manifest
    # fan-out actually finds it.
    json.dump(man,open(os.path.join(qa,"manifest.json"),"w"),indent=2)
    canonical=os.path.join(out,"qa-frames-manifest.json")
    json.dump(man,open(canonical,"w"),indent=2)
    print(f"[qa-frames] {len(man)} frames -> {qa}/  (manifest: {qa}/manifest.json AND {canonical})")
    for m in man: print(f"  {m['t']:>6}s  {os.path.basename(m['file'])}" + (f"  expect={m.get('expect')}" if m.get('expect') else ""))

if __name__=="__main__":
    main()
