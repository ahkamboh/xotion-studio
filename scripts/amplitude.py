#!/usr/bin/env python3
"""
Compute an audio amplitude envelope for the music-visualizer bars.

Usage:
  python3 scripts/amplitude.py <audio> [--out assets/amp.js] [--hz 10]

Produces a JS file: `window.__AMP = [0.0, 0.13, ...];`
- One value per (1000/hz) ms, RMS normalised 0..1, curved **0.7, 3-tap smoothed.
- Load it in the composition with <script src="assets/amp.js"></script>.
"""
import sys, json, math, wave, struct, argparse, subprocess, tempfile, os

def ensure_wav(src):
    if src.lower().endswith(".wav"):
        return src, False
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    subprocess.run(["ffmpeg", "-y", "-i", src, "-ar", "16000", "-ac", "1", tmp],
                   check=True, capture_output=True)
    return tmp, True

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("--out", default="assets/amp.js")
    ap.add_argument("--hz", type=int, default=10)
    args = ap.parse_args()

    wav, is_tmp = ensure_wav(args.input)
    with wave.open(wav, "rb") as w:
        rate, n = w.getframerate(), w.getnframes()
        raw = w.readframes(n)
    samples = struct.unpack(f"{n}h", raw)
    if is_tmp:
        os.unlink(wav)

    chunk = rate // args.hz
    rms = []
    for i in range(0, n, chunk):
        block = samples[i:i + chunk]
        if not block:
            break
        rms.append(math.sqrt(sum(s * s for s in block) / len(block)))
    mx = max(rms) or 1
    rms = [r / mx for r in rms]

    out = []
    for i in range(len(rms)):
        a = rms[max(0, i - 1)]; b = rms[i]; c = rms[min(len(rms) - 1, i + 1)]
        out.append(round(((a + b + c) / 3) ** 0.7, 3))

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w") as f:
        f.write("window.__AMP = " + json.dumps(out) + ";\n")
    print(f"[amplitude] {len(out)} samples @ {args.hz}Hz -> {args.out}")

if __name__ == "__main__":
    main()
