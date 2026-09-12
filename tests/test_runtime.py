"""Windows-safe link/copy and interpreter helpers."""

import os
import sys
import tempfile
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "scripts", "lib"))

import runtime  # noqa: E402


class RuntimeTests(unittest.TestCase):
    def test_python_cmd_exists(self):
        cmd = runtime.python_cmd()
        self.assertTrue(cmd)
        self.assertTrue(os.path.exists(cmd) or cmd in ("python", "python3", "py"))

    def test_link_or_copy_creates_dst(self):
        with tempfile.TemporaryDirectory() as td:
            src = os.path.join(td, "src.txt")
            dst = os.path.join(td, "sub", "dst.txt")
            with open(src, "w", encoding="utf-8") as fh:
                fh.write("xotion")
            how = runtime.link_or_copy(src, dst)
            self.assertIn(how, ("symlink", "copy"))
            with open(dst, encoding="utf-8") as fh:
                self.assertEqual(fh.read(), "xotion")

    def test_link_or_copy_forced_copy(self):
        with tempfile.TemporaryDirectory() as td:
            src = os.path.join(td, "src.txt")
            dst = os.path.join(td, "dst.txt")
            with open(src, "w", encoding="utf-8") as fh:
                fh.write("copy-me")
            self.assertEqual(runtime.link_or_copy(src, dst, copy=True), "copy")
            self.assertTrue(os.path.isfile(dst))

    def test_whisperx_missing_is_none(self):
        with tempfile.TemporaryDirectory() as td:
            self.assertIsNone(runtime.whisperx_python(td))

    def test_whisper_cache_dir_is_home(self):
        d = runtime.whisper_cache_dir()
        self.assertTrue(d.endswith(os.path.join(".cache", "whisper")) or d.endswith(".cache/whisper"))


if __name__ == "__main__":
    unittest.main()
