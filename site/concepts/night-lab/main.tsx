// DXB MUN 2027 · "Night Lab": the approved homepage build (BLUEPRINT.md, colours C1, type T1).
import { createRoot } from 'react-dom/client';
import { useEffect } from 'react';
import '@fontsource-variable/mona-sans/standard.css';
import '@fontsource-variable/geist-mono';
import '@fontsource/instrument-serif/400-italic.css';
import './night-lab.css';
import { useSmoothScroll } from '@/shared/scroll';
import { ScrollTrigger, still } from './motion';
import { NAV, type SectionId } from './data';
import { sectionStore } from './store';
import { NAV_H } from './ui';
import { Nav } from './Nav';
import { Stage } from './Stage';
import { Clauses } from './Clauses';
import { Committees } from './Committees';
import { Schedule } from './Schedule';
import { Pass } from './Pass';
import { Desk } from './Desk';
import { Footer } from './Footer';
import { Cursor } from './Cursor';

const root = document.documentElement;
root.classList.add(still ? 'is-still' : 'motion');
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

/** Scroll spy: the section whose box crosses the middle of the screen drives the nav and the ticket stub. */
function useSpy() {
  useEffect(() => {
    const ids: SectionId[] = ['top', ...NAV.map((n) => n.id)];
    let raf = 0;
    const tick = () => {
      raf = 0;
      const mid = window.innerHeight * 0.45;
      let cur: SectionId = 'top';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        // a pinned section's spacer holds its scroll length; measure that when present
        const box = (el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el).getBoundingClientRect();
        if (box.top <= mid) cur = id;
      }
      sectionStore.set(cur);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
}

function App() {
  useSmoothScroll(!still, NAV_H);
  useSpy();
  useEffect(() => {
    // fonts change line breaks and edge-to-edge sizes: re-measure every trigger once they are in
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    // the screenshot script reads the scroll positions of each stage from here
    (window as unknown as { __nl: unknown }).__nl = {
      stops: () => Object.fromEntries(
        ['flight', 'clauses', 'committees', 'schedule'].map((id) => {
          const t = ScrollTrigger.getById(id);
          return [id, t ? { start: Math.round(t.start), end: Math.round(t.end) } : null];
        }),
      ),
      all: () => ScrollTrigger.getAll().map((t) => ({ id: t.vars.id, s: Math.round(t.start), e: Math.round(t.end), p: +t.progress.toFixed(3), a: t.animation ? +t.animation.progress().toFixed(3) : null, trg: (t.trigger as HTMLElement | undefined)?.className })),
    };
  }, []);
  return (
    <>
      <a className="skip" href="#about" onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView(); }}>Skip to content</a>
      <Nav />
      <main id="main">
        <Stage />
        <Clauses />
        <Committees />
        <Schedule />
        <Pass />
        <Desk />
      </main>
      <Footer />
      <Cursor />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
