# Changelog

Why each part of this skill exists. Agents don't load this file.

## 2026-10-30

- Initial version. Source material: the structure of the most-installed public skills, official authoring guidance, the open Agent Skills spec and published skill evals. No failure log yet, so the first lines trace to that material, not to observed failures.
- Step 1 baseline-first: SkillsBench (arXiv 2602.12670) measured self-generated skills at about -1.3 points and curated ones at about +16.
- Step 3 container tree: Claude Code docs say rules that must always hold belong in hooks; compaction keeps only the first 5,000 tokens of a skill.
- Step 5 "never summarise the workflow": observed in practice; agents follow the summary and skip the body.
- Step 5 "the name is part of the trigger": in testing, a skill named `zebra-facts` with the description "Facts." still loaded on 2 of 2 zebra questions.
- Trigger test: headless `claude -p` stream-json reports a `Skill` tool call; a vocabulary question the model could answer alone loaded no skill, which is why test requests must be substantive.

## 2026-10-30 (after the first test round)

Behaviour test: a postmortem skill written with and without this skill (Sonnet, one task each).
- Without it: an assumed time zone, an invented severity policy and no failure test.
- With it: 14 written decisions, and a baseline that reproduced 3 of the 5 known failures, all fixed.
- Friction reported by the with-skill agent led to: a reduced-budget path (testing.md), the "no real material" rule (step 1), unattended-run handling (step 2), how to expose a draft to a test subagent, and "gate and checker are moves, not shapes".

Fresh review (Sonnet):
- Lint now catches YAML that real parsers reject: an unquoted ": ", an unclosed quote, tabs, a " #" comment and duplicate keys.
- Lint no longer checks links inside code, and it counts prose pointers ("Read `x.md` when").
- Lint no longer flags "currently", trigger phrases in descriptions, or table rows.
- trigger-eval excludes errored sessions, marks a run INVALID when over 20% error, labels its cost as partial, and tests installed skills through a "-trial" copy with skillOverrides.
- Prose fixes: the listing-budget claim (least-used skills lose descriptions, not long ones), 150-500 characters, the 5,000-token compaction cut instead of "150 lines", read-once wording, degrees of freedom, Codex `openai.yaml`, gates and Not-verified made conditional, and more "never loads" causes.

Trigger test of this skill: 14 requests x 2 runs. No near-miss loaded it. Three should-load requests missed in the first round; all 9 reruns loaded it, so the first misses were noise.

## 2026-10-30 (rename and final trigger test)

- Renamed to `jm-write-skill` at the user's request. Measured effect: under the old name `writing-skills`, the "skill, eslint rule or CLAUDE.md?" and "my SKILL.md never gets picked up" requests loaded the skill; under `jm-write-skill` they loaded it 0/3 each, because the agent handled them alone. The name is part of the trigger.
- Tried a description with "Not for writing CLAUDE.md, system prompts or docs": it pushed the "skill vs lint vs CLAUDE.md" question away. Reverted to the original description.
- Found that `-trial` copies change triggering (one request went 3/3 to 0/3), so testing.md now says to compare descriptions only through `--description` on both arms.
- Added `--hide` to trigger-eval. With `emil-writing-skills` hidden, "review the skill I wrote" went from 0/3 to 3/3: that miss is competition from a near-duplicate skill, not the description.
- Final run (15 requests x 3): near-misses 7/7 stay out, including CLAUDE.md, system prompt, blog post about skills and runbook docs. Should-load 5/8, including the Polish request 3/3.

## 2026-10-30 (original wording)

- The user worried the skill read too close to Emil Kowalski's skill-writing guide. A 4-word-sequence comparison found 17 shared phrases with it (one near-verbatim sentence), 12 with Matt Pocock's grilling skill and 4 with obra's superpowers writing-skills.
- Rewrote every flagged passage in original wording: the intro, step 2, the step 3 tree (now ordered questions), two step 5 bullets, the step 6 bullets, the step 7 opener, a Diagnose row, the interview, artifact and combining sections of shapes.md, three testing.md lines and one lint message. Steps, rules, tables and scripts are unchanged.
- After: 2 shared 4-word phrases with Emil's guide (both generic), and only generic ones with the others. Added README.md with credits for the ideas, outside what agents load.
- Blind A/B (same brief, Sonnet, old vs new text, judged by a third agent that didn't know which was which): new 4-4.5 vs old 3.5-4 per criterion, judged "modestly better, ~65% confidence, mostly run-to-run variation". Same steps followed in both. The new run left 2 decisions without a proposed answer, so step 2 now says every choice gets one.

## 2026-10-31 (review fixes)

- Step 2: the batch rule was inverted ("every open choice that no other open choice depends on" picks the leaves, so dependent questions came first). Now: "every open choice that doesn't depend on another open choice". Matches shapes.md.
- Intro: "should fix is the route" read as "repair"; now "pin down".
- Step 2: "the user only gets choices" read as limiting the user; now "what remains goes to the user as choices".
- Step 6: dropped the opener "Hold every line to one test", which repeated the "Cut what the model already knows" bullet. The lead-in is now "Rules for the body:", parallel to "Rules for the files:".
- Credit stays in README.md (agents don't load it), not in SKILL.md, so it costs no context.
