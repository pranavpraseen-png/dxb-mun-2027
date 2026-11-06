// Line geometry for the wireframe globe: graticule, coastlines (marching squares over the cobe land mask,
// smoothed with Chaikin), numbered survey points and the rings round Dubai. All in a unit sphere.
import { LAND_MASK_B64 } from './landmask';

export const RAD = Math.PI / 180;
export type V3 = [number, number, number];

/** lat/lon in degrees to a point on a sphere of radius r (y up, lon 0 on +z). */
export const sph = (lat: number, lon: number, r = 1): V3 => {
  const la = lat * RAD, lo = lon * RAD, c = Math.cos(la);
  return [r * c * Math.sin(lo), r * Math.sin(la), r * c * Math.cos(lo)];
};

/** A set of polylines flattened to segment pairs, with each polyline's own 0..1 distance (for the draw-on). */
export type Lines = { pos: Float32Array; dist: Float32Array };
export function toSegments(polys: V3[][]): Lines {
  let n = 0;
  for (const p of polys) n += Math.max(0, p.length - 1);
  const pos = new Float32Array(n * 6);
  const dist = new Float32Array(n * 2);
  let k = 0;
  for (const p of polys) {
    let total = 0;
    const acc = [0];
    for (let i = 1; i < p.length; i++) {
      total += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1], p[i][2] - p[i - 1][2]);
      acc.push(total);
    }
    for (let i = 1; i < p.length; i++, k++) {
      pos.set(p[i - 1], k * 6);
      pos.set(p[i], k * 6 + 3);
      dist[k * 2] = total ? acc[i - 1] / total : 0;
      dist[k * 2 + 1] = total ? acc[i] / total : 1;
    }
  }
  return { pos, dist };
}

/* ------------------------------------------------------------------ graticule */
export function graticule(r = 1.0008): V3[][] {
  const out: V3[][] = [];
  for (let lat = -75; lat <= 75; lat += 15) {
    const p: V3[] = [];
    for (let i = 0; i <= 120; i++) p.push(sph(lat, -180 + 3 * i, r));
    out.push(p);
  }
  for (let lon = -180; lon < 180; lon += 15) {
    const p: V3[] = [];
    for (let i = 0; i <= 64; i++) p.push(sph(-80 + (160 * i) / 64, lon, r));
    out.push(p);
  }
  return out;
}

/* ------------------------------------------------------------------ coastlines */
const W = 256, H = 128;
function mask() {
  const bin = atob(LAND_MASK_B64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return (x: number, y: number) => {
    x = ((x % W) + W) % W;
    if (y < 0 || y >= H) return 0;
    const i = y * W + x;
    return (bytes[i >> 3] >> (7 - (i & 7))) & 1;
  };
}

let coastCache: V3[][] | null = null;
export function coastlines(r = 1.0012): V3[][] {
  if (coastCache) return coastCache;
  const bit = mask();
  // Marching squares: corners at pixel centres. Points are kept on a half-pixel lattice (x2 integers).
  const segs: [number, number, number, number][] = [];
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W; x++) {
      const a = bit(x, y), b = bit(x + 1, y), c = bit(x + 1, y + 1), d = bit(x, y + 1);
      const code = (a << 3) | (b << 2) | (c << 1) | d;
      if (code === 0 || code === 15) continue;
      const T: [number, number] = [2 * x + 1, 2 * y], R: [number, number] = [2 * x + 2, 2 * y + 1];
      const B: [number, number] = [2 * x + 1, 2 * y + 2], L: [number, number] = [2 * x, 2 * y + 1];
      const add = (p: [number, number], q: [number, number]) => segs.push([p[0], p[1], q[0], q[1]]);
      switch (code) {
        case 1: case 14: add(L, B); break;
        case 2: case 13: add(B, R); break;
        case 3: case 12: add(L, R); break;
        case 4: case 11: add(T, R); break;
        case 5: add(L, T); add(B, R); break;
        case 6: case 9: add(T, B); break;
        case 7: case 8: add(L, T); break;
        case 10: add(T, R); add(L, B); break;
      }
    }
  }
  // Chain segments into polylines (x wraps at 2W on the lattice).
  const key = (x: number, y: number) => `${((x % (2 * W)) + 2 * W) % (2 * W)},${y}`;
  const adj = new Map<string, number[]>();
  segs.forEach((s, i) => {
    for (const k of [key(s[0], s[1]), key(s[2], s[3])]) {
      const l = adj.get(k);
      if (l) l.push(i); else adj.set(k, [i]);
    }
  });
  const used = new Uint8Array(segs.length);
  const polys: [number, number][][] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const line: [number, number][] = [[segs[i][0], segs[i][1]], [segs[i][2], segs[i][3]]];
    // extend forward, unwrapping x so the line stays continuous
    for (let guard = 0; guard < 100000; guard++) {
      const [lx, ly] = line[line.length - 1];
      const cand = adj.get(key(lx, ly))?.find((j) => !used[j]);
      if (cand === undefined) break;
      used[cand] = 1;
      const s = segs[cand];
      const k0 = key(s[0], s[1]) === key(lx, ly);
      const nx = k0 ? s[2] : s[0], ny = k0 ? s[3] : s[1];
      const ox = k0 ? s[0] : s[2];
      line.push([nx + (lx - ox), ny]);
    }
    if (line.length >= 4) polys.push(line);
  }
  // Chaikin smoothing (2 passes), then to the sphere.
  const chaikin = (p: [number, number][]) => {
    const closed = p.length > 3 && key(p[0][0], p[0][1]) === key(p[p.length - 1][0], p[p.length - 1][1]);
    const out: [number, number][] = closed ? [] : [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, ay] = p[i], [bx, by] = p[i + 1];
      out.push([0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by], [0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by]);
    }
    if (closed) out.push(out[0]); else out.push(p[p.length - 1]);
    return out;
  };
  coastCache = polys.map((p) => {
    let q = chaikin(chaikin(p));
    if (q.length > 400) q = q.filter((_, i) => i % 2 === 0 || i === q.length - 1);
    return q.map(([x2, y2]) => {
      const x = x2 / 2, y = y2 / 2; // back to pixel units (pixel centres on integers)
      const lon = -180 + ((x + 0.5) * 360) / W;
      const lat = 90 - ((y + 0.5) * 180) / H;
      return sph(lat, lon, r);
    });
  });
  return coastCache;
}

