#!/usr/bin/env node
// Static checks for a jm-explain page: parts and counts, colour tokens, style,
// figures, refs and sources, external loads, scope. Zero dependencies.
// Usage: node check-explain.mjs [--gallery] [--tokens <template.html>] <file.html>
//        node check-explain.mjs --list-rules
// The expected colour tokens come from the :root of ../assets/template.html
// (relative to this script) unless --tokens points somewhere else.
// Exit 1 on any FAIL, 2 on bad usage or a missing token source, 0 otherwise.

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RULES = {
  // structure (R2, R9)
  "part-missing": ["FAIL", "add the missing <section data-part=\"...\">; the page runs prompt, problem, primer, mechanism x4-7, finish, sources"],
  "part-order": ["FAIL", "reorder the parts to prompt, problem, primer, mechanism..., finish, sources, with the mechanism steps contiguous"],
  "part-duplicate": ["FAIL", "keep one of each part; only mechanism repeats"],
  "part-unknown": ["FAIL", "use only prompt, problem, primer, mechanism, finish or sources, and never nest parts"],
  "prompt-line": ["FAIL", "start the prompt part with <p class=\"prompt\"><span class=\"caret\">&gt;</span> <b>/jm-explain</b> question</p>"],
  "problem-h1": ["FAIL", "give the problem part exactly one <h1>"],
  "problem-paras": ["FAIL", "write 2 to 4 short paragraphs: what it is, why it exists, what problem it solves"],
  "problem-figure": ["FAIL", "end the problem part with exactly one overview figure, after its paragraphs"],
  "primer-terms": ["FAIL", "put 2 to 6 terms in <dl class=\"terms\"> inside the primer part"],
  "mechanism-figure": ["FAIL", "pair each mechanism step with at least one paragraph and exactly one figure"],
  "mechanism-step": ["FAIL", "number the mechanism sections data-step=\"1\"..\"N\" in document order"],
  "step-count": ["WARN", "scope to the question: 4 to 7 mechanism steps"],
  "figure-count": ["WARN", "use one figure per step, one overview and at most one extra"],
  "word-count": ["WARN", "aim for 900 to 1,400 words; cut steps, tables or paragraphs that the question doesn't need"],
  // colour (R3)
  "color-literal": ["FAIL", "replace the literal with var(--token); literals live only in the top-level :root token block"],
  "token-missing": ["FAIL", "copy the :root token block from assets/template.html unchanged"],
  "token-extra": ["FAIL", "remove the extra colour token; the page has one accent beside --fault and the grey steps"],
  "token-changed": ["FAIL", "restore the token value from assets/template.html"],
  // style (R3)
  "box-shadow": ["FAIL", "remove the shadow; separate things with a 1px hairline or space"],
  "gradient": ["FAIL", "remove the gradient; use one flat token colour"],
  "figure-surface": ["FAIL", "figures sit on the paper: no background or border on figure/.fig (resets border:0, background:none are fine)"],
  "callout-border": ["FAIL", "drop the thick left border; make the point in the prose or the figure caption"],
  "callout-element": ["FAIL", "replace blockquote/aside with a plain paragraph, a primer term or a caption"],
  "border-width": ["FAIL", "use 1px hairlines only"],
  "svg-stroke": ["WARN", "draw strokes at 1px; .part strokes may go up to 1.5 and .subj/.accent up to 2"],
  "accent-prose": ["WARN", "keep at most one accent mark in the prose of a section, on the subject's name; values in prose stay ink, the figure carries the accent"],
  "accent-chrome": ["WARN", "keep the accent on the subject (.subj, [data-subj], .val), not on headings, tags, prompt or links"],
  // figures (R4)
  "fig-class": ["FAIL", "give every <figure> class=\"fig\""],
  "fig-kind": ["FAIL", "set data-kind to one of timeline, ascii, tree, stack, sequence, chart, units, table, schematic, panel"],
  "fig-tag": ["FAIL", "give the figure one <span class=\"fig-tag\">FIG. n</span>"],
  "fig-order": ["FAIL", "number the FIG. tags 1..N in document order"],
  "fig-caption": ["FAIL", "give the figure exactly one <figcaption>"],
  "fig-role": ["FAIL", "remove role from <figure>; the body carries role=\"img\""],
  "fig-body": ["FAIL", "use one body: <svg role=\"img\" aria-label>, <div class=\"ascii\" role=\"img\" aria-label><pre aria-hidden=\"true\">, a div grid with role=\"img\" aria-label, a <table> (table kind), or (data-interactive) an svg with a <title>"],
  "fig-control": ["FAIL", "label the control with aria-label, a <label> or visible button text"],
  "fig-interactive": ["FAIL", "keep at most one data-interactive figure per page"],
  "ascii-width": ["FAIL", "redraw the ascii figure within 56 columns (svg.ah counts as 1)"],
  "ascii-pre": ["WARN", "render ascii and tree figures with scripts/ascii-figure.mjs; box-drawing glyphs in a pre never join"],
  "svg-size": ["WARN", "set the body svg width to its viewBox width (with max-width:100%) so it never scales up"],
  // refs and sources (R5)
  "ref-unresolved": ["FAIL", "point every <sup class=\"ref\"><a href=\"#sN\"> at an <li id=\"sN\"> in the sources part"],
  "sources-count": ["FAIL", "list at least 2 sources in <ol class=\"sources\">, or set data-no-sources=\"<reason>\" on the sources part"],
  // external (R8)
  "external-load": ["FAIL", "inline the resource (inline CSS/SVG/JS, data: URI); the page loads nothing from the network"],
  "external-link": ["WARN", "move external links into the sources part and cite them with sup.ref"],
  // prose (R9)
  "em-dash": ["WARN", "rewrite with a comma, colon, parentheses or two sentences"],
};

