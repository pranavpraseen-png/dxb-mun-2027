// World layout and camera keys. Two worlds share one scene: space (globe at the origin) and the hall.
// The camera never cuts: it dives into fog over Dubai, the worlds swap inside the fog, and the hall clears out of it.
import { committees } from '@/data/conference';
import { LAND_MASK_B64 } from './landmask';
import { LAST, SWITCH, rig } from './store';

export const RAD = Math.PI / 180;
export const DUBAI = { lat: 25.2048, lon: 55.2708 } as const;

/** Unit-sphere position for a latitude/longitude (lon 0 faces +z, north is +y). */
export function latLon(lat: number, lon: number, r = 1): [number, number, number] {
  const la = lat * RAD, lo = lon * RAD;
  return [r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo)];
}

/** Land dots on a Fibonacci lattice, tested against the 256x128 land mask (same data as the Merged globe). */
export function landPositions(samples: number, r = 1.004) {
  const bin = atob(LAND_MASK_B64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const bit = (x: number, y: number) => (bytes[(y * 256 + x) >> 3] >> (7 - ((y * 256 + x) & 7))) & 1;
  const out: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < samples; i++) {
    const y = 1 - (2 * (i + 0.5)) / samples;
    const lat = Math.asin(y);
    const lon = ((i * golden) % (2 * Math.PI)) - Math.PI;
    const u = Math.floor(((lon / Math.PI + 1) / 2) * 256) & 255;
    const v = Math.min(127, Math.max(0, Math.floor(((Math.PI / 2 - lat) / Math.PI) * 128)));
    if (!bit(u, v)) continue;
    out.push(r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.cos(lon));
  }
  return new Float32Array(out);
}

/* ------------------------------------------------------------------ the hall */
/** The dais (chair's platform) sits at C; the delegate rows are arcs around it, facing it. */
export const C = [0, 0, -6.5] as const;
export const ROWS = [
  { r: 5.2, y: 0, n: 7, span: 48 },
  { r: 6.8, y: 0.42, n: 6, span: 40 },
  { r: 8.4, y: 0.84, n: 6, span: 34 },
];
export const DESK_H = 0.76;
export const PLATE = { w: 1.0, h: 0.34, d: 0.03 };

export type PlateSpot = { i: number; x: number; y: number; z: number; ry: number };
/** 19 nameplates, in the live site's order, front row first. */
export const PLATES: PlateSpot[] = (() => {
  const out: PlateSpot[] = [];
  let k = 0;
  for (const row of ROWS) {
    for (let j = 0; j < row.n && k < committees.length; j++, k++) {
      const a = (-row.span + (2 * row.span * j) / (row.n - 1)) * RAD;
      const x = C[0] + row.r * Math.sin(a);
      const z = C[2] + row.r * Math.cos(a);
      out.push({ i: k, x, y: row.y + DESK_H + PLATE.h / 2 + 0.01, z, ry: Math.atan2(C[0] - x, C[2] - z) });
    }
  }
  return out;
})();

export const SCREEN = { x: 0, y: 2.95, z: -10.6, w: 8, h: 3.1 };
export const CLOCK = { x: 1.7, y: 1.72, z: -6.2 };

/* ------------------------------------------------------------------ camera keys */
type V3 = [number, number, number];
export type Key = { pos: V3; look: V3; fov: number };

