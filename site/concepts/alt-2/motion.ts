// Alt 2 · Poster: one motion vocabulary for the whole page (BLUEPRINT section 5).
// One curve everywhere: Lando's cubic-bezier(0.65, 0.05, 0, 1); 0.75 s for UI, 1.1 s for big reveals.
// Text appears only by line masks, letter fills, scramble or slices. Never blur, dissolve or glow.
import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { isStill } from '@/shared/hooks';

gsap.registerPlugin(ScrollTrigger, CustomEase, SplitText, ScrambleTextPlugin);

export const EASE = CustomEase.create('poster', '0.65,0.05,0,1');
export const T_UI = 0.75;
export const T_BIG = 1.1;
export const NAV_H = 48;

export { gsap, ScrollTrigger, SplitText };

/** Every `[data-rise]` heading rises line by line from behind its own mask the first time it reaches the screen. */
export function useLineRises(ready: boolean) {
  useEffect(() => {
    if (!ready || isStill()) return;
    const splits: SplitText[] = [];
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-rise]').forEach((el) => {
        const s = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'ln' });
        splits.push(s);
        gsap.from(s.lines, {
          yPercent: 108, duration: T_BIG, ease: EASE, stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });
      // Mono labels and small rules slice in from the left (clip-path), never fade through blur.
      gsap.utils.toArray<HTMLElement>('[data-slice]').forEach((el) => {
        gsap.fromTo(el, { clipPath: 'inset(0% 100% 0% 0%)' }, {
          clipPath: 'inset(0% 0% 0% 0%)', duration: T_UI, ease: EASE,
          scrollTrigger: { trigger: el, start: 'top 92%', once: true },
          onComplete: () => { el.style.clipPath = ''; },
        });
      });
    });
    return () => { ctx.revert(); splits.forEach((s) => s.revert()); };
  }, [ready]);
}

/** Section the reader is in, for the nav strike-through and the live ticket stub. */
export function watchSections(ids: string[], cb: (id: string) => void) {
  const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) cb(e.target.id); });
  }, { rootMargin: '-48% 0px -50% 0px' });
  els.forEach((el) => io.observe(el));
  const top = () => { if (window.scrollY < window.innerHeight * 0.5) cb('home'); };
  window.addEventListener('scroll', top, { passive: true });
  return () => { io.disconnect(); window.removeEventListener('scroll', top); };
}
