// Layout probe for a jm-explain page. One expression; run it with
//   agent-browser --json eval --stdin < probe.js     (result at .data.result)
// Returns {ok, overlaps, overflows, smallText, bigText, hscroll}. Lists are capped
// at 20 entries; ok is computed before capping. bigText is only measured when
// innerWidth >= 1000 (a figure drawn larger than its viewBox shows up there).
(() => {
  const CAP = 20;
  const MIN_PX = 9;
  const MAX_PX = 16;
  const wide = innerWidth >= 1000;
  const r1 = (n) => Math.round(n * 10) / 10;
  const snip = (s) => { const t = (s || "").replace(/\s+/g, " ").trim(); return t.length > 28 ? t.slice(0, 27) + "…" : t; };
  const figs = [...document.querySelectorAll("figure")];
  const figIndex = (el) => figs.indexOf(el.closest("figure")) + 1;

  const shown = (el, stop) => {
    for (let e = el; e && e !== stop.parentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.opacity === "0") return false;
      if (e === el && cs.visibility !== "visible") return false;
    }
    return true;
  };
  const hiddenControl = (el) => {
    const h = el.closest('[aria-hidden="true"]');
    return !!h && !h.matches("pre, .ascii pre") && !h.closest("pre");
  };
  const svgScale = (t) => { const m = t.getScreenCTM(); return m ? Math.hypot(m.a, m.b) : 1; };
  const outerSvg = (t) => { let s = t.ownerSVGElement; while (s && s.ownerSVGElement) s = s.ownerSVGElement; return s; };
  const area = (r) => r.width * r.height;
  const mid = (r) => ({ left: r.left, right: r.right, top: r.top + r.height * 0.15, bottom: r.bottom - r.height * 0.15, width: r.width, height: r.height * 0.7 });

  const overlaps = [];
  const overflows = [];
  const smallText = [];
  const bigText = [];

  figs.forEach((fig, fi) => {
    const boxes = [];
    // SVG <text>
    for (const t of fig.querySelectorAll("svg text")) {
      if (t.closest("svg.ah") || !shown(t, fig) || hiddenControl(t)) continue;
      const r = t.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      boxes.push({ key: t, text: t.textContent, r });
      const svg = outerSvg(t);
      if (svg) {
        const s = svg.getBoundingClientRect();
        const by = Math.max(s.left - r.left, r.right - s.right, s.top - r.top, r.bottom - s.bottom);
        if (by > 1) overflows.push({ fig: fi + 1, text: snip(t.textContent), by: r1(by) });
      }
      const px = parseFloat(getComputedStyle(t).fontSize) * svgScale(t);
      if (px < MIN_PX) smallText.push({ fig: fi + 1, text: snip(t.textContent), px: r1(px) });
      if (wide && px > MAX_PX) bigText.push({ fig: fi + 1, text: snip(t.textContent), px: r1(px) });
    }
    // HTML text inside the figure: size for all, Range rects for div-grid bodies
    const walker = document.createTreeWalker(fig, NodeFilter.SHOW_TEXT);
    const sized = new Set();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const host = n.parentElement;
      if (!host || host.closest("svg") || !shown(host, fig) || hiddenControl(host)) continue;
      if (!sized.has(host)) {
        sized.add(host);
        const px = parseFloat(getComputedStyle(host).fontSize);
        if (px < MIN_PX) smallText.push({ fig: fi + 1, text: snip(n.textContent), px: r1(px) });
        if (wide && px > MAX_PX) bigText.push({ fig: fi + 1, text: snip(n.textContent), px: r1(px) });
      }
      if (host.closest("pre, .fig-head, figcaption")) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width && r.height) boxes.push({ key: n, text: n.textContent, r });
    }
    // pairwise overlap, middle 70% height, ignore < 2px or < 10% of the smaller box
    for (let a = 0; a < boxes.length; a++) {
      for (let b = a + 1; b < boxes.length; b++) {
        if (boxes[a].key === boxes[b].key) continue;
        const A = mid(boxes[a].r);
        const B = mid(boxes[b].r);
        const ix = Math.min(A.right, B.right) - Math.max(A.left, B.left);
        const iy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
        if (ix < 2 || iy < 2) continue;
        if (ix * iy < 0.1 * Math.min(area(A), area(B))) continue;
        overlaps.push({ fig: fi + 1, a: snip(boxes[a].text), b: snip(boxes[b].text), px: [r1(ix), r1(iy)] });
      }
    }
  });

  for (const pre of document.querySelectorAll("pre")) {
    if (pre.scrollWidth > pre.clientWidth + 2) {
      overflows.push({ fig: figIndex(pre) || null, pre: snip(pre.textContent), scrollWidth: pre.scrollWidth, clientWidth: pre.clientWidth });
    }
  }

  const de = document.documentElement;
  const hscroll = de.scrollWidth > de.clientWidth;
  const ok = !overlaps.length && !overflows.length && !smallText.length && !bigText.length && !hscroll;
  return {
    ok,
    overlaps: overlaps.slice(0, CAP),
    overflows: overflows.slice(0, CAP),
    smallText: smallText.slice(0, CAP),
    bigText: bigText.slice(0, CAP),
    hscroll,
  };
})()
