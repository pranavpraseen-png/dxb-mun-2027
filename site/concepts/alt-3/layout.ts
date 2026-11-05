// The world: where every scene sits, where the camera stands for each one, and the 3D anchor points
// that the DOM labels pin themselves to. Pure data and maths; no React.
import { CatmullRomCurve3, MathUtils, Vector3 } from 'three';
import { committees, DUBAI, N, schedule, slotSpan, RULER } from './content';

export const R = 2; // globe radius (world units)
export const FOV = 35;

/* ------------------------------------------------------------------ seeded randomness (stable between loads) */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ the globe and Dubai */
/** The globe turns so Dubai sits a little right of the facing meridian. */
export const GLOBE_ROT_Y = 0.32 - DUBAI.lon * MathUtils.DEG2RAD;
/** Unit vector for a latitude/longitude (lon 0 faces +z), before the globe's turn. */
export const sph = (latDeg: number, lonDeg: number, r = 1) => {
  const la = latDeg * MathUtils.DEG2RAD, lo = lonDeg * MathUtils.DEG2RAD;
  return new Vector3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)).multiplyScalar(r);
};
/** Dubai in world space, with its local east / north / up frame (used by the skyline patch and its camera). */
export const DXB = (() => {
  const up = sph(DUBAI.lat, DUBAI.lon).applyAxisAngle(new Vector3(0, 1, 0), GLOBE_ROT_Y).normalize();
  const east = new Vector3(0, 1, 0).cross(up).normalize();
  const north = up.clone().cross(east).normalize();
  return { p: up.clone().multiplyScalar(R), up, east, north };
})();

/* ------------------------------------------------------------------ scene centres */
export const C_CLAUSES = new Vector3(10, 0.5, -9);
export const C_RING = new Vector3(0, -0.5, -24);
export const C_RULER = new Vector3(-10, 0, -37);
export const C_PASS = new Vector3(0, 0.3, -50);

/* clauses: a 2 × 3 grid of line-drawn panels, slightly out of plane */
export const PANEL = { w: 2.2, h: 1.1 };
export const PANELS = Array.from({ length: 6 }, (_, i) => {
  const col = i % 2, row = Math.floor(i / 2);
  const z = [0, -0.5, 0.35, -0.25, 0.2, -0.6][i];
  return { p: new Vector3(C_CLAUSES.x + (col ? 1.275 : -1.275), C_CLAUSES.y + (1 - row) * 1.4, C_CLAUSES.z + z), rotY: [0.1, -0.08, 0.06, -0.12, 0.12, -0.05][i] };
});

/* committees: 19 nameplates on one circle, the first at the front */
export const RING_R = 3.6;
export const PLATES = committees.map((_, i) => {
  const a = (i / committees.length) * Math.PI * 2;
  return { a, p: new Vector3(C_RING.x + RING_R * Math.sin(a), C_RING.y, C_RING.z + RING_R * Math.cos(a)) };
});

/* schedule: three rulers (Day 1 at the back), 09:00 → 19:00 along x */
export const RULER_LEN = 9;
export const trackZ = (d: number) => C_RULER.z + (d - 1) * 1.25;
export const minToX = (m: number) => C_RULER.x - RULER_LEN / 2 + ((m - RULER.from) / (RULER.to - RULER.from)) * RULER_LEN;
export const SLOTS = schedule.map((d, di) => d.slots.map((s) => {
  const { start, end } = slotSpan(s.time);
  return { day: di, x0: minToX(start), x1: minToX(end), z: trackZ(di) };
}));

/* register: the delegate pass */
export const PASS = { w: 4.4, h: 2.4, stub: 1.25 };

/* ------------------------------------------------------------------ camera stations */
type Fit = { hx: number; hy: number };
type Station = { target: Vector3; dir: Vector3; wide: Fit; phone: Fit };
const v = (x: number, y: number, z: number) => new Vector3(x, y, z).normalize();
export const STATIONS: Station[] = [
  { target: new Vector3(0, 0, 0), dir: v(0, 0.1, 1), wide: { hx: 2.4, hy: 2.25 }, phone: { hx: 2.3, hy: 2.3 } },
  {
    target: DXB.p.clone().addScaledVector(DXB.up, 0.18),
    dir: DXB.up.clone().multiplyScalar(0.8).addScaledVector(DXB.north, -0.6).addScaledVector(DXB.east, 0.25).normalize(),
    wide: { hx: 0.62, hy: 0.5 }, phone: { hx: 0.55, hy: 0.55 },
  },
  { target: C_CLAUSES.clone(), dir: v(-0.12, 0.06, 1), wide: { hx: 2.45, hy: 2.05 }, phone: { hx: 2.45, hy: 2.05 } },
  { target: C_RING.clone(), dir: v(0, 0.85, 1), wide: { hx: 4.3, hy: 2.8 }, phone: { hx: 4.2, hy: 2.9 } },
  { target: C_RULER.clone().add(new Vector3(0, 0, 0.6)), dir: v(0.12, 1.05, 0.9), wide: { hx: 5.3, hy: 2.3 }, phone: { hx: 5.2, hy: 2.4 } },
  { target: C_PASS.clone(), dir: v(0.28, 0.14, 1), wide: { hx: 2.55, hy: 1.45 }, phone: { hx: 2.5, hy: 1.5 } },
];