const GALLERY_SKIP = new Set([
  "part-missing", "part-order", "part-duplicate", "part-unknown", "prompt-line", "problem-h1",
  "problem-paras", "problem-figure", "primer-terms", "mechanism-figure", "mechanism-step",
  "step-count", "figure-count", "word-count", "ref-unresolved", "sources-count",
]);

const PART_ORDER = ["prompt", "problem", "primer", "mechanism", "finish", "sources"];
const FIG_KINDS = new Set(["timeline", "ascii", "tree", "stack", "sequence", "chart", "units", "table", "schematic", "panel"]);

// ---------- CLI ----------

const argv = process.argv.slice(2);
if (argv.includes("--list-rules")) {
  for (const [id, [sev]] of Object.entries(RULES)) console.log(`${sev} ${id}`);
  process.exit(0);
}
const gallery = argv.includes("--gallery");
let tokensPath = null;
const files = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--gallery") continue;
  if (argv[i] === "--tokens") { tokensPath = argv[++i]; continue; }
  if (argv[i].startsWith("--")) usage(`unknown flag ${argv[i]}`);
  files.push(argv[i]);
}
if (files.length !== 1) usage("give exactly one HTML file");

const scriptDir = dirname(fileURLToPath(import.meta.url));
tokensPath = resolve(tokensPath ?? resolve(scriptDir, "../assets/template.html"));
if (!existsSync(tokensPath)) {
  console.error(`check-explain: cannot read the colour token source ${tokensPath}`);
  console.error("  The expected tokens come from the :root of assets/template.html. Restore it, or pass --tokens <file>.");
  process.exit(2);
}
const file = resolve(files[0]);
if (!existsSync(file)) usage(`no such file ${file}`);

function usage(msg) {
  console.error(`check-explain: ${msg}`);
  console.error("Usage: node check-explain.mjs [--gallery] [--tokens <template.html>] <file.html>");
  process.exit(2);
}

