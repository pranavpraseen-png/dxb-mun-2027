import { Fragment, useRef } from 'react';
import { conference, stats } from '@/data/conference';
import { gsap, useGSAP, SCROLL_FEEL } from '../motion';

type Tok = { n?: number; t: string };

// Every number comes from `stats` in conference.ts.
const [committeesN, daysN, sessionsN] = stats.map((s) => s.value);
const statement: Tok[] = [
  { t: `${conference.name} brings ${conference.kind} to ${conference.city}:` },
  { n: committeesN, t: 'committees,' },
  { n: daysN, t: 'days and' },
  { n: sessionsN, t: 'committee sessions, hosted by' },
  { t: `${conference.host}.` },
];


/** House lights: the statement's words come up from dim to full as it crosses the viewport. */
export function About({ still }: { still: boolean }) {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      if (still) return;
      const words = gsap.utils.toArray<HTMLElement>('.lit-w', root.current);
      gsap.fromTo(
        words,
        { opacity: 0.18 },
        { opacity: 1, ease: 'none', stagger: 0.12, scrollTrigger: { trigger: '.about-statement', start: 'top 85%', end: 'bottom 35%', scrub: SCROLL_FEEL.scrub } },
      );
    },
    { scope: root, dependencies: [still] },
  );

  return (
    <section id="about" ref={root} className="about" aria-labelledby="about-h">
      <div className="wrap about-grid">
        <h2 id="about-h" className="about-h">
          <span className="about-h-a">Diplomacy</span>
          <span className="about-h-b">around us</span>
        </h2>
        <p className="about-statement">
          {statement.map((tok, i) => (
            <Fragment key={i}>
              {tok.n !== undefined && (
                <>
                  <span className="lit-w lit-n">{tok.n}</span>{' '}
                </>
              )}
              {tok.t.split(' ').map((w, j) => (
                <Fragment key={j}>
                  <span className="lit-w">{w}</span>{' '}
                </Fragment>
              ))}
            </Fragment>
          ))}
        </p>
      </div>
    </section>
  );
}
