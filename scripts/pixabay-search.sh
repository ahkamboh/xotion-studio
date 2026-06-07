#!/usr/bin/env bash
# pixabay-search.sh — list top N candidates of any media type as JSON, for the
# agent to vet thumbnails BEFORE downloading.
#
#   scripts/pixabay-search.sh <type> "<query>" [--n=10] [--page=1] [filters...]
#
# Types: photo | illustration | vector | video | music | sfx | gif | 3d
#
# Image/video filter flags (passed through to the Pixabay API):
#   --orient=horizontal|vertical|all
#   --category=backgrounds|business|computer|education|fashion|feelings|food|
#              health|industry|interiors|music|nature|people|places|religion|
#              science|sports|transportation|travel
#   --colors=red,blue,grayscale,...      (CSV)
#   --editors-choice                     (curated quality)
#   --min-width=N --min-height=N
#
# Pipe into jq to extract the field you need, e.g.:
#   scripts/pixabay-search.sh photo "mountain" --n=5 --orient=vertical | \
#     jq -r '.results[].source_url'
#
# Once you've picked one, download it via the type's grab script (or
# scripts/pixabay-any.sh).
set -euo pipefail
TYPE="${1:?usage: pixabay-search.sh <type> <query> [flags]}"
QUERY="${2:?need query}"
shift 2
DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$DIR/pixabay-search.js" "$TYPE" "$QUERY" "$@"
