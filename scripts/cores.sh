#!/usr/bin/env bash
# cores.sh — print a SAFE parallelism for batch encodes so Stage-A delivery
# doesn't saturate a low-core machine (the audit's "throttle if nproc<6").
#
#   P=$(scripts/cores.sh)         # e.g. 4
#   ls *.mp4 | xargs -P"$P" -I{} scripts/encode-youtube.sh {} out/{}
#
# Heavy x264 encodes are each multi-threaded, so we cap concurrent JOBS well
# below core count: floor(cores/2), min 1, max 4. On <6-core machines this
# yields 1–2 concurrent encodes instead of thrashing.
set -euo pipefail
if command -v nproc >/dev/null 2>&1; then
  CORES=$(nproc)
elif command -v sysctl >/dev/null 2>&1; then
  CORES=$(sysctl -n hw.ncpu 2>/dev/null || echo 4)
elif [ -n "${NUMBER_OF_PROCESSORS:-}" ]; then
  CORES=$NUMBER_OF_PROCESSORS
else
  CORES=4
fi
P=$(( CORES / 2 ))
[ "$P" -lt 1 ] && P=1
[ "$P" -gt 4 ] && P=4
echo "$P"
