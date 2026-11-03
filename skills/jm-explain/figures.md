# Figures

Every figure on a page is one kind from this file, built from its snippet. All ten render together in `assets/figures.html`.

## Contents

- [Pick a kind](#pick-a-kind)
- [Every figure](#every-figure): markup, hairlines, no scaling drift, mobile
- [timeline](#timeline) · [ascii](#ascii) · [tree](#tree) · [stack](#stack) · [sequence](#sequence)
- [chart](#chart) · [units](#units) · [table](#table) · [schematic](#schematic) · [panel](#panel)

## Pick a kind

| Kind | Use when | Not for |
| --- | --- | --- |
| timeline | durations and overlap on one time axis, 2 to 6 rows | who sends what to whom (sequence); a value changing over time (chart) |
| ascii | 2 to 5 named parts and what flows between them | more than 8 boxes, crossing arrows, lines over 56 columns |
| tree | containment or hierarchy, up to 4 levels | graphs where a child has two parents |
| stack | 3 to 6 layers, each built on the one below | parts that sit side by side (ascii) |
| sequence | messages between 3 to 5 parties, in order | how long each step takes (timeline) |
| chart | one value against time or another value, 1 or 2 series | shares of a whole (units); exact values (table) |
| units | a share of a whole, or a count, as squares | more than 3 categories |
| table | rows you would read in a terminal or a config, up to 8 rows and 6 columns | anything with a shape or a flow |
| schematic | a physical part or circuit, flat section or side view | a real exploded drawing (hand off to `teardown`) |
| panel | one parameter worth turning: code, part, curve and readouts together | more than one per page; a topic with no number to turn |

A figure shows what its paragraph says and nothing else: 3 to 8 elements, real identifiers, numbers with units.

## Every figure

Markup, in this order. `<figure>` takes no `role`.

```html
<figure class="fig" data-kind="KIND">
  <div class="fig-head"><span class="fig-tag">FIG. 1</span><span class="fig-hint">optional · hints</span></div>
  BODY
  <figcaption>One sentence on what to notice.<span class="fig-src">Source: …</span></figcaption>
</figure>
```

- `.fig-tag` reads exactly `FIG. n`, numbered 1..N in page order. The hint names conditions or units (`cold cache · time runs down`).
- One body: `<svg role="img" aria-label>`, `<div class="ascii" role="img" aria-label><pre aria-hidden="true">`, a div grid with `role="img" aria-label` (timeline, units, stack), or a `<table>` (table kind). The `aria-label` states what the figure shows in a sentence, numbers included.
- Default width is `--measure` (620px). Add `wide` (880px) only for the panel or a timeline with many ticks.
- No border, background, shadow, radius or card on the figure. It sits on the paper.
- Accent only through `.subj`, `[data-subj]` or `.val`, and only on the one thing the paragraph is about. `.fault` (red) only for a real failure.
- Text: data labels `--mono` 12px original case; chrome labels 11px UPPERCASE `.lbl` (in SVG, write them in capitals).
- Labels inside a box keep at least 1ch of space to each edge in ASCII, and at least 6px in SVG; size the box from the longest label, not the other way round.
- Chrome labels (uppercase) never hold identifiers, formulas or units whose case matters (`IPv4`, `m·ẍ`, `ms`, `MiB`). Those go in the data-label style, 12px mono in original case.

### Hairlines

Every line is 1px, with two exceptions set in CSS: the subject curve or path (`.fig svg path.subj`) is 1.5px, and drawing outlines (`.part`) are 1.25px. Never set `stroke-width` attributes.

| Class (SVG) | Stroke | Use |
| --- | --- | --- |
| `.ln` | solid `--ink-2` | parts, boxes, arrows |
| `.solid` | fill `--ink-2` | arrowheads, dots |
| `.leader` | solid `--muted` | label leaders with one elbow: `M76 46 H160 L184 58` |
| `.dot` | `1 1` `--muted` | connectors between related things |
| `.dash` | `2 4` `--muted` | estimates, markers, not reached, rest positions |
| `.ref-line` | `1 2` `--faint` | chart reference lines and event markers |
| `.life` | `1 2` `--faint` | sequence lifelines |
| `.ln-faint` | solid `--faint` | hatching, secondary outlines |
| `.part` | solid `--ink`, 1.25px | object outlines in `schematic` and `panel` drawings only |

Add `subj` to any of them to draw it in the accent. In ASCII, use `┄ ┆` for dashed boxes.

### No scaling drift

- `.fig svg * { vector-effect: non-scaling-stroke }` is in the CSS, so strokes stay 1px at any size.
- A body SVG has `width` equal to its viewBox width, and `height` likewise. CSS gives it `max-width: 100%; height: auto`, so it shrinks on narrow screens and never grows. Never set `width: 100%` on a body SVG.
- A viewBox narrower than the figure is centred, not stretched. Draw at the size you want to see.
- SVG text is 11px or 12px in user units. Text over 16px at 1280 wide means the SVG is scaling up, and the probe reports it as `bigText`.

### Mobile

At 390 wide the figure is 350px, and no figure text may render under 9px. Pick one:

1. **viewBox width at most 420.** Text renders at size × 350 / width: 11px labels at 420 render at 9.2px. Every SVG kind here uses this.
2. **HTML labels.** The SVG holds only lines (`preserveAspectRatio="none"`, no `<text>`) and stretches; labels are absolutely placed spans with `%` positions. The panel's `.plot` does this.
3. **A stacked variant** under `@container (max-width: 480px)`. `.fig` is a size container; the panel puts its schematic under the code there.

## timeline

- CSS grid: `auto` label column, `1fr` track. Every position is a `%` of the axis span in `--a`, `--b` (bars, bracket segments) or `--at` (ticks, axis labels).
- Bars are 8px `--ink-2` on a `--well` track. The subject row gets `class="subj"` on its label and `data-subj` on its track, which turns its bars accent.
- Axis labels 12px, the unit on the last one only (`240ms`). The bracket row is a 1px `--faint` rule with a 1px tick under each axis label.
- **Axis break**: when a gap is over 3× the shortest span, squeeze it and split the bracket into two segments with a 4% gap, then say so in the hint (`axis break 300 to 2000ms`): `<span class="tl-seg" style="--a:0%;--b:48%"></span><span class="tl-seg" style="--a:52%;--b:100%"></span>`.
- 2 to 6 rows. Labels lowercase identifiers.

```html
<figure class="fig" data-kind="timeline">
  <div class="fig-head"><span class="fig-tag">FIG. 1</span><span class="fig-hint">one request · cold connection</span></div>
  <div class="tl" role="img" aria-label="Timeline of one HTTPS request: DNS 0 to 24ms, TCP connect 24 to 52ms, TLS 52 to 98ms, waiting for the first byte 98 to 212ms, download 212 to 240ms.">
    <span></span>
    <div class="tl-axis"><span style="--at:0%">0</span><span style="--at:25%">60</span><span style="--at:50%">120</span><span style="--at:75%">180</span><span style="--at:100%">240ms</span></div>
    <span></span>
    <div class="tl-bracket"><span class="tl-seg" style="--a:0%;--b:100%"></span><span class="tl-tick" style="--at:0%"></span><span class="tl-tick" style="--at:25%"></span><span class="tl-tick" style="--at:50%"></span><span class="tl-tick" style="--at:75%"></span><span class="tl-tick" style="--at:100%"></span></div>
    <span>dns</span><div class="tl-track"><span class="tl-bar" style="--a:0%;--b:10%"></span></div>
    <span>tcp connect</span><div class="tl-track"><span class="tl-bar" style="--a:10%;--b:21.7%"></span></div>
    <span>tls</span><div class="tl-track"><span class="tl-bar" style="--a:21.7%;--b:40.8%"></span></div>
    <span class="subj">wait (ttfb)</span><div class="tl-track" data-subj><span class="tl-bar" style="--a:40.8%;--b:88.3%"></span></div>
    <span>download</span><div class="tl-track"><span class="tl-bar" style="--a:88.3%;--b:100%"></span></div>
  </div>
  <figcaption>Almost half the request is the server thinking. Connection setup costs three round trips before a single byte of the page is asked for.<span class="fig-src">Source: illustrative, a typical cold HTTPS request</span></figcaption>
</figure>
```

## ascii

- `<pre>` inside `.ascii`, line-height 1.2, `--ink-2`, no padding, `user-select: none`. Box drawing only: `┌ ─ ┐ │ └ ┘ ├ ┤ ┬ ┴`, dashed `┄ ┆`.
- **Size**: set `--cols` to the widest line, in characters. The CSS does `font-size: min(1em, calc(100cqw / (var(--cols) * 0.62)))` on a 14px base, so the widest line always fits and type never exceeds 14px.
- **At most 56 columns**: at 350px that still gives 10px type.
- **Arrowheads** are a 1ch inline SVG after a run of `─`, counted as 1 column. Right: `<svg class="ah" aria-hidden="true" viewBox="0 0 6 10" style="width:1ch;height:1em;vertical-align:-0.1em"><path d="M0 1.5 L6 5 L0 8.5 Z" fill="currentColor"/></svg>`. Left: `d="M6 1.5 L0 5 L6 8.5 Z"`. Down, under a `│`: `d="M0.5 3 L5.5 3 L3 8 Z"`.
- Labels above arrows, values inside boxes, totals or latencies on the line under the boxes. Mark the subject with `<span class="subj">`.

```html
<figure class="fig" data-kind="ascii">
  <div class="fig-head"><span class="fig-tag">FIG. 2</span><span class="fig-hint">one load · typical latencies</span></div>
  <div class="ascii" role="img" aria-label="A load misses L1d (5 cycles) and L2 (14 cycles), hits L3 (about 50 cycles) and never reaches DRAM (about 100ns)." style="--cols:50"><pre aria-hidden="true"> load                              not reached
┌──────┐ miss ┌──────┐ miss ┌──────┐      ┌┄┄┄┄┄┄┐
│ L1d  │─────<svg class="ah" aria-hidden="true" viewBox="0 0 6 10" style="width:1ch;height:1em;vertical-align:-0.1em"><path d="M0 1.5 L6 5 L0 8.5 Z" fill="currentColor"/></svg>│  L2  │─────<svg class="ah" aria-hidden="true" viewBox="0 0 6 10" style="width:1ch;height:1em;vertical-align:-0.1em"><path d="M0 1.5 L6 5 L0 8.5 Z" fill="currentColor"/></svg>│  <span class="subj">L3</span>  │      ┆ DRAM ┆
│ 48K  │      │  2M  │      │ 36M  │      ┆ 32G  ┆
└──────┘      └──────┘      └──────┘      └┄┄┄┄┄┄┘
 5 cyc         14 cyc       <span class="subj">~50 cyc hit</span>    ~100 ns</pre></div>
  <figcaption>The load stops at the first level that has the line. Each level down is larger and several times slower.<span class="fig-src">Source: illustrative, typical recent x86 core</span></figcaption>
</figure>
```

## tree

- The ascii body with `├─`, `└─` and `│` continuation, 3 spaces per level. The root line is the real thing (a path, a URL, a component).
- Align the value column with spaces. One trailing note at most (`never sent`).
- The subject branch in `<span class="subj">`. Up to 4 levels, 4 to 10 lines.

```html
<figure class="fig" data-kind="tree">
  <div class="fig-head"><span class="fig-tag">FIG. 3</span><span class="fig-hint">url parts</span></div>
  <div class="ascii" role="img" aria-label="The URL https://api.example.com:8443/v1/users?id=7#top splits into scheme, authority (host and port), path, query and fragment. The fragment is never sent to the server." style="--cols:46"><pre aria-hidden="true">https://api.example.com:8443/v1/users?id=7#top
├─ scheme      https
├─ authority
│  ├─ host     api.example.com
│  └─ port     8443
├─ path        /v1/users
├─ query       id=7
└─ <span class="subj">fragment    top</span>   never sent</pre></div>
  <figcaption>Everything up to the query goes to the server. The fragment stays in the browser.<span class="fig-src">Source: RFC 3986, section 3</span></figcaption>
</figure>
```

## stack

- Div grid, top layer first, one row per layer: name (12px, `--ink`, original case: `IPv4`, not `IPV4`), what it adds, a size or number right-aligned.
- 1px `--faint` border per layer, 4px gaps, no fills. The subject layer gets `data-subj` (accent border and text).
- 3 to 6 layers. Say the direction of travel in the hint.

```html
<figure class="fig" data-kind="stack">
  <div class="fig-head"><span class="fig-tag">FIG. 4</span><span class="fig-hint">sending runs top to bottom</span></div>
  <div class="stack" role="img" aria-label="Network stack for one HTTPS request: HTTP carries the request, TLS adds a 5 byte header and 16 byte tag, TCP adds 20 bytes, IPv4 adds 20 bytes, Ethernet adds 14 bytes plus a 4 byte checksum.">
    <div><span>HTTP/1.1</span><span>GET /index.html</span><span>payload</span></div>
    <div data-subj><span>TLS 1.3</span><span>record header, auth tag</span><span>5 + 16 B</span></div>
    <div><span>TCP</span><span>ports, sequence numbers</span><span>20 B</span></div>
    <div><span>IPv4</span><span>source, destination</span><span>20 B</span></div>
    <div><span>Ethernet</span><span>MAC addresses, FCS</span><span>14 + 4 B</span></div>
  </div>
  <figcaption>Each layer wraps the one above in its own header. TLS is the only layer that also hides what it wraps.<span class="fig-src">Source: RFC 8446, RFC 9293, RFC 791, IEEE 802.3</span></figcaption>
</figure>
```

## sequence

- SVG, viewBox 420 wide. Up to 5 lanes, 90 apart (x 30 to 390). Lane names 11px caps at y 12, `text-anchor="middle"`.
- Lifelines `.life` from y 22 to the end. Time runs down; messages 24 to 34 apart.
- Message: a `.ln` line stopping 6 short of the target lane, a `.solid` head `M{x2} {y} l∓6 -3 v6 z`, the label 6 above the line, centred on the span between the two lanes it connects. Move a label sideways rather than let two collide.
- The subject messages (usually the answer) take `subj` on line, head and label.

```html
<figure class="fig" data-kind="sequence">
  <div class="fig-head"><span class="fig-tag">FIG. 5</span><span class="fig-hint">cold cache · time runs down</span></div>
  <svg role="img" aria-label="DNS lookup: the laptop asks its resolver for example.com; the resolver asks the root, which refers it to .com; asks the .com TLD, which refers it to ns1; asks the authoritative server, which answers 93.184.215.14; the resolver passes the answer back to the laptop." width="420" height="270" viewBox="0 0 420 270">
    <text class="lbl" x="30" y="12" text-anchor="middle">LAPTOP</text><text class="lbl" x="120" y="12" text-anchor="middle">RESOLVER</text><text class="lbl" x="210" y="12" text-anchor="middle">ROOT</text><text class="lbl" x="300" y="12" text-anchor="middle">TLD</text><text class="lbl" x="390" y="12" text-anchor="middle">AUTH</text>
    <path class="life" d="M30 22 V266 M120 22 V266 M210 22 V266 M300 22 V266 M390 22 V266"/>
    <line class="ln" x1="30" y1="50" x2="114" y2="50"/><path class="solid" d="M120 50 l-6 -3 v6 z"/><text x="75" y="44" text-anchor="middle">example.com?</text>
    <line class="ln" x1="120" y1="84" x2="204" y2="84"/><path class="solid" d="M210 84 l-6 -3 v6 z"/><text x="165" y="78" text-anchor="middle">example.com?</text>
    <line class="ln" x1="210" y1="108" x2="126" y2="108"/><path class="solid" d="M120 108 l6 -3 v6 z"/><text x="165" y="102" text-anchor="middle">try .com</text>
    <line class="ln" x1="120" y1="142" x2="294" y2="142"/><path class="solid" d="M300 142 l-6 -3 v6 z"/><text x="165" y="136" text-anchor="middle">example.com?</text>
    <line class="ln" x1="300" y1="166" x2="126" y2="166"/><path class="solid" d="M120 166 l6 -3 v6 z"/><text x="255" y="160" text-anchor="middle">try ns1</text>
    <line class="ln" x1="120" y1="200" x2="384" y2="200"/><path class="solid" d="M390 200 l-6 -3 v6 z"/><text x="165" y="194" text-anchor="middle">example.com?</text>
    <line class="ln subj" x1="390" y1="224" x2="126" y2="224"/><path class="solid subj" d="M120 224 l6 -3 v6 z"/><text class="subj" x="345" y="218" text-anchor="middle">93.184.215.14</text>
    <line class="ln subj" x1="120" y1="258" x2="36" y2="258"/><path class="solid subj" d="M30 258 l6 -3 v6 z"/><text class="subj" x="75" y="252" text-anchor="middle">93.184.215.14</text>
  </svg>
  <figcaption>The resolver does the walking. Root and TLD only refer it onward; the authoritative server is the one that answers.<span class="fig-src">Source: RFC 1034, section 5.3.3</span></figcaption>
</figure>
```

## chart

- SVG at most 430 wide, or HTML labels as in the panel.
- **No axis lines, frame or arrows.** Ticks are text only, 12px, with the unit on the last x tick (`16 RTT`) and on the last y tick or every y tick.
- **Reference lines** only at labelled values, at most 4: `.ref-line` (dotted `1 2`, `--faint`).
- **At most 2 series.** The subject is `.subj`, accent at 1.5px. The other is `.series` (`--ink-2`, 1px) or `.series` with `stroke-dasharray="2 4"`.
- **After the event** of interest the subject curve continues as `.after` (`--muted`), so the eye stops at the event.
- **Markers** are a dotted vertical `.ref-line` with an inline label beside its top (`loss, halve`, `settle 0.84s`).
- **Legend**: label lines inline, next to the line, in its colour. Only when that doesn't fit, one mono line at bottom right (`x(t) · unit step`).
- **Readout footer** (optional): a `.fig-foot` under a dotted rule, parts separated by ` · `.

```html
<figure class="fig" data-kind="chart">
  <div class="fig-head"><span class="fig-tag">FIG. 6</span><span class="fig-hint">tcp reno · textbook values</span></div>
  <svg role="img" aria-label="Chart of the TCP congestion window over 16 round trips: it doubles each round trip from 1 to 32 segments, then grows by one per round trip to 38; a loss at round trip 11 halves it to 19, after which it grows by one again." width="420" height="200" viewBox="0 0 420 200">
    <line class="ref-line" x1="48" y1="170" x2="400" y2="170"/>
    <line class="ref-line" x1="48" y1="58" x2="400" y2="58"/>
    <line class="ref-line" x1="290" y1="22" x2="290" y2="170"/>
    <path class="subj" d="M48 166.5 L70 163 L92 156 L114 142 L136 114 L158 58 L180 54.5 L202 51 L224 47.5 L246 44 L268 40.5 L290 37"/>
    <path class="after" d="M290 37 L290 103.5 L312 100 L334 96.5 L356 93 L378 89.5 L400 86"/>
    <text x="40" y="174" text-anchor="end">0</text>
    <text x="40" y="62" text-anchor="end">32</text>
    <text x="48" y="190">0</text>
    <text x="136" y="190" text-anchor="middle">4</text>
    <text x="224" y="190" text-anchor="middle">8</text>
    <text x="312" y="190" text-anchor="middle">12</text>
    <text x="400" y="190" text-anchor="end">16 RTT</text>
    <text x="296" y="18">loss, halve</text>
    <text class="mut" x="400" y="72" text-anchor="end">ssthresh</text>
    <text class="subj" x="166" y="30">cwnd, segments</text>
  </svg>
  <figcaption>Doubling gets the window to the threshold in five round trips; after that it creeps up one segment at a time until a loss cuts it in half.<span class="fig-src">Source: RFC 5681, sections 3.1 and 3.2</span></figcaption>
</figure>
```

## units

- Div grid of 12px squares, 4px gaps, `--per-row` 20 (320px, fits at 390 wide). One square is one stated unit, named in the hint (`1 square = 1% of the flash`).
- Up to 3 categories, in reading order: `.on` (`--ink-2`), empty (`--well`), `.subj` (accent, the share the paragraph is about).
- A `.units-key` underneath with each category's value. Totals add up to the squares drawn.

```html
<figure class="fig" data-kind="units">
  <div class="fig-head"><span class="fig-tag">FIG. 7</span><span class="fig-hint">1 square = 1% of the flash</span></div>
  <div class="units" role="img" aria-label="Unit grid of a 1 TB SSD's 1024 GiB of flash: 52 percent holds data, 39 percent is free user space, 9 percent is spare area the drive keeps for itself.">
    <div class="units-grid" style="--per-row:20">
      <i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i>
      <i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i>
      <i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i class="subj"></i><i class="subj"></i><i class="subj"></i><i class="subj"></i><i class="subj"></i><i class="subj"></i><i class="subj"></i><i class="subj"></i><i class="subj"></i>
    </div>
    <div class="units-key"><span><i class="on"></i>data 52%</span><span><i></i>free 39%</span><span><i class="subj"></i>spare 9%</span></div>
  </div>
  <figcaption>1 TB is sold to you, 1,024 GiB is built in. The 9% gap is spare area for wear levelling and garbage collection.<span class="fig-src">Source: derived, 1,000 GB / 1,099.5 GB of NAND</span></figcaption>
</figure>
```

## table

- A semantic `<table>`, no `role`. Header row `--well`, 11px caps; cells 12px mono; 1px `--rule` row lines; no vertical lines.
- Numbers right-aligned with `class="num"` on both `th` and `td`. The row in question gets `data-subj`.
- Up to 8 rows and 6 columns: trim to the rows that matter and say what was cut in the caption. Put the input (the packet, the query) in the hint.
- **Terminal output** that is columnar goes in a table like this. Free-form output goes in the ascii body with the `$ command` as its first line, trimmed to 56 columns.

```html
<figure class="fig" data-kind="table">
  <div class="fig-head"><span class="fig-tag">FIG. 8</span><span class="fig-hint">packet: tcp 22 from 10.0.0.7</span></div>
  <table>
    <thead><tr><th class="num">Priority</th><th>Action</th><th>Proto</th><th class="num">Port</th><th>Source</th></tr></thead>
    <tbody>
      <tr><td class="num">100</td><td>allow</td><td>tcp</td><td class="num">443</td><td>0.0.0.0/0</td></tr>
      <tr><td class="num">200</td><td>allow</td><td>tcp</td><td class="num">80</td><td>0.0.0.0/0</td></tr>
      <tr data-subj><td class="num">300</td><td>deny</td><td>tcp</td><td class="num">22</td><td>0.0.0.0/0</td></tr>
      <tr><td class="num">400</td><td>allow</td><td>tcp</td><td class="num">22</td><td>10.0.0.0/8</td></tr>
      <tr><td class="num">65534</td><td>deny</td><td>all</td><td class="num">*</td><td>0.0.0.0/0</td></tr>
    </tbody>
  </table>
  <figcaption>Rule 300 matches first, so the allow for the internal range at 400 never runs.<span class="fig-src">Source: illustrative rule set</span></figcaption>
</figure>
```

## schematic

- SVG, viewBox at most 420 wide. Flat section or side view, no shading or fills. Say `not to scale` in the hint when it isn't.
- Object outlines are `.part`: 1.25px `--ink`, so the object reads a step bolder than its notes. Annotations (leaders, dimension scales, dashed guides) stay 1px `--muted`.
- Labels 11px caps `.lbl`: right-aligned at x 70 on the left (`text-anchor="end"`) or left-aligned from x 318 on the right, each with a `.leader` that has at most one elbow.
- Dimensions: a `.dash` guide from the part to a `.leader` scale with ticks, values as 12px text.
- The subject is one point or part: `.subj` stroke, `.solid.subj` dot, and its label in `subj`. 3 to 8 labels.
- Need a real exploded or assembly drawing of a physical object? Load `teardown` instead and embed its SVG.

```html
<figure class="fig" data-kind="schematic">
  <div class="fig-head"><span class="fig-tag">FIG. 9</span><span class="fig-hint">section · not to scale</span></div>
  <svg role="img" aria-label="Section of a linear key switch: a stem rides in a two-part housing on a spring; a leg on the stem holds two contact leaves apart until the stem has travelled 2 mm of its 4 mm." width="420" height="230" viewBox="0 0 420 230">
    <path class="part" d="M184 160 V30 H216 V160 Z"/>
    <path class="part" d="M216 146 H246"/>
    <path class="part" d="M118 120 V84 H180 M220 84 H282 V120 M110 120 H290 V214 H110 Z"/>
    <path class="part" d="M200 160 L188 166 L212 172 L188 178 L212 184 L188 190 L212 196 L188 202 L212 208 L200 214"/>
    <path class="part" d="M258 214 V140 M248 214 V176 L252 150"/>
    <circle class="solid subj" cx="255" cy="150" r="2.5"/>
    <line class="dash" x1="216" y1="30" x2="300" y2="30"/>
    <path class="leader" d="M306 30 V110 M301 30 H311 M301 70 H311 M301 110 H311"/>
    <line class="subj" x1="301" y1="70" x2="311" y2="70"/>
    <text x="318" y="34">0 mm rest</text>
    <text class="subj" x="318" y="74">2 mm actuate</text>
    <text x="318" y="114">4 mm bottom</text>
    <path class="leader" d="M76 46 H160 L184 58"/><text class="lbl" x="70" y="50" text-anchor="end">STEM</text>
    <path class="leader" d="M76 100 H118"/><text class="lbl" x="70" y="104" text-anchor="end">HOUSING</text>
    <path class="leader" d="M76 190 H186"/><text class="lbl" x="70" y="194" text-anchor="end">SPRING</text>
    <path class="leader" d="M262 170 H312"/><text class="lbl" x="318" y="174">CONTACT</text>
  </svg>
  <figcaption>The key registers at the accent point, halfway down: once the stem's leg slides past, the moving leaf springs onto the fixed one.<span class="fig-src">Source: illustrative, typical linear switch, 2 mm actuation, 4 mm travel</span></figcaption>
</figure>
```

## panel

The spring reference drawn in the light palette. Use it once per page at most, for the one number the reader should turn.

- `.fig.wide` with `data-interactive`. The head adds a `.fig-name` (`[ spring ]`) after the tag; the hint names the gestures, set by the script, and shows the static state without it.
- `.panel` is a two-column grid: `.panel-code` (13px, faint line numbers, keys bold `--ink`, comment `.c` `--muted`, values `.val` in the accent) and a small schematic SVG on the right, at most 200 wide, outlines `.part` (1.25px `--ink`) and hatching `.ln-faint`. Under 480px the schematic drops under the code.
- `.plot` spans both columns: a stretched SVG with no text, HTML tick labels (`.y` with `--y`, `.x` with `--x` and `--tx` for the ends), a `.mark` label at the event and a `.legend`. All chart conventions apply.
- `.fig-foot` under a dotted rule: the formula on the first line; ranges left in `--muted`; readouts right, with `data-out` spans the script fills.
- Static first: every number, path and readout in the HTML is computed for the values shown. The script only redraws.
- Each tunable value is a `.val` with `data-param`, `data-label`, `data-min`, `data-max`, `data-step`. The script makes it a labelled `role="slider"`: drag sideways, or arrow keys (Shift for ×10). Copy the `<script>` from the end of `assets/figures.html` and change `sim()` and the readouts for your system.
- The chart SVG carries a `<title>` the script keeps current.

```html
<figure class="fig wide" data-kind="panel" data-interactive>
  <div class="fig-head"><span class="fig-tag">FIG. 10</span><span class="fig-name">[ spring ]</span><span class="fig-hint" data-hint>unit step · from rest</span></div>
  <div class="panel">
    <div class="panel-code">
      <div><span class="c">// the numbers are the spring</span></div>
      <div><b>const</b> press = {</div>
      <div>  <b>type</b>: "spring",</div>
      <div>  <b>stiffness</b>: <span class="val" data-param="k" data-label="stiffness" data-min="20" data-max="1000" data-step="5">180</span>,</div>
      <div>  <b>damping</b>: <span class="val" data-param="c" data-label="damping" data-min="0" data-max="60" data-step="1">8</span>,</div>
      <div>  <b>mass</b>: <span class="val" data-param="m" data-label="mass" data-min="0.1" data-max="4" data-step="0.1">1.0</span>,</div>
      <div>};</div>
    </div>
    <svg role="img" aria-label="Schematic: a mass m hangs from a fixed ceiling on a spring and a damper side by side; a dashed mark x0 shows where it comes to rest." width="170" height="176" viewBox="0 0 170 176">
      <path class="ln-faint" d="M14 12 l8 -8 M26 12 l8 -8 M38 12 l8 -8 M50 12 l8 -8 M62 12 l8 -8 M74 12 l8 -8 M86 12 l8 -8 M98 12 l8 -8 M110 12 l8 -8 M122 12 l8 -8 M134 12 l8 -8"/>
      <path class="part" d="M10 12 H150 M50 12 V22 L40 26 L60 34 L40 42 L60 50 L40 58 L60 66 L40 74 L60 82 L40 90 L60 98 L40 106 L60 114 L50 118 V130 M92 12 V92 M112 12 V92 M95 70 H109 M102 70 V130"/>
      <rect class="part" x="30" y="130" width="92" height="40" rx="2"/>
      <text x="76" y="154" text-anchor="middle">m</text><line class="dash" x1="128" y1="150" x2="146" y2="150"/>
      <text x="150" y="154">x₀</text>
    </svg>
    <div class="plot">
      <svg role="img" aria-label="Unit step response of the spring" width="400" height="100" viewBox="0 0 400 100" preserveAspectRatio="none">
        <title>Unit step response with stiffness 180, damping 8, mass 1.0: it overshoots by 37% and stays within 2% of 1 from 0.84s.</title>
        <line class="ref-line" x1="0" y1="33.3" x2="400" y2="33.3"/>
        <line class="ref-line" x1="0" y1="100" x2="400" y2="100"/>
        <line class="ref-line" data-settle x1="209" y1="0" x2="209" y2="100"/>
        <path class="subj" d="M0.0 100.0 L5.0 97.6 L10.0 91.3 L15.0 82.1 L20.0 71.0 L25.0 59.1 L30.0 47.2 L35.0 36.2 L40.0 26.6 L45.0 18.9 L50.0 13.3 L55.0 9.8 L60.0 8.4 L65.0 8.9 L70.0 11.0 L75.0 14.2 L80.0 18.2 L85.0 22.6 L90.0 27.1 L95.0 31.3 L100.0 35.0 L105.0 38.1 L110.0 40.4 L115.0 41.9 L120.0 42.6 L125.0 42.6 L130.0 41.9 L135.0 40.8 L140.0 39.4 L145.0 37.8 L150.0 36.1 L155.0 34.5 L160.0 33.0 L165.0 31.8 L170.0 30.9 L175.0 30.2 L180.0 29.9 L185.0 29.9 L190.0 30.0 L195.0 30.4 L200.0 30.9 L205.0 31.5 L210.0 32.2"/>
        <path class="after" d="M210.0 32.2 L215.0 32.8 L220.0 33.3 L225.0 33.8 L230.0 34.2 L235.0 34.4 L240.0 34.6 L250.0 34.6 L260.0 34.3 L270.0 33.8 L280.0 33.4 L290.0 33.0 L300.0 32.9 L310.0 32.9 L320.0 33.0 L330.0 33.1 L340.0 33.3 L350.0 33.4 L360.0 33.5 L380.0 33.5 L400.0 33.4"/>
      </svg>
      <span class="y" style="--y:33.3%">1</span><span class="y" style="--y:100%">0</span>
      <span class="x" style="--x:0%;--tx:0%">0.0</span><span class="x" style="--x:25%">0.4</span><span class="x" style="--x:50%">0.8</span><span class="x" style="--x:75%">1.2</span><span class="x" style="--x:100%;--tx:-100%">1.6s</span>
      <span class="mark" style="--x:52.3%">settle <span data-out="settle">0.84s</span></span>
      <span class="legend">x(t) · unit step</span>
    </div>
    <div class="fig-foot">
      <span>m·ẍ = −k(x − x₀) − c·ẋ · ζ = c / 2√(km)</span>
      <span>k 20-1000 · c 0-60 · m 0.1-4</span>
      <span>ζ <span data-out="zeta">0.30</span> · settle <span data-out="settle">0.84s</span> · over <span data-out="over">37%</span></span>
    </div>
  </div>
  <figcaption>Stiffness 180 against damping 8 gives a damping ratio of 0.30: the mass overshoots by 37% and is within 2% of rest at 0.84s.<span class="fig-src">Source: computed, 1ms steps</span></figcaption>
</figure>
```
