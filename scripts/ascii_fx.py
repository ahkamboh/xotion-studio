#!/usr/bin/env python3
"""
ascii_fx.py — turn any video into color-ASCII art (ASCII-Magic style), vertical 1080x1920.

Decodes frames via ffmpeg, renders color ASCII with a vectorized glyph-atlas compositor,
optional post-FX (bloom, chromatic aberration, scanlines), beat-synced glow pulse.

Usage:
  python3 scripts/ascii_fx.py IN.mp4 OUT.mp4 [--cols 120] [--fps 30]
      [--ramp "@#S08Xx+=-;:,. "] [--accent 246,210,122] [--mono]
      [--bloom 0.5] [--chroma 2] [--scan 0.12] [--beats beats.json] [--dur 18]
"""
import os, sys, json, argparse, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
FONT = os.path.join(os.path.dirname(__file__), "..", "assets", "fonts", "jetbrains-500.ttf")


def probe_size(path):
    r = subprocess.run(["ffprobe","-v","error","-select_streams","v:0",
        "-show_entries","stream=width,height","-of","csv=p=0:s=x",path],
        capture_output=True, text=True)
    w,h = r.stdout.strip().split("x"); return int(w),int(h)


def build_atlas(ramp, cw, ch):
    """Render each ramp char as a white alpha mask tile (ch,cw) float 0..1."""
    fnt = ImageFont.truetype(FONT, ch)
    atlas = np.zeros((len(ramp), ch, cw), np.float32)
    for i,c in enumerate(ramp):
        im = Image.new("L", (cw, ch), 0)
        d = ImageDraw.Draw(im)
        try:
            bb = d.textbbox((0,0), c, font=fnt)
            x = (cw-(bb[2]-bb[0]))//2 - bb[0]; y = (ch-(bb[3]-bb[1]))//2 - bb[1]
        except Exception:
            x,y = 0,0
        d.text((x,y), c, fill=255, font=fnt)
        atlas[i] = np.asarray(im, np.float32)/255.0
    return atlas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inp"); ap.add_argument("out")
    ap.add_argument("--cols", type=int, default=120)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--ramp", default="@#S08Xx+=-;:,. ")
    ap.add_argument("--accent", default="")           # r,g,b for mono tint
    ap.add_argument("--mono", action="store_true")     # ignore source color, tint by accent/white
    ap.add_argument("--bloom", type=float, default=0.55)
    ap.add_argument("--chroma", type=int, default=2)
    ap.add_argument("--scan", type=float, default=0.06)
    ap.add_argument("--bright", type=float, default=0.06)   # source pre-grade
    ap.add_argument("--contrast", type=float, default=1.35)
    ap.add_argument("--sat", type=float, default=1.9)
    ap.add_argument("--gamma", type=float, default=1.25)
    ap.add_argument("--gain", type=float, default=1.6)      # lit-cell color boost
    ap.add_argument("--beats", default="")
    ap.add_argument("--dur", type=float, default=0)
    ap.add_argument("--gen", default="", choices=["","plasma","tunnel","flow"],
                    help="generate procedural bg instead of reading a video")
    a = ap.parse_args()

    # cell geometry — JetBrains mono ~ 0.6 aspect
    cw = max(4, W // a.cols)
    ch = int(round(cw / 0.6))
    cols = W // cw
    rows = H // ch
    ow, oh = cols*cw, rows*ch       # rendered area (<=W,H), we pad/center
    ramp = a.ramp
    n = len(ramp)
    atlas = build_atlas(ramp, cw, ch)   # (n, ch, cw)

    accent = None
    if a.accent:
        accent = np.array([float(x) for x in a.accent.split(",")], np.float32)/255.0

    beats = []
    if a.beats and os.path.exists(a.beats):
        beats = json.load(open(a.beats))

    GEN = a.gen
    pin = None
    if not GEN:
        # decode pipe: pre-grade (punch brightness/contrast/saturation) so ASCII is dense + colorful
        grade = f"eq=brightness={a.bright}:contrast={a.contrast}:saturation={a.sat}:gamma={a.gamma}"
        vf = f"fps={a.fps},scale={ow}:{oh}:force_original_aspect_ratio=increase,crop={ow}:{oh},{grade}"
        dec = ["ffmpeg","-v","error"]
        if a.dur>0: dec += ["-t", str(a.dur)]
        dec += ["-i", a.inp, "-vf", vf, "-pix_fmt","rgb24","-f","rawvideo","-"]
        pin = subprocess.Popen(dec, stdout=subprocess.PIPE)
    else:
        # procedural grid coords (aspect-corrected), accent palette
        gx = np.linspace(0, 1, cols, dtype=np.float32)[None, :].repeat(rows, 0)
        gy = np.linspace(0, 1, rows, dtype=np.float32)[:, None].repeat(cols, 1)
        acc = accent if accent is not None else np.array([0.96,0.82,0.48], np.float32)
        total_frames = int(round(a.dur * a.fps)) if a.dur > 0 else a.fps * 18

    def gen_grids(t):
        """Return (cg rows,cols,3 in 0..1, lum rows,cols) for procedural frame at time t."""
        ph = t * 1.6
        if GEN == "tunnel":
            dx = gx - 0.5; dy = (gy - 0.5)
            r = np.sqrt(dx*dx + dy*dy); ang = np.arctan2(dy, dx)
            V = 0.5 + 0.5*np.sin(13*r - ph*2.0 + 3*ang)
        elif GEN == "flow":
            V = 0.5 + 0.5*np.sin(np.sin(gx*5+ph)*2.5 + np.cos(gy*6-ph*0.7)*2.5 + ph)
        else:  # plasma
            V = (np.sin(gx*6+ph) + np.sin(gy*7-ph*0.8)
                 + np.sin((gx*4+gy*5)+ph*0.6)
                 + np.sin(np.sqrt((gx-0.5)**2*36+(gy-0.5)**2*100) - ph*1.2))
            V = (V + 4.0) / 8.0
        V = np.clip(V, 0, 1).astype(np.float32)
        # accent-dominant color with subtle iridescent shimmer
        shim = np.stack([
            0.5+0.5*np.sin(2*np.pi*(V+0.00)+ph*0.4),
            0.5+0.5*np.sin(2*np.pi*(V+0.18)+ph*0.4),
            0.5+0.5*np.sin(2*np.pi*(V+0.36)+ph*0.4)], -1).astype(np.float32)
        col = acc[None,None,:]*(0.30+0.95*V[...,None]) + 0.22*shim*V[...,None]
        return np.clip(col,0,1), V

    enc = ["ffmpeg","-y","-v","error","-f","rawvideo","-pix_fmt","rgb24",
           "-s", f"{W}x{H}","-r", str(a.fps),"-i","-",
           "-c:v","libx264","-preset","medium","-crf","18","-pix_fmt","yuv420p",
           "-g","60","-movflags","+faststart", a.out]
    pout = subprocess.Popen(enc, stdin=subprocess.PIPE)

    frame_bytes = ow*oh*3
    xoff, yoff = (W-ow)//2, (H-oh)//2
    fi = 0
    while True:
        if GEN:
            if fi >= total_frames: break
            cg, lum = gen_grids(fi / a.fps)
        else:
            buf = pin.stdout.read(frame_bytes)
            if len(buf) < frame_bytes: break
            src = np.frombuffer(buf, np.uint8).reshape(oh, ow, 3).astype(np.float32)
            cg = src.reshape(rows, ch, cols, cw, 3).mean(axis=(1,3)) / 255.0
            lum = cg[...,0]*0.299 + cg[...,1]*0.587 + cg[...,2]*0.114
        # brightness -> glyph index: brighter => denser char (index 0 = '@')
        idx = ((1.0-lum)*(n-1)).astype(np.int32).clip(0,n-1)
        glyph = atlas[idx]                              # (rows,cols,ch,cw)
        # color: procedural (already themed) / mono accent / video source boosted
        if GEN:
            col = cg
        elif a.mono:
            tint = accent if accent is not None else np.array([1,1,1],np.float32)
            col = np.broadcast_to(tint,(rows,cols,3)).copy()
        else:
            col = np.clip(cg*a.gain+0.04, 0, 1)          # punch lit-cell colors
        # beat pulse -> brighten whole frame briefly
        if beats:
            t = fi / a.fps
            pulse = 0.0
            for b in beats:
                d = t-b
                if 0 <= d < 0.18: pulse = max(pulse, (1-d/0.18))
            col = np.clip(col*(1+0.35*pulse), 0, 1)
        # composite: (rows,cols,ch,cw,3) = glyph[...,None]*col[:,:,None,None,:]
        out_cells = glyph[...,None] * col[:,:,None,None,:]      # (rows,cols,ch,cw,3)
        img = out_cells.transpose(0,2,1,3,4).reshape(oh, ow, 3)
        img = (img*255).astype(np.uint8)
        # post-fx on PIL
        pim = Image.new("RGB",(W,H),(0,0,0))
        pim.paste(Image.fromarray(img),(xoff,yoff))
        arr = np.asarray(pim).astype(np.float32)
        if a.bloom>0:
            from PIL import ImageFilter
            glow = Image.fromarray(arr.astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))
            arr = np.clip(arr + np.asarray(glow).astype(np.float32)*a.bloom, 0, 255)
        if a.chroma>0:
            s=a.chroma
            arr[:,s:,0]   = arr[:,:-s,0]      # shift R right
            arr[:,:-s,2]  = arr[:,s:,2]       # shift B left
        if a.scan>0:
            arr[::2,:,:] *= (1.0-a.scan)
        pout.stdin.write(arr.astype(np.uint8).tobytes())
        fi += 1

    if pin: pin.stdout.close()
    pout.stdin.close(); pout.wait()
    print(f"✓ {a.out}  ({fi} frames, grid {cols}x{rows}, cell {cw}x{ch})")


if __name__ == "__main__":
    main()
