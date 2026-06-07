#!/usr/bin/env bash
# vimeo-search.sh — list motion-design videos as reference.
# REFERENCE / RESEARCH ONLY. Creators retain copyright.
#
#   scripts/vimeo-search.sh "<query>" [--n=12] [--staffpicks]
#   scripts/vimeo-search.sh ""        --staffpicks --n=20
set -euo pipefail
Q="${1:?usage: vimeo-search.sh <query> [--n=12] [--staffpicks]}"
shift
DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$DIR/vimeo-search.js" "$Q" "$@"
