// The wireframe globe, drawn on a 2D canvas in ink lines (no WebGL, no realistic render).
// One draw function serves the loader plates (cream on ink) and the hero/flight stage (ink on cream),
// so the globe the loader builds is pixel-for-pixel the globe the hero keeps.
import { LAND_MASK_B64 } from './landmask';

export const DUBAI = { lat: 25.2048, lon: 55.2708 } as const;
const RAD = Math.PI / 180;

export type Pose = { lon: number; lat: number; cx: number; cy: number; r: number };

/* ------------------------------------------------------------ land lattice */
let land: Float32Array | null = null; // [lat, lon, ...] radians, in Fibonacci order (north to south)
export function landPoints(samples = 9000) {
  if (land) return land;
  const bin = atob(LAND_MASK_B64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const bit = (x: number, y: number) => { const i = y * 256 + x; return (bytes[i >> 3] >> (7 - (i & 7))) & 1; };
  const out: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < samples; i++) {
    const y = 1 - (2 * (i + 0.5)) / samples;
    const lat = Math.asin(y);
    const lon = ((i * golden) % (2 * Math.PI)) - Math.PI;
    const u = Math.floor(((lon / Math.PI + 1) / 2) * 256) & 255;
    const v = Math.min(127, Math.max(0, Math.floor(((Math.PI / 2 - lat) / Math.PI) * 128)));
    if (bit(u, v)) out.push(lat, lon);
  }
  land = new Float32Array(out);
  return land;
}

/* ------------------------------------------------------------ projection */
export function project(p: Pose, latDeg: number, lonDeg: number): [number, number, number] {
  const lat = latDeg * RAD, l0 = p.lat * RAD, dl = (lonDeg - p.lon) * RAD;
  const cl = Math.cos(lat);
  const x = cl * Math.sin(dl);
  const y = Math.cos(l0) * Math.sin(lat) - Math.sin(l0) * cl * Math.cos(dl);
  const z = Math.sin(l0) * Math.sin(lat) + Math.cos(l0) * cl * Math.cos(dl);
  return [p.cx + p.r * x, p.cy - p.r * y, z];
}

/* ------------------------------------------------------------ numbered points (decoration only, unlabelled) */
// Fourteen land points, numbered 01–14, each tied to Dubai by a great-circle spoke ("diplomacy around us").
// They are only lattice markers: no names are shown, so no claim is made about who attends.
const POINTS: [number, number][] = [
  [48.9, 2.3], [41.0, 29.0], [30.0, 31.2], [24.7, 46.7], [28.6, 77.2], [19.1, 72.9], [1.3, 103.8],
  [35.7, 139.7], [-1.3, 36.8], [6.5, 3.4], [-26.2, 28.0], [55.8, 37.6], [39.9, 116.4], [13.7, 100.5],
];

function slerp(a: [number, number], b: [number, number], t: number): [number, number] {
  const toV = ([la, lo]: [number, number]) => [Math.cos(la * RAD) * Math.cos(lo * RAD), Math.cos(la * RAD) * Math.sin(lo * RAD), Math.sin(la * RAD)];
  const va = toV(a), vb = toV(b);
  const dot = Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const w = Math.acos(dot);
  if (w < 1e-6) return a;
  const s = Math.sin(w), ka = Math.sin((1 - t) * w) / s, kb = Math.sin(t * w) / s;
  const v = [ka * va[0] + kb * vb[0], ka * va[1] + kb * vb[1], ka * va[2] + kb * vb[2]];
  return [Math.atan2(v[2], Math.hypot(v[0], v[1])) / RAD, Math.atan2(v[1], v[0]) / RAD];
}

