import { useEffect, useRef } from 'react';
import { committees, conference, stats, tba } from '@/data/conference';
import { EASE, T_BIG, gsap } from './motion';
import { register, signIn } from './links';

/*
  6 · Register: the delegate pass (BLUEPRINT 3.6, Siena's ticket stub).
  A card with a perforation and two notches. The pass side carries the facts; the stub side is the action.
  When it reaches the screen the stub slides into its slot and the hairline barcode draws, left to right.
*/
// Hairline barcode: decoration only, derived from the committee codes so it is stable (it encodes nothing).
const BARS = committees.flatMap((c) => [...c.abbr].map((ch) => 1 + (ch.charCodeAt(0) % 3))).slice(0, 46);

export function Register({ still }: { still: boolean }) {
  const sec = useRef<HTMLElement>(null);

  useEffect(() => {
    if (still) return;
    const q = gsap.utils.selector(sec.current);
    const tl = gsap.timeline({ scrollTrigger: { trigger: q('.pass')[0], start: 'top 80%', once: true } });
    tl.fromTo(q('.pass-main'), { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: T_BIG, ease: EASE, clearProps: 'clipPath' })
      .fromTo(q('.pass-stub'), { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: T_BIG, ease: EASE, clearProps: 'clipPath' }, 0.25)
      .fromTo(q('.bar'), { scaleY: 0 }, { scaleY: 1, duration: 0.5, ease: EASE, stagger: 0.012 }, 0.5);
    return () => { tl.scrollTrigger?.kill(); tl.kill(); };
  }, [still]);

  const fields: [string, string][] = [
    ['Host', conference.host],
    ['City', conference.city],
    ['Dates', tba(conference.dates)],
    ['Venue', tba(conference.venue)],
    ['Committees', String(stats[0].value)],
    ['Days', String(stats[1].value)],
  ];

  return (
    <section ref={sec} id="register" className="sec reg" aria-labelledby="rg-h">
      <header className="sec-head">
        <span className="k" data-slice>Register</span>
        <h2 id="rg-h" className="sec-h sec-h--plain"><span data-rise>Delegate pass</span></h2>
      </header>
      <div className="pass">
        <div className="pass-main">
          <p className="pass-k k"><span>{conference.edition}</span><span>Delegate pass</span></p>
          <p className="pass-name">{conference.name}<span>2027</span></p>
          <dl className="pass-fields">
            {fields.map(([k, v]) => (
              <div key={k}><dt className="k">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          <div className="pass-code" aria-hidden="true">
            {BARS.map((b, i) => <i key={i} className="bar" style={{ width: b + 'px' }} />)}
          </div>
        </div>
        <div className="pass-perf" aria-hidden="true" />
        <div className="pass-stub">
          <span className="k">Delegate dashboard</span>
          <a className="pass-go" href={register} data-cursor="link">Register <span aria-hidden="true">→</span></a>
          <p className="pass-note">Opens the delegate dashboard. Sign in, then the short sign-up form is on Now.</p>
          <a className="pass-in k" href={signIn}>Already registered? Sign in →</a>
        </div>
      </div>
    </section>
  );
}
