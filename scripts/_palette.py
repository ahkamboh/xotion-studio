#!/usr/bin/env python3
"""Extract dominant colors from an image (no external deps — PIL only).

  python3 scripts/_palette.py <image-path> [--n 5]

Output: JSON {colors:[{hex,rgb,weight}, ...]} ordered by frequency.
Uses PIL's adaptive palette quantization (median cut).
"""
import sys, json, argparse
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("image")
ap.add_argument("--n", type=int, default=5)
args = ap.parse_args()

im = Image.open(args.image).convert("RGB")
im.thumbnail((400, 400))   # speed up

q = im.quantize(colors=args.n, method=Image.Quantize.FASTOCTREE)
palette = q.getpalette()[:args.n*3]
counts = sorted(q.getcolors(), reverse=True)   # [(count, idx), ...]

total = sum(c for c, _ in counts) or 1
colors = []
for count, idx in counts:
    r, g, b = palette[idx*3], palette[idx*3+1], palette[idx*3+2]
    colors.append({
        "hex": "#{:02x}{:02x}{:02x}".format(r, g, b),
        "rgb": [r, g, b],
        "weight": round(count / total, 3),
    })
print(json.dumps({"colors": colors}))
