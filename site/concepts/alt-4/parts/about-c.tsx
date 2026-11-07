// NAME: The flap board
// IDEA: A giant mechanical split-flap board: as it comes into view the hard flaps clatter, in order, to 19 · 03 · 06 · 2027, and a smaller row spells out the dates.
// WHY: A physical, mechanical count is anticipation with a fast, certain end (it settles in about a second, then never moves while you read); numbers chunked on a board are read in one glance.
// WILD: Make the board the real conference clock: on the day it flips to the committee now in session and the minutes to the next session.
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { conference, stats, tba } from '@/data/conference';
import { isStill } from '@/shared/hooks';
import './about-c.css';

gsap.registerPlugin(ScrollTrigger);

const DIGITS = ' 0123456789';
const LETTERS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-·,.';
const STEP = 62; // ms per flap: fast enough to settle in about a second, slow enough to read as mechanical

const groups = [
  { v: String(stats[0].value).padStart(2, '0'), label: stats[0].label, signal: true },
  { v: String(stats[1].value).padStart(2, '0'), label: stats[1].label },
  { v: String(stats[2].value).padStart(2, '0'), label: stats[2].label },
  { v: String(stats[3].value), label: stats[3].label },
];
const datesLine = tba(conference.dates).toUpperCase();

/** The chars a flap passes through on its way from `from` to `to`. Digits run in drum order, like a real board;
 *  letters take a short, fixed number of flaps so long words still settle quickly. */
function path(from: string, to: string, digits: boolean, seed: number) {
  if (from === to) return [];
  if (digits) {
    const set = DIGITS;
    const a = Math.max(0, set.indexOf(from)), b = set.indexOf(to);
    const out: string[] = [];
    for (let i = a; i !== b; i = (i + 1) % set.length) out.push(set[(i + 1) % set.length]);
    return out;
  }
  const n = 2 + (seed % 3);
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(LETTERS[1 + ((seed * 7 + i * 11) % 26)]);
  out.push(to);
  return out;
}

/** One split-flap tile. When `ch` changes it steps through `path()`; each step drops the upper flap and lands the lower. */
function Flap({ ch, delay, digits, seed, instant }: { ch: string; delay: number; digits: boolean; seed: number; instant?: boolean }) {
  const [state, setState] = useState(() => {
    const c = instant ? ch || ' ' : ' ';
    return { cur: c, prev: c, step: 0 };
  });
  const curRef = useRef(state.cur);
  useEffect(() => {
    const target = ch || ' ';
    // A reset to blank is instant (and so is everything under ?still): only the arrival is animated.
    if (target === ' ' || instant) { curRef.current = target; setState({ cur: target, prev: target, step: 0 }); return; }
    const seq = path(curRef.current, target, digits, seed);
    const timers: number[] = [];
    seq.forEach((c, i) => {
      timers.push(window.setTimeout(() => {
        setState((s) => ({ cur: c, prev: s.cur, step: s.step + 1 }));
        curRef.current = c;
      }, delay + i * STEP));
    });
    return () => timers.forEach(clearTimeout);
  }, [ch, delay, digits, seed, instant]);

  const { cur, prev, step } = state;
  return (
    <span className="aboutc-tile">
      <span className="aboutc-half aboutc-top"><span>{cur}</span></span>
      <span className="aboutc-half aboutc-bot"><span>{step ? prev : cur}</span></span>
      {step > 0 && (
        <>
          <span key={'t' + step} className="aboutc-half aboutc-top aboutc-fall"><span>{prev}</span></span>
          <span key={'b' + step} className="aboutc-half aboutc-bot aboutc-land"><span>{cur}</span></span>
        </>
      )}
    </span>
  );
}

export function AboutC({ id }: { id?: string }) {
  const sid = id ?? 'about';
  const root = useRef<HTMLElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const still = isStill();
  const [on, setOn] = useState(still);

  useEffect(() => {
    if (still || !board.current) return;
    // Scroll only starts the flip; the flip itself runs on time and lands in about a second, so the numbers are
    // always readable however fast the page moves. Scrolling back above resets it, so it can play again.
    const st = ScrollTrigger.create({
      trigger: board.current,
      start: 'top 78%',
      onEnter: () => setOn(true),
      onLeaveBack: () => setOn(false),
    });
    return () => st.kill();
  }, [still]);

  let k = 0;
  return (
    <section id={sid} ref={root} className="aboutc" aria-labelledby={sid + '-h'}>
      <div className="aboutc-wrap">
        <p className="aboutc-label"><span>01</span>About</p>
        <div className="aboutc-head">
          <h2 className="aboutc-h" id={sid + '-h'}>A {conference.kind} in {conference.city}.</h2>
          <p className="aboutc-sub"><i className="aboutc-host" aria-hidden="true" />Hosted by {conference.host}. {conference.motto}.</p>
        </div>

        <div className="aboutc-board" ref={board}>
          <p className="aboutc-sr">{groups.map((g) => `${g.v} ${g.label}`).join(', ')}.</p>
          <div className="aboutc-row" aria-hidden="true">
            {groups.map((g, gi) => (
              <div key={g.label} className={'aboutc-group' + (g.signal ? ' is-signal' : '') + (g.v.length > 2 ? ' is-wide' : '')}>
                <div className="aboutc-tiles">
                  {g.v.split('').map((c, i) => {
                    const n = k++;
                    return <Flap key={i} ch={on ? c : ''} digits delay={gi * 90 + i * 45} seed={n} instant={still} />;
                  })}
                </div>
                <p className="aboutc-cap"><span>{String(gi + 1).padStart(2, '0')}</span>{g.label}</p>
              </div>
            ))}
          </div>

          <div className="aboutc-dates">
            <p className="aboutc-cap aboutc-cap--row"><span>05</span>Dates</p>
            <p className="aboutc-sr">Dates: {tba(conference.dates)}.</p>
            <div className="aboutc-small" aria-hidden="true">
              {datesLine.split('').map((c, i) => (
                <Flap key={i} ch={on ? c : ''} digits={false} delay={420 + i * 28} seed={i + 3} instant={still} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