// ---------- entities ----------

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", mdash: "—", ndash: "–",
  hellip: "…", middot: "·", times: "×", divide: "÷", minus: "−", plusmn: "±",
  rarr: "→", larr: "←", uarr: "↑", darr: "↓", harr: "↔", rArr: "⇒",
  thinsp: " ", ensp: " ", emsp: " ", hairsp: " ", shy: "­", zwj: "‍", zwnj: "‌",
  copy: "©", reg: "®", deg: "°", micro: "µ", para: "¶", sect: "§", bull: "•",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»",
  le: "≤", ge: "≥", ne: "≠", asymp: "≈", infin: "∞", sum: "∑", half: "½",
  frac12: "½", frac14: "¼", frac34: "¾", sup2: "²", sup3: "³", zeta: "ζ",
  omega: "ω", mu: "μ", Delta: "Δ", delta: "δ", lambda: "λ", pi: "π",
  boxh: "─", boxv: "│", boxdr: "┌", boxdl: "┐", boxur: "└", boxul: "┘",
  boxvr: "├", boxvl: "┤", boxhd: "┬", boxhu: "┴", boxvh: "┼",
  blacktriangleright: "▸", blacktriangledown: "▾", squf: "▪", square: "□",
};
function decode(s) {
  if (!s || !s.includes("&")) return s;
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e) => {
    if (e[0] === "#") {
      const cp = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

// ---------- HTML ----------

const VOID = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
const RAW = new Set(["script", "style", "textarea"]);
const P_CLOSERS = new Set("address article aside blockquote details dialog div dl fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr main menu nav ol p pre section table ul".split(" "));
const PHRASING = new Set("a abbr b bdi bdo cite code data dfn em i kbd mark q s samp small span strong sub sup time u var".split(" "));

function parseHTML(src) {
  const root = { type: "el", tag: "#root", attrs: {}, cls: new Set(), children: [], parent: null, start: 0 };
  const stack = [root];
  const styles = [];
  const n = src.length;
  const top = () => stack[stack.length - 1];
  const pushText = (text, start) => { if (text) top().children.push({ type: "text", text, start, parent: top() }); };
  const openIndex = (names, bounds) => {
    for (let s = stack.length - 1; s > 0; s--) {
      if (names.includes(stack[s].tag)) return s;
      if (bounds.includes(stack[s].tag)) return -1;
    }
    return -1;
  };
  let i = 0;
  while (i < n) {
    const lt = src.indexOf("<", i);
    if (lt === -1) { pushText(src.slice(i), i); break; }
    if (lt > i) pushText(src.slice(i, lt), i);
    if (src.startsWith("<!--", lt)) { const e = src.indexOf("-->", lt + 4); i = e === -1 ? n : e + 3; continue; }
    if (src.startsWith("<![CDATA[", lt)) {
      const e = src.indexOf("]]>", lt);
      pushText(src.slice(lt + 9, e === -1 ? n : e), lt + 9);
      i = e === -1 ? n : e + 3;
      continue;
    }
    if (src[lt + 1] === "!" || src[lt + 1] === "?") { const e = src.indexOf(">", lt); i = e === -1 ? n : e + 1; continue; }
    if (src[lt + 1] === "/") {
      let j = lt + 2;
      while (j < n && !/[\s>]/.test(src[j])) j++;
      const tag = src.slice(lt + 2, j).toLowerCase();
      const e = src.indexOf(">", j);
      i = e === -1 ? n : e + 1;
      for (let s = stack.length - 1; s > 0; s--) {
        if (stack[s].tag === tag) { stack.length = s; break; }
      }
      continue;
    }
    if (!/[a-zA-Z]/.test(src[lt + 1] ?? "")) { pushText("<", lt); i = lt + 1; continue; }

    let j = lt + 1;
    while (j < n && !/[\s/>]/.test(src[j])) j++;
    const tag = src.slice(lt + 1, j).toLowerCase();
    const attrs = {};
    let selfClose = false;
    while (j < n) {
      while (j < n && /\s/.test(src[j])) j++;
      if (j >= n) break;
      if (src[j] === ">") { j++; break; }
      if (src[j] === "/") { if (src[j + 1] === ">") { selfClose = true; j += 2; break; } j++; continue; }
      let k = j;
      while (k < n && !/[\s=>]/.test(src[k]) && !(src[k] === "/" && src[k + 1] === ">")) k++;
      const name = src.slice(j, k).toLowerCase();
      j = k;
      while (j < n && /\s/.test(src[j])) j++;
      let value = "";
      if (src[j] === "=") {
        j++;
        while (j < n && /\s/.test(src[j])) j++;
        const q = src[j];
        if (q === "\"" || q === "'") {
          const e = src.indexOf(q, j + 1);
          value = src.slice(j + 1, e === -1 ? n : e);
          j = e === -1 ? n : e + 1;
        } else {
          k = j;
          while (k < n && !/[\s>]/.test(src[k])) k++;
          value = src.slice(j, k);
          j = k;
        }
      } else if (!name) {
        j++;
      }
      if (name && !(name in attrs)) attrs[name] = decode(value);
    }

    let close = -1;
    if (tag === "li") close = openIndex(["li"], ["ul", "ol", "menu"]);
    else if (tag === "dt" || tag === "dd") close = openIndex(["dt", "dd"], ["dl"]);
    else if (tag === "tr") close = openIndex(["tr"], ["table", "thead", "tbody", "tfoot"]);
    else if (tag === "td" || tag === "th") close = openIndex(["td", "th"], ["tr", "table"]);
    if (P_CLOSERS.has(tag)) {
      for (let s = stack.length - 1; s > 0; s--) {
        if (stack[s].tag === "p") { close = close > 0 ? Math.min(close, s) : s; break; }
        if (!PHRASING.has(stack[s].tag)) break;
      }
    }
    if (close > 0) stack.length = close;

    const el = {
      type: "el", tag, attrs, children: [], parent: top(), start: lt,
      cls: new Set((attrs.class ?? "").split(/\s+/).filter(Boolean)),
    };
    top().children.push(el);
    if (RAW.has(tag) && !selfClose) {
      const m = new RegExp(`</${tag}\\s*>`, "i").exec(src.slice(j));
      const end = m ? j + m.index : n;
      el.raw = src.slice(j, end);
      el.rawStart = j;
      i = m ? end + m[0].length : n;
      if (tag === "style") styles.push(el);
      continue;
    }
    if (!VOID.has(tag) && !selfClose) stack.push(el);
    i = j;
  }
  return { root, styles };
}

function* walk(node) {
  for (const c of node.children) {
    yield c;
    if (c.type === "el" && !c.raw) yield* walk(c);
  }
}
const elements = (node, pred) => [...walk(node)].filter((c) => c.type === "el" && (!pred || pred(c)));
const closest = (el, pred) => { for (let e = el; e && e.tag !== "#root"; e = e.parent) if (pred(e)) return e; return null; };
const inside = (el, anc) => { for (let e = el; e; e = e.parent) if (e === anc) return true; return false; };
function textOf(el) {
  let s = "";
  for (const c of walk(el)) if (c.type === "text" && !closest(c.parent, (e) => e.raw !== undefined)) s += decode(c.text);
  return s;
}

// ---------- CSS ----------

function parseCSS(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const rules = [];
  const imports = [];
  const skipString = (i, end) => {
    const q = css[i];
    for (i++; i < end; i++) { if (css[i] === "\\") i++; else if (css[i] === q) return i; }
    return end;
  };
  const scanTo = (i, end) => {
    let depth = 0;
    for (; i < end; i++) {
      const c = css[i];
      if (c === "\"" || c === "'") i = skipString(i, end);
      else if (c === "(") depth++;
      else if (c === ")") depth--;
      else if (depth <= 0 && (c === ";" || c === "{" || c === "}")) return i;
    }
    return end;
  };
  const matchBrace = (i, end) => {
    let depth = 0;
    for (; i < end; i++) {
      const c = css[i];
      if (c === "\"" || c === "'") i = skipString(i, end);
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) return i;
    }
    return end;
  };
  const DECL_AT = new Set(["font-face", "page", "property", "counter-style", "font-feature-values", "font-palette-values", "viewport"]);
  const parseBlock = (start, end, selector, ctx) => {
    const decls = [];
    const addDecl = (chunk, off) => {
      const c = chunk.indexOf(":");
      if (c < 0) return;
      let prop = chunk.slice(0, c).trim();
      if (!prop.startsWith("--")) prop = prop.toLowerCase();
      const value = chunk.slice(c + 1).trim().replace(/!\s*important\s*$/i, "").trim();
      decls.push({ prop, value, off: off + (chunk.length - chunk.trimStart().length) });
    };
    let i = start;
    while (i < end) {
      const j = scanTo(i, end);
      const chunk = css.slice(i, j);
      const trimmed = chunk.trim();
      if (j >= end || css[j] === "}") {
        if (trimmed && !trimmed.startsWith("@")) addDecl(chunk, i);
        i = j + 1;
        continue;
      }
      if (css[j] === ";") {
        if (/^@import\b/i.test(trimmed)) imports.push({ value: trimmed, off: i + (chunk.length - chunk.trimStart().length) });
        else if (trimmed && !trimmed.startsWith("@")) addDecl(chunk, i);
        i = j + 1;
        continue;
      }
      const close = matchBrace(j, end);
      if (trimmed.startsWith("@")) {
        const name = (/^@([\w-]+)/.exec(trimmed)?.[1] ?? "").toLowerCase();
        if (DECL_AT.has(name)) parseBlock(j + 1, close, trimmed, ctx);
        else parseBlock(j + 1, close, selector, [...ctx, trimmed]);
      } else {
        parseBlock(j + 1, close, selector ? nestSelector(selector, trimmed) : trimmed, ctx);
      }
      i = close + 1;
    }
    if (selector !== null && decls.length) rules.push({ selector, ctx, decls });
  };
  parseBlock(0, css.length, null, []);
  return { rules, imports };
}

function parseDecls(text) {
  const { rules } = parseCSS(`x{${text}}`);
  return rules.length ? rules[0].decls.map((d) => ({ ...d, off: d.off - 2 })) : [];
}

function splitTop(s) {
  const out = [];
  let depth = 0;
  let last = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) { out.push(s.slice(last, i)); last = i + 1; }
  }
  out.push(s.slice(last));
  return out.map((x) => x.trim()).filter(Boolean);
}
function nestSelector(parent, child) {
  const p = splitTop(parent).length > 1 ? `:is(${parent})` : parent;
  return splitTop(child).map((c) => (c.includes("&") ? c.replaceAll("&", p) : `${p} ${c}`)).join(", ");
}
function lastCompound(complex) {
  const s = complex.trim();
  let depth = 0;
  let i = s.length - 1;
  for (; i >= 0; i--) {
    const c = s[i];
    if (c === ")" || c === "]") depth++;
    else if (c === "(" || c === "[") depth--;
    else if (depth === 0 && /[\s>+~]/.test(c)) break;
  }
  const comp = s.slice(i + 1);
  const flat = comp.replace(/\([^()]*\)/g, "").replace(/\[[^\]]*\]/g, "");
  return {
    tag: (/^[a-zA-Z][\w-]*/.exec(flat)?.[0] ?? "").toLowerCase(),
    classes: [...flat.matchAll(/\.([\w-]+)/g)].map((m) => m[1]),
    pseudoEl: /::|:(before|after|first-line|first-letter|marker|placeholder|selection|backdrop)\b/i.test(flat),
  };
}
const lastCompounds = (sel) => splitTop(sel).map(lastCompound);
const CHROME_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "a", "sup"]);
const CHROME_CLASSES = new Set(["idx", "fig-tag", "prompt", "caret"]);
const selTargetsFigure = (sel) => lastCompounds(sel).some((c) => !c.pseudoEl && (c.tag === "figure" || c.classes.includes("fig")));
const selTargetsChrome = (sel) => lastCompounds(sel).some((c) => CHROME_TAGS.has(c.tag) || c.classes.some((k) => CHROME_CLASSES.has(k)));
const SUBJ_SEL = /\.(subj|accent)(?![\w-])|\[\s*data-subj/;
const PART_SEL = /\.part(?![\w-])/;
const strokeMaxFor = (subj, part) => (subj ? 2 : part ? 1.5 : 1);

// ---------- colour ----------

const NAMED_COLORS = new Set(("aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown " +
  "burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray " +
  "darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue " +
  "darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite " +
  "forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory " +
  "khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen " +
  "lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime " +
  "limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue " +
  "mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive " +
  "olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum " +
  "powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue " +
  "slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke " +
  "yellow yellowgreen canvas canvastext linktext visitedtext activetext buttonface buttontext buttonborder field fieldtext " +
  "highlight highlighttext selecteditem selecteditemtext graytext mark marktext accentcolor accentcolortext").split(" "));
const COLOR_FN = /(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|device-cmyk|light-dark)\(/i;
const HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/i;
const COLOR_PROP = /^(color|background(-color)?|border(-(top|right|bottom|left|block|inline))?(-(start|end))?(-color)?|outline(-color)?|fill|stroke|stop-color|flood-color|lighting-color|text-decoration(-color)?|text-emphasis(-color)?|caret-color|accent-color|column-rule(-color)?|box-shadow|text-shadow|scrollbar-color|-webkit-text-fill-color|-webkit-text-stroke(-color)?|--.+)$/;
const scrub = (v) => v
  .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, " ")
  .replace(/url\([^)]*\)/gi, " ")
  .replace(/var\(\s*--[\w-]+\s*\)/g, " ");
