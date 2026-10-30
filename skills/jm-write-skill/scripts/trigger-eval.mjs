#!/usr/bin/env node
// Measures how often a skill loads for realistic requests, using headless
// Claude Code sessions (`claude -p`). Each session runs in a throwaway
// workspace that exposes the skill as a project skill, with read-only tools,
// and stops as soon as the skill loads.
//
// Usage:
//   node trigger-eval.mjs --skill <folder> --queries <file.json>
//        [--runs 3] [--parallel 4] [--model <id>] [--max-turns 5]
//        [--description "<alternative description to test>"] [--hide skill-a,skill-b]
//        [--out results.json] [--keep]
//
// Queries file: [{ "query": "...", "should_trigger": true, "set": "test" }, ...]
// "set" is optional; entries marked "test" are reported separately as a
// held-out check when you iterate on the description.
//
// Exit codes: 0 every query passed, 1 some query failed, 2 bad usage,
// 3 too many sessions errored for the result to mean anything.

import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { parseFrontmatter, splitFrontmatter } from "./lib/frontmatter.mjs";

const COST_PER_SESSION_MAX = 0.15;
const TIMEOUT_MS = 180_000;

const opts = parseArgs(process.argv.slice(2));
if (!opts.skill || !opts.queries) {
  usage("--skill and --queries are required");
}

const runs = Number(opts.runs ?? 3);
const parallel = Number(opts.parallel ?? 4);
const maxTurns = Number(opts["max-turns"] ?? 5);
if (![runs, parallel, maxTurns].every((n) => Number.isInteger(n) && n > 0)) {
  usage("--runs, --parallel and --max-turns take whole numbers above 0");
}
if (runs % 2 === 0) {
  console.log(`Note: --runs ${runs} is even, so a split result fails either way. Odd counts (1, 3, 5) give a clear majority.`);
}

const probe = spawnSync("claude", ["--version"], { encoding: "utf8" });
if (probe.error || probe.status !== 0) {
  console.error("The `claude` CLI is not available. Install Claude Code, or test triggering by hand (see testing.md).");
  process.exit(2);
}

const skillDir = resolve(opts.skill);
const queries = JSON.parse(readFileSync(resolve(opts.queries), "utf8"));
const originalName = readName(skillDir);
const setup = prepareWorkspace(skillDir, originalName, typeof opts.description === "string" ? opts.description : undefined);
const name = setup.testName;

const jobs = [];
queries.forEach((q, qi) => {
  for (let r = 0; r < runs; r++) {
    jobs.push({ qi, r });
  }
});

console.log(`Skill "${name}": ${queries.length} queries x ${runs} runs = ${jobs.length} headless sessions (${parallel} at a time).`);
console.log(`Estimated cost: up to $${(jobs.length * COST_PER_SESSION_MAX).toFixed(2)}.`);
if (setup.note) {
  console.log(setup.note);
}
if (typeof opts.hide === "string") {
  console.log(`Hidden for this run: ${opts.hide}. Results show the skill without that competition, not the user's real setup.`);
}
console.log(`Workspace: ${setup.ws}`);

const results = queries.map((q) => ({ ...q, hits: 0, runs: 0, errors: 0, others: {}, misses: [] }));
let notVisible = 0;
let errored = 0;
let done = 0;
let cost = 0;

await runPool(jobs, parallel, async ({ qi }) => {
  const outcome = await runOnce(queries[qi].query);
  const result = results[qi];
  cost += outcome.cost;
  done++;
  process.stdout.write(`\r${done}/${jobs.length} sessions`);
  if (outcome.visible === false) {
    notVisible++;
  }
  if (outcome.error) {
    result.errors++;
    errored++;
    return;
  }
  result.runs++;
  if (outcome.triggered) {
    result.hits++;
  } else {
    result.misses.push(`${outcome.tools.join(">") || "no tools"} (${outcome.end})`);
  }
  for (const other of outcome.others) {
    result.others[other] = (result.others[other] ?? 0) + 1;
  }
});
process.stdout.write("\n");

if (!opts.keep) {
  rmSync(setup.ws, { recursive: true, force: true });
}

if (notVisible) {
  console.log(`WARNING: the skill was missing from the session's skill list in ${notVisible} sessions. Lint the frontmatter; those results are not valid.`);
}

printTable(results);
const summary = summarise(results);
printSummary(summary);

