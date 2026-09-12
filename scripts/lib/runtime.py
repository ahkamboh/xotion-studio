"""Cross-platform helpers for the Xotion engine (Windows / macOS / Linux)."""

from __future__ import annotations

import os
import shutil
import sys


def python_cmd() -> str:
    """Interpreter to spawn for sibling scripts. Prefer this process, then PATH."""
    if sys.executable:
        return sys.executable
    for name in ("python3", "python", "py"):
        found = shutil.which(name)
        if found:
            return found
    return "python"


def whisperx_python(root: str) -> str | None:
    if os.name == "nt":
        cand = os.path.join(root, ".venv-whisperx", "Scripts", "python.exe")
    else:
        cand = os.path.join(root, ".venv-whisperx", "bin", "python")
    return cand if os.path.isfile(cand) else None


def whisper_cache_dir() -> str:
    return os.path.join(os.path.expanduser("~"), ".cache", "whisper")


def link_or_copy(src: str, dst: str, copy: bool = False) -> str:
    """Symlink src -> dst; fall back to copy on Windows without Developer Mode."""
    parent = os.path.dirname(dst)
    if parent:
        os.makedirs(parent, exist_ok=True)
    if os.path.lexists(dst):
        try:
            os.remove(dst)
        except OSError:
            shutil.rmtree(dst, ignore_errors=True)
    if copy:
        shutil.copy2(src, dst)
        return "copy"
    try:
        os.symlink(os.path.abspath(src), dst)
        return "symlink"
    except OSError:
        shutil.copy2(src, dst)
        return "copy"
