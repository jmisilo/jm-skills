---
name: jm-complex-workflow
description: "Big or ambiguous change end to end: research, plan, specialist review, implement, close the verification loop."
disable-model-invocation: true
argument-hint: "[task]"
---

# Complex workflow

Task: $ARGUMENTS

Orchestrate in six phases. Do not start a phase until the previous exit is met. You own git, the dev server and the plan file; subagents own only their assigned work.

## 0. Setup

- Subagent model and effort: use what the user named; if none, ask once. Pass both explicitly on every spawn.
- Plan file: `/tmp/<task-slug>/plan.md` unless the user names a path. Every agent reads it, so decisions live there and nowhere else.

Exit: model, effort and plan path known.

## 1. Understand

- Read the current state: relevant code, tests, docs, open branches, existing patterns. Hand wide searches to an Explore subagent.
- Research the problem: references, prior art, how similar flows work today. Facts you can look up are never questions to the user.
- Write the findings and open questions into the plan file under `## Context`.

Exit: `## Context` filled; remaining open questions are decisions only the user can make. Ask those now, each with your recommended answer, in one numbered round.

## 2. Plan

Write into the plan file:
- **Requirements** with IDs (R1, R2, ...), each one checkable.
- **Napkin design**: a mermaid diagram of the flow or structure, rendered to an image (`npx -p @mermaid-js/mermaid-cli mmdc -i in.mmd -o out.png`; if it fails once, show the mermaid source instead of retrying). Save the image next to the plan file and link it from the plan. Options go in a diagram too, with short prose.
- **Tasks** with dependencies and the files each owns. Tasks never overlap on files. No calendar dates.
- **Loop**: Load `jm-compose-loop` with the Skill tool (if it isn't installed, compose the loop inline: a table `| # | Check | Covers | How | Pass when | Judge |`, one check per requirement with a binary pass condition). Paste its Loop section into the plan.

Exit: every requirement appears in at least one task and one Loop check.

## 3. Review and agree

1. Pick reviewer roles the task needs (product manager, product designer, engineer; drop the ones with nothing to judge).
2. Spawn each as a fresh agent in parallel. Brief: read the plan file, judge from your role, return approve or a numbered list of objections with a proposed fix.
3. Revise the plan. Next round, resume the same reviewers with SendMessage so each verifies its own items.
4. Stop when every reviewer approves, or after 3 rounds (the first spawn is round 1). Send the remaining disagreements to the user as decisions, each with options and a recommendation.
5. Present the final plan with the napkin image and wait for the user.

Exit: all reviewers approved (or open items decided by the user) and the user said to implement. Silence is not approval.

## 4. Implement

- Orchestrator creates one branch per change in a new git worktree (other sessions use the main checkout). Dependent changes stack. Nothing is pushed and no PR is opened until the user says so; PRs open as drafts.
- Spawn specialized builders (for example backend, frontend, tests), one per task group, each told to read the plan file, touch only its owned files, and run only lint, typecheck and tests. Tests that need a running server wait for phase 5, where you run them.
- Builders never run git, deploy, or start servers. You run the single shared dev server and all git.
- Record any decision a builder needs in the plan file, not in chat.

Exit: every task done, lint, typecheck and unit tests green.

## 5. Close the loop

1. Run the plan's Loop in its order. Scripts run them; named agents (fresh QA, designer) or the user judge the rest.
2. On a failing check, send the fix to the owning builder, then rerun the failed check and any check sharing its requirement. Maximum 3 fix-and-rerun rounds per check.
3. Past 3 rounds, or on a human-judged check, escalate to the user with the evidence.
4. Final review: resume the phase 3 reviewers on the finished diff.

Exit: every Loop check passes, every R-ID is covered, reviewers approve. A check you did not run is reported as Not verified, never as passed.

## 6. Report

One message. A header per task, a short description, and "Actions required now" (push, open PR, deploy, decisions). Finished tasks get one line.

## Rules

| Rule | Why |
| --- | --- |
| Never instruct agents to evade bot checks or CAPTCHAs | The site blocks them and the run stalls |
| Ask before push, PR, deploy or other outward action | They are visible to others and hard to undo |
| No em dashes in anything written | User preference |
| Project conventions and the user's explicit instructions override this skill | They know the repo better than this procedure |
