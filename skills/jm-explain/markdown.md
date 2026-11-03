# The --md mode

Read this only when the request contains `--md`. The answer goes in the chat as markdown, and no file is written: no `explain/` folder, no HTML, no screenshots. Steps 1 to 3 of the run still apply in full; this file replaces steps 4 to 7.

## Order

Keep the page's parts, in this order, as plain markdown:

1. The prompt line as a blockquote: `> /jm-explain <request as typed>`.
2. The problem: a `#` heading, 2 to 4 short paragraphs, then the overview figure.
3. `## Before you start`: a list of 2 to 6 terms, each `**term**: one or two sentences`.
4. `## 01 <step title>` to `## 07 …`: per step, one paragraph and one figure.
5. `## In one idea`: the recap as one idea, what transfers, the limits.
6. `## Sources`: a numbered list; claims point to it as `[1]`. Inferred claims end with `(inferred)`.

## Figures

Every figure is a fenced code block with no language tag, at most 72 columns wide, followed by one line in italics saying what to notice, starting with `Fig. n`.

- Box-drawing characters only: `─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼`, plus `→ ← ↑ ↓` and `▸` for arrowheads. Chat fonts render these consistently; avoid `▶` and emoji.
- Draw the same kinds as the HTML page: box and arrow, tree, timeline (bars as `█` on a `░` track, ticks on a ruler line), layer stack (boxes stacked bottom up), sequence (lanes as columns, arrows as rows), unit grid (`■ □`), table.
- Label with real identifiers and units, in the original case.
- 3 to 8 elements per figure, the same density limit as the page.

A timeline, for reference:

```
            0ms      300ms                2000ms   2300ms
            ├──────────┤                     ├──────────┤
copy icon   ████████████░░░░░░░░░░░░░░░░░░░░░████████████
checkmark   ████████████░░░░░░░░░░░░░░░░░░░░░████████████
```
*Fig. 2: both icons animate together for 300ms, twice.*

## Check before sending

- Count the widest line in each fenced block; anything over 72 columns gets narrower labels or a split figure.
- Every term a step uses appears in `Before you start` or is explained where it first appears.
- No code block at the end; the last section is prose.
