#!/usr/bin/env python3
"""
Download a curated, design-grade font library from Google Fonts as .ttf files.

Usage:  python3 scripts/download-fonts.py [--out assets/fonts]

Pulls the most-used families across every category (sans, display, serif, script,
mono, condensed, trendy) at their key weights. Files are saved flat as
<family-slug>-<weight>.ttf  (e.g. montserrat-700.ttf, bebas-neue-400.ttf).
Italic styles for select families are saved as <slug>-<weight>i.ttf.
"""
import sys, os, re, time, argparse, urllib.request

UA = "Mozilla/5.0 (Windows NT 6.1; Win64; x64)"  # old UA -> Google serves TTF, not woff2

# family : weights (normal). Use "i:" prefix inside list for italic of that weight.
FONTS = {
    # ---- Sans-serif workhorses ----
    "Inter": "400;500;600;700;800;900",
    "Poppins": "400;500;600;700;800",
    "Montserrat": "400;500;600;700;800;900",
    "Roboto": "400;500;700;900",
    "Open Sans": "400;600;700;800",
    "Lato": "400;700;900",
    "Work Sans": "400;500;600;700;800",
    "DM Sans": "400;500;700",
    "Manrope": "400;500;600;700;800",
    "Plus Jakarta Sans": "400;500;600;700;800",
    "Outfit": "400;500;600;700;800",
    "Sora": "400;600;700;800",
    "Figtree": "400;500;600;700;800",
    "Hanken Grotesk": "400;600;700;800",
    "Archivo": "400;600;700;800;900",
    "Nunito": "400;600;700;800",
    "Nunito Sans": "400;600;700;800",
    "Quicksand": "400;500;600;700",
    "Josefin Sans": "400;600;700",
    "Comfortaa": "400;600;700",
    "Mulish": "400;600;700;800",
    "Rubik": "400;500;600;700;800",
    "Barlow": "400;500;600;700;800",
    "Karla": "400;600;700;800",
    # ---- Display / bold headline ----
    "Bebas Neue": "400",
    "Anton": "400",
    "Oswald": "400;500;600;700",
    "Archivo Black": "400",
    "Bungee": "400",
    "Righteous": "400",
    "Teko": "400;500;600;700",
    "Khand": "400;500;600;700",
    "Bricolage Grotesque": "400;600;700;800",
    "Unbounded": "400;600;700;800",
    "Syne": "400;600;700;800",
    "Gabarito": "400;600;700;800;900",
    "Fjalla One": "400",
    "Alfa Slab One": "400",
    "Titan One": "400",
    "Passion One": "400;700;900",
    # ---- Elegant serifs ----
    "Playfair Display": "400;500;600;700;800;900",
    "Merriweather": "400;700;900",
    "Lora": "400;500;600;700",
    "Cormorant Garamond": "400;500;600;700",
    "EB Garamond": "400;500;600;700;800",
    "Libre Baskerville": "400;700",
    "DM Serif Display": "400",
    "DM Serif Text": "400",
    "Instrument Serif": "400",
    "Crimson Pro": "400;600;700",
    "Source Serif 4": "400;600;700",
    "Fraunces": "400;600;700;900",
    "Newsreader": "400;600;700",
    "Spectral": "400;600;700;800",
    "Bodoni Moda": "400;600;700;900",
    "Abril Fatface": "400",
    # ---- Trendy / geometric / editorial ----
    "Space Grotesk": "400;500;600;700",
    "Sora ": "",  # placeholder removed below
    "Epilogue": "400;600;700;800",
    "Onest": "400;600;700;800",
    "Schibsted Grotesk": "400;600;700;800;900",
    # ---- Script / handwriting ----
    "Pacifico": "400",
    "Dancing Script": "400;600;700",
    "Great Vibes": "400",
    "Caveat": "400;600;700",
    "Satisfy": "400",
    "Sacramento": "400",
    "Allura": "400",
    "Lobster": "400",
    "Kaushan Script": "400",
    "Yellowtail": "400",
    "Cookie": "400",
    "Parisienne": "400",
    # ---- Monospace ----
    "JetBrains Mono": "400;500;700",
    "Space Mono": "400;700",
    "IBM Plex Mono": "400;500;600;700",
    "Fira Code": "400;500;700",
    "Roboto Mono": "400;500;700",
    # ---- Condensed ----
    "Barlow Condensed": "400;500;600;700",
    "Saira Condensed": "400;600;700;800",
    "Archivo Narrow": "400;600;700",
}
FONTS.pop("Sora ", None)

def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

def fetch_css(family, weights):
    fam = family.replace(" ", "+")
    url = f"https://fonts.googleapis.com/css2?family={fam}:wght@{weights}&display=swap"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=30).read().decode()

def parse(css):
    # returns list of (weight, url) from each @font-face block (normal style only)
    out = []
    for block in css.split("@font-face")[1:]:
        if "font-style: italic" in block:
            continue
        w = re.search(r"font-weight:\s*(\d+)", block)
        u = re.search(r"src:\s*url\((https://[^)]+\.ttf)\)", block)
        if w and u:
            out.append((w.group(1), u.group(1)))
    return out

def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    data = urllib.request.urlopen(req, timeout=60).read()
    with open(dest, "wb") as f:
        f.write(data)
    return len(data)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="assets/fonts")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    total, fams_ok, fails = 0, 0, []
    for family, weights in FONTS.items():
        if not weights:
            continue
        try:
            css = fetch_css(family, weights)
            pairs = parse(css)
            if not pairs:
                fails.append(family); continue
            s = slug(family)
            for w, url in pairs:
                dest = os.path.join(args.out, f"{s}-{w}.ttf")
                if os.path.exists(dest):
                    continue
                n = download(url, dest)
                total += 1
                time.sleep(0.05)
            fams_ok += 1
            print(f"ok  {family}  ({len(pairs)} weights)")
        except Exception as e:
            fails.append(f"{family} ({e})")
            print(f"!!  {family}: {e}", file=sys.stderr)
    print(f"\n[fonts] {fams_ok} families, {total} new files -> {args.out}")
    if fails:
        print("[fonts] failed:", ", ".join(fails))

if __name__ == "__main__":
    main()
