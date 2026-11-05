import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isStill } from '@/shared/hooks';

gsap.registerPlugin(ScrollTrigger);

/*
  Option A motion personality: restrained, editorial line reveals (after editorial award sites such as Designex:
  a printed page that arrives line by line). Each row, rule and block below the opening comes in once, in reading order,
  as it reaches the reading line: a short 14px rise and a fade, transform and opacity only (60fps).
  The CSS lives in paper.css (`.rv`). Still mode and prefers-reduced-motion skip it entirely.
*/
const ROWS = [
  '.sec-head', '.deck', '.floor__grid', '.sch-tabs', '.legend',
  '.col-title', '.col-dek', '.well-row', '.well-count', '.res-row', '.res-foot',
  '.contact-head', '.roll-row', '.host-strip-in', '.credits-end',
].join(', ');

export function useEditorialReveal() {
  useEffect(() => {
    if (isStill()) return;
    const els = gsap.utils.toArray<HTMLElement>(ROWS);
    els.forEach((el) => el.classList.add('rv'));
    const triggers = ScrollTrigger.batch(els, {
      start: 'top 90%',
      once: true,
      onEnter: (batch) => batch.forEach((el, i) => {
        (el as HTMLElement).style.setProperty('--rv-i', String(i));
        el.classList.add('is-in');
      }),
    });
    return () => {
      triggers.forEach((t) => t.kill());
      els.forEach((el) => { el.classList.remove('rv', 'is-in'); el.style.removeProperty('--rv-i'); });
    };
  }, []);
}
