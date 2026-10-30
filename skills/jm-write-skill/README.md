# jm-write-skill

Writes, reviews and debugs agent skills. Agents load `SKILL.md` and the reference files it points to; this README is for people.

## Credits

The ideas here were built from published guidance and from studying public skills, then rewritten and tested independently:

- Anthropic: Agent Skills docs, skill authoring best practices, and the `skill-creator` skill (trigger evals, progressive disclosure).
- The Agent Skills open specification at agentskills.io (frontmatter rules, gotchas sections).
- Emil Kowalski's skill-writing guide (encoding process rather than output, reasons with rules, firm wording).
- Matt Pocock's skills (mattpocock/skills, MIT): batched decision interviews with proposed answers, and splitting user-started commands from reusable methods.
- Jesse Vincent's superpowers (obra/superpowers, MIT): keeping the workflow out of the description, and testing a skill against a baseline.
- SkillsBench and Vercel's AGENTS.md-vs-skills eval, for the evidence behind baseline-first testing.

The linter, the trigger-eval script, the shapes and the diagnosis table are original to this skill.
