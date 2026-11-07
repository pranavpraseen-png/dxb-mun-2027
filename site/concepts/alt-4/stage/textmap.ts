// Draws the wordmark onto a small canvas and samples it once per bar, so the floor knows which bars rise into letters.
// Returns 0..1 per cell (row-major, rows run away from the camera's far side toward it).

export type Grid = { cols: number; rows: number; cell: number; lines: string[] };

export function pickGrid(aspect: number): Grid {
  // Deep grids: the floor always runs off the bottom of the screen, so there is never a hard near edge.
  if (aspect < 0.85) return { cols: 66, rows: 136, cell: 0.24, lines: ['DXB', 'MUN'] };
  if (aspect < 1.3) return { cols: 110, rows: 116, cell: 0.24, lines: ['DXB', 'MUN'] };
  return { cols: 156, rows: 124, cell: 0.22, lines: ['DXB MUN'] };
}

export async function textMask(g: Grid): Promise<{ mask: Float32Array; box: { w: number; h: number } }> {
  const family = '"Archivo Variable", "Archivo", system-ui, sans-serif';
  try { await document.fonts.load(`900 100px ${family}`); } catch { /* fall back to the system face */ }
  const S = 8; // canvas pixels per cell
  const W = g.cols * S, H = g.rows * S;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  (x as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = 'expanded';
  (x as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px';
  // Fit: the widest line takes 84% of the width; all lines together at most 58% of the depth.
  let px = 100;
  x.font = `900 ${px}px ${family}`;
  const widest = Math.max(...g.lines.map((l) => x.measureText(l).width));
  px = Math.min((W * 0.84) / widest * px, (H * 0.42) / (g.lines.length * 0.78));
  x.font = `900 ${px}px ${family}`;
  const lineH = px * 0.86;
  const cap = px * 0.72;
  const block = lineH * (g.lines.length - 1) + cap;
  const top = (H - block) / 2;
  g.lines.forEach((l, i) => x.fillText(l, W / 2, top + cap + i * lineH));
  const img = x.getImageData(0, 0, W, H).data;
  const mask = new Float32Array(g.cols * g.rows);
  for (let r = 0; r < g.rows; r++) for (let q = 0; q < g.cols; q++) {
    let sum = 0;
    for (let yy = 1; yy < S; yy += 2) for (let xx = 1; xx < S; xx += 2) sum += img[((r * S + yy) * W + q * S + xx) * 4];
    const cover = sum / (255 * (S / 2) * (S / 2));
    mask[r * g.cols + q] = cover < 0.38 ? 0 : cover > 0.62 ? 1 : (cover - 0.38) / 0.24;
  }
  const w = Math.max(...g.lines.map((l) => x.measureText(l).width)) / S * g.cell;
  return { mask, box: { w, h: (block / S) * g.cell } };
}