/* ------------------------------------------------------------ helpers */
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Size a canvas to its CSS box at min(devicePixelRatio, 2) and return a context in CSS pixels. */
export function fitCanvas(c: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = c.clientWidth, h = c.clientHeight;
  const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
  if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
  const ctx = c.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

type Paint = { ink: string; ground: string };

/**
 * Draw the globe. `build` 0→1 is the loader's construction order:
 * numbered points, spokes to Dubai, the limb, meridians, parallels, then the land lattice scanning north to south.
 */
export function drawGlobe(ctx: CanvasRenderingContext2D, w: number, h: number, p: Pose, paint: Paint, build = 1) {
  ctx.clearRect(0, 0, w, h);
  ctx.lineCap = 'butt';
  ctx.strokeStyle = paint.ink;
  ctx.fillStyle = paint.ink;

  const bPts = seg(build, 0, 0.3), bSpk = seg(build, 0.16, 0.52), bLimb = seg(build, 0.26, 0.56);
  const bMer = seg(build, 0.38, 0.74), bPar = seg(build, 0.48, 0.82), bLand = seg(build, 0.58, 1);

  // limb
  if (bLimb > 0) {
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, p.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * bLimb);
    ctx.stroke();
  }

  // graticule (dotted ink, so it reads lighter while staying fully opaque)
  ctx.lineWidth = 1;
  ctx.setLineDash([1, 3]);
  const line = (kind: 'lat' | 'lon', v: number, from: number, to: number, steps: number) => {
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i <= steps; i++) {
      const t = from + ((to - from) * i) / steps;
      const [x, y, z] = kind === 'lat' ? project(p, v, t) : project(p, t, v);
      if (z > 0 && x > -50 && x < w + 50 && y > -50 && y < h + 50) { if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y); pen = true; } else pen = false;
    }
    ctx.stroke();
  };
  const merN = Math.floor(24 * bMer);
  for (let i = 0; i < merN; i++) line('lon', -180 + i * 15, -90, 90, 90);
  const parN = Math.floor(11 * bPar);
  for (let i = 0; i < parN; i++) line('lat', -75 + i * 15, -180, 180, 180);
  // close to Dubai the camera needs a finer grid: 1° lines once the globe is big
  if (p.r > 1400 && build >= 1) {
    for (let v = 10; v <= 40; v++) line('lat', v, DUBAI.lon - 20, DUBAI.lon + 20, 40);
    for (let v = 35; v <= 75; v++) line('lon', v, DUBAI.lat - 16, DUBAI.lat + 16, 32);
  }
  ctx.setLineDash([]);

  // land lattice, scanned north to south during the build
  if (bLand > 0) {
    const pts = landPoints();
    const n = Math.floor((pts.length / 2) * bLand);
    const rr = Math.max(0.9, Math.min(2.2, p.r * 0.0058));
    const l0 = p.lat * RAD, s0 = Math.sin(l0), c0 = Math.cos(l0), lon0 = p.lon * RAD;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const lat = pts[i * 2], dl = pts[i * 2 + 1] - lon0;
      const cl = Math.cos(lat), sl = Math.sin(lat), cd = Math.cos(dl);
      const z = s0 * sl + c0 * cl * cd;
      if (z <= 0.04) continue;
      const x = p.cx + p.r * cl * Math.sin(dl);
      const y = p.cy - p.r * (c0 * sl - s0 * cl * cd);
      if (x < -4 || y < -4 || x > w + 4 || y > h + 4) continue;
      const r = rr * (0.6 + 0.4 * z);
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  // spokes: great circles from every numbered point to Dubai
  if (bSpk > 0) {
    ctx.lineWidth = 1;
    POINTS.forEach((pt, k) => {
      const local = clamp01(bSpk * 1.6 - k * 0.04);
      if (local <= 0) return;
      const steps = 48, last = Math.max(1, Math.round(steps * local));
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i <= last; i++) {
        const [la, lo] = slerp(pt, [DUBAI.lat, DUBAI.lon], i / steps);
        const [x, y, z] = project(p, la, lo);
        if (z > 0) { if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y); pen = true; } else pen = false;
      }
      ctx.stroke();
    });
  }

  // numbered points
  if (bPts > 0) {
    ctx.font = '500 10px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle';
    const shown = Math.ceil(POINTS.length * bPts);
    for (let k = 0; k < shown; k++) {
      const [x, y, z] = project(p, POINTS[k][0], POINTS[k][1]);
      if (z <= 0.08 || x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
      ctx.fillStyle = paint.ground;
      ctx.fillRect(x - 3, y - 3, 6, 6);
      ctx.fillStyle = paint.ink;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 2.5, y - 2.5, 5, 5);
      ctx.fillText(String(k + 1).padStart(2, '0'), x + 7, y - 7);
    }
  }

  // Dubai: a reticle that stays square at any zoom
  if (bPts >= 1) {
    const [x, y, z] = project(p, DUBAI.lat, DUBAI.lon);
    if (z > 0) {
      ctx.fillStyle = paint.ground;
      ctx.fillRect(x - 6, y - 6, 12, 12);
      ctx.fillStyle = paint.ink;
      ctx.fillRect(x - 3, y - 3, 6, 6);
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 6.5, y - 6.5, 13, 13);
      ctx.beginPath();
      ctx.moveTo(x - 14, y); ctx.lineTo(x - 8, y);
      ctx.moveTo(x + 8, y); ctx.lineTo(x + 14, y);
      ctx.moveTo(x, y - 14); ctx.lineTo(x, y - 8);
      ctx.moveTo(x, y + 8); ctx.lineTo(x, y + 14);
      ctx.stroke();
    }
  }
}

/* ------------------------------------------------------------ the shared hero pose */
// The hero measures where the globe sits (between the nav and the wordmark block) and publishes it here,
// so the loader can build the very same globe on its plates before the page is revealed.
let heroPose: Pose | null = null;
let heroFootTop = 0;
const subs = new Set<() => void>();
export const getHeroPose = () => heroPose;
/** The y (CSS px) of the hairline above the hero's wordmark block. */
export const getHeroFootTop = () => heroFootTop;
export function setHeroPose(p: Pose, footTop: number) { heroPose = p; heroFootTop = footTop; subs.forEach((f) => f()); }
export function onHeroPose(f: () => void) { subs.add(f); return () => { subs.delete(f); }; }

export const HERO_VIEW = { lon: 30, lat: 18 } as const;
