import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isStill } from '@/shared/hooks';
import { SCROLL_FEEL, getLenis, scrollToSection } from '@/shared/scroll';
import { NAV_H } from './ui';

gsap.registerPlugin(ScrollTrigger);

/*
  The final page's motion system (see NOTES.md for every reference). Everything here animates transform, opacity
  or clip-path only, and every effect is skipped in still mode / prefers-reduced-motion (isStill()).
*/

/* ------------------------------------------------------------------ WEIMA: colour-block nav transitions */
// A solid IHS-maroon block with a gold leading edge wipes across the screen, the page jumps under it, and the block
// leaves the other way to reveal the target section.
let wiping = false;
export function wipeTo(id: string) {
  const el = document.getElementById(id);
  const block = document.getElementById('nav-wipe');
  if (!el) return;
  if (isStill() || !block) { scrollToSection(id, NAV_H); return; }
  if (wiping) return;
  wiping = true;
  const jump = () => {
    const l = getLenis();
    const top = el.getBoundingClientRect().top + window.scrollY - NAV_H;
    if (l) l.scrollTo(top, { immediate: true, force: true });
    else window.scrollTo({ top, behavior: 'instant' });
    ScrollTrigger.update();
  };
  gsap.timeline({ onComplete: () => { wiping = false; gsap.set(block, { visibility: 'hidden' }); } })
    .set(block, { visibility: 'visible', transformOrigin: '0% 50%', scaleX: 0 })
    .to(block, { scaleX: 1, duration: 0.46, ease: 'power3.in' })
    .add(jump)
    .set(block, { transformOrigin: '100% 50%' }, '+=0.08')
    .to(block, { scaleX: 0, duration: 0.62, ease: 'power3.out' });
}

/* ------------------------------------------------------------------ Igloo Inc: the sections as stops on one camera move */
// After the flight into Dubai, each section arrives like the camera settling on the next stop: it rises, scales up from
// 94% and comes out of the dark, scrubbed to the scroll with the opening's weighted lag. The journey rail (desktop)
// shows where you are on the route.
export function useJourney() {
  useEffect(() => {
    if (isStill()) return;
    const mm = gsap.matchMedia();
    mm.add({ wide: '(min-width: 721px)', narrow: '(max-width: 720.98px)' }, (ctx) => {
      const { wide } = ctx.conditions as { wide: boolean };
      gsap.utils.toArray<HTMLElement>('.sec-body, .contact-in').forEach((el) => {
        gsap.fromTo(el, { opacity: 0.08, y: wide ? 110 : 56, scale: wide ? 0.94 : 0.98 }, {
          opacity: 1, y: 0, scale: 1, ease: 'none', transformOrigin: '50% 0%',
          scrollTrigger: { trigger: el, start: 'top 100%', end: 'top 50%', scrub: SCROLL_FEEL.scrub },
        });
      });
      gsap.utils.toArray<HTMLElement>('.sec-ix').forEach((el) => {
        gsap.fromTo(el, { opacity: 0, x: -28 }, {
          opacity: 1, x: 0, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 60%', scrub: SCROLL_FEEL.scrub },
        });
      });
      // Cartier: slow, heavy mask reveals for the "objects" of each stop (the placard deck, the floor timer card).
      gsap.utils.toArray<HTMLElement>('.deck__stage, .promo').forEach((el) => {
        gsap.fromTo(el, { clipPath: 'inset(0% 0% 100% 0%)' }, {
          clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'power4.inOut',
          scrollTrigger: { trigger: el, start: 'top 82%', once: true },
          onComplete: () => { el.style.clipPath = ''; },
        });
      });
      const rail = document.querySelector<HTMLElement>('.journey-fill');
      if (rail) {
        gsap.fromTo(rail, { scaleY: 0 }, {
          scaleY: 1, ease: 'none',
          scrollTrigger: { start: 0, end: 'max', scrub: 0.4 },
        });
      }
    });
    return () => mm.revert();
  }, []);
}

/* ------------------------------------------------------------------ Lando Norris: the cursor spotlight on the hero */
// A soft circular mask follows the cursor over the filled "DXB MUN" and reveals the gold outline layer beneath it.
// Everyone gets one slow automatic pass on load; touch screens get only that pass.
// `area` is the whole hero section, so the window follows the pointer anywhere over the hero, not only over the letters.
// The pass must always end closed: if the tab is hidden (rAF paused, so GSAP is frozen) or a pointer takes over,
// the pass is jumped to its end (r = 0) synchronously, without waiting for a frame.
export function useSpotlight(spot: React.RefObject<HTMLElement | null>, area: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = spot.current, hero = area.current;
    if (!el || !hero || isStill()) return;
    // The CSS reads these as unitless numbers: --mx/--my in % of the headline box, --r in px.
    gsap.set(el, { '--mx': -20, '--my': 50, '--r': 0 });
    const pass = gsap.timeline({ delay: 1.7 })
      .to(el, { '--r': 150, duration: 0.6, ease: 'power2.out' }, 0)
      .fromTo(el, { '--mx': -10 }, { '--mx': 110, duration: 2.6, ease: 'power2.inOut' }, 0)
      .to(el, { '--r': 0, duration: 0.5, ease: 'power2.in' }, 2.2);
    const endPass = () => { if (pass.isActive() || pass.progress() < 1) pass.progress(1).kill(); };
    // Background tabs pause rAF: close the pass when the tab hides, and in any case by the time it should be over.
    const onVis = () => { if (document.hidden) endPass(); };
    document.addEventListener('visibilitychange', onVis);
    const fallback = window.setTimeout(endPass, (1.7 + 2.7) * 1000 + 400);
    const cleanup = () => { pass.kill(); window.clearTimeout(fallback); document.removeEventListener('visibilitychange', onVis); };
    if (!window.matchMedia('(any-pointer: fine)').matches) return cleanup;

    // The centre is placed directly on every move (no frame needed); only the radius eases open and shut.
    const r = gsap.quickTo(el, '--r', { duration: 0.45, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // touch keeps only the automatic pass
      endPass();
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      gsap.set(el, { '--mx': ((e.clientX - b.left) / b.width) * 100, '--my': ((e.clientY - b.top) / b.height) * 100 });
      r(Math.round(Math.min(220, b.height * 0.55)));
    };
    const leave = (e: PointerEvent) => { if (e.pointerType !== 'touch') r(0); };
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerleave', leave);
    return () => { cleanup(); hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', leave); };
  }, [spot, area]);
}
