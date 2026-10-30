#!/usr/bin/env node
// Lints an agent skill folder against the structural rules that decide whether
// a skill loads and gets followed.
// Usage: node lint-skill.mjs <skill-folder> [--json]
// Exit code 1 when any FAIL is found, 2 on bad usage.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { isTrue, parseFrontmatter, splitFrontmatter } from "./lib/frontmatter.mjs";

const KNOWN_FIELDS = new Set([
  "name", "description", "when_to_use", "argument-hint", "arguments",
  "disable-model-invocation", "user-invocable", "allowed-tools", "disallowed-tools",
  "model", "effort", "context", "agent", "background", "hooks", "paths", "shell",
  "metadata", "license", "compatibility",
]);

const HEDGES = [
  "where appropriate", "as appropriate", "if appropriate", "appropriately",
  "as needed", "if needed", "if necessary", "when necessary", "where necessary",
  "reasonable", "reasonably", "try to", "consider", "tasteful", "properly", "ideally",
  "if possible", "when possible", "where possible", "as much as possible",
  "etc.", "and so on", "best practices", "robust", "seamless", "nice", "good enough",
];

const SHOUTS = /\b(MUST|NEVER|ALWAYS|CRITICAL|IMPORTANT|MANDATORY|REQUIRED)\b/g;
const TIME_SENSITIVE = /\b(as of (19|20)\d\d|new in v?\d)/i;
const CONDITION_WORDS = /\b(when|whenever|if|unless|before|after|once|while)\b/i;
const INTERPRETERS = /\b(node|bash|sh|zsh|python3?|deno|bun|ruby|tsx|uv run|npx)\s+\S*$/;
const SKIP_DIRS = new Set(["agents", ".git", "node_modules", "evals", "tests", "test", "__pycache__"]);
const SKIP_FILES = /^(LICENSE|README|CHANGELOG|NOTICE|MODIFICATIONS|\.DS_Store)/i;

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const target = args.find((a) => !a.startsWith("--"));
if (!target) {
  console.error("Usage: node lint-skill.mjs <skill-folder> [--json]");
  process.exit(2);
}

const dir = resolve(target.endsWith("SKILL.md") ? dirname(target) : target);
const findings = [];
const stats = {};

function add(level, file, line, message) {
  findings.push({ level, file, line, message });
}

run();
report();

function run() {
  const skillPath = join(dir, "SKILL.md");
  if (!existsSync(skillPath)) {
    add("FAIL", "SKILL.md", 0, `no SKILL.md in ${dir} (the name is case-sensitive)`);
    return;
  }
  const text = readFileSync(skillPath, "utf8");
  if (text.startsWith("﻿")) {
    add("WARN", "SKILL.md", 1, "file starts with a byte-order mark; some loaders then miss the frontmatter. Save as UTF-8 without BOM");
  }
  const firstLine = text.replace(/^﻿/, "").split(/\r?\n/)[0];
  if (firstLine !== "---" && firstLine.trimEnd() === "---") {
    add("WARN", "SKILL.md", 1, "trailing spaces after the opening ---; some loaders require the line to be exactly ---");
  }
  const split = splitFrontmatter(text);
  if (!split.ok) {
    add("FAIL", "SKILL.md", 1, `${split.error}; the agent loads the skill with empty metadata and can't match its description`);
    return;
  }
  const { fields, order, issues } = parseFrontmatter(split.fmLines);
  for (const issue of issues) {
    add(issue.level, "SKILL.md", issue.line, issue.message);
  }
  checkFrontmatter(fields, order);
  checkBody(split.bodyLines, split.bodyStartLine);
  const referenced = checkReferences(split.bodyLines, split.bodyStartLine);
  checkReferenceFiles(referenced);
  checkOrphans();
}

