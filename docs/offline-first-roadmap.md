# Xotion — Offline-First Agentic Editor: Build Roadmap

> **What this is:** a buildable plan to turn xotion-studio (today: a local engine + a *cloud* Claude brain) into **the first agentic, offline-first motion-graphics editor with a local-LLM director and code-enforced QA gates, native to Apple Silicon.**
> Synthesized from an 8-pillar deep-research pass (each pillar web-researched against mid-2026 SOTA and adversarially fact-checked). Dates/facts are mid-2026.

---

## 1. Vision & positioning (the honest version)

**Tagline:** *"Your footage never leaves your Mac. An agent that scripts, edits, animates, captions and scores — on your device."*

**Do NOT claim** the unqualified "first AI video editor." It's fragile and decays monthly. The **defensible, true-today** claim is the narrow one — every qualifier is a moat and is currently uncontested:

> **"The first agentic, offline-first motion-graphics editor with a local-LLM director and code-enforced QA gates, native to Apple Silicon."**

**Why it's defensible right now:**
- Mainstream (Runway, Adobe Firefly/Premiere, Descript Underlord, CapCut, Captions, Opus Clip) is **cloud-first/upload-dependent** — offline+private is a real, unsaturated gap.
- The only two adjacent threats both **miss your exact cell**: **OpenMontage** ("world's first open-source agentic video system") has a *cloud* brain (local LLM only "coming soon") and is a headless CLI with **no GUI**; **LTX Desktop** has a timeline but **no agentic LLM** and runs poorly on Apple Silicon.
- **The moat is NOT the LLM** (Qwen/Gemma weights are commodity). It is your **HyperFrames deterministic renderer + the code-enforced QA gates + the agent→deterministic-renderer orchestration** — the hard, non-off-the-shelf part you already have.

⚠️ **Action:** lock this positioning, and audit it monthly against OpenMontage's "local LLM" ship date.

---

## 2. Target architecture

