import { useEffect, useSyncExternalStore } from 'react';
import { isStill } from '@/shared/hooks';
import { scrollToSection } from '@/shared/scroll';

export const NAV_H = 64;

export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Draws every `[data-rule]` hairline as it enters the viewport (motion mode only; CSS keeps them drawn otherwise). */
export function useRuleReveal(dep: unknown) {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>('[data-rule]:not(.is-drawn)')];
    if (isStill() || !('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('is-drawn'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-drawn'); io.unobserve(en.target); }
      }),
      { rootMargin: '0px 0px -12% 0px' },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [dep]);
}

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** Scroll to an in-page section of the home view, switching to it first if needed. */
export function goSection(id: string) {
  const run = () => scrollToSection(id, NAV_H);
  if (location.hash.startsWith('#/') && location.hash !== '#/') {
    location.hash = '#/';
    setTimeout(run, 120);
  } else run();
}