function checkFrontmatter(fields, order) {
  const folder = basename(dir);
  const name = typeof fields.name?.value === "string" ? fields.name.value : undefined;
  const nameLine = fields.name?.line ?? 1;

  if (!name) {
    add("WARN", "SKILL.md", 1, `no name; the open spec requires it and some agents won't load the skill (Claude Code falls back to the folder name "${folder}")`);
  } else {
    if (name.length > 64) {
      add("FAIL", "SKILL.md", nameLine, `name is ${name.length} characters; the limit is 64`);
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
      add("FAIL", "SKILL.md", nameLine, `name "${name}" must be lowercase letters, digits and single hyphens`);
    }
    if (name !== folder) {
      add("WARN", "SKILL.md", nameLine, `name "${name}" differs from the folder "${folder}"; the open spec requires them to match, and installers name the folder after the skill`);
    }
    if (/anthropic|claude/.test(name)) {
      add("WARN", "SKILL.md", nameLine, "name contains a reserved word (\"anthropic\" or \"claude\"); the Claude API rejects it");
    }
    if (/^(helper|helpers|utils|tools|misc|common|documents?)$/.test(name)) {
      add("WARN", "SKILL.md", nameLine, `name "${name}" says nothing about the job; the name is part of the trigger, so name what it does`);
    }
  }

  for (const key of order) {
    if (!KNOWN_FIELDS.has(key)) {
      const hint = key === "version" ? "; put it under metadata" : "";
      add("WARN", "SKILL.md", fields[key].line, `unknown field "${key}" is ignored silently${hint}`);
    }
  }

  const desc = fields.description?.value;
  const descLine = fields.description?.line ?? 1;
  if (typeof desc !== "string" || desc.trim() === "") {
    add("FAIL", "SKILL.md", descLine, "no description; it is the only text besides the name that the agent sees when deciding to load the skill");
    return;
  }
  stats.descriptionChars = desc.length;
  const manual = isTrue(fields["disable-model-invocation"]?.value);
  stats.startedBy = manual ? "user only" : "agent or user";
  const whenToUse = typeof fields.when_to_use?.value === "string" ? fields.when_to_use.value : "";

  if (desc.length > 1024) {
    add("FAIL", "SKILL.md", descLine, `description is ${desc.length} characters; the limit is 1,024`);
  }
  if (desc.length + whenToUse.length > 1536) {
    add("FAIL", "SKILL.md", descLine, `description + when_to_use is ${desc.length + whenToUse.length} characters; Claude Code cuts each listing entry at 1,536`);
  }
  if (manual && desc.length > 200) {
    add("WARN", "SKILL.md", descLine, `user-started skill with a ${desc.length}-character description; only the human reads it, so one line is enough`);
  }
  if (!manual && desc.length > 500) {
    add("WARN", "SKILL.md", descLine, `description is ${desc.length} characters; every description competes for one listing budget, so aim for 150-500 and lead with the key use case`);
  }
  if (!manual && desc.length < 100) {
    add("WARN", "SKILL.md", descLine, `description is ${desc.length} characters; too short to name the situations and the user's words`);
  }
  if (!manual && !/\b(use|when|whenever|trigger|asks?|wants?)\b/i.test(`${desc} ${whenToUse}`)) {
    add("WARN", "SKILL.md", descLine, "description never says when to use the skill; lead with \"Use when ...\"");
  }
  if (/[<>]/.test(desc)) {
    add("WARN", "SKILL.md", descLine, "description contains < or >; Claude Code shows them as &lt; &gt;. Use [placeholder] instead");
  }
  const own = stripQuoted(desc)
    .replace(/\([^)]*\)/g, " ")
    .split(/\b(?:also )?triggers? (?:on|include|when)\b|\be\.g\./i)[0];
  if (/(^|[.!?]\s+)(I|We)\b|\b(I can|I will|I'll|I'm|we can|we will)\b/.test(own)) {
    add("WARN", "SKILL.md", descLine, "description speaks in first person; write it in third person (\"Use when the user ...\")");
  }
  const sequence = own.match(/\bthen\b|→|->|\bstep \d|\bfirst\b|\bfinally\b|\bafterwards\b/gi) ?? [];
  if (sequence.length >= 2) {
    add("WARN", "SKILL.md", descLine, "description reads like a workflow summary; agents follow the summary and skip the body. Keep only when to use it");
  }
}