const WIDE: Key[] = [
  { pos: [0, 0.5, 13], look: [-2.4, 1.6, 0], fov: 42 },          // 0 slate: the globe small, low right
  { pos: [-1.0, 0.18, 3.35], look: [-1.0, 0.06, 0], fov: 42 },   // 1 globe on the right
  { pos: [-0.26, -0.5, 1.72], look: [-0.2, 0.02, 1.0], fov: 42 }, // 2 close on Dubai
  { pos: [0, 3.9, -10.4], look: [0, 0.35, 0.4], fov: 46 },        // 3 the floor from the dais
  { pos: [-2.4, 2.6, 1.6], look: [-3.4, 2.5, -10], fov: 44 },    // 4 the rostrum screen, right
  { pos: [0.8, 1.9, -4.5], look: [1.05, 1.5, -6.2], fov: 44 },  // 5 the dais clock, right
  { pos: [3, 17, 7], look: [-3.6, 0, -3.2], fov: 44 },           // 6 aerial
];
const TALL: Key[] = [
  { pos: [0, 0, 14], look: [0, -1.9, 0], fov: 52 },
  { pos: [0, -1.05, 5.3], look: [0, -1.1, 0], fov: 52 },
  { pos: [0, -0.95, 2.0], look: [0, -0.62, 1.0], fov: 52 },
  { pos: [0, 3.4, -11.6], look: [0, -0.2, 0.4], fov: 56 },      // replaced by the plate-follow key below
  { pos: [-0.2, 2.5, 5.6], look: [-0.1, 0.5, -10], fov: 54 },
  { pos: [1.55, 2.3, -3.9], look: [1.65, 0.95, -6.2], fov: 54 },
  { pos: [0, 23, 6], look: [0, 0, 3.5], fov: 54 },
];
/** In the fog: the bottom of the Dubai beam (space) and the hall entrance high above the floor. */
const DIVE: Key = { pos: [0, 0, 1.05], look: [0, 0, 0.2], fov: 42 };
const ENTRY: Key = { pos: [0, 9, 13], look: [0, 0.5, -2], fov: 46 };

export const keysFor = () => (rig.narrow ? TALL : WIDE);

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const mixKey = (a: Key, b: Key, u: number): Key => ({ pos: mix(a.pos, b.pos, u), look: mix(a.look, b.look, u), fov: a.fov + (b.fov - a.fov) * u });

/** Phone: at the floor stop the camera stands in front of the picked nameplate. */
function plateKey(focus: number): Key {
  const n = PLATES.length;
  const f = Math.max(0, Math.min(n - 1, focus));
  const a = PLATES[Math.floor(f)], b = PLATES[Math.min(n - 1, Math.floor(f) + 1)];
  const u = f - Math.floor(f);
  const x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u, z = a.z + (b.z - a.z) * u;
  // step back toward the dais
  const dx = C[0] - x, dz = C[2] - z, len = Math.hypot(dx, dz);
  const d = 3.7;
  return { pos: [x + (dx / len) * d, y + 1.25, z + (dz / len) * d], look: [x, y - 0.95, z], fov: 54 };
}

/** The camera at stop parameter t (already damped), plus the world and fog for that moment. */
export type Pose = { key: Key; world: 'space' | 'hall'; fog: number; spin: number; veil: number };
export function poseAt(t: number): Pose {
  const K = keysFor().slice();
  if (rig.narrow) K[3] = plateKey(rig.plateFocus);
  const tt = Math.max(0, Math.min(LAST, t));
  const i = Math.min(LAST - 1, Math.floor(tt));
  const u = tt - i;
  const spin = Math.min(1, tt / 2);
  const near = Math.max(0, 1 - Math.abs(tt - SWITCH) / 0.2);
  const veil = near * near * (3 - 2 * near);
  if (i === 2) {
    if (tt < SWITCH) {
      const v = u / (SWITCH - 2);
      return { key: mixKey(K[2], DIVE, ease(v)), world: 'space', fog: Math.pow(v, 2.2) * 9, spin, veil };
    }
    const v = (u - (SWITCH - 2)) / (3 - SWITCH);
    return { key: mixKey(ENTRY, K[3], ease(v)), world: 'hall', fog: 0.035 + Math.pow(1 - v, 2.4) * 1.4, spin, veil };
  }
  const key = mixKey(K[i], K[i + 1], ease(u));
  // a gentle swoop between stops (Messenger-like arcs rather than straight dollies)
  const swoop = Math.sin(Math.PI * u) * (i === 0 ? 0.6 : i >= 3 ? 0.9 : 0.15);
  key.pos[1] += swoop;
  return { key, world: tt < SWITCH ? 'space' : 'hall', fog: tt < SWITCH ? 0 : 0.035, spin, veil: 0 };
}

/** Exact pose of a stop (for the still posters). */
export function stopPose(i: number) { return poseAt(i); }
