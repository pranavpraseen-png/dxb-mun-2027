// Geometry shared by the WebGL globe (cobe) and the drawn SVG fallback.
// One pose model drives both, so the overlay lines and the Dubai reticle land on the same pixel.
import { LAND_MASK_B64 } from './landmask';

export const DUBAI = { lat: 25.2048, lon: 55.2708 } as const;
export const RAD = Math.PI / 180;

/** Where the globe sits on the stage: centre longitude/latitude (degrees), centre (px) and radius (px). */
export type Pose = { lon: number; lat: number; cx: number; cy: number; r: number };

/* ------------------------------------------------------------ land points */
let land: Float32Array | null = null; // [lat, lon, lat, lon, ...] in radians

function decodeMask() {
  const bin = atob(LAND_MASK_B64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return (x: number, y: number) => {
    const i = y * 256 + x;
    return (bytes[i >> 3] >> (7 - (i & 7))) & 1;
  };
}

/** Land dots on a Fibonacci lattice, the same sampling idea cobe uses. */
export function landPoints(samples = 9000) {
  if (land) return land;
  const bit = decodeMask();
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
/** Orthographic projection. Returns [x, y, z] where z > 0 is the visible hemisphere. */
export function project(pose: Pose, latDeg: number, lonDeg: number): [number, number, number] {
  return projectRad(pose, latDeg * RAD, lonDeg * RAD);
}
function projectRad(p: Pose, lat: number, lon: number): [number, number, number] {
  const l0 = p.lat * RAD;
  const dl = lon - p.lon * RAD;
  const cl = Math.cos(lat);
  const x = cl * Math.sin(dl);
  const y = Math.cos(l0) * Math.sin(lat) - Math.sin(l0) * cl * Math.cos(dl);
  const z = Math.sin(l0) * Math.sin(lat) + Math.cos(l0) * cl * Math.cos(dl);
  return [p.cx + p.r * x, p.cy - p.r * y, z];
}

/** SVG path data for the land dots, split into three depth bands so the limb falls away. */
export function dotPaths(p: Pose, w: number, h: number): [string, string, string] {
  const pts = landPoints();
  const r = Math.max(0.9, Math.min(5.5, p.r * 0.0072));
  const bands = ['', '', ''];
  const l0 = p.lat * RAD, s0 = Math.sin(l0), c0 = Math.cos(l0), lon0 = p.lon * RAD;
  const pad = r * 2;
  for (let i = 0; i < pts.length; i += 2) {
    const lat = pts[i], dl = pts[i + 1] - lon0;
    const cl = Math.cos(lat), sl = Math.sin(lat), cd = Math.cos(dl);
    const z = s0 * sl + c0 * cl * cd;
    if (z <= 0.02) continue;
    const x = p.cx + p.r * cl * Math.sin(dl);
    const y = p.cy - p.r * (c0 * sl - s0 * cl * cd);
    if (x < -pad || y < -pad || x > w + pad || y > h + pad) continue;
    const rr = r * (0.55 + 0.45 * z);
    const b = z < 0.3 ? 0 : z < 0.62 ? 1 : 2;
    bands[b] += `M${(x - rr).toFixed(1)} ${y.toFixed(1)}a${rr.toFixed(2)} ${rr.toFixed(2)} 0 1 0 ${(2 * rr).toFixed(2)} 0a${rr.toFixed(2)} ${rr.toFixed(2)} 0 1 0 ${(-2 * rr).toFixed(2)} 0`;
  }
  return bands as [string, string, string];
}

/** A line of constant latitude or longitude, front hemisphere only. */
export function graticule(p: Pose, kind: 'lat' | 'lon', value: number, steps = 120): string {
  let d = '';
  let pen = false;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [x, y, z] = kind === 'lat' ? project(p, value, -180 + 360 * t) : project(p, -90 + 180 * t, value);
    if (z > 0) { d += `${pen ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; pen = true; } else pen = false;
  }
  return d;
}

/* ------------------------------------------------------------ cobe mapping */
/** Convert a pose to cobe's phi/theta/scale/offset for a canvas of w×h CSS px. */
export function toCobe(p: Pose, w: number, h: number) {
  const scale = p.r / (0.4 * h); // cobe sizes the globe from the canvas height, whatever the aspect
  return {
    phi: 1.5 * Math.PI - p.lon * RAD,
    theta: p.lat * RAD,
    scale,
    offset: [((p.cx - w / 2) * 2) / scale, ((p.cy - h / 2) * 2) / scale] as [number, number],
  };
}

/* ------------------------------------------------------------ easing */
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeIn = (t: number) => t * t * t;
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function formatLat(v: number) { return `${Math.abs(v).toFixed(4)}° ${v >= 0 ? 'N' : 'S'}`; }
export function formatLon(v: number) {
  const n = ((((v + 180) % 360) + 360) % 360) - 180;
  return `${Math.abs(n).toFixed(4)}° ${n >= 0 ? 'E' : 'W'}`;
}
