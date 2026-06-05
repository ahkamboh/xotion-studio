#!/usr/bin/env bash
# Live preview with hot-reload (tweak the composition in the browser before rendering).
# Long-running server — stop with Ctrl-C. Usage: scripts/preview.sh [project_dir] [port]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HF="$ROOT/node_modules/.bin/hyperframes"; [ -x "$HF" ] || HF="npx hyperframes"
DIR="${1:-.}"; PORT="${2:-3002}"
echo "[preview] serving $DIR on http://localhost:$PORT (Ctrl-C to stop)"
( cd "$DIR" && $HF preview --port "$PORT" )
