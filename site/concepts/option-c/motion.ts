import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isStill } from '@/shared/hooks';

gsap.registerPlugin(ScrollTrigger);

/*
  Option C motion personality: confident colour-block section transitions (after WEIMA's animated colour-block
  transitions). Each band arrives covered by a solid block of the opposite house colour (maroon over a cream band,
  cream over a maroon band); as the band reaches the upper part of the screen the block sweeps off to the right, once.
  One scaleX on one element per band (60fps). Still mode and prefers-reduced-motion skip it entirely.
*/
export function useColourBlocks() {
  useEffect(() => {
    if (isStill()) return;
    const bands = gsap.utils.toArray<HTMLElement>('.band, .contact-band');
    const blocks: HTMLElement[] = [];
    const ctx = gsap.context(() => {
      bands.forEach((band) => {
        const block = document.createElement('span');
        block.className = 'band-wipe';
        block.setAttribute('aria-hidden', 'true');
        band.appendChild(block);
        blocks.push(block);
        gsap.set(block, { scaleX: 1, transformOrigin: '100% 50%' });
        gsap.to(block, {
          scaleX: 0, duration: 0.85, ease: 'power3.inOut',
          scrollTrigger: { trigger: band, start: 'top 72%', once: true },
        });
      });
    });
    return () => { ctx.revert(); blocks.forEach((b) => b.remove()); };
  }, []);
}
