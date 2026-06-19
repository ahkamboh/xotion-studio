#!/usr/bin/env node
// bake-duration.mjs — BUILD STEP for templates/terminal-stream.html
//
// WHY THIS EXISTS
//   HyperFrames reads #root's data-duration from the RAW HTML STRING at compile
//   time (parseHTML → rootEl.getAttribute), BEFORE any <script> runs. A runtime
//   root.setAttribute("data-duration", …) is therefore a NO-OP for the rendered
//   frame count, so the terminal-stream clip would truncate any content longer
//   than the literal value (success banner + loop hold cut off). The derived
//   choreography length MUST live in the LITERAL attribute. This script bakes it.
//
// WHAT IT DOES
//   1. Reads the variable DEFAULTS from <html data-composition-variables='[…]'>.
//   2. Applies optional overrides from --variables '<json>' or --variables-file
//      <path> (same shape HyperFrames' CLI accepts: a flat {id:value} object).
//   3. Computes DUR with computeChoreography() — an IDENTICAL copy of the pure
//      function inlined in the template, so the baked literal and the runtime
//      timeline are provably the same function of the variables.
//   4. Rewrites #root's literal data-duration (and data-end) in place.
//
// USAGE
//   node bake-duration.mjs index.html
//   node bake-duration.mjs index.html --variables '{"commandText":"…","outputLines":"…|…"}'
//   node bake-duration.mjs index.html --variables-file vars.json
//   node bake-duration.mjs index.html --check        # exit 1 if a re-bake would change it
//
// Run this whenever you override commandText / outputLines / successLine /
// typingSpeed before `hyperframes render`, so the clip scales with content.

import { readFileSync, writeFileSync } from "node:fs";

/* ── SHARED CHOREOGRAPHY MATH ─────────────────────────────────────────────
   Keep this byte-for-byte equivalent to computeChoreography() in
   templates/terminal-stream.html. (The template exposes it on
   window.computeTerminalChoreography so a headless check can diff the two.) */
const TYPES = new Set(["spin", "bar", "ok", "text", "warn"]);
function computeChoreography(p) {
  const COMMAND = String(p.commandText);
  const SUCCESS = String(p.successLine || "").trim();
  const SPEED = parseFloat(p.typingSpeed) || 0.045;
  const ROWS = String(p.outputLines).split("|").map(s => s.trim()).filter(Boolean).map(item => {
    const ci = item.indexOf(":");
    let type = "text", text = item;
    if (ci > 0) {
      const t = item.slice(0, ci).trim().toLowerCase();
      if (TYPES.has(t)) { type = t; text = item.slice(ci + 1).trim(); }
    }
    return { type, text };
  });
  const BOOT_END = 0.55;
  const TYPE_START = BOOT_END;
  const TYPE_DUR = COMMAND.length * SPEED;
  const T2 = TYPE_START + TYPE_DUR;
  const ENTER = T2 + 0.18;
  const ROW_STAGGER = 0.34;
  const rowWork = type => (type === "spin" || type === "bar") ? 1.05 : 0.0;
  let cursor = ENTER + 0.12;
  ROWS.forEach(r => {
    r.revealStart = cursor;
    r.work = rowWork(r.type);
    r.workEnd = r.revealStart + r.work;
    cursor += ROW_STAGGER + (r.work > 0 ? 0.18 : 0);
  });
  const STREAM_END = ROWS.length ? Math.max(...ROWS.map(r => r.workEnd)) : ENTER;
  const SB = STREAM_END + 0.22;
  const HAS_BANNER = SUCCESS.length > 0;
  const BANNER_END = HAS_BANNER ? SB + 0.5 : STREAM_END;
  const HOLD = 1.0;
  const DUR = Math.min(18, Math.max(4, Math.ceil((BANNER_END + HOLD) * 10) / 10));
  return { BANNER_END, DUR };
}

/* ── arg parsing ──────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith("--"));
if (!file) {
  console.error("usage: node bake-duration.mjs <index.html> [--variables '<json>' | --variables-file <path>] [--check]");
  process.exit(2);
}
const check = args.includes("--check");
function flagValue(name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}
const inlineVars = flagValue("--variables");
const varsFile = flagValue("--variables-file");
if (inlineVars && varsFile) {
  console.error("Use either --variables or --variables-file, not both.");
  process.exit(2);
}

let overrides = {};
try {
  if (inlineVars) overrides = JSON.parse(inlineVars);
  else if (varsFile) overrides = JSON.parse(readFileSync(varsFile, "utf8"));
} catch (e) {
  console.error("Could not parse variable overrides: " + e.message);
  process.exit(2);
}
if (overrides == null || typeof overrides !== "object" || Array.isArray(overrides)) {
  console.error("Variable overrides must be a JSON object of {id: value}.");
  process.exit(2);
}

/* ── read defaults from data-composition-variables, merge overrides ───── */
const html = readFileSync(file, "utf8");
const declMatch = html.match(/data-composition-variables\s*=\s*'([\s\S]*?)'/);
if (!declMatch) {
  console.error("No data-composition-variables found in " + file);
  process.exit(2);
}
let declared;
try {
  declared = JSON.parse(declMatch[1]);
} catch (e) {
  console.error("data-composition-variables is not valid JSON: " + e.message);
  process.exit(2);
}
const defaults = {};
for (const d of declared) if (d && typeof d.id === "string" && "default" in d) defaults[d.id] = d.default;
const V = { ...defaults, ...overrides };

/* ── compute + rewrite #root's literal data-duration / data-end ───────── */
const { DUR, BANNER_END } = computeChoreography(V);

const rootTagMatch = html.match(/<div\b[^>]*\bid=["']root["'][^>]*>/i);
if (!rootTagMatch) {
  console.error("Could not find <div id=\"root\" …> in " + file);
  process.exit(2);
}
const oldTag = rootTagMatch[0];
const oldDurMatch = oldTag.match(/data-duration=["']([^"']*)["']/);
const oldDur = oldDurMatch ? parseFloat(oldDurMatch[1]) : NaN;

let newTag = oldTag;
if (/data-duration=["'][^"']*["']/.test(newTag)) {
  newTag = newTag.replace(/data-duration=["'][^"']*["']/, `data-duration="${DUR}"`);
} else {
  newTag = newTag.replace(/<div\b/i, `<div data-duration="${DUR}"`);
}
// data-start defaults to 0 here; keep data-end consistent if present
const startMatch = newTag.match(/data-start=["']([^"']*)["']/);
const start = startMatch ? parseFloat(startMatch[1]) || 0 : 0;
if (/data-end=["'][^"']*["']/.test(newTag)) {
  newTag = newTag.replace(/data-end=["'][^"']*["']/, `data-end="${start + DUR}"`);
}

const changed = !(Math.abs(oldDur - DUR) < 1e-9);

if (check) {
  if (changed) {
    console.error(`[bake-duration] STALE: data-duration=${oldDur} but choreography needs ${DUR} (BANNER_END=${BANNER_END.toFixed(3)}s)`);
    process.exit(1);
  }
  console.log(`[bake-duration] OK: data-duration=${DUR} matches choreography (BANNER_END=${BANNER_END.toFixed(3)}s)`);
  process.exit(0);
}

if (changed) {
  writeFileSync(file, html.replace(oldTag, newTag));
  console.log(`[bake-duration] baked data-duration ${oldDur} → ${DUR}s  (BANNER_END=${BANNER_END.toFixed(3)}s) in ${file}`);
} else {
  console.log(`[bake-duration] data-duration already ${DUR}s (BANNER_END=${BANNER_END.toFixed(3)}s) — no change`);
}
