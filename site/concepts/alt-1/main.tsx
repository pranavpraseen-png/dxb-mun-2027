// Alt 1 · Terminal Paper. BLUEPRINT structure 0–8 in colour set C2 (Terminal, Getty, Dropbox) and type set T3.
import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import '@fontsource-variable/inter-tight';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/newsreader/wght-italic.css';
import './alt1.css';
import { brand } from '@/shared/brand';
import { isStill } from '@/shared/hooks';
import { scrollToSection, useSmoothScroll } from '@/shared/scroll';
import { Cursor } from './fx';
import { Loader, shouldOpen } from './Loader';
import { Stage } from './Stage';
import { Clauses, Committees, Flight, Footer, Hero, IndexRows, Register, Schedule } from './sections';
import { register } from './links';

const still = isStill();
const openNow = !still && shouldOpen();
const root = document.documentElement;
root.classList.add(still ? 'is-still' : 'motion');
if (openNow) root.classList.add('is-loading');
else requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-in')));

const NAV_H = 56;
const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'committees', label: 'Committees' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'register', label: 'Register' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'resources', label: 'Resources' },
  { id: 'contact', label: 'Contact' },
] as const;
const num = (i: number) => String(i + 1).padStart(2, '0');

/** The section whose top has passed 40% of the screen. */
function useActive() {
  const [active, setActive] = useState<string>('home');
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const line = window.innerHeight * 0.4;
      let id = 'home';
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) id = s.id;
      }
      setActive(id);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
  return active;
}

function go(e: React.MouseEvent, id: string) {
  e.preventDefault();
  scrollToSection(id, id === 'home' ? 0 : NAV_H);
  history.replaceState(null, '', '#' + id);
}

function Nav() {
  const active = useActive();
  const [open, setOpen] = useState(false);
  const i = SECTIONS.findIndex((s) => s.id === active);
  const stubLabel = i < 0 ? '§ 00 · Home' : `§ ${num(i)} · ${SECTIONS[i].label}`;
  return (
    <header className="nav">
      <a className="nav-logo" href="#home" onClick={(e) => go(e, 'home')} aria-label={`${brand.wordmark} 2027, back to the top`}>
        {brand.logoSrc ? <img src={brand.logoSrc} alt={brand.logoAlt} height={22} /> : <span className="nav-logo-text">DXB MUN 2027</span>}
      </a>
      <nav className="nav-links mono" aria-label="Sections">
        {SECTIONS.map((s, k) => (
          <a key={s.id} href={'#' + s.id} onClick={(e) => go(e, s.id)} aria-current={active === s.id ? 'true' : undefined} style={{ ['--k' as string]: k }}>
            <span className="nav-no">{num(k)}</span> {s.label}
          </a>
        ))}
      </nav>
      <a className="stub" href={register}>
        <span className="stub-sec mono" aria-hidden="true">{stubLabel}</span>
        <span className="stub-cta">Register <span aria-hidden="true">→</span></span>
      </a>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger className="menu-pill mono">Menu</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup className="sheet">
            <div className="sheet-bar">
              <span className="nav-logo-text">DXB MUN 2027</span>
              <Dialog.Close className="menu-pill mono">Close</Dialog.Close>
            </div>
            <Dialog.Title className="sr">Sections</Dialog.Title>
            <ol className="sheet-list">
              {SECTIONS.map((s, k) => (
                <li key={s.id}>
                  <a
                    href={'#' + s.id}
                    aria-current={active === s.id ? 'true' : undefined}
                    onClick={(e) => { setOpen(false); go(e, s.id); }}
                  >
                    <span className="mono">{num(k)}</span>{s.label}
                  </a>
                </li>
              ))}
            </ol>
            <a className="pass-cta sheet-cta" href={register}>Register <span aria-hidden="true">→</span></a>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}

function App() {
  const [opening, setOpening] = useState(openNow);
  useSmoothScroll(!still, NAV_H);
  const done = useCallback(() => setOpening(false), []);
  useEffect(() => {
    // A deep link (#committees) skips straight to its section once the page is laid out.
    const id = location.hash.replace('#', '');
    if (id && id !== 'home' && document.getElementById(id) && !openNow) setTimeout(() => scrollToSection(id, NAV_H), 60);
  }, []);
  return (
    <>
      <a className="skip" href="#about">Skip to content</a>
      <Stage still={still} />
      <Nav />
      <main id="main">
        <Hero />
        <Flight still={still} />
        <Clauses still={still} />
        <Committees still={still} />
        <Schedule still={still} />
        <Register still={still} />
        <IndexRows />
      </main>
      <Footer />
      {opening && <Loader onDone={done} />}
      {!still && <Cursor />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