function findLiteral(value, prop) {
  const v = scrub(value);
  let m = HEX.exec(v);
  if (m) return m[0];
  m = COLOR_FN.exec(v);
  if (m) return `${m[0]}...)`;
  if (!prop || COLOR_PROP.test(prop)) {
    for (const id of v.match(/[a-zA-Z][\w-]*/g) ?? []) if (NAMED_COLORS.has(id.toLowerCase())) return id;
  }
  return null;
}
const normValue = (v) => v.replace(/\s+/g, " ").trim().replace(/\s*([(),])\s*/g, "$1").replace(/#[0-9a-f]+/gi, (h) => h.toLowerCase());
const isTopRoot = (rule) => rule.ctx.length === 0 && splitTop(rule.selector).every((s) => s === ":root");
function colorTokens(cssRules) {
  const map = new Map();
  for (const r of cssRules) {
    if (!isTopRoot(r)) continue;
    for (const d of r.decls) if (d.prop.startsWith("--") && findLiteral(d.value, d.prop)) map.set(d.prop, d.value);
  }
  return map;
}

// ---------- lengths ----------

function maxWidthPx(value) {
  const v = scrub(value).toLowerCase();
  let max = 0;
  for (const m of v.matchAll(/(-?\d*\.?\d+)(px|em|rem|pt|ex|ch)?(?![\w%])/g)) {
    const num = parseFloat(m[1]);
    const unit = m[2] ?? "";
    const px = unit === "em" || unit === "rem" ? num * 16 : unit === "pt" ? num * 4 / 3 : unit === "ex" || unit === "ch" ? num * 8 : num;
    max = Math.max(max, px);
  }
  if (/(?<![\w-])medium(?![\w-])/.test(v)) max = Math.max(max, 3);
  if (/(?<![\w-])thick(?![\w-])/.test(v)) max = Math.max(max, 5);
  if (/(?<![\w-])thin(?![\w-])/.test(v)) max = Math.max(max, 1);
  return max;
}
const BORDER_WIDTH_PROP = /^border(-(top|right|bottom|left|block|inline))?(-(start|end))?(-width)?$/;
const CALLOUT_PROP = /^border-(left|inline-start)(-width)?$/;
const SURFACE_PROP = /^(background(-[a-z]+)?|border(-(top|right|bottom|left|block|inline))?(-(start|end))?(-(width|style|color))?)$/;
function isSurfaceReset(prop, value) {
  const toks = value.toLowerCase().trim().split(/\s+/);
  if (prop.startsWith("background")) return toks.every((t) => t === "none" || t === "transparent");
  return toks.every((t) => t === "0" || t === "0px" || t === "none");
}

// ---------- run ----------

const src = readFileSync(file, "utf8");
const lineStarts = [0];
for (let i = 0; i < src.length; i++) if (src[i] === "\n") lineStarts.push(i + 1);
const lineOf = (off) => {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= off) lo = mid; else hi = mid - 1; }
  return lo + 1;
};

