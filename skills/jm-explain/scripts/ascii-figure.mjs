#!/usr/bin/env node
// Render a box-drawing text diagram as an SVG on an exact character grid.
// Lines, corners, junctions and arrowheads become SVG paths, so they join in any font.
// Usage: node ascii-figure.mjs --label "What the figure shows" < diagram.txt
//        node ascii-figure.mjs --label "..." diagram.txt
// Mark the subject with ⟦ ⟧: its text and lines render in the accent. Each marker takes one column,
// so a source lined up by eye renders lined up: the marker cell draws as a space, or as the line it
// sits inside (──⟦──▸⟧ stays one unbroken line).
import { readFileSync } from 'node:fs';

const MAX_COLS = 56;
const CW = 8.4; // cell width in px: 0.6em of a 14px mono
const CH = 16.8; // cell height in px: 1.2em
const r2 = (n) => Math.round(n * 100) / 100;

const args = process.argv.slice(2);
let label = '';
let file = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--label') label = args[++i] ?? '';
  else if (args[i] === '--help' || args[i] === '-h') {
    console.log('Usage: node ascii-figure.mjs --label "<what the figure shows>" [diagram.txt]   (reads stdin without a file)');
    process.exit(0);
  } else file = args[i];
}
if (!label.trim()) {
  console.error('ascii-figure: --label is required; it becomes the aria-label screen readers announce. Example: --label "Request flows from browser to resolver"');
  process.exit(1);
}

const src = readFileSync(file ?? 0, 'utf8').replace(/\t/g, '    ').replace(/\s+$/, '');

// Connections per glyph: L R U D, and whether the line is dashed.
const SOLID = {
  '─': 'LR', '━': 'LR', '│': 'UD', '┃': 'UD',
  '┌': 'RD', '╭': 'RD', '┐': 'LD', '╮': 'LD', '└': 'RU', '╰': 'RU', '┘': 'LU', '╯': 'LU',
  '├': 'UDR', '┤': 'UDL', '┬': 'LRD', '┴': 'LRU', '┼': 'LRUD',
};
const DASHED = { '┄': 'LR', '┈': 'LR', '╌': 'LR', '┆': 'UD', '┊': 'UD', '╎': 'UD' };
const ARROW = { '▸': 'R', '▶': 'R', '→': 'R', '◂': 'L', '◀': 'L', '←': 'L', '▴': 'U', '▲': 'U', '↑': 'U', '▾': 'D', '▼': 'D', '↓': 'D' };
const MARK = '\u0000';

// Parse ⟦ ⟧ markers into a per-cell subject flag.
const grid = [];
const subj = [];
let inSubj = false;
for (const line of src.split('\n')) {
  const row = [];
  const flags = [];
  for (const ch of line) {
    if (ch === '⟦' || ch === '⟧') { row.push(MARK); flags.push(true); inSubj = ch === '⟦'; continue; }
    row.push(ch);
    flags.push(inSubj);
  }
  grid.push(row);
  subj.push(flags);
}
if (inSubj) {
  console.error('ascii-figure: a ⟦ has no closing ⟧. Close every subject marker on the same figure.');
  process.exit(1);
}

// A marker cell inside a horizontal line continues that line; anywhere else it is a space.
for (const row of grid) {
  row.forEach((ch, c) => {
    if (ch !== MARK) return;
    let l = c - 1; while (row[l] === MARK) l--;
    let r = c + 1; while (row[r] === MARK) r++;
    const left = row[l], right = row[r];
    const conn = (g) => SOLID[g] ?? DASHED[g] ?? '';
    const joinsL = conn(left).includes('R') || ARROW[left] === 'L';
    const joinsR = conn(right).includes('L') || ARROW[right] === 'R';
    row[c] = joinsL && joinsR ? (left in DASHED || right in DASHED ? '┄' : '─') : ' ';
  });
}

const rows = grid.length;
const cols = Math.max(...grid.map((r) => r.length));
const wide = grid.map((r, i) => [i + 1, r.length]).filter(([, n]) => n > MAX_COLS);
if (wide.length) {
  console.error(`ascii-figure: ${wide.map(([i, n]) => `line ${i} has ${n} columns`).join(', ')}; the limit is ${MAX_COLS} so labels stay at 9px or more on a 390px screen. Shorten labels or split the figure.`);
  process.exit(1);
}

const at = (r, c) => (grid[r] && grid[r][c]) || ' ';
const isDashed = (ch) => ch in DASHED;

// Half-segments: each cell contributes centre-to-edge pieces; merging them gives long clean lines.
const hSegs = []; // {r, x1, x2, dash, subj}
const vSegs = []; // {c, y1, y2, dash, subj}
const heads = []; // {r, c, dir, subj}
const texts = []; // {r, c, s, subj}

