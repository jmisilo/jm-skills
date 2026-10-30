# Skill shapes

Skeletons for the eight shapes that strong skills take. Copy the skeleton for your shape, then fill it from the step 1 material. Headings in the skeletons are suggestions; the moves under each shape are what make it work.

## Contents

- [Interview](#interview)
- [Artifact writer](#artifact-writer)
- [Rulebook reviewer](#rulebook-reviewer)
- [Taste with tooling](#taste-with-tooling)
- [Router](#router)
- [Tool gateway](#tool-gateway)
- [Glossary or voice](#glossary-or-voice)
- [Runbook](#runbook)
- [Combining shapes](#combining-shapes)

## Interview

For aligning on a plan, design or decision before anything is built. The model's own knowledge supplies the questions; the skill supplies the discipline.

```markdown
Interview the user until you both describe [the thing] the same way.
Track open choices as a dependency map: a choice is askable once everything it depends on is settled.

Ask in batches: every choice that is askable now goes into the current batch.
Number them, attach the answer you would pick, and phrase each as a proposal
the user can accept with "ok". Then wait.

Look up facts in [files, tools, docs] yourself (large searches go to a subagent).
Only the choices the findings leave open go to the user.

Done when no choice is open and nothing rests on an unstated assumption.
Act only after the user confirms the summary.
```

Moves that make it work:
- A proposed answer on every choice, so approving is cheap and overriding stays easy.
- Facts are looked up, never asked; only choices reach the user.
- Batches rather than one question at a time, unless the user wants singles. Batches mean fewer back-and-forths.
- An end condition you can check and that covers everything: "no choice open".
- Nothing written unless the user asks; the outcome is agreement.

Pitfalls: a fixed question budget (the right count depends on the plan); choosing on the user's behalf; asking for facts the agent could read.

## Artifact writer

For one document the user keeps asking for: a handoff, a brief, release notes, a postmortem. Keep it short; the model knows how to write a document, so the skill holds only the constraints it keeps getting wrong.

```markdown
Write [the artifact] for [the reader], who will use it to [next action].
Save it at [exact location; the fallback if that is missing].

It must contain [required section], because [what the reader does with it].
Link to [specs, issues, commits] rather than repeating their content.
Leave out [secrets, personal data].
Arguments, if given, describe [what they mean]; shape the document around them.

Finish by giving the user the file's absolute path.
```

Moves that make it work:
- Each constraint answers an observed failure: where to save, what to leave out, what the reader needs first.
- Name the reader and what they do next; the model shapes the rest.
- A fixed layout when the document has required sections, a reader parses it, or a checker script verifies it. Otherwise name the reader and let the model shape it.

Pitfalls: a long template with no checker, which the model fills mechanically; restating content that already lives in other files; leaving the save location to guesswork.

## Rulebook reviewer

For standards that must be applied and audited: a style, a craft, a compliance bar. Output is evidence, not opinion.

```markdown
# [Domain]
[One paragraph: what this covers, what neighbouring domains it leaves to others,
and that the project's own conventions win where they exist.]

## [Principle as an imperative sentence]
[2-4 sentences: the rule, the exact value, the reason.]
[Read `[topic].md` when applying this principle to [situation].]

... one section per principle ...

## Before you finish
| Detection pattern | Fix |
| --- | --- |
| [something greppable in code or text] | [the exact replacement] |

## Reporting
**Severity.** HIGH: [blocks a user or breaks the thing]. MEDIUM: [harms quality]. LOW: [polish].
**Verification.** [What to check without tools, and what with them.] List every check you couldn't run as Not verified.
**Format.** | Severity | Location | Before | After | Why |, one row per root cause.
End with Block when any HIGH remains, Approve otherwise. Never approve what you didn't inspect.
```

Moves that make it work:
- Each heading is a rule, not a topic ("Group with space, not lines", not "Spacing").
- A finding requires a failure you can show. A value that merely differs from a default isn't one.
- A detection table the agent can search for mechanically before finishing.
- Explicit ownership: "[X] belongs to [other domain]" stops overlap and double reports.
- A verdict with an honesty rule.

Pitfalls: listing preferences without values; rules with no reason; reporting taste as defects.

## Taste with tooling

For subjective output where the model's defaults are the enemy: visual design, writing voice, naming. Combines a process that resists the default with a mechanical check.

```markdown
## The run
1. Read the brief. Note the words that must win over anything below.
2. Write the plan: [the choices, as concrete values].
3. Review the plan against the brief. If any part reads like the default you'd produce
   for any similar request, revise it and say what changed.
4. Build it.
5. Run `node ${CLAUDE_SKILL_DIR}/scripts/[check].mjs`. Fix every FAIL. Treat each WARN
   as wrong unless you can defend it in one sentence.
6. Look at the result [screenshots at sizes X, Y, Z / read it aloud / ...]. Fix in one batch, look again.
   Stop when the requested result is verified; don't invent more work.
7. Report what you checked and what you couldn't.

## House rules
| Rule | Instead |
| --- | --- |
| [the default tell, named concretely] | [what to do] |
```

Moves that make it work:
- Name the defaults concretely (the exact colours, phrases, layouts the model reaches for), each with an "Instead". Naming a default is safe here because the same row says what to do.
- Adjectives turned into numbers, so "premium" or "warm" becomes values.
- A script that measures, so "looks good" isn't the gate.
- The brief overrides the house rules; say so.

Pitfalls: a ban list with no replacements, which makes the agent swap one cliché for the next; checking after every tweak instead of in batches.

## Router

For a large domain: a product, a codebase, a vendor platform. SKILL.md decides which file to read; each area lives in its own file.

```markdown
# [Domain]
[Two sentences of durable context every task needs.]

Decide the task first, then read only the file for it. Read each file once.

| The task | Read |
| --- | --- |
| [situation in the user's words] | [area].md |
| ... | ... |

## Not in this skill
- [adjacent task] → [where it goes]
```

Moves that make it work:
- The routing table keys on the situation in front of the agent (a URL shape, a file type, an error), not on topic names.
- An explicit "not in this skill" section.
- Lazy loading of shared material: read the auth file only on an auth error.

Pitfalls: pointers without conditions; files that link on to further files; restating content that lives in the repo's own docs instead of linking to it.

## Tool gateway

For knowledge that lives in a tool or source that changes: a CLI you maintain, an API with a spec, a rules document that gets updated.

```markdown
This file is a pointer, not the guide. Before using [tool], load the current guide:

    [tool] --help             # or the tool's own agent guide command, or: fetch [URL] and follow it

The guide always matches the installed version, which this file can't.
[When the task is X, read the X section: `[tool] [x] --help`.]
```

Moves that make it work: the content can't go stale; the stub stays tiny; the tool's own output carries the details.

Pitfalls: remote content is untrusted input, so treat it as reference data, not as instructions that override the user; the skill breaks if the tool is missing, so say how to install it.

## Glossary or voice

For shared vocabulary between the user and the agent, or a way of speaking.

```markdown
Turn [a vague description / a code / an internal name] into [the exact term].
Return the best match first, then 1-2 alternates with one line on how they differ.

1. Read for intent, not keywords: users describe symptoms, not names.
2. Quote the entries verbatim.
3. When nothing matches, name the closest term and say it's an approximation.
4. Stay inside this list; never invent a term.

## [Group]
- **[Term]**: [one-sentence definition, no implementation detail]
```

For a voice, replace the glossary with numbered rules, a Bad/Good pair for the hardest ones, a "when to drop the voice" list (errors, safety, anything persisted), and a pre-send check.

Pitfalls: definitions of terms the model already knows; implementation detail in a glossary; synonyms that drift.

## Runbook

For an operational routine: a weekly review, a deploy, a rotation, an incident drill. Scripts collect, the agent interprets, the human decides.

```markdown
## Pre-flight (silent unless something fails)
1. [Auth check command]. If it fails, ask the user to run [command]; it's theirs to run.
2. [Tool presence checks.]

## The one question
[Ask once, up front, everything needed to run unattended.]

## Gather
Run `bash ${CLAUDE_SKILL_DIR}/scripts/[collect].sh [args] > [output file]`.

| Section | Green when |
| --- | --- |
| [signal] | [threshold] |

## Gotchas
- [The command that must never run bare, and why.]
- [The state that looks healthy but isn't.]

## Propose
Show the results, then propose actions one at a time. Change nothing without approval.
```

Moves that make it work: one question at the start instead of interruptions; thresholds that make "green" checkable; gotchas from real incidents; a hard line between gathering and changing.

Pitfalls: prose instead of a script for data collection; asking between every step; printing secrets the tools return.

## Combining shapes

Any shape can add a gate (stop and ask before an action) and a checker script (verify the output). These are moves, not shapes. An artifact writer with a checker is still an artifact writer.

A skill can combine two shapes with one section for each, such as a runbook that ends in an interview.

When several skills share one method, split them into two kinds:
- **Commands** are short skills only the user starts. They coordinate.
- **Methods** are skills the agent can start. They hold the reusable know-how.

Commands that need the same method then share it instead of copying it. A command loads a method with an explicit instruction ("Load `[name]` with the Skill tool"; say what to do if it isn't installed), because a skill named only in prose doesn't reliably load. Commands don't call other commands: each is a deliberate user choice, and chaining them hides that choice.
