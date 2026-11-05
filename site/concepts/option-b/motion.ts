import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isStill } from '@/shared/hooks';
import { SCROLL_FEEL } from '@/shared/scroll';

gsap.registerPlugin(ScrollTrigger);

/*
  Option B motion personality: slow and cinematic. The pinned globe flight is longer (EXTRA = 2.6 in Opening.tsx, after
  Igloo Inc's scroll-navigated 3D world), and every section below it drifts up out of the dark, scrubbed to the scroll
  with the same weighted lag as the opening (SCROLL_FEEL.scrub): a slow camera move rather than a pop-in.
  Transform and opacity only (60fps). Still mode and prefers-reduced-motion skip it entirely.
*/
export function useCinematicDrift() {
  useEffect(() => {
    if (isStill()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.sec-body, .sec-ix, .contact-in').forEach((el) => {
        gsap.fromTo(el, { opacity: 0.12, y: 72 }, {
          opacity: 1, y: 0, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 52%', scrub: SCROLL_FEEL.scrub },
        });
      });
    });
    return () => ctx.revert();
  }, []);
}
