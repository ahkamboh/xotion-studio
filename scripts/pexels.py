#!/usr/bin/env python3
"""Fetch watermark-free stock VIDEO from Pexels (commercial-OK, no attribution required).
  PEXELS_API_KEY=xxx python3 scripts/pexels.py "query" out.mp4 [--orient landscape|portrait] [--min-w 1280]
Picks the best file <= 1920 wide (or >= --min-w). Browser UA + Authorization header (avoids 403)."""
import sys, os, json, argparse, urllib.request

def get(url, key):
    req = urllib.request.Request(url, headers={
        "Authorization": key,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"})
    return urllib.request.urlopen(req, timeout=60)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("query"); ap.add_argument("out")
    ap.add_argument("--orient", default="landscape"); ap.add_argument("--min-w", type=int, default=1280)
    ap.add_argument("--page", type=int, default=1)
    a = ap.parse_args()
    key = os.environ.get("PEXELS_API_KEY") or sys.exit("set PEXELS_API_KEY")
    url = (f"https://api.pexels.com/videos/search?query={urllib.parse.quote(a.query)}"
           f"&orientation={a.orient}&per_page=8&page={a.page}")
    data = json.load(get(url, key))
    vids = data.get("videos", [])
    if not vids: sys.exit(f"no results for '{a.query}'")
    # choose a video + its best file <=1920 wide (prefer ~1920, mp4)
    best = None
    for v in vids:
        for f in v.get("video_files", []):
            w = f.get("width") or 0
            if f.get("file_type") != "video/mp4": continue
            if w < a.min_w: continue
            score = -abs(1920 - w)          # closest to 1920
            if best is None or score > best[0]: best = (score, f["link"], v["id"], w)
    if not best: sys.exit(f"no suitable file for '{a.query}'")
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with get(best[1], key) as r, open(a.out, "wb") as o: o.write(r.read())
    print(f"[pexels] '{a.query}' -> {a.out}  (id {best[2]}, {best[3]}w)")

if __name__ == "__main__":
    main()
