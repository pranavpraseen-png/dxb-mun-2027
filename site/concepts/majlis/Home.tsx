import { useEffect } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSmoothScroll } from '@/shared/scroll';
import { Hero } from './Hero';
import { About } from './About';
import { Committees } from './Committees';
import { Schedule } from './Schedule';
import { Between } from './Between';
import { Footer } from './Footer';
import { HEADER, pending, scrollToSection } from './scroll';

export function Home({ still }: { still: boolean }) {
  // The shared, calmer scroll feel (off in still mode / reduced motion).
  useSmoothScroll(true, HEADER);

  // Arrived from another view through a section link.
  useEffect(() => {
    if (!pending.id) return;
    const id = pending.id;
    pending.id = null;
    const t = setTimeout(() => { ScrollTrigger.refresh(); scrollToSection(id); }, 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Hero still={still} />
      <About still={still} />
      <Committees still={still} />
      <Schedule still={still} />
      <Between />
      <Footer />
    </>
  );
}
