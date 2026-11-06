// The real-time hall: one fixed R3F canvas behind the page. Instanced seats with outlines drawn in the shader,
// a hairline floor plan, the dais (emblem, clock, speakers' board) and a camera that follows the page scroll.
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import {
  BoxGeometry, CatmullRomCurve3, Color, InstancedBufferAttribute, InstancedMesh, Object3D, PerspectiveCamera, Plane,
  ShaderMaterial, Vector3, type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { A0, A1, BOARD, blocks, CLOCK, COL, dialAngle, EMBLEM, FURNITURE, rake, ROW_DEPTH, ROWS, seats, slotArcs, TAKE_SEAT, WALL_Z } from './layout';
import { floorArc, Lines, polyline, seg, wallArc, type Segs } from './lines';
import { projectLabels } from './labels';
import { cam, clamp01, easeInOut, easeOutBack, introT, now, setUi, smoother, span, startIntro, T, ui, useUi } from './store';

/* ------------------------------------------------------------------ camera stations */
type Station = { pos: [number, number, number]; look: [number, number, number]; sx: number; sy: number };
const ts = seats[TAKE_SEAT];
const STATIONS: Station[] = [
  { pos: [0, 8.4, 21.5], look: [0, 2.5, 0], sx: 0, sy: 0.15 }, // 0 hero: down the hall to the podium
  { pos: [-19, 4.4, 12.5], look: [0, 1.0, 5.4], sx: 0.2, sy: 0 }, // 1 about: low, across the tiers
  { pos: [0, 27.5, 19.5], look: [0, 0, 7.0], sx: 0.21, sy: 0.02 }, // 2 committees: the 19 blocks from above
  { pos: [2.5, 4.5, 5.6], look: [CLOCK.x, CLOCK.y - 0.15, CLOCK.z], sx: 0.21, sy: 0 }, // 3 schedule: the dais clock
  { pos: [ts.x - 1.6, ts.y + 3.0, ts.z + 4.6], look: [ts.x, ts.y + 0.6, ts.z], sx: 0.22, sy: 0 }, // 4 register: one seat
  { pos: [15.5, 8.2, 17], look: [0, 1, 5], sx: 0.2, sy: 0 }, // 5 wellness: wide side view
  { pos: [0, 4.4, 0.4], look: [0, 0.4, 11], sx: 0.2, sy: 0 }, // 6 resources: from the rostrum
  { pos: [0, 44, 10.5], look: [0, 0, 6.0], sx: 0.2, sy: 0 }, // 7 contact: the plan from above
];
const TOP: Station = { pos: [0, 50, 8.4], look: [0, 0, 7.2], sx: 0, sy: 0 };
export const N_STATIONS = STATIONS.length;

/** Narrow screens: back the camera off to keep the hall's width, and frame the subject in the upper part. */
function fit(st: Station, aspect: number): Station {
  if (aspect >= 1.05) return st;
  // Portrait opening: the plan is seen turned 90° (see Rig), so its long side runs down the screen.
  if (st === TOP) return { pos: [0, 67, 7.5], look: [0, 0, 6.3], sx: 0, sy: 0.08 };
  const k = Math.min(2.3, 1 + (1 / aspect - 0.95) * 0.95);
  const d = st.pos.map((p, i) => st.look[i] + (p - st.look[i]) * k) as [number, number, number];
  return { pos: d, look: st.look, sx: 0, sy: st === TOP ? 0.1 : st === STATIONS[0] ? 0.17 : 0.22 };
}

/* ------------------------------------------------------------------ the outlined flat material */
const vert = /* glsl */ `
attribute vec3 aEdge;
varying vec3 vFill; varying vec3 vEdge; varying vec2 vUv; varying float vShade;
void main() {
  vUv = uv;
  vShade = normal.y > 0.5 ? 1.0 : (normal.y < -0.5 ? 0.45 : (abs(normal.z) > 0.5 ? 0.74 : 0.6));
  #ifdef USE_INSTANCING_COLOR
    vFill = instanceColor;
  #else
    vFill = vec3(1.0);
  #endif
  vEdge = aEdge;
  vec4 p = vec4(position, 1.0);
  #ifdef USE_INSTANCING
    p = instanceMatrix * p;
  #endif
  gl_Position = projectionMatrix * modelViewMatrix * p;
}`;
const frag = /* glsl */ `
uniform float uPx;
varying vec3 vFill; varying vec3 vEdge; varying vec2 vUv; varying float vShade;
void main() {
  vec2 d = min(vUv, 1.0 - vUv) / max(fwidth(vUv), vec2(1e-5));
  float px = min(d.x, d.y);
  float line = 1.0 - smoothstep(uPx - 0.5, uPx + 0.5, px);
  gl_FragColor = vec4(mix(vFill * vShade, vEdge, line), 1.0);
  #include <colorspace_fragment>
}`;
const makeMaterial = (dpr: number) => new ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: { uPx: { value: 1.1 * dpr } } });

