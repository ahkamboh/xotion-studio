#!/usr/bin/env python3
"""
render-batch.py — data-driven rendering: one template project -> N videos from data.
The Remotion-style superpower, free on HyperFrames (--variables).

  python3 scripts/render-batch.py <project_dir> <data.csv|data.json> [--out DIR] [--name COL] [--fps 30]

DATA:
  CSV   — header row = variable ids; each row = one video. e.g.
            name,title,subtitle,accent
            acme,Welcome Acme,Your demo is ready,#22c55e
  JSON  — array of objects: [{"name":"acme","title":"Welcome Acme","accent":"#22c55e"}, ...]

The project's composition must declare matching data-composition-variables and read them via
window.__hyperframes.getVariables() (see templates/data-driven-card.html).

  --name COL   column/key used for the output filename (default: "name", else row index)
  --out  DIR   output directory (default: <project>/renders/batch)
  --fps  N     frame rate (default 30)

Each row renders to <out>/<name>.mp4 with that row's values as --variables.
"""
import sys, os, csv, json, argparse, subprocess, re

def slug(s, i):
    s = str(s).strip() if s else f"row{i:03d}"
    return re.sub(r"[^a-zA-Z0-9._-]+", "-", s).strip("-") or f"row{i:03d}"

def load_rows(path):
    if path.lower().endswith(".json"):
        data = json.load(open(path, encoding="utf-8"))
        if not isinstance(data, list):
            sys.exit("JSON must be an array of objects")
        return [dict(r) for r in data]
    with open(path, encoding="utf-8") as f:
        return [dict(r) for r in csv.DictReader(f)]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project"); ap.add_argument("data")
    ap.add_argument("--out", default=None); ap.add_argument("--name", default="name")
    ap.add_argument("--fps", default="30")
    a = ap.parse_args()

    if not os.path.isdir(a.project): sys.exit(f"project not found: {a.project}")
    if not os.path.isfile(a.data):   sys.exit(f"data not found: {a.data}")
    out = a.out or os.path.join(a.project, "renders", "batch")
    os.makedirs(out, exist_ok=True)

    rows = load_rows(a.data)
    if not rows: sys.exit("no rows in data")
    print(f"[batch] {len(rows)} rows -> {out}")

    ok = 0
    for i, row in enumerate(rows):
        name = slug(row.get(a.name), i)
        dst = os.path.join(out, f"{name}.mp4")
        variables = json.dumps({k: v for k, v in row.items() if v not in (None, "")})
        print(f"  [{i+1}/{len(rows)}] {name}.mp4  vars={variables}")
        r = subprocess.run(
            ["npx", "hyperframes", "render", a.project,
             "--variables", variables, "--fps", str(a.fps), "--output", dst, "--quiet"],
            capture_output=True, text=True)
        if r.returncode == 0 and os.path.exists(dst):
            ok += 1
        else:
            print(f"      FAILED: {(r.stderr or r.stdout).strip().splitlines()[-1:] }")
    print(f"\n[batch] done: {ok}/{len(rows)} rendered -> {out}")

if __name__ == "__main__":
    main()
