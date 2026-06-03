#!/usr/bin/env python3
"""
Token-efficient review of a long video for the agent: one filmstrip image (thumbnails over time)
+ one waveform image + a tiny text index of timestamps. Lets the agent "see" a 10-min video in a
couple of images instead of hundreds of frames.

Usage:
  python3 scripts/filmstrip.py <video> [--out-dir work] [--cols 8] [--rows 4] [--width 1600]

Produces:
  <out-dir>/filmstrip.jpg   thumbnails tiled over the whole duration (each labeled by time)
  <out-dir>/waveform.png    full audio waveform (spot silences/loud moments visually)
  <out-dir>/filmstrip.txt   index: which tile = which timestamp
"""
import sys, argparse, subprocess, os, math

def probe(path, key):
    o = subprocess.run(["ffprobe","-v","error","-show_entries",f"format={key}",
                        "-of","default=nk=1:nw=1",path], capture_output=True, text=True)
    return o.stdout.strip()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("--out-dir", default="work")
    ap.add_argument("--cols", type=int, default=8); ap.add_argument("--rows", type=int, default=4)
    ap.add_argument("--width", type=int, default=1600)
    a = ap.parse_args()
    os.makedirs(a.out_dir, exist_ok=True)
    dur = float(probe(a.video, "duration"))
    n = a.cols * a.rows
    tile_w = a.width // a.cols

    # filmstrip: sample n frames evenly, tile them
    fs = os.path.join(a.out_dir, "filmstrip.jpg")
    fps = n / dur if dur > 0 else 1
    subprocess.run(["ffmpeg","-y","-i",a.video,
        "-vf",f"fps={fps:.6f},scale={tile_w}:-1,tile={a.cols}x{a.rows}",
        "-frames:v","1","-q:v","3",fs], capture_output=True)

    # waveform
    wf = os.path.join(a.out_dir, "waveform.png")
    subprocess.run(["ffmpeg","-y","-i",a.video,
        "-filter_complex",f"showwavespic=s={a.width}x240:colors=white",
        "-frames:v","1",wf], capture_output=True)

    # index text
    idx = os.path.join(a.out_dir, "filmstrip.txt")
    with open(idx,"w") as f:
        f.write(f"video: {a.video}\nduration: {dur:.1f}s\n")
        f.write(f"filmstrip: {a.cols}x{a.rows} = {n} thumbnails, left->right, top->bottom.\n")
        f.write(f"each thumbnail ~ every {dur/n:.1f}s. tile k (0-indexed) ~ t = k*{dur/n:.2f}s.\n")
        for r in range(a.rows):
            row = "  ".join(f"{(r*a.cols+c)*dur/n:5.1f}s" for c in range(a.cols))
            f.write(f"row{r+1}: {row}\n")
    print(f"[filmstrip] {fs}\n[filmstrip] {wf}\n[filmstrip] {idx}")
    print(f"[filmstrip] duration {dur:.1f}s -> {n} thumbnails. Read filmstrip.jpg + waveform.png.")

if __name__ == "__main__":
    main()
