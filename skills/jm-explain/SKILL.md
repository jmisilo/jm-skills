---
name: jm-explain
description: "Explain how something is built (software, system, hardware or process) as one mono-paper HTML page with figures, or in chat with --md."
disable-model-invocation: true
argument-hint: "[--md] <topic or question>"
allowed-tools: "Bash(node *), Bash(agent-browser *), Bash(open *), Bash(xdg-open *), Bash(mkdir *), WebSearch, WebFetch"
---

# Explain how it is built

Request: $ARGUMENTS

`${CLAUDE_SKILL_DIR}` means the folder this SKILL.md is in. Where an agent leaves it unexpanded (Codex, others), use that folder.

This skill answers one question about how something is built with one page a newcomer can follow. The page states the problem the thing solves, defines the few terms the reader lacks, walks the mechanism in 4 to 7 steps that each pair one paragraph with one figure, and closes on what to take away. The format is fixed so every explanation reads and looks the same; the content adapts to the question.

The user's explicit wishes in the request override this skill. The format rules here override your own visual defaults.

## The run

1. **Scope.** Rewrite the request as one sentence: the subject and the gap you are filling for the reader. Name what stays out, such as neighbouring topics a full survey would cover. A page that answers the question beats a page that covers the field.
   - The question is how a website, a UI effect or an animation was built: load `explain-interface` (Claude Code: Skill tool; Codex: `$explain-interface`) and use its method for the research. If it isn't installed, read the page with `agent-browser` and tag what you measured versus inferred yourself. The page format still comes from this skill.
   - The user asks for a real technical drawing of a physical object (exploded view, assembly print): load `teardown` the same way and embed its SVG as the figure for that step. If it isn't installed, draw a flat `schematic` figure and say a full drawing needs `teardown`.
2. **Research.** Read local code or docs first when the question is about them, then search the web. Keep an evidence list: each claim with its source, or marked inferred. Numbers carry units and a source. A value you can't find stays unknown and is said to be unknown.
3. **Outline**, in your reply or scratch, before any HTML:
   - the problem in 2 to 4 sentences, and what the overview figure shows;
   - 2 to 6 primer terms, chosen by asking which words a smart newcomer would stop at;
   - 4 to 7 mechanism steps, each as: the claim, the figure kind, what the figure makes visible;
   - the finish: the whole mechanism as one idea, what transfers to other systems, and the limits of this explanation.
   Then check that no step uses a term defined only later. Read [markdown.md](markdown.md) when the request contains `--md`, and follow it instead of steps 4 to 7.
4. **Pick figures.** Read [figures.md](figures.md) when you reach this step, on every HTML page. One figure per step plus the overview, each one a kind from its table, 3 to 8 elements each. The first time you build a page in a session, also read one file in `examples/` for the finished density and voice.
5. **Build.** Run `mkdir -p explain`, copy `${CLAUDE_SKILL_DIR}/assets/template.html` to `./explain/<slug>.html` (lowercase, hyphens, 2 to 5 words), and replace the demo content part by part. Keep the `:root` tokens and the base CSS unchanged, because the checker compares them with the template. Figure CSS you add goes below the `/* == figures == */` block and uses only `var(--*)` colours.
6. **Check.** Run `node ${CLAUDE_SKILL_DIR}/scripts/check-explain.mjs explain/<slug>.html`. Fix every FAIL. Treat each WARN as wrong unless you can defend it in one sentence in the final reply.
7. **Render and probe**, with the recipe below, at 1280 and 390 wide. Open both screenshots and look at them: figure labels legible, nothing colliding, accent only on the subject. Fix the largest problem first, in one batch, then rerun steps 6 and 7. Stop when the checker has no FAIL and the probe returns `"ok": true` at both widths, or after 3 rounds, and report what is left.
8. **Deliver.** Open the file (`open` on macOS, `xdg-open` on Linux). Reply with the absolute path, the checks you ran with their results, every check you couldn't run as **Not verified** with the reason, and, when the current folder is a git repository whose `.gitignore` doesn't cover `explain/`, one line saying so. Never edit `.gitignore`.

### Probe recipe

Run exactly this, one command per line. The default `agent-browser` session is shared with other agents, so every command names its own `--session`.

```bash
agent-browser --session explain-<slug> open "file://$PWD/explain/<slug>.html"
agent-browser --session explain-<slug> set viewport 1280 900
agent-browser --session explain-<slug> reload
agent-browser --session explain-<slug> screenshot --full explain/<slug>-1280.png
agent-browser --session explain-<slug> --json eval --stdin < ${CLAUDE_SKILL_DIR}/scripts/probe.js
agent-browser --session explain-<slug> set viewport 390 844
agent-browser --session explain-<slug> reload
agent-browser --session explain-<slug> screenshot --full explain/<slug>-390.png
agent-browser --session explain-<slug> --json eval --stdin < ${CLAUDE_SKILL_DIR}/scripts/probe.js
agent-browser --session explain-<slug> close
```

