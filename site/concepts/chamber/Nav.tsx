import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Menu } from '@base-ui/react/menu';
import { Dialog } from '@base-ui/react/dialog';
import { ChevronDown, Menu as MenuIcon, X } from 'lucide-react';
import clsx from 'clsx';
import type { View } from '@/shared/hooks';
import { viewHref } from '@/shared/hooks';
import { Wordmark } from './Wordmark';
import { scrollToSection } from './motion';

const sections = [
  { id: 'about', label: 'About' },
  { id: 'committees', label: 'Committees' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'resources', label: 'Resources' },
  { id: 'contact', label: 'Contact' },
];

function useSpy(enabled: boolean) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    const top = () => {
      if (window.scrollY < window.innerHeight * 0.6) setActive(null);
      else if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) setActive('contact');
    };
    window.addEventListener('scroll', top, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('scroll', top); };
  }, [enabled]);
  return active;
}

/** Thin UN-blue line along the nav's bottom edge: how much of the page is left. */
function useProgress() {
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, []);
  return bar;
}

export function Nav({ view }: { view: View }) {
  const active = useSpy(view === 'home');
  const [open, setOpen] = useState(false);
  const bar = useProgress();

  const goSection = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    if (view !== 'home') {
      location.hash = '#/';
      setTimeout(() => scrollToSection(id), 80);
    } else {
      // Let the dialog close before scrolling on phones.
      setTimeout(() => scrollToSection(id), open ? 60 : 0);
    }
  };

  return (
    <header className="nav" data-view={view}>
      <span className="nav-progress" aria-hidden="true"><i ref={bar} /></span>
      <a className="nav-mark" href="#/" aria-label="DXB MUN home" onClick={view === 'home' ? goSection('home') : undefined}>
        <Wordmark />
      </a>

      <nav className="nav-links" aria-label="Main">
        {sections.map((s) => (
          <a key={s.id} href={'#' + s.id} className={clsx('nav-link', active === s.id && 'is-on')} aria-current={active === s.id ? 'true' : undefined} onClick={goSection(s.id)}>
            {s.label}
          </a>
        ))}
        <span className="nav-sep" aria-hidden="true" />
        <a href={viewHref('timer')} className="nav-link">Timer</a>
        <Menu.Root>
          <Menu.Trigger className={clsx('nav-link nav-portal', (view === 'portal' || view === 'chair') && 'is-on')}>
            Portal <ChevronDown size={16} aria-hidden="true" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={10} align="end" className="menu-pos">
              <Menu.Popup className="menu">
                <Menu.LinkItem className="menu-item" href={viewHref('portal')}>
                  <span className="menu-t">Delegate portal</span>
                  <span className="menu-d">Send and read chits</span>
                </Menu.LinkItem>
                <Menu.LinkItem className="menu-item" href={viewHref('chair')}>
                  <span className="menu-t">Chair portal</span>
                  <span className="menu-d">Approve chits, keep the log</span>
                </Menu.LinkItem>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </nav>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger className="nav-burger" aria-label="Open menu">
          <MenuIcon size={22} aria-hidden="true" />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className="sheet-back" />
          <Dialog.Popup className="sheet">
            <div className="sheet-top">
              <Dialog.Title className="sheet-title">Menu</Dialog.Title>
              <Dialog.Close className="nav-burger is-close" aria-label="Close menu">
                <X size={22} aria-hidden="true" />
              </Dialog.Close>
            </div>
            <nav aria-label="Main" className="sheet-nav">
              {sections.map((s) => (
                <a key={s.id} href={'#' + s.id} className="sheet-link" onClick={goSection(s.id)}>{s.label}</a>
              ))}
            </nav>
            <div className="sheet-tools">
              <a href={viewHref('timer')} className="sheet-tool" onClick={() => setOpen(false)}>Floor timer</a>
              <a href={viewHref('portal')} className="sheet-tool" onClick={() => setOpen(false)}>Delegate portal</a>
              <a href={viewHref('chair')} className="sheet-tool" onClick={() => setOpen(false)}>Chair portal</a>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}
