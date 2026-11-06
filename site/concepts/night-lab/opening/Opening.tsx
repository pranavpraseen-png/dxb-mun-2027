// Night Lab's opening: Alt 3's first scene (the numbered point web, the wireframe globe with dotted land and
// Dubai's block patch, the big hero title) on one pinned section, plus the loader the owner asked for on
// 2026-11-06: "DXBMUN27" types in, "DXB MUN" turns bold and expands until its letters open the whole screen.
// Scroll then flies the camera down to Dubai, where three call-outs pin to the city.
import { Component, useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { Vector3 } from 'three';
import { conference, tba } from '@/data/conference';
import { getLenis } from '@/shared/scroll';
import { COORDS } from '../data';
import { EASE, ScrollTrigger, UI, ease, gsap } from '../motion';
import { phaseStore } from '../store';
import { go, useMedia } from '../ui';
import { World } from './World';
import { FOV, PLEXUS, frame, isPhone, stations } from './space';
import { keepOut, projectLabels, register, type Align } from './labels';
import { Scramble } from './Scramble';
import { DONE, PHASE_AT, fly, getUi, intro, introT, now, setUi, skipIntro, span, useUi } from './clock';
import './opening.css';

const FINE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: fine)').matches;
const TYPED = 'DXBMUN27';
const WORD = 'DXB MUN';
const DUBAI_LABEL = '25.2048° N · 55.2708° E';
const TITLE = [conference.edition.slice(0, conference.edition.lastIndexOf(' ')), conference.edition.slice(conference.edition.lastIndexOf(' ') + 1)];

/* ------------------------------------------------------------------ camera */
function Rig() {
  const { camera, size } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  const st = useMemo(() => stations(aspect), [aspect]);
  const v = useMemo(() => {
    const d0 = st[0].cam.clone().sub(st[0].look), d1 = st[1].cam.clone().sub(st[1].look);
    return {
      c: new Vector3(), l: new Vector3(), dir: new Vector3(), from: new Vector3(), right: new Vector3(), up: new Vector3(),
      d0: d0.clone().normalize(), d1: d1.clone().normalize(), len0: d0.length(), len1: d1.length(), px: 0, py: 0,
    };
  }, [st]);
  useFrame((state) => {
    // Scroll flight: the camera keeps looking along a turning direction and zooms in on a log scale.
    const k = ease(Math.min(1, Math.max(0, (fly.p - 0.06) / 0.84)));
    v.l.lerpVectors(st[0].look, st[1].look, k);
    v.dir.lerpVectors(v.d0, v.d1, k).normalize();
    v.c.copy(v.l).addScaledVector(v.dir, Math.exp(Math.log(v.len0) + (Math.log(v.len1) - Math.log(v.len0)) * k));
    // Loader: the camera starts high above the web and swoops down to the hero.
    const s = ease(span(PHASE_AT[1] - 0.2, PHASE_AT[3] + 0.4));
    if (s < 1) { v.from.copy(st[0].cam).add(new Vector3(0, 9, -1.5)); v.c.lerpVectors(v.from, v.c, s); }
    // A small cursor tilt (desktop pointers only, hero only).
    const tilt = FINE ? 1 - k : 0;
    v.px += (state.pointer.x * tilt - v.px) * 0.05;
    v.py += (state.pointer.y * tilt - v.py) * 0.05;
    const dist = v.c.distanceTo(v.l);
    v.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    v.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    v.c.addScaledVector(v.right, v.px * dist * 0.03).addScaledVector(v.up, v.py * dist * 0.02);
    camera.position.copy(v.c);
    camera.lookAt(v.l);
    // Hero frames the globe right of the title (desktop) or above it (phone); Dubai sits centred.
    const a = frame(0, aspect), b = frame(1, aspect);
    const sx = a.sx + (b.sx - a.sx) * k, sy = a.sy + (b.sy - a.sy) * k;
    const W = size.width, H = size.height;
    (camera as PerspectiveCamera).setViewOffset(W, H, -sx * W, sy * H, W, H);
    projectLabels(camera, W, H);
  });
  return null;
}

