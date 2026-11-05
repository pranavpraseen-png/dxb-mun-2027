import { useRef } from 'react';
import type { MouseEvent } from 'react';
import { committees, conference, heroPhoto, schedule, tba } from '@/data/conference';
import { gsap, useGSAP, scrollToSection, SCROLL_FEEL } from '../motion';

const jump = (id: string) => (e: MouseEvent) => { e.preventDefault(); scrollToSection(id); };

/**
 * Signature moment. The photo opens full-bleed, then scroll pulls it back into a framed placard,
 * and "DXB" and "MUN" slide out from behind it. The CSS describes the final composition; GSAP only
 * animates FROM the full-bleed state, so still mode and reduced motion get the finished frame.
 */
export function Hero({ still }: { still: boolean }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (still) return;
      const el = root.current!;
      const stage = el.querySelector<HTMLElement>('.hero-stage')!;
      const slot = el.querySelector<HTMLElement>('.hero-slot')!;
      const q = gsap.utils.selector(el);
      const intro = el.querySelector<HTMLElement>('.hero-intro');
      const foot = el.querySelector<HTMLElement>('.hero-foot')!;
      foot.inert = true;

      // Where the placard has to start so that it covers the stage exactly (slot is never transformed).
      const m = () => {
        const s = stage.getBoundingClientRect();
        const r = slot.getBoundingClientRect();
        return {
          x: s.left + s.width / 2 - (r.left + r.width / 2),
          y: s.top + s.height / 2 - (r.top + r.height / 2),
          scale: Math.max(s.width / r.width, s.height / r.height) * 1.002,
        };
      };

      const mm = gsap.matchMedia();
      mm.add({ wide: '(min-width: 900px)', narrow: '(max-width: 899.98px)' }, (ctx) => {
        const wide = !!ctx.conditions?.wide;
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: el, start: 'top top', end: 'bottom bottom', scrub: SCROLL_FEEL.scrub, invalidateOnRefresh: true,
            // Whatever is faded out is also inert, so it can't be tabbed to or read out.
            onUpdate: (self) => { intro && (intro.inert = self.progress > 0.18); foot.inert = self.progress < 0.6; },
          },
        });
        tl.fromTo(q('.hero-photo'), { x: () => m().x, y: () => m().y, scale: () => m().scale }, { x: 0, y: 0, scale: 1, duration: 1, ease: 'power2.inOut' }, 0)
          .fromTo(q('.hero-photo img'), { scale: 1.16 }, { scale: 1, duration: 1, ease: 'power1.out' }, 0)
          .fromTo(q('.hero-shade'), { opacity: 1 }, { opacity: 0, duration: 0.5 }, 0.15)
          .fromTo(q('.hero-intro'), { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -24, duration: 0.24 }, 0.04)
          .fromTo(q('.hero-mat'), { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.62)
          .fromTo(q('.hero-word--l'), wide ? { xPercent: 70, opacity: 0 } : { yPercent: 80, opacity: 0 }, { xPercent: 0, yPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, 0.5)
          .fromTo(q('.hero-word--r'), wide ? { xPercent: -70, opacity: 0 } : { yPercent: -80, opacity: 0 }, { xPercent: 0, yPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, 0.5)
          .fromTo(q('.hero-foot > *'), { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.06, ease: 'power2.out' }, 0.78)
          .to({}, { duration: 0.18 });
      });
      return () => { mm.revert(); foot.inert = false; if (intro) intro.inert = false; };
    },
    { scope: root, dependencies: [still] },
  );

  return (
    <section id="home" ref={root} className={still ? 'hero is-still' : 'hero'} aria-labelledby="hero-title">
      <div className="hero-stage">
        <div className="hero-compose">
          <h1 id="hero-title" className="sr-only">{conference.edition}</h1>
          <div className="hero-row">
            <span className="hero-word hero-word--l" aria-hidden="true">DXB</span>
            <span className="hero-slot">
              <span className="hero-mat" aria-hidden="true">
                <span className="hero-mat-cap">
                  <span>{conference.motto}</span>
                  <span>{conference.year}</span>
                </span>
              </span>
              <span className="hero-photo">
                <img src={heroPhoto.src} alt={heroPhoto.alt} width={heroPhoto.width} height={heroPhoto.height} fetchPriority="high" decoding="async" />
                <span className="hero-shade" aria-hidden="true" />
              </span>
            </span>
            <span className="hero-word hero-word--r" aria-hidden="true">MUN</span>
          </div>

          <div className="hero-foot">
            <p className="hero-lede">
              Model United Nations in {conference.city}, hosted by {conference.host}.{' '}
              <span className="hero-when">Dates: {tba(conference.dates)}.</span>
            </p>
            <div className="hero-actions">
              <a className="btn btn--un" href="#committees" onClick={jump('committees')}>Explore committees</a>
              <a className="btn btn--line" href="#schedule" onClick={jump('schedule')}>See the schedule</a>
            </div>
          </div>
        </div>

        {!still && (
          <div className="hero-intro">
            <p className="hero-intro-k">{conference.kind} in {conference.city}</p>
            <p className="hero-intro-t" aria-hidden="true">
              <span className="wm-a">DXB</span> <span className="wm-b">MUN</span> <span className="hero-intro-y">{conference.year}</span>
            </p>
            <p className="hero-intro-l">
              Hosted by {conference.host}. Dates: {tba(conference.dates)}.
            </p>
            <div className="hero-intro-row">
              <a className="btn btn--un" href="#committees" onClick={jump('committees')}>Explore committees</a>
              <p className="hero-cue">
                <span>{committees.length} committees over {schedule.length} days</span>
                <i aria-hidden="true" />
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
