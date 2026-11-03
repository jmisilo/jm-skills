# Changelog

Why each part of this skill exists. Agents don't load this file.

## 2026-11-03

Initial version, built with `jm-write-skill` and `jm-complex-workflow`.

Source material: the user's request and five references.
- The interfaces.dev explain figure: mono text, terminal prompt line, timeline grid, ASCII boxes and trees.
- A spring figure: a tag line, values in the accent, chart conventions and a readout footer.
- oxide.computer: mono caps labels, 1px hairlines, one accent, `FIG. n` tags, unit grids and layer stacks.
- skills.wheresryan.sh/anatomy: one size with hierarchy from grey and weight, a section head with a rule and an index, numbered steps with bold lead-ins, `dl` rows.
- Linear's loops article: a narrow measure with figures breaking out, and a section shaped as a claim followed by a case.

User decisions:
- One HTML file plus a `--md` chat mode.
- Light paper only.
- Sans prose with mono labels.
- Only the user starts it.

Baseline: Opus at high effort, no skill, three synthetic tasks (DNS, keyboard switch, card payment). The pages were competent, so the skill exists for consistency, the user's look and the narrative contract. Observed failures and the lines that answer them:
- F1 Cream paper with a rust accent → the fixed `:root` tokens, which the checker compares exactly; house rules row 1.
- F2 Accent on numerals, headings and callout bars → the accent hooks `.subj`/`[data-subj]`/`.val`; a checker WARN; house rules row 2.
- F3 Figures in filled cards → the checker FAILs on figure background or border; house rules row 3.
- F4 Left-border callouts → the checker FAILs on `blockquote`/`aside` and thick left borders; house rules row 4.
- F5 Only hand-placed SVG → the ASCII, timeline and table kinds in figures.md; house rules row 9.
- F6 Overlapping lines and labels left in → the probe and steps 6 and 7.
- F7 No problem definition → the `problem` part with its overview figure; writing rule 1.
- F8 Too long, with side topics → scope in step 1; the 4 to 7 step and 2,500 word WARNs; house rules row 10.
- F9 No sources, and inferred claims not marked → the evidence list in step 2; `.inferred`; the checker FAILs on refs and sources.
- F10 TL;DR box and a glossary at the end → the primer part; house rules rows 5 and 6.
- F11 Several hues as category tags → one accent; house rules row 7.

Plan review: 3 rounds with a product designer, an engineer and a product manager.
- The designer pinned tokens, type and chart conventions, the `panel` kind, non-scaling strokes and the `bigText`/`smallText` probe gates.
- The engineer made the probe and checker runnable without false FAILs: the IIFE probe, measuring font size × CTM, the exact token-set check, figure body rules and the `svg.ah` exemption.
- The PM asked for Codex support, the overview figure, the newcomer check, examples and a process-domain test.
