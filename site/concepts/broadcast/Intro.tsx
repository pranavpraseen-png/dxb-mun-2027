import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { committees, conference, heroPhoto, stats, tba } from '@/data/conference';
import { useStill } from '@/shared/hooks';
import { SCROLL_FEEL, scrollToSection } from '@/shared/scroll';
import { NAV_H, Ticker } from './ui';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const SLABS = 6;

// Ticker copy: only facts from conference.ts.
const tickerItems = [
  conference.motto,
  `${stats[0].value} committees`,
  `${stats[1].value} days`,
  `${stats[2].value} committee sessions`,
  `Hosted by ${conference.host}`,
  `Dates: ${tba(conference.dates)}`,
  `Venue: ${tba(conference.venue)}`,
  ...committees.map((c) => c.abbr),
];

/**
 * The signature: a broadcast-intro wipe, scrubbed by scroll.
 * Pre-roll ident on black, a lime and a white bar sweep across, six diagonal slabs peel away
 * alternately up and down to uncover the photo, then the title keys on as a lower-third.
 */
export function Intro() {
  const still = useStill();
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (still) return;
      const q = gsap.utils.selector(root);
      const W = () => window.innerWidth;
      gsap.set(q('.slab'), { skewX: -14 });
      gsap.set(q('.sweep'), { skewX: -14 });

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: SCROLL_FEEL.scrub * 1.1, invalidateOnRefresh: true },
      });
      tl.to(q('.intro-cue'), { opacity: 0, duration: 0.06 }, 0)
        .to(q('.pip'), { opacity: 0, scale: 1.06, duration: 0.2, ease: 'power1.in' }, 0.1)
        .fromTo(q('.sweep--lime'), { x: () => -W() * 0.7 }, { x: () => W() * 1.25, duration: 0.42 }, 0.02)
        .fromTo(q('.sweep--white'), { x: () => -W() * 0.5 }, { x: () => W() * 1.3, duration: 0.42 }, 0.08)
        .fromTo(q('.intro-photo'), { scale: 1.18 }, { scale: 1, duration: 0.7, ease: 'power1.out' }, 0.1);
      q('.slab').forEach((el, i) => {
        tl.to(el, { yPercent: i % 2 ? 112 : -112, duration: 0.28, ease: 'power2.inOut' }, 0.16 + i * 0.06);
      });
      tl.to({}, { duration: 0.12 });
    },
    { scope: root, dependencies: [still] },
  );

  return (
    <section ref={root} id="home" className="intro" aria-labelledby="intro-title">
      <div className="intro-stage">
        <img
          className="intro-photo"
          src={heroPhoto.src}
          width={heroPhoto.width}
          height={heroPhoto.height}
          alt={heroPhoto.alt}
          fetchPriority="high"
        />

        {!still && (
          <div className="wipes" aria-hidden="true">
            {Array.from({ length: SLABS }, (_, i) => (
              <span key={i} className="slab" style={{ ['--i' as string]: i }} />
            ))}
            <figure className="pip">
              <img src={heroPhoto.src} alt="" width={heroPhoto.width} height={heroPhoto.height} />
            </figure>
            <span className="sweep sweep--lime" />
            <span className="sweep sweep--white" />
            <p className="intro-cue">Scroll to open</p>
          </div>
        )}

        <p className="bug">
          <span className="bug-dot" aria-hidden="true" />
          {conference.edition}
        </p>

        <div className="lower-third">
          <div className="lt-row lt-row--title">
            <h1 id="intro-title">{conference.edition}</h1>
          </div>
          <div className="lt-row lt-row--sub">
            <p>{conference.kind}, {conference.city}</p>
          </div>
          <div className="lt-row lt-row--desc">
            <p className="lt-desc">A {conference.kind} conference in {conference.city}, hosted by {conference.host}.</p>
            <p className="lt-when">
              <span>Dates: {tba(conference.dates)}</span>
              <span>Venue: {tba(conference.venue)}</span>
            </p>
          </div>
          <div className="lt-row lt-row--cta">
            <a
              className="btn btn--lime btn--cta"
              href="#committees"
              onClick={(e) => { e.preventDefault(); scrollToSection('committees', NAV_H); }}
            >
              Explore committees
            </a>
            <span className="lt-teaser">{committees.length} committees, {stats[1].value} days</span>
          </div>
        </div>

        <Ticker items={tickerItems} label="Conference ticker" />
      </div>
    </section>
  );
}
