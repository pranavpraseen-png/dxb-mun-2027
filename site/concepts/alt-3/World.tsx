// Everything inside the one 3D world. Lines and numbered points only: no textures, no lighting, no fog,
// no transparency. The only filled surface is the globe's occluder, painted in the ground colour.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Float32BufferAttribute, Group, MathUtils, Points, PointsMaterial, Vector3 } from 'three';
import { COL, Segs, circle, poly, type Seg } from './lines';
import {
  C_PASS, C_RING, C_RULER, DXB, DXB_CALLOUTS, GLOBE_ROT_Y, PANEL, PANELS, PASS, PLATES, PLEXUS, R, RING_R, RULER_LEN, SLOTS,
  anchors, minToX, rng, trackZ,
} from './layout';
import { LAND_MASK_B64 } from './landmask';
import { PHASE_AT, flight, get, span, useStore } from './store';
import { schedule } from './content';

const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const Y = V(0, 1, 0), X = V(1, 0, 0), Z = V(0, 0, 1);

/* ------------------------------------------------------------------ points */
function Dots({ pts, color, size, reveal }: { pts: Vector3[]; color: string; size: number; reveal?: () => number }) {
  const obj = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pts.flatMap((p) => [p.x, p.y, p.z]), 3));
    const m = new PointsMaterial({ color, size, sizeAttenuation: false, transparent: false });
    const o = new Points(g, m);
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

/** Show a group only while the camera is near one of its scenes (keeps far scenes from cluttering a flight). */
function useNear(ref: React.RefObject<Group | null>, scenes: number[], reach = 0.95) {
  useFrame(() => {
    if (ref.current) ref.current.visible = scenes.some((s) => Math.abs(flight.pos - s) < reach);
  });
}

/* ------------------------------------------------------------------ the loader's numbered point web */
const [P1, P2, P3] = [PHASE_AT[1], PHASE_AT[2], PHASE_AT[3]];
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
    // The web turns slowly while the hero rests, and stops once the camera has left.
    const w = Math.max(0, 1 - flight.pos);
    g.rotation.y += dt * 0.035 * w;
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

