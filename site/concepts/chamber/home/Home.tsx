import { useEffect } from 'react';
import { useSmoothScroll, ScrollTrigger, NAV_H } from '../motion';
import { Hero } from './Hero';
import { About } from './About';
import { Committees } from './Committees';
import { Schedule } from './Schedule';
import { Wellness } from './Wellness';
import { Resources } from './Resources';
import { Footer } from './Footer';

export function Home({ still }: { still: boolean }) {
  useSmoothScroll(!still, NAV_H);

  // Fonts change line lengths and therefore every trigger position: refresh once they are in.
  useEffect(() => {
    if (still) return;
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, [still]);

  return (
    <>
      <main id="main" className="home">
        <Hero still={still} />
        <About still={still} />
        <Committees still={still} />
        <Schedule still={still} />
        <div className="wrap duo">
          <Wellness still={still} />
          <Resources />
        </div>
      </main>
      <Footer />
    </>
  );
}
