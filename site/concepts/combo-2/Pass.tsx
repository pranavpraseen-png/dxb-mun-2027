// Section 6: Register. The delegate pass, a perforated ticket with punch notches (Siena's stub). It prints in
// from the top when it enters (clip-path), and its stub tears a little on hover.
import NumberFlow from '@number-flow/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { conference, tba } from '@/data/conference';
import { committees, stats } from './data';
import { register, signIn } from './links';
import { BIG, EASE, ScrollTrigger, gsap, still } from './motion';

/** The pass heading breaks after any words before "DXB MUN" ("Unofficial" / "DXB MUN 2027"). */
const NAME_WORDS = conference.name.split(' ');
const LEAD = NAME_WORDS.slice(0, -2).join(' ');
const MARK = NAME_WORDS.slice(-2).join(' ');

export function Pass() {
  const sec = useRef<HTMLElement>(null);
  const [n, setN] = useState(still ? committees.length : 0);
  useLayoutEffect(() => {
    const el = sec.current;
    if (!el || still) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.pass', { clipPath: 'inset(0% 0% 100% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: BIG, ease: EASE,
        scrollTrigger: { trigger: '.pass', start: 'top 82%' },
      });
      ScrollTrigger.create({ trigger: el, start: 'top 70%', onEnter: () => setN(committees.length), onLeaveBack: () => setN(0) });
    }, el);
    return () => ctx.revert();
  }, []);
  const rows: [string, React.ReactNode][] = [
    ['Holder', 'Delegate'],
    ['Conference', conference.kind],
    ['Host', conference.host],
    ['City', conference.city],
    ['Dates', tba(conference.dates)],
    ['Committees', <NumberFlow key="n" value={n} />],
    ['Sessions', `${stats[2].value} over ${stats[1].value} days`],
  ];
  return (
    <section id="register" className="reg" ref={sec} aria-labelledby="reg-h">
      <header className="sec-top">
        <p className="mono"><span className="acc">04</span> / Pass</p>
        <p className="mono">Delegates, advisors and chairs</p>
      </header>
      <a className="pass" href={register} aria-labelledby="reg-h">
        <span className="pass-main">
          <span className="pass-k mono">{conference.edition} · Delegate pass</span>
          <span id="reg-h" className="pass-h">{LEAD && <>{LEAD}<br /></>}{MARK} <em>{conference.year}</em></span>
          <span className="pass-rows">
            {rows.map(([k, v]) => (
              <span key={k} className="pass-row"><span className="mono pr-k">{k}</span><span className="pr-v">{v}</span></span>
            ))}
          </span>
        </span>
        <span className="pass-perf" aria-hidden="true" />
        <span className="pass-stub">
          <span className="ps-code mono" aria-hidden="true">DXB-MUN-{conference.year}</span>
          <span className="ps-bars" aria-hidden="true">{Array.from({ length: 23 }, (_, i) => <i key={i} style={{ flexGrow: [1, 3, 1, 2, 1, 1, 4, 1, 2, 1, 3, 1, 1, 2, 4, 1, 1, 3, 1, 2, 1, 1, 3][i] }} />)}</span>
          <span className="ps-cta">Register <span aria-hidden="true">→</span></span>
        </span>
      </a>
      <p className="reg-alt">
        <a className="mono reg-sign" href={signIn}>Already registered? Sign in <span aria-hidden="true">→</span></a>
        <span className="mono reg-note">Delegates, advisors and chairs use the delegate dashboard.</span>
      </p>
    </section>
  );
}
