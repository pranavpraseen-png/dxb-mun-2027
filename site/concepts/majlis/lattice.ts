// Mashrabiya geometry, built properly rather than drawn freehand.
// Underlying tiling: the 4.8.8 (truncated square) tiling, regular octagons + squares.
// Pattern lines: Hankin's "polygons in contact" method. From every edge midpoint two rays
// leave at the contact angle THETA; rays meet on the polygon's centre-to-vertex lines.
// Octagons yield 8-point stars, squares yield 4-point stars, and every line runs straight
// through the shared midpoints, so the lattice is continuous across tiles.

export type Pt = [number, number];

const rad = (d: number) => (d * Math.PI) / 180;

/** Vertices of a regular n-gon with the given apothem; `phase` is the angle of the first vertex. */
function regular(cx: number, cy: number, n: number, apothem: number, phase: number): Pt[] {
  const r = apothem / Math.cos(Math.PI / n);
  return Array.from({ length: n }, (_, i) => {
    const a = rad(phase) + (i * 2 * Math.PI) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Pt;
  });
}

const rot = ([x, y]: Pt, a: number): Pt => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/** Intersection of ray p + t·d with the line through a and b. */
function meet(p: Pt, d: Pt, a: Pt, b: Pt): Pt {
  const e: Pt = [b[0] - a[0], b[1] - a[1]];
  const den = d[0] * e[1] - d[1] * e[0];
  const t = ((a[0] - p[0]) * e[1] - (a[1] - p[1]) * e[0]) / den;
  return [p[0] + t * d[0], p[1] + t * d[1]];
}

/** Hankin star for one polygon: alternating edge midpoints (outer points) and contact points (inner). */
function hankin(c: Pt, v: Pt[], theta: number): Pt[] {
  const n = v.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = v[i];
    const b = v[(i + 1) % n];
    const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const len = Math.hypot(b[0] - m[0], b[1] - m[1]);
    const u: Pt = [(b[0] - m[0]) / len, (b[1] - m[1]) / len];
    // Turn toward the polygon's interior, whichever way that is.
    const r1 = rot(u, rad(theta));
    const r2 = rot(u, -rad(theta));
    const toC: Pt = [c[0] - m[0], c[1] - m[1]];
    const d = r1[0] * toC[0] + r1[1] * toC[1] > r2[0] * toC[0] + r2[1] * toC[1] ? r1 : r2;
    out.push(m, meet(m, d, c, b));
  }
  return out;
}

export type LatticeGeometry = { eights: Pt[][]; fours: Pt[][]; width: number; height: number };

/**
 * A cols × rows field of unit cells (each `cell` wide). Octagons sit at cell centres,
 * squares (rotated 45°) at cell corners. Shapes that cross the field edge are kept whole;
 * the SVG viewBox crops them.
 */
export function lattice(cols: number, rows: number, theta = 67.5, cell = 100): LatticeGeometry {
  const half = cell / 2;
  const sqApothem = cell / Math.SQRT2 - half; // gap between octagon diagonals
  const eights: Pt[][] = [];
  const fours: Pt[][] = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const c: Pt = [i * cell + half, j * cell + half];
      eights.push(hankin(c, regular(c[0], c[1], 8, half, 22.5), theta));
    }
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= cols; i++) {
      const c: Pt = [i * cell, j * cell];
      fours.push(hankin(c, regular(c[0], c[1], 4, sqApothem, 0), theta));
    }
  return { eights, fours, width: cols * cell, height: rows * cell };
}

const f = (n: number) => Math.round(n * 100) / 100;
export const toPath = (polys: Pt[][]) => polys.map((p) => 'M' + p.map((q) => `${f(q[0])} ${f(q[1])}`).join('L') + 'Z').join('');

/** A single 8-point star (for ornaments), centred at cx, cy with outer radius r. */
export function star8(cx: number, cy: number, r: number, theta = 67.5): string {
  const apothem = r; // outer points sit on edge midpoints, i.e. at the apothem
  return toPath([hankin([cx, cy], regular(cx, cy, 8, apothem, 22.5), theta)]);
}

/** Pointed (Persian/Moorish) arch outline for a w × h box. `spring` = height of the curved crown. */
export function archPath(w: number, h: number, inset = 0, crown = 0.62): string {
  const x0 = inset, x1 = w - inset, y0 = inset, y1 = h;
  const ww = x1 - x0;
  const a = Math.min(ww * crown, (y1 - y0) * 0.6);
  const mid = (x0 + x1) / 2;
  const s = y0 + a;
  return `M${f(x0)} ${f(y1)}L${f(x0)} ${f(s)}C${f(x0)} ${f(s - a * 0.55)} ${f(x0 + ww * 0.3)} ${f(y0 + a * 0.12)} ${f(mid)} ${f(y0)}C${f(x1 - ww * 0.3)} ${f(y0 + a * 0.12)} ${f(x1)} ${f(s - a * 0.55)} ${f(x1)} ${f(s)}L${f(x1)} ${f(y1)}Z`;
}
