#!/usr/bin/env node
// Self-test for scripts/check-explain.mjs (Loop row L2).
// Runs the checker over every fixture with the fixture token source, asserts the
// exact set of FAIL and WARN rule ids per fixture, and asserts that every rule id
// fires in at least one fixture. Exit 1 on any mismatch.
// Usage: node tests/run.mjs
// The probe fixtures (tight-but-ok, broken-overlap, broken-scaled-svg) are
// checker-clean on purpose; their defects are for scripts/probe.js (Loop row L3).

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures");
const checker = join(here, "../scripts/check-explain.mjs");
const tokens = join(fixtures, "tokens.html");

const CASES = {
  "ok-minimal.html": { fail: [], warn: [] },
  "warn-scope.html": { fail: [], warn: ["step-count", "figure-count", "word-count", "em-dash", "accent-prose"] },
  "tight-but-ok.html": { gallery: true, fail: [], warn: [] },
  "broken-overlap.html": { gallery: true, fail: [], warn: [] },
  "broken-scaled-svg.html": { gallery: true, fail: [], warn: ["svg-size"] },
  "broken-colour.html": { gallery: true, fail: ["color-literal", "token-missing", "token-changed", "token-extra"], warn: [] },
  "broken-style.html": {
    gallery: true,
    fail: ["box-shadow", "gradient", "figure-surface", "callout-border", "callout-element", "border-width"],
    warn: ["svg-stroke", "accent-chrome"],
  },
  "broken-structure.html": {
    fail: ["part-missing", "part-order", "part-duplicate", "part-unknown", "prompt-line", "problem-h1", "problem-paras",
      "problem-figure", "primer-terms", "mechanism-figure", "mechanism-step"],
    warn: ["step-count"],
  },
  "broken-figures.html": {
    gallery: true,
    fail: ["fig-class", "fig-kind", "fig-tag", "fig-order", "fig-caption", "fig-role", "fig-body", "fig-control",
      "fig-interactive", "ascii-width"],
    warn: ["svg-size", "ascii-pre"],
  },
  "broken-refs.html": { fail: ["ref-unresolved", "sources-count"], warn: [] },
  "broken-external.html": { gallery: true, fail: ["external-load"], warn: ["external-link"] },
};

let bad = 0;
const fired = new Set();
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const fmt = (s) => [...s].sort().join(", ") || "none";
const run = (args) => spawnSync(process.execPath, [checker, ...args], { encoding: "utf8" });

const files = readdirSync(fixtures).filter((f) => f.endsWith(".html") && f !== "tokens.html");
for (const f of files) if (!CASES[f]) { console.log(`MISMATCH ${f}: fixture has no expectation in tests/run.mjs`); bad++; }

for (const [file, exp] of Object.entries(CASES)) {
  const path = join(fixtures, file);
  if (!existsSync(path)) { console.log(`MISMATCH ${file}: fixture missing`); bad++; continue; }
  const res = run(["--tokens", tokens, ...(exp.gallery ? ["--gallery"] : []), path]);
  const got = { FAIL: new Set(), WARN: new Set() };
  for (const line of res.stdout.split("\n")) {
    const m = /^(FAIL|WARN) ([\w-]+): /.exec(line);
    if (m) { got[m[1]].add(m[2]); fired.add(m[2]); }
  }
  const wantExit = exp.fail.length ? 1 : 0;
  const problems = [];
  if (res.status !== wantExit) problems.push(`exit ${res.status}, expected ${wantExit}${res.stderr ? ` (${res.stderr.trim()})` : ""}`);
  if (!sameSet(got.FAIL, new Set(exp.fail))) problems.push(`FAIL ids [${fmt(got.FAIL)}], expected [${fmt(new Set(exp.fail))}]`);
  if (!sameSet(got.WARN, new Set(exp.warn))) problems.push(`WARN ids [${fmt(got.WARN)}], expected [${fmt(new Set(exp.warn))}]`);
  if (problems.length) { bad++; console.log(`MISMATCH ${file}: ${problems.join("; ")}`); }
  else console.log(`ok ${file}: exit ${res.status}, ${got.FAIL.size} FAIL ids, ${got.WARN.size} WARN ids`);
}

// every rule fires somewhere
const listed = run(["--list-rules"]).stdout.trim().split("\n").map((l) => l.split(" "));
const missing = listed.filter(([, id]) => !fired.has(id));
for (const [sev, id] of missing) console.log(`MISSING ${sev} ${id}: fired in no fixture`);
bad += missing.length;
console.log(`rules: ${listed.length - missing.length}/${listed.length} fired (${listed.filter(([s]) => s === "FAIL").length} FAIL, ${listed.filter(([s]) => s === "WARN").length} WARN)`);

// a missing token source is a setup error, not a pass
const noTokens = run(["--tokens", join(fixtures, "does-not-exist.html"), join(fixtures, "ok-minimal.html")]);
if (noTokens.status !== 2 || !/token source/.test(noTokens.stderr)) {
  bad++;
  console.log(`MISMATCH missing token source: exit ${noTokens.status}, expected 2 with a clear message`);
} else console.log("ok missing token source: exit 2 with a message");

// the real assets, when present (informational: their owners fix them)
for (const [rel, extra] of [["../assets/template.html", []], ["../assets/figures.html", ["--gallery"]]]) {
  const path = join(here, rel);
  if (!existsSync(path)) { console.log(`info ${rel}: not present yet`); continue; }
  const res = run([...extra, path]);
  console.log(`info ${rel}: ${res.stdout.trim().split("\n").pop()}`);
}

console.log(bad ? `FAILED: ${bad} mismatch(es)` : "PASSED");
process.exit(bad ? 1 : 0);