/* ------------------------------------------------------------------ survey points (the loader's numbered field) */
export type SurveyPoint = { at: V3; from: V3; n: number; label: boolean };
export function surveyPoints(): SurveyPoint[] {
  const pts: SurveyPoint[] = [];
  let n = 0;
  // deterministic scatter (no Math.random, so every visit builds the same picture)
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const lat of [-60, -30, 0, 30, 60]) {
    for (let lon = -180; lon < 180; lon += 30) {
      const a = rnd() * Math.PI * 2, b = (rnd() - 0.5) * 1.2, rr = 1.6 + rnd() * 1.4;
      pts.push({
        at: sph(lat, lon, 1.002),
        from: [Math.cos(a) * rr * 1.5, b * 1.6, Math.sin(a) * rr * 0.6],
        n: ++n,
        label: n % 4 === 1,
      });
    }
  }
  return pts;
}
/** Neighbour pairs (east and north on the lattice) for the plexus hairlines. */
export function surveyLinks(): [number, number][] {
  const out: [number, number][] = [];
  const cols = 12, rows = 5;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    out.push([i, r * cols + ((c + 1) % cols)]);
    if (r < rows - 1) out.push([i, (r + 1) * cols + c]);
  }
  return out;
}

/* ------------------------------------------------------------------ rings round Dubai */
export function ringsAround(lat: number, lon: number, radiiDeg: number[], r = 1.0016): V3[][] {
  // Small circles at angular radius d round (lat, lon): rotate a circle round the pole to the target.
  const la = lat * RAD, lo = lon * RAD;
  return radiiDeg.map((d) => {
    const p: V3[] = [];
    const dd = d * RAD;
    for (let i = 0; i <= 96; i++) {
      const az = (i / 96) * Math.PI * 2;
      const lat2 = Math.asin(Math.sin(la) * Math.cos(dd) + Math.cos(la) * Math.sin(dd) * Math.cos(az));
      const lon2 = lo + Math.atan2(Math.sin(az) * Math.sin(dd) * Math.cos(la), Math.cos(dd) - Math.sin(la) * Math.sin(lat2));
      p.push(sph(lat2 / RAD, lon2 / RAD, r));
    }
    return p;
  });
}
/** A short cross (two great-circle ticks) on Dubai. */
export function crossAt(lat: number, lon: number, armDeg = 1.2, r = 1.002): V3[][] {
  return [
    [sph(lat, lon - armDeg, r), sph(lat, lon, r), sph(lat, lon + armDeg, r)],
    [sph(lat - armDeg, lon, r), sph(lat, lon, r), sph(lat + armDeg, lon, r)],
  ];
}
