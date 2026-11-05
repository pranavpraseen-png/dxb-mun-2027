// Alt 1 · Terminal Paper: the globe maths and the 2D-canvas wireframe drawing.
// Orthographic projection, a Fibonacci lattice of land points (decoded from the 1-bit land mask), graticule polylines,
// numbered lattice points (Igloo) and the Dubai reticle. Everything is drawn in opaque ink tones on the paper ground.
import { LAND_MASK_B64 } from './landmask';

export const DUBAI = { lat: 25.2048, lon: 55.2708 } as const;
const RAD = Math.PI / 180;

/** Palette for the canvas (opaque only). Ink-3 is a fixed mix of ink and ground, used for the limb and minor lines. */
export const C = {
  ground: '#EDEDED',
  ink: '#052424',
  ink3: '#8E9898',
  line: '#C2C2C2',
  accent: '#0061FE',
  maroon: '#600E0E',
} as const;

/** Where the globe sits: centre lon/lat in degrees, centre (CSS px) and radius (CSS px). */
export type Pose = { lon: number; lat: number; cx: number; cy: number; r: number };

/* ------------------------------------------------------------------ easing (one curve everywhere) */
// cubic-bezier(0.65, 0.05, 0, 1), solved numerically so GSAP and the canvas use the exact CSS curve.
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      const d = dx(t);
      if (Math.abs(e) < 1e-5) break;
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    // Bisection fallback for the flat start of this curve.
    if (Math.abs(sx(t) - x) > 1e-4) {
      let lo = 0, hi = 1;
      for (let i = 0; i < 30; i++) { t = (lo + hi) / 2; if (sx(t) < x) lo = t; else hi = t; }
    }
    return sy(t);
  };
}
export const ease = bezier(0.65, 0.05, 0, 1);
export const EASE_CSS = 'cubic-bezier(0.65, 0.05, 0, 1)';
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);

/* ------------------------------------------------------------------ land points */
let land: Float32Array | null = null; // [lat, lon, ...] radians, ordered north to south

export function landPoints(samples = 10000) {
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

/* ------------------------------------------------------------------ projection */
export function project(p: Pose, latDeg: number, lonDeg: number): [number, number, number] {
  const lat = latDeg * RAD, l0 = p.lat * RAD, dl = (lonDeg - p.lon) * RAD;
  const cl = Math.cos(lat);
  const x = cl * Math.sin(dl);
  const y = Math.cos(l0) * Math.sin(lat) - Math.sin(l0) * cl * Math.cos(dl);
  const z = Math.sin(l0) * Math.sin(lat) + Math.cos(l0) * cl * Math.cos(dl);
  return [p.cx + p.r * x, p.cy - p.r * y, z];
}

/** Numbered lattice points (Igloo's numbered plexus): every 30° of longitude on five parallels. */
export const LATTICE: [number, number][] = [];
for (const la of [-60, -30, 0, 30, 60]) for (let lo = -180; lo < 180; lo += 30) LATTICE.push([la, lo]);

/* ------------------------------------------------------------------ drawing */
export type DrawOpts = {
  /** 0..1 construction progress (loader). 1 = fully built. */
  build: number;
  /** Mono font family string for canvas labels. */
  mono: string;
  /** Hide the lattice numbers (deep zoom, small screens). */
  numbers: boolean;
};

function polyline(ctx: CanvasRenderingContext2D, p: Pose, kind: 'lat' | 'lon', v: number, frac: number, from = -180, to = 180, steps = 96) {
  let pen = false;
  const n = Math.max(1, Math.round(steps * frac));
  for (let i = 0; i <= n; i++) {
    const t = i / steps;
    const [x, y, z] = kind === 'lat' ? project(p, v, from + (to - from) * t) : project(p, -90 + 180 * t, v);
    if (z > 0) { if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y); pen = true; } else pen = false;
  }
}

