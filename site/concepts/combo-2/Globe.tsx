// The one object: a wireframe globe made only of lines and numbered points (Igloo / Oryzo / GQ language).
// three.js through React Three Fiber. Fat 1px lines (Line2), drawn on per line during the loader, an opaque
// ground-coloured core so only the near side shows, and Dubai in the orange accent.
// Every frame reads `live` (loader + scroll progress) and writes the HTML overlays directly: no React renders.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { DUBAI } from './data';
import { coastlines, crossAt, graticule, ringsAround, sph, surveyLinks, surveyPoints, toSegments, type Lines, type V3 } from './geo';
import { clamp01, ease, lerp, live, seg } from './motion';

export const C = {
  ground: '#100904',
  ink: '#faf7ef',
  line: '#382416',
  line2: '#6c5f51',
  accent: '#dc5000',
};
const FOV = 30;
const TAN = Math.tan((FOV / 2) * (Math.PI / 180));

/** Overlay elements the scene positions every frame. */
export type Overlay = {
  labels: (HTMLElement | null)[];
  cad: SVGSVGElement | null;
  callout: HTMLElement | null;
  readout: HTMLElement | null;
  /** The hero's Dubai pin (marker call-out), shown on the first screen until the flight begins. */
  pin?: HTMLElement | null;
  onLock?: (locked: boolean) => void;
  /** Top of the hero's edge-to-edge word, in px from the stage top (measured by the stage). */
  footTop?: number;
};

/** Hero framing: the globe sits between the nav and the edge-to-edge word. */
export function heroFrame(w: number, footTop: number) {
  const top = 56;
  const phone = w < 768;
  const space = Math.max(160, footTop - top);
  const r = Math.min(space / 2 - (phone ? 12 : 30), w * (phone ? 0.46 : 0.3));
  return { cy: top + space / 2 + (phone ? 14 : 0), r };
}
/** Camera distance that shows a unit sphere at `rpx` CSS px radius in a viewport `h` tall. */
const distFor = (rpx: number, h: number) => 1 / Math.sin(Math.atan((rpx / (h / 2)) * TAN));
/** Projected silhouette radius in px for a camera at distance d. */
const radiusAt = (d: number, h: number) => (Math.tan(Math.asin(1 / d)) / TAN) * (h / 2);

function makeLines(l: Lines, color: string, width = 1) {
  const geo = new LineSegmentsGeometry();
  geo.setPositions(l.pos);
  const buf = new THREE.InstancedInterleavedBuffer(l.dist, 2, 1);
  geo.setAttribute('instanceDistanceStart', new THREE.InterleavedBufferAttribute(buf, 1, 0));
  geo.setAttribute('instanceDistanceEnd', new THREE.InterleavedBufferAttribute(buf, 1, 1));
  const mat = new LineMaterial({ color: new THREE.Color(color), linewidth: width, dashed: true, dashSize: 0, gapSize: 10, dashScale: 1 });
  const obj = new LineSegments2(geo, mat);
  return { obj, mat };
}
const draw = (m: LineMaterial, t: number) => { m.dashSize = t >= 1 ? 1.01 : Math.max(0, t); };