if (opts.out) {
  writeFileSync(resolve(opts.out), JSON.stringify({ skill: name, description: opts.description ?? null, runs, errored, results, summary, partialCostUsd: cost }, null, 2));
  console.log(`Wrote ${opts.out}`);
}

if (errored > jobs.length * 0.2 || notVisible > jobs.length * 0.2) {
  console.log(`INVALID: ${errored} of ${jobs.length} sessions errored or timed out. Fix the cause (auth, network, CLI) and rerun.`);
  process.exit(3);
}
process.exit(results.every(passes) ? 0 : 1);

function usage(message) {
  console.error(message);
  console.error("Usage: node trigger-eval.mjs --skill <folder> --queries <file.json> [--runs 3] [--parallel 4] [--model <id>] [--max-turns 5] [--description \"...\"] [--hide a,b] [--out results.json] [--keep]");
  process.exit(2);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

function readName(dir) {
  const path = join(dir, "SKILL.md");
  if (!existsSync(path)) {
    usage(`No SKILL.md in ${dir}`);
  }
  const split = splitFrontmatter(readFileSync(path, "utf8"));
  if (!split.ok) {
    usage(`SKILL.md frontmatter is broken (${split.error}); run the linter first.`);
  }
  const { fields } = parseFrontmatter(split.fmLines);
  const value = fields.name?.value;
  if (typeof value === "string" && value) {
    return value;
  }
  return basename(dir);
}

// Exposes the skill to headless sessions as a project skill. When a personal
// skill with the same name exists, personal would win, so the test copy gets
// a "-trial" name and the personal one is hidden through skillOverrides.
function prepareWorkspace(dir, skillName, altDescription) {
  const ws = mkdtempSync(join(tmpdir(), "skill-trigger-"));
  const personal = join(homedir(), ".claude", "skills", skillName);
  const isInstalledCopy = existsSync(personal) && realpathSync(personal) === realpathSync(dir);
  if (isInstalledCopy && !altDescription) {
    return { ws, testName: skillName };
  }
  const clash = existsSync(personal);
  const testName = clash ? `${skillName}-trial` : skillName;
  const dest = join(ws, ".claude", "skills", testName);
  mkdirSync(join(ws, ".claude", "skills"), { recursive: true });
  if (!clash && !altDescription) {
    symlinkSync(dir, dest, "dir");
    return { ws, testName };
  }
  cpSync(dir, dest, { recursive: true });
  const path = join(dest, "SKILL.md");
  const split = splitFrontmatter(readFileSync(path, "utf8"));
  const { fields, order } = parseFrontmatter(split.fmLines);
  const replace = { name: testName };
  if (altDescription) {
    replace.description = altDescription;
  }
  const fm = order.map((key) => (key in replace ? `${key}: ${JSON.stringify(replace[key])}` : fields[key].raw.join("\n")));
  for (const key of Object.keys(replace)) {
    if (!order.includes(key)) {
      fm.push(`${key}: ${JSON.stringify(replace[key])}`);
    }
  }
  writeFileSync(path, ["---", ...fm, "---", ...split.bodyLines].join("\n"));
  if (!clash) {
    return { ws, testName };
  }
  return {
    ws,
    testName,
    hide: skillName,
    note: `A personal skill named "${skillName}" is installed; testing a copy named "${testName}" with the installed one hidden. The name is part of the trigger, so expect a small shift.`,
  };
}

function runOnce(query) {
  return new Promise((resolveRun) => {
    const args = [
      "-p", query,
      "--output-format", "stream-json", "--verbose",
      "--max-turns", String(maxTurns),
      "--no-session-persistence",
      "--strict-mcp-config",
      "--tools", "Skill,Read,Glob,Grep",
    ];
    const hidden = [setup.hide, ...String(opts.hide ?? "").split(",")].filter((s) => s && s !== "true");
    if (hidden.length) {
      args.push("--settings", JSON.stringify({ skillOverrides: Object.fromEntries(hidden.map((s) => [s.trim(), "off"])) }));
    }
    if (opts.model) {
      args.push("--model", String(opts.model));
    }
    const child = spawn("claude", args, { cwd: setup.ws, stdio: ["ignore", "pipe", "pipe"] });
    const outcome = { triggered: false, visible: undefined, cost: 0, error: false, others: new Set(), tools: [], end: "no result" };
    let buffer = "";
    let stoppedByUs = false;
    const timer = setTimeout(() => {
      outcome.error = true;
      outcome.end = "timeout";
      child.kill("SIGTERM");
    }, TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        inspect(line, outcome);
        if (outcome.triggered && !stoppedByUs) {
          stoppedByUs = true;
          child.kill("SIGTERM");
        }
      }
    });
    child.on("error", () => {
      outcome.error = true;
    });
    child.on("close", () => {
      clearTimeout(timer);
      if (buffer) {
        inspect(buffer, outcome);
      }
      if (!stoppedByUs && outcome.end === "no result") {
        outcome.error = true;
      }
      resolveRun(outcome);
    });
  });
}

