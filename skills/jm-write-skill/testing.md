# Testing a skill

## Contents

- [Lint](#lint)
- [Baseline and behaviour test](#baseline-and-behaviour-test)
- [Trigger test](#trigger-test)
- [Reading the trigger results](#reading-the-trigger-results)
- [Repairing a description](#repairing-a-description)

## Lint

```bash
node ${CLAUDE_SKILL_DIR}/scripts/lint-skill.mjs <skill-folder>
node ${CLAUDE_SKILL_DIR}/scripts/lint-skill.mjs <skill-folder> --json
```

It checks:
- **Frontmatter:** YAML mistakes that stop a real parse, name rules, description length and form, unknown fields.
- **Size:** WARN past 300 body lines and past 500, plus the 5,000-token compaction cut.
- **Wording:** vague words outside quotes and code, and time-bound wording.
- **Links and pointers:** links that point nowhere, pointers with no reading condition, long reference files with no contents list, reference files that point on to other reference files.
- **Files:** scripts called by bare path or missing, and files nothing mentions.

Exit code 1 means at least one FAIL. Quoted text and code are skipped by the vague-word check, so a skill can quote a phrase it tells the agent to avoid. Lint approximates YAML; in Claude Code, `claude plugin validate <skills-folder>` gives the real parse.

## Baseline and behaviour test

Pick 2 or 3 tasks from step 1 that represent the job: one typical, one hard, one edge case. Write each as the user would, with real file paths, context and the user's phrasing.

Run each task twice on fresh subagents, in parallel, each writing to its own output folder:
- **Baseline**: run it where the skill isn't visible. Keep the draft out of every skills folder until step 8, and tell the subagent not to load any skill on the topic.
- **With skill**: tell it to "Read `<path>/SKILL.md` first and follow it; resolve its relative links and `${CLAUDE_SKILL_DIR}` from that folder", so this run measures behaviour rather than triggering.

Brief both identically apart from that line. Use the model the user works with. Ask each to return its output and a short log of the steps it took.

On a tight budget, run 1 task in each arm instead of 3, and report the other tasks as Not verified.

Compare:
- Did each failure recorded in step 1 disappear in the with-skill run?
- Did the with-skill run do anything worse than the baseline? Skills can make some tasks worse; that's a reason to narrow the skill.
- Go through what the agent actually did, step by step: a skipped step, a file read for nothing, or a pause at a vague line each points to a line to fix.
- If both runs pass, the skill teaches nothing for that task. Cut what was meant to teach it.

For subjective output (design, writing, tone), show the user both outputs side by side without saying which is which. Assertions can't judge taste.

After each edit, rerun the same tasks. Keep the tasks fixed between runs so the comparison means something.

## Trigger test

Only for skills the agent can start. It runs real headless Claude Code sessions, so it needs the `claude` CLI and costs money. Sessions = requests x runs, at up to $0.15 each (most stop early, as soon as the skill loads). State both numbers and wait for the user's go-ahead.

Write the requests file:

```json
[
  { "query": "realistic request that should load it", "should_trigger": true },
  { "query": "near-miss sharing its words but needing something else", "should_trigger": false, "set": "test" }
]
```

- 8-10 should-load requests: the real situations, each worded the way a different user would put it (terse, chatty, misspelled), with file paths and backstory. Include requests that never name the topic but clearly need the skill.
- 8-10 near-misses: requests that use the skill's vocabulary but want a different job done. For a migrations skill, "why is this query slow" is a useful near-miss; "convert this image to webp" proves nothing.
- Every request must be substantive. One-step requests load no skill and test nothing.
- Mark about 40% of each kind `"set": "test"` and never tune the description against those.

Run it:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/trigger-eval.mjs --skill <skill-folder> --queries <requests.json> --runs 3
node ${CLAUDE_SKILL_DIR}/scripts/trigger-eval.mjs --skill <skill-folder> --queries <requests.json> --description "<alternative>"
```

Options: `--runs` (default 3; keep it odd), `--parallel` (default 4), `--model <id>` (the model the user works with), `--max-turns` (default 5, since real sessions often explore a few files before loading a skill), `--hide <skill-a,skill-b>` (turn competing skills off for the run, to see whether a competitor causes the misses), `--out <file.json>`, `--keep` (keep the temporary workspace for inspection).

How it works:
- Each session runs in a temporary folder where the skill is a project skill.
- Sessions have only the Skill, Read, Glob and Grep tools, so they can't change anything. A real session with full tools can load at a slightly different rate.
- The user's own skills, CLAUDE.md and hooks still load, so competition is real and each session costs what a normal one does.
- A skill counts as loaded when the session calls the Skill tool for it or reads its SKILL.md.
- If a personal skill with the same name is installed (always the case when testing an installed skill with `--description`), the script tests a copy named `<name>-trial` and hides the installed one through `skillOverrides`. The name is part of the trigger, and in testing the suffix flipped one request from 3/3 to 0/3. Never compare a `-trial` run with a run under the real name. To compare descriptions, pass both the current and the candidate through `--description`.

Exit codes: 0 all passed, 1 some request failed, 3 invalid because over 20% of sessions errored.

Without the `claude` CLI (or in another agent), test by hand: open a fresh session per request and note whether the skill loads. It's slower, so use 10 requests and 1 run each.

## Reading the trigger results

- A request passes when the skill loads in most runs (should-load) or stays out in most runs (near-miss). Errored sessions are left out of the counts.
- Done means every should-load request and every near-miss passes, on both sets.
- "loaded instead" names the skill that won a should-load request: narrow that skill or sharpen yours against it.
- "runs without it" shows what the session did instead, such as answering directly or exploring until the turn limit.
- "Missing from the session's skill list" means the skill never reached the agent: broken frontmatter, a refused name, or the wrong folder. Lint it.
- The printed cost is partial, because sessions stopped at the first load report none. Report the numbers per set, the model used and the session count.

## Repairing a description

1. Run the trigger test to get a baseline.
2. For each should-load request that missed: which situation or word did the user use that the description lacks? Add the situation, not the literal phrase. Copying failed requests into the description overfits.
3. For each near-miss that loaded: which word pulled it in? Narrow the situation or add a "Not for ...".
4. Test the new wording with `--description` before editing the file, and compare on the held-out set. Keep the version that scores better on held-out requests, not on the ones you tuned against.
5. Stop after 5 rounds. If it still misses, the problem is the name, a competing skill, or requests too simple to load any skill.
