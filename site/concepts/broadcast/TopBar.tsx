import { useEffect, useRef, useState } from 'react';
import { Menu } from '@base-ui/react/menu';
import { Dialog } from '@base-ui/react/dialog';
import { ChevronDown, Menu as MenuIcon, X } from 'lucide-react';
import clsx from 'clsx';
import { nav } from '@/data/conference';
import { viewHref, type View } from '@/shared/hooks';
import { getLenis, scrollToSection } from '@/shared/scroll';
import { NAV_H, Wordmark } from './ui';

// Section links of the one-page home (no slash, so they never change the view).
const sections = nav.filter((n) => n.id !== 'home' && n.id !== 'timer');

// Scroll-spy: the section whose top has passed the upper third of the screen is "on air".
function useActiveSection(enabled: boolean, bar: React.RefObject<HTMLSpanElement | null>) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) { setActive(null); return; }
    let raf = 0;
    const measure = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
      const line = window.innerHeight * 0.35;
      let cur: string | null = null;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) cur = s.id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = sections[sections.length - 1].id;
      setActive(cur);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, [enabled]);
  return active;
}

export function TopBar({ view }: { view: View }) {
  const [open, setOpen] = useState(false);
  const home = view === 'home';
  const progress = useRef<HTMLSpanElement>(null);
  const active = useActiveSection(home, progress);
  const jump = (e: React.MouseEvent, id: string) => {
    if (!home) return;
    e.preventDefault();
    setOpen(false);
    // Let the menu sheet close before scrolling.
    requestAnimationFrame(() => scrollToSection(id, NAV_H));
  };
  const sectionHref = (id: string) => (home ? `#${id}` : `#/`);

  return (
    <header className="topbar" data-view={view}>
      <a
        className="topbar-brand"
        href="#/"
        aria-label="DXB MUN, back to the start"
        onClick={(e) => {
          if (home) { e.preventDefault(); const l = getLenis(); if (l) l.scrollTo(0, { duration: 1.1 }); else window.scrollTo({ top: 0 }); }
        }}
      >
        <Wordmark />
      </a>

      {home ? (
        <nav className="topbar-nav" aria-label="Sections">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={(e) => jump(e, s.id)} className={clsx(active === s.id && 'is-active')} aria-current={active === s.id ? 'location' : undefined}>{s.label}</a>
          ))}
        </nav>
      ) : (
        <nav className="topbar-nav" aria-label="Views">
          <a href="#/">Website</a>
          <a href="#/timer" aria-current={view === 'timer' ? 'page' : undefined}>Timer</a>
          <a href="#/portal" aria-current={view === 'portal' ? 'page' : undefined}>Delegate</a>
          <a href="#/chair" aria-current={view === 'chair' ? 'page' : undefined}>Chair</a>
        </nav>
      )}

      <div className="topbar-actions">
        {home && <a className="tb-btn" href={viewHref('timer')}>Timer</a>}
        <Menu.Root>
          <Menu.Trigger className={clsx('tb-btn tb-btn--lime', (view === 'portal' || view === 'chair') && 'is-on')}>
            Portal <ChevronDown size={18} aria-hidden="true" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={6} align="end" className="menu-pos">
              <Menu.Popup className="menu-pop">
                <Menu.LinkItem className="menu-item" href="#/portal" closeOnClick>
                  <span className="menu-item-k">Delegate</span>
                  <span className="menu-item-d">Send and read chits</span>
                </Menu.LinkItem>
                <Menu.LinkItem className="menu-item" href="#/chair" closeOnClick>
                  <span className="menu-item-k">Chair</span>
                  <span className="menu-item-d">Approve chits, run the room</span>
                </Menu.LinkItem>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>

        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger className="tb-btn tb-menu" aria-label="Open menu">
            <MenuIcon size={22} aria-hidden="true" />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="sheet-backdrop" />
            <Dialog.Popup className="sheet">
              <div className="sheet-head">
                <Dialog.Title className="sheet-title">Menu</Dialog.Title>
                <Dialog.Close className="tb-btn" aria-label="Close menu">
                  <X size={22} aria-hidden="true" />
                </Dialog.Close>
              </div>
              <nav aria-label="All pages" className="sheet-nav">
                {sections.map((s) => (
                  <a key={s.id} href={sectionHref(s.id)} onClick={(e) => { setOpen(false); jump(e, s.id); }}>
                    {s.label}
                  </a>
                ))}
              </nav>
              <div className="sheet-tools">
                <a href="#/timer" onClick={() => setOpen(false)}>Floor timer</a>
                <a href="#/portal" onClick={() => setOpen(false)}>Delegate portal</a>
                <a href="#/chair" onClick={() => setOpen(false)}>Chair portal</a>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      {home && <span ref={progress} className="topbar-progress" aria-hidden="true" />}
    </header>
  );
}
