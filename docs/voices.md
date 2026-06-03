# Voice catalog (Kokoro TTS)

Generate voiceover with `scripts/tts.sh "text or script.txt" <voice> out.wav [speed]`.
Run `npx hyperframes tts --list` for the full set. First letter of the id = language:
a=US-English, b=UK-English, e=Spanish, f=French, h=Hindi, i=Italian, j=Japanese, p=Portuguese,
z=Mandarin. Second letter: f=female, m=male.

## English — Female
| Voice | Vibe | Best for |
|---|---|---|
| `af_heart` | warm, friendly (default) | brand story, casual, wellness |
| `af_nova` | warm, professional | product demo, explainer |
| `af_sky` | bright, energetic | promo, social, upbeat |
| `af_bella` | smooth, confident | premium, narration |
| `af_sarah` | clear, neutral | tutorials, how-to |
| `bf_emma` (UK) | clear, formal | documentation, corporate |
| `bf_alice` (UK) | soft, elegant | luxury, editorial |

## English — Male
| Voice | Vibe | Best for |
|---|---|---|
| `am_adam` | neutral, steady | tutorials, explainer |
| `am_michael` | authoritative, energetic | promo, hype, ads |
| `am_onyx` | deep, cinematic | trailers, dramatic |
| `am_echo` | calm, measured | meditation, story |
| `am_liam` | friendly, modern | tech, startup |
| `bm_george` (UK) | formal, rich | documentary, premium |
| `bm_lewis` (UK) | warm, narrator | storytelling |

## Other languages (examples — see `--list` for more)
`ef_dora` / `em_alex` (Spanish) · `ff_siwis` (French) · `hf_alpha` / `hm_omega` (Hindi) ·
`if_sara` (Italian) · `jf_alpha` (Japanese) · `pf_dora` (Portuguese) · `zf_xiaobei` (Mandarin).
Match the voice language to the script language (the CLI auto-detects from the prefix).

## Speed
- `0.85–0.95` reflective / emotional / luxury
- `1.0` natural (default)
- `1.05–1.15` promo / energetic / intros

## Tone → voice quick map
- explainer / friendly → `af_nova` or `am_adam`
- hype / promo / ad → `af_sky` or `am_michael`
- cinematic / trailer → `am_onyx` (M) or `af_bella` (F)
- corporate / docs → `bf_emma` or `bm_george`
- story / calm → `am_echo` or `af_heart`

If the user says "male voice" / "female voice" without a name, pick the best-fit from above for the
content's tone, generate, and mention which you used so they can swap.
