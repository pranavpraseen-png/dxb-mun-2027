// Section 3: the resolution, one clause per screen (Getty's pacing), letters filling from grey to ink as you
// scroll (Terminal). The fill is a clip-path staircase snapped to each letter's right edge, so nothing but
// clip-path and transform moves. A clause counter rides a hairline at the bottom (Getty's year rail).
import { useLayoutEffect, useRef, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { conference } from '@/data/conference';
import { CLAUSES } from './data';
import { ScrollTrigger, ease, gsap, seg, still } from './motion';

type Geo = { w: number; chars: { line: number; right: number }[]; bands: { top: number; bottom: number }[] };

function measure(ink: HTMLElement): Geo {
  const box = ink.getBoundingClientRect();
  const walker = document.createTreeWalker(ink, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const raw: { top: number; bottom: number; right: number }[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const t = node.textContent ?? '';
    for (let i = 0; i < t.length; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getClientRects()[0];
      if (!r) continue;
      raw.push({ top: r.top - box.top, bottom: r.bottom - box.top, right: r.right - box.left });
    }
  }
  const lines: { top: number; bottom: number }[] = [];
  const chars: Geo['chars'] = [];
  for (const c of raw) {
    const last = lines[lines.length - 1];
    if (!last || c.top > last.top + (last.bottom - last.top) * 0.6) lines.push({ top: c.top, bottom: c.bottom });
    else { last.top = Math.min(last.top, c.top); last.bottom = Math.max(last.bottom, c.bottom); }
    chars.push({ line: lines.length - 1, right: c.right });
  }
  const bands = lines.map((l, i) => ({
    top: i === 0 ? 0 : Math.round((lines[i - 1].bottom + l.top) / 2),
    bottom: i === lines.length - 1 ? Math.ceil(box.height) : Math.round((l.bottom + lines[i + 1].top) / 2),
  }));
  return { w: Math.ceil(box.width), chars, bands };
}

function clipFor(g: Geo, fill: number) {
  const n = g.chars.length;
  const k = Math.round(fill * n);
  if (k <= 0) return 'inset(0px 100% 100% 0px)';
  if (k >= n) return 'none';
  const c = g.chars[k - 1];
  const b = g.bands[c.line];
  const x = Math.round(c.right);
  return `polygon(0px 0px, ${g.w}px 0px, ${g.w}px ${b.top}px, ${x}px ${b.top}px, ${x}px ${b.bottom}px, 0px ${b.bottom}px)`;
}

const ClauseText = ({ verb, rest }: { verb: string; rest: string }) => (
  <><em>{verb}</em> {rest}</>
);

function StillClauses() {
  return (
    <section id="about" className="clauses is-still" aria-labelledby="about-h">
      <header className="sec-top">
        <p className="mono"><span className="acc">01</span> / About</p>
        <p className="mono">Draft resolution · {conference.edition}</p>
      </header>
      <h2 id="about-h" className="sr">About {conference.edition}</h2>
      <ol className="cl-still">
        {CLAUSES.map((c, i) => (
          <li key={c.verb}>
            <span className="mono cl-no">Clause {String(i + 1).padStart(2, '0')} / {String(CLAUSES.length).padStart(2, '0')}</span>
            <p className="cl-text"><ClauseText {...c} /></p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function LiveClauses() {
  const sec = useRef<HTMLElement>(null);
  const [idx, setIdx] = useState(0);
  useLayoutEffect(() => {
    const el = sec.current;
    if (!el) return;
    const slots = [...el.querySelectorAll<HTMLElement>('.cl-slot')];
    const inks = slots.map((s) => s.querySelector<HTMLElement>('.cl-ink')!);
    const bar = el.querySelector<HTMLElement>('.cl-bar i');
    let geos: Geo[] = [];
    let last = -1;
    let P = 0;
    const N = slots.length;
    const render = () => {
      const x = Math.min(N - 1e-6, P * N);
      const i = Math.floor(x);
      const f = x - i;
      const out = i < N - 1 ? ease(seg(f, 0.84, 1)) : 0;
      slots.forEach((s, j) => {
        let y = 100;
        if (j < i) y = -100;
        else if (j === i) y = -100 * out;
        else if (j === i + 1) y = 100 * (1 - out);
        s.style.transform = `translate3d(0, ${y.toFixed(3)}%, 0)`;
        const fill = j < i ? 1 : j > i ? 0 : seg(f, j === 0 ? 0 : 0.04, 0.7);
        if (geos[j]) inks[j].style.clipPath = clipFor(geos[j], fill);
      });
      if (bar) bar.style.transform = `scaleX(${P.toFixed(4)})`;
      const now = out > 0.5 ? i + 1 : i;
      if (now !== last) { last = now; setIdx(now); }
    };
    const remeasure = () => { geos = inks.map((ink) => measure(ink)); render(); };
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        id: 'clauses', trigger: el, start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 0.8 * N),
        pin: true, scrub: true,
        onUpdate: (s) => { P = s.progress; render(); },
        onRefresh: remeasure,
      });
    }, el);
    remeasure();
    document.fonts?.ready.then(remeasure);
    return () => ctx.revert();
  }, []);

  return (
    <section id="about" className="clauses" ref={sec} aria-labelledby="about-h">
      <header className="sec-top">
        <p className="mono"><span className="acc">01</span> / About</p>
        <p className="mono">Draft resolution · {conference.edition}</p>
      </header>
      <h2 id="about-h" className="sr">About {conference.edition}</h2>
      <div className="cl-box">
        {CLAUSES.map((c) => (
          <div key={c.verb} className="cl-slot">
            <p className="cl-text cl-base"><ClauseText {...c} /></p>
            <p className="cl-text cl-ink" aria-hidden="true"><ClauseText {...c} /></p>
          </div>
        ))}
      </div>
      <footer className="cl-foot">
        <p className="mono cl-count" aria-live="off">
          Clause <NumberFlow value={idx + 1} format={{ minimumIntegerDigits: 2 }} /> / {String(CLAUSES.length).padStart(2, '0')}
        </p>
        <span className="cl-bar" aria-hidden="true"><i /></span>
        <p className="mono cl-hint">Keep scrolling</p>
      </footer>
    </section>
  );
}

export function Clauses() {
  return still ? <StillClauses /> : <LiveClauses />;
}
