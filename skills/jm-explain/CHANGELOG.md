# Changelog

Why each part of this skill exists. Agents don't load this file.

## 2026-11-03, depth and motion

Observed failure: the user found the pages narrow and shallow ("explanations are quite narrow, and should be more in depth"). They want "good understanding without super specifics" for broad questions: GPUs, AI, cars, Stripe and Polar, dub.co, multi-channel messaging. Baselines with the old skill confirmed it. "how gpus work" came out at 1,396 words in 5 steps and followed a single frame; "how do link shorteners like dub.co work" came out at 1,066 words in 5 steps. In both, each step had one paragraph saying what happens, and nothing on why or on failure modes.

Changes:
- Scope: broad questions become a system tour (one step per major part); narrow ones follow one mechanism. Depth defaults to understanding: how, why and what breaks it, with no specs unless asked.
- Each step has 2 to 4 paragraphs (how, why, what breaks), 140 words at most each, and 1 or 2 figures.
- 5 to 8 steps and 2,000 to 4,000 words; the checker WARNs under 1,500 and over 4,500 and prints the word, step and figure counts.
- New step 7, the depth pass. The finish gains a going-deeper paragraph.
- New `motion` figure kind: it is reader-driven (prev, play, next), starts paused, and loops only after play is pressed. With JS off it shows a static frame plus the step list, and it handles reduced motion. A page has at most one interactive figure (panel or motion). The user chose a play button that may loop over steps-only. There are four checker rules and fixtures for it.
- `ascii-figure.mjs`: subject markers take one column each, because the shortener baseline lined up boxes by eye and three figures broke. It also warns when a label touches a box wall.
- Rules from the after-run reports:
  - A sourced-arithmetic number is not inferred.
  - A why that follows from facts already on the page needs no mark.
  - Textbook definitions cite a reference work.
  - The finish synthesis needs no refs.
  - Sources run 10 to 25.
  - `.fig-hint` is uppercased.
  - A new gotcha covers zsh variable splitting, eval scope, blank off-screen screenshots and locale-redirected pricing pages.
  - Sequence lane spacing is set for 2 to 5 lanes.
  - `data-at` accepts lists (`1,6`).
- Examples: the user chose "how gpus work" (hardware, with a motion figure) and "how payment platforms like stripe or polar.sh work" (a software system tour), replacing keyboard and card payment. Both were built by fresh agents from the new skill: 3,493 words with 8 steps and 10 figures, and 3,143 words with 8 steps and 9 figures. Both show 0 FAIL and 0 WARN, and the probe returned ok at 1280 and 390.

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
- F6 Overlapping lines and labels left in → the probe and the check and probe steps (now steps 7 and 8).
- F7 No problem definition → the `problem` part with its overview figure; writing rule 1.
- F8 Too long, with side topics → scope in step 1; the 4 to 7 step WARN and a word WARN (first 2,500, later 1,600); house rules row 10.
- F9 No sources, and inferred claims not marked → the evidence list in step 2; `.inferred`; the checker FAILs on refs and sources.
- F10 TL;DR box and a glossary at the end → the primer part; house rules rows 5 and 6.
- F11 Several hues as category tags → one accent; house rules row 7.

Plan review: 3 rounds with a product designer, an engineer and a product manager.
- The designer pinned tokens, type and chart conventions, the `panel` kind, non-scaling strokes and the `bigText`/`smallText` probe gates.
- The engineer made the probe and checker runnable without false FAILs: the IIFE probe, measuring font size × CTM, the exact token-set check, figure body rules and the `svg.ah` exemption.
- The PM asked for Codex support, the overview figure, the newcomer check, examples and a process-domain test.

## 2026-11-03 (after the behaviour tests)

Behaviour runs: three fresh Opus agents used the skill on DNS, keyboard switch and card payment, plus a `--md` run on git commits and a Linear sidebar question. Each page passed the checker and the probe. Judges then found the failures below, and each line answers one:
- **Pairwise visual review (L4).** The steps lead-in rendered grey because its selector missed the markup. A whole clause carried the accent. The uppercase chrome style turned `m·ẍ` into `M·Ẍ` and `IPv4` into `IPV4`. Fixed in the template and figures; Gotchas gained "identifiers keep their case".
- **Accent everywhere in prose.** Two pages put the accent on 7 to 9 values per page, and the template did the same. This led to the `accent-prose` checker WARN, the "one accent mark per section of prose" writing rule and a house-rules row. Agents kept wrapping numbers away from their units, which led to the `&nbsp;` rule.
- **explain-interface can't be loaded.** It is user-only, so an agent's Skill call is refused. Step 1 now carries its research rules inline and points the user to `/explain-interface`.
- **Repeated full-page capture.** At 390 wide the full-page screenshot repeated the top of the page for two agents. A gotcha now says to take single-viewport shots instead.
- **Newcomer read (L10).** Jargon leaked on all three pages, including labels in the overview figure, which comes before the primer: `port`, `RFC`, `cN`, `0x04`, `EMV`, `DE 11`. This added step 6, the Newcomer pass, and a house-rules row.
- **Before/after judge (L6).** Two pages ran longer than their baselines. This added the length budget (900 to 1,400 words, 4 or 5 steps) and lowered the word WARN to 1,600. Box labels touched their edges, which led to the box padding rule and a box-edge check in step 8. Claims after a ref went untagged, which led to "a ref covers only the sentence it ends". The finish and limits were untagged too, so the tagging rule now covers them.

Not verified: the Codex run (`codex exec '$jm-explain …'`). The user declined the sandboxed test run, so `agents/openai.yaml` is untested in Codex.

## 2026-11-03 (final review and user approval)

- Final designer review: blue words in prose read as links, and the dotted inferred underline made pages look half-linked. Now the accent lives in figures only (prose `mark.subj` is bold ink), and inferred claims carry a superscript `~`. No page used a chart, so step 4 now makes any continuously varying quantity a `chart` or `panel`.
- Final engineer review: `cp` wasn't allowed. The user approved `Bash(cp *)`, and probe screenshots now go to `/tmp`, so the skill never deletes files.
- User at the approval gate: drawings should be slightly bolder, but 1.5px was too bold. Drawing outlines (`.part`) are now 1.25px `--ink`, and annotations stay 1px.
- `examples/` holds the keyboard-switch and card-payment pages the user approved.
- User after approval: ASCII arrows looked broken. The shaft stopped short of the tip and sat below its middle (card example Fig. 1). The old `svg.ah` was 1em tall with `vertical-align: -0.1em`. That put the tip under the `─` glyph, which sits at the line box's centre, and it made arrow rows taller than the others. Now the arrowhead fills exactly one line box (`height:1.2em; vertical-align:top`) and draws its own short shaft. Rows stay at 16.8px, and the tip lines up with `─`. Replaced in the gallery, figures.md, the template, the examples and the fixtures.
- User again: arrows were still slightly broken across all examples, and common components should be sorted out. At 3x the real cause showed. Box-drawing glyphs don't fill a 1.2 line height in SF Mono or Menlo, so `│` edges broke at every row, and a glyph line never meets an SVG tip exactly. Replaced glyph rendering with one component, `scripts/ascii-figure.mjs`. The agent writes the diagram as plain text, and the script draws every line, corner, junction and arrowhead as SVG paths on an exact 8.4 × 16.8px grid, with text fitted to the same grid. `⟦ ⟧` marks the subject, and an arrow glyph is drawn only when a line runs into it (`1 → 0` stays text). All 10 shipped ascii and tree figures are regenerated with it. The checker WARNs (`ascii-pre`) on box-drawing glyphs left in a `<pre>`.