function checkBody(bodyLines, startLine) {
  const text = bodyLines.join("\n");
  const lineCount = bodyLines.length;
  const tokens = Math.round(text.length / 4);
  stats.bodyLines = lineCount;
  stats.bodyTokens = tokens;

  if (text.trim() === "") {
    add("FAIL", "SKILL.md", startLine, "body is empty");
    return;
  }
  if (lineCount > 500) {
    add("WARN", "SKILL.md", startLine, `body is ${lineCount} lines, past the recommended 500; move reference material to files read on a condition`);
  } else if (lineCount > 300) {
    add("WARN", "SKILL.md", startLine, `body is ${lineCount} lines; check every line still changes what the agent does`);
  }
  if (tokens > 5000) {
    add("WARN", "SKILL.md", startLine, `body is ~${tokens} tokens; after compaction Claude Code keeps only the first 5,000, so put the essentials at the top`);
  }

  let hedgeCount = 0;
  let shoutCount = 0;
  for (const { line, n } of proseLines(bodyLines, startLine)) {
    const plain = stripQuoted(line);
    for (const hedge of HEDGES) {
      const pattern = new RegExp(`(^|[^A-Za-z])${escapeRegex(hedge)}($|[^A-Za-z])`, "i");
      if (pattern.test(plain)) {
        hedgeCount++;
        if (hedgeCount <= 12) {
          add("WARN", "SKILL.md", n, `vague "${hedge}" gives the agent nothing to act on; use a number, a named value, always or never`);
        }
      }
    }
    shoutCount += (plain.match(SHOUTS) ?? []).length;
    if (TIME_SENSITIVE.test(plain)) {
      add("WARN", "SKILL.md", n, "time-bound wording goes stale; state the fact without a date, or point to a live source");
    }
    if (/\b[A-Za-z]:\\|[\w.-]+\\[\w.-]+\\/.test(plain)) {
      add("WARN", "SKILL.md", n, "Windows-style path; use forward slashes");
    }
  }
  if (hedgeCount > 12) {
    add("WARN", "SKILL.md", startLine, `${hedgeCount - 12} more vague phrases not listed`);
  }
  if (shoutCount > 3) {
    add("WARN", "SKILL.md", startLine, `${shoutCount} all-caps MUST/NEVER/ALWAYS; keep capitals for the one or two rules where a miss is costly and give the others a reason`);
  }

  for (const { text: cmd, n } of codeSnippets(bodyLines, startLine)) {
    const script = /(^|\s)((?:\.\/|\$\{CLAUDE_SKILL_DIR\}\/)?scripts\/[\w./-]+\.(?:sh|py|mjs|js|cjs|ts|rb))\b/.exec(cmd);
    if (!script) {
      continue;
    }
    const bare = script.index === 0;
    const viaInterpreter = INTERPRETERS.test(cmd.slice(0, script.index + script[1].length));
    if (bare) {
      add("WARN", "SKILL.md", n, `script "${script[2]}" runs by bare path; call it through its interpreter (node, bash, python3) because packagers can strip the executable bit`);
    }
    const rel = script[2].replace(/^\$\{CLAUDE_SKILL_DIR\}\//, "").replace(/^\.\//, "");
    if ((bare || viaInterpreter) && !existsSync(join(dir, rel))) {
      add("FAIL", "SKILL.md", n, `script "${rel}" does not exist in the skill folder`);
    }
  }
}

// Reference files count as referenced when SKILL.md links to them or names
// them in prose or backticks ("Read `errors.md` when ...").
function checkReferences(bodyLines, startLine) {
  const referenced = new Set();
  const unconditioned = new Map();
  const mdFiles = localMarkdownFiles();
  for (const { line, n } of proseLines(bodyLines, startLine)) {
    for (const link of stripInlineCode(line).matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const target = link[1];
      if (/^(https?:|mailto:|#)/.test(target)) {
        continue;
      }
      const path = safeDecode(target.split("#")[0]);
      if (!existsSync(resolve(dir, path))) {
        add("FAIL", "SKILL.md", n, `link to "${path}" points to a missing file`);
      }
    }
    for (const file of mdFiles) {
      if (!mentions(line, file)) {
        continue;
      }
      referenced.add(file.abs);
      const isTableRow = /^\s*\|/.test(line);
      const isLinkDefinition = /^\s*\[[^\]]+\]:/.test(line);
      if (!isTableRow && !isLinkDefinition && !CONDITION_WORDS.test(stripLinkTargets(line))) {
        const seen = unconditioned.get(file.rel) ?? { n, count: 0 };
        seen.count++;
        unconditioned.set(file.rel, seen);
      }
    }
  }
  for (const [rel, { n, count }] of unconditioned) {
    const times = count > 1 ? ` (${count} mentions)` : "";
    add("WARN", "SKILL.md", n, `pointer to "${rel}" has no condition${times}; write "Read ${rel} when ..." so the agent doesn't load it up front or never`);
  }
  return referenced;
}

function checkReferenceFiles(referenced) {
  const mdFiles = localMarkdownFiles();
  for (const abs of referenced) {
    const rel = relative(dir, abs);
    const lines = readFileSync(abs, "utf8").split(/\r?\n/);
    if (lines.length > 100) {
      const head = lines.slice(0, 40).join("\n");
      const hasContents = /^#+\s*(contents|table of contents|toc|on this page)\b/im.test(head) || (head.match(/\]\(#/g) ?? []).length >= 3;
      if (!hasContents) {
        add("WARN", rel, 1, `${lines.length} lines with no contents list at the top; agents often preview only the first lines`);
      }
    }
    const onward = new Map();
    for (const { line, n } of proseLines(lines, 1)) {
      for (const link of stripInlineCode(line).matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
        const target = link[1];
        if (/^(https?:|mailto:|#)/.test(target)) {
          continue;
        }
        const path = safeDecode(target.split("#")[0]);
        if (!existsSync(resolve(dirname(abs), path))) {
          add("FAIL", rel, n, `link to "${path}" points to a missing file`);
        }
      }
      for (const file of mdFiles) {
        if (file.abs !== abs && mentions(line, file)) {
          const seen = onward.get(file.rel) ?? { n, count: 0 };
          seen.count++;
          onward.set(file.rel, seen);
        }
      }
    }
    for (const [target, { n, count }] of onward) {
      const times = count > 1 ? ` (${count} mentions)` : "";
      add("WARN", rel, n, `points on to "${target}"${times}; keep references one level deep from SKILL.md, or point back to SKILL.md`);
    }
  }
}

function checkOrphans() {
  const files = walk(dir);
  const texts = files
    .filter((f) => /\.(md|mjs|js|cjs|ts|py|sh|json|ya?ml|txt)$/.test(f))
    .map((f) => ({ f, text: safeDecode(readFileSync(f, "utf8")) }));
  for (const file of files) {
    const rel = relative(dir, file);
    if (rel === "SKILL.md") {
      continue;
    }
    const entry = { rel, base: basename(file) };
    const mentioned = texts.some(({ f, text }) => f !== file && mentions(text, entry));
    if (!mentioned) {
      add("WARN", rel, 0, "nothing in the skill mentions this file, so the agent will never open it");
    }
  }
}

function localMarkdownFiles() {
  return walk(dir)
    .filter((f) => f.endsWith(".md") && relative(dir, f) !== "SKILL.md")
    .map((abs) => ({ abs, rel: relative(dir, abs), base: basename(abs) }));
}

function mentions(text, file) {
  const names = [...new Set([file.rel, file.base])].map(escapeRegex).join("|");
  return new RegExp(`(^|[^\\w.-])(\\./)?(${names})(?![\\w-])`).test(text);
}

function walk(root) {
  const out = [];
  for (const entry of readdirSync(root)) {
    const abs = join(root, entry);
    const info = statSync(abs);
    if (info.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) {
        out.push(...walk(abs));
      }
      continue;
    }
    if (!SKIP_FILES.test(entry)) {
      out.push(abs);
    }
  }
  return out;
}

function proseLines(lines, startLine) {
  const out = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (!inFence && !/^( {4}|\t)/.test(line)) {
      out.push({ line, n: startLine + i });
    }
  });
  return out;
}

