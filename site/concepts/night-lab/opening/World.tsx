// The opening's 3D world, from Alt 3 · One Stage: the numbered point web, the wireframe globe with dotted land,
// and Dubai's line-drawn block patch with its reticle. Lines and points only: no textures, lighting, fog or
// transparency. The only filled surface is the globe's occluder, painted in the ground colour.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Float32BufferAttribute, Group, MathUtils, Points, PointsMaterial, Vector3 } from 'three';
import { COL, Segs, circle, poly, type Seg } from './lines';
import { DXB, DXB_CALLOUTS, GLOBE_ROT_Y, PLEXUS, R, anchors, rng } from './space';
import { LAND_MASK_B64 } from '../landmask';
import { PHASE_AT, fly, span } from './clock';

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const Y = V(0, 1, 0), X = V(1, 0, 0), Z = V(0, 0, 1);
const [P1, P2, P3] = [PHASE_AT[1], PHASE_AT[2], PHASE_AT[3]];

function Dots({ pts, color, size, reveal }: { pts: Vector3[]; color: string; size: number; reveal?: () => number }) {
  const obj = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pts.flatMap((p) => [p.x, p.y, p.z]), 3));
    const o = new Points(g, new PointsMaterial({ color, size, sizeAttenuation: false, transparent: false }));
    o.frustumCulled = false;
    return o;
  }, [pts, color, size]);
  useFrame(() => {
    if (!reveal) return;
    const n = Math.round(pts.length * Math.max(0, Math.min(1, reveal())));
    obj.geometry.setDrawRange(0, n);
    obj.visible = n > 0;
  });
  return <primitive object={obj} />;
}

/* ------------------------------------------------------------------ the numbered point web */
function Plexus() {
  const near = useRef<Group>(null);
  const { shell, shellSegs, farPts, farSegs } = useMemo(() => {
    const shell = PLEXUS.pts.slice(0, 54);
    const farPts = PLEXUS.pts.slice(54);
    const shellSegs: Seg = [], farSegs: Seg = [];
    PLEXUS.edges.forEach(([a, b]) => (a < 54 && b < 54 ? shellSegs : farSegs).push(PLEXUS.pts[a], PLEXUS.pts[b]));
    return { shell, shellSegs, farPts, farSegs };
  }, []);
  const tmp = useMemo(() => new Vector3(), []);
  useFrame((_, dt) => {
    const g = near.current;
    if (!g) return;
    // The web turns slowly while the hero rests, and stops once the camera leaves.
    g.rotation.y += dt * 0.035 * Math.max(0, 1 - fly.p * 4);
    PLEXUS.labels.forEach(({ i }) => anchors.get(`px-${i}`)!.copy(tmp.copy(PLEXUS.pts[i]).applyEuler(g.rotation)));
  });
  return (
    <>
      <group ref={near}>
        <Dots pts={shell} color={COL.ink} size={3} reveal={() => span(P1, P1 + 0.7)} />
        <Segs segs={shellSegs} color={COL.dim} reveal={() => span(P1 + 0.15, P2 + 0.2)} />
      </group>
      <Dots pts={farPts} color={COL.mute} size={2} reveal={() => span(P1, P2)} />
      <Segs segs={farSegs} color={COL.line} reveal={() => span(P1, P2 + 0.4)} />
    </>
  );
}

