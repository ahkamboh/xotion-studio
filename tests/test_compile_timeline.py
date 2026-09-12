"""Compile a text-only timeline without a checked-in demo project."""

import importlib.util
import os
import sys
import tempfile
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
TL_DIR = os.path.join(ROOT, "scripts", "timeline")
sys.path.insert(0, TL_DIR)

import timeline_model as tm  # noqa: E402

_spec = importlib.util.spec_from_file_location(
    "compile_timeline_mod", os.path.join(TL_DIR, "compile-timeline.py")
)
ct = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ct)


class CompileTimelineTests(unittest.TestCase):
    def setUp(self):
        self._prev = tm.ROOT
        self.td = tempfile.TemporaryDirectory()
        tm.ROOT = self.td.name
        os.makedirs(os.path.join(tm.ROOT, "projects"), exist_ok=True)
        self.proj = "compile-win"
        tl = tm.empty_timeline()
        tm.op_add_clip(
            tl,
            "overlay",
            {
                "type": "text",
                "text": "WINDOWS",
                "start": 0,
                "length": 2,
                "style": {"fontFamily": "Inter", "fontSize": 72, "color": "#f4f0e6"},
            },
        )
        tm.save(self.proj, tl)

    def tearDown(self):
        tm.ROOT = self._prev
        self.td.cleanup()

    def test_compile_emits_root_and_text(self):
        out = os.path.join(self.td.name, "build")
        html_path = ct.compile_timeline(self.proj, out, copy=True)
        self.assertTrue(os.path.isfile(html_path))
        html = open(html_path, encoding="utf-8").read()
        self.assertIn('data-composition-id="main"', html)
        self.assertIn("WINDOWS", html)
        self.assertIn("gsap", html.lower())


if __name__ == "__main__":
    unittest.main()
