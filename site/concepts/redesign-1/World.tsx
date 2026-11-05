// The one fixed WebGL stage under the page: the camera rig, both worlds, and the still-mode posters.
// The DOM overlays do NOT depend on this file: the scroll-to-stop driver runs on the GSAP ticker (driver.ts), so the
// clauses, nav and flight map keep working if WebGL is slow, never starts, or loses its context.
// No post-processing: an earlier desktop bloom pass (three's UnrealBloomPass) washed the lit hall out to white and
// cost several extra full-screen render targets on a machine with little memory, so it was removed.
// Dusk clarity pass: dpr [1, 2] on every device; phones are kept light with less geometry and no MSAA, never a lower
// resolution. drei's <Stars> (soft, glowing sprites) is replaced by hard-edged opaque-colour points.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type RootState } from '@react-three/fiber';
import { Space } from './Space';
import { Hall } from './Hall';
import { frame } from './frame';
import { poseAt, type Pose } from './layout';
import { LAST, rig, setUI } from './store';
import { DUSK, SCENE, mix } from './theme';

/** Put the scene in the state of a pose: camera, which world is visible, fog. */
function applyPose(state: Pick<RootState, 'scene' | 'camera'>, p: Pose, parallax = { x: 0, y: 0 }) {
  const cam = state.camera as THREE.PerspectiveCamera;
  const [x, y, z] = p.key.pos, [lx, ly, lz] = p.key.look;
  const dist = Math.hypot(x - lx, y - ly, z - lz);
  const k = Math.min(0.5, dist * 0.035); // parallax scales with how far the subject is
  cam.position.set(x + parallax.x * k, y + parallax.y * k * 0.6, z);
  cam.lookAt(lx, ly, lz);
  if (Math.abs(cam.fov - p.key.fov) > 0.01) { cam.fov = p.key.fov; cam.updateProjectionMatrix(); }
  const space = state.scene.getObjectByName('world-space');
  const hall = state.scene.getObjectByName('world-hall');
  if (space) space.visible = p.world === 'space';
  if (hall) hall.visible = p.world === 'hall';
  const fog = state.scene.fog as THREE.FogExp2 | null;
  if (fog) fog.density = p.world === 'hall' ? p.fog : 0;
  const stars = state.scene.getObjectByName('stars');
  if (stars) stars.position.copy(cam.position);
}

/* ------------------------------------------------------------------ the camera follows the shared stop parameter */
function Rig() {
  const par = useRef({ x: 0, y: 0 });
  const hud = useRef<HTMLElement | null>(null);
  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    par.current.x += (rig.pointer.x - par.current.x) * (1 - Math.exp(-3 * d));
    par.current.y += (rig.pointer.y - par.current.y) * (1 - Math.exp(-3 * d));
    const p = poseAt(rig.t);
    frame.pose = p;
    applyPose(state, p, par.current);
    hud.current ??= document.getElementById('hud-xyz');
    if (hud.current) {
      const c = state.camera.position;
      hud.current.textContent = `X ${c.x.toFixed(2)}  Y ${c.y.toFixed(2)}  Z ${c.z.toFixed(2)}  FOV ${(state.camera as THREE.PerspectiveCamera).fov.toFixed(0)}`;
    }
  });
  return null;
}

