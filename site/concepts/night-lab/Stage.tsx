// Sections 0–2 on one pinned stage: the loader builds the globe, the globe becomes the hero, and scroll flies
// it to Dubai. Loader: Outfit counter + Dropbox grid lines + Igloo/Oryzo point field and CAD circle + Igloo
// scramble, then Lando's split and Getty's wordmark-to-logo. Flight: Terminal's mono call-outs on hairline leaders.
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { conference } from '@/data/conference';
import { getLenis } from '@/shared/scroll';
import { COORDS } from './data';
import { surveyPoints } from './geo';
import { BIG, EASE, SCRAMBLE_CHARS, ScrollTrigger, UI, gsap, live, still } from './motion';
import { phaseStore } from './store';
import { Chars, FitWord, go, useMedia } from './ui';

/** a label leaves (or enters) its row's mask by the row's full height, so short labels clear it too */
const rowDrop = (_: number, t: Element) => (t.parentElement?.clientHeight ?? 40) + 2;
import type { Overlay } from './Globe';

const Globe = lazy(() => import('./Globe'));
const LABELS = surveyPoints().filter((p) => p.label);
const SEEN_KEY = 'nl-boot-seen';
const seen = () => { try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return false; } };
const markSeen = () => { try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked: the loader just runs again */ } };
const forceBoot = () => typeof location !== 'undefined' && new URLSearchParams(location.search).has('boot');

/** Leader geometry from Dubai's screen point: elbow (ex, ey) and the horizontal run (len, negative = to the left). */
const LEADERS = {
  wide: [
    { ex: 64, ey: -64, len: 250 },
    { ex: 80, ey: 72, len: 290 },
    { ex: -72, ey: -104, len: -270 },
  ],
  narrow: [
    { ex: 30, ey: -30, len: 140 },
    { ex: 30, ey: 40, len: 140 },
    { ex: -30, ey: -96, len: -140 },
  ],
};
const CALLOUTS = [
  { k: '01 / City', v: `${conference.city} · ${COORDS}`, vNarrow: COORDS },
  { k: '02 / Host', v: conference.host, vNarrow: conference.host },
  { k: '03 / Conference', v: `${conference.edition} · ${conference.kind}`, vNarrow: conference.edition },
];

