# jm-skills

Agent skills for Claude Code, Codex and other agents that read the Agent Skills format. Each skill lives in `skills/<name>/SKILL.md`, the layout `npx skills` (skills.sh) discovers.

| Skill | Started by | Use it for |
| --- | --- | --- |
| [jm-write-skill](skills/jm-write-skill/SKILL.md) | agent or `/jm-write-skill` | Writing, reviewing and debugging skills. Ships a linter and a trigger test |
| [jm-complex-workflow](skills/jm-complex-workflow/SKILL.md) | `/jm-complex-workflow <task>` only | Big or ambiguous changes: understand, plan, specialist review rounds, implement, close the loop |
| [jm-compose-loop](skills/jm-compose-loop/SKILL.md) | agent or `/jm-compose-loop` | Choosing the checks that prove work is done, as a Loop table for a plan |
| [jm-coding-styleguide](skills/jm-coding-styleguide/SKILL.md) | agent or `/jm-coding-styleguide` | TypeScript, React and Next.js conventions: control flow, `withX` wrappers, service classes, monorepo layout |
| [jm-explain](skills/jm-explain/SKILL.md) | `/jm-explain <topic>` or `$jm-explain <topic>` only | How something is built (software, system, hardware, process) as one mono-paper HTML page with figures; `--md` answers in chat |
| [jm-use-subagents](skills/jm-use-subagents/SKILL.md) | `/jm-use-subagents <model> [version] [effort]` only | Turns the session into orchestrator mode: research, implementation, testing, review, etc. go to subagents on the model and effort you name |

`jm-complex-workflow` loads `jm-compose-loop` while planning, so install both.

## Install

```bash
npx skills add jmisilo/jm-skills --list                              # what's inside
npx skills add jmisilo/jm-skills -g -a claude-code --skill '*'       # all, globally
npx skills add jmisilo/jm-skills --skill jm-write-skill               # one skill
```

From a local clone, pass its path instead of `jmisilo/jm-skills`.

### As a Claude Code plugin

The repo is also a plugin marketplace (`.claude-plugin/marketplace.json`) with one plugin, `jm-skills`, that bundles all six skills. Claude Code keeps it in sync with the repo:

```bash
/plugin install jm-skills --marketplace jmisilo/jm-skills   # Claude Code 2.1.275+
# or, in two steps
/plugin marketplace add jmisilo/jm-skills
/plugin install jm-skills@jm-skills
```

Pull new commits with `/plugin marketplace update jm-skills`. Plugin skills are namespaced, so they start as `/jm-skills:jm-explain`. When you add a skill, also list its folder under `skills` in the marketplace file.

## Writing or changing a skill

Use `jm-write-skill`, then lint before committing:

```bash
node skills/jm-write-skill/scripts/lint-skill.mjs skills/<name>
```

Keep each SKILL.md small: process first, rules with their reasons, gotchas, and reference files read on a condition.