const findings = [];
function report(id, what, how) {
  if (gallery && GALLERY_SKIP.has(id)) return;
  const [sev, defHow] = RULES[id];
  findings.push({ sev, id, what, how: how ?? defHow });
}

const { root, styles } = parseHTML(src);
const all = elements(root);
const cssSheets = styles.map((s) => ({ el: s, ...parseCSS(s.raw) }));
const cssRules = cssSheets.flatMap((s) => s.rules.map((r) => ({ ...r, base: s.el.rawStart })));
const at = (el) => `line ${lineOf(el.start)}`;
const atCss = (r, d) => `line ${lineOf(r.base + d.off)}`;
const snippet = (s, n = 40) => { const t = s.replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const label = (el) => `<${el.tag}${el.attrs.class ? `.${[...el.cls].join(".")}` : ""}>`;

// colour tokens (R3)
const template = readFileSync(tokensPath, "utf8");
const expected = colorTokens(parseHTML(template).styles.flatMap((s) => parseCSS(s.raw).rules));
if (!expected.size) {
  console.error(`check-explain: no colour tokens found in the top-level :root of ${tokensPath}`);
  process.exit(2);
}
const actual = colorTokens(cssRules);
for (const [name, value] of expected) {
  if (!actual.has(name)) report("token-missing", `colour token ${name} is missing from :root (or is not a colour)`, `add ${name}: ${value} to :root`);
  else if (normValue(actual.get(name)) !== normValue(value)) report("token-changed", `${name} is ${actual.get(name)}, expected ${value}`, `set ${name}: ${value}`);
}
for (const [name, value] of actual) if (!expected.has(name)) report("token-extra", `extra colour token ${name}: ${value}`);

// CSS rules: colour literals and style rules
for (const r of cssRules) {
  const rootBlock = isTopRoot(r);
  const where = r.ctx.length ? `${r.ctx.join(" ")} { ${r.selector} }` : r.selector;
  for (const d of r.decls) {
    if (!(rootBlock && d.prop.startsWith("--"))) {
      const lit = findLiteral(d.value, d.prop);
      if (lit) report("color-literal", `${lit} in ${where} { ${d.prop} } (${atCss(r, d)})`);
    }
    checkDecl(d, {
      where: `${where} { ${d.prop}: ${snippet(d.value, 50)} } (${atCss(r, d)})`,
      figure: selTargetsFigure(r.selector),
      chrome: selTargetsChrome(r.selector),
      strokeMax: strokeMaxFor(SUBJ_SEL.test(r.selector), PART_SEL.test(r.selector)),
    });
  }
}
for (const sheet of cssSheets) {
  for (const imp of sheet.imports) report("external-load", `${snippet(imp.value, 60)} (line ${lineOf(sheet.el.rawStart + imp.off)})`);
}

function checkDecl(d, ctx) {
  const v = d.value.toLowerCase();
  if ((d.prop === "box-shadow" || d.prop === "-webkit-box-shadow") && v.trim() !== "none") report("box-shadow", ctx.where);
  if (d.prop === "filter" && v.includes("drop-shadow(")) report("box-shadow", ctx.where);
  if (/-gradient\(/.test(v)) report("gradient", ctx.where);
  if (ctx.figure && SURFACE_PROP.test(d.prop) && !isSurfaceReset(d.prop, d.value)) report("figure-surface", ctx.where);
  if (CALLOUT_PROP.test(d.prop) && maxWidthPx(d.value) >= 2) report("callout-border", ctx.where);
  if (BORDER_WIDTH_PROP.test(d.prop) && maxWidthPx(d.value) > 1) report("border-width", ctx.where);
  if (d.prop === "stroke-width") {
    const w = parseFloat(d.value);
    if (w > ctx.strokeMax) report("svg-stroke", `stroke-width ${d.value} (max ${ctx.strokeMax}) at ${ctx.where}`);
  }
  if (ctx.chrome && /var\(\s*--accent/.test(v)) report("accent-chrome", ctx.where);
  for (const m of d.value.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi)) {
    if (!isLocalUrl(m[2])) report("external-load", `url(${m[2]}) at ${ctx.where}`);
  }
}

function isLocalUrl(u) {
  const v = (u ?? "").trim();
  return v === "" || v.startsWith("#") || /^(data|blob|about):/i.test(v);
}

// element pass: inline styles, svg colour attrs, gradients, callouts, loads, links
const SVG_COLOR_ATTRS = ["fill", "stroke", "stop-color", "flood-color", "color"];
const URL_ATTRS = ["fill", "stroke", "filter", "mask", "clip-path", "marker-start", "marker-mid", "marker-end"];
const HREF_LOADS = new Set(["link", "use", "image", "feimage", "script"]);
const sourcesPart = all.find((e) => e.attrs["data-part"] === "sources" && !closest(e.parent, (a) => a.attrs["data-part"] !== undefined));
for (const el of all) {
  const subj = !!closest(el, (e) => e.cls.has("subj") || e.cls.has("accent") || "data-subj" in e.attrs);
  const strokeMax = strokeMaxFor(subj, !!closest(el, (e) => e.cls.has("part")));
  const isFig = el.tag === "figure" || el.cls.has("fig");
  const isChrome = CHROME_TAGS.has(el.tag) || [...el.cls].some((k) => CHROME_CLASSES.has(k));
  if (el.attrs.style !== undefined) {
    for (const d of parseDecls(el.attrs.style)) {
      const lit = findLiteral(d.value, d.prop);
      if (lit) report("color-literal", `${lit} in style="" on ${label(el)} (${at(el)})`);
      checkDecl(d, {
        where: `style="${snippet(el.attrs.style, 50)}" on ${label(el)} (${at(el)})`,
        figure: isFig, chrome: isChrome, strokeMax,
      });
    }
  }
  for (const a of SVG_COLOR_ATTRS) {
    if (el.attrs[a] === undefined) continue;
    const lit = findLiteral(el.attrs[a], "fill");
    if (lit) report("color-literal", `${a}="${el.attrs[a]}" on ${label(el)} (${at(el)})`);
  }
  if (el.attrs["stroke-width"] !== undefined && parseFloat(el.attrs["stroke-width"]) > strokeMax) {
    report("svg-stroke", `stroke-width="${el.attrs["stroke-width"]}" (max ${strokeMax}) on ${label(el)} (${at(el)})`);
  }
  if (el.tag === "lineargradient" || el.tag === "radialgradient") report("gradient", `<${el.tag}> (${at(el)})`);
  if (el.tag === "blockquote" || el.tag === "aside") report("callout-element", `<${el.tag}> (${at(el)})`);

  // external loads (R8)
  const loads = [];
  for (const a of ["src", "poster", "background"]) if (el.attrs[a] !== undefined) loads.push([a, el.attrs[a]]);
  if (el.attrs.data !== undefined && (el.tag === "object" || el.tag === "embed")) loads.push(["data", el.attrs.data]);
  if (el.attrs.srcset !== undefined) for (const c of el.attrs.srcset.split(",")) loads.push(["srcset", c.trim().split(/\s+/)[0]]);
  if (HREF_LOADS.has(el.tag)) for (const a of ["href", "xlink:href"]) if (el.attrs[a] !== undefined) loads.push([a, el.attrs[a]]);
  for (const a of URL_ATTRS) {
    const m = /url\(\s*(['"]?)([^'")]*)\1\s*\)/i.exec(el.attrs[a] ?? "");
    if (m) loads.push([a, m[2]]);
  }
  for (const [a, v] of loads) if (!isLocalUrl(v)) report("external-load", `${label(el)} ${a}="${snippet(v, 60)}" (${at(el)})`);
  if (el.tag === "a" && /^(https?:)?\/\//i.test(el.attrs.href ?? "") && !(sourcesPart && inside(el, sourcesPart))) {
    report("external-link", `<a href="${snippet(el.attrs.href, 60)}"> outside sources (${at(el)})`);
  }
}

// structure (R2, R9)
const parts = all.filter((e) => e.attrs["data-part"] !== undefined);
const topParts = [];
for (const p of parts) {
  const name = p.attrs["data-part"];
  if (closest(p.parent, (e) => e.attrs["data-part"] !== undefined)) { report("part-unknown", `data-part="${name}" is nested inside another part (${at(p)})`); continue; }
  if (!PART_ORDER.includes(name)) { report("part-unknown", `data-part="${name}" (${at(p)})`); continue; }
  topParts.push(p);
}
const byName = (name) => topParts.filter((p) => p.attrs["data-part"] === name);
for (const name of PART_ORDER) {
  const found = byName(name);
  if (!found.length) report("part-missing", `no data-part="${name}"`);
  else if (name !== "mechanism" && found.length > 1) report("part-duplicate", `${found.length} parts named "${name}" (${found.map(at).join(", ")})`);
}
{
  let rank = -1;
  let prev = null;
  for (const p of topParts) {
    const name = p.attrs["data-part"];
    const r = PART_ORDER.indexOf(name);
    if (r < rank || (r === rank && name === "mechanism" && prev !== "mechanism")) {
      report("part-order", `"${name}" comes after "${PART_ORDER[rank]}" (${at(p)})`);
      break;
    }
    rank = Math.max(rank, r);
    prev = name;
  }
}
const notInFigure = (el) => !closest(el, (e) => e.tag === "figure");
for (const p of byName("prompt")) {
  if (!elements(p, (e) => e.cls.has("prompt")).length) report("prompt-line", `the prompt part has no .prompt line (${at(p)})`);
}
for (const p of byName("problem")) {
  const h1 = elements(p, (e) => e.tag === "h1");
  if (h1.length !== 1) report("problem-h1", `the problem part has ${h1.length} <h1> (${at(p)})`);
  const paras = elements(p, (e) => e.tag === "p" && notInFigure(e));
  if (paras.length < 2 || paras.length > 4) report("problem-paras", `the problem part has ${paras.length} paragraphs (${at(p)})`);
  const figs = elements(p, (e) => e.tag === "figure");
  if (figs.length !== 1) report("problem-figure", `the problem part has ${figs.length} figures (${at(p)})`);
  else if (paras.some((q) => q.start > figs[0].start)) report("problem-figure", `a paragraph follows the overview figure (${at(figs[0])})`);
}
for (const p of byName("primer")) {
  const dls = elements(p, (e) => e.tag === "dl" && e.cls.has("terms"));
  const terms = dls.flatMap((dl) => elements(dl, (e) => e.tag === "dt"));
  if (!dls.length) report("primer-terms", `the primer part has no <dl class="terms"> (${at(p)})`);
  else if (terms.length < 2 || terms.length > 6) report("primer-terms", `the primer has ${terms.length} terms (${at(p)})`);
}
const steps = byName("mechanism");
steps.forEach((p, i) => {
  const figs = elements(p, (e) => e.tag === "figure");
  const paras = elements(p, (e) => e.tag === "p" && notInFigure(e));
  if (figs.length !== 1 || !paras.length) report("mechanism-figure", `step ${i + 1} has ${paras.length} paragraphs and ${figs.length} figures (${at(p)})`);
  if (p.attrs["data-step"] !== String(i + 1)) report("mechanism-step", `mechanism ${i + 1} has data-step="${p.attrs["data-step"] ?? ""}" (${at(p)})`, `set data-step="${i + 1}"`);
});
if (steps.length && (steps.length < 4 || steps.length > 7)) report("step-count", `${steps.length} mechanism steps`);
const figures = all.filter((e) => e.tag === "figure");
if (steps.length && (figures.length < steps.length + 1 || figures.length > steps.length + 2)) {
  report("figure-count", `${figures.length} figures for ${steps.length} steps (expected ${steps.length + 1} to ${steps.length + 2})`);
}

// figures (R4)
const interactive = figures.filter((f) => f.attrs["data-interactive"] !== undefined);
if (interactive.length > 1) report("fig-interactive", `${interactive.length} data-interactive figures (${interactive.map(at).join(", ")})`);
const nonEmpty = (v) => typeof v === "string" && v.trim() !== "";
function figBodies(fig) {
  const out = [];
  const visit = (node) => {
    for (const c of node.children) {
      if (c.type !== "el" || c.tag === "figcaption" || c.cls.has("fig-head")) continue;
      if (c.tag === "svg" && !c.cls.has("ah")) out.push(c);
      else if (c.cls.has("ascii") || c.attrs.role === "img" || c.tag === "table") out.push(c);
      else visit(c);
    }
  };
  visit(fig);
  return out;
}
function bodyProblem(b, isInteractive, kind) {
  if (b.tag === "table") return kind === "table" ? null : `a <table> body needs data-kind="table" (got "${kind ?? ""}")`;
  const labelled = b.attrs.role === "img" && nonEmpty(b.attrs["aria-label"]);
  if (b.tag === "svg") {
    if (labelled) return null;
    if (isInteractive && b.children.some((c) => c.tag === "title" && textOf(c).trim())) return null;
    return isInteractive ? "svg has neither a <title> nor role=img with aria-label" : "svg lacks role=\"img\" with a non-empty aria-label";
  }
  if (b.cls.has("ascii")) {
    if (!labelled) return ".ascii lacks role=\"img\" with a non-empty aria-label";
    if (!b.children.some((c) => c.tag === "pre" && c.attrs["aria-hidden"] === "true")) return ".ascii has no direct <pre aria-hidden=\"true\">";
    return null;
  }
  return nonEmpty(b.attrs["aria-label"]) ? null : `${label(b)} role="img" has no aria-label`;
}
figures.forEach((fig, i) => {
  const name = `FIG ${i + 1} (${at(fig)})`;
  const isInteractive = fig.attrs["data-interactive"] !== undefined;
  if (!fig.cls.has("fig")) report("fig-class", `${name} <figure> has no class="fig"`);
  if (!FIG_KINDS.has(fig.attrs["data-kind"] ?? "")) report("fig-kind", `${name} data-kind="${fig.attrs["data-kind"] ?? ""}"`);
  const tags = elements(fig, (e) => e.cls.has("fig-tag"));
  if (tags.length !== 1) report("fig-tag", `${name} has ${tags.length} .fig-tag`);
  else {
    const t = textOf(tags[0]).trim();
    const m = /^FIG\. (\d+)$/.exec(t);
    if (!m) report("fig-tag", `${name} tag reads "${snippet(t)}"`, `write it as "FIG. ${i + 1}"`);
    else if (Number(m[1]) !== i + 1) report("fig-order", `${name} is tagged "${t}"`, `tag it "FIG. ${i + 1}"`);
  }
  const caps = elements(fig, (e) => e.tag === "figcaption");
  if (caps.length !== 1) report("fig-caption", `${name} has ${caps.length} <figcaption>`);
  if (fig.attrs.role !== undefined) report("fig-role", `${name} <figure role="${fig.attrs.role}">`);
  const bodies = figBodies(fig);
  const problems = bodies.map((b) => [b, bodyProblem(b, isInteractive, fig.attrs["data-kind"])]).filter(([, p]) => p);
  const valid = bodies.length - problems.length;
  for (const [b, p] of problems) report("fig-body", `${name} ${p} (${at(b)})`);
  if (!bodies.length) report("fig-body", `${name} has no body`);
  else if (!problems.length && valid > 1 && !isInteractive && fig.attrs["data-kind"] !== "panel") report("fig-body", `${name} has ${valid} bodies`, "keep one body per figure, or split it into two figures");
  for (const b of bodies) {
    if (b.tag !== "svg") continue;
    const vb = (b.attrs.viewbox ?? "").trim().split(/[\s,]+/);
    if (vb.length !== 4) report("svg-size", `${name} body svg has no viewBox (${at(b)})`);
    else if (b.attrs.width === undefined || b.attrs.width.trim().endsWith("%") || parseFloat(b.attrs.width) !== parseFloat(vb[2])) {
      report("svg-size", `${name} body svg width="${b.attrs.width ?? ""}" but viewBox width ${vb[2]} (${at(b)})`, `set width="${vb[2]}" and keep max-width:100%`);
    }
  }
  if (isInteractive) {
    for (const c of elements(fig, (e) => ["input", "select", "textarea", "button"].includes(e.tag))) {
      const ok = nonEmpty(c.attrs["aria-label"]) || nonEmpty(c.attrs["aria-labelledby"]) || nonEmpty(c.attrs.title)
        || closest(c, (e) => e.tag === "label")
        || (c.attrs.id && all.some((e) => e.tag === "label" && e.attrs.for === c.attrs.id))
        || (c.tag === "button" && textOf(c).trim());
      if (!ok) report("fig-control", `${name} unlabelled <${c.tag}> (${at(c)})`);
    }
  }
});

// ascii width (R4): strip tags, decode entities, svg.ah counts as 1 column
for (const pre of all.filter((e) => e.tag === "pre" && closest(e.parent, (a) => a.cls.has("ascii")))) {
  let s = "";
  const visit = (node) => {
    for (const c of node.children) {
      if (c.type === "text") s += decode(c.text);
      else if (c.tag === "svg") { if (c.cls.has("ah")) s += "▸"; }
      else if (c.raw === undefined) visit(c);
    }
  };
  visit(pre);
  if (s.startsWith("\r\n")) s = s.slice(2);
  else if (s.startsWith("\n")) s = s.slice(1);
  const fig = closest(pre, (e) => e.tag === "figure");
  const figName = fig ? `FIG ${figures.indexOf(fig) + 1}` : "ascii";
  s.split(/\r?\n/).forEach((line, k) => {
    let cols = 0;
    for (const ch of line) cols = ch === "\t" ? cols + 8 - (cols % 8) : cols + 1;
    if (cols > 56) report("ascii-width", `${figName} line ${k + 1} is ${cols} columns (max 56) (line ${lineOf(pre.start) + k})`);
  });
}

// box-drawing text in a figure pre (R4): draw it with scripts/ascii-figure.mjs instead
for (const pre of all.filter((e) => e.tag === "pre" && closest(e.parent, (a) => a.tag === "figure" && a.cls.has("fig")))) {
  const t = textOf(pre);
  const hit = /[\u2500-\u257f\u25b8\u25c2\u25b4\u25be\u25b6\u25c0]/u.exec(t)
    || (elements(pre, (e) => e.tag === "svg" && e.cls.has("ah")).length ? ["svg.ah"] : null);
  if (hit) {
    const fig = closest(pre, (e) => e.tag === "figure");
    report("ascii-pre", `FIG ${figures.indexOf(fig) + 1} <pre> holds "${hit[0]}" (${at(pre)})`);
  }
}

// refs and sources (R5)
const ids = new Map(all.filter((e) => e.attrs.id !== undefined).map((e) => [e.attrs.id, e]));
for (const sup of all.filter((e) => e.tag === "sup" && e.cls.has("ref"))) {
  const a = elements(sup, (e) => e.tag === "a" && (e.attrs.href ?? "").startsWith("#"))[0];
  if (!a) { report("ref-unresolved", `<sup class="ref"> without an <a href="#sN"> (${at(sup)})`); continue; }
  const target = ids.get(a.attrs.href.slice(1));
  if (!target) report("ref-unresolved", `ref ${a.attrs.href} has no target (${at(sup)})`);
  else if (!sourcesPart || !inside(target, sourcesPart)) report("ref-unresolved", `ref ${a.attrs.href} points outside the sources part (${at(sup)})`);
}
if (sourcesPart) {
  const optOut = all.find((e) => e.attrs["data-no-sources"] !== undefined);
  if (optOut && !nonEmpty(optOut.attrs["data-no-sources"])) report("sources-count", `data-no-sources is empty (${at(optOut)})`, "give the reason: data-no-sources=\"<why>\"");
  else if (!optOut) {
    const items = elements(sourcesPart, (e) => e.tag === "ol" && e.cls.has("sources")).flatMap((ol) => elements(ol, (e) => e.tag === "li"));
    if (items.length < 2) report("sources-count", `${items.length} sources (${at(sourcesPart)})`);
  }
}

// prose: words and em dashes (R9)
const body = all.find((e) => e.tag === "body") ?? root;
const SKIP_PROSE = (e) => ["svg", "pre", "script", "style", "title", "head"].includes(e.tag) || e.attrs.role === "img" || e.attrs["aria-hidden"] === "true";
let words = 0;
const dashed = new Map();
for (const node of walk(body)) {
  if (node.type !== "text" || closest(node.parent, SKIP_PROSE)) continue;
  const t = decode(node.text);
  if (!(sourcesPart && inside(node.parent, sourcesPart))) words += (t.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) ?? []).length;
  if (t.includes("—") && !closest(node.parent, (e) => ["code", "kbd", "samp"].includes(e.tag))) {
    const host = closest(node.parent, (e) => ["p", "li", "dd", "dt", "figcaption", "h1", "h2", "h3", "h4", "td", "th"].includes(e.tag)) ?? node.parent;
    if (!dashed.has(host)) dashed.set(host, t);
  }
}
if (words > 1600) report("word-count", `${words} prose words (over 1,600)`);
for (const [host, t] of dashed) {
  const k = t.indexOf("—");
  report("em-dash", `em dash in ${label(host)} "${snippet(t.slice(Math.max(0, k - 20), k + 20))}" (${at(host)})`);
}

// accent hooks in prose (R3): at most one per part, outside figures
const isHook = (e) => e.cls.has("subj") || e.cls.has("val") || e.attrs["data-subj"] !== undefined;
for (const part of topParts) {
  const hooks = elements(part, (e) => isHook(e) && !closest(e, (a) => a.tag === "figure") && !closest(e.parent, isHook));
  if (hooks.length > 1) {
    const words = hooks.slice(0, 4).map((h) => `"${snippet(textOf(h), 20)}"`).join(", ");
    report("accent-prose", `${hooks.length} accent hooks in the prose of data-part="${part.attrs["data-part"]}": ${words}${hooks.length > 4 ? ", ..." : ""} (${at(part)})`);
  }
}

// ---------- output ----------

const sevRank = { FAIL: 0, WARN: 1 };
findings.sort((a, b) => sevRank[a.sev] - sevRank[b.sev]);
for (const f of findings) console.log(`${f.sev} ${f.id}: ${f.what} -> ${f.how}`);
const fails = findings.filter((f) => f.sev === "FAIL").length;
const warns = findings.length - fails;
console.log(`check-explain: ${fails} FAIL, ${warns} WARN in ${file}${gallery ? " (gallery)" : ""}`);
process.exit(fails ? 1 : 0);
