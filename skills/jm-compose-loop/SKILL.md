---
name: jm-compose-loop
description: "Use when deciding how to prove work is done: 'what loop should I use', 'how do I verify this', 'what checks', a Loop section for a plan, or before implementing a feature, workflow remake, migration, API or bug fix. Composes the checks to run, fix against and rerun until they pass, matched to the kind of problem. Not for running a single test or reviewing finished code."
---

# Compose the loop

The loop is the set of checks you run after implementing, fix against, and rerun until each passes. Pick it before writing code, so "done" is evidence and not a feeling.

## Process

1. **Requirements.** Reuse the caller's R-IDs. With none, derive 3 to 8 one-line requirements (R1, R2...), each observable. Ask the user only when a requirement can't be made observable.
2. **Kind.** Name the problem kind. Mixed work takes the union of the rows below.
3. **Checks.** Take each kind's checks from the table, drop any that don't apply, and add one check per requirement no check covers.
4. **Fill the table.** Output exactly this section, ready to paste into a plan:

```
## Loop
| # | Check | Covers | How | Pass when | Judge |
```

- Covers: R-IDs. Every R-ID appears in at least one row.
- How: the exact command, tool or agent brief. Use commands the repo already has; read its scripts and config instead of guessing.
- Pass when: a binary condition plus the evidence it produces (exit 0, screenshot path, row counts, diff of traces).
- Judge: one of `script`, `agent` or `human`. Split a row that needs two.
- Size: 6 to 10 rows. Merge checks that share a How and a Judge, and drop checks that add no coverage the others lack.

5. **Run order and limits.** Under the table write the order (cheap and mechanical first, agent judgment next, human last), max 3 fix-and-rerun rounds per check, and what goes to the user.

## Problem kind to checks

| Kind | Checks |
| --- | --- |
| Pure logic | Unit tests written red first, seen failing for the right reason, then green. Vitest by default; Jest only if the repo already uses it; never `node:test`. Typecheck and lint. |
| Data or migration | Dry run on a copy, row counts before and after, spot-check sample rows, tested rollback. |
| API or integration | Contract or integration tests against the real boundary (real DB, real HTTP), not mocks of it. Staging smoke check after deploy; staging deploys run one at a time. |
| Workflow remake | Requirement trace (every R-ID has evidence). Conformance to the napkin design: walk each step and edge of the designed flow against the implementation and list mismatches. Seams: every neighbouring part that calls or is called by the flow. Integration or e2e over the whole path, failure branches included. |
| UI feature | Screenshots at every supported width vs the design. Interaction and animation review: slow motion or frame stepping, interruption mid-animation, reduced motion. QA walkthrough in a real browser (agent-browser CLI) or on the platform simulator, mobile included, with empty, error and loading states. Final review by a fresh agent. Human approval last. |
| Copy or content | Review against the voice rules, by an agent with the rules in hand; human for taste. |
| Performance | A measured budget (number, tool, input size) taken before and after. |
| Bug fix | A failing test that reproduces it first, then the full suite for regressions. |

## Rules

- **Mechanical before judgment.** Lint, typecheck and tests run as scripts. Agent reviewers judge fit against the design or spec. Humans judge taste and approve. Cheap checks fail fast, so they go first.
- **Human approval is a gate.** Never replace it with an agent verdict. Put it last, after every other check passes, with the evidence bundle (screenshots, recordings, trace).
- **Reviewer independence.** Give a judging agent the spec and the evidence, not your conclusions, so it can disagree.
- **One check, one failure mode.** A row that says "test everything" proves nothing; split it.
- **Never weaken a check to pass it.** Don't loosen assertions, delete tests, widen thresholds or skip steps. If a check is wrong, say so and get it changed explicitly.
- **Not verified.** A check that couldn't run (no device, no staging access, no browser) is reported as "Not verified" with the reason, never as passed.
- **Escalate to the user** when: 3 rounds fail on one check, two checks conflict, the spec is ambiguous, a check needs access or an outward-facing action (deploy, send, production data), or a human gate is reached.

## Gotchas

- Green tests only show the paths someone tested. For remakes the napkin-design walk finds missing edges that tests never cover.
- Screenshots at one width miss most layout bugs; list every supported width.
- A mocked boundary hides the exact bugs integration checks exist to catch.
- Reduced motion and interruption are skipped by default; they get their own rows.
