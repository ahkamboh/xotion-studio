# Prompt: Code video (animated typing in an editor / terminal)

Turn code into a slick typing-animation video for dev/tech content. Uses HyperFrames code blocks.

```
Make a code video in the xotion-studio engine.

INPUTS:
- CODE   = "<paste the code, or a file path>"
- THEME  = "auto"   (VS Code: dark-plus, dark-modern, monokai, solarized-light, high-contrast,
            light-modern, visual-studio-dark ; Terminal: apple-terminal-homebrew, -ocean, -pro,
            -grass, -novel, -man-page, -red-sands ... 24 themes total — see docs/blocks.md)
- TITLE  = "<what it shows / hook>"
- FORMAT = "16:9" | "9:16"
- AUDIO  = ""   (optional narration --content speech, or a music bed)

DO:
1. Install the theme block: scripts/add-block.sh code-snippet-<theme> projects/<name>
   (e.g. code-snippet-dark-plus, code-snippet-apple-terminal-homebrew)
2. Replace the block's sample code with CODE (it animates per-character typing). Set the title.
3. Optional: add a hook caption (caption agent --content speech) or music bed; logo-outro at the end.
4. Lint -> render -> acceptance loop (read frames; confirm code is correct + readable, typing flows).
5. Deliver (+ thumbnail). Great for "how I built X", launches, tutorials, dev reels.
```
