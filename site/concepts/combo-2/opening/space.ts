// The opening's 3D world (taken from Alt 3 · One Stage): the globe, Dubai, the numbered point web, the two camera
// stations (hero, Dubai) and the 3D anchor points the DOM labels pin themselves to. Pure data and maths; no React.
import { MathUtils, Vector3 } from 'three';

export const R = 2; // globe radius (world units)
export const FOV = 35;

/** Dubai, as on every other build (decimal degrees). */
export const DUBAI = { lat: 25.2048, lon: 55.2708 };

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
const sph = (latDeg: number, lonDeg: number, r = 1) => {
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

/* ------------------------------------------------------------------ camera stations: 0 the hero, 1 Dubai */
type Fit = { hx: number; hy: number };
type Station = { target: Vector3; dir: Vector3; wide: Fit; phone: Fit };
export const STATIONS: Station[] = [
  { target: new Vector3(0, 0, 0), dir: new Vector3(0, 0.1, 1).normalize(), wide: { hx: 2.4, hy: 2.25 }, phone: { hx: 2.3, hy: 2.3 } },
  {
    target: DXB.p.clone().addScaledVector(DXB.up, 0.18),
    dir: DXB.up.clone().multiplyScalar(0.8).addScaledVector(DXB.north, -0.6).addScaledVector(DXB.east, 0.25).normalize(),
    wide: { hx: 0.62, hy: 0.5 }, phone: { hx: 0.55, hy: 0.55 },
  },
];

/** Screen layout: how much of the frame the object may use (ah, av) and where it sits (sx, sy; +x right, +y up). */
export const isPhone = (aspect: number) => aspect < 0.85;
export function frame(i: number, aspect: number) {
  // Combo 2: the phone Dubai frame sits higher than Night Lab's (sy 0.06, was -0.12), which left the top 40% of the screen empty.
  if (isPhone(aspect)) return i === 0 ? { ah: 0.86, av: 0.42, sx: 0, sy: 0.2 } : { ah: 0.9, av: 0.5, sx: 0, sy: 0.06 };
  // Desktop hero: the globe sits right and up, clear of the title block bottom-left.
  return i === 0 ? { ah: 0.5, av: 0.62, sx: 0.2, sy: 0.1 } : { ah: 0.6, av: 0.66, sx: 0, sy: 0 };
}

/** Camera position and look target for each station at this aspect ratio. */
export function stations(aspect: number) {
  const tV = Math.tan((FOV / 2) * MathUtils.DEG2RAD), tH = tV * aspect;
  return STATIONS.map((s, i) => {
    const f = frame(i, aspect), fit = isPhone(aspect) ? s.phone : s.wide;
    const d = Math.max(fit.hy / (tV * f.av), fit.hx / (tH * f.ah));
    return { cam: s.target.clone().addScaledVector(s.dir, d), look: s.target.clone() };
  });
}

/* ------------------------------------------------------------------ anchors for DOM labels */
// id → world position. Static ones are filled here; the point web keeps its own up to date every frame.
export const anchors = new Map<string, Vector3>();
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

/* ------------------------------------------------------------------ the loader's numbered point web */
// A shell round the globe plus sparse far points behind it (the same seeded web as Alt 3, so it looks the same).
const FAR_CLEAR = [new Vector3(10, 0.5, -9), new Vector3(0, -0.5, -24), new Vector3(-10, 0, -37), new Vector3(0, 0.3, -50), new Vector3()];
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
  while (pts.length < 54 + 70) {
    const p = new Vector3(-18 + r() * 36, -7 + r() * 14, -60 + r() * 62);
    if (FAR_CLEAR.some((c) => c.distanceTo(p) < 6.5)) continue;
    if (Math.abs(p.x) < 4 && Math.abs(p.y) < 3) continue;
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
