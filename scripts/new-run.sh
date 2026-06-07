#!/usr/bin/env bash
# new-run.sh — create an ISOLATED run directory for a job so concurrent jobs
# never clobber each other's work/renders, and no stale artifact from a previous
# run can leak (each run gets a fresh, empty work dir).
#
#   eval "$(scripts/new-run.sh <project-name>)"   # exports XOTION_RUNID, XOTION_RUN, WORK, RENDERS
#   scripts/new-run.sh <project-name> --print     # just print the run dir path
#
# Isolation mechanism: the run dir path is unique (timestamp + pid + RANDOM) and
# created with a fresh empty work/ + renders/. Two concurrent jobs — even on the
# SAME project name — get two distinct run dirs, so they cannot clobber. A fresh
# run dir has no prior files, so stale-state leak is structurally impossible.
# (mkdir is atomic; RANDOM+pid+timestamp makes collision effectively impossible.
# Portable — no flock, which macOS lacks.)
set -euo pipefail
PROJ_NAME="${1:?usage: new-run.sh <project-name> [--print]}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJ="$ROOT/projects/$PROJ_NAME"
mkdir -p "$PROJ/runs"

RUNID="$(date +%Y%m%d-%H%M%S)-$$-${RANDOM}"
RUNDIR="$PROJ/runs/$RUNID"
# mkdir (not -p) on the leaf is atomic and fails if the unique id somehow exists.
mkdir "$RUNDIR"
mkdir -p "$RUNDIR/work" "$RUNDIR/renders"
# convenience: a 'latest' symlink for humans (not used by the pipeline)
ln -sfn "$RUNDIR" "$PROJ/runs/latest"

if [ "${2:-}" = "--print" ]; then
  echo "$RUNDIR"
else
  echo "export XOTION_RUNID='$RUNID'"
  echo "export XOTION_RUN='$RUNDIR'"
  echo "export WORK='$RUNDIR/work'"
  echo "export RENDERS='$RUNDIR/renders'"
fi
