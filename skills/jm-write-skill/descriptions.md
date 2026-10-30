# Names, descriptions and frontmatter

## Contents

- [How loading works](#how-loading-works)
- [Anatomy of a description](#anatomy-of-a-description)
- [Examples](#examples)
- [Frontmatter fields](#frontmatter-fields)
- [Checking the YAML](#checking-the-yaml)

## How loading works

The agent sees a listing of installed skills: each name with its description. Skills only the user can start stay out of it. The agent loads a skill when the request matches and it believes the skill adds something it can't do alone. Consequences:
- The name is part of the trigger. In one small test, a skill named `zebra-facts` with the description "Facts." still loaded for zebra questions. A vague name such as `helper` gives a good description nothing to lean on.
- Simple, one-step requests rarely load any skill, however good the description.
- In Claude Code, all descriptions share a listing budget of about 1% of the context window. When it overflows, the least-used skills lose their descriptions and keep only their names. Each entry is cut at 1,536 characters (description plus `when_to_use`). Users can raise the budget (`skillListingBudgetFraction`) or list low-priority skills by name only (`skillOverrides`), but a short description is the fix that travels.
- Near-duplicate skills split the trigger between them. One skill per job.

## Anatomy of a description

```
Use when [the most common situation, in the user's words]
[, or when (second situation)]. Covers [the scope, in one clause, to tell it from neighbours].
[Not for (adjacent task).] [Also for "(phrase)", "(phrase)".]
```

- Third person, starting with "Use when". The description is injected into the agent's context, where "I can help you" reads as the agent talking about itself.
- Situations and user vocabulary over feature lists. Include words in every language the user writes in.
- No workflow. The steps live in the body; a summary here becomes a shortcut the agent takes instead.
- Square brackets for placeholders: Claude Code shows `<x>` as `&lt;x&gt;`.
- 150-500 characters for skills the agent starts. One line for user-started skills.
- Double quotes around the whole value when it contains ": " or " #".

## Examples

Weak: `Helps with database stuff.`
Strong: `Use when writing or reviewing a database migration (SQL files, ORM migration classes, schema changes) or when a migration failed or locked a table. Covers zero-downtime patterns, backfills and rollback plans. Not for query performance tuning.`

Weak: `This skill first gathers the commits, then groups them by type, then writes release notes in Markdown.` (a workflow summary)
Strong: `Use when the user asks for release notes, a changelog entry or a "what shipped" summary for a version, tag or date range. Covers grouping changes for end users and flagging breaking changes.`

Weak: `I can review your Python code for style.` (first person, vague)
Strong: `Use when reviewing or writing Python in this repository, including "is this idiomatic", type-hint questions and lint failures. Covers the team's conventions that ruff can't check.`

User-started: `Weekly cost and uptime review for the platform.` with `disable-model-invocation: true`.

## Frontmatter fields

Portable across agents (the open Agent Skills format):

| Field | Use |
| --- | --- |
| `name` | Required. Lowercase, digits, hyphens, max 64, same as the folder |
| `description` | Required. Max 1,024 characters |
| `license`, `compatibility`, `metadata` | Informational. Put versions and authors under `metadata` |

Claude Code adds:

| Field | Use it when |
| --- | --- |
| `disable-model-invocation: true` | Only the user may start it: side effects, cost, deliberate workflows |
| `user-invocable: false` | Only the agent may start it: background knowledge, hidden from the `/` menu |
| `when_to_use` | Extra trigger phrases; appended to the description and counted in the 1,536 cap |
| `argument-hint` | The user passes arguments, as in `[issue-number]`. Read them in the body with `$ARGUMENTS`, `$0`, `$1` |
| `allowed-tools` | The skill runs specific commands without prompting, as in `Bash(node *)` |
| `disallowed-tools` | The skill must never call certain tools while active |
| `paths` | The skill only applies to matching files, as in `**/*.sql` |
| `hooks` | A rule must hold every time while the skill is active; the hook enforces it |
| `context: fork` (+ `agent`) | The skill should run in a subagent with a clean context |
| `model`, `effort` | The skill needs a specific model or effort level |

`${CLAUDE_SKILL_DIR}` in the body expands to the skill's folder in Claude Code. Other agents may leave it as text, so say once in the body which folder it means.

Codex reads `agents/openai.yaml` next to SKILL.md. For a user-started skill there, set:

```yaml
interface:
  display_name: "Release notes"
policy:
  allow_implicit_invocation: false
```

## Checking the YAML

Unknown fields are ignored without an error. YAML that doesn't parse loads the skill with no metadata at all, so it never triggers. The bundled linter catches the common causes: an unquoted ": ", an unclosed quote, tabs, and a ` #` that turns the rest of the line into a comment. For a real parse in Claude Code, run `claude plugin validate <skills-folder>`, or start a session with `--debug` and read the parse errors.
