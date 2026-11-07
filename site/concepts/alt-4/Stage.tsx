// Option A for the opening + hero: "Hold to take the floor".
// Gate: press and hold (pointer or Space). The room leans in: rings travel inward, the drone rises, the heart quickens,
// the counter climbs to 193. Let go early and it drains (loss aversion). At full: a cut to black and silence (0.17 s),
// then the gavel: sound + 2-frame impact + camera kick + shockwave, and the floor rises into DXB MUN.
// Hero: the field breathes, follows the cursor; press and release anywhere fires your own shockwave.
// Scrolling: the camera turns round the wordmark through the reel (Reel.tsx), then the floor sinks.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { conference, stats, tba } from '@/data/conference';
import { emit, on } from './bus';
import * as links from './links';
import { CommitteesMorphButton } from './parts/morph';
import { Field, webglOK, type Pose } from './stage/field';
import { pickGrid, textMask } from './stage/textmap';
import { Sound, beatRate, renderLog, wavBase64, type LogEntry } from './stage/audio';

/** Phones that can: the heartbeat in your hand, and the gavel as a real knock. */
const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* not supported */ } };

type Phase = 'gate' | 'breath' | 'struck' | 'open';
const capture = typeof location !== 'undefined' && new URLSearchParams(location.search).has('capture');
// BREATH_S: the held breath before the gavel. The screen cuts to black and the sound to silence, then the hit.
const HOLD_S = 1.7, DRAIN_S = 0.9, BREATH_S = 0.17;