function Scene({ overlay, fixed }: { overlay: React.RefObject<Overlay>; fixed?: number }) {
  const { size, camera, invalidate } = useThree();
  const group = useRef<THREE.Group>(null);
  const st = useRef({ p: fixed ?? 0, drift: 0, locked: false, pinOn: false, lastRead: '', cadKey: '' });

  const parts = useMemo(() => {
    const grat = makeLines(toSegments(graticule()), C.line2);
    const coast = makeLines(toSegments(coastlines()), C.ink);
    const rings = makeLines(toSegments(ringsAround(DUBAI.lat, DUBAI.lon, [2, 4.5, 8])), C.line2);
    const cross = makeLines(toSegments(crossAt(DUBAI.lat, DUBAI.lon, 1.6)), C.accent, 1.5);
    // the silhouette ring: a unit circle in the view plane, scaled to the sphere's outline every frame
    const circ: V3[] = [];
    for (let i = 0; i <= 160; i++) { const a = (i / 160) * Math.PI * 2 + Math.PI / 2; circ.push([Math.cos(a), Math.sin(a), 0]); }
    const ring = makeLines(toSegments([circ]), C.ink);

    // survey points (numbered field that converges onto the sphere) + plexus links between neighbours
    const pts = surveyPoints();
    const links = surveyLinks();
    const pGeo = new THREE.BufferGeometry();
    const pArr = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => pArr.set(p.from, i * 3));
    pGeo.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
    const pMat = new THREE.PointsMaterial({ color: new THREE.Color(C.ink), size: 3, sizeAttenuation: false });
    const points = new THREE.Points(pGeo, pMat);
    points.frustumCulled = false;
    const plexGeo = new LineSegmentsGeometry();
    plexGeo.setPositions(new Float32Array(links.length * 6));
    const plexMat = new LineMaterial({ color: new THREE.Color(C.line2), linewidth: 1 });
    const plexus = new LineSegments2(plexGeo, plexMat);
    plexus.frustumCulled = false;

    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sph(DUBAI.lat, DUBAI.lon, 1.004)), 3));
    const dubai = new THREE.Points(dGeo, new THREE.PointsMaterial({ color: new THREE.Color(C.accent), size: 7, sizeAttenuation: false }));

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.994, 96, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(C.ground) }));
    return { grat, coast, rings, cross, ring, pts, links, points, pArr, plexus, plexGeo, plexMat, dubai, core };
  }, []);

  useEffect(() => () => {
    for (const o of [parts.grat, parts.coast, parts.rings, parts.cross, parts.ring]) { o.obj.geometry.dispose(); o.mat.dispose(); }
    parts.points.geometry.dispose(); (parts.points.material as THREE.Material).dispose();
    parts.plexGeo.dispose(); parts.plexMat.dispose();
    parts.dubai.geometry.dispose(); (parts.dubai.material as THREE.Material).dispose();
    parts.core.geometry.dispose(); (parts.core.material as THREE.Material).dispose();
  }, [parts]);

  useEffect(() => { invalidate(); }, [size.width, size.height, invalidate]);

  const v = useMemo(() => new THREE.Vector3(), []);
  const camDir = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dtRaw) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(0.05, dtRaw);
    const s = st.current;
    const W = size.width, H = size.height;
    const phone = W < 768;
    const boot = live.boot;

    // progress: fixed (still renders) or smoothed scroll
    if (fixed !== undefined) s.p = fixed;
    else s.p += (live.flight - s.p) * (1 - Math.exp(-dt * 7));
    const p = s.p;
    if (fixed === undefined && p < 0.002) s.drift += dt * 4.5;

    // ---- pose
    const hero = heroFrame(W, overlay.current?.footTop ?? H * 0.68);
    const dHero = distFor(hero.r, H);
    const dEnd = phone ? 2.15 : 1.9;
    const spin = ease(seg(p, 0, 0.74));
    const zoom = ease(seg(p, 0.16, 0.86));
    const move = ease(seg(p, 0, 0.55));
    // Dubai faces the viewer from the start (a little east and north of centre), so the flight reads as a zoom-in;
    // the hero only sways a few degrees either side of that pose
    const lonStart = DUBAI.lon - 22 + Math.sin(s.drift * 0.06) * 6;
    const lon = lerp(lonStart, DUBAI.lon, spin);
    const lat = lerp(16, DUBAI.lat, spin);
    g.rotation.set(lat * (Math.PI / 180), -lon * (Math.PI / 180), 0, 'XYZ');
    const d = 1 + (dHero - 1) * Math.pow((dEnd - 1) / (dHero - 1), zoom);
    const endCy = phone ? H * 0.44 : H * 0.5;
    const cy = lerp(hero.cy, endCy, move);
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0, d);
    cam.lookAt(0, 0, 0);
    cam.setViewOffset(W, H, 0, H / 2 - cy, W, H);
    cam.updateProjectionMatrix();
    camDir.set(0, 0, d);

    // ---- loader build (each piece draws on with its own window of the boot)
    const bRing = ease(seg(boot, 0.0, 0.32));
    const bPts = ease(seg(boot, 0.12, 0.62));
    const bGrat = ease(seg(boot, 0.3, 0.78));
    const bCoast = ease(seg(boot, 0.48, 1));
    draw(parts.ring.mat, bRing);
    draw(parts.grat.mat, bGrat);
    draw(parts.coast.mat, bCoast);
    draw(parts.rings.mat, ease(seg(p, 0.58, 0.9)));
    draw(parts.cross.mat, ease(seg(boot, 0.85, 1)));
    parts.dubai.visible = boot > 0.9;

    // silhouette ring: in the plane z = 1/d, radius sqrt(1 - 1/d^2)
    const rr = Math.sqrt(Math.max(0, 1 - 1 / (d * d)));
    parts.ring.obj.position.set(0, 0, 1 / d);
    parts.ring.obj.scale.setScalar(rr * 1.001);

    // survey points converge; plexus links follow them until the globe is drawn
    const pts = parts.pts;
    if (boot < 1 || parts.plexus.visible) {
      const posAttr = parts.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pts.length; i++) {
        const k = ease(clamp01(bPts * 1.35 - (i % 12) * 0.03));
        const a = pts[i].from, b = pts[i].at;
        parts.pArr[i * 3] = lerp(a[0], b[0], k);
        parts.pArr[i * 3 + 1] = lerp(a[1], b[1], k);
        parts.pArr[i * 3 + 2] = lerp(a[2], b[2], k);
      }
      posAttr.needsUpdate = true;
      const start = parts.plexGeo.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute;
      const arr = start.data.array as Float32Array;
      parts.links.forEach(([i, j], k) => {
        arr.set(parts.pArr.subarray(i * 3, i * 3 + 3), k * 6);
        arr.set(parts.pArr.subarray(j * 3, j * 3 + 3), k * 6 + 3);
      });
      start.data.needsUpdate = true;
      parts.plexus.visible = boot < 1;
    }
    parts.points.visible = boot > 0.04;

    for (const m of [parts.grat.mat, parts.coast.mat, parts.rings.mat, parts.cross.mat, parts.ring.mat, parts.plexMat]) m.resolution.set(W, H);
    g.updateMatrixWorld();

    // ---- overlays
    const o = overlay.current;
    if (!o) return;
    const toScreen = (x: number, y: number, z: number) => {
      v.set(x, y, z).applyMatrix4(g.matrixWorld);
      // on a sphere at the origin a point faces the camera when p·c > |p|² (plus a small margin at the limb)
      const facing = v.dot(camDir) > v.lengthSq() + 0.06;
      v.project(cam);
      return { x: (v.x + 1) * 0.5 * W, y: (1 - v.y) * 0.5 * H, facing };
    };
    // numbered labels on the survey points (none inside the hero pin's call-out box)
    const dq = toScreen(...(sph(DUBAI.lat, DUBAI.lon, 1.004) as V3));
    const pinLeft = !!o.pin?.classList.contains('is-left');
    const inPin = (x: number, y: number) => boot >= 1 && p < 0.08 && dq.facing && y > dq.y - 110 && y < dq.y + 24 &&
      (pinLeft ? x > dq.x - 230 && x < dq.x + 24 : x > dq.x - 24 && x < dq.x + 230);
    let li = 0;
    const showLabels = boot > 0.5 && p < 0.22;
    for (let i = 0; i < pts.length; i++) {
      if (!pts[i].label) continue;
      const el = o.labels[li++];
      if (!el) continue;
      const q = toScreen(parts.pArr[i * 3], parts.pArr[i * 3 + 1], parts.pArr[i * 3 + 2]);
      const on = showLabels && q.facing && !inPin(q.x, q.y);
      el.style.visibility = on ? 'visible' : 'hidden';
      if (on) el.style.transform = `translate3d(${Math.round(q.x + 6)}px, ${Math.round(q.y - 16)}px, 0)`;
    }
    // CAD handles and construction lines at the silhouette (hero only)
    if (o.cad) {
      const rpx = radiusAt(d, H);
      const key = `${Math.round(W / 2)}|${Math.round(cy)}|${Math.round(rpx)}`;
      if (key !== s.cadKey) {
        s.cadKey = key;
        o.cad.style.setProperty('--cx', `${Math.round(W / 2)}px`);
        o.cad.style.setProperty('--cy', `${Math.round(cy)}px`);
        o.cad.style.setProperty('--r', `${Math.round(rpx)}px`);
        o.cad.querySelectorAll<SVGLineElement>('[data-c]').forEach((ln) => {
          const c = ln.dataset.c;
          const cx = Math.round(W / 2), yy = Math.round(cy), r = Math.round(rpx);
          if (c === 'l') { ln.setAttribute('x1', '0'); ln.setAttribute('x2', String(cx - r - 14)); ln.setAttribute('y1', String(yy + 0.5)); ln.setAttribute('y2', String(yy + 0.5)); }
          if (c === 'r') { ln.setAttribute('x1', String(cx + r + 14)); ln.setAttribute('x2', String(W)); ln.setAttribute('y1', String(yy + 0.5)); ln.setAttribute('y2', String(yy + 0.5)); }
        });
      }
    }
    // Dubai: call-outs ride the city
    const q = dq;
    if (o.callout) o.callout.style.transform = `translate3d(${Math.round(q.x)}px, ${Math.round(q.y)}px, 0)`;
    // hero pin: the orange marker's call-out, until the flight begins
    const pinOn = boot >= 1 && p < 0.08 && q.facing;
    if (o.pin) {
      if (pinOn) o.pin.style.transform = `translate3d(${Math.round(q.x)}px, ${Math.round(q.y)}px, 0)`;
      if (pinOn !== s.pinOn) { s.pinOn = pinOn; o.pin.classList.toggle('is-on', pinOn); }
    }
    const lock = p > 0.7;
    if (lock !== s.locked) { s.locked = lock; o.onLock?.(lock); }
    if (o.readout) {
      const latN = lerp(16, DUBAI.lat, spin);
      let lonE = ((lon % 360) + 540) % 360 - 180;
      if (Math.abs(lonE) < 0.005) lonE = 0;
      const txt = `${Math.abs(latN).toFixed(2)}° ${latN >= 0 ? 'N' : 'S'} ${Math.abs(lonE).toFixed(2)}° ${lonE >= 0 ? 'E' : 'W'}`;
      if (txt !== s.lastRead) { s.lastRead = txt; o.readout.textContent = txt; }
    }
  });

  return (
    <group ref={group}>
      <primitive object={parts.core} />
      <primitive object={parts.grat.obj} />
      <primitive object={parts.coast.obj} />
      <primitive object={parts.rings.obj} />
      <primitive object={parts.cross.obj} />
      <primitive object={parts.points} />
      <primitive object={parts.plexus} />
      <primitive object={parts.dubai} />
      {/* the silhouette ring lives in camera space, so it is outside the rotating group */}
      <RingInView ring={parts.ring.obj} />
    </group>
  );
}

/** Keeps the silhouette ring facing the camera: it is parented to the scene, not the spinning group. */
function RingInView({ ring }: { ring: LineSegments2 }) {
  const { scene } = useThree();
  useEffect(() => {
    scene.add(ring);
    return () => { scene.remove(ring); };
  }, [scene, ring]);
  return null;
}

/**
 * The globe canvas. `fixed` renders a still pose (0 = hero, 1 = Dubai locked) once, for ?still and reduced motion.
 * `active` pauses the render loop when the stage is off screen.
 */
export default function Globe({ overlay, fixed, active = true }: { overlay: React.RefObject<Overlay>; fixed?: number; active?: boolean }) {
  return (
    <Canvas
      className="globe-canvas"
      dpr={[1, 2]}
      flat
      frameloop={fixed !== undefined ? 'demand' : active ? 'always' : 'never'}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: FOV, near: 0.01, far: 40, position: [0, 0, 4] }}
      aria-hidden="true"
    >
      <Scene overlay={overlay} fixed={fixed} />
    </Canvas>
  );
}