/* ------------------------------------------------------------------ Dubai: reticle, a line-drawn block patch, call-outs */
function box(c: Vector3, w: number, d: number, h: number, e: Vector3, n: Vector3, u: Vector3): Seg {
  const p = (x: number, y: number, z: number) => c.clone().addScaledVector(e, x).addScaledVector(n, z).addScaledVector(u, y);
  const b = [p(-w, 0, -d), p(w, 0, -d), p(w, 0, d), p(-w, 0, d)];
  const t = [p(-w, h, -d), p(w, h, -d), p(w, h, d), p(-w, h, d)];
  return [...poly(b, true), ...poly(t, true), b[0], t[0], b[1], t[1], b[2], t[2], b[3], t[3]];
}
function Dubai() {
  const callouts = useRef<Group>(null);
  useNear(callouts, [1], 0.6);
  const { grid, blocks, reticle, leaders } = useMemo(() => {
    const { p, up, east, north } = DXB;
    const at = (x: number, z: number) => p.clone().addScaledVector(east, x).addScaledVector(north, z);
    const grid: Seg = [];
    for (let i = -8; i <= 8; i++) {
      grid.push(at(i * 0.05, -0.4), at(i * 0.05, 0.4), at(-0.4, i * 0.05), at(0.4, i * 0.05));
    }
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
      <group ref={callouts}>
        <Segs segs={leaders} color={COL.mute} />
        <Dots pts={DXB_CALLOUTS.map((c) => c.p)} color={COL.ink} size={4} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ clauses: six line-drawn panels */
function Clauses() {
  const g = useRef<Group>(null);
  useNear(g, [2]);
  const parts = useMemo(() => PANELS.map((pn, i) => {
    const w = PANEL.w / 2, h = PANEL.h / 2, t = 0.16;
    const q = (x: number, y: number) => V(x, y, 0);
    const frame = poly([q(-w, h), q(w, h), q(w, -h), q(-w, -h)], true);
    const ticks: Seg = [
      q(-w, h), q(-w + t, h), q(-w, h), q(-w, h - t), q(w, h), q(w - t, h), q(w, h), q(w, h - t),
      q(-w, -h), q(-w + t, -h), q(-w, -h), q(-w, -h + t), q(w, -h), q(w - t, -h), q(w, -h), q(w, -h + t),
    ];
    const rule: Seg = [q(-w + 0.12, h - 0.26), q(w - 0.12, h - 0.26)];
    return { i, pn, frame, ticks, rule, host: i === 0, corner: [q(-w, h)] };
  }), []);
  return (
    <group ref={g}>
      {parts.map((p) => (
        <group key={p.i} position={p.pn.p} rotation-y={p.pn.rotY}>
          <Segs segs={p.frame} color={COL.dim} />
          <Segs segs={p.ticks} color={p.host ? COL.gold : COL.ink} />
          <Segs segs={p.rule} color={COL.line} />
          <Dots pts={p.corner} color={COL.accent} size={5} />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ committees: 19 nameplates round one floor */
function Plate({ i, active }: { i: number; active: boolean }) {
  const segs = useMemo(() => {
    const w = 0.42, d = 0.11, h = 0.3;
    const a = [V(-w, 0, -d), V(-w, h, 0), V(-w, 0, d)], b = [V(w, 0, -d), V(w, h, 0), V(w, 0, d)];
    return [...poly(a, true), ...poly(b, true), a[0], b[0], a[1], b[1], a[2], b[2], V(-w * 0.8, h * 0.45, d * 0.55), V(w * 0.8, h * 0.45, d * 0.55)];
  }, []);
  const { p, a } = PLATES[i];
  return (
    <group position={p} rotation-y={a}>
      <Segs segs={segs} color={active ? COL.accent : COL.ink} width={active ? 2 : 1} />
    </group>
  );
}
function Ring() {
  const g = useRef<Group>(null);
  useNear(g, [3]);
  const active = useStore((s) => s.committee);
  const { floor, spokes, marks } = useMemo(() => {
    const c = C_RING;
    const floor: Seg = [...poly(circle(c, RING_R + 0.55, X, Z, 128)), ...poly(circle(c, 1.1, X, Z, 64)), ...poly(circle(c, 0.35, X, Z, 32))];
    const spokes: Seg = PLATES.flatMap(({ a }) => [
      c.clone().add(V(Math.sin(a) * 1.1, 0, Math.cos(a) * 1.1)),
      c.clone().add(V(Math.sin(a) * (RING_R - 0.3), 0, Math.cos(a) * (RING_R - 0.3))),
    ]);
    const marks = PLATES.map(({ a }) => c.clone().add(V(Math.sin(a) * (RING_R + 0.55), 0, Math.cos(a) * (RING_R + 0.55))));
    return { floor, spokes, marks };
  }, []);
  return (
    <group ref={g}>
      <Segs segs={floor} color={COL.dim} />
      <Segs segs={spokes} color={COL.line} />
      <Dots pts={marks} color={COL.mute} size={3} />
      {PLATES.map((_, i) => <Plate key={i} i={i} active={i === active} />)}
    </group>
  );
}

/* ------------------------------------------------------------------ schedule: three rulers and a playhead */
function Ruler() {
  const g = useRef<Group>(null);
  useNear(g, [4]);
  const day = useStore((s) => s.day);
  const { ticks, bases, slots, sessions, stems } = useMemo(() => {
    const x0 = C_RULER.x - RULER_LEN / 2, x1 = C_RULER.x + RULER_LEN / 2;
    const bases: Seg[] = [0, 1, 2].map((d) => [V(x0, 0, trackZ(d)), V(x1, 0, trackZ(d))]);
    const ticks: Seg = [];
    for (let m = 9 * 60; m <= 19 * 60; m += 30) {
      const x = minToX(m), big = m % 60 === 0;
      [0, 1, 2].forEach((d) => ticks.push(V(x, 0, trackZ(d) - (big ? 0.12 : 0.06)), V(x, 0, trackZ(d) + (big ? 0.12 : 0.06))));
      if (big) ticks.push(V(x, 0, trackZ(2) + 0.45), V(x, 0, trackZ(2) + 0.7));
    }
    const slots: Seg[] = [], sessions: Seg[] = [], stems: Seg[] = [];
    SLOTS.forEach((dslots, d) => {
      const s: Seg = [], ss: Seg = [], st: Seg = [];
      dslots.forEach((sl, j) => {
        const z = sl.z, hz = 0.24;
        const rect = poly([V(sl.x0, 0, z - hz), V(sl.x1, 0, z - hz), V(sl.x1, 0, z + hz), V(sl.x0, 0, z + hz)], true);
        (schedule[d].slots[j].name.startsWith('Committee Session') ? ss : s).push(...rect);
        st.push(V(sl.x0, 0, z), V(sl.x0, 0.42, z));
      });
      slots.push(s); sessions.push(ss); stems.push(st);
    });
    return { ticks, bases, slots, sessions, stems };
  }, []);
  // The playhead sweeps the chosen day, from its first slot to its last, and loops.
  const head = useRef<Group>(null);
  const headSegs = useMemo(() => [V(0, 0, trackZ(0) - 0.6), V(0, 0, trackZ(2) + 0.6), V(0, 0, trackZ(0) - 0.6), V(0, 0.55, trackZ(0) - 0.6)], []);
  useFrame(({ clock }) => {
    if (!head.current) return;
    const d = SLOTS[get().day];
    const a = d[0].x0, b = d[d.length - 1].x1;
    const k = (clock.elapsedTime % 7) / 7;
    head.current.position.x = a + (b - a) * k;
  });
  return (
    <group ref={g}>
      <Segs segs={ticks} color={COL.dim} />
      {[0, 1, 2].map((d) => (
        <group key={d}>
          <Segs segs={bases[d]} color={d === day ? COL.ink : COL.dim} />
          <Segs segs={slots[d]} color={d === day ? COL.ink : COL.line} />
          <Segs segs={sessions[d]} color={d === day ? COL.accent : COL.dim} width={d === day ? 2 : 1} />
          <Segs segs={stems[d]} color={d === day ? COL.mute : COL.line} />
          {d === day && <Dots pts={SLOTS[d].map((s) => V(s.x0, 0.42, s.z))} color={COL.ink} size={4} />}
        </group>
      ))}
      <group ref={head}>
        <Segs segs={headSegs} color={COL.accent} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ register: the delegate pass */
function Pass() {
  const g = useRef<Group>(null);
  useNear(g, [5]);
  const { outline, perf, code, strip, rule, corners } = useMemo(() => {
    const c = C_PASS, w = PASS.w / 2, h = PASS.h / 2, px = w - PASS.stub, nr = 0.14;
    const q = (x: number, y: number) => c.clone().add(V(x, y, 0));
    const top = [q(-w, h), q(px - nr, h), ...circle(q(px, h), nr, X, Y, 16, Math.PI, Math.PI * 2).slice(1, -1), q(px + nr, h), q(w, h)];
    const bot = [q(w, -h), q(px + nr, -h), ...circle(q(px, -h), nr, X, Y, 16, 0, Math.PI).slice(1, -1), q(px - nr, -h), q(-w, -h)];
    const outline = poly([...top, ...bot], true);
    const perf: Seg = [];
    for (let y = -h + nr + 0.06; y < h - nr - 0.06; y += 0.14) perf.push(q(px, y), q(px, Math.min(y + 0.07, h - nr - 0.06)));
    const r = rng(7);
    const code: Seg = [];
    for (let x = px + 0.22, i = 0; x < w - 0.2 && i < 40; x += 0.03 + r() * 0.05, i++) code.push(q(x, -h + 0.25), q(x, -h + 0.25 + (i % 4 === 0 ? 0.55 : 0.45)));
    const strip: Seg = [];
    for (let k = 0; k < 4; k++) strip.push(q(-w + 0.18, -h + 0.18 + k * 0.03), q(px - 0.3, -h + 0.18 + k * 0.03));
    const rule: Seg = [q(-w + 0.18, -h + 0.34), q(px - 0.3, -h + 0.34)];
    const corners = [q(-w, h), q(w, h), q(w, -h), q(-w, -h)];
    return { outline, perf, code, strip, rule, corners };
  }, []);
  return (
    <group ref={g}>
      <Segs segs={outline} color={COL.ink} />
      <Segs segs={perf} color={COL.mute} />
      <Segs segs={code} color={COL.dim} />
      <Segs segs={strip} color={COL.maroon} width={2} />
      <Segs segs={rule} color={COL.gold} />
      <Dots pts={corners} color={COL.accent} size={5} />
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
      <Clauses />
      <Ring />
      <Ruler />
      <Pass />
    </>
  );
}