/* ------------------------------------------------------------------ loader: type, embolden, expand through */
function Loader({ onDone }: { onDone: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const typed = useRef<HTMLSpanElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const word = useRef<SVGTextElement>(null);
  const solid = useRef<SVGUseElement>(null);
  const measure = useRef<SVGTextElement>(null);
  const gap = useRef<SVGRectElement>(null);
  const [gone, setGone] = useState(false);
  useLayoutEffect(() => {
    const w = wrap.current, t = typed.current, c = count.current, wd = word.current, so = solid.current;
    if (!w || !t || !c || !wd || !so) return;
    const n = { chars: 0, pct: 0 };
    const fig = (x: number) => String(Math.round(x)).padStart(3, '0').split('').map((d) => `<i>${d}</i>`).join('');
    const tl = gsap.timeline({
      onComplete: () => { setGone(true); onDone(); },
    });
    tl
      // 1 · type DXBMUN27, one key at a time, while the counter runs
      .to(n, { chars: TYPED.length, duration: 1.2, ease: 'none', onUpdate: () => { t.textContent = TYPED.slice(0, Math.floor(n.chars + 0.001)); } }, 0.15)
      .to(n, { pct: 100, duration: 1.55, ease: EASE, onUpdate: () => { c.innerHTML = fig(n.pct); } }, 0)
      // 2 · DXB MUN turns bold and expands (Mona Sans' weight and width axes)
      .add(() => w.classList.add('is-word'), 1.5)
      .fromTo(wd, { fontWeight: 300, fontStretch: '75%' }, { fontWeight: 800, fontStretch: '125%', duration: 0.55, ease: EASE }, 1.5)
      // 3 · the solid word keeps growing about the gap between DXB and MUN until both halves leave the screen;
      //     the page opens up through that gap as it widens
      .add(() => {
        w.classList.add('is-through');
        const m = measure.current, g = gap.current;
        let ox = innerWidth / 2, oy = innerHeight / 2;
        try {
          if (!m || !g) throw new Error('no measure');
          m.style.cssText = wd.style.cssText;
          const e = m.getExtentOfChar(3); // the space
          ox = e.x + e.width / 2; oy = e.y + e.height / 2;
          g.setAttribute('x', String(e.x + 2)); g.setAttribute('y', String(e.y));
          g.setAttribute('width', String(Math.max(1, e.width - 4))); g.setAttribute('height', String(e.height));
        } catch { /* centre of the screen */ }
        gsap.set([wd, g], { svgOrigin: `${ox} ${oy}` });
      }, 2.15)
      .to([wd, gap.current], { scale: 70, duration: 1.45, ease: 'power4.in' }, 2.15)
      // 4 · as the last letters leave, the opening builds as on Alt 3: numbered web, globe draws, camera swoops, text
      .add(() => { if (intro.t0 === Infinity) intro.t0 = now() - (PHASE_AT[1] - 0.25); }, 3.3);
    const skip = () => {
      if (tl.progress() >= 1) return;
      tl.progress(1);
      skipIntro();
    };
    const keys = ['keydown', 'pointerdown', 'wheel', 'touchstart'] as const;
    keys.forEach((k) => window.addEventListener(k, skip, { passive: true }));
    (window as unknown as { __opBoot?: gsap.core.Timeline }).__opBoot = tl;
    return () => { keys.forEach((k) => window.removeEventListener(k, skip)); tl.kill(); };
  }, [onDone]);
  if (gone) return null;
  return (
    <div className="op-boot" ref={wrap} aria-hidden="true">
      <svg className="op-boot-svg" width="100%" height="100%">
        <defs>
          <text id="op-word" ref={word} x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="op-boot-word">{WORD}</text>
          <rect id="op-gap" ref={gap} x="0" y="0" width="0" height="0" />
          <mask id="op-boot-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <rect width="100%" height="100%" fill="#fff" />
            <use href="#op-gap" fill="#000" className="op-boot-hole" />
          </mask>
        </defs>
        <rect className="op-boot-sheet" width="100%" height="100%" mask="url(#op-boot-mask)" />
        <use href="#op-word" ref={solid} className="op-boot-solid" />
        <text ref={measure} x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="op-boot-word" fill="none">{WORD}</text>
      </svg>
      <p className="op-boot-type"><span ref={typed} /><i className="op-caret" /></p>
      <p className="op-boot-count"><span ref={count}><i>0</i><i>0</i><i>0</i></span> / <i>1</i><i>0</i><i>0</i></p>
      <p className="op-boot-skip mono">{FINE ? 'Press any key to skip' : 'Tap to skip'}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ labels pinned to 3D points */
function Lab({ id, align, on, className = '', children, delay = 0 }: { id: string; align: Align; on: boolean; className?: string; children: ReactNode; delay?: number }) {
  return (
    <div className={'op-lab op-lab--' + align + (on ? ' is-on' : '') + (className ? ' ' + className : '')} ref={register(id, align)} style={{ ['--ld' as string]: `${delay}s` }}>
      {children}
    </div>
  );
}
function Labels() {
  const phase = useUi((s) => s.phase);
  const flying = useUi((s) => s.flying);
  const dubai = useUi((s) => s.dubai);
  const hero = phase >= 3 && !flying;
  return (
    <div className="op-labs" aria-hidden="true">
      {PLEXUS.labels.map(({ i, n }, k) => (
        <Lab key={'px' + i} id={`px-${i}`} align="r" on={phase >= 1 && !flying} className="op-lab--px" delay={k * 0.05}>{n}</Lab>
      ))}
      <Lab id="dxb-pin" align="r" on={hero} className="op-lab--pin"><Scramble text="DXB" play={hero} delay={0.4} /></Lab>
      <Lab id="dxb-city" align="b" on={dubai}><span className="op-tag op-tag--accent">01</span><Scramble text={`${conference.city} · ${DUBAI_LABEL}`} play={dubai} /></Lab>
      <Lab id="dxb-host" align="l" on={dubai}><span className="op-tag op-tag--gold">02</span><Scramble text={`Host · ${conference.host}`} play={dubai} delay={0.1} /></Lab>
      <Lab id="dxb-venue" align="b" on={dubai}><span className="op-tag">03</span><Scramble text={`Venue · ${tba(conference.venue)}`} play={dubai} delay={0.2} /></Lab>
    </div>
  );
}

/* ------------------------------------------------------------------ hero text */
function Hero() {
  const phase = useUi((s) => s.phase);
  const on = phase >= 3;
  return (
    <div className={'op-hero' + (on ? ' is-on' : '')}>
      <div className="op-cap" ref={keepOut('op-cap')}>
        <p className="mono op-kicker">{on && <Scramble text={`${conference.kind} · ${conference.city} · ${conference.year}`} />}</p>
        {/* two scramble runs, so a narrow screen can break the title between "DXB MUN" and the year */}
        <p className="op-title" aria-hidden="true">{on && <><Scramble text={TITLE[0]} delay={0.05} dur={0.9} /> <Scramble text={TITLE[1]} delay={0.2} dur={0.7} /></>}</p>
        <p className="op-line">{on && <><em><Scramble text="Diplomacy" delay={0.3} /></em> <Scramble text="around us." delay={0.4} /></>}</p>
      </div>
      <div className="op-foot" ref={keepOut('op-foot')}>
        <button type="button" className="mono op-cue" onClick={() => go('about')}>{on && <Scramble text="Scroll to fly in" delay={0.3} />} <span aria-hidden="true">↓</span></button>
        {/* always mounted (the hero is hidden until on), so the fly-in tween clips it out with the rest */}
        <DubaiClock />
        <p className="mono op-host">{on && <Scramble text={`Hosted by ${conference.host} · ${COORDS}`} delay={0.35} />}</p>
      </div>
    </div>
  );
}

/** The time in Dubai right now (Asia/Dubai), ticking each second; digits sit in fixed slots so nothing shifts. */
const DXB_TIME = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function DubaiClock() {
  const el = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    let id = 0;
    const tick = () => {
      if (el.current) el.current.innerHTML = DXB_TIME.format(new Date()).split('').map((ch) => (/\d/.test(ch) ? `<i>${ch}</i>` : `<b>${ch}</b>`)).join('');
      id = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    tick();
    return () => clearTimeout(id);
  }, []);
  return (
    <p className="op-clock" aria-label="Local time in Dubai">
      <span className="op-clock-dot" aria-hidden="true" />
      <span className="mono">Dubai now</span>
      <span className="op-clock-t" ref={el} />
    </p>
  );
}

/* ------------------------------------------------------------------ the section */
class Guard extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { document.documentElement.classList.remove('nl-boot'); getLenis()?.start(); phaseStore.set('ready'); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const hasWebGL = () => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
};

export function Opening({ fallback }: { fallback: ReactNode }) {
  const [gl] = useState(hasWebGL);
  if (!gl) return <>{fallback}</>;
  return <Guard fallback={fallback}><Live /></Guard>;
}

function Live() {
  const narrow = useMedia('(max-width: 767px)');
  const sec = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(true);
  const [booted, setBooted] = useState(false);

  // Once the word has left the screen: the nav slides in and the page may scroll.
  const loaderDone = useCallback(() => {
    document.documentElement.classList.remove('nl-boot');
    const nav = document.querySelector<HTMLElement>('.nav');
    if (nav) gsap.fromTo(nav, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: UI, ease: EASE, clearProps: 'clipPath' });
    phaseStore.set('ready');
    getLenis()?.start();
    ScrollTrigger.refresh();
  }, []);

  // Hold the page still while the loader runs.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('nl-boot');
    window.scrollTo(0, 0);
    let tries = 0;
    const hold = () => { const l = getLenis(); if (l) l.stop(); else if (tries++ < 30) requestAnimationFrame(hold); };
    hold();
    // the nav and the keep-out zone for its bar
    const nav = document.querySelector<HTMLElement>('.nav');
    keepOut('op-nav')(nav);
    let raf = 0;
    const tick = () => {
      const t = introT();
      let p = 0;
      PHASE_AT.forEach((at, i) => { if (t >= at) p = i; });
      if (p !== getUi().phase) setUi({ phase: p });
      if (p < DONE) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); root.classList.remove('nl-boot'); keepOut('op-nav')(null); };
  }, []);

  // Pin + scrub: the flight to Dubai. The hero text drops out first, the call-outs arrive at the end.
  useLayoutEffect(() => {
    const el = sec.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          id: 'flight', trigger: el, start: 'top top', end: () => '+=' + Math.round(window.innerHeight * (narrow ? 1.5 : 1.8)),
          pin: true, scrub: true, anticipatePin: 1,
          onUpdate: (s) => {
            fly.p = s.progress;
            setUi({ flying: s.progress > 0.03, dubai: s.progress > 0.88 });
          },
        },
      });
      tl.fromTo('.op-cap > *, .op-foot > *', { clipPath: 'inset(-20% -40px -20% -40px)', y: 0 }, { clipPath: 'inset(-20% -40px 120% -40px)', y: 24, duration: 0.12, stagger: 0.01, ease: EASE }, 0)
        .set({}, {}, 1);
    }, el);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => { ctx.revert(); io.disconnect(); };
  }, [narrow]);


  return (
    <section id="top" className={'op' + (isPhone(innerWidth / Math.max(1, innerHeight)) ? ' is-phone' : '')} ref={sec} aria-labelledby="op-h">
      <h1 id="op-h" className="sr">{conference.edition}: a {conference.kind} in {conference.city}, hosted by {conference.host}. {conference.motto}.</h1>
      <div className="op-gl" aria-hidden="true">
        <Canvas
          dpr={[1, 2]}
          flat
          frameloop={visible ? 'always' : 'never'}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          camera={{ fov: FOV, near: 0.05, far: 220, position: [0, 9, 9] }}
          onCreated={({ gl: r }) => {
            r.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
            // the loader starts once the fonts are in and the first frames have been drawn
            document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => setBooted(true))));
          }}
        >
          <Rig />
          <World />
        </Canvas>
      </div>
      <Labels />
      <Hero />
      {booted && <Loader onDone={loaderDone} />}
    </section>
  );
}

