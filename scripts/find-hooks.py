#!/usr/bin/env python3
"""
Auto-suggest the best reel/Short segments from a song or talk.

Scores each transcript segment by:
  - audio energy in its window (louder/fuller = more engaging)
  - line repetition (hooks/choruses repeat)
  - presence of strong keywords (you, love, never, money, secret, free, ... emotional/CTA words)
  - reasonable length for a Short

Usage:
  python3 scripts/find-hooks.py <audio> <transcript.segments.json> [--n 12] [--len 18] [--out segments.txt]

Writes a segments.txt (START|DURATION|hook label) ready for scripts/cut-reels.sh.
"""
import sys, json, math, wave, struct, argparse, subprocess, tempfile, os, re

STRONG = set("""you your love never always heart pain money free secret stop start now today
best worst first last every only forever lost gone home dream fear hope truth lie
win lose rich broke power change life death time night fire cold alone us we i'll
funded payout profit trade simulated link bio""".split())

def wav_rms(path, hz=10):
    if not path.lower().endswith(".wav"):
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
        subprocess.run(["ffmpeg","-y","-i",path,"-ar","16000","-ac","1",tmp], check=True, capture_output=True)
        path, is_tmp = tmp, True
    else:
        is_tmp = False
    with wave.open(path,"rb") as w:
        rate, n = w.getframerate(), w.getnframes()
        s = struct.unpack(f"{n}h", w.readframes(n))
    if is_tmp: os.unlink(path)
    chunk = rate // hz
    env = []
    for i in range(0, n, chunk):
        b = s[i:i+chunk]
        if not b: break
        env.append(math.sqrt(sum(x*x for x in b)/len(b)))
    mx = max(env) or 1
    return [e/mx for e in env], hz

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio"); ap.add_argument("segments")
    ap.add_argument("--n", type=int, default=12)
    ap.add_argument("--len", type=float, default=18)
    ap.add_argument("--out", default="segments.txt")
    args = ap.parse_args()

    segs = json.load(open(args.segments))
    env, hz = wav_rms(args.audio)
    counts = {}
    for s in segs:
        k = re.sub(r"[^a-z ]","", s["text"].lower()).strip()
        counts[k] = counts.get(k, 0) + 1

    scored = []
    for s in segs:
        txt = s["text"].strip()
        if not txt: continue
        a, b = int(s["start"]*hz), int(s["end"]*hz)
        energy = sum(env[a:b]) / max(1, b-a)
        words = re.sub(r"[^a-z' ]","", txt.lower()).split()
        kw = sum(1 for w in words if w in STRONG) / max(1, len(words))
        rep = counts.get(re.sub(r"[^a-z ]","", txt.lower()).strip(), 1)
        dur = s["end"] - s["start"]
        lenfit = 1 - min(1, abs(dur - 4) / 6)   # prefer ~lyric-line length segments
        score = energy*1.0 + kw*1.2 + (rep-1)*0.5 + lenfit*0.4
        scored.append((score, s["start"], txt))

    scored.sort(reverse=True)
    picked, used = [], []
    for score, start, txt in scored:
        if any(abs(start - u) < args.len*0.8 for u in used):
            continue
        used.append(start)
        picked.append((start, txt))
        if len(picked) >= args.n: break
    picked.sort()

    with open(args.out, "w") as f:
        for start, txt in picked:
            st = max(0, start - 0.3)
            f.write(f"{st:.1f}|{args.len:.0f}|{txt[:48]}\n")
    print(f"[find-hooks] {len(picked)} segments -> {args.out}")
    for start, txt in picked:
        print(f"  {start:6.1f}  {txt[:60]}")

if __name__ == "__main__":
    main()
