import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { committees, conference, stats, tba } from '@/data/conference';
import { useStill } from '@/shared/hooks';
import { scrollToSection } from '@/shared/scroll';
import ScrollFloat from './lib/ScrollFloat';
import { Plate } from './Plate';
import { Kicker, NAV_H } from './ui';
import { register } from './links';

/* Every fact is one short clause: an italic operative verb, one huge fact, one line of support (12 words or fewer). */
type Clause = { verb: string; fact: string; note: string; href?: string; host?: boolean };
const first = committees[0], last = committees[committees.length - 1];
const clauses: Clause[] = [
  { verb: 'Hosted by', fact: `${conference.host};`, note: `In ${conference.city}.`, host: true },
  { verb: 'Guided by', fact: `${conference.motto};`, note: 'The motto of the conference.' },
  { verb: 'Convenes', fact: `${committees.length} committees;`, note: `From ${first.abbr} to ${last.abbr}, every nameplate is below.`, href: '#committees' },
  { verb: 'Meets for', fact: `${stats[1].value} days, ${stats[2].value} sessions;`, note: 'Every timing is in the order of proceedings.', href: '#schedule' },
  { verb: 'Meets on', fact: `${tba(conference.dates)};`, note: `Venue: ${tba(conference.venue).toLowerCase()}.` },
  { verb: 'Invites', fact: 'every delegate to register.', note: 'Sign in, then apply on the delegate dashboard.', href: register },
];

export function Resolution() {
  const still = useStill();
  const track = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);

  // Cartier-style plate entrance: a vertical mask opens the frame as it arrives.
  useGSAP(() => {
    if (still) return;
    gsap.fromTo('.plate', { clipPath: 'inset(50% 0% 50% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut',
      scrollTrigger: { trigger: '.res-grid', start: 'top 92%', end: 'top 30%', scrub: 1 },
    });
    gsap.utils.toArray<HTMLElement>('.cl').forEach((li) => {
      gsap.fromTo(li.querySelectorAll('.cl-n, .cl-verb, .cl-note'), { opacity: 0, y: 18 }, {
        opacity: 1, y: 0, stagger: 0.08, ease: 'power2.out',
        scrollTrigger: { trigger: li, start: 'top 88%', end: 'top 50%', scrub: 1 },
      });
    });
  }, { scope: root, dependencies: [still] });

  return (
    <section id="about" ref={root} className="res" aria-labelledby="res-title">
      <header className="res-head">
        <Kicker id="about">Draft resolution · {conference.edition}</Kicker>
        <h2 id="res-title" className="res-title">The resolution<span className="res-title-rule" aria-hidden="true" /></h2>
      </header>
      <div ref={track} className="res-grid">
        <div className="res-fig"><Plate trackRef={track} still={still} /></div>
        <ol className="res-clauses">
          {clauses.map((c, i) => {
            const fact = still
              ? <p className="cl-fact">{c.fact}</p>
              : (
                <ScrollFloat
                  tag="p"
                  containerClassName="cl-fact"
                  textClassName="cl-fact-text"
                  splitBy="chars"
                  ease="back.out(1.6)"
                  stagger={0.025}
                  distance={110}
                  stretch={1.6}
                  scrollStart="top bottom-=8%"
                  scrollEnd="bottom 62%"
                >
                  {c.fact}
                </ScrollFloat>
              );
            const inner = c.href?.startsWith('#')
              ? <a className="cl-link" href={c.href} onClick={(e) => { e.preventDefault(); scrollToSection(c.href!.slice(1), NAV_H); }}>{fact}</a>
              : c.href ? <a className="cl-link" href={c.href}>{fact}</a> : fact;
            return (
              <li key={c.verb} className={c.host ? 'cl cl--host' : 'cl'}>
                <span className="cl-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <p className="cl-verb"><em>{c.verb}</em></p>
                {inner}
                <p className="cl-note">{c.note}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
