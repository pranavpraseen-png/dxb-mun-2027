// Motion plumbing for Chamber: GSAP + ScrollTrigger, driven by the shared Lenis scroll feel on the home view.
import { useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { getLenis, scrollToSection as sharedScrollTo, useSmoothScroll, SCROLL_FEEL } from '@/shared/scroll';

gsap.registerPlugin(ScrollTrigger, useGSAP);
export { gsap, ScrollTrigger, useGSAP, useSmoothScroll, SCROLL_FEEL };

/** Height of the floating nav plus breathing room; anchor jumps land below it. */
export const NAV_H = 88;

export function scrollToY(y: number, immediate = false) {
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(y, { immediate, duration: 0.9 });
  else window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' });
}

export function scrollToSection(id: string) {
  if (id === 'home') return scrollToY(0);
  sharedScrollTo(id, NAV_H);
}

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}
