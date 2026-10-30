// Minimal SKILL.md frontmatter reader. Handles the YAML subset skills use:
// top-level scalars, quoted strings, block scalars (> >- | |-), indented
// continuation lines and nested maps (kept raw). It is not a full YAML
// parser; it reports the mistakes that make real parsers reject a skill's
// frontmatter. No dependencies, so the scripts run anywhere Node 18+ runs.

export function splitFrontmatter(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  if (lines[0].trimEnd() !== "---") {
    return { ok: false, error: "first line is not ---", lines };
  }
  const end = lines.findIndex((l, i) => i > 0 && l.trimEnd() === "---");
  if (end === -1) {
    return { ok: false, error: "frontmatter has no closing ---", lines };
  }
  return {
    ok: true,
    fmLines: lines.slice(1, end),
    bodyLines: lines.slice(end + 1),
    bodyStartLine: end + 2,
  };
}

export function parseFrontmatter(fmLines) {
  const fields = {};
  const order = [];
  const issues = [];
  fmLines.forEach((line, i) => {
    if (/^\s*\t/.test(line)) {
      issues.push({ level: "FAIL", line: i + 2, message: "tab in frontmatter indentation; YAML allows spaces only" });
    }
  });
  let i = 0;
  while (i < fmLines.length) {
    const line = fmLines[i];
    const match = /^([A-Za-z0-9_-]+):(?:\s+(.*)|\s*)$/.exec(line);
    if (!match) {
      i++;
      continue;
    }
    const key = match[1];
    const rest = (match[2] ?? "").trimEnd();
    const startLine = i + 2;
    const block = [];
    i++;
    while (i < fmLines.length && (/^\s+\S/.test(fmLines[i]) || fmLines[i].trim() === "")) {
      block.push(fmLines[i]);
      i++;
    }
    while (block.length && block[block.length - 1].trim() === "") {
      block.pop();
    }
    if (fields[key]) {
      issues.push({ level: "WARN", line: startLine, message: `duplicate key "${key}"; some parsers reject the file, others keep only one value` });
    }
    const report = (level, message) => issues.push({ level, line: startLine, message: `${key}: ${message}` });
    fields[key] = { value: readValue(rest, block, report), raw: [line, ...block], line: startLine };
    order.push(key);
  }
  return { fields, order, issues };
}

function readValue(rest, block, report) {
  const indented = block.map((l) => l.trim());
  if (/^[>|][+-]?$/.test(rest)) {
    if (rest.startsWith(">")) {
      return indented.join(" ").replace(/\s+/g, " ").trim();
    }
    return indented.join("\n").trim();
  }
  if (rest === "" && block.length) {
    const nested = block.every((l) => /^\s+([A-Za-z0-9_-]+:|-\s)/.test(l) || l.trim() === "");
    if (nested) {
      return { nested: indented.join("\n") };
    }
  }
  const value = [rest, ...indented].join(" ").trim();
  if (value.startsWith('"')) {
    if (value.length < 2 || !/(^|[^\\])"$/.test(value.slice(1))) {
      report("FAIL", "the double quote is never closed; the YAML won't parse");
      return value.slice(1);
    }
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value.startsWith("'")) {
    if (value.length < 2 || !value.endsWith("'")) {
      report("FAIL", "the single quote is never closed; the YAML won't parse");
      return value.slice(1);
    }
    return value.slice(1, -1).replace(/''/g, "'");
  }
  let plain = value;
  const comment = plain.search(/\s#/);
  if (comment !== -1) {
    report("WARN", "everything after \" #\" is a YAML comment and gets dropped; wrap the value in double quotes to keep it");
    plain = plain.slice(0, comment).trim();
  }
  if (/:\s/.test(plain) || plain.endsWith(":")) {
    report("FAIL", "an unquoted value containing \": \" is invalid YAML, so the skill loads with no metadata; wrap the value in double quotes");
  }
  if (plain !== "" && /^[@`%*&!|>{[]/.test(plain)) {
    report("FAIL", `an unquoted value can't start with "${plain[0]}"; wrap it in double quotes`);
  }
  return plain;
}

export function isTrue(value) {
  return typeof value === "string" && /^(true|yes|on|1)$/i.test(value.trim());
}
