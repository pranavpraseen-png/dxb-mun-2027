import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ChevronDown } from 'lucide-react';
import { committees, conference, heroPhoto, schedule, tba } from '@/data/conference';
import { ArchFrame, Screen, Star } from './ornament';
import { SectionLink } from './scroll';

gsap.registerPlugin(ScrollTrigger, useGSAP);


/**
 * Signature moment. A pair of mashrabiya screens close over the photograph. Scrolling (pinned,
 * scrubbed) draws them apart to the edges of the frame, where they stay as a lattice border;
 * the photograph settles from a slow zoom and the title arrives on it.
 */
export function Hero({ still }: { still: boolean }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (still) return;
    const q = gsap.utils.selector(root);
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: root.current, start: 'top 64px', end: '+=65%', pin: true, scrub: 1.4, anticipatePin: 1, invalidateOnRefresh: true },
    });
    tl.fromTo(q('.seal-in'), { scale: 1 }, { scale: 0.94, duration: 1, ease: 'power1.inOut' }, 0)
      .fromTo(q('.door-l'), { xPercent: 0 }, { xPercent: -92, duration: 0.9, ease: 'power2.inOut' }, 0.1)
      .fromTo(q('.door-r'), { xPercent: 0 }, { xPercent: 92, duration: 0.9, ease: 'power2.inOut' }, 0.1)
      .fromTo(q('.door-l .scr'), { scale: 1 }, { scale: 1.08, duration: 0.9, ease: 'power1.in', transformOrigin: '100% 50%' }, 0.1)
      .fromTo(q('.door-r .scr'), { scale: 1 }, { scale: 1.08, duration: 0.9, ease: 'power1.in', transformOrigin: '0% 50%' }, 0.1)
      .fromTo(q('.hero-photo'), { scale: 1.14 }, { scale: 1, duration: 1.1, ease: 'power1.out' }, 0)
      .fromTo(q('.hero-scrim'), { opacity: 0.3 }, { opacity: 0.5, duration: 0.5 }, 0.5);
  }, { scope: root, dependencies: [still] });

  return (
    <section id="home" ref={root} className={'hero' + (still ? ' is-still' : '')} aria-labelledby="hero-title">
      <img className="hero-photo" src={heroPhoto.src} width={heroPhoto.width} height={heroPhoto.height} alt={heroPhoto.alt} fetchPriority="high" />
      <div className="hero-scrim" />

      <div className="door door-l" aria-hidden="true"><Screen className="scr" cols={6} rows={9} anchor="xMaxYMid" open="all" /></div>
      <div className="door door-r" aria-hidden="true"><Screen className="scr" cols={6} rows={9} anchor="xMinYMid" open="all" /></div>

      <div className="seal">
        <div className="seal-in">
          <ArchFrame className="seal-arch" fill lines={2} gap={7} crown={0.52} />
          <div className="seal-body">
            <p className="seal-ar"><span lang="ar" dir="rtl">نموذج الأمم المتحدة</span><Star size={9} className="orn" /><span lang="ar" dir="rtl">دبي</span></p>
            <h1 id="hero-title" className="seal-word">DXB MUN {conference.year}</h1>
            <p className="seal-desc"><span>{conference.kind} in {conference.city}</span><span>Hosted by {conference.host}</span></p>
            <p className="seal-tba">Dates and venue: {tba(conference.dates)}</p>
            <SectionLink to="committees" className="btn btn-ivory seal-btn">Explore committees</SectionLink>
            <p className="seal-cue"><span>{committees.length} committees over {schedule.length} days</span><span className="seal-cue-s">Scroll for the details <ChevronDown size={16} aria-hidden="true" /></span></p>
          </div>
        </div>
      </div>
    </section>
  );
}
