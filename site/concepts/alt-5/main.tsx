// Alt 5 · Motion. The homepage as a debate in progress: kinetic variable type, colour-block wipes, a vote board.
// `?still` or reduced motion: no loader, no motion; every line is still fitted once. See NOTES.md.
import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useState } from 'react';
import '@fontsource-variable/anybody/wdth.css';
import '@fontsource-variable/martian-mono/wdth.css';
import './alt5.css';
import { isStill } from '@/shared/hooks';
import { useSmoothScroll } from '@/shared/scroll';
import { MOTIONS, NAV_H, instantJump, startFloor } from './floor';
import { start as startKinetic } from './kinetic';
import { Loader } from './Loader';
import { Nav } from './Nav';
import { Tally } from './Tally';
import { About, Committees, Contact, Hero, Register, Resources, Schedule, Wellness } from './Sections';

const still = isStill();
const hashId = location.hash.slice(1);
const deepLink = MOTIONS.some((m) => m.id === hashId) && hashId !== 'home';
const wantLoader = !still && !deepLink;
const root = document.documentElement;
root.classList.add(still ? 'still' : 'motion');
if (wantLoader) root.classList.add('is-loading');
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

startKinetic();

function App() {
  const [loading, setLoading] = useState(wantLoader);
  useSmoothScroll(!loading, NAV_H);
  const done = useCallback(() => {
    root.classList.remove('is-loading');
    setLoading(false);
  }, []);
  useEffect(() => {
    startFloor();
    if (deepLink) requestAnimationFrame(() => requestAnimationFrame(() => instantJump(hashId)));
    else window.scrollTo(0, 0);
  }, []);
  return (
    <>
      <a className="skip" href="#about">Skip to content</a>
      <Nav />
      <main>
        <Hero revealed={!loading} />
        <About />
        <Committees />
        <Schedule />
        <Register />
        <Wellness />
        <Resources />
        <Contact />
      </main>
      <Tally />
      {loading && <Loader onDone={done} />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
