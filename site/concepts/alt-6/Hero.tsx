// The opening and the hero share one canvas: the teleprinter prints the header in dot-matrix, the dither floods the
// screen, then resolves into the field with the declassifying lens. The DOM on top is solid ink boxes, never alpha.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Field, fieldState } from './gl/field';
import { DUBAI_LABEL, LOADER_LINES, facts } from './content';
import { EASE, NAV_H, STILL, ScrollTrigger, Stamp, Type, gsap } from './ui';
import { register } from './links';
import { scrollToSection } from '@/shared/scroll';

export type Mode = 'live' | 'still' | 'nogl';

declare global {
  interface Window { __dispatch?: { tl?: gsap.core.Timeline; skip?: () => void; park?: (x: number, y: number) => void } }
}

const setPhase = (p: string) => { document.documentElement.dataset.phase = p; };

export function Hero({ mode, onReady, ready }: { mode: Mode; onReady: () => void; ready: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const field = useRef<Field | null>(null);
  const [line, setLine] = useState(0);
  const [glFailed, setGlFailed] = useState(false);
  const readout = useRef<HTMLSpanElement>(null);
  const titleBars = useRef<HTMLSpanElement[]>([]);
  const live = mode === 'live' && !glFailed;

  // create the field and run the opening
  useLayoutEffect(() => {
    if (mode === 'nogl' || !host.current) return;
    let f: Field;
    try {
      f = new Field(host.current, { still: mode === 'still', lines: LOADER_LINES });
    } catch {
      setGlFailed(true);
      onReady();
      return;
    }
    field.current = f;
    window.__dispatch = { ...(window.__dispatch || {}), park: (x, y) => f.park(x, y) };
    const fonts = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);

    if (mode === 'still') {
      Object.assign(fieldState, { print: 0, flood: 1, resolve: 1, field: 1, lens: 1 });
      const r = host.current.getBoundingClientRect();
      f.park(r.width * (r.width < 760 ? 0.5 : 0.6), r.height * (r.width < 760 ? 0.48 : 0.45));
      fonts.then(() => f.redrawLayer());
      setPhase('ready');
      onReady();
      return () => f.dispose();
    }

    Object.assign(fieldState, { print: 0, blink: 1, flood: 0, resolve: 0, field: 0, lens: 0 });
    setPhase('wait');
    const tl = gsap.timeline({ paused: true });
    const starts = [...f.lineStarts, f.chars];
    const CPS = 92;
    tl.addLabel('print');
    tl.call(() => setPhase('print'));
    LOADER_LINES.forEach((_, i) => {
      const n = starts[i + 1] - starts[i];
      tl.call(() => setLine(i + 1));
      tl.to(fieldState, { print: starts[i + 1] - 0.01, duration: n / CPS, ease: 'none' });
      tl.to({}, { duration: 0.07 }); // carriage return
    });
    tl.to(fieldState, { print: f.chars + 1, duration: 0.01 });
    // hold: the cursor blinks twice
    tl.to({}, { duration: 0.36, onUpdate() { fieldState.blink = Math.floor(this.time() * 11) % 2 ? 0 : 1; }, onComplete() { fieldState.blink = 0; } });
    tl.addLabel('flood');
    tl.call(() => setPhase('flood'));
    tl.to(fieldState, { flood: 1, duration: 0.85, ease: 'power2.in' });
    tl.addLabel('resolve');
    tl.call(() => { setPhase('resolve'); fieldState.field = 1; });
    tl.to(fieldState, { resolve: 1, duration: 0.95, ease: 'power2.out' });
    tl.addLabel('hero', '-=0.35');
    tl.call(() => { setPhase('ready'); onReady(); }, [], 'hero');
    tl.to(fieldState, { lens: 1, duration: 0.6, ease: 'steps(6)' }, 'hero');
    window.__dispatch.tl = tl;
    const skip = () => { if (tl.progress() < 1) tl.progress(1); };
    window.__dispatch.skip = skip;
    const onKey = (e: KeyboardEvent) => { if (e.key !== 'Tab') skip(); };
    addEventListener('keydown', onKey);
    addEventListener('wheel', skip, { passive: true });
    addEventListener('pointerdown', skip);
    // the clock starts once fonts are in and the canvas has drawn
    let cancelled = false;
    fonts.then(() => {
      if (cancelled) return;
      f.redrawLayer();
      requestAnimationFrame(() => requestAnimationFrame(() => { if (!cancelled && !(window as unknown as { __hold?: boolean }).__hold) tl.play(); }));
    });
    return () => {
      cancelled = true;
      tl.kill();
      removeEventListener('keydown', onKey);
      removeEventListener('wheel', skip);
      removeEventListener('pointerdown', skip);
      f.dispose();
      field.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // hero type: paper bars slide off the title once the field has resolved
  useEffect(() => {
    if (!ready || STILL) return;
    const bars = titleBars.current.filter(Boolean);
    gsap.to(bars, { xPercent: 101, duration: 0.8, ease: EASE, stagger: 0.12, delay: 0.1 });
  }, [ready]);

  // the field drifts as the hero scrolls away; the lens readout follows the lens
  useEffect(() => {
    if (mode === 'still' && field.current && readout.current) {
      const t = setTimeout(() => {
        const l = field.current?.lens;
        if (l && readout.current) readout.current.textContent = `X ${String(Math.round(l.x)).padStart(4, '0')} · Y ${String(Math.round(l.y)).padStart(4, '0')}`;
      }, 400);
      return () => clearTimeout(t);
    }
    if (!live || !ready) return;
    const st = ScrollTrigger.create({ trigger: '#home', start: 'top top', end: 'bottom top', onUpdate: (s) => { fieldState.scroll = s.progress; } });
    let raf = 0, i = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (++i % 3 || !field.current || !readout.current) return;
      const { x, y } = field.current.lens;
      readout.current.textContent = `X ${String(Math.round(x)).padStart(4, '0')} · Y ${String(Math.round(y)).padStart(4, '0')}`;
    };
    raf = requestAnimationFrame(tick);
    return () => { st.kill(); cancelAnimationFrame(raf); };
  }, [live, ready, mode]);

  const go = (id: string) => (e: React.MouseEvent) => { e.preventDefault(); scrollToSection(id, NAV_H); };
  const bar = (i: number) => (el: HTMLSpanElement | null) => { if (el) titleBars.current[i] = el; };
  const noGl = mode === 'nogl' || glFailed;

  return (
    <section id="home" className={'hero' + (noGl ? ' hero-nogl' : '')} aria-label="DXB MUN 2027">
      <div className="field-host" ref={host} aria-hidden="true">
        {noGl && (
          <div className="nogl-layer">
            <span className="nogl-motto">{facts.motto}</span>
            <span className="nogl-coords">{DUBAI_LABEL} · Dubai</span>
          </div>
        )}
      </div>

      {/* the opening's own chrome (corners only; the message itself is printed by the shader) */}
      {live && !ready && (
        <div className="opening" role="status">
          <span className="sr">{LOADER_LINES.join('. ')}</span>
          <div className="op-tl" aria-hidden="true">DXB MUN SECRETARIAT<br />TELEPRINTER · RECEIVING</div>
          <div className="op-bl" aria-hidden="true">LINE {String(Math.min(line, LOADER_LINES.length)).padStart(2, '0')} / {String(LOADER_LINES.length).padStart(2, '0')}</div>
          <button type="button" className="op-skip" onClick={() => window.__dispatch?.skip?.()}>Skip</button>
        </div>
      )}

      <div className={'hero-ui' + (ready ? ' is-on' : '')}>
        <div className="hero-head on-ink">
          <div className="hh-top">
            <span>CABLE 00 · OPENING</span>
            <Stamp>PRIORITY: IMMEDIATE</Stamp>
          </div>
          <dl className="hh-rows">
            <div><dt>FROM</dt><dd><Type text="DXB MUN Secretariat" run={ready} delay={0.15} /></dd></div>
            <div><dt>TO</dt><dd><Type text="All delegations" run={ready} delay={0.35} /></dd></div>
            <div><dt>HOST</dt><dd><span className="host-mark" aria-hidden="true">IHS</span><Type text={facts.host} run={ready} delay={0.5} /></dd></div>
            <div><dt>DATES</dt><dd><span className="rd-tba"><span className="rd-stub" aria-hidden="true" /><span className="rd-tba-t">To be announced</span></span></dd></div>
          </dl>
        </div>

        <h1 className="hero-title">
          <span className="ht-line"><span className="ht-t">DXB MUN</span>{!STILL && <span className="ht-bar" ref={bar(0)} aria-hidden="true" />}</span>
          <span className="ht-line"><span className="ht-t">{facts.edition.replace('DXB MUN ', '')}</span>{!STILL && <span className="ht-bar" ref={bar(1)} aria-hidden="true" />}</span>
        </h1>

        <div className="hero-sub on-ink">
          <p className="hs-line">{facts.kind} · {facts.city}</p>
          <div className="hs-cta">
            <a className="btn btn-paper" href={register}>Register</a>
            <a className="btn btn-line" href="#about" onClick={go('about')}>The cables ↓</a>
          </div>
        </div>

        {!noGl && (
          <div className="hero-readout on-ink" aria-hidden="true">
            <span className="hr-k">LENS</span> <span ref={readout}>X 0000 · Y 0000</span>
            <span className="hr-hint">{STILL ? 'Declassified layer' : 'Move to declassify'}</span>
          </div>
        )}
      </div>

      <div className="slot" aria-hidden="true">
        <span>PRINTING CABLES 01–07</span>
        <span className="slot-arrow">▼</span>
      </div>
    </section>
  );
}