/* ------------------------------------------------------------------ still mode: one poster per stop */
function Posters({ onDone }: { onDone: () => void }) {
  const state = useThree();
  useEffect(() => {
    let alive = true;
    // two frames so textures upload, then draw each stop once
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!alive) return;
      const out: string[] = [];
      try {
        for (let i = 0; i <= LAST; i++) {
          rig.t = i;
          const p = poseAt(i);
          frame.pose = p;
          applyPose(state, p);
          state.advance(performance.now() / 1000, false); // runs each world's frame logic for this pose
          applyPose(state, p);
          state.gl.render(state.scene, state.camera);
          out.push(state.gl.domElement.toDataURL('image/jpeg', 0.92));
        }
      } catch { /* a dead context leaves the posters empty; the still page still reads */ }
      setUI({ posters: out });
      onDone();
    }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/* ------------------------------------------------------------------ lifecycle: pause off screen, survive context loss */
function Guard({ onLost, onRestored, still }: { onLost: () => void; onRestored: () => void; still: boolean }) {
  const gl = useThree((s) => s.gl);
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    const cv = gl.domElement;
    const lost = (e: Event) => { e.preventDefault(); setFrameloop('never'); onLost(); };
    const restored = () => onRestored();
    cv.addEventListener('webglcontextlost', lost);
    cv.addEventListener('webglcontextrestored', restored);
    const track = document.getElementById('main');
    const io = track && !still ? new IntersectionObserver(([e]) => setFrameloop(e.isIntersecting && !document.hidden ? 'always' : 'never'), { threshold: 0 }) : null;
    if (track && io) io.observe(track);
    return () => {
      cv.removeEventListener('webglcontextlost', lost);
      cv.removeEventListener('webglcontextrestored', restored);
      io?.disconnect();
    };
  }, [gl, setFrameloop, onLost, onRestored, still]);
  return null;
}

/* ------------------------------------------------------------------ the starfield: crisp round points, 1–2 device px */
const starVert = /* glsl */ `
  attribute float aB; attribute float aS;
  uniform float uPx;
  varying float vB; varying float vPx;
  void main() {
    vB = aB;
    gl_PointSize = uPx * aS;
    vPx = max(gl_PointSize, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const starFrag = /* glsl */ `
  uniform vec3 uDim; uniform vec3 uLit;
  varying float vB; varying float vPx;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = 1.0 - smoothstep(0.5 - 1.0 / vPx, 0.5, d);
    if (a <= 0.0) discard;
    gl_FragColor = vec4(mix(uDim, uLit, vB), a);
    #include <colorspace_fragment>
  }`;
function Starfield({ count }: { count: number }) {
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3), b = new Float32Array(count), sz = new Float32Array(count);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = 60 + rnd() * 50, q = Math.sqrt(1 - u * u);
      pos.set([r * q * Math.cos(th), r * u, r * q * Math.sin(th)], i * 3);
      b[i] = rnd() ** 2;
      sz[i] = rnd() < 0.12 ? 2 : 1.25;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aB', new THREE.BufferAttribute(b, 1));
    g.setAttribute('aS', new THREE.BufferAttribute(sz, 1));
    return g;
  }, [count]);
  const u = useMemo(() => ({
    uPx: { value: 1 },
    uDim: { value: new THREE.Color(mix(DUSK.ground, DUSK.muted, 0.35)) },
    uLit: { value: new THREE.Color(DUSK.ink) },
  }), []);
  useFrame((state) => { u.uPx.value = state.viewport.dpr; });
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial vertexShader={starVert} fragmentShader={starFrag} uniforms={u} transparent depthWrite={false} fog={false} />
    </points>
  );
}

export default function World({ still, onPostersDone, onLost, onRestored }: { still: boolean; onPostersDone?: () => void; onLost: () => void; onRestored: () => void }) {
  const lite = rig.lite;
  return (
    <Canvas
      className="stage-canvas"
      dpr={[1, 2]}
      frameloop={still ? 'never' : 'always'}
      gl={{ antialias: !lite, powerPreference: 'high-performance', alpha: false, preserveDrawingBuffer: still, stencil: false }}
      camera={{ fov: 42, near: 0.01, far: 220, position: [0, 0.5, 13] }}
    >
      <color attach="background" args={[SCENE.sky]} />
      <fogExp2 attach="fog" args={[SCENE.sky, 0]} />
      <group name="stars">
        <Starfield count={lite ? 700 : 2400} />
      </group>
      <Space />
      <Hall />
      {still ? <Posters onDone={() => onPostersDone?.()} /> : <Rig />}
      <Guard onLost={onLost} onRestored={onRestored} still={still} />
    </Canvas>
  );
}