const ease = {
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

type Props = {
  settled: boolean;
  onOpen: () => void;
  standalone?: boolean;
  /** auto: no gate; the strike plays by itself when `go` turns true (another opening ran first). */
  auto?: boolean;
  go?: boolean;
  /** overlay: the floor is only the opening; it sits fixed above another hero and the parent removes it after onOpen. */
  overlay?: boolean;
};

export function Stage({ settled, onOpen, standalone = true, auto = false, go = false, overlay = false }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>(settled ? 'open' : 'gate');
  const [gl] = useState(() => webglOK());
  const [soundOn, setSoundOn] = useState(true);
  const [hint, setHint] = useState(false);
  const api = useRef<{ press: (v: boolean) => void; skip: () => void; auto: () => void; sound: Sound } | null>(null);
  const goNow = useRef(go);
  goNow.current = go;
  useEffect(() => { if (auto && go) api.current?.auto(); }, [auto, go]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    if (!gl) { setPhase('open'); onOpen(); return; }
    const field = new Field(cv, capture);
    const sound = new Sound(capture || settled);
    setSoundOn(sound.enabled);
    let disposed = false;
    let grid = pickGrid(innerWidth / innerHeight);
    let textBox = { w: 20, h: 6 };
    const rebuild = async () => {
      grid = pickGrid(innerWidth / innerHeight);
      const { mask, box } = await textMask(grid);
      if (disposed) return;
      textBox = box;
      field.build(grid, mask);
    };
    const size = () => field.resize(cv.clientWidth || innerWidth, cv.clientHeight || innerHeight, devicePixelRatio || 1);
    size();

    // ---- state
    let ph: Phase = settled ? 'open' : 'gate';
    let holding = false, p = 0, strikeAt = -1, last = performance.now(), t0 = last, nextBuzz = 0;
    let charge: { x: number; z: number; t: number } | null = null;
    let holdPose: Pose | null = null;
    const ptr = new THREE.Vector2(99, 99), ptrTarget = new THREE.Vector2(99, 99);
    let ptrAmp = 0, ptrSeen = -10, nx = 0, ny = 0;
    const log: LogEntry[] = [];
    const now = () => (performance.now() - t0) / 1000;
    const setP = (v: string) => { root.dataset.floor = v; };
    const root = document.documentElement;
    setP(ph);

    // ---- camera poses (fit the wordmark to the screen)
    const fitPose = (): Pose => {
      const aspect = field.camera.aspect;
      const fov = aspect < 1 ? 46 : 34;
      const pitch = aspect < 1 ? 0.92 : 0.74; // radians above the floor
      const vf = (fov * Math.PI) / 180;
      const hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
      const dW = (textBox.w * 0.62) / Math.tan(hf / 2);
      const dH = (textBox.h * 1.25) / Math.tan(vf / 2);
      const d = Math.max(dW, dH, 8);
      const target = V(0, 0.4, aspect < 1 ? 0.6 : 1.1);
      return { pos: V(0, target.y + Math.sin(pitch) * d, target.z + Math.cos(pitch) * d), target, fov };
    };
    const gatePose = (k: number): Pose => {
      const narrow = field.camera.aspect < 1;
      return {
        pos: V(0, lerp(1.05, 0.8, k), lerp(narrow ? 9 : 7.2, narrow ? 6.2 : 4.6, k)),
        target: V(0, lerp(-0.9, -0.2, k), -6), // looking down ~8°: the horizon sits high, the floor fills the screen
        fov: lerp(narrow ? 58 : 40, narrow ? 64 : 46, k),
      };
    };
    // The product turn: swing round the wordmark, lower and closer, until the letters stand like towers.
    const turn = (b: Pose, o: number): Pose => {
      const narrow = field.camera.aspect < 1;
      const target = b.target.clone();
      if (narrow) target.y += textBox.h * 0.3 * o;
      const off = b.pos.clone().sub(b.target);
      const d = off.length();
      const pitch = Math.asin(off.y / d) * lerp(1, 0.4, o);
      // Desktop: swing to the left side so the near letters land on the right, and lens-shift the picture right,
      // leaving the left half to the statement. Phone: the statement sits on top, the letters below.
      const yaw = Math.atan2(off.x, off.z) + lerp(0, narrow ? -0.75 : 0.95, o);
      const dd = d * lerp(1, narrow ? 0.7 : 0.86, o);
      const pos = target.clone().add(V(Math.sin(yaw) * Math.cos(pitch) * dd, Math.sin(pitch) * dd, Math.cos(yaw) * Math.cos(pitch) * dd));
      return { pos, target, fov: b.fov, shift: narrow ? 0 : 0.21 * o };
    };
    const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
      pos: a.pos.clone().lerp(b.pos, t), target: a.target.clone().lerp(b.target, t), fov: lerp(a.fov, b.fov, t),
    });

    // ---- the strike
    const strike = () => {
      if (ph !== 'gate') return;
      ph = 'breath'; setP(ph); setPhase('breath');
      holdPose = gatePose(1);
      strikeAt = now() + BREATH_S;
      sound.strike(BREATH_S);
      window.setTimeout(() => buzz([24, 50, 160]), BREATH_S * 1000);
      if (capture) log.push({ t: now(), type: 'strike', gap: BREATH_S });
      emit('gavel');
    };
    const open = () => {
      if (ph === 'open') return;
      ph = 'open'; setP(ph); setPhase('open');
      onOpen(); emit('ready');
    };
    const skip = () => {
      if (ph !== 'gate') return;
      holdPose = gatePose(p);
      strikeAt = now() - 0.6; // land straight in the settle, quietly
      ph = 'struck'; setP(ph); setPhase('struck');
      sound.hold(0);
    };
    const press = (v: boolean) => {
      if (ph !== 'gate') return;
      if (v) { sound.wake(); setHint(false); }
      else if (p > 0.04 && p < 0.98) setHint(true);
      holding = v;
    };
    const autoStrike = () => {
      if (ph !== 'gate') return;
      holdPose = gatePose(0.5);
      p = 0.5;
      strikeAt = now();
      ph = 'struck'; setP(ph); setPhase('struck');
      sound.wake(); sound.strike(0);
      emit('gavel');
    };
    api.current = { press, skip, auto: autoStrike, sound };

    // ---- pointer (the floor follows the cursor; clicks knock)
    const onMove = (e: PointerEvent) => {
      nx = (e.clientX / innerWidth) * 2 - 1; ny = -(e.clientY / innerHeight) * 2 + 1;
      field.pick(nx, ny, ptrTarget); ptrSeen = now();
      if (cursor.current) cursor.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    };
    // On the open floor: press to charge (the hill under you swells), release to fire your own shockwave.
    const onDown = (e: PointerEvent) => {
      cursor.current?.classList.add('is-down');
      if (ph !== 'open' || field.uniforms.uSink.value > 0.3) return;
      if ((e.target as HTMLElement).closest('a, button, input, nav, textarea, canvas.regc-canvas')) return;
      const hit = field.pick((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1, new THREE.Vector2());
      sound.wake();
      charge = { x: hit.x, z: hit.y, t: now() };
    };
    const onUp = () => {
      cursor.current?.classList.remove('is-down');
      if (!charge) return;
      const c = clamp01((now() - charge.t) / 1.1);
      const amp = 0.8 + 1.8 * c, size = 0.6 + 0.9 * c;
      field.addTap(charge.x, charge.z, now(), amp);
      sound.tap(size);
      if (c > 0.5) buzz([14, 30, 60]);
      if (capture) log.push({ t: now(), type: 'tap', size });
      charge = null;
    };
    const offTap = on('tap', () => {
      sound.wake(); sound.tap(1);
      field.addTap(0, 0, now(), 1.4);
      if (capture) log.push({ t: now(), type: 'tap', size: 1 });
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (ph !== 'gate') return;
      e.preventDefault();
      if (e.type === 'keydown' && !e.repeat) press(true);
      if (e.type === 'keyup') press(false);
    };
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerdown', onDown);
    addEventListener('pointerup', onUp);
    addEventListener('keydown', onKey);
    addEventListener('keyup', onKey);
    let resizeT = 0;
    const onResize = () => {
      size();
      clearTimeout(resizeT);
      resizeT = window.setTimeout(() => {
        const g = pickGrid(innerWidth / innerHeight);
        if (g.cols !== grid.cols || g.rows !== grid.rows) void rebuild();
      }, 200);
    };
    addEventListener('resize', onResize);

    // ---- capture hooks (video.mjs)
    const w = window as unknown as Record<string, unknown>;
    if (capture) {
      w.__floor = {
        phase: () => ph,
        log,
        resetClock: () => { t0 = performance.now(); log.length = 0; },
        audio: async (dur: number) => wavBase64(await renderLog(log, dur)),
      };
    }

    // ---- loop
    let raf = 0;
    let reelEl: HTMLElement | null = null;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const tNow = performance.now();
      const dt = Math.min(1 / 20, (tNow - last) / 1000);
      last = tNow;
      const t = now();
      const u = field.uniforms;
      u.uTime.value = t;

      if (ph === 'gate') {
        const before = p;
        p = clamp01(p + (holding ? dt / HOLD_S : -dt / DRAIN_S));
        if (p !== before || holding) { sound.hold(p); if (capture) log.push({ t, type: 'hold', p }); }
        if (holding && t >= nextBuzz) { buzz(10 + Math.round(14 * p)); nextBuzz = t + 1 / beatRate(p); }
        if (p >= 1) strike();
      }
      if (ph === 'breath' && t >= strikeAt) { ph = 'struck'; setP(ph); setPhase('struck'); }

      // Hold visuals (frozen during the breath: everything stops, then the hit).
      const tau = strikeAt >= 0 ? t - strikeAt : -1;
      u.uHold.value = ph === 'gate' || ph === 'breath' ? p : Math.max(0, 1 - tau * 3) * p;
      u.uImpact.value = tau >= 0 ? tau : -1;
      u.uFlash.value = tau >= 0 && tau < 0.034 ? 1 : tau >= 0.034 && tau < 0.1 ? 1 - (tau - 0.034) / 0.066 : 0;

      // Letters: erupt behind the wave front (the spring itself runs per bar in the shader).
      u.uRiseT.value = settled ? 99 : tau >= 0 ? tau - 0.06 : -1;

      // Pointer hill.
      const active = t - ptrSeen < 1.6 && ph !== 'breath';
      ptrAmp += ((active ? 1 : 0) - ptrAmp) * Math.min(1, dt * 3);
      ptr.lerp(ptrTarget, Math.min(1, dt * 6));
      u.uPtr.value.copy(ptr);
      const ch = charge ? clamp01((t - charge.t) / 1.1) : 0;
      if (charge) { ptrTarget.set(charge.x, charge.z); ptrSeen = t; }
      u.uPtrAmp.value = ptrAmp * (ph === 'gate' ? 0.6 : 1) * (1 + ch * 2.6);

      // Scroll. With the reel (Reel.tsx) after the hero: the camera orbits the wordmark while the reel is pinned
      // (a Pixel-page product turn), then the floor sinks as About comes up. Without it: the floor just sinks.
      let sink: number, orbit = 0;
      const reel = reelEl ?? (reelEl = document.querySelector<HTMLElement>('.fl-reel'));
      if (reel && reel.offsetHeight > innerHeight * 1.2) {
        const r = reel.getBoundingClientRect();
        const span = r.height - innerHeight;
        const pre = clamp01(1 - r.top / innerHeight);
        const pin = clamp01(-r.top / span);
        orbit = ease.inOut(clamp01((pre + pin * 3) / 4));
        sink = clamp01((-r.top - span) / (innerHeight * 0.9));
      } else sink = clamp01(scrollY / (innerHeight * 0.9));
      u.uSink.value = sink;

      // Camera.
      let pose: Pose;
      if (ph === 'gate' || ph === 'breath') {
        pose = gatePose(ph === 'breath' ? 1 : ease.inOut(p));
        pose.pos.x += Math.sin(t * 0.4) * 0.12 * (1 - p);
      } else {
        const fit = fitPose();
        const k = settled ? 1 : ease.outExpo(clamp01((tau - 0.05) / 2.6));
        pose = mixPose(holdPose ?? gatePose(1), fit, k);
        if (orbit > 0) pose = turn(pose, orbit * k);
        // idle drift + pointer parallax
        pose.pos.x += Math.sin(t * 0.13) * 0.5 * k + nx * 0.8 * k;
        pose.pos.y += ny * 0.4 * k;
        // sink: tilt toward top-down
        pose.pos.lerp(V(0, pose.pos.y + 4, fit.target.z + 2), sink * 0.6);
        if (pose.shift) pose.shift *= 1 - sink;
      }
      // The kick: a hard, fast-decaying shake.
      let roll = 0;
      if (tau >= 0 && tau < 0.7) {
        const a = Math.exp(-tau * 7) * 0.45;
        pose.pos.x += Math.sin(tau * 91) * a;
        pose.pos.y += Math.sin(tau * 67 + 1.3) * a * 0.8;
        roll = Math.sin(tau * 53) * a * 0.06;
      }
      if (ph === 'struck' && tau > 1.25) open();
      // Fog follows the camera: the near field stays crisp, the far edge melts into the ground.
      const dist = pose.pos.distanceTo(pose.target);
      u.uFogNear.value = dist * 0.95;
      u.uFogFar.value = dist * 2.1;

      if (ring.current) ring.current.style.strokeDashoffset = String(1 - p);
      if (count.current) count.current.textContent = String(Math.round(p * 193)).padStart(3, '0');

      // The held breath: a cut to black. Then the hit frame.
      if (ph === 'breath') { field.renderer.setClearColor('#000000', 1); field.renderer.clear(); return; }
      field.renderer.setClearColor('#03060C', 1);
      // Don't draw while the hero is fully out of view.
      if (sink < 1 || ph !== 'open' || capture) field.render(pose, roll);
    };

    if (auto && goNow.current && !settled) autoStrike(); // `go` was already true on mount (the opening was skipped)
    void rebuild().then(() => { if (!disposed) frame(); });
    const idle = window.setTimeout(() => { if (ph === 'gate' && p === 0) setHint(true); }, 6000);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(idle); clearTimeout(resizeT);
      removeEventListener('pointermove', onMove); removeEventListener('pointerdown', onDown);
      removeEventListener('pointerup', onUp); removeEventListener('keydown', onKey); removeEventListener('keyup', onKey);
      removeEventListener('resize', onResize);
      offTap();
      field.dispose();
      delete root.dataset.floor;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gated = phase === 'gate' || phase === 'breath';
  return (
    <section id={overlay ? undefined : 'home'} className={`fl-hero is-${phase}${gl ? '' : ' no-gl'}${overlay ? ' fl-overlay' : ''}${auto ? ' is-auto' : ''}`} aria-labelledby={overlay ? undefined : 'fl-h'}>
      <canvas ref={canvas} className="fl-canvas" aria-hidden="true" />
      {capture && <div ref={cursor} className="fl-cursor" aria-hidden="true" />}

      {!settled && !auto && (
        <div className="fl-gate" aria-hidden={!gated} inert={!gated}>
          <div className="fl-gate-top mono">
            <span>DXB MUN 2027 <i>/</i> Session 01</span>
            <span>Dubai <i>/</i> 25.20° N, 55.27° E</span>
          </div>
          <p className="fl-gate-line">The floor is yours.<br /><em>Take it.</em></p>
          <button
            type="button"
            className="fl-hold"
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); api.current?.press(true); }}
            onPointerUp={() => api.current?.press(false)}
            onPointerCancel={() => api.current?.press(false)}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Press and hold to enter"
          >
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="56" className="fl-hold-track" />
              <circle ref={ring} cx="60" cy="60" r="56" className="fl-hold-fill" pathLength={1} />
            </svg>
            <span className="fl-hold-n mono" ref={count}>000</span>
            <span className="fl-hold-l mono">of 193</span>
          </button>
          <p className={'fl-gate-cta mono' + (hint ? ' is-hint' : '')}>{hint ? 'Keep holding' : 'Press and hold'}<span> · or hold Space</span></p>
          <div className="fl-gate-bot mono">
            <button type="button" onClick={() => { const s = api.current?.sound; if (!s) return; s.setEnabled(!s.enabled); setSoundOn(s.enabled); }} aria-pressed={soundOn}>
              Sound {soundOn ? 'on' : 'off'}
            </button>
            <button type="button" onClick={() => api.current?.skip()}>Skip intro</button>
          </div>
        </div>
      )}

      {!overlay && <div className="fl-copy" aria-hidden={gated}>
        <h1 id="fl-h" className="sr">{conference.edition}</h1>
        {!gl && <p className="fl-fallback" aria-hidden="true">DXB MUN</p>}
        <div className="fl-copy-row">
          <p className="fl-title"><span><span>The floor</span></span> <span><span>is yours.</span></span></p>
          <div className="fl-ctas">
            <a className="fl-btn" href={links.register} onClick={() => emit('tap')}>Register</a>
            {/* Material container transform: the button grows into the full list of committees. */}
            <CommitteesMorphButton className="fl-btn fl-btn-ghost" label={`${stats[0].value} committees`} />
          </div>
        </div>
        <dl className="fl-facts mono">
          <div><dt>Model United Nations</dt><dd>{conference.city} · {conference.year}</dd></div>
          <div><dt>Hosted by</dt><dd className="fl-host">{conference.host}</dd></div>
          <div><dt>Dates</dt><dd>{tba(conference.dates)}</dd></div>
          <div><dt>Venue</dt><dd>{tba(conference.venue)}</dd></div>
        </dl>
      </div>}
      {standalone && !overlay && <span className="fl-scroll mono" aria-hidden="true">Scroll</span>}
    </section>
  );
}
