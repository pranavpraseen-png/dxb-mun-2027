// Alt 4 · The Floor. Every part comes in versions A/B/C; the URL picks the combination (see parts/registry.ts):
//   ?opening=a&hero=a&nav=b&about=c&committees=a&schedule=b&register=c&wellness=a&contact=b   (missing = the lead's pick)
// Option A of the opening + hero: hold to take the floor; a gavel strikes; the floor rises into DXB MUN.
// Spec: site/ALT4-FLOOR.md. `?still` / reduced motion: no opening, settled hero. `?capture`: virtual time for video.mjs.
import { createRoot } from 'react-dom/client';
import { useEffect, useState, type ComponentType } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/jetbrains-mono';
import './floor.css';
import './sections.css';
import { isStill } from '@/shared/hooks';
import { useSmoothScroll } from '@/shared/scroll';
import { NAV_H } from './layout';
import { Stage } from './Stage';
import { Reel } from './Reel';
import { partById, readCombo, type PartId } from './parts/registry';

const still = isStill();
const capture = new URLSearchParams(location.search).has('capture');
const deepLink = location.hash.length > 1 && location.hash !== '#home';
const combo = readCombo();
const root = document.documentElement;
root.classList.add(still ? 'still' : 'motion');
if (capture) root.classList.add('capture');
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
root.dataset.combo = Object.values(combo).join('');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pick = (id: PartId): ComponentType<any> | null => {
  const l = combo[id];
  return partById(id).options.find((o) => o.letter === l)?.Component ?? null;
};
const SECTIONS: PartId[] = ['about', 'committees', 'schedule', 'register', 'wellness', 'contact'];
const Opening = combo.opening === 'a' || combo.opening === 'none' ? null : pick('opening');
const Hero = combo.hero === 'a' ? null : pick('hero');
const Nav = pick('nav');
const skipOpening = still || deepLink || combo.opening === 'none';

function App() {
  // The page stays locked until the opening has finished.
  const [open, setOpen] = useState(skipOpening);
  const [overlayGone, setOverlayGone] = useState(false);
  useSmoothScroll(open && !capture, NAV_H);
  useEffect(() => {
    root.classList.toggle('is-gated', !open);
    if (open && deepLink) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [open]);

  const floorFirst = combo.opening === 'a' && !skipOpening;
  return (
    <>
      <a className="skip" href="#about">Skip to content</a>
      {Nav && <Nav visible={open} />}
      <main>
        {Hero ? (
          <>
            {floorFirst && !overlayGone && (
              <Stage overlay settled={false} onOpen={() => { setOpen(true); setTimeout(() => setOverlayGone(true), 700); }} />
            )}
            <Hero revealed={open} />
          </>
        ) : combo.opening === 'a' ? (
          <><Stage settled={still || deepLink} onOpen={() => setOpen(true)} /><Reel /></>
        ) : (
          <><Stage auto go={open} settled={still || deepLink} onOpen={() => {}} /><Reel /></>
        )}
        {SECTIONS.map((id) => {
          const C = pick(id);
          return C ? <C key={id} /> : null;
        })}
      </main>
      {Opening && !skipOpening && !open && <Opening onDone={() => setOpen(true)} />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
