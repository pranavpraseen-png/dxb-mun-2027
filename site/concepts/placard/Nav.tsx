import { useEffect, useState } from 'react';
import { Menu } from '@base-ui/react/menu';
import { Dialog } from '@base-ui/react/dialog';
import { ChevronDown, Menu as MenuIcon, X } from 'lucide-react';
import { viewHref, type View } from '@/shared/hooks';
import { motion, useScroll } from 'motion/react';
import { scrollToSection } from '@/shared/scroll';
import { NAV_H, Wordmark } from './ui';

const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'committees', label: 'Committees' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'resources', label: 'Resources' },
  { id: 'contact', label: 'Contact' },
];

export function Nav({ view }: { view: View }) {
  const [open, setOpen] = useState(false);
  const onHome = view === 'home';
  const active = useActiveSection(onHome);
  // Section links only make sense on the homepage; elsewhere they route home first.
  const sectionHref = (id: string) => (onHome ? '#' + id : viewHref('home'));
  const { scrollYProgress } = useScroll();
  const goSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const fromSheet = open;
    setOpen(false);
    if (onHome) {
      // Let the menu release its scroll lock before scrolling.
      if (fromSheet) setTimeout(() => scrollToSection(id, NAV_H), 60);
      else scrollToSection(id, NAV_H);
      return;
    }
    location.hash = viewHref('home');
    setTimeout(() => scrollToSection(id, NAV_H), 150);
  };

  return (
    <header className={'nav' + (onHome ? ' nav--home' : ' nav--tool')}>
      <div className="nav__bar">
        <a className="nav__brand" href={onHome ? '#home' : viewHref('home')} aria-label="DXB MUN, home" onClick={onHome ? goSection('home') : undefined}>
          <Wordmark />
        </a>
        {(
          <nav className="nav__links" aria-label="Sections">
            {SECTIONS.map((s) => (
              <a key={s.id} href={sectionHref(s.id)} onClick={goSection(s.id)} aria-current={active === s.id ? 'location' : undefined}>
                {s.label}
              </a>
            ))}
          </nav>
        )}
        <div className="nav__tools">
          <a className={'nav__pill' + (view === 'timer' ? ' is-on' : '')} href={viewHref('timer')}>
            Timer
          </a>
          <Menu.Root>
            <Menu.Trigger className={'nav__pill nav__pill--menu' + (view === 'portal' || view === 'chair' ? ' is-on' : '')}>
              Portal <ChevronDown size={18} aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner sideOffset={10} align="end" className="menu-pos">
                <Menu.Popup className="menu">
                  <Menu.LinkItem closeOnClick className="menu__item" href={viewHref('portal')}>
                    <strong>Delegate</strong>
                    <span>Write and receive chits</span>
                  </Menu.LinkItem>
                  <Menu.LinkItem closeOnClick className="menu__item" href={viewHref('chair')}>
                    <strong>Chair</strong>
                    <span>Approve chits and run the room</span>
                  </Menu.LinkItem>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger className="nav__burger" aria-label="Open menu">
              <MenuIcon size={22} aria-hidden="true" />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className="sheet-backdrop" />
              <Dialog.Popup className="sheet">
                <div className="sheet__head">
                  <Dialog.Title className="sheet__title">Menu</Dialog.Title>
                  <Dialog.Close className="nav__burger nav__burger--close" aria-label="Close menu">
                    <X size={22} aria-hidden="true" />
                  </Dialog.Close>
                </div>
                <nav aria-label="All pages" className="sheet__links">
                  {SECTIONS.map((s) => (
                    <a key={s.id} href={sectionHref(s.id)} onClick={goSection(s.id)} aria-current={active === s.id ? 'location' : undefined}>
                      {s.label}
                    </a>
                  ))}
                </nav>
                <div className="sheet__tools">
                  <a className="tool-chip" href={viewHref('timer')} onClick={() => setOpen(false)}>Floor timer</a>
                  <a className="tool-chip" href={viewHref('portal')} onClick={() => setOpen(false)}>Delegate portal</a>
                  <a className="tool-chip" href={viewHref('chair')} onClick={() => setOpen(false)}>Chair portal</a>
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
      <motion.span className="nav__progress" style={{ scaleX: scrollYProgress }} aria-hidden="true" />
    </header>
  );
}

/* Highlights the section currently in the middle band of the viewport. */
function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) { setActive(null); return; }
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    const top = () => { if (scrollY < 200) setActive(null); };
    addEventListener('scroll', top, { passive: true });
    return () => { io.disconnect(); removeEventListener('scroll', top); };
  }, [enabled]);
  return active;
}