/* ------------------------------------------------------------------ the globe */
function landPoints() {
  const bin = atob(LAND_MASK_B64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const bit = (x: number, y: number) => { const i = y * 256 + x; return (bytes[i >> 3] >> (7 - (i & 7))) & 1; };
  const out: Vector3[] = [];
  const n = 7000, golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const lat = Math.asin(y);
    const lon = ((i * golden) % (2 * Math.PI)) - Math.PI;
    const u = Math.floor(((lon / Math.PI + 1) / 2) * 256) & 255;
    const v = Math.min(127, Math.max(0, Math.floor(((Math.PI / 2 - lat) / Math.PI) * 128)));
    if (!bit(u, v)) continue;
    out.push(V(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)).multiplyScalar(R * 1.004));
  }
  return out;
}
function Globe() {
  const { graticule, land } = useMemo(() => {
    const g: Seg = [];
    for (let lon = -180; lon < 180; lon += 20) {
      const pts: Vector3[] = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        const la = lat * MathUtils.DEG2RAD, lo = lon * MathUtils.DEG2RAD;
        pts.push(V(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)).multiplyScalar(R));
      }
      g.push(...poly(pts));
    }
    for (let lat = -60; lat <= 60; lat += 20) {
      const la = lat * MathUtils.DEG2RAD;
      g.push(...poly(circle(V(0, R * Math.sin(la), 0), R * Math.cos(la), Z, X, 72)));
    }
    return { graticule: g, land: landPoints() };
  }, []);
  // The limb: the silhouette circle, re-aimed at the camera every frame so the outline is always exact.
  const limb = useRef<Group>(null);
  const limbSegs = useMemo(() => poly(circle(V(0, 0, 0), 1, X, Y, 128)), []);
  useFrame(({ camera }) => {
    const g = limb.current;
    if (!g) return;
    const d = camera.position.length();
    const k = Math.min(1, R / d);
    g.position.copy(camera.position).multiplyScalar((R * k) / d);
    g.scale.setScalar(R * Math.sqrt(1 - k * k));
    g.lookAt(camera.position);
  });
  return (
    <group>
      <mesh renderOrder={-1}>
        <sphereGeometry args={[R * 0.995, 64, 32]} />
        <meshBasicMaterial color={COL.ground} />
      </mesh>
      <group rotation-y={GLOBE_ROT_Y}>
        <Segs segs={graticule} color={COL.dim} reveal={() => span(P2, P3)} />
        <Dots pts={land} color={COL.mute} size={1.5} reveal={() => span(P2 + 0.2, P3 + 0.2)} />
      </group>
      <group ref={limb}>
        <Segs segs={limbSegs} color={COL.ink} reveal={() => span(P2, P2 + 0.8)} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ Dubai: reticle, a line-drawn block patch, call-out leaders */
function box(c: Vector3, w: number, d: number, h: number, e: Vector3, n: Vector3, u: Vector3): Seg {
  const p = (x: number, y: number, z: number) => c.clone().addScaledVector(e, x).addScaledVector(n, z).addScaledVector(u, y);
  const b = [p(-w, 0, -d), p(w, 0, -d), p(w, 0, d), p(-w, 0, d)];
  const t = [p(-w, h, -d), p(w, h, -d), p(w, h, d), p(-w, h, d)];
  return [...poly(b, true), ...poly(t, true), b[0], t[0], b[1], t[1], b[2], t[2], b[3], t[3]];
}
function Dubai() {
  const callouts = useRef<Group>(null);
  useFrame(() => { if (callouts.current) callouts.current.visible = fly.p > 0.6; });
  const { grid, blocks, reticle, leaders } = useMemo(() => {
    const { p, up, east, north } = DXB;
    const at = (x: number, z: number) => p.clone().addScaledVector(east, x).addScaledVector(north, z);
    const grid: Seg = [];
    for (let i = -8; i <= 8; i++) grid.push(at(i * 0.05, -0.4), at(i * 0.05, 0.4), at(-0.4, i * 0.05), at(0.4, i * 0.05));
    const r = rng(55);
    const blocks: Seg = [];
    for (let i = 0; i < 22; i++) {
      const x = (r() * 2 - 1) * 0.3, z = (r() * 2 - 1) * 0.3;
      if (Math.hypot(x, z) < 0.08) continue; // keep the reticle clear
      blocks.push(...box(at(x, z), 0.01 + r() * 0.018, 0.01 + r() * 0.018, 0.03 + r() * r() * 0.24, east, north, up));
    }
    const reticle: Seg = [
      ...poly(circle(p, 0.065, east, north, 48), false),
      at(-0.13, 0), at(-0.035, 0), at(0.035, 0), at(0.13, 0), at(0, -0.13), at(0, -0.035), at(0, 0.035), at(0, 0.13),
    ];
    const leaders: Seg = DXB_CALLOUTS.flatMap((c) => [p.clone().addScaledVector(up, 0.01), c.p]);
    return { grid, blocks, reticle, leaders };
  }, []);
  return (
    <group>
      <Segs segs={grid} color={COL.line} reveal={() => span(P2 + 0.3, P3)} />
      <Segs segs={blocks} color={COL.ink} reveal={() => span(P2 + 0.5, P3 + 0.3)} />
      <Segs segs={reticle} color={COL.accent} reveal={() => span(P2 + 0.6, P3)} />
      <Dots pts={[DXB.p.clone().addScaledVector(DXB.up, 0.01)]} color={COL.accent} size={6} reveal={() => span(P2 + 0.6, P2 + 0.7)} />
      <group ref={callouts} visible={false}>
        <Segs segs={leaders} color={COL.mute} />
        <Dots pts={DXB_CALLOUTS.map((c) => c.p)} color={COL.ink} size={4} />
      </group>
    </group>
  );
}

export function World() {
  return (
    <>
      <color attach="background" args={[COL.ground]} />
      <Plexus />
      <Globe />
      <Dubai />
    </>
  );
}