const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
  const g = new BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
};
/** One seat, base on the floor, facing −z: a desk block and a chair back. */
const seatGeometry = () => mergeGeometries([box(0.56, 0.4, 0.3, 0, 0.2, -0.16), box(0.4, 0.66, 0.07, 0, 0.33, 0.2)]) as BufferGeometry;

const cSeat = new Color(COL.seat), cUn = new Color(COL.un), cTake = new Color(COL.take);
const cEdge = new Color(COL.seatEdge), cEdgeLit = new Color(COL.ink), cEdgeTake = new Color(COL.ground);

/* ------------------------------------------------------------------ seats */
function Seats() {
  const { gl, camera, raycaster, pointer } = useThree();
  const mesh = useRef<InstancedMesh>(null);
  const geo = useMemo(() => {
    const g = seatGeometry();
    g.setAttribute('aEdge', new InstancedBufferAttribute(new Float32Array(seats.length * 3), 3));
    return g;
  }, []);
  const mat = useMemo(() => makeMaterial(gl.getPixelRatio()), [gl]);
  const sim = useMemo(() => ({
    y: new Float32Array(seats.length), v: new Float32Array(seats.length), lit: new Float32Array(seats.length),
    dummy: new Object3D(), plane: new Plane(new Vector3(0, 1, 0), -1.0), hitP: new Vector3(), active: 0, tmp: new Color(),
  }), []);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  // The cursor counts only while it is over the canvas and has moved recently; a finger counts while it is down.
  useEffect(() => {
    const el = gl.domElement;
    const on = () => { sim.active = now(); };
    const off = () => { sim.active = 0; };
    el.addEventListener('pointermove', on);
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerleave', off);
    return () => { el.removeEventListener('pointermove', on); el.removeEventListener('pointerdown', on); el.removeEventListener('pointerleave', off); };
  }, [gl, sim]);

  useFrame((_, dtRaw) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(dtRaw, 1 / 30);
    const t = introT();
    const s = cam.s;
    const inCommittees = Math.abs(s - 2) < 0.6 && t > T.done;
    const inRegister = Math.abs(s - 4) < 0.6 && t > T.done;
    let px = 0, pz = 0, hasP = false;
    if (sim.active && now() - sim.active < 2.5 && t > T.hero) {
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(sim.plane, sim.hitP)) { px = sim.hitP.x; pz = sim.hitP.z; hasP = true; }
    }
    const edge = geo.getAttribute('aEdge') as InstancedBufferAttribute;
    let lift = 0;
    for (let i = 0; i < seats.length; i++) {
      const st = seats[i];
      // Opening: each seat rises in its row's turn, front row first, with one small overshoot.
      const k = clamp01((t - (T.fill + st.order * 0.27)) / 0.42);
      const sy = k <= 0 ? 0.0001 : easeOutBack(k);
      // Before it rises, a seat shows as a flat footprint on the plan, drawn in row by row.
      const sxz = k > 0 || t > 0.3 + st.order * 0.1 ? 1 : 0.0001;
      // Lift target: cursor proximity, the chosen committee block, and the register seat.
      let target = 0;
      if (hasP) { const d = Math.hypot(st.x - px, st.z - pz); target = 0.42 * (1 - smoother(clamp01(d / 2.4))); }
      const isBlock = inCommittees && st.block === ui.block;
      const isTake = inRegister && i === TAKE_SEAT;
      if (isBlock) target = Math.max(target, 0.22);
      if (isTake) target = Math.max(target, 0.55);
      // Damped spring (stiffness 170, damping 15).
      sim.v[i] += ((target - sim.y[i]) * 170 - sim.v[i] * 15) * dt;
      sim.y[i] += sim.v[i] * dt;
      if (sim.y[i] > lift) lift = sim.y[i];
      const litTarget = isTake ? 2 : isBlock ? 1 : 0;
      sim.lit[i] += (litTarget - sim.lit[i]) * Math.min(1, dt * 14);
      sim.dummy.position.set(st.x, st.y + sim.y[i], st.z);
      sim.dummy.rotation.set(0, st.a, 0);
      sim.dummy.scale.set(sxz, sy, sxz);
      sim.dummy.updateMatrix();
      m.setMatrixAt(i, sim.dummy.matrix);
      // Colour: flat steps, never a glow. Blue for the chosen block, orange for the register seat.
      const l = sim.lit[i];
      if (l > 1.02) { sim.tmp.copy(cUn).lerp(cTake, Math.min(1, l - 1)); m.setColorAt(i, sim.tmp); cEdgeTake.toArray(edge.array, i * 3); }
      else { sim.tmp.copy(cSeat).lerp(cUn, Math.min(1, l)); m.setColorAt(i, sim.tmp); (l > 0.5 ? cEdgeLit : cEdge).toArray(edge.array, i * 3); }
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    edge.needsUpdate = true;
    cam.lift = lift;
  });

  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    if (e.instanceId === undefined || Math.abs(cam.s - 2) > 0.45 || introT() < T.done) return;
    e.stopPropagation();
    const b = seats[e.instanceId].block;
    if (b !== ui.block) setUi({ block: b });
  };
  return (
    <instancedMesh ref={mesh} args={[geo, mat, seats.length]} frustumCulled={false} onPointerMove={pick} onClick={pick}>
      <instancedBufferAttribute attach="instanceColor" args={[new Float32Array(seats.length * 3), 3]} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ dais furniture */
function Furniture() {
  const { gl } = useThree();
  const mesh = useRef<InstancedMesh>(null);
  const geo = useMemo(() => {
    const g = new BoxGeometry(1, 1, 1);
    const e = new Float32Array(FURNITURE.length * 3);
    FURNITURE.forEach((_, i) => new Color(i === FURNITURE.length - 1 ? COL.rule : COL.seatEdge).toArray(e, i * 3));
    g.setAttribute('aEdge', new InstancedBufferAttribute(e, 3));
    return g;
  }, []);
  const mat = useMemo(() => makeMaterial(gl.getPixelRatio()), [gl]);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  const d = useMemo(() => new Object3D(), []);
  const cols = useMemo(() => [new Color(COL.seat), new Color(COL.wall)], []);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const k = easeOutBack(span(T.descend + 0.3, T.podium + 0.2));
    FURNITURE.forEach(([x, y, z, w, h, dd], i) => {
      const wall = i === FURNITURE.length - 1;
      const sy = Math.max(0.0001, wall ? smoother(span(T.descend, T.podium)) : k);
      d.position.set(x, wall ? (y - h / 2) + (h / 2) * sy : y * sy, z);
      d.scale.set(w, h * sy, dd);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      m.setColorAt(i, cols[wall ? 1 : 0]);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[geo, mat, FURNITURE.length]} frustumCulled={false}>
      <instancedBufferAttribute attach="instanceColor" args={[new Float32Array(FURNITURE.length * 3), 3]} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ the floor plan in hairlines */
const D = Math.PI / 180;
function usePlan() {
  return useMemo(() => {
    const tiers: Segs = [], outlines: Segs = [], ruler: Segs = [], well: Segs = [], wall: Segs = [], board: Segs = [], emblem: Segs = [];
    // Tier steps: the front edge of every row across the whole fan, and the back edge of the last row.
    ROWS.forEach(({ r }) => floorArc(tiers, r - ROW_DEPTH / 2, rake(r), A0 - 3 * D, A1 + 3 * D, 72));
    const rl = ROWS[ROWS.length - 1].r;
    floorArc(tiers, rl + ROW_DEPTH / 2, rake(rl), A0 - 3 * D, A1 + 3 * D, 72);
    // Block outlines: inner arc, outer arc, two radials, each at its own rake.
    blocks.forEach((b) => {
      const y0 = rake(b.r0 + ROW_DEPTH / 2) + 0.01, y1 = rake(b.r1 - ROW_DEPTH / 2) + 0.01;
      floorArc(outlines, b.r0, y0, b.a0, b.a1, 16);
      floorArc(outlines, b.r1, y1, b.a0, b.a1, 16);
      for (const a of [b.a0, b.a1]) seg(outlines, [b.r0 * Math.sin(a), y0, b.r0 * Math.cos(a)], [b.r1 * Math.sin(a), y1, b.r1 * Math.cos(a)]);
    });
    // Degree ruler round the back of the hall (CAD-style): a tick every 2.5°, a long tick every 10°.
    const rr = 14.7, ry = rake(rl) + 0.02;
    floorArc(ruler, rr, ry, A0, A1, 96);
    for (let deg = -70; deg <= 70; deg += 2.5) {
      const a = deg * D, len = deg % 10 === 0 ? 0.5 : 0.2;
      seg(ruler, [rr * Math.sin(a), ry, rr * Math.cos(a)], [(rr + len) * Math.sin(a), ry, (rr + len) * Math.cos(a)]);
    }
    // The well in front of the rostrum and the centre axis.
    floorArc(well, 3.2, 0.005, -90 * D, 90 * D, 48);
    floorArc(well, 4.4, 0.005, -80 * D, 80 * D, 48);
    seg(well, [0, 0.005, 2.2], [0, 0.005, 5.4]);
    // Wall panelling: vertical joints and a frieze line.
    for (let x = -8; x <= 8; x += 1.6) seg(wall, [x, 0.7, WALL_Z + 0.02], [x, 11.8, WALL_Z + 0.02]);
    seg(wall, [-8.5, 7.0, WALL_Z + 0.02], [8.5, 7.0, WALL_Z + 0.02]);
    // Speakers' board: a frame and nine list lines.
    const { x: bx, y: by, z: bz, w: bw, h: bh } = BOARD;
    polyline(board, [[bx - bw / 2, by - bh / 2, bz], [bx + bw / 2, by - bh / 2, bz], [bx + bw / 2, by + bh / 2, bz], [bx - bw / 2, by + bh / 2, bz]], true);
    for (let i = 1; i <= 9; i++) {
      const y = by + bh / 2 - (bh * i) / 10.5;
      seg(board, [bx - bw / 2 + 0.2, y, bz], [bx - bw / 2 + 0.2 + (i % 3 === 0 ? 1.2 : 1.9), y, bz]);
    }
    // The emblem (gold): rings, a meridian grid and a double outer ring. Abstract; not any real organisation's mark.
    const { x: ex, y: ey, z: ez, r: er } = EMBLEM;
    for (const f of [1, 0.93, 0.7, 0.46, 0.22]) wallArc(emblem, ex, ey, ez, er * f, 0, Math.PI * 2, 96);
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; seg(emblem, [ex + Math.sin(a) * er * 0.22, ey + Math.cos(a) * er * 0.22, ez], [ex + Math.sin(a) * er * 0.93, ey + Math.cos(a) * er * 0.93, ez]); }
    return { tiers, outlines, ruler, well, wall, board, emblem };
  }, []);
}

/** The chosen committee block, outlined in UN blue. */
function BlockOutline({ b }: { b: number }) {
  const segs = useMemo(() => {
    const out: Segs = [], bl = blocks[b];
    const y0 = rake(bl.r0 + ROW_DEPTH / 2) + 0.02, y1 = rake(bl.r1 - ROW_DEPTH / 2) + 0.02;
    floorArc(out, bl.r0, y0, bl.a0, bl.a1, 16);
    floorArc(out, bl.r1, y1, bl.a0, bl.a1, 16);
    for (const a of [bl.a0, bl.a1]) seg(out, [bl.r0 * Math.sin(a), y0, bl.r0 * Math.cos(a)], [bl.r1 * Math.sin(a), y1, bl.r1 * Math.cos(a)]);
    return out;
  }, [b]);
  return <Lines segs={segs} color={COL.un} width={2.5} show={() => Math.abs(cam.s - 2) < 0.6 && introT() > T.done} />;
}

/* ------------------------------------------------------------------ the dais clock */
function Clock({ day, slot }: { day: number; slot: number }) {
  const { x, y, z, r } = CLOCK;
  const face = useMemo(() => {
    const out: Segs = [];
    wallArc(out, x, y, z, r, 0, Math.PI * 2, 120);
    wallArc(out, x, y, z, r * 0.94, 0, Math.PI * 2, 120);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2, l = i % 5 === 0 ? 0.16 : 0.07;
      seg(out, [x + Math.sin(a) * (r * 0.94 - l), y + Math.cos(a) * (r * 0.94 - l), z], [x + Math.sin(a) * r * 0.94, y + Math.cos(a) * r * 0.94, z]);
    }
    return out;
  }, [x, y, z, r]);
  const arcs = useMemo(() => slotArcs.map((list) => {
    const out: Segs = [];
    list.forEach((s) => {
      const a0 = dialAngle(s.start);
      const rr = r * 0.72;
      seg(out, [x + Math.sin(a0) * rr * 0.9, y + Math.cos(a0) * rr * 0.9, z], [x + Math.sin(a0) * rr * 1.1, y + Math.cos(a0) * rr * 1.1, z]);
      if (s.end !== null) wallArc(out, x, y, z, rr, a0 + 0.02, a0 + dialAngle(s.end - s.start) - 0.02, 32);
    });
    return out;
  }), [x, y, z, r]);
  const chosen = useMemo(() => {
    const out: Segs = [], s = slotArcs[day][slot];
    const a0 = dialAngle(s.start);
    if (s.end !== null) wallArc(out, x, y, z + 0.01, r * 0.72, a0, a0 + dialAngle(s.end - s.start), 40);
    else seg(out, [x + Math.sin(a0) * r * 0.6, y + Math.cos(a0) * r * 0.6, z + 0.01], [x + Math.sin(a0) * r * 0.84, y + Math.cos(a0) * r * 0.84, z + 0.01]);
    return out;
  }, [day, slot, x, y, z, r]);
  const hand = useMemo(() => { const out: Segs = []; seg(out, [0, -0.12, 0], [0, r * 0.82, 0]); wallArc(out, 0, 0, 0, 0.06, 0, Math.PI * 2, 16); return out; }, [r]);
  const grp = useRef<Object3D>(null);
  const spring = useMemo(() => ({ a: 0, v: 0 }), []);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30);
    const target = dialAngle(slotArcs[ui.day][ui.slot].start);
    // Unwrap so the hand takes the short way round.
    let goal = target;
    while (goal - spring.a > Math.PI) goal -= Math.PI * 2;
    while (goal - spring.a < -Math.PI) goal += Math.PI * 2;
    spring.v += ((goal - spring.a) * 120 - spring.v * 14) * dt;
    spring.a += spring.v * dt;
    if (grp.current) grp.current.rotation.z = -spring.a;
  });
  const on = () => introT() > T.podium;
  return (
    <group>
      <Lines segs={face} color={COL.wireHi} reveal={() => span(T.podium - 0.4, T.hero)} />
      {arcs.map((a, i) => <Lines key={i} segs={a} color={COL.mute} width={1.5} show={() => on() && ui.day === i} />)}
      <Lines segs={chosen} color={COL.un} width={4} show={on} />
      <group ref={grp} position={[x, y, z + 0.02]}>
        <Lines segs={hand} color={COL.ink} width={2} show={on} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ the camera */
const Y_AXIS = new Vector3(0, 1, 0);
const FINE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: fine)').matches;
function Rig() {
  const { camera, size } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  const path = useMemo(() => {
    const st = STATIONS.map((s) => fit(s, aspect));
    return {
      st,
      pos: new CatmullRomCurve3(st.map((s) => new Vector3(...s.pos)), false, 'centripetal'),
      look: new CatmullRomCurve3(st.map((s) => new Vector3(...s.look)), false, 'centripetal'),
      top: fit(TOP, aspect),
    };
  }, [aspect]);
  const v = useMemo(() => ({ p: new Vector3(), l: new Vector3(), tp: new Vector3(), tl: new Vector3(), a: new Vector3(), b: new Vector3(), right: new Vector3(), up: new Vector3(), sx: 0, sy: 0, init: false, mx: 0, my: 0 }), []);
  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20);
    const n = path.st.length;
    const s = Math.max(0, Math.min(n - 1, cam.s));
    const i = Math.min(n - 2, Math.floor(s));
    const f = smoother(s - i);
    const u = (i + f) / (n - 1);
    path.pos.getPoint(u, v.tp);
    path.look.getPoint(u, v.tl);
    let sx = path.st[i].sx + (path.st[i + 1].sx - path.st[i].sx) * f;
    let sy = path.st[i].sy + (path.st[i + 1].sy - path.st[i].sy) * f;
    // Opening: from directly above, descend into the hall and land on the podium.
    const t = introT();
    const k = easeInOut(span(T.descend, T.hero));
    if (k < 1) {
      v.a.set(...path.top.pos); v.b.set(...path.top.look);
      const h = path.st[0];
      v.tp.set(v.a.x + (h.pos[0] - v.a.x) * k, v.a.y + (h.pos[1] - v.a.y) * k, v.a.z + (h.pos[2] - v.a.z) * Math.sqrt(k));
      v.tl.set(v.b.x + (h.look[0] - v.b.x) * k, v.b.y + (h.look[1] - v.b.y) * k, v.b.z + (h.look[2] - v.b.z) * k);
      sx = path.top.sx + (h.sx - path.top.sx) * k; sy = path.top.sy + (h.sy - path.top.sy) * k;
      // A slow turn while the plan draws; on portrait screens the plan starts turned 90° and unwinds on the way down.
      const turn = (aspect < 1.05 ? Math.PI / 2 : 0) * (1 - k) + (1 - k) * 0.25 * (1 - span(0, T.descend + 1));
      v.a.subVectors(v.tp, v.tl).applyAxisAngle(Y_AXIS, turn);
      v.tp.copy(v.tl).add(v.a);
      v.p.copy(v.tp); v.l.copy(v.tl); v.sx = sx; v.sy = sy; v.init = true;
    } else {
      // Weight: critically damped follow (about 0.25 s).
      const a = v.init ? 1 - Math.exp(-dt * 5) : 1;
      v.p.lerp(v.tp, a); v.l.lerp(v.tl, a); v.sx += (sx - v.sx) * a; v.sy += (sy - v.sy) * a; v.init = true;
    }
    // A small camera turn with the cursor (fine pointers only).
    v.mx += ((FINE ? state.pointer.x : 0) - v.mx) * 0.05;
    v.my += ((FINE ? state.pointer.y : 0) - v.my) * 0.05;
    const dist = v.p.distanceTo(v.l);
    camera.position.copy(v.p);
    camera.lookAt(v.l);
    v.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    v.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    camera.position.addScaledVector(v.right, v.mx * dist * 0.025).addScaledVector(v.up, v.my * dist * 0.015);
    camera.lookAt(v.l);
    const W = size.width, H = size.height;
    (camera as PerspectiveCamera).setViewOffset(W, H, -v.sx * W, v.sy * H, W, H);
    projectLabels(camera, W, H, cam.s, t > T.done);
  });
  return null;
}

