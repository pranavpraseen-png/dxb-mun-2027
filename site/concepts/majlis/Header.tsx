import { useEffect, useRef, useState } from 'react';
import { Menu } from '@base-ui/react/menu';
import { Dialog } from '@base-ui/react/dialog';
import { ChevronDown, Menu as MenuIcon, X } from 'lucide-react';
import { brand } from '@/shared/brand';
import type { View } from '@/shared/hooks';
import { SectionLink } from './scroll';

const sections = [
  { id: 'about', label: 'About' },
  { id: 'committees', label: 'Committees' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'resources', label: 'Resources' },
  { id: 'contact', label: 'Contact' },
];

export function Wordmark({ className }: { className?: string }) {
  if (brand.logoSrc) return <img className={className} src={brand.logoSrc} alt={brand.logoAlt} height={32} />;
  return <span className={'wordmark ' + (className ?? '')}>{brand.wordmark}</span>;
}

export function Header({ view }: { view: View }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const bar = useRef<HTMLSpanElement>(null);

  // Thin progress line: how much of the page is left.
  useEffect(() => {
    let raf = 0;
    const set = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    };
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(set); };
    set();
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', on);
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, [view]);

  // Highlight the section in view (home only). The band sits just under the header.
  useEffect(() => {
    if (view !== 'home') { setCurrent(null); return; }
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setCurrent(hit.target.id);
      else if (scrollY < innerHeight * 0.5) setCurrent(null);
    }, { rootMargin: '-80px 0px -60% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [view]);
  return (
    <header className="hdr">
      <div className="hdr-in">
        <SectionLink to="home" className="hdr-brand" aria-label="DXB MUN, back to the top of the home page">
          <Wordmark />
        </SectionLink>

        <nav className="hdr-nav" aria-label="Main">
          <ul>
            {sections.map((s) => (
              <li key={s.id}>
                <SectionLink to={s.id} className={'hdr-link' + (current === s.id ? ' is-active' : '')} aria-current={current === s.id ? 'location' : undefined}>{s.label}</SectionLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hdr-tools">
          <a href="#/timer" className="hdr-link hdr-timer" aria-current={view === 'timer' ? 'page' : undefined}>Timer</a>
          <Menu.Root>
            <Menu.Trigger className="hdr-portal" aria-current={view === 'portal' || view === 'chair' ? 'page' : undefined}>
              Portal <ChevronDown size={16} aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner sideOffset={10} align="end" className="menu-pos">
                <Menu.Popup className="menu-pop">
                  <Menu.LinkItem href="#/portal" className="menu-item">
                    <span className="menu-t">Delegate portal</span>
                    <span className="menu-d">Send and receive chits</span>
                  </Menu.LinkItem>
                  <Menu.LinkItem href="#/chair" className="menu-item">
                    <span className="menu-t">Chair portal</span>
                    <span className="menu-d">Approve chits for your committee</span>
                  </Menu.LinkItem>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger className="hdr-menu" aria-label="Open menu"><MenuIcon size={22} aria-hidden="true" /></Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className="sheet-bg" />
              <Dialog.Popup className="sheet">
                <div className="sheet-top">
                  <Dialog.Title className="sheet-title">Menu</Dialog.Title>
                  <Dialog.Close className="hdr-menu" aria-label="Close menu"><X size={22} aria-hidden="true" /></Dialog.Close>
                </div>
                <nav aria-label="Menu">
                  <ul className="sheet-list">
                    <li><SectionLink to="home" onNavigate={() => setOpen(false)}>Home</SectionLink></li>
                    {sections.map((s) => (
                      <li key={s.id}><SectionLink to={s.id} onNavigate={() => setOpen(false)}>{s.label}</SectionLink></li>
                    ))}
                  </ul>
                  <ul className="sheet-tools">
                    <li><a href="#/timer" onClick={() => setOpen(false)}>Floor timer</a></li>
                    <li><a href="#/portal" onClick={() => setOpen(false)}>Delegate portal</a></li>
                    <li><a href="#/chair" onClick={() => setOpen(false)}>Chair portal</a></li>
                  </ul>
                </nav>
                <p className="sheet-ar" lang="ar" dir="rtl">نموذج الأمم المتحدة</p>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
      <div className="hdr-progress" aria-hidden="true"><span ref={bar} /></div>
    </header>
  );
}