function inspect(line, outcome) {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    return;
  }
  if (event.type === "system" && event.subtype === "init" && Array.isArray(event.skills)) {
    outcome.visible = event.skills.some((s) => s === name || s.endsWith(`:${name}`));
  }
  if (event.type === "assistant") {
    for (const part of event.message?.content ?? []) {
      if (part.type !== "tool_use") {
        continue;
      }
      outcome.tools.push(part.name);
      const skill = String(part.input?.skill ?? "").replace(/^\//, "");
      if (part.name === "Skill" && (skill === name || skill.endsWith(`:${name}`))) {
        outcome.triggered = true;
      } else if (part.name === "Skill" && skill) {
        outcome.others.add(skill);
      }
      const file = String(part.input?.file_path ?? "");
      if (part.name === "Read" && file.endsWith(`/${name}/SKILL.md`)) {
        outcome.triggered = true;
      }
    }
  }
  if (event.type === "result") {
    outcome.cost = Number(event.total_cost_usd ?? 0);
    outcome.end = event.subtype ?? "result";
    if (event.is_error && event.subtype !== "error_max_turns") {
      outcome.error = true;
    }
  }
}

async function runPool(items, size, worker) {
  let next = 0;
  const lanes = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await worker(item);
    }
  });
  await Promise.all(lanes);
}

function passes(r) {
  if (r.runs === 0) {
    return false;
  }
  if (r.should_trigger) {
    return r.hits * 2 > r.runs;
  }
  return r.hits * 2 < r.runs;
}

function printTable(rows) {
  console.log("");
  console.log("result  hits   expect  set    query");
  for (const r of rows) {
    const mark = r.runs === 0 ? "ERROR" : passes(r) ? "PASS " : "FAIL ";
    const expect = r.should_trigger ? "load" : "skip";
    const set = (r.set ?? "train").padEnd(6);
    const errors = r.errors ? ` (${r.errors} errored, not counted)` : "";
    const others = Object.entries(r.others).map(([s, n]) => `${s} x${n}`).join(", ");
    const lost = others ? `\n        loaded instead: ${others}` : "";
    const why = r.runs && !passes(r) && r.should_trigger ? `\n        runs without it: ${r.misses.join("; ")}` : "";
    console.log(`${mark}   ${r.hits}/${r.runs}    ${expect}    ${set} ${truncate(r.query, 90)}${errors}${lost}${why}`);
  }
}

function summarise(rows) {
  const groups = {};
  for (const r of rows) {
    const set = r.set ?? "train";
    groups[set] ??= { shouldTotal: 0, shouldPass: 0, nearTotal: 0, nearPass: 0 };
    const g = groups[set];
    if (r.should_trigger) {
      g.shouldTotal++;
      g.shouldPass += passes(r) ? 1 : 0;
    } else {
      g.nearTotal++;
      g.nearPass += passes(r) ? 1 : 0;
    }
  }
  return groups;
}

function printSummary(groups) {
  console.log("");
  for (const [set, g] of Object.entries(groups)) {
    console.log(`${set}: loads when it should ${g.shouldPass}/${g.shouldTotal}, stays out of near-misses ${g.nearPass}/${g.nearTotal}`);
  }
  if (errored) {
    console.log(`${errored} sessions errored or timed out and are left out of the counts.`);
  }
  console.log(`Partial cost: $${cost.toFixed(2)}. Sessions stopped at the first load report no cost, so the real total is higher.`);
}

function truncate(s, n) {
  const flat = s.replace(/\s+/g, " ");
  return flat.length > n ? `${flat.slice(0, n - 3)}...` : flat;
}
