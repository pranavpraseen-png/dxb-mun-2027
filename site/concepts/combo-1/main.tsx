// Combo 1 · Order + Dispatch. Alt 5's ORDER, ORDER loader hard-cuts into Alt 6's dither hero (field, lens, CABLE 00
// box, title, buttons); below it, Alt 5's calmed motions on one ink ground with the vote-tally bar. See NOTES.md.
// `?still` or reduced motion: no loader, one still frame of the field, no motion. No WebGL2: the CSS dither hero.
import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useState } from 'react';
import '@fontsource-variable/anybody/wdth.css';
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import '@fontsource-variable/martian-mono/wdth.css'; // the loader's corner labels only (kept exactly as in Alt 5)
import './combo.css';
import { isStill } from '@/shared/hooks';
import { useSmoothScroll } from '@/shared/scroll';
import { MOTIONS, NAV_H, instantJump, startFloor } from './floor';
import { start as startKinetic } from './kinetic';
import { Loader } from './Loader';
import { Nav } from './Nav';
import { Tally } from './Tally';
import { Hero, type Mode } from './Hero';
import { About, Committees, Contact, Register, Resources, Schedule, Wellness } from './Sections';

const still = isStill();
const hasWebGL2 = () => {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
};
const mode: Mode = !hasWebGL2() ? 'nogl' : still ? 'still' : 'live';
const hashId = location.hash.slice(1);
const deepLink = MOTIONS.some((m) => m.id === hashId) && hashId !== 'home';
const wantLoader = !still && !deepLink;
const root = document.documentElement;
root.classList.add(still ? 'still' : 'motion', 'mode-' + mode);
if (wantLoader) root.classList.add('is-loading');
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// An 8×8 Bayer tile at a fixed tone, drawn pixel by pixel, for the no-WebGL hero (from Alt 6).
{
  const B = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const x = c.getContext('2d');
  if (x) {
    x.fillStyle = '#0b0b0a'; x.fillRect(0, 0, 8, 8);
    x.fillStyle = '#e9e4d8';
    B.forEach((b, i) => { if (b < 22) x.fillRect(i % 8, Math.floor(i / 8), 1, 1); });
    root.style.setProperty('--bayer', `url(${c.toDataURL()})`);
  }
}

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
        <Hero mode={mode} revealed={!loading} />
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