The result sits at `.data.result`: `{ok, overlaps, overflows, smallText, bigText, hscroll}`. Each finding names the figure and the text. Delete the two screenshots after the last round unless the user asked for them. Without `agent-browser`, report step 7's checks as Not verified; never present an unrendered page as checked.

## The page

The template already encodes this order; the checker verifies it.

| Part | Holds | Why |
| --- | --- | --- |
| `prompt` | The request exactly as the user typed it, after a `>` caret | The reader sees which question this page answers |
| `problem` | An h1, then what it is, why it exists and what it solves, then one overview figure of the whole | A newcomer needs the purpose before the parts make sense |
| `primer` | `dl.terms`: 2 to 6 terms, one or two sentences each | Every later step can lean on these words |
| `mechanism` | 4 to 7 sections, each one paragraph (two at most) and one figure | One idea per step, shown as well as told |
| `finish` | The mechanism as one idea, what transfers, the limits | Ends on understanding, not on a summary of headings |
| `sources` | Numbered list the `sup.ref` marks point to | Lets the reader check any claim |

## Writing rules

- Open the problem section with the thing's job, not its history or an analogy. Analogies come after the real mechanism, if at all.
- Every paragraph in a mechanism step makes one claim; its figure shows that claim; its caption says in one sentence what to notice.
- Name real things: identifiers, part names, field names, numbers with units (`300ms`, `53/udp`, `45 g`). A vague noun where a real name exists reads as a guess.
- A claim you did not read in a source carries `<span class="inferred">`. The reader must be able to tell knowledge from reconstruction.
- Close on the recipe in words. No code block at the end; code appears only where a step is about that code.
- Keep prose under 2,500 words. Every paragraph that doesn't move the reader toward the answer goes.
- Write without em dashes; use commas, colons or full stops.

## House rules

These are the defaults agents produce without this skill, each with what to do instead.

| Default tell | Instead |
| --- | --- |
| Cream or beige paper with a rust or red accent | The template's neutral grey paper and its one blue accent |
| Accent on section numbers, headings, bullets, callout bars | Accent only on `.subj`, `[data-subj]` and `.val`: the thing being explained and its values |
| Each figure in a filled, bordered card | The figure sits on the paper; `.fig-head` above and the dotted caption rule below frame it |
| A left-border blockquote "Note" or "Why?" callout | A sentence in the paragraph, or a primer term |
| A TL;DR or "short version" box at the top | The problem section is the summary |
| A glossary at the end | The primer before the mechanism |
| Several hues to tag categories (issuer red, acquirer blue) | Greys and dash patterns tell categories apart; the accent marks the subject |
| A chart with arrowed axes, a full grid and a legend row | The chart conventions in figures.md: reference lines only at labelled values, inline labels |
| Every figure hand-placed in SVG | ASCII, timeline and table kinds where they fit; they align by construction |
| Side topics that complete the field (security extensions, history, fees) | One line in the finish's limits, or nothing |

## Gotchas

- `▶` and some box-drawing glyphs fall back to another font and break the grid. Arrowheads in ASCII figures are the `svg.ah` element from figures.md.
- An open SVG `path` or `polyline` without `fill="none"` closes into a black shape.
- An SVG drawn small and shown large inflates its labels and strokes. Give each figure SVG a `width` equal to its viewBox width; the probe's `bigText` catches misses.
- A viewBox wider than about 430 shrinks 11px labels under 9px at 390 wide. Narrow the drawing, move labels to HTML, or add a stacked variant (figures.md).
- Chrome labels (`.fig-tag`, axis titles, `.fig-src`, `dl` terms) are uppercased by CSS, which turns `IPv4` into `IPV4` and `m·ẍ` into `M·Ẍ`. Identifiers, formulas and units whose case matters go in data labels, which keep their case.
- `agent-browser open` needs an absolute `file://` path.
- An interactive figure (one per page at most) must show a meaningful static state with JavaScript off, because the page may be printed or read as a file.
- Editing `:root` makes the checker FAIL every colour. The palette is fixed on purpose: one look across every explanation.

## Files

| File | Read or run | When |
| --- | --- | --- |
| [figures.md](figures.md) | Read | Step 4, for every HTML page |
| [markdown.md](markdown.md) | Read | Only when the request contains `--md` |
| `examples/` | Read one file | The first page you build in a session |
| `assets/template.html` | Copy | Step 5 |
| `assets/figures.html` | Open in a browser | When a figure kind's snippet in figures.md is unclear |
| `node scripts/check-explain.mjs` | Run | Step 6 |
| `agent-browser … eval --stdin < scripts/probe.js` | Run through the recipe | Step 7 |

Needs: `node` 18 or newer for the checker, and the `agent-browser` CLI for step 7 (`npm i -g agent-browser`, then `agent-browser install`). Without either, build the page anyway and report the missing checks as Not verified.
