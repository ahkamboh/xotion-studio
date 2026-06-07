#!/usr/bin/env python3
"""Tile JPGs from a directory into a single contact-sheet image (cover-crop).

  python3 scripts/_contact-sheet.py <dir-of-jpgs> <out.jpg> [--cols=5] [--cell=400] [--pad=8]

Reusable by pinterest / dribbble / vimeo moodboard scripts.
"""
import argparse, glob, os, sys
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("indir")
ap.add_argument("out")
ap.add_argument("--cols", type=int, default=5)
ap.add_argument("--cell", type=int, default=400)
ap.add_argument("--pad",  type=int, default=8)
args = ap.parse_args()

paths = sorted(glob.glob(os.path.join(args.indir, "*.jpg")) +
               glob.glob(os.path.join(args.indir, "*.png")))
if not paths:
    sys.exit("no images in " + args.indir)

n = len(paths)
rows = (n + args.cols - 1) // args.cols
W = args.cols * args.cell + (args.cols + 1) * args.pad
H = rows     * args.cell + (rows     + 1) * args.pad
sheet = Image.new("RGB", (W, H), (16, 16, 18))

for i, path in enumerate(paths):
    try:
        im = Image.open(path).convert("RGB")
        r = max(args.cell / im.width, args.cell / im.height)
        im = im.resize((int(im.width*r), int(im.height*r)), Image.LANCZOS)
        left = (im.width  - args.cell) // 2
        top  = (im.height - args.cell) // 2
        im = im.crop((left, top, left + args.cell, top + args.cell))
        col, row = i % args.cols, i // args.cols
        x = args.pad + col * (args.cell + args.pad)
        y = args.pad + row * (args.cell + args.pad)
        sheet.paste(im, (x, y))
    except Exception as e:
        print(f"  skip {path}: {e}", file=sys.stderr)

sheet.save(args.out, "JPEG", quality=88, optimize=True)
print(f"[contact-sheet] {sheet.size[0]}x{sheet.size[1]}  ({n} thumbs)", file=sys.stderr)
