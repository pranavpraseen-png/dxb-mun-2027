import { useEffect, useRef, useState } from 'react';
import { Menu } from '@base-ui/react/menu';
import { Dialog } from '@base-ui/react/dialog';
import { brand } from '@/shared/brand';
import { type View } from '@/shared/hooks';
import { goSection } from './util';

const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'committees', label: 'Committees' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'resources', label: 'Resources' },
  { id: 'contact', label: 'Contact' },
];

function Wordmark({ view }: { view: View }) {
  return (
    <a
      href="#/"
      className="wordmark"
      aria-label="DXB MUN, home"
      onClick={() => { if (view === 'home') window.scrollTo({ top: 0 }); }}
    >
      {brand.logoSrc ? <img src={brand.logoSrc} alt={brand.logoAlt} /> : <span aria-hidden="true">{brand.wordmark}</span>}
    </a>
  );
}

export function Masthead({ view }: { view: View }) {
  const [open, setOpen] = useState(false);
  const [here, setHere] = useState<string | null>(null);
  const bar = useRef<HTMLElement>(null);

  // Scroll progress under the nav, so visitors always know how much is left.
  useEffect(() => {
    let raf = 0;
    const paint = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(paint); };
    paint();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    const ro = new ResizeObserver(on); ro.observe(document.body);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); ro.disconnect(); cancelAnimationFrame(raf); };
  }, [view]);

  // Scroll-spy: the section crossing the upper third of the viewport is "here".
  useEffect(() => {
    if (view !== 'home') { setHere(null); return; }
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const onScroll = () => {
      const line = window.innerHeight * 0.33;
      let cur: string | null = null;
      for (const el of els) if (el.getBoundingClientRect().top <= line) cur = el.id;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = 'contact';
      setHere(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [view]);

  const sectionClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    goSection(id);
  };
  const sheetGo = (e: React.MouseEvent, run: () => void) => {
    e.preventDefault();
    setOpen(false);
    setTimeout(run, 60);
  };

  return (
    <header className="mast">
      <div className="wrap mast-in">
        <Wordmark view={view} />
        <nav className="mast-nav" aria-label="Main">
          <div className="mast-links">
            {SECTIONS.map((s) => (
              <a key={s.id} href={'#' + s.id} aria-current={here === s.id ? 'location' : undefined} onClick={(e) => sectionClick(e, s.id)}>{s.label}</a>
            ))}
            <span className="mast-sep" aria-hidden="true" />
            <a href="#/timer" aria-current={view === 'timer' ? 'page' : undefined}>Timer</a>
            <Menu.Root>
              <Menu.Trigger className="navbtn" data-current={view === 'portal' || view === 'chair' ? '' : undefined}>
                Portal
                <svg className="caret" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={6} align="end" style={{ zIndex: 50 }}>
                  <Menu.Popup className="pop">
                    <Menu.LinkItem className="pop-item" href="#/portal" closeOnClick>
                      <b>Delegate portal</b><span className="mono">chits</span>
                    </Menu.LinkItem>
                    <Menu.LinkItem className="pop-item" href="#/chair" closeOnClick>
                      <b>Chair portal</b><span className="mono">approvals</span>
                    </Menu.LinkItem>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </div>

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger className="menu-btn">
              Menu
              <span className="bars" aria-hidden="true"><i /><i /></span>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className="sheet-backdrop" />
              <Dialog.Popup className="sheet">
                <div className="sheet-head">
                  <Dialog.Title className="wordmark" render={<p />}>{brand.wordmark}</Dialog.Title>
                  <Dialog.Close className="sheet-close">Close</Dialog.Close>
                </div>
                <div className="sheet-body">
                  <div className="sheet-group">
                    <p className="sheet-label mono">The resolution</p>
                    {SECTIONS.map((s) => (
                      <a key={s.id} className="sheet-link" href={'#' + s.id} onClick={(e) => sheetGo(e, () => goSection(s.id))}>
                        {s.label}
                      </a>
                    ))}
                  </div>
                  <div className="sheet-group">
                    <p className="sheet-label mono">Tools</p>
                    {[
                      { href: '#/timer', label: 'Floor timer', tag: 'Timer' },
                      { href: '#/portal', label: 'Delegate portal', tag: 'Portal' },
                      { href: '#/chair', label: 'Chair portal', tag: 'Portal' },
                    ].map((t) => (
                      <a key={t.href} className="sheet-link" href={t.href} onClick={(e) => sheetGo(e, () => { location.hash = t.href; })}>
                        {t.label}<span className="mono">{t.tag}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </nav>
      </div>
      <span className="mast-progress" aria-hidden="true"><i ref={bar} /></span>
    </header>
  );
}
