#!/usr/bin/env bash
# pinterest-search.sh — list pins matching a query as JSON for reference.
# FOR REFERENCE / MOOD-BOARD USE ONLY. Pinterest images have unknown licenses;
# we never use them as final assets.
#
#   scripts/pinterest-search.sh "<query>" [--n=30]
set -euo pipefail
Q="${1:?usage: pinterest-search.sh <query> [--n=30]}"
shift
DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$DIR/pinterest-search.js" "$Q" "$@"
