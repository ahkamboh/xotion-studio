#!/usr/bin/env bash
# dribbble-search.sh — list designer shots matching a query for REFERENCE.
# REFERENCE / MOOD-BOARD USE ONLY. Designers retain copyright.
#
#   scripts/dribbble-search.sh "<query>" [--n=24] [--popular|--recent]
set -euo pipefail
Q="${1:?usage: dribbble-search.sh <query> [--n=24] [--popular|--recent]}"
shift
DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$DIR/dribbble-search.js" "$Q" "$@"