```
┌────────────────────────── Tauri 2 shell (Rust + WKWebView UI) ──────────────────────────┐
│  UI: prompt + timeline + live HTML/GSAP preview (MCP-App iframe)                          │
│                                                                                          │
│  ORCHESTRATOR  (plan-then-execute, NOT free-form ReAct)                                   │
│   1. Director model emits ONE typed EDIT PLAN  ── grammar-constrained JSON                │
│   2. deterministic executor dispatches each step (NOT the LLM)                            │
│   3. CODE-ENFORCED GATES verify   ←── the reliability backbone (already built)            │
│   4. bounded repair (qa-attempt.sh =5  + NEW per-tool caps)                               │
│        │                                                                                  │
│        ├─ LOCAL BRAIN ── vllm-mlx / mlx-lm OpenAI-compatible server (localhost)           │
│        │     • Director model tiered to RAM (7→14→30B-A3B MoE)                            │
│        │     • constrained decoding (XGrammar / llguidance) on EVERY tool call            │
│        │     • per-user LoRA adapter (house style) hot-swapped                            │
│        │     • optional cloud "boost" (Claude/GPT) via credits or BYOK  ← Pro/Max only    │
│        ├─ RAG / MEMORY ── turbovec (MIT) + EmbeddingGemma/Qwen3-Embedding                 │
│        │     • tool-cards index (78 scripts), transcripts, brand kits, asset library      │
│        │     • retrieve-don't-stuff: keep context small instead of huge-context           │
│        ├─ MEDIA ENGINE (all offline sidecars)                                             │
│        │     • HyperFrames → pinned headless Chromium → MP4 (deterministic)               │
│        │     • ffmpeg (LGPL) + VideoToolbox encode                                        │
│        │     • whisper.cpp (STT) · kokoro-onnx + Piper (TTS) · rembg/u2net (matte)         │
│        │     • asset resolver: make-by-code → bundled CC0 → on-device generate            │
│        └─ MCP ── client (filesystem/memory/asset-cache servers) + engine-AS-server        │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

**Data flow per job:** prompt → (RAG pulls relevant tool-cards + memory into a *cacheable prefix*) → Director emits typed plan → executor runs specialists/scripts → render → **gates verify** → repair-or-ship. Every run is logged (brief→kit→render→verdict→repair) as **training data for the local model** (the flywheel).

---

## 3. The hardest problem — a *small* local model that's reliably agentic

This is make-or-break. Three facts reframe it from "match Claude's IQ" to "drive a gated state machine to convergence":

**(a) Reliability already lives in CODE, not the LLM.** Verified in-repo: `deliver.sh` is the only ship path and refuses unless all 4 gate JSONs say `pass`; `gate-guard.sh` (PreToolUse hook) blocks any `.mp4`→Downloads that bypasses it; `qa-attempt.sh` caps the loop at 5; `new-run.sh` isolates runs. **A weaker brain can't ship broken/unlicensed output — its worst case is *failing to converge*, which is bounded and surfaced.**

**(b) The distillation corpus already exists, for free.** `~/.claude/projects/.../*.jsonl` holds ~24 MB / 2286 records / 1239 assistant turns of real Director orchestration (304 Bash, 107 Read, 67 Edit tool_use blocks), each ending in a code-verified pass/fail. That is a ready SFT corpus for a distilled local Director — **filtered to runs that reached `deliver.sh` success = clean labels.**

**(c) The task decomposes into narrow typed steps.** 16 single-responsibility specialists over 78 scripts: the model only needs to (1) pick the right specialist and (2) fill a small typed arg object — exactly what constrained decoding + a distilled router excel at.

### The solution stack
| Lever | What | Why it works |
|---|---|---|
| **Constrained decoding** | XGrammar (default, <40µs/tok) for high-freq tool args; **llguidance** for gnarly nested schemas (style.json kit). Avoid Outlines (compile timeouts). | Removes *all* malformed-call failures (format errors → 0); often **faster** than free generation via token fast-forward. |
| **Plan-then-execute** (not ReAct) | Director emits ONE typed plan; deterministic executor dispatches; gates verify; bounded repair. (= Profile-Then-Reason, 2026 best practice for weak models — beats ReAct on decomposition-heavy tasks.) | Small models "lose coherence after 2–3 ReAct steps." Short, re-grounded steps dodge the cliff. |
| **Code gates as verifier** | Your 4 gates are the safety net + the reward signal. | Worst case = non-convergence, never broken output. |
| **Per-tool call caps** | Add per-specialist caps (not just the global 5). | Kills the documented "verifier stall" (re-calling verify with reworded args forever). |
| **Distilled Director LoRA** | LoRA-SFT a 7–14B on verifier-filtered Claude traces (mlx-lm / mlx-tune); per-specialist micro-adapters hot-swapped. | A 14B distilled on *this* domain plausibly matches a 32B baseline here; lifts a 7–8B to "Free-tier usable." |

**Off-the-shelf base accuracy (before fine-tune, 2026 open weights):** Gemma 4 27B ~95% real-MCP tool-calls (~16 GB Q4), Qwen3-Coder-30B ~96% on code-shaped tools (~18 GB), Qwen3-32B ~93% (~20 GB). **Sub-7B is ~1.4% on multi-turn — use it only as a speculative *draft* model, never as Director.** (Note: the "Claude 25.3% BFCL" figure online is a harness-format artifact, not a real gap — don't design around it.)

**Realistic ceiling:** 30–32B off-the-shelf ≈ usable-but-shaky; **+constrained decoding +trace-LoRA** is what makes a 14B reliable and a 7–8B Free-tier-viable. **Measure on real briefs scored by the gates, not BFCL.**

---

## 4. The offline-media problem (no Pixabay)

The render core is *already* offline-capable (HyperFrames → headless Chromium → MP4, deterministic by "virtual clock"). STT/TTS/matte/ffmpeg all have native Apple-Silicon replacements (drop the 1.5 GB whisperX venv). **The one genuinely unsolved piece is asset sourcing** — there is no legal, redistributable, offline replacement for Pixabay search. **Synthesize a 3-way resolver:**

1. **Make-by-code FIRST** (free, deterministic, zero-license): route all geometric/typographic/gradient/particle/grain/texture/transition needs to SVG+CSS+Canvas/WebGL inside HyperFrames (`animations.jsx` is the seed).
2. **Bundled CC0 pack** for photoreal B-roll/music: assemble **only from redistribution-permitting sources** — **Pexels CC0, Openverse, Wikimedia** (✅). **NOT Pixabay-License or Mixkit** (❌ — they forbid redistributing assets inside another product). Log every item for `license-audit`.
3. **On-device generation** (Pro/Max, RAM-gated): images **mflux/mlx-gen** (FLUX Q4 ~7 GB on 16 GB, FP16 on 64 GB); music **ACE-Step 1.5** (<4 GB); video **mlx-video LTX-2.3-distilled** (~19 GB, 32 GB+ only). Async job queue + **prompt→output content-addressed cache** (a self-growing offline stock library).

**License landmines to encode in `license-audit` (extend it to model weights + outputs):** FLUX.1-**dev** = non-commercial (use **FLUX-schnell** Apache instead); **RMBG-2.0** = CC-BY-NC (use **u2net** MIT); **HunyuanVideo** geo-blocks EU/UK/KR; **Wan 2.x** = Apache ✅. **ffmpeg:** ship an **LGPL** build and **encode via VideoToolbox** (h264/hevc_videotoolbox) to dodge x264/x265 GPL + patent exposure.

---

## 5. The moat — 3 novel algorithm bets ("make history")

The LLM is commodity. These are the inventable, defensible systems — and your repo already has ~80% of the scaffolding.

### BET A — Kit-as-Grammar: a deterministic creative-decision engine *(biggest moat)*
Formalize `docs/motion-graphics-decisions.md` (kit schema, precedence brand>platform>kit>user, single-tempo-clock, accent-scarcity, the motion-hit `kind` vocabulary) into a **typed grammar + constraint solver**. The local LLM is **demoted from author to slot-filler**; a deterministic resolver guarantees coherence. *Novel because everyone else lets the LLM author freely and hopes — you make coherence a property of the search space, not the model.* Kills the "every video is a centered pop-up / à-la-carte mismatch" failure at the **decoding level**. Sketch: JSON-Schema+CFG via llguidance + a small rule engine (z3 or hand-rolled); LLM proposes, solver disposes.

### BET B — Render → on-device-VLM verify → auto-repair: an *autonomous art director* *(biggest moat)*
Turn `qa-correctness`/`qa-richness` from human-read agents into an **autonomous controller**. Render → `qa-frames.py` samples frames → **cheap CV pre-pass** (OpenCV/ffmpeg: black-frame, contrast, safe-area px, bbox overlap) → escalate ambiguous frames to an **on-device VLM** (Qwen2.5-VL for content/legibility; Ferret-UI-Lite-3B / UI-TARS-7B for precise overflow/center grounding — these now score ~91 on ScreenSpot-V2) → a **repair planner** maps each finding to a *parametric* edit (font-size token / re-wrap / hero-scale) → re-render only the failing scene → re-verify (bounded by `qa-attempt.sh`). *Nothing shipping does pixel-grounded self-repair offline against a typed spec.* **This is what lets a weak local model match cloud quality — it gets graded and corrected by vision instead of trusted.** The inventable core = the **finding→fix transfer function with a monotone error-reduction guarantee**.

### BET C — Audio↔graphic alignment as a constraint solver
Generalize `scene-sync.py` + `beat-grid.py` + `amplitude.py` into **one optimizer** that jointly places scene cuts on downbeats, micro-hits on beats, climaxes on spoken peak-words, and SFX leads (whoosh −150 ms) — minimizing total drift under hard constraints (VO word-times win boundaries; beats win hits). You already proved the principle by deriving SFX timing from per-frame motion analysis. *Foley research does video→audio; Xotion does spec→both, deterministically.*

### Force-multipliers (do after A/B/C land)
- **GATE-AS-REWARD GRPO:** your 4 deterministic gates are a perfect, non-gameable verifiable reward. Train the Director with GRPO where `reward = gates_passed − λ·QA_rounds − μ·retries`. Almost no creative pipeline is this cleanly machine-checkable.
- **The credit system IS a data-acquisition engine:** every Pro/Max cloud-boost run is a Claude *teacher trajectory*, auto-labeled pass/fail by the gates → the paid tier pays to improve the free local model. Compounding moat that never leaves the device.
- **Per-specialist LoRA micro-experts:** one small base + tiny adapters (Director-router, motion-builder, sync-master…) hot-swapped per stage — your single-responsibility architecture was *accidentally designed for distillation*.
- ⚠️ **Speed correction:** naive token-level **speculative decoding is only ~1.05× on Apple Silicon** (Metal lacks cheap batched tree-verification) — *not* the 3–4× the earlier plan assumed. **Move the speed bet to pipeline-level parallel/speculative RENDERING** (render scene N while planning N+1; cache scene fragments by kit/content hash). Use spec-decoding only with a **domain-distilled draft** model where acceptance is unusually high.

---

## 6. Phased roadmap

| Phase | Goal | Key deliverables (reuse existing repo pieces in **bold**) |
|---|---|---|
| **0 — MVP (weeks)** | Local brain drives ONE archetype end-to-end | mlx-lm/vllm-mlx server (Qwen3-Coder-30B-A3B 4-bit on 32 GB) → point the **existing Director pipeline** at `localhost` by swapping `base_url`; wrap ~10 core scripts as constrained tools; keep **all 4 gates**. Prove "prompt → rendered, gate-passed MP4" offline. |
| **0.5 — Eval harness** | Know the truth | A **BFCL-style internal eval of the *actual* Director→specialist pipeline** scored by the gates, across Qwen3 7B/14B/30B + gpt-oss-20B, ±constrained decoding, ±gate-repair loop. *This is the single most decision-relevant experiment.* |
| **1 — Offline v1** | Cut every cloud cord | whisper.cpp + kokoro-onnx/Piper + rembg/u2net + LGPL ffmpeg/VideoToolbox; **pin & bundle Chromium**, embed fonts, strip CDN/Google-Fonts from templates (determinism preflight); turbovec RAG over **tool-cards + docs**; Tauri shell + sidecars; RAM auto-tiering; CC0 pack + make-by-code asset resolver. |
| **2 — The moat** | Build A, B, C | Kit-as-Grammar engine (BET A) → VLM verify-repair loop (BET B) → alignment solver (BET C). Start the **trace→SFT** data pipeline; train first Director LoRA. |
| **3 — Scale & tiers** | Ship it | Free/Pro/Max + credits/BYOK; cloud-boost router; per-user LoRA personalization + GATE-AS-REWARD GRPO; CDC delta model-updater; Developer-ID sign + notarize + .dmg; MCP engine-as-server. |

---

## 7. Business model & license constraints

- **Free = fully local, unlimited** (the trust/privacy magnet + the funnel + the data flywheel).
- **Pro/Max = cloud "boost" credits** (hard prompts / generative media) **+ BYOK** (route to the user's own Anthropic/OpenAI/Bedrock key — keep BYOK *off* the free tier; the harness still costs money).
- **No data lock-in** is the structural weakness (freemium converts ~2–5%). Monetize layers that *don't* need lock-in: **template/asset packs, team workspaces, sync/publish (the Obsidian model), priority models, and commercial-license assurance/indemnity.**
- **Model licenses (keep it clean):** brain → **Apache-2.0 Qwen3 / gpt-oss / Gemma** (avoid Llama's >700 M-MAU clause for the default; keep it BYO). Media → **Wan 2.x + FLUX-schnell + u2net** only for bundling; treat FLUX-dev/SD3.5/Hunyuan/RMBG-2.0 as **BYO or cloud-boost-only**. Extend `license-audit` to flag any non-commercial model in a commercial export.
- **Apple Silicon (M1+) only** for v1 (MLX is Metal-only); document Intel/llama.cpp-CPU as an explicit non-goal.

---

## 8. Risks & the single most important first step

**Top risks:** (1) **local-model multi-step convergence** — gates stop *broken* output but can't by themselves make a weak brain *finish*; closing this is what distillation must buy. (2) **on-device VLM quality** for fine-grained text/timing reads (the BET-B bottleneck). (3) **trace-data sufficiency** (one session is a seed, not enough — bootstrap with synthetic teacher trajectories; beware schema drift). (4) **packaging tax** (sign every nested Mach-O inner→out, no `--deep`; notary stalls; multi-GB model downloads — *notarize the lean app, download weights post-install*). (5) **"first" claim decays** — win on the *specific* combo, not the idea.

**Honest assessment:** the engineering is hard but each piece exists in 2026; the genuine inventions are **BET A + BET B** (kit-grammar + grounded self-repair with monotone error reduction) — that pairing is the true "first offline self-repairing agentic editor" claim and should be locked (whitepaper/patent) before any public demo.

### ➤ The single most important first step
**Build Phase 0.5 — the gate-scored eval of the real Director→specialist pipeline on local MLX models, with and without (constrained decoding + gate-in-the-loop repair).** Everything else (which model tier, whether distillation is needed, whether BET B carries the quality) is a guess until you have that number. It's cheap, it reuses the entire existing pipeline + gates, and it tells you exactly how much of the moat you must build vs. how much the off-the-shelf model already gives you.

---

*Provenance: 8-pillar parallel research (inference · agentic-brain · render/media · RAG/memory · MCP · packaging · novel-algorithms · market), each web-grounded against mid-2026 sources and adversarially verified. Source URLs are in the per-pillar research records.*