function codeSnippets(lines, startLine) {
  const out = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence || /^( {4}|\t)\S/.test(line)) {
      out.push({ text: line.trim(), n: startLine + i });
      return;
    }
    for (const span of line.matchAll(/`([^`]+)`/g)) {
      out.push({ text: span[1].trim(), n: startLine + i });
    }
  });
  return out;
}

function stripQuoted(line) {
  return line
    .replace(/`[^`]*`/g, " ")
    .replace(/"[^"]*"/g, " ")
    .replace(/“[^”]*”/g, " ")
    .replace(/\]\([^)]*\)/g, "]");
}

function stripInlineCode(line) {
  return line.replace(/`[^`]*`/g, " ");
}

function stripLinkTargets(line) {
  return line.replace(/\]\([^)]*\)/g, "]");
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function report() {
  const order = { FAIL: 0, WARN: 1 };
  findings.sort((a, b) => order[a.level] - order[b.level] || a.file.localeCompare(b.file) || a.line - b.line);
  const fails = findings.filter((f) => f.level === "FAIL").length;
  const warns = findings.length - fails;
  if (asJson) {
    console.log(JSON.stringify({ skill: dir, stats, fails, warns, findings }, null, 2));
  } else {
    console.log(`Lint: ${dir}`);
    for (const f of findings) {
      const where = f.line ? `${f.file}:${f.line}` : f.file;
      console.log(`${f.level} ${where}  ${f.message}`);
    }
    const parts = [`${fails} FAIL, ${warns} WARN`];
    if (stats.bodyLines !== undefined) {
      parts.push(`body ${stats.bodyLines} lines, ~${stats.bodyTokens} tokens`);
    }
    if (stats.descriptionChars !== undefined) {
      parts.push(`description ${stats.descriptionChars} chars`, `started by ${stats.startedBy}`);
    }
    console.log(parts.join(" | "));
    console.log("Lint approximates YAML parsing. In Claude Code, `claude plugin validate <skills-dir>` or `claude --debug` shows the real parse result.");
  }
  process.exit(fails ? 1 : 0);
}