/** Screen layout per mode: how much of the frame the object may use, and where it sits (fractions; +x right, +y up). */
export const isPhone = (aspect: number) => aspect < 0.85;
export function frame(i: number, aspect: number) {
  if (isPhone(aspect)) return i === 0 ? { ah: 0.92, av: 0.5, sx: 0, sy: 0.15 } : { ah: 0.92, av: 0.44, sx: 0, sy: 0.17 };
  return i === 0 ? { ah: 0.62, av: 0.62, sx: 0.12, sy: 0.08 } : { ah: 0.56, av: 0.7, sx: 0.17, sy: 0 };
}

/** Camera path through every station for this aspect ratio (rebuilt on resize). */
export function buildPath(aspect: number) {
  const tV = Math.tan((FOV / 2) * MathUtils.DEG2RAD), tH = tV * aspect;
  const cams: Vector3[] = [], looks: Vector3[] = [];
  STATIONS.forEach((s, i) => {
    const f = frame(i, aspect), fit = isPhone(aspect) ? s.phone : s.wide;
    const d = Math.max(fit.hy / (tV * f.av), fit.hx / (tH * f.ah));
    cams.push(s.target.clone().addScaledVector(s.dir, d));
    looks.push(s.target.clone());
  });
  return {
    cam: new CatmullRomCurve3(cams, false, 'centripetal'),
    look: new CatmullRomCurve3(looks, false, 'centripetal'),
    cams,
  };
}
export const at = (curve: CatmullRomCurve3, pos: number, out: Vector3) => curve.getPoint(MathUtils.clamp(pos / (N - 1), 0, 1), out);

/* ------------------------------------------------------------------ anchors for DOM labels */
// id → world position. Static ones are filled here; the globe keeps its own up to date every frame.
export const anchors = new Map<string, Vector3>();
PANELS.forEach((p, i) => anchors.set(`clause-${i}`, p.p.clone()));
PLATES.forEach((p, i) => anchors.set(`plate-${i}`, p.p.clone().add(new Vector3(0, 0.62, 0))));
for (let h = 9; h <= 19; h++) anchors.set(`hour-${h}`, new Vector3(minToX(h * 60), 0, trackZ(2) + 0.95));
schedule.forEach((_, d) => anchors.set(`day-${d}`, new Vector3(C_RULER.x - RULER_LEN / 2 - 0.35, 0, trackZ(d))));
SLOTS.forEach((day, d) => day.forEach((s, j) => anchors.set(`slot-${d}-${j}`, new Vector3(s.x0, 0.42, s.z))));
anchors.set('pass-main', new Vector3(C_PASS.x - PASS.w / 2 + 0.28, C_PASS.y + PASS.h / 2 - 0.3, C_PASS.z));
anchors.set('pass-stub', new Vector3(C_PASS.x + PASS.w / 2 - PASS.stub / 2, C_PASS.y + 0.1, C_PASS.z));
anchors.set('dxb-pin', DXB.p.clone());
// Dubai call-outs hang off leader lines (see World.tsx).
export const DXB_CALLOUTS = [
  { id: 'dxb-city', off: [0.0, 0.5, 0.05] },
  { id: 'dxb-host', off: [-0.36, 0.26, 0.0] },
  { id: 'dxb-venue', off: [0.34, 0.42, -0.05] },
].map((c) => {
  const p = DXB.p.clone().addScaledVector(DXB.east, c.off[0]).addScaledVector(DXB.up, c.off[1]).addScaledVector(DXB.north, c.off[2]);
  anchors.set(c.id, p);
  return { ...c, p };
});

/* the loader's numbered point web: a shell round the globe plus sparse points along the flight */
export const PLEXUS = (() => {
  const r = rng(2027);
  const pts: Vector3[] = [];
  while (pts.length < 54) {
    const d = new Vector3(r() * 2 - 1, (r() * 2 - 1) * 0.62, r() * 2 - 1);
    if (d.lengthSq() > 1 || d.lengthSq() < 0.05) continue;
    d.normalize().multiplyScalar(2.7 + r() * 3.4);
    if (d.z > 3.4) continue; // keep the space in front of the hero camera clear
    pts.push(d);
  }
  const centres = [C_CLAUSES, C_RING, C_RULER, C_PASS, new Vector3()];
  while (pts.length < 54 + 70) {
    const p = new Vector3(-18 + r() * 36, -7 + r() * 14, -60 + r() * 62);
    if (centres.some((c) => c.distanceTo(p) < 6.5)) continue;
    if (Math.abs(p.x) < 4 && Math.abs(p.y) < 3) continue; // off the main corridor
    pts.push(p);
  }
  const edges: [number, number][] = [];
  pts.forEach((a, i) => {
    const near = pts.map((b, j) => ({ j, d: a.distanceTo(b) })).filter((o) => o.j !== i && o.d < (i < 54 ? 2.6 : 5.5)).sort((x, y) => x.d - y.d).slice(0, 3);
    near.forEach((o) => { if (!edges.some(([p, q]) => (p === o.j && q === i) || (p === i && q === o.j))) edges.push([i, o.j]); });
  });
  const numbered = pts.slice(0, 54).map((_, i) => i).filter((i) => i % 3 === 0).slice(0, 16);
  const labels = numbered.map((i) => ({ i, n: 10 + Math.floor(r() * 80) }));
  labels.forEach(({ i }) => anchors.set(`px-${i}`, pts[i]));
  return { pts, edges, labels };
})();
