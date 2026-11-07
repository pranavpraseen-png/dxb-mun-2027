// NAME: The preamble
// IDEA: About written as a resolution: preambular clauses ("Recognising…", "Noting…") then operative ones, each turning from muted to ink as it crosses a fixed reading line, with one orange italic verb, "Resolves".
// WHY: The resolution is the one document every delegate learns first, so the form itself says "this is MUN"; one clause at a time is chunking, and the single orange verb (Von Restorff) is where the eye lands.
// WILD: Let the visitor "co-sponsor": a sign-here line at the end where typing your name adds it to the sponsors list, set in the same clause type.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '@fontsource-variable/archivo/wdth-italic.css';
import { conference, stats, tba } from '@/data/conference';
import { isStill } from '@/shared/hooks';
import './about-b.css';

gsap.registerPlugin(ScrollTrigger);
const pad2 = (n: number) => String(n).padStart(2, '0');

type Clause = { verb: string; text: ReactNode; op?: boolean; signal?: boolean };

const [nCommittees, nDays, nSessions] = [stats[0].value, stats[1].value, stats[2].value];
// The dates and the venue are not known yet: say so, through tba(), instead of inventing them.
const when = conference.dates
  ? <>that it meets on {conference.dates}{conference.venue ? <>, at {conference.venue}</> : null},</>
  : <>that the dates and the venue are {tba(null).toLowerCase()},</>;

const clauses: Clause[] = [
  { verb: 'Recognising', text: <>that {conference.edition} is a {conference.kind} held in {conference.city},</> },
  { verb: 'Noting', text: <>that it is hosted by {conference.host},</> },
  { verb: 'Observing', text: <>that {nCommittees} committees will sit,</> },
  { verb: 'Noting further', text: <>that {nDays} days hold {nSessions} committee sessions,</> },
  { verb: 'Aware', text: when },
  { verb: 'Resolves', text: <>to meet under the motto “{conference.motto}”;</>, op: true, signal: true },
  { verb: 'Invites', text: <>every delegate to <a className="aboutb-a" href="#register">take the floor</a>.</>, op: true },
];

export function AboutB({ id }: { id?: string }) {
  const root = useRef<HTMLElement>(null);
  const still = isStill();
  // Which clause sits on the reading line. Only the small mono counter shows it; the clauses never change their words.
  const [at, setAt] = useState(still ? clauses.length : 0);

  useEffect(() => {
    if (still || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.aboutb-clause').forEach((el, i) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 62%', // the reading line: a little below the middle of the screen, where the eye rests
          onEnter: () => { el.classList.add('is-read'); setAt(i + 1); },
          onLeaveBack: () => { el.classList.remove('is-read'); setAt(i); },
        });
      });
    }, root);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => ctx.revert();
  }, [still]);

  let op = 0;
  return (
    <section id={id ?? 'about'} ref={root} className={'aboutb' + (still ? ' is-still' : '')} aria-labelledby={(id ?? 'about') + '-h'}>
      <div className="aboutb-wrap">
        <aside className="aboutb-side">
          <p className="aboutb-label"><span>01</span>About</p>
          <p className="aboutb-count" aria-hidden="true">
            <span className="aboutb-tick" />
            Clause <b>{pad2(Math.max(1, at))}</b> / {pad2(clauses.length)}
          </p>
        </aside>
        <div className="aboutb-doc">
          <header className="aboutb-head">
            <dl className="aboutb-meta">
              <div><dt>Document</dt><dd>Draft resolution</dd></div>
              <div><dt>Host</dt><dd><i className="aboutb-host" aria-hidden="true" />{conference.host}</dd></div>
              <div><dt>City</dt><dd>{conference.city}</dd></div>
            </dl>
            <h2 className="aboutb-h" id={(id ?? 'about') + '-h'}>{conference.edition},</h2>
          </header>
          <ol className="aboutb-list">
            {clauses.map((c, i) => {
              if (c.op) op += 1;
              const first = c.op && op === 1;
              return (
                <li key={c.verb} className={'aboutb-clause' + (c.op ? ' is-op' : '') + (first ? ' is-first-op' : '') + (still ? ' is-read' : '')} data-i={i}>
                  <span className="aboutb-n" aria-hidden="true">{c.op ? `${op}.` : ''}</span>
                  <p className="aboutb-p">
                    <em className={'aboutb-verb' + (c.signal ? ' is-signal' : '')}>{c.verb}</em>{' '}
                    <span className="aboutb-t">{c.text}</span>
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
