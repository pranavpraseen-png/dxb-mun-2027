import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useState } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './alt2.css';
import { isStill } from '@/shared/hooks';
import { useSmoothScroll } from '@/shared/scroll';
import { NAV_H, ScrollTrigger, useLineRises, watchSections } from './motion';
import { WATCHED } from './sections';
import { Loader } from './Loader';
import { Nav } from './Nav';
import { Flight } from './Flight';
import { Clauses } from './Clauses';
import { Committees } from './Committees';
import { Schedule } from './Schedule';
import { Register } from './Register';
import { IndexRows } from './IndexRows';
import { Footer } from './Footer';
import { Cursor } from './Cursor';

/*
  Alt 2 · Poster. BLUEPRINT structure (sections 0–8) in colour set C3 "Poster" with the IHS maroon accent,
  and type set T2 (an expanded grotesk for everything, IBM Plex Mono for labels, no serif). See NOTES.md.
*/
const still = isStill();
const LOADER_KEY = 'alt2.loader.seen';
const seenLoader = () => { try { return sessionStorage.getItem(LOADER_KEY) === '1'; } catch { return false; } };
const wantLoader = !still && !seenLoader() && !location.hash;

const root = document.documentElement;
root.classList.add(still ? 'still' : 'motion');
if (wantLoader) root.classList.add('is-loading', 'logo-wait');

function App() {
  const [loading, setLoading] = useState(wantLoader);
  const [revealed, setRevealed] = useState(!wantLoader);
  const [current, setCurrent] = useState('home');

  useSmoothScroll(!loading, NAV_H);
  useLineRises(revealed);

  const onReveal = useCallback(() => {
    setRevealed(true);
    document.body.classList.add('is-revealed');
    root.classList.remove('is-loading');
  }, []);
  const onDone = useCallback(() => {
    try { sessionStorage.setItem(LOADER_KEY, '1'); } catch { /* storage may be blocked: the loader just plays again */ }
    setLoading(false);
    root.classList.remove('logo-wait');
  }, []);

  useEffect(() => { if (!wantLoader) document.body.classList.add('is-revealed'); }, []);
  useEffect(() => watchSections(WATCHED, setCurrent), []);
  useEffect(() => {
    // re-measure every pinned stage once the web fonts have landed
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);

  const fine = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  return (
    <>
      <a className="skip" href="#about">Skip to content</a>
      <Nav current={current} />
      <main>
        <Flight still={still} revealed={revealed} />
        <Clauses still={still} />
        <Committees still={still} />
        <Schedule still={still} />
        <Register still={still} />
        <IndexRows />
      </main>
      <Footer />
      {loading && <Loader onReveal={onReveal} onDone={onDone} />}
      {!still && fine && <Cursor />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
