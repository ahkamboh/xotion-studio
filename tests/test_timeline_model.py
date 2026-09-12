"""Unit tests for the structured timeline — no ffmpeg, no browser."""

import os
import sys
import tempfile
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "scripts", "timeline"))

import timeline_model as tm  # noqa: E402


class TimelineModelTests(unittest.TestCase):
    def setUp(self):
        self._prev = tm.ROOT
        self.td = tempfile.TemporaryDirectory()
        tm.ROOT = self.td.name
        os.makedirs(os.path.join(tm.ROOT, "projects"), exist_ok=True)
        self.proj = "win-test"

    def tearDown(self):
        tm.ROOT = self._prev
        self.td.cleanup()

    def test_empty_validates_and_ids_are_stable(self):
        tl = tm.empty_timeline()
        tm.validate(tl)
        a = tm.op_add_clip(tl, "overlay", {"type": "text", "text": "HELLO", "start": 0, "length": 2})
        b = tm.op_add_clip(tl, "overlay", {"type": "text", "text": "WORLD", "start": 2, "length": 2})
        self.assertEqual(a, "clip_000000")
        self.assertEqual(b, "clip_000001")
        self.assertGreaterEqual(tl["duration"], 4)

    def test_split_and_remove(self):
        tl = tm.empty_timeline()
        cid = tm.op_add_clip(tl, "overlay", {"type": "text", "text": "SPLIT", "start": 1, "length": 4})
        left, right = tm.op_split_clip(tl, cid, 2.5)
        self.assertEqual(left, cid)
        self.assertTrue(right.startswith("clip_"))
        self.assertTrue(tm.op_remove_clip(tl, right))
        state = tm.summary(tl)
        ids = [c["id"] for t in state["tracks"] for c in t["clips"]]
        self.assertIn(left, ids)
        self.assertNotIn(right, ids)

    def test_update_style_merge(self):
        tl = tm.empty_timeline()
        cid = tm.op_add_clip(
            tl,
            "overlay",
            {
                "type": "text",
                "text": "X",
                "start": 0,
                "length": 1,
                "style": {"color": "#fff", "fontSize": 40},
            },
        )
        tm.op_update_clip(tl, cid, {"style": {"color": "#e0451f"}})
        clip = tm.op_get_clip(tl, cid)
        self.assertEqual(clip["style"]["color"], "#e0451f")
        self.assertEqual(clip["style"]["fontSize"], 40)

    def test_atomic_save_roundtrip(self):
        tl = tm.empty_timeline()
        tm.op_add_clip(tl, "overlay", {"type": "text", "text": "SAVE", "start": 0, "length": 1.5})
        tm.save(self.proj, tl)
        loaded = tm.load(self.proj, create=False)
        self.assertEqual(loaded["id"], "main")
        self.assertEqual(sum(len(t["clips"]) for t in loaded["tracks"]), 1)

    def test_reject_bad_version(self):
        tl = tm.empty_timeline()
        tl["version"] = 2
        with self.assertRaises(tm.TimelineError):
            tm.validate(tl)


if __name__ == "__main__":
    unittest.main()
