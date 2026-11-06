// A 5×7 dot-matrix font (teleprinter / LCD style), drawn by hand for this build. Each glyph is 7 rows of 5 dots.
// Only what the cables need: A–Z, 0–9 and a little punctuation. Unknown characters print as a space.
const G: Record<string, string> = {
  A: '.###. #...# #...# ##### #...# #...# #...#',
  B: '####. #...# #...# ####. #...# #...# ####.',
  C: '.###. #...# #.... #.... #.... #...# .###.',
  D: '###.. #..#. #...# #...# #...# #..#. ###..',
  E: '##### #.... #.... ####. #.... #.... #####',
  F: '##### #.... #.... ####. #.... #.... #....',
  G: '.###. #...# #.... #.### #...# #...# .####',
  H: '#...# #...# #...# ##### #...# #...# #...#',
  I: '.###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.',
  J: '..### ...#. ...#. ...#. ...#. #..#. .##..',
  K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#',
  L: '#.... #.... #.... #.... #.... #.... #####',
  M: '#...# ##.## #.#.# #.#.# #...# #...# #...#',
  N: '#...# #...# ##..# #.#.# #..## #...# #...#',
  O: '.###. #...# #...# #...# #...# #...# .###.',
  P: '####. #...# #...# ####. #.... #.... #....',
  Q: '.###. #...# #...# #...# #.#.# #..#. .##.#',
  R: '####. #...# #...# ####. #.#.. #..#. #...#',
  S: '.#### #.... #.... .###. ....# ....# ####.',
  T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  U: '#...# #...# #...# #...# #...# #...# .###.',
  V: '#...# #...# #...# #...# #...# .#.#. ..#..',
  W: '#...# #...# #...# #.#.# #.#.# #.#.# .#.#.',
  X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
  Y: '#...# #...# #...# .#.#. ..#.. ..#.. ..#..',
  Z: '##### ....# ...#. ..#.. .#... #.... #####',
  0: '.###. #...# #...# #...# #...# #...# .###.',
  1: '..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.',
  2: '.###. #...# ....# ...#. ..#.. .#... #####',
  3: '##### ...#. ..#.. ...#. ....# #...# .###.',
  4: '...#. ..##. .#.#. #..#. ##### ...#. ...#.',
  5: '##### #.... ####. ....# ....# #...# .###.',
  6: '..##. .#... #.... ####. #...# #...# .###.',
  7: '##### ....# ...#. ..#.. .#... .#... .#...',
  8: '.###. #...# #...# .###. #...# #...# .###.',
  9: '.###. #...# #...# .#### ....# ...#. .##..',
  ':': '..... .##.. .##.. ..... .##.. .##.. .....',
  '/': '..... ....# ...#. ..#.. .#... #.... .....',
  '.': '..... ..... ..... ..... ..... .##.. .##..',
  ',': '..... ..... ..... ..... .##.. ..#.. .#...',
  '-': '..... ..... ..... ##### ..... ..... .....',
  '°': '.##.. #..#. #..#. .##.. ..... ..... .....',
  "'": '.##.. ..#.. .#... ..... ..... ..... .....',
  '·': '..... ..... ..... ..#.. ..... ..... .....',
  '(': '...#. ..#.. .#... .#... .#... ..#.. ...#.',
  ')': '.#... ..#.. ...#. ...#. ...#. ..#.. .#...',
  '=': '..... ..... ##### ..... ##### ..... .....',
};

const ROWS = new Map<string, number[][]>(
  Object.entries(G).map(([k, v]) => [k, v.split(' ').map((r) => [...r].map((c) => (c === '#' ? 1 : 0)))]),
);

/** Dots per character cell: 5 wide plus 1 space, 7 high plus 2 leading. */
export const CELL_W = 6;
export const CELL_H = 9;

export type Matrix = { data: Uint8Array; w: number; h: number; chars: number; lines: number[] };

/**
 * Lays the lines out as a dot bitmap, one RGBA texel per dot.
 * R = 255 when the dot is on. G/B = the print order of the character the dot belongs to (16 bit), so the shader can
 * reveal characters one by one and draw a block cursor on the next one. Spacing dots carry order 65535 (never shown).
 * `lines` holds the order of the first character of each line (the print schedule pauses at line ends).
 */
export function buildMatrix(lines: string[]): Matrix {
  const cols = Math.max(...lines.map((l) => l.length));
  const w = cols * CELL_W;
  const h = lines.length * CELL_H;
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[i * 4 + 1] = 255; data[i * 4 + 2] = 255; data[i * 4 + 3] = 255; }
  let order = 0;
  const starts: number[] = [];
  lines.forEach((line, li) => {
    starts.push(order);
    [...line].forEach((ch, ci) => {
      const g = ROWS.get(ch.toUpperCase());
      for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) {
        const px = ci * CELL_W + x;
        const py = li * CELL_H + y;
        const o = (py * w + px) * 4;
        data[o] = g && g[y][x] ? 255 : 0;
        data[o + 1] = order & 255;
        data[o + 2] = order >> 8;
      }
      order++;
    });
  });
  return { data, w, h, chars: order, lines: starts };
}

/** Draws text in the dot font into a 2D context (used for the second layer), `s` px per dot, top-left at x,y. */
export function drawDots(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, s: number) {
  [...text].forEach((ch, ci) => {
    const g = ROWS.get(ch.toUpperCase());
    if (!g) return;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c]) ctx.fillRect(x + (ci * CELL_W + c) * s, y + r * s, s, s);
  });
}
