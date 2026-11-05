import { Fragment, useEffect, useRef, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { committees, conference, stats, tba } from '@/data/conference';
import { gsap } from './motion';

/*
  3 · The resolution, one clause per screen (BLUEPRINT 3.3): Getty's pacing, Terminal's letter fill.
  Each fact is one clause, centred. As you scroll, its letters fill from grey to ink one by one; the operative
  verb fills in IHS maroon, at a light weight against the heavy fact (Lando's heavy-versus-tiny contrast, with
  no serif in T2). Numbers count up (NumberFlow) as the fill reaches them. A clause counter rides the bottom hairline.
*/
type Part = string | { n: number };
type Clause = { kind: string; verb: string; fact: Part[]; note: string };

const first = committees[0], last = committees[committees.length - 1];
const CLAUSES: Clause[] = [
  { kind: 'Preambular', verb: 'Hosted by', fact: [conference.host], note: `In ${conference.city}.` },
  { kind: 'Preambular', verb: 'Guided by', fact: [conference.motto + '.'], note: 'The motto of the conference.' },
  { kind: 'Operative', verb: 'Convenes', fact: [{ n: stats[0].value }, ' committees'], note: `From ${first.abbr} to ${last.abbr}, each one on a nameplate below.` },
  { kind: 'Operative', verb: 'Meets for', fact: [{ n: stats[1].value }, ' days · ', { n: stats[2].value }, ' sessions'], note: 'Every day’s timings are in the schedule.' },
  { kind: 'Operative', verb: 'Dates', fact: [tba(conference.dates) + '.'], note: `Venue: ${tba(conference.venue).toLowerCase()}.` },
];
const N = CLAUSES.length;
const plain = (c: Clause) => `${c.verb} ${c.fact.map((p) => (typeof p === 'string' ? p : String(p.n))).join('')}`;
const pad = { minimumIntegerDigits: 2 } as const;

/** Letters of one clause; every unit (letter or whole number) gets an index in fill order. */
function ClauseText({ c, numsOn }: { c: Clause; numsOn: boolean }) {
  let k = 0;
  const letters = (s: string, cls: string) =>
    s.split(' ').map((word, wi, arr) => (
      <Fragment key={cls + wi}>
        <span className="wd">
          {[...word].map((ch, i) => <span key={i} className={'u ' + cls} data-u={k++}>{ch}</span>)}
        </span>
        {wi < arr.length - 1 && ' '}
      </Fragment>
    ));
  return (
    <p className="cl-text" aria-hidden="true">
      <span className="cl-verb">{letters(c.verb, 'v')}</span>
      <span className="cl-fact">
        {c.fact.map((p, i) =>
          typeof p === 'string'
            ? <Fragment key={i}>{letters(p, 'f')}</Fragment>
            : <span key={i} className="u f num" data-u={k++}><NumberFlow value={numsOn ? p.n : 0} trend={1} /></span>,
        )}
      </span>
    </p>
  );
}

export function Clauses({ still }: { still: boolean }) {
  const sec = useRef<HTMLElement>(null);
  const [active, setActive] = useState(still ? N - 1 : 0);
  const [numsOn, setNumsOn] = useState<boolean[]>(() => CLAUSES.map(() => still));

  useEffect(() => {
    if (still) return;
    const el = sec.current!;
    const units = [...el.querySelectorAll<HTMLElement>('.cl')].map((cl) => [...cl.querySelectorAll<HTMLElement>('[data-u]')]);
    const filled = units.map(() => -1);
    const bar = el.querySelector<HTMLElement>('.cl-bar i');
    let cur = -1;
    const nums = CLAUSES.map(() => false);
    const proxy = { p: 0 };
    const update = () => {
      const p = proxy.p * N;
      const idx = Math.min(N - 1, Math.floor(p));
      if (idx !== cur) { cur = idx; setActive(idx); }
      units.forEach((us, i) => {
        const local = i < idx ? 1 : i > idx ? 0 : Math.min(1, Math.max(0, (p - idx - 0.04) / 0.56));
        const want = Math.round(local * us.length) - 1;
        if (want === filled[i]) return;
        const lo = Math.min(want, filled[i]) + 1, hi = Math.max(want, filled[i]);
        for (let j = lo; j <= hi; j++) us[j]?.classList.toggle('on', j <= want);
        filled[i] = want;
        const firstNum = us.findIndex((u) => u.classList.contains('num'));
        const on = firstNum >= 0 && want >= firstNum;
        if (on !== nums[i]) { nums[i] = on; setNumsOn([...nums]); }
      });
      if (bar) bar.style.transform = `scaleX(${proxy.p.toFixed(4)})`;
    };
    const tween = gsap.to(proxy, {
      p: 1, ease: 'none', onUpdate: update,
      scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.4 },
    });
    update();
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }, [still]);

  return (
    <section ref={sec} id="about" className={'clauses' + (still ? ' clauses--still' : '')} aria-labelledby="about-h">
      <div className="cl-stage">
        <header className="cl-head">
          <span className="k">01 — About</span>
          <h2 id="about-h" className="k">Draft resolution · {conference.edition}</h2>
        </header>
        <ol className="cl-list">
          {CLAUSES.map((c, i) => (
            <li key={c.verb} className={'cl' + (still ? ' is-still' : i < active ? ' is-past' : i > active ? ' is-next' : ' is-on')}>
              <div className="cl-mask">
                <p className="k cl-kind">Clause {String(i + 1).padStart(2, '0')} · {c.kind}</p>
                <span className="sr-only">{plain(c)}. {c.note}</span>
                <ClauseText c={c} numsOn={numsOn[i]} />
                <p className="cl-note" aria-hidden="true">{c.note}</p>
              </div>
            </li>
          ))}
        </ol>
        <footer className="cl-foot" aria-hidden="true">
          <span className="k">Clause <NumberFlow value={active + 1} format={pad} /> / {String(N).padStart(2, '0')}</span>
          <span className="cl-bar"><i /></span>
          <span className="k">{conference.motto}</span>
        </footer>
      </div>
    </section>
  );
}
