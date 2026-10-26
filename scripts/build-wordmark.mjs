// Draws the hero's name, "ฟ้า" and "ใส", as SVG paths from Anuphan Bold with its corners rounded a little,
// so the hollow letters match the soft tooth between them. CSS cannot round a font's corners, so the outlines
// are taken from the font once and written to src/content/wordmark.ts.
//
//   node scripts/build-wordmark.mjs
//
// It needs a static Anuphan Bold with the Thai glyphs. next/font downloads the variable font when the dev
// server first runs; pin it at weight 700 with fontTools (see scripts/fonts/README.md).
import { writeFileSync } from 'node:fs';
import * as fontkit from 'fontkit';

const FONT = 'scripts/fonts/anuphan-700-thai.ttf';
const WORDS = ['ฟ้า', 'ใส'];
const RADIUS = 22; // font units of a 1000-unit em: about 5 px at the hero's size
// a little air between letters: each word is one shape, so letters that touch would merge into one outline
const TRACKING = 24;
const STEP = 6; // how finely curves are walked, in font units

const font = fontkit.openSync(FONT);

// a glyph outline as closed polylines, each point marked as a corner or as part of a smooth curve
function contours(path, dx, dy) {
  const out = [];
  let pts = null;
  let pen = null;
  const push = (x, y, corner) => pts.push({ x: x + dx, y: y + dy, corner });
  for (const c of path.commands) {
    const a = c.args;
    if (c.command === 'moveTo') {
      pts = [];
      out.push(pts);
      pen = [a[0], a[1]];
      push(a[0], a[1], true);
    } else if (c.command === 'lineTo') {
      pen = [a[0], a[1]];
      push(a[0], a[1], true);
    } else if (c.command === 'quadraticCurveTo' || c.command === 'bezierCurveTo') {
      const [x0, y0] = pen;
      const ctrl = c.command === 'quadraticCurveTo'
        ? [[x0, y0], [a[0], a[1]], [a[2], a[3]]]
        : [[x0, y0], [a[0], a[1]], [a[2], a[3]], [a[4], a[5]]];
      const end = ctrl[ctrl.length - 1];
      const n = Math.max(2, Math.ceil(Math.hypot(end[0] - x0, end[1] - y0) / STEP));
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        // de Casteljau
        let p = ctrl.map((q) => [...q]);
        while (p.length > 1) p = p.slice(1).map((q, j) => [p[j][0] + (q[0] - p[j][0]) * t, p[j][1] + (q[1] - p[j][1]) * t]);
        push(p[0][0], p[0][1], i === n);
      }
      pen = end;
    } else if (c.command === 'closePath' && pts.length > 1) {
      const f = pts[0];
      const l = pts[pts.length - 1];
      if (Math.hypot(f.x - l.x, f.y - l.y) < 0.5) pts.pop();
    }
  }
  return out;
}

// replace each sharp corner with a quadratic arc from RADIUS back along the outline to RADIUS on (less when the
// next corner is close, so arcs never overlap)
function round(raw) {
  const turn = (i) => {
    const n = raw.length;
    const a = raw[(i - 1 + n) % n];
    const p = raw[i];
    const b = raw[(i + 1) % n];
    const u = [p.x - a.x, p.y - a.y];
    const v = [b.x - p.x, b.y - p.y];
    const cos = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1);
    return Math.acos(Math.max(-1, Math.min(1, cos)));
  };
  const first = raw.findIndex((p, i) => p.corner && turn(i) > SHARP);
  if (first < 0) return raw;
  // start the walk on a corner
  const pts = [...raw.slice(first), ...raw.slice(0, first)];
  const n = pts.length;
  const sharp = pts.map((p, i) => i === 0 || (p.corner && turn(i) > SHARP));
  const at = [0];
  for (let i = 1; i <= n; i++) at.push(at[i - 1] + Math.hypot(pts[i % n].x - pts[i - 1].x, pts[i % n].y - pts[i - 1].y));
  const total = at[n];
  const corners = pts.map((_, i) => i).filter((i) => sharp[i]);
  const cut = corners.map((k, j) => {
    const prev = corners[(j - 1 + corners.length) % corners.length];
    const next = corners[(j + 1) % corners.length];
    const before = (at[k] - at[prev] + total) % total || total;
    const after = (at[next] - at[k] + total) % total || total;
    return Math.min(RADIUS, before * 0.45, after * 0.45);
  });
  // the point s along the outline
  const pointAt = (s) => {
    s = ((s % total) + total) % total;
    let i = 0;
    while (at[i + 1] < s) i++;
    const t = (s - at[i]) / (at[i + 1] - at[i] || 1);
    const a = pts[i];
    const b = pts[(i + 1) % n];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  };
  const out = [];
  const dropped = (i) => corners.some((k, j) => {
    const d = Math.min(Math.abs(at[i] - at[k]), total - Math.abs(at[i] - at[k]));
    return k !== i && d < cut[j];
  });
  for (let i = 0; i < n; i++) {
    const j = corners.indexOf(i);
    if (j >= 0) {
      const a = pointAt(at[i] - cut[j]);
      const b = pointAt(at[i] + cut[j]);
      const p = pts[i];
      for (let s = 0; s <= 6; s++) {
        const t = s / 6;
        out.push({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * p.x + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * p.y + t * t * b.y });
      }
    } else if (!dropped(i)) out.push(pts[i]);
  }
  return out;
}
const SHARP = (25 * Math.PI) / 180;

const words = WORDS.map((text) => {
  const run = font.layout(text);
  let x = 0;
  const shapes = [];
  run.glyphs.forEach((g, i) => {
    const pos = run.positions[i];
    shapes.push(...contours(g.path, x + pos.xOffset, pos.yOffset).map(round));
    x += pos.xAdvance + (pos.xAdvance ? TRACKING : 0);
  });
  const all = shapes.flat();
  const minX = Math.min(...all.map((p) => p.x));
  const maxX = Math.max(...all.map((p) => p.x));
  const maxY = Math.max(...all.map((p) => p.y));
  const minY = Math.min(...all.map((p) => p.y));
  // SVG runs y down: the baseline is y 0 and the box's foot, the ink starts at x 0
  const f = (v) => Math.round(v * 10) / 10;
  const d = shapes.map((c) => `M${c.map((p) => `${f(p.x - minX)} ${f(-p.y)}`).join('L')}Z`).join('');
  return { text, d, width: f(maxX - minX), height: f(maxY), below: f(-minY) };
});

writeFileSync('src/content/wordmark.ts', `// Generated by scripts/build-wordmark.mjs from Anuphan Bold, corners rounded by ${RADIUS}/1000 em. Do not edit.
// Each word's box is its ink: x from 0 to width, y from -height to the baseline at 0, in 1000-unit em.
export const wordmark = ${JSON.stringify({ em: font.unitsPerEm, words }, null, 2)} as const;
`);
console.log(words.map((w) => `${w.text}: ${w.width}×${w.height}, ${w.d.length} chars`).join('\n'));
