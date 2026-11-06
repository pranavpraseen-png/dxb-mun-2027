// Alt 6 · Dispatch. A teleprinter prints the header, a 1-bit dither field floods and resolves into the hero, a cursor
// lens declassifies the layer underneath, and the rest of the page is one strip of tractor-feed paper.
// Reduced motion or `?still`: no opening, one still frame of the field, every bar already off. No WebGL2: CSS hero.
import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useState } from 'react';
import '@fontsource-variable/sofia-sans-extra-condensed/wght.css';
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import './dispatch.css';
import { scrollToSection, useSmoothScroll } from '@/shared/scroll';
import { Hero, type Mode } from './Hero';
import { Nav } from './Nav';
import { Cables, EndOfTransmission, useActiveCable } from './Cables';
import { NAV_H, STILL, ScrollTrigger } from './ui';

const hasWebGL2 = () => {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
};
const mode: Mode = !hasWebGL2() ? 'nogl' : STILL ? 'still' : 'live';
document.documentElement.classList.add('mode-' + mode);

// An 8×8 Bayer tile at a fixed tone, drawn pixel by pixel (no anti-aliasing), for the pass and the no-WebGL hero.
{
  const B = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const x = c.getContext('2d');
  if (x) {
    x.fillStyle = '#0b0b0a'; x.fillRect(0, 0, 8, 8);
    x.fillStyle = '#e9e4d8';
    B.forEach((b, i) => { if (b < 22) x.fillRect(i % 8, Math.floor(i / 8), 1, 1); });
    document.documentElement.style.setProperty('--bayer', `url(${c.toDataURL()})`);
  }
}

function App() {
  const [ready, setReady] = useState(mode !== 'live');
  const onReady = useCallback(() => setReady(true), []);
  useSmoothScroll(ready, NAV_H);
  const active = useActiveCable(ready);

  useEffect(() => {
    document.documentElement.classList.toggle('is-opening', !ready);
    if (!ready) { scrollTo(0, 0); return; }
    // a hash on load lands on its cable once the opening is done
    const id = location.hash.slice(1);
    if (id && id !== 'home' && document.getElementById(id)) requestAnimationFrame(() => scrollToSection(id, NAV_H));
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, [ready]);

  return (
    <>
      <a className="skip-link" href="#about">Skip to the cables</a>
      <Nav active={active} shown={ready} />
      <Hero mode={mode} onReady={onReady} ready={ready} />
      <main className="feed">
        <Cables />
        <EndOfTransmission />
      </main>
    </>
  );
}

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
createRoot(document.getElementById('root')!).render(<App />);
