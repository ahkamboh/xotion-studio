#!/usr/bin/env bash
# Install a ready-made block from the HyperFrames registry (111 blocks: transitions,
# data charts, maps, caption styles, social overlays, effects). Use BEFORE hand-building.
# Usage:
#   scripts/add-block.sh <name> [project_dir]     # e.g. whip-pan, data-chart, world-map
#   scripts/add-block.sh --list                   # browse the catalog (see docs/blocks.md)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HF="$ROOT/node_modules/.bin/hyperframes"; [ -x "$HF" ] || HF="npx hyperframes"
if [ "${1:-}" = "--list" ]; then $HF catalog; exit 0; fi
NAME="${1:?usage: scripts/add-block.sh <name> [project_dir]  (try --list)}"
DIR="${2:-.}"
( cd "$DIR" && $HF add "$NAME" )
echo "[add-block] installed '$NAME' into $DIR — include the printed snippet in index.html"
