// One scroll "feel" for every concept. The owner said scrolling was "too fast" (2026-11-04).
// Lenis with a low lerp and reduced wheel speed gives a calm, weighted scroll. Touch scrolling stays native
// (phones already feel right), GSAP ScrollTrigger is kept in sync, and still mode or reduced motion turns it all off.
import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isStill } from './hooks';

gsap.registerPlugin(ScrollTrigger);

export const SCROLL_FEEL = {
  lerp: 0.075, // lower = smoother and slower to settle (Lenis default 0.1)
  wheelMultiplier: 0.8, // each wheel notch travels 80% of the native distance
  touchMultiplier: 1,
  // Recommended ScrollTrigger `scrub` smoothing for signature moments: seconds the animation lags behind the scroll.
  scrub: 1.2,
} as const;

let current: Lenis | null = null;
export const getLenis = () => current;

/** Smooth scroll for the homepage. `headerOffset` = height of the fixed top nav, so anchor jumps land below it. */
export function useSmoothScroll(enabled = true, headerOffset = 80) {
  useEffect(() => {
    if (!enabled || isStill()) return;
    const lenis = new Lenis({
      lerp: SCROLL_FEEL.lerp,
      wheelMultiplier: SCROLL_FEEL.wheelMultiplier,
      touchMultiplier: SCROLL_FEEL.touchMultiplier,
      smoothWheel: true,
      syncTouch: false,
      anchors: { offset: -headerOffset },
      autoRaf: false,
    });
    current = lenis;
    document.documentElement.style.scrollBehavior = 'auto'; // CSS smooth scrolling fights Lenis
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      current = null;
      document.documentElement.style.scrollBehavior = '';
    };
  }, [enabled, headerOffset]);
}

/** Scroll to a section id (used by nav links). Goes through Lenis when active so the motion matches. */
export function scrollToSection(id: string, headerOffset = 80) {
  const el = document.getElementById(id);
  if (!el) return;
  if (current) current.scrollTo(el, { offset: -headerOffset, duration: 1.1 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - headerOffset, behavior: isStill() ? 'auto' : 'smooth' });
}
