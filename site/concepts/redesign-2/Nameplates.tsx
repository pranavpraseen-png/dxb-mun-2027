import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { committees, stats } from '@/data/conference';
import { useStill } from '@/shared/hooks';
import { RollingText } from './lib/rolling-text';
import { Kicker } from './ui';

/*
  The nameplate wall. 19 cream UN placards in an asymmetric grid; the title takes the first cell.
  On scroll the plates stand up from the desk (rotateX from 84° to 0, hinged on the bottom edge) in a
  grid-aware stagger, and each abbreviation rolls in (Animate UI RollingText) the first time it is seen.
  The section panel grows from an inset frame to full bleed as it arrives (DG Velvet-style transition).
*/
export function Nameplates() {
  const still = useStill();
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (still) return;
    gsap.fromTo('.wall-panel', { clipPath: 'inset(7% 5% 0% 5%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top 15%', scrub: 1 },
    });
    const mm = gsap.matchMedia();
    mm.add({ wide: '(min-width: 1024px)', narrow: '(max-width: 1023.98px)' }, (ctx) => {
      const wide = ctx.conditions?.wide;
      const grid = root.current?.querySelector('.wall-grid');
      // `fromTo` renders at once, so onUpdate can fire before `tw` is assigned.
      let tw: gsap.core.Tween | null = null;
      tw = gsap.fromTo('.np-card', { rotateX: 84, transformOrigin: '50% 100%' }, {
        rotateX: 0, ease: 'power2.out',
        // Clarity: once every plate stands, drop the 3D context so the cards and their type rasterise flat.
        onUpdate: () => { grid?.classList.toggle('is-flat', !!tw && tw.progress() >= 1); },
        stagger: { each: wide ? 0.06 : 0.09, grid: 'auto', from: 'start' },
        scrollTrigger: { trigger: '.wall-grid', start: 'top 88%', end: wide ? 'bottom 78%' : 'bottom 92%', scrub: 1 },
      });
    });
    return () => mm.revert();
  }, { scope: root, dependencies: [still] });

  return (
    <section id="committees" ref={root} className="wall" aria-labelledby="wall-title">
      <div className="wall-panel">
        <ol className="wall-grid">
          <li className="wall-head">
            <Kicker id="committees">Committees</Kicker>
            <h2 id="wall-title" className="wall-title">
              <span className="wall-n">{stats[0].value}</span>
              <span className="wall-t">committees, <em>one nameplate each.</em></span>
            </h2>
          </li>
          {committees.map((c, i) => (
            <li key={c.abbr} className="np">
              <div className="np-card">
                <span className="np-idx" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                {still
                  ? <span className="np-abbr">{c.abbr}</span>
                  : <RollingText className="np-abbr" text={c.abbr} inView inViewOnce inViewMargin="0px 0px -10% 0px" transition={{ duration: 0.45, delay: 0.05, ease: 'easeOut' }} />}
                <span className="np-name">{c.name}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
