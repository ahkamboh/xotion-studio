# What it costs, and how fast it runs

Measured numbers for one 40-second, six-scene motion-graphics video, rendered at
1920x1080 and 30fps. Everything here was measured on an M-series Mac in August
2026, not estimated. Where a figure is a market rate rather than my measurement,
it is labelled as such.

## The short version

Rendering is local, so the frames cost nothing. Only the thinking costs money.

| | cost per 40s video | wall clock | privacy |
|---|---|---|---|
| human motion designer | ~$2,000 | days | leaves your building |
| frontier model (Claude Opus 5) | $3.64 | ~40s | leaves your machine |
| small hosted model (Cerebras gpt-oss-120b) | $0.22 | ~40s | leaves your machine |
| on-device model | $0 | slower, see below | never leaves |

Per 7-second scene that works out to roughly $350 human, $0.61 frontier,
$0.04 hosted, $0 local.

## Where the human number comes from

Freelance motion graphics is commonly quoted at about $500 per 10 seconds of 2D
motion, and $1,000 to $15,000 per finished minute depending on production
quality. Experienced freelancers charge $75 to $150 an hour. A 40-second piece
lands around $2,000 at the common rate, and the same 60-second explainer ranges
from $1,500 with a freelancer to $25,000 from a production company.

These are market rates, not something I measured.

## Where the model numbers come from

One 40-second video through the agent loop consumed **551,333 input tokens and
35,479 output tokens** across 21 steps. Applying published per-token rates:

| model | input $/1M | output $/1M | cost |
|---|---|---|---|
| Cerebras gpt-oss-120b | $0.35 | $0.75 | $0.22 |
| GPT-5.6 Luna | $0.20 | $1.20 | $0.15 |
| Claude Haiku 4.5 | $1.00 | $5.00 | $0.73 |
| Claude Sonnet 5 | $3.00 | $15.00 | $2.19 |
| GPT-5.6 Sol | $4.00 | $20.00 | $2.92 |
| Claude Opus 5 | $5.00 | $25.00 | $3.64 |

**Read the input number sceptically.** 551,333 tokens is high because the agent
loop resends the full transcript on every step, and the template catalogue rides
along each time. That run also took 21 steps; clean runs finish in 10. Both
Claude and OpenAI bill cached input at about 10% of the standard rate, so with
prompt caching the expensive rows drop substantially. Treat these as the
pessimistic end of the range.

The only figure here I measured end to end is the Cerebras one, because that is
the path I actually run.

## Speed

Output speed, measured from my machine over three runs, network round-trip
included:

```
run 1: 683 tokens in 1.11s = 615 tok/s
run 2: 782 tokens in 1.24s = 631 tok/s
run 3: 805 tokens in 1.26s = 639 tok/s
```

So about **630 tok/s** in practice. Cerebras publishes 1,749 tok/s for this
model server-side; the gap is network latency from where I sit.

On-device with a small model in the 4B range on Apple Silicon you get roughly
**50 to 60 tok/s**. That is about 11x slower than the hosted path. A larger
local model runs slower still, so do not read "50 to 60" as true of any local
model.

Rendering itself does not depend on the model at all. A 40-second video at 30fps
is 1,200 frames, captured by 6 parallel workers, and takes about 5 seconds per
scene on an M-series Mac. That cost is electricity.

## The privacy tradeoff

Three positions, and you have to pick one:

**On device.** Nothing leaves the machine. Free per video. Slow. This is the
right choice for client work under NDA, and it is what the roadmap is heading
toward for the brain.

**Hosted small model.** Fast and cheap, about $0.22 a video. Your brief and your
copy go to a third party. Your footage does not, because rendering stays local.

**Frontier model.** Best judgment, highest cost, same data exposure as above.

Worth being precise about what is local today: captions run on a Whisper model
that ships inside the repo (`models/small.pt`, 461 MB) with no network call, and
all rendering, fonts and footage stay on your machine. The brain currently runs
through your existing Claude Code login. A fully on-device brain (MLX/Ollama) is
on the roadmap, not shipped.

## What this replaced

We were paying an agency around $50,000 a month for work of this kind. Last
month it came to about $1,000. That is our own spend, not an industry figure.