/** Draws one frame. The context is already scaled to CSS px. */
export function drawGlobe(ctx: CanvasRenderingContext2D, w: number, h: number, p: Pose, o: DrawOpts) {
  ctx.clearRect(0, 0, w, h);
  const b = o.build;
  const fPts = seg(b, 0, 0.38);
  const fLines = seg(b, 0.22, 0.7);
  const fLand = seg(b, 0.5, 0.97);
  const zoom = p.r / Math.max(1, Math.min(w, h) * 0.27);

  // Graticule density follows the zoom, so the deep dive still shows a survey grid.
  const step = p.r < 700 ? 15 : p.r < 2200 ? 5 : 1;
  const near = step < 15;
  const latFrom = near ? Math.floor((DUBAI.lat - 40) / step) * step : -75;
  const latTo = near ? DUBAI.lat + 40 : 75;
  const lonFrom = near ? Math.floor((DUBAI.lon - 50) / step) * step : -180;
  const lonTo = near ? DUBAI.lon + 50 : 179;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. minor graticule (ink-3)
  if (fLines > 0) {
    ctx.beginPath();
    for (let la = latFrom; la <= latTo; la += step) if (la !== 0) polyline(ctx, p, 'lat', la, fLines, near ? lonFrom : -180, near ? lonTo : 180);
    for (let lo = lonFrom; lo <= lonTo; lo += step) polyline(ctx, p, 'lon', lo, fLines);
    ctx.strokeStyle = C.ink3;
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. major lines in ink: equator, the Tropic of Cancer (23.44° N, just south of Dubai) and Dubai's meridian
    ctx.beginPath();
    polyline(ctx, p, 'lat', 0, fLines);
    polyline(ctx, p, 'lat', 23.44, fLines);
    polyline(ctx, p, 'lon', DUBAI.lon, fLines);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3. the limb, drawn as an arc that closes with the build
    if (p.r < Math.max(w, h) * 3) {
      ctx.beginPath();
      ctx.arc(p.cx, p.cy, p.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fLines);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // 4. land dots: ink on the face, ink-3 at the limb; revealed north to south during the build
  if (fLand > 0) {
    const pts = landPoints();
    const total = pts.length / 2;
    const count = Math.floor(total * fLand);
    const rr = Math.max(0.85, Math.min(4.2, p.r * 0.0058));
    const l0 = p.lat * RAD, s0 = Math.sin(l0), c0 = Math.cos(l0), lon0 = p.lon * RAD;
    const face = new Path2D(), limb = new Path2D();
    const pad = rr * 2;
    for (let i = 0; i < count; i++) {
      const lat = pts[i * 2], dl = pts[i * 2 + 1] - lon0;
      const cl = Math.cos(lat), sl = Math.sin(lat), cd = Math.cos(dl);
      const z = s0 * sl + c0 * cl * cd;
      if (z <= 0.03) continue;
      const x = p.cx + p.r * cl * Math.sin(dl);
      const y = p.cy - p.r * (c0 * sl - s0 * cl * cd);
      if (x < -pad || y < -pad || x > w + pad || y > h + pad) continue;
      const r = rr * (0.6 + 0.4 * z);
      const path = z < 0.32 ? limb : face;
      path.moveTo(x + r, y);
      path.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = C.ink3;
    ctx.fill(limb);
    ctx.fillStyle = C.ink;
    ctx.fill(face);
  }

  // 5. numbered lattice points (crosses + two-digit mono numbers)
  if (fPts > 0 && zoom < 2.2) {
    const n = Math.floor(LATTICE.length * fPts);
    ctx.beginPath();
    const labels: [string, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const [la, lo] = LATTICE[i];
      const [x, y, z] = project(p, la, lo);
      if (z < 0.12) continue;
      const s = 3.5;
      ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
      ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
      if (o.numbers && z > 0.3) labels.push([String(i + 1).padStart(2, '0'), x, y]);
    }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1;
    ctx.stroke();
    if (labels.length) {
      ctx.font = `500 10px ${o.mono}`;
      ctx.textBaseline = 'bottom';
      for (const [t, x, y] of labels) {
        const tw = ctx.measureText(t).width;
        ctx.fillStyle = C.ground;
        ctx.fillRect(x + 4, y - 15, tw + 4, 12);
        ctx.fillStyle = C.ink;
        ctx.fillText(t, x + 6, y - 3);
      }
    }
  }

  // 6. Dubai: the one accent mark
  const fDxb = seg(b, 0.82, 1);
  if (fDxb > 0) {
    const [x, y, z] = project(p, DUBAI.lat, DUBAI.lon);
    if (z > 0.05) {
      ctx.strokeStyle = C.accent;
      ctx.fillStyle = C.accent;
      ctx.lineWidth = 1.5;
      const ring = 10 + 4 * Math.min(zoom, 4);
      ctx.beginPath();
      ctx.arc(x, y, ring * fDxb, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      const arm = ring + 12;
      ctx.moveTo(x - arm, y); ctx.lineTo(x - ring - 3, y);
      ctx.moveTo(x + ring + 3, y); ctx.lineTo(x + arm, y);
      ctx.moveTo(x, y - arm); ctx.lineTo(x, y - ring - 3);
      ctx.moveTo(x, y + ring + 3); ctx.lineTo(x, y + arm);
      ctx.lineWidth = 1;
      ctx.stroke();
      // Deep zoom: range rings at 1°, 2° and 4° of arc around Dubai (pure geometry), labelled in mono.
      if (zoom > 3) {
        ctx.font = `500 10px ${o.mono}`;
        ctx.textBaseline = 'middle';
        for (const deg of [1, 2, 4]) {
          const rr = p.r * Math.sin(deg * RAD);
          if (rr < ring * 2 || rr > Math.max(w, h)) continue;
          ctx.beginPath();
          ctx.arc(x, y, rr, 0, Math.PI * 2);
          ctx.strokeStyle = C.accent;
          ctx.lineWidth = 1;
          ctx.stroke();
          const t = `${deg}°`;
          const tw = ctx.measureText(t).width;
          ctx.fillStyle = C.ground;
          ctx.fillRect(x + rr * 0.7071 - 2, y - rr * 0.7071 - 7, tw + 4, 14);
          ctx.fillStyle = C.accent;
          ctx.fillText(t, x + rr * 0.7071, y - rr * 0.7071);
        }
      }
    }
  }
}

export function fmtLat(v: number) { return `${Math.abs(v).toFixed(4)}° ${v >= 0 ? 'N' : 'S'}`; }
export function fmtLon(v: number) {
  const n = ((((v + 180) % 360) + 360) % 360) - 180;
  return `${Math.abs(n).toFixed(4)}° ${n >= 0 ? 'E' : 'W'}`;
}
