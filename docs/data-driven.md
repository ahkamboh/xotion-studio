# Data-driven video — one template, N videos

Render many personalized/localized videos from a single composition + a data file. This is the
core "programmatic video" superpower (the thing Remotion is built around) — free here on
HyperFrames via `--variables`.

## 1. A template that declares variables
The composition's `<html>` declares `data-composition-variables` (id/type/label/default) and the
script reads them via `window.__hyperframes.getVariables()`. Ready-made:
`templates/data-driven-card.html` (kicker, title, subtitle, accent, accent2, bg).

```html
<html data-composition-variables='[
  {"id":"title","type":"string","label":"Title","default":"Hello"},
  {"id":"accent","type":"color","label":"Accent","default":"#3fa9ff"}
]'>
...
<script>
  const V = window.__hyperframes.getVariables();
  document.getElementById("title").textContent = V.title;
</script>
```

## 2. A data file (CSV or JSON)
CSV header = variable ids; each row = one video:
```csv
name,title,subtitle,accent
acme,Welcome Acme,Your demo is ready,#22c55e
nova,Hello Nova,Built just for you,#f59e0b
```
or JSON: `[{"name":"acme","title":"Welcome Acme","accent":"#22c55e"}, ...]`

## 3. Render the batch
```bash
./new-project.sh my-cards 1920 1080 5
cp templates/data-driven-card.html projects/my-cards/index.html
python3 scripts/render-batch.py projects/my-cards data.csv
#   --out DIR    output dir (default <project>/renders/batch)
#   --name COL   column used for each output filename (default "name")
#   --fps  N     frame rate (default 30)
```
Each row → `<out>/<name>.mp4` with that row's values. (Single one-off: append
`--variables '{"title":"Hi","accent":"#22c55e"}'` to `npx hyperframes render`.)

## Use cases
Personalized intros · localized variants (pair with `multilang-subs.py`) · per-product / per-customer
cards · quote/stat videos · A/B title tests · bulk social posts. Stack with `overlay.sh` + `enrich.sh`
for a premium finish on every variant.
