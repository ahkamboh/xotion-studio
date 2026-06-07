#!/usr/bin/env bash
# pixabay-trending.sh — list editor's-choice (curated quality) assets for any
# image/video type. Equivalent to pixabay-search but pre-filtered to the best.
#
#   scripts/pixabay-trending.sh <photo|illustration|vector|video> [query=""] [--n=20]
#
# For music/sfx/gif/3d (no API), use pixabay-search directly with no query for
# the homepage default ordering (most popular).
set -euo pipefail
TYPE="${1:?usage: pixabay-trending.sh <photo|illustration|vector|video> [query] [flags]}"
shift
QUERY="${1:-popular}"
[ $# -gt 0 ] && shift
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/pixabay-search.sh" "$TYPE" "$QUERY" --editors-choice "$@"
