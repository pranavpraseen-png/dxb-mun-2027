// The hero, from Alt 6 · Dispatch: the 1-bit dither field with the declassifying lens, the CABLE 00 header box,
// the big title and the two buttons. Combo 1: the field is drawn once under the ORDER, ORDER loader and held; the
// loader's hard cut releases it, the lens opens in six steps and the header rows print. The title is Anybody, set by
// the kinetic engine, so it is the same face as the loader's last frame and swells gently under the pointer.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Field, fieldState } from './gl/field';
import { DUBAI_LABEL, facts } from './content';
import { Redacted, STILL, Stamp, Type } from './ui';
import { KLine } from './KLine';
import { HostMark } from './Nav';
import { jumpTo } from './floor';
import { register } from './links';

export type Mode = 'live' | 'still' | 'nogl';

declare global {
  interface Window { __combo?: { park?: (x: number, y: number) => void; field?: () => boolean } }
}

/** Title setting: fitted to its column, no speed ripple, a gentle stretch only on the line under the pointer. */
const TITLE = { mode: 'fit', weight: 900, cursor: 0.6, hoverOnly: true, wave: 0, breathe: 0, bMin: 50, bMax: 112 } as const;

export function Hero({ mode, revealed }: { mode: Mode; revealed: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const field = useRef<Field | null>(null);
  const [glFailed, setGlFailed] = useState(false);
  const readout = useRef<HTMLSpanElement>(null);
  const noGl = mode === 'nogl' || glFailed;
  const live = mode === 'live' && !glFailed;

  // create the field (under the loader, held on one frame)
  useLayoutEffect(() => {
    if (mode === 'nogl' || !host.current) return;
    let f: Field;
    try {
      f = new Field(host.current, { still: mode === 'still', lines: ['NNNN'], held: !revealed });
    } catch {
      setGlFailed(true);
      return;
    }
    field.current = f;
    window.__combo = { ...(window.__combo || {}), park: (x, y) => f.park(x, y), field: () => true };
    Object.assign(fieldState, { print: 0, blink: 0, flood: 1, resolve: 1, field: 1, lens: mode === 'still' || revealed ? 1 : 0, scroll: 0 });
    const r = host.current.getBoundingClientRect();
    if (mode === 'still') f.park(r.width * (r.width < 760 ? 0.5 : 0.6), r.height * (r.width < 760 ? 0.48 : 0.45));
    // the motto layer is redrawn once Anybody has loaded
    let cancelled = false;
    Promise.race([document.fonts.load('900 100px "Anybody Variable"').then(() => document.fonts.ready), new Promise((res) => setTimeout(res, 2500))])
      .then(() => { if (!cancelled) f.redrawLayer(); });
    return () => { cancelled = true; f.dispose(); field.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // the hard cut: release the field and open the lens in six hard steps
  useEffect(() => {
    if (!revealed || !live || !field.current) return;
    field.current.release();
    if (fieldState.lens < 1) gsap.to(fieldState, { lens: 1, duration: 0.6, ease: 'steps(6)', delay: 0.05 });
  }, [revealed, live]);

  // the field drifts as the hero scrolls away; the readout follows the lens
  useEffect(() => {
    const fmt = (x: number, y: number) => `X ${String(Math.round(x)).padStart(4, '0')} · Y ${String(Math.round(y)).padStart(4, '0')}`;
    if (mode === 'still') {
      const t = setTimeout(() => { const l = field.current?.lens; if (l && readout.current) readout.current.textContent = fmt(l.x, l.y); }, 400);
      return () => clearTimeout(t);
    }
    if (!live || !revealed) return;
    let raf = 0, i = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (++i % 3 || !field.current || !readout.current || !host.current) return;
      fieldState.scroll = Math.min(1, Math.max(0, scrollY / Math.max(1, host.current.offsetHeight)));
      readout.current.textContent = fmt(field.current.lens.x, field.current.lens.y);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live, revealed, mode]);

  const down = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); jumpTo('about'); };

  return (
    <section id="home" className={'hero' + (noGl ? ' hero-nogl' : '')} aria-label={facts.edition}>
      <div className="field-host" ref={host} aria-hidden="true">
        {noGl && (
          <div className="nogl-layer">
            <span className="nogl-motto">{facts.motto.replace(/^(\S+)\s+/, '$1\n')}</span>
            <span className="nogl-coords">{DUBAI_LABEL} · Dubai</span>
          </div>
        )}
      </div>

      <div className="hero-ui">
        <div className="hero-head">
          <div className="hh-top">
            <span>CABLE 00 · OPENING</span>
            <Stamp>PRIORITY: IMMEDIATE</Stamp>
          </div>
          <dl className="hh-rows">
            <div><dt>FROM</dt><dd><Type text="DXB MUN Secretariat" run={revealed} delay={0.15} /></dd></div>
            <div><dt>TO</dt><dd><Type text="All delegations" run={revealed} delay={0.35} /></dd></div>
            <div><dt>HOST</dt><dd><HostMark /><Type text={facts.host} run={revealed} delay={0.5} /></dd></div>
            <div><dt>DATES</dt><dd>{facts.dates ? facts.dates : <Redacted />}</dd></div>
          </dl>
        </div>

        <h1 className="hero-title">
          <span className="sr">{facts.edition}</span>
          <KLine text="DXB MUN" label="" className="ht-line" opts={TITLE} />
          <KLine text={facts.edition.replace('DXB MUN ', '')} label="" className="ht-line" opts={TITLE} />
        </h1>

        <div className="hero-sub">
          <p className="hs-line">{facts.kind} · {facts.city}</p>
          <div className="hs-cta">
            <a className="hbtn hbtn-paper" href={register}>Register</a>
            <a className="hbtn hbtn-line" href="#about" onClick={down}>The cables ↓</a>
          </div>
        </div>

        {!noGl && (
          <div className="hero-readout" aria-hidden="true">
            <span className="hr-k">LENS</span> <span ref={readout}>X 0000 · Y 0000</span>
            <span className="hr-hint">{STILL ? 'Declassified layer' : 'Move to declassify'}</span>
          </div>
        )}
      </div>
    </section>
  );
}