for (let r = 0; r < rows; r++) {
  let run = null;
  const flush = () => { if (run) { texts.push(run); run = null; } };
  for (let c = 0; c < cols; c++) {
    const ch = at(r, c);
    const s = subj[r][c] ?? false;
    const conn = SOLID[ch] ?? DASHED[ch];
    if (conn) {
      flush();
      const dash = isDashed(ch);
      const cx = c * CW + CW / 2;
      const cy = r * CH + CH / 2;
      if (conn.includes('L')) hSegs.push({ r, x1: c * CW, x2: cx, dash, subj: s });
      if (conn.includes('R')) hSegs.push({ r, x1: cx, x2: (c + 1) * CW, dash, subj: s });
      if (conn.includes('U')) vSegs.push({ c, y1: r * CH, y2: cy, dash, subj: s });
      if (conn.includes('D')) vSegs.push({ c, y1: cy, y2: (r + 1) * CH, dash, subj: s });
      continue;
    }
    // An arrow glyph is a drawn arrowhead only when a line runs into it; inside a label (`1 → 0`) it stays text.
    const tail = ARROW[ch] && { R: at(r, c - 1), L: at(r, c + 1), D: at(r - 1, c), U: at(r + 1, c) }[ARROW[ch]];
    if (ARROW[ch] && (SOLID[tail] || DASHED[tail])) {
      flush();
      const dir = ARROW[ch];
      // The shaft inside the arrow cell takes the style of the line it continues.
      const from = tail;
      const dash = isDashed(from);
      const cx = c * CW + CW / 2;
      const cy = r * CH + CH / 2;
      if (dir === 'R') hSegs.push({ r, x1: c * CW, x2: cx, dash, subj: s });
      if (dir === 'L') hSegs.push({ r, x1: cx, x2: (c + 1) * CW, dash, subj: s });
      if (dir === 'D') vSegs.push({ c, y1: r * CH, y2: cy, dash, subj: s });
      if (dir === 'U') vSegs.push({ c, y1: cy, y2: (r + 1) * CH, dash, subj: s });
      heads.push({ r, c, dir, subj: s });
      continue;
    }
    if (ch === ' ') {
      // Two spaces end a text run; one space stays inside it ("reader in shop").
      if (run && at(r, c + 1) !== ' ' && !SOLID[at(r, c + 1)] && !DASHED[at(r, c + 1)] && c + 1 < cols) {
        run.s += ' ';
        continue;
      }
      flush();
      continue;
    }
    if (run && run.subj !== s) flush();
    if (!run) run = { r, c, s: '', subj: s };
    run.s += ch;
  }
  flush();
}

// A label touching a box wall reads as cramped and can collide at small sizes: warn, keep going.
const isWall = (g) => (SOLID[g] ?? DASHED[g] ?? '').includes('U');
const touching = texts.filter((t) => isWall(at(t.r, t.c - 1)) || isWall(at(t.r, t.c + [...t.s].length)));
for (const t of touching) {
  console.error(`ascii-figure: warning: line ${t.r + 1}, "${t.s}" touches a box wall; leave at least one space on each side.`);
}

// Merge touching collinear pieces with the same style.
function merge(segs, key, a, b) {
  segs.sort((p, q) => p[key] - q[key] || (p.dash - q.dash) || (p.subj - q.subj) || p[a] - q[a]);
  const out = [];
  for (const s of segs) {
    const last = out[out.length - 1];
    if (last && last[key] === s[key] && last.dash === s.dash && last.subj === s.subj && Math.abs(last[b] - s[a]) < 0.01) last[b] = Math.max(last[b], s[b]);
    else out.push({ ...s });
  }
  return out;
}
const H = merge(hSegs, 'r', 'x1', 'x2');
const V = merge(vSegs, 'c', 'y1', 'y2');

// Arrow cells: pull the shaft back so it ends inside the triangle, not past its tip.
const AW = 5.6; // triangle length along the shaft
const AH = 3.2; // half width across the shaft
function headPath({ r, c, dir }) {
  const x0 = c * CW, x1 = (c + 1) * CW, y0 = r * CH, y1 = (r + 1) * CH;
  const cx = x0 + CW / 2, cy = y0 + CH / 2;
  const p = {
    R: [[x1 - 0.4, cy], [x1 - 0.4 - AW, cy - AH], [x1 - 0.4 - AW, cy + AH]],
    L: [[x0 + 0.4, cy], [x0 + 0.4 + AW, cy - AH], [x0 + 0.4 + AW, cy + AH]],
    D: [[cx, y1 - 0.4], [cx - AH, y1 - 0.4 - AW], [cx + AH, y1 - 0.4 - AW]],
    U: [[cx, y0 + 0.4], [cx - AH, y0 + 0.4 + AW], [cx + AH, y0 + 0.4 + AW]],
  }[dir];
  return `M${p.map(([x, y]) => `${r2(x)} ${r2(y)}`).join(' L')} Z`;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cls = (base, s, dash) => [base, dash ? 'dash' : '', s ? 'subj' : ''].filter(Boolean).join(' ');
const W = r2(cols * CW);
const Ht = r2(rows * CH);

const out = [];
out.push(`<svg class="grid" role="img" aria-label="${esc(label)}" viewBox="0 0 ${W} ${Ht}" width="${W}" height="${Ht}">`);
for (const s of H) out.push(`<path class="${cls('ln', s.subj, s.dash)}" d="M${r2(s.x1)} ${r2(s.r * CH + CH / 2)}H${r2(s.x2)}"/>`);
for (const s of V) out.push(`<path class="${cls('ln', s.subj, s.dash)}" d="M${r2(s.c * CW + CW / 2)} ${r2(s.y1)}V${r2(s.y2)}"/>`);
for (const h of heads) out.push(`<path class="${cls('hd', h.subj)}" d="${headPath(h)}"/>`);
for (const t of texts) {
  const s = t.s.replace(/\s+$/, '');
  out.push(`<text class="${cls('tx', t.subj)}" x="${r2(t.c * CW)}" y="${r2(t.r * CH + CH / 2)}" textLength="${r2(s.length * CW)}">${esc(s)}</text>`);
}
out.push('</svg>');
process.stdout.write(out.join('\n') + '\n');