function Callouts({ narrow, locked, refEl }: { narrow: boolean; locked?: boolean; refEl?: React.Ref<HTMLDivElement> }) {
  const geo = narrow ? LEADERS.narrow : LEADERS.wide;
  return (
    <div className={'callout' + (locked ? ' is-locked' : '')} ref={refEl} aria-hidden={!locked}>
      <span className="reticle" aria-hidden="true"><i /><i /></span>
      {CALLOUTS.map((c, i) => {
        const g = geo[i];
        const diag = Math.hypot(g.ex, g.ey);
        const ang = Math.atan2(g.ey, g.ex);
        const left = g.len < 0;
        return (
          <div key={c.k} className={'leader' + (left ? ' is-left' : '')} style={{ ['--i' as string]: i }}>
            <i className="lg1" style={{ width: diag, ['--a' as string]: `${ang}rad` }} />
            <i className="lg2" style={{ left: left ? g.ex + g.len : g.ex, top: g.ey, width: Math.abs(g.len) }} />
            <p className="lab" style={{ left: g.ex, top: g.ey }}>
              <span className="lab-k">{c.k}</span>
              <span className="lab-v" data-s={narrow ? c.vNarrow : c.v}>{narrow ? c.vNarrow : c.v}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** The hero's Dubai pin: one mono call-out on a hairline leader and a solid plate (Terminal), riding the orange marker. */
function HeroPin({ narrow, refEl }: { narrow: boolean; refEl: React.Ref<HTMLDivElement> }) {
  return (
    <div className={'pin' + (narrow ? ' is-left' : '')} ref={refEl} aria-hidden="true">
      <i className="pin-l1" /><i className="pin-l2" />
      <p className="pin-lab"><span className="lab-k">{conference.city}</span><span className="lab-v">{COORDS}</span></p>
    </div>
  );
}

function CadMarks() {
  // Oryzo's CAD handles: a tangent bar with round ends and a square mid-point at each quadrant, plus construction lines.
  const H = (rot: number, pos: string) => (
    <g className="cad-h" style={{ transform: pos }}>
      <g className="cad-s">
        <g transform={`rotate(${rot})`}>
          <line x1="-34" x2="34" y1="0.5" y2="0.5" />
          <circle cx="-34" cy="0.5" r="3" />
          <circle cx="34" cy="0.5" r="3" />
          <rect x="-3.5" y="-3" width="7" height="7" />
        </g>
      </g>
    </g>
  );
  return (
    <>
      <line data-c="l" className="cad-c" />
      <line data-c="r" className="cad-c" />
      {H(0, 'translate(var(--cx), calc(var(--cy) - var(--r)))')}
      {H(0, 'translate(var(--cx), calc(var(--cy) + var(--r)))')}
      {H(90, 'translate(calc(var(--cx) - var(--r)), var(--cy))')}
      {H(90, 'translate(calc(var(--cx) + var(--r)), var(--cy))')}
    </>
  );
}

function HeroFoot({ footRef }: { footRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div className="hero-foot" ref={footRef}>
      <div className="hero-row">
        <p className="hero-motto"><em>{conference.motto}.</em></p>
        <p className="mono hero-kind">{conference.kind} · {conference.city}</p>
      </div>
      <div className="hero-rule" aria-hidden="true" />
      <FitWord className="hero-word" as="div"><Chars text={conference.name} /></FitWord>
      <div className="hero-corners">
        <span className="mono">{COORDS}</span>
        <span className="mono hero-host">Hosted by {conference.host}</span>
        <button type="button" className="mono scroll-cue" onClick={() => go('about')}>Scroll <span aria-hidden="true">↓</span></button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ still / reduced motion: two calm figures */
function StillStage() {
  const narrow = useMedia('(max-width: 767px)');
  const heroOv = useRef<Overlay>({ labels: [], cad: null, callout: null, readout: null });
  const dubaiOv = useRef<Overlay>({ labels: [], cad: null, callout: null, readout: null });
  const foot = useRef<HTMLDivElement>(null);
  const callout = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const measure = () => { if (foot.current) heroOv.current.footTop = foot.current.offsetTop; };
    measure();
    dubaiOv.current.callout = callout.current;
    heroOv.current.pin = pin.current;
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  useEffect(() => { phaseStore.set('ready'); }, []);
  return (
    <>
      <section id="top" className="stage is-still" aria-labelledby="hero-h">
        <h1 id="hero-h" className="sr">{conference.edition}: a {conference.kind} in {conference.city}, hosted by {conference.host}</h1>
        <div className="stage-upper" aria-hidden="true"><div className="stage-grid"><i className="gv g0" /><i className="gv g1" /><i className="gv g2" /><i className="gv g3" /><i className="gv g4" /></div></div>
        <div className="stage-canvas"><Suspense fallback={null}><Globe overlay={heroOv} fixed={0} /></Suspense></div>
        <div className="stage-over"><HeroPin narrow={narrow} refEl={pin} /></div>
        <HeroFoot footRef={foot} />
      </section>
      <section className="stage-dubai" aria-label="Dubai">
        <div className="stage-canvas"><Suspense fallback={null}><Globe overlay={dubaiOv} fixed={1} /></Suspense></div>
        <div className="stage-over"><Callouts narrow={narrow} locked refEl={callout} /></div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ the live stage */
function LiveStage() {
  const narrow = useMedia('(max-width: 767px)');
  const stage = useRef<HTMLElement>(null);
  const foot = useRef<HTMLDivElement>(null);
  const cad = useRef<SVGSVGElement>(null);
  const callout = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const labels = useRef<(HTMLElement | null)[]>([]);
  const boot = useRef<HTMLDivElement>(null);
  const bootUi = useRef<HTMLDivElement>(null);
  const activeRef = useRef(true);
  const overlay = useRef<Overlay>({ labels: [], cad: null, callout: null, readout: null });
  const setActive = useRef<(a: boolean) => void>(() => {});

  // overlay wiring (refs are stable after mount)
  useLayoutEffect(() => {
    const o = overlay.current;
    o.labels = labels.current;
    o.cad = cad.current;
    o.callout = callout.current;
    o.readout = readout.current;
    o.pin = pin.current;
    o.onLock = (on) => {
      const el = callout.current;
      if (!el) return;
      el.classList.toggle('is-locked', on);
      el.setAttribute('aria-hidden', String(!on));
      if (on) {
        el.querySelectorAll<HTMLElement>('.lab-v').forEach((v, i) => {
          gsap.fromTo(v, { scrambleText: { text: '' } }, { scrambleText: { text: v.dataset.s ?? '', chars: SCRAMBLE_CHARS, speed: 0.7 }, duration: 0.9, delay: 0.25 + i * 0.12, ease: 'none' });
        });
      }
    };
    const measure = () => {
      if (!foot.current) return;
      o.footTop = foot.current.offsetTop;
      stage.current?.style.setProperty('--cy', `${Math.round((56 + o.footTop) / 2)}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (foot.current) ro.observe(foot.current);
    return () => ro.disconnect();
  }, [narrow]);

  // pin + scrub: the flight
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const end = () => '+=' + Math.round(window.innerHeight * (narrow ? 1.5 : 1.8));
      // one trigger pins and scrubs (a second trigger on the same element would start after the pin spacing)
      const tl = gsap.timeline({
        scrollTrigger: {
          id: 'flight', trigger: el, start: 'top top', end, pin: true, scrub: true, anticipatePin: 1,
          onUpdate: (s) => {
            live.flight = s.progress;
            el.classList.toggle('is-flying', s.progress > 0.04 && s.progress < 0.995);
          },
        },
      });
      tl.to('.hero-word .ch', { yPercent: 104, duration: 0.14, stagger: 0.008, ease: EASE }, 0)
        .to('.hero-row > *, .hero-corners > *', { y: rowDrop, duration: 0.12, ease: EASE }, 0)
        .to('.hero-rule', { scaleX: 0, transformOrigin: '100% 50%', duration: 0.14, ease: EASE }, 0.02)
        .to('.stage-grid .gv', { scaleY: 0, transformOrigin: '50% 0%', duration: 0.16, stagger: 0.02, ease: EASE }, 0.02)
        .set({}, {}, 1);
    }, el);
    // pause WebGL when the stage is off screen
    const io = new IntersectionObserver(([e]) => {
      activeRef.current = e.isIntersecting;
      live.stageOn = e.isIntersecting;
      setActive.current(e.isIntersecting);
    });
    io.observe(el);
    return () => { ctx.revert(); io.disconnect(); };
  }, [narrow]);

  // the loader (once per visit)
  useLayoutEffect(() => {
    const el = stage.current;
    const b = boot.current;
    const u = bootUi.current;
    if (!el || !b || !u) return;
    const root = document.documentElement;
    if (seen() && !forceBoot()) {
      live.boot = 1;
      b.style.display = 'none';
      u.style.display = 'none';
      el.classList.add('cad-on');
      phaseStore.set('ready');
      gsap.fromTo(el.querySelectorAll('.hero-word .ch'), { yPercent: 104 }, { yPercent: 0, duration: BIG, stagger: 0.035, ease: EASE });
      return;
    }
    root.classList.add('nl-boot');
    window.scrollTo(0, 0);
    let lenisWait = 0;
    const holdLenis = () => { const l = getLenis(); if (l) l.stop(); else if (lenisWait++ < 30) requestAnimationFrame(holdLenis); };
    holdLenis();

    const count = u.querySelector<HTMLElement>('.boot-count b');
    const word = u.querySelector<HTMLElement>('.boot-word');
    const logo = document.getElementById('nl-logo');
    const nav = document.querySelector<HTMLElement>('.nav');
    const n = { v: 0 };
    const pad = (x: number) => String(Math.round(x)).padStart(3, '0');
    const tl = gsap.timeline({
      onComplete: () => {
        root.classList.remove('nl-boot');
        b.style.display = 'none';
        u.style.display = 'none';
        if (logo) logo.style.visibility = '';
        live.boot = 1;
        markSeen();
        phaseStore.set('ready');
        getLenis()?.start();
        ScrollTrigger.refresh();
        off();
      },
    });
    tl.addLabel('split', 2.6)
      .fromTo(el.querySelectorAll('.stage-grid i, .hero-rule'), { scale: 0 }, { scale: 1, duration: 0.9, stagger: 0.07, ease: EASE }, 0)
      .to(n, { v: 100, duration: 2.5, ease: EASE, onUpdate: () => { if (count) count.textContent = pad(n.v); } }, 0)
      .fromTo(live, { boot: 0 }, { boot: 1, duration: 2.4, ease: 'none' }, 0.1)
      .add(() => el.classList.add('cad-on'), 0.2)
      .fromTo(word, { scrambleText: { text: '' } }, { scrambleText: { text: conference.edition, chars: SCRAMBLE_CHARS, revealDelay: 0.35, speed: 0.5 }, duration: 1.5, ease: 'none' }, 0.7)
      // split (Lando) and the wordmark flies to the logo (Getty)
      .add(() => u.classList.add('is-split'), 'split')
      .to(b.querySelector('.boot-top'), { yPercent: -100, duration: BIG, ease: EASE }, 'split')
      .to(b.querySelector('.boot-bot'), { yPercent: 100, duration: BIG, ease: EASE }, 'split')
      .to(u.querySelectorAll('.mask > *'), { yPercent: 110, duration: UI, ease: EASE }, 'split')
      .to(word, {
        x: () => (logo ? logo.getBoundingClientRect().left - word!.getBoundingClientRect().left : 0),
        y: () => (logo ? logo.getBoundingClientRect().top - word!.getBoundingClientRect().top : 0),
        scale: () => (logo ? parseFloat(getComputedStyle(logo).fontSize) / parseFloat(getComputedStyle(word!).fontSize) : 1),
        transformOrigin: '0 0', duration: BIG, ease: EASE,
      }, 'split')
      .fromTo(nav, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: UI, ease: EASE }, 'split+=0.2')
      .fromTo(el.querySelectorAll('.hero-word .ch'), { yPercent: 104 }, { yPercent: 0, duration: BIG, stagger: 0.035, ease: EASE }, 'split+=0.15')
      .fromTo(el.querySelectorAll('.hero-row > *, .hero-corners > *'), { y: rowDrop }, { y: 0, duration: UI, stagger: 0.05, ease: EASE }, 'split+=0.35')
      .add(() => { if (logo) logo.style.visibility = 'visible'; if (word) word.style.visibility = 'hidden'; }, 'split+=' + BIG)
      .set({}, {}, 'split+=1.3');
    // the screenshot script seeks this timeline to exact moments
    (window as unknown as { __nlBoot?: gsap.core.Timeline }).__nlBoot = tl;
    // skippable with any key or tap
    const skip = () => { if (tl.progress() < 1) tl.progress(1); };
    const off = () => {
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('wheel', skip);
      window.removeEventListener('touchstart', skip);
    };
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    window.addEventListener('wheel', skip, { passive: true });
    window.addEventListener('touchstart', skip, { passive: true });
    return () => { off(); tl.kill(); root.classList.remove('nl-boot'); };
  }, []);

  return (
    <section id="top" className="stage" ref={stage} aria-labelledby="hero-h">
      <h1 id="hero-h" className="sr">{conference.edition}: a {conference.kind} in {conference.city}, hosted by {conference.host}</h1>
      {/* Dropbox: these hairlines draw in from the edges during the loader and stay as the page grid */}
      <div className="stage-upper" aria-hidden="true"><div className="stage-grid"><i className="gv g0" /><i className="gv g1" /><i className="gv g2" /><i className="gv g3" /><i className="gv g4" /></div></div>
      <HeroFoot footRef={foot} />

      {/* loader panels sit under the canvas, so the globe survives the split */}
      <div className="boot" ref={boot} aria-hidden="true">
        <div className="boot-top" /><div className="boot-bot" />
      </div>

      <div className="stage-canvas">
        <Suspense fallback={null}><GlobeGate overlay={overlay} setActive={setActive} /></Suspense>
      </div>

      <svg className="cad" ref={cad} aria-hidden="true"><CadMarks /></svg>
      <div className="pt-labels" aria-hidden="true">
        {LABELS.map((p, i) => <span key={p.n} ref={(e) => { labels.current[i] = e; }} className="pt-l">{String(p.n).padStart(2, '0')}</span>)}
      </div>
      <div className="stage-over">
        <Callouts narrow={narrow} refEl={callout} />
        <HeroPin narrow={narrow} refEl={pin} />
        <p className="flight-hud mono" aria-hidden="true"><span className="hud-k">Centre</span> <span ref={readout}>{COORDS}</span></p>
      </div>

      {/* loader UI on top: counter (Outfit), scramble wordmark (Igloo), corner labels */}
      <div className="boot-ui" ref={bootUi} aria-hidden="true">
        <p className="boot-count mono"><span className="mask"><b>000</b></span></p>
        <p className="boot-word-wrap"><span className="boot-word">{conference.edition}</span></p>
        <p className="boot-tl mono"><span className="mask"><span>{conference.edition} / Building the globe</span></span></p>
        <p className="boot-tr mono"><span className="mask"><span>{COORDS}</span></span></p>
        <p className="boot-br mono"><span className="mask"><span>{narrow ? 'Tap to skip' : 'Press any key to skip'}</span></span></p>
      </div>
    </section>
  );
}

/** Mounts the canvas and lets the stage pause it. */
function GlobeGate({ overlay, setActive }: { overlay: React.RefObject<Overlay>; setActive: React.RefObject<(a: boolean) => void> }) {
  const [on, set] = useState(true);
  useEffect(() => { setActive.current = set; }, [set, setActive]);
  return <Globe overlay={overlay} active={on} />;
}

export function Stage() {
  return still ? <StillStage /> : <LiveStage />;
}