/* ------------------------------------------------------------------ the world */
function World() {
  const plan = usePlan();
  const block = useUi((u) => u.block), day = useUi((u) => u.day), slot = useUi((u) => u.slot);
  return (
    <>
      <color attach="background" args={[COL.ground]} />
      <Lines segs={plan.tiers} color={COL.wire} reveal={() => span(0.05, 0.9)} />
      <Lines segs={plan.ruler} color={COL.wireHi} reveal={() => span(0.25, 1.2)} />
      <Lines segs={plan.outlines} color={COL.wire} reveal={() => span(0.5, 1.5)} />
      <Lines segs={plan.well} color={COL.wire} reveal={() => span(0.6, 1.3)} />
      <Lines segs={plan.wall} color={COL.rule} reveal={() => span(T.descend + 0.6, T.podium + 0.3)} />
      <Lines segs={plan.board} color={COL.wireHi} reveal={() => span(T.podium - 0.3, T.hero)} />
      <Lines segs={plan.emblem} color={COL.gold} width={1.5} reveal={() => span(T.podium - 0.2, T.hero + 0.2)} />
      <BlockOutline b={block} />
      <Clock day={day} slot={slot} />
      <Furniture />
      <Seats />
      <Rig />
    </>
  );
}

/* ------------------------------------------------------------------ the canvas */
class Guard extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { document.documentElement.classList.replace('is-gl', 'is-still'); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function Hall({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return (
    <Guard fallback={fallback}>
      <div className="gl" aria-hidden="true">
        <Canvas
          dpr={[1, 2]}
          flat
          frameloop={hidden ? 'never' : 'always'}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          camera={{ fov: 36, near: 0.1, far: 200, position: TOP.pos }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
            gl.domElement.style.touchAction = 'pan-y';
            // The opening clock starts once the fonts are in and two frames have been drawn.
            document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(startIntro)));
          }}
        >
          <World />
        </Canvas>
      </div>
      {children}
    </Guard>
  );
}
