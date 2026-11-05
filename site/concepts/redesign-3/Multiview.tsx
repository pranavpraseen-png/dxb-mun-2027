// CH 02, Committees as a broadcast multiview: a sticky PGM monitor carries the selected committee's UN nameplate with its
// full name as a lower-third, beside a wall of 19 channel tiles (each a small placard) that "power on" as it scrolls in.
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import NumberFlow from '@number-flow/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { committees, conference } from '@/data/conference';
import { Slate } from './ui';
// Library components (see LIBRARY.md).
import DecryptedText from './lib/decrypted-text';
import { NumberTicker } from './lib/number-ticker';
import { Button } from '../../portal/ui/coss/button';

gsap.registerPlugin(ScrollTrigger);
const ch = (i: number) => String(i + 1).padStart(2, '0');

export function Multiview({ still }: { still: boolean }) {
  const [cur, setCur] = useState(0);
  const [on, setOn] = useState(still);
  const wall = useRef<HTMLDivElement>(null);
  const c = committees[cur];
  const n = committees.length;

  /* the wall powers on: tiles open from a horizontal line, from the centre outwards (Terminal-style instrument motion) */
  useEffect(() => {
    const el = wall.current;
    if (!el || still) return;
    const ctx = gsap.context(() => {
      const tiles = gsap.utils.toArray<HTMLElement>('.tile', el);
      gsap.set(tiles, { clipPath: 'inset(50% 0% 50% 0%)', opacity: 0.3 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 78%',
        once: true,
        onEnter: () => {
          const cols = getComputedStyle(el).gridTemplateColumns.split(' ').length;
          gsap.to(tiles, {
            clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: 0.55, ease: 'power4.out',
            stagger: { each: 0.035, grid: [Math.ceil(tiles.length / cols), cols], from: 'center' },
            onStart: () => setOn(true),
          });
        },
      });
    }, el);
    return () => ctx.revert();
  }, [still]);

  const step = (d: number) => setCur((i) => (i + d + n) % n);

  return (
    <section id="committees" className="sec mv" aria-labelledby="committees-title">
      <Slate id="committees" title={`${n} committees`} dek="Pick a channel to put it on program." tone="accent" />

      <div className="mv-grid">
        <div className="mv-pgm-wrap">
          <div className="mon mon--mvpgm">
            <div className="mon-bar">
              <span className="mon-tag mon-tag--pgm">PGM</span>
              <span className="mon-src">CH {ch(cur)}</span>
              <span className="mon-count" aria-hidden="true"><NumberFlow value={cur + 1} format={{ minimumIntegerDigits: 2 }} /> / {n}</span>
            </div>
            <div className="mv-pgm-view">
              <div className="plate plate--xl" key={c.abbr}>
                <span className="plate-band"><span>{conference.edition}</span></span>
                <span className="plate-abbr">{c.abbr}</span>
              </div>
              <div className="mv-lt" aria-live="polite">
                <p className="mv-lt-k">Committee</p>
                <p className="mv-lt-name">
                  {still
                    ? c.name
                    : <DecryptedText key={c.abbr} text={c.name} animateOn="view" sequential speed={22} maxIterations={8} revealDirection="start" characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" encryptedClassName="mv-enc" />}
                </p>
              </div>
            </div>
            <div className="mv-pgm-ctl">
              <Button variant="outline" size="icon" aria-label="Previous committee" onClick={() => step(-1)}><ChevronLeft aria-hidden="true" /></Button>
              <Button variant="outline" size="icon" aria-label="Next committee" onClick={() => step(1)}><ChevronRight aria-hidden="true" /></Button>
            </div>
          </div>
        </div>

        <div ref={wall} className="wall" role="group" aria-label="Committee channels">
          {committees.map((k, i) => (
            <button
              key={k.abbr}
              type="button"
              className={clsx('tile', i === cur && 'is-pgm')}
              aria-pressed={i === cur}
              aria-label={`${k.abbr}, ${k.name}`}
              onClick={() => setCur(i)}
            >
              <span className="tile-bar">
                <span className="tile-ch">CH {ch(i)}</span>
                <span className="tile-tally">{i === cur ? 'PGM' : ''}</span>
              </span>
              <span className="plate plate--sm"><span className="plate-abbr">{k.abbr}</span></span>
            </button>
          ))}
          <div className="tile tile--status" aria-hidden="true">
            <span className="tile-bar"><span className="tile-ch">MV</span></span>
            <span className="status-n"><NumberTicker value={n} start={on} still={still} /></span>
            <span className="status-l">channels</span>
          </div>
        </div>
      </div>
    </section>
  );
}
