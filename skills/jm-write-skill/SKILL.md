---
name: jm-write-skill
description: Use when the user wants to create, write, rewrite, review or debug an agent skill (a folder with a SKILL.md) on any topic, or turn know-how, conventions, a repeated workflow, a runbook or recurring corrections into one. Also use when a skill never loads, loads for the wrong requests or gets ignored, and to decide whether something belongs in a skill, a hook, a lint rule or an instructions file. Covers "make this a skill", "skill for X", "why isn't my skill used".
---

# Writing skills

A skill is a folder an agent loads when its name and description match the task. It loads in three layers. The name and description sit in the agent's skill listing (unless only the user can start the skill). The SKILL.md body loads when the skill fires, once, and is not re-read on later turns. Other files load only when the body sends the agent to them.

Skills fail in two ways: they never load, or they load and change nothing. Every step below targets one of the two. What a skill should pin down is the route: the same checks, in the same order, on every run. The result still adapts to the task in front of it.

`${CLAUDE_SKILL_DIR}` below is this skill's folder. If it appears unexpanded, use the folder this SKILL.md is in. Draft new skills in a scratch folder and install them in step 8.

## Pick the mode

| The user wants | Do this |
| --- | --- |
| A new skill | Run steps 1 to 8 in order |
| To improve an existing skill | Read it whole, lint it (step 7), rerun a realistic task to see what still fails, then change only lines tied to a failure. Reopen step 2 only for decisions the change touches |
| A skill that never loads or loads at the wrong time | Step 5, then the trigger test in step 7 |
| A skill that loads but gets ignored or misapplied | [Diagnose](#diagnose) |

## 1. Collect failures and source material

Before writing anything, see what goes wrong without the skill. Give 2 or 3 realistic tasks from the topic to a fresh subagent that can't see the skill, and record what it gets wrong, word for word. Without subagents, ask the user to run the tasks in a fresh session or to paste a transcript where it went wrong. If neither is possible, list step 1 as Not verified.

Skills written from the model's general knowledge come out generic and test no better than no skill. Skills built from observed failures and real expertise test clearly better. If the baseline already does the task well, tell the user and ask whether to continue; a skill that encodes their preferences or conventions can still be worth it.

Then gather the material the skill will be built from: the user's corrections and stated preferences, runbooks, incident notes, review comments, style guides, docs, scripts they already run, output they liked. Every line of the finished skill traces back to a recorded failure or to this material.

If no real material exists, ask the user for one real example (a transcript, a document they liked, a past mistake) before inventing one. A baseline built on an invented task is synthetic; say so in the report and replace it with a real case when one appears.

## 2. Settle the decisions with the user

Separate what you can look up from what only the user can choose. Anything that lives in files, docs or tools you find yourself, handing a large search to a fresh-context subagent; what remains goes to the user as choices.

Put the choices to the user in batches. A batch holds every open choice that doesn't depend on another open choice; dependent ones wait for a later batch. Number each choice, attach the answer you would pick (every choice gets one, including those you are unsure of), and phrase it as a proposal the user can accept with a plain "ok".

Settle at least:
- Which requests should load it, in the user's own words, and which near-misses must not.
- Whether the agent may start it on its own, or only the user (step 5).
- Where it lives: personal, for every project, or inside one repository.
- What finished looks like: the artifact, verdict or state that ends the task.
- What it must never do without asking: irreversible, outward-facing or costly actions.
- Which tools, scripts, files and services it may use.

Stop when no choice is left open or resting on an assumption. Play the settled decisions back as a short list and wait for the user to confirm before writing. When no one can answer (a delegated or unattended run), take your recommended answers and list each question with its chosen answer in the report as unconfirmed.

## 3. Decide what belongs in the skill

Take every rule you collected through these questions in order, and stop at the first yes:

1. Must it hold every single time, and can a program check it? → A lint rule, formatter, test or hook. A skill can fall out of context; tooling can't.
2. Does every task in this project need it? → One line in the always-loaded instructions file (CLAUDE.md, AGENTS.md).
3. Is it needed again, for some tasks, and does it take procedure, knowledge or judgment? → The skill.
4. None of these → Leave it out and just do the task.

Most topics split. Mechanical rules go to tooling and judgment goes to the skill, which names the tooling it relies on.

## 4. Pick the shape

| Shape | Use when |
| --- | --- |
| Interview | The work is aligning on decisions before anything gets built |
| Artifact writer | The user keeps asking for one kind of document in one form |
| Rulebook reviewer | Standards must be applied and audited with evidence |
| Taste with tooling | Subjective output where the model's defaults are the problem |
| Router | A large domain that would flood the context if loaded at once |
| Tool gateway | The knowledge lives in a CLI, API or document that changes |
| Glossary or voice | Shared vocabulary, or a way of speaking |
| Runbook | An operational routine full of environment traps |

Once you've picked a shape, read [shapes.md](shapes.md) for its skeleton and pitfalls. Any shape can add a gate and a checker script, and a skill can combine two shapes with one section for each.

## 5. Write the name and the trigger

Decide who starts the skill:
- **The agent and the user** (the default) when it holds knowledge or a discipline that should apply whenever the task matches.
- **Only the user** when it has side effects (deploying, sending, publishing, deleting), costs real time or money, or is a workflow the user wants to choose deliberately. In Claude Code set `disable-model-invocation: true`; descriptions.md has the equivalent for other agents. Write the description as a one-line reminder for the human.

When the agent can start it, the name and description are all it sees while deciding. Write the description like this:
- Lead with the most common trigger: "Use when ...". Name the situations and the words the user actually types, in every language they use.
- Add one clause on what it covers, so the agent can tell it apart from neighbours. Add "Not for ..." when an adjacent task exists.
- Keep the steps out of it. Given a step list in the description, agents tend to act on that list and never open the body.
- Err toward loading. Agents load skills less often than they should, most of all for tasks they believe they can handle without help.
- Aim for 150-500 characters; 1,024 is the hard limit. All descriptions share one listing budget, and when it overflows the least-used skills lose their descriptions and keep only their names.
- Wrap the description in double quotes if it contains ": " or " #", or the YAML breaks or gets cut.

The name is part of the trigger, because the agent reads it next to the description. Use lowercase letters, digits and hyphens, at most 64 characters, the same as the folder. Name the job (`reviewing-migrations`, `release-notes`), never a vague noun (`helper`, `utils`).

Read [descriptions.md](descriptions.md) when writing or repairing a description, or setting any other frontmatter field.

## 6. Write the body

Order the body as process, rules, gotchas, then pointers to reference files. Put what matters most near the top: after a long session is compacted, Claude Code keeps only the first 5,000 tokens of a loaded skill.

Rules for the body:
- **A finish line.** Lay out steps the agent repeats identically each time, and close on something it can verify: "no FAIL left", "every question answered", "the user confirmed". A finish like "until it looks good" lets the agent stop whenever it likes.
- **Measurable limits.** Swap qualities for figures, as in "fast" becoming "p95 under 200 ms" or "brief" becoming "three sentences at most". An adjective left in is a choice the model makes from habit.
- **The purpose, in one clause,** for any rule a newcomer might question. Knowing what a rule is for lets the agent handle situations the skill never mentions; without it, the agent applies the rule mechanically, misfits included.
- **Wording for the whole task.** The body is read once, so write "run the tests after every edit", not "run the tests".
- **Tight where it breaks, loose where it's judgment.** Fragile, order-dependent steps get exact commands and "run exactly this". Judgment work gets principles and what they protect.
- **Describe the behaviour you want.** Spelling out an unwanted pattern puts it in front of the model. Keep bans for hard limits, and give each one its replacement, such as a "Rule | Instead" row.
- **Firm wording.** Absolute terms and exact figures leave no room to drift. Softeners such as "ideally", "if needed" or "when possible" hand the decision back to the model. Save capitals for the one or two rules where a miss is costly.
- **Cut what the model already knows.** For each line, ask whether the agent would get this wrong without it. If not, delete it.
- **Fixed vocabulary.** Define each domain term once and use exactly that word every time, because the agent reads synonyms as different things.
- **Gotchas.** Keep a short section of facts that contradict what a capable newcomer would assume. "The Linear issue's open time is when someone noticed, not when the incident began" is a gotcha; "be careful with times" is not. Grow it every time you correct the agent.
- **Precedence and scope.** Say what overrides the skill (the project's own conventions, the user's explicit request) and which neighbouring tasks it doesn't cover.
- **Real examples.** One real wrong/right pair per rule that needs one; two or three real input/output pairs when the skill fixes an output format.
- **If the skill takes actions:** before anything irreversible or outward-facing, it stops and asks.
- **If the skill checks anything:** the agent lists every check it couldn't run as "Not verified" and never claims one it didn't run.

Rules for the files:
- Keep SKILL.md under 500 lines.
- Keep reference files one level deep from SKILL.md. Give each pointer the condition for reading it, such as "Read `errors.md` when the API returns a non-200", not "see errors.md". Without a condition, the agent reads everything up front or nothing at all.
- Start any reference file over 100 lines with a contents list.
- Put deterministic or fragile work in scripts: parsing, validation, data collection, anything that must be exact. Write them in a language already on the user's machine with no dependencies to install, and say whether to run or read each one. Call each through its interpreter (`node ${CLAUDE_SKILL_DIR}/scripts/[name].mjs`). Exit non-zero on failure and print errors that say how to fix the problem. Run each checker on one output that follows the skill and one that breaks it; a checker that rejects compliant output teaches the agent to ignore it.
- List what the skill needs installed (CLIs, packages, logins) and what to do when it's missing.
- Grant only the commands the skill runs, such as `allowed-tools: Bash(node *)`, never a bare `Bash`.
- Never copy data that changes, such as prices, versions or API lists. Point to the live source, or to a command that prints it.
- When the skill hands off to another skill, name it exactly and say how to open it (in Claude Code, "Load `[name]` with the Skill tool"), plus what to do if it isn't installed. A skill mentioned only in prose doesn't reliably load.

## 7. Test it

Until a skill has run on real tasks, whether it works is a guess. Read [testing.md](testing.md) before running the steps below.

1. **Lint.** Run `node ${CLAUDE_SKILL_DIR}/scripts/lint-skill.mjs <skill-folder>`. Fix every FAIL. Treat each WARN as wrong unless you can defend it in one sentence.
2. **Behaviour.** Rerun the step 1 tasks on fresh subagents, once with the skill and once without, on the model the user works with. Compare against the failures you recorded. Look at the steps the agent took as well as its output: where it hesitated, what it skipped, which files it opened for nothing.
3. **Triggering**, for skills the agent can start. Write 16 to 20 realistic requests, half that should load the skill and half near-misses, and run `node ${CLAUDE_SKILL_DIR}/scripts/trigger-eval.mjs`. It runs requests x runs headless sessions at up to $0.15 each. State that count and cost, and wait for the user's go-ahead.

The skill is done when:
- every recorded failure is fixed in the with-skill run;
- lint shows no FAIL;
- every should-load request loads it in most runs;
- every near-miss leaves it alone in most runs.

Report anything you couldn't run as Not verified.

## 8. Ship it and keep it honest

- Install it where step 2 decided: personal (`~/.claude/skills/<name>/`, or `~/.agents/skills/<name>/` for agents that read that path) or the repository's `.claude/skills/<name>/` or `.agents/skills/<name>/`.
- For a skill you expect to edit again, add a `CHANGELOG.md` next to SKILL.md with the date, the observed failure and the change. Agents don't load it; it tells future editors why each line exists. A line with no failure behind it is the first to cut.
- When you correct the agent on the same thing twice, add it to Gotchas and rerun the behaviour test.
- After a model upgrade, rerun the baseline. If the bare agent now passes a task, delete what taught it.

Report to the user: the path, the shape, who starts it, the test results with numbers, unconfirmed decisions, and anything Not verified.

## Diagnose

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Never loads | Description lacks the user's words, or a near-duplicate skill wins | Rewrite the trigger (step 5); remove or narrow the duplicate |
| Never loads, not even when named | Frontmatter doesn't parse (it loads with empty metadata), the name was refused, the folder isn't `skills/<name>/SKILL.md`, `paths` limits it, `disable-model-invocation` is set, or its description was dropped from an overfull listing | Lint, then in Claude Code ask "What skills are available?", run `/doctor`, or start with `--debug` |
| Never loads for simple requests | Agents skip skills for tasks they believe are trivial | Expected. Test with substantive requests, or make it user-started |
| Loads for the wrong requests | Name or description too broad | Add "Not for ...", narrow the name and the situations, or make it user-started |
| Loads, then gets ignored | The key rule is buried, hedged, or contradicted by a summary in the description | Move it to the top, make it strict, delete the summary |
| Applies a rule in the wrong places | Nothing says what the rule is for | Add its purpose in one clause |
| Output is generic | Written from general knowledge | Rebuild from step 1 material: real examples, numbers, gotchas |
| Followed at first, forgotten later | A rule that must hold every time, or wording that only covers the first step | Move it to a hook or lint rule (step 3), or word it for the whole task |
| Reads every reference file up front | Pointers without conditions | Give each pointer its "Read X when Y" |
| Stops too early | No checkable end | Add a stop condition |
