// The one fixed stage: an R3F canvas behind everything, one camera flying a single path through six scenes.
// Wheel, keys and swipes step between scenes; the index jumps anywhere. The canvas pauses when the tab is hidden.
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { World } from './World';
import { at, buildPath, frame, FOV } from './layout';
import { projectLabels } from './labels';
import { N, SCENES } from './content';
import { PHASE_AT, ease, flight, get, goTo, intro, introT, now, set, span, startIntro, tickFlight } from './store';

/* ------------------------------------------------------------------ coordinates read-out (bottom-left corner) */
export const coordsRef: { el: HTMLElement | null } = { el: null };
const FINE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: fine)').matches;

function Rig() {
  const { camera, size } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  const path = useMemo(() => buildPath(aspect), [aspect]);
  const v = useMemo(() => ({ c: new Vector3(), l: new Vector3(), from: new Vector3(), right: new Vector3(), up: new Vector3(), px: 0, py: 0, n: 0 }), []);
  useFrame((state) => {
    const pos = tickFlight(now());
    at(path.cam, pos, v.c);
    at(path.look, pos, v.l);
    // Loader: the camera starts high above the web and swoops down to the hero (Igloo).
    const k = ease(span(PHASE_AT[1] - 0.2, PHASE_AT[3] + 0.4));
    if (k < 1) {
      v.from.copy(path.cams[0]).add(new Vector3(0, 9, -1.5));
      v.c.lerpVectors(v.from, v.c, k);
    }
    // A small cursor tilt (desktop pointers only).
    v.px += ((FINE ? state.pointer.x : 0) - v.px) * 0.05;
    v.py += ((FINE ? state.pointer.y : 0) - v.py) * 0.05;
    const dist = v.c.distanceTo(v.l);
    v.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    v.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    v.c.addScaledVector(v.right, v.px * dist * 0.03).addScaledVector(v.up, v.py * dist * 0.02);
    camera.position.copy(v.c);
    camera.lookAt(v.l);
    // Each scene frames its object beside (desktop) or above (phone) its caption.
    const i0 = Math.floor(pos), i1 = Math.min(N - 1, i0 + 1), f = pos - i0;
    const a = frame(i0, aspect), b = frame(i1, aspect);
    const sx = a.sx + (b.sx - a.sx) * f, sy = a.sy + (b.sy - a.sy) * f;
    const W = size.width, H = size.height;
    (camera as THREE_PC).setViewOffset(W, H, -sx * W, sy * H, W, H);
    projectLabels(camera, W, H);
    if (coordsRef.el && v.n++ % 5 === 0) {
      const p = camera.position;
      coordsRef.el.textContent = `CAM X ${p.x.toFixed(2)} Y ${p.y.toFixed(2)} Z ${p.z.toFixed(2)}`;
    }
  });
  return null;
}
type THREE_PC = import('three').PerspectiveCamera;

/* ------------------------------------------------------------------ input */
export function skipIntro() {
  if (get().phase >= PHASE_AT.length - 1) return;
  if (introT() < PHASE_AT[3]) { startIntro(); intro.t0 = now() - PHASE_AT[3]; }
}
function useInput() {
  useEffect(() => {
    let acc = 0, last = 0, stepAt = 0;
    const step = (d: number) => { stepAt = performance.now(); acc = 0; goTo(get().scene + d); };
    const ready = () => get().phase >= PHASE_AT.length - 1 && !get().menu;
    const onWheel = (e: WheelEvent) => {
      const t = performance.now();
      if (!ready()) { skipIntro(); return; }
      const gap = t - last;
      last = t;
      // One gesture (including trackpad inertia) moves one scene; a fresh gesture or a long scroll moves again.
      if (flight.busy && (now() - flight.t0) / flight.dur < 0.75) return;
      if (gap < 160 && t - stepAt < flight.dur * 1000 + 300) return;
      acc += e.deltaY;
      if (Math.abs(acc) > 30) step(Math.sign(acc));
    };
    const onKey = (e: KeyboardEvent) => {
      if (!ready()) { skipIntro(); return; }
      if (e.target instanceof HTMLElement && e.target.closest('input,textarea,select')) return;
      const s = get().scene;
      if (['ArrowDown', 'PageDown', 'ArrowRight'].includes(e.key) || (e.key === ' ' && !(e.target as HTMLElement).closest?.('button,a'))) { e.preventDefault(); goTo(s + 1); }
      else if (['ArrowUp', 'PageUp', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); goTo(s - 1); }
      else if (e.key === 'Home') goTo(0);
      else if (e.key === 'End') goTo(N - 1);
      else if (/^[1-6]$/.test(e.key)) goTo(Number(e.key) - 1);
    };
    let y0 = 0, x0 = 0, t0 = 0;
    const onStart = (e: TouchEvent) => { y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; t0 = performance.now(); };
    const onEnd = (e: TouchEvent) => {
      if (!ready()) { skipIntro(); return; }
      const dy = y0 - e.changedTouches[0].clientY, dx = x0 - e.changedTouches[0].clientX;
      if (Math.abs(dy) > 45 && Math.abs(dy) > Math.abs(dx) && performance.now() - t0 < 900) goTo(get().scene + Math.sign(dy));
    };
    const onDown = () => { if (!ready()) skipIntro(); };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('pointerdown', onDown);
    };
  }, []);
}

/** Moves the loader phase forward on its clock, then lands on the scene named in the URL hash. */
function usePhases() {
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = introT();
      let p = 0;
      PHASE_AT.forEach((at, i) => { if (t >= at) p = i; });
      if (p !== get().phase) set({ phase: p });
      if (p < PHASE_AT.length - 1) raf = requestAnimationFrame(tick);
      else {
        const i = SCENES.findIndex((s) => '#' + s.id === location.hash);
        if (i > 0) goTo(i);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}

/* ------------------------------------------------------------------ the canvas */
class Guard extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { document.documentElement.classList.replace('is-stage', 'is-static'); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function Stage({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const [hidden, setHidden] = useState(() => document.hidden);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  useInput();
  usePhases();
  return (
    <Guard fallback={fallback}>
      <div className="stage" ref={wrap}>
        <div className="stage-gl" aria-hidden="true">
          <Canvas
            dpr={[1, 2]}
            flat
            frameloop={hidden ? 'never' : 'always'}
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
            camera={{ fov: FOV, near: 0.05, far: 220, position: [0, 9, 9] }}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
              // The loader clock starts once the fonts are in and the first frames have been drawn.
              document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(startIntro)));
            }}
          >
            <Rig />
            <World />
          </Canvas>
        </div>
        {children}
      </div>
    </Guard>
  );
}
