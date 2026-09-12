# Shared bash env for Git Bash / macOS / Linux. Source from a script under scripts/.
#   . "$(cd "$(dirname "$0")" && pwd)/lib/env.sh"          # scripts/*.sh
#   . "$(cd "$(dirname "$0")" && pwd)/../lib/env.sh"       # scripts/timeline/*.sh
_XOTION_LIB="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export XOTION_ROOT="$(cd "$_XOTION_LIB/../.." && pwd)"

_pick_python() {
  if command -v python3 >/dev/null 2>&1; then
    case "$(command -v python3)" in
      *"/scripts/bin/python3"|*'\scripts\bin\python3') ;;
      *) command -v python3; return ;;
    esac
  fi
  if command -v py >/dev/null 2>&1; then
    echo "py -3"
    return
  fi
  if command -v python >/dev/null 2>&1; then
    command -v python
    return
  fi
  echo "python3"
}
export XOTION_PYTHON="$(_pick_python)"

python3() {
  # so existing `python3 ...` lines keep working when this file is sourced
  if [ "$XOTION_PYTHON" = "py -3" ]; then
    command py -3 "$@"
  else
    command "$XOTION_PYTHON" "$@"
  fi
}
