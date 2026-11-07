// The General Assembly hall as data: 7 raked tiers on arcs round the podium (at the origin), split by staggered
// aisles into 19 seat blocks (one per committee). Seats face the podium. Plain numbers only, so the 3D scene and the
// static SVG plan draw the same hall.
import { committees, schedule } from '@/data/conference';

export const COL = {
  ground: '#050b16',
  panel: '#0a1424',
  rule: '#1c3250',
  seat: '#0f2340',
  seatEdge: '#3d6491',
  wire: '#2a4a70',
  wireHi: '#4f78a8',
  mute: '#9fb2cb',
  ink: '#ffffff',
  un: '#009edb',
  take: '#f2711c',
  maroon: '#600e0e',
  cream: '#dcbdab',
  gold: '#ffb606',
  wall: '#081224',
} as const;

const D = Math.PI / 180;
export const A0 = -70 * D;
export const A1 = 70 * D;
const GAP = 2.4 * D;

/** Tier radius and seat count. 193 seats in all. */
export const ROWS = [
  { r: 6.0, n: 17 },
  { r: 7.1, n: 21 },
  { r: 8.6, n: 24 },
  { r: 9.7, n: 28 },
  { r: 11.2, n: 31 },
  { r: 12.3, n: 34 },
  { r: 13.4, n: 38 },
];
/** Rows grouped into bands; each band is split into `w` wedges (blocks). 4 + 6 + 9 = 19. */
const BANDS = [
  { rows: [0, 1], w: 4 },
  { rows: [2, 3], w: 6 },
  { rows: [4, 5, 6], w: 9 },
];
export const rake = (r: number) => (r - 6) * 0.2;
export const ROW_DEPTH = 0.9; // radial depth of one tier step

export type Seat = { x: number; y: number; z: number; a: number; row: number; block: number; order: number };
export type Block = { band: number; a0: number; a1: number; r0: number; r1: number; seats: number[]; cx: number; cy: number; cz: number; abbr: string; name: string };

export const seats: Seat[] = [];
export const blocks: Block[] = [];

BANDS.forEach((band, bi) => {
  const span = (A1 - A0 - GAP * (band.w - 1)) / band.w;
  const first = blocks.length;
  for (let k = 0; k < band.w; k++) {
    const a0 = A0 + k * (span + GAP);
    const r0 = ROWS[band.rows[0]].r - ROW_DEPTH / 2;
    const r1 = ROWS[band.rows[band.rows.length - 1]].r + ROW_DEPTH / 2;
    blocks.push({ band: bi, a0, a1: a0 + span, r0, r1, seats: [], cx: 0, cy: 0, cz: 0, abbr: '', name: '' });
  }
  for (const ri of band.rows) {
    const { r, n } = ROWS[ri];
    const base = Math.floor(n / band.w);
    let extra = n % band.w;
    // Extra seats go to the middle wedges first, so the fan stays symmetric.
    const order = [...Array(band.w).keys()].sort((p, q) => Math.abs(p - (band.w - 1) / 2) - Math.abs(q - (band.w - 1) / 2));
    const counts = Array(band.w).fill(base);
    for (const k of order) { if (extra <= 0) break; counts[k]++; extra--; }
    for (let k = 0; k < band.w; k++) {
      const b = blocks[first + k];
      const m = counts[k];
      for (let j = 0; j < m; j++) {
        const a = b.a0 + (b.a1 - b.a0) * ((j + 0.5) / m);
        b.seats.push(seats.length);
        seats.push({ x: r * Math.sin(a), y: rake(r), z: r * Math.cos(a), a, row: ri, block: first + k, order: 0 });
      }
    }
  }
});
// Committee order runs front band left → right, then the middle band, then the back band.
blocks.forEach((b, i) => {
  const am = (b.a0 + b.a1) / 2, rm = (b.r0 + b.r1) / 2;
  b.cx = rm * Math.sin(am); b.cz = rm * Math.cos(am); b.cy = rake(rm) + 0.9;
  b.abbr = committees[i].abbr; b.name = committees[i].name;
});
// Fill order for the opening: row by row, and from the centre aisle outwards inside each row.
seats.forEach((s) => { s.order = s.row + Math.abs(s.a) / (A1 * 1.25); });

/** The register scene's seat: middle band, back row, right of centre. */
export const TAKE_SEAT = (() => {
  let best = 0, bd = Infinity;
  seats.forEach((s, i) => { if (s.row !== 3) return; const d = Math.abs(s.a - 17 * D); if (d < bd) { bd = d; best = i; } });
  return best;
})();

/* ------------------------------------------------------------------ the dais */
export const WALL_Z = -2.7;
export const EMBLEM = { x: 0, y: 5.3, z: WALL_Z + 0.12, r: 1.15 };
export const CLOCK = { x: 4.9, y: 4.6, z: WALL_Z + 0.12, r: 1.45 };
export const BOARD = { x: -4.9, y: 4.6, z: WALL_Z + 0.12, w: 2.6, h: 2.9 };

/** Furniture boxes: [cx, cy, cz, w, h, d]. Drawn with the same flat shader and outlines as the seats. */
export const FURNITURE: [number, number, number, number, number, number][] = [
  [0, 0.17, -0.9, 10.5, 0.34, 3.4], // lower step of the dais
  [0, 0.52, -1.35, 8.6, 0.36, 2.5], // dais
  [0, 1.1, -1.25, 5.2, 0.8, 0.7], // presiding officers' desk
  [-1.6, 1.25, -1.95, 0.5, 1.1, 0.12], // three chair backs
  [0, 1.25, -1.95, 0.5, 1.1, 0.12],
  [1.6, 1.25, -1.95, 0.5, 1.1, 0.12],
  [0, 0.62, 1.55, 1.3, 1.24, 0.7], // speaker's rostrum
  [0, 6.0, WALL_Z - 0.1, 17, 12, 0.2], // back wall (tall, so it fills the top of a phone frame)
];

/* ------------------------------------------------------------------ schedule on a 12-hour dial */
/** "12:30 PM" → minutes after midnight. */
export const toMin = (t: string) => {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(t);
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + Number(m[2]);
};
export type Arc = { start: number; end: number | null };
export const slotArcs: Arc[][] = schedule.map((d) => d.slots.map((s) => {
  const [a, b] = s.time.split(/\s*[–-]\s*/);
  return { start: toMin(a), end: b ? toMin(b) : null };
}));
/** Minutes → dial angle (radians, clockwise from 12 o'clock). */
export const dialAngle = (min: number) => ((min % 720) / 720) * Math.PI * 2;
