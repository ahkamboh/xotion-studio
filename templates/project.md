# Project: <name>

> Copy this into each `projects/<name>/project.md`. The agent reads it at the start of a session
> to continue where it left off, and updates it after meaningful changes. This is the engine's
> session memory — decisions persist across chats and machines.

## Brief
- Request: <what the user asked for, in one line>
- Inputs: <source video/image/audio paths>
- Format: <16:9 | 9:16 | 1:1>  ·  Style: <from presets/styles.md>  ·  Audio mode: <narrated|music|none>

## Decisions
- Style: <e.g. Tech Gradient — blue/purple, Sora>
- Fonts: <which>  ·  Voice: <Kokoro id, if narrated>  ·  Music: <track/bed mood>
- Auto-cut: <gentle|normal|aggressive>, fillers <on|off>, kept <Xs of Ys>
- Caption style: <from docs/caption-styles.md>

## Status
- [ ] assets prepared (transcript / amp / master audio)
- [ ] composition built + lint 0/0
- [ ] rendered
- [ ] acceptance loop passed (all criteria ✓)
- [ ] delivered

## Acceptance criteria (the definition of done)
- [ ] <spec: WxH, fps, duration>
- [ ] <every explicit user instruction, one per line>

## Outputs
- Render: <path>  ·  Thumbnail: <path>  ·  Reels/Subs: <paths>

## Notes / next
- <anything to remember for the next session>
