import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Menu } from '@base-ui/react/menu';
import { Dialog } from '@base-ui/react/dialog';
import { ChevronDown, Menu as MenuIcon, X } from 'lucide-react';
import { brand } from '@/shared/brand';
import { viewHref, type View } from '@/shared/hooks';
import { scrollToSection } from '@/shared/scroll';

/** Height the fixed top bar takes, so section jumps land just below it. */
export const NAV_H = 64;

/** In-page links go through the shared scroll so jumps match the page's scroll feel. */
export const jump = (id: string) => (e: MouseEvent) => {
  if (!document.getElementById(id)) return;
  e.preventDefault();
  scrollToSection(id, id === 'home' ? 0 : NAV_H);
};
import { useDubaiTime } from './clock';

export function Wordmark({ compact = false }: { compact?: boolean }) {
  if (brand.logoSrc) return <img src={brand.logoSrc} alt={brand.logoAlt} className="wm-img" />;
  return (
    <span className={'wm' + (compact ? ' wm-c' : '')}>
      <span className="wm-dot" aria-hidden="true" />
      {brand.wordmark}
    </span>
  );
}

export function DubaiClock({ label = true }: { label?: boolean }) {
  const t = useDubaiTime();
  return (
    <span className="clock mono" title="Local time in Dubai (GST, UTC+4)">
      {label && <span className="clock-l">Dubai</span>}
      <time dateTime={t.iso} aria-label={`Dubai time ${t.hh}:${t.mm}`}>
        {t.hh}<span className="clock-c">:</span>{t.mm}<span className="clock-c">:</span><span className="clock-s">{t.ss}</span>
      </time>
      <span className="clock-z">GST</span>
    </span>
  );
}

const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'committees', label: 'Committees' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'resources', label: 'Resources' },
  { id: 'contact', label: 'Contact' },
];

/** Links to in-page sections only work on the home view; elsewhere they go home first. */
const sectionHref = (view: View, id: string) => (view === 'home' ? '#' + id : '#/');

/** Scroll-spy: the section whose box crosses the upper third of the viewport is the current one. */
function useActiveSection(on: boolean) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!on) return;
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setActive(hit.target.id);
    }, { rootMargin: '-30% 0px -65% 0px' });
    els.forEach((el) => io.observe(el));
    const onTop = () => { if (scrollY < innerHeight * 0.5) setActive(null); };
    addEventListener('scroll', onTop, { passive: true });
    return () => { io.disconnect(); removeEventListener('scroll', onTop); };
  }, [on]);
  return active;
}

export function Topbar({ view }: { view: View }) {
  const [open, setOpen] = useState(false);
  const active = useActiveSection(view === 'home');
  const barRef = useRef<HTMLSpanElement>(null);
  // Thin UN-blue progress line along the bottom of the bar.
  useEffect(() => {
    let raf = 0;
    const set = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (barRef.current) barRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0})`;
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(set); };
    set();
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', on);
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
  return (
    <header className="top">
      <div className="top-in">
        <a href="#/" className="top-brand" aria-label="DXB MUN home">
          <Wordmark />
        </a>
        <nav className="top-nav" aria-label="Main">
          {view === 'home' && SECTIONS.map((s) => (
            <a key={s.id} href={'#' + s.id} onClick={jump(s.id)} className={'top-link' + (active === s.id ? ' is-on' : '')} aria-current={active === s.id ? 'location' : undefined}>{s.label}</a>
          ))}
          {view !== 'home' && <a href="#/" className="top-link">Website</a>}
          <span className="top-sep" aria-hidden="true" />
          <a href={viewHref('timer')} className={'top-link' + (view === 'timer' ? ' is-on' : '')} aria-current={view === 'timer' ? 'page' : undefined}>Timer</a>
          <Menu.Root>
            <Menu.Trigger className={'top-link top-menu' + (view === 'portal' || view === 'chair' ? ' is-on' : '')}>
              Portal <ChevronDown size={14} aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner sideOffset={8} align="end" className="menu-pos">
                <Menu.Popup className="menu">
                  <Menu.LinkItem href={viewHref('portal')} className="menu-item" closeOnClick>
                    <span>Delegate portal</span><span className="mono dim">Chits, inbox</span>
                  </Menu.LinkItem>
                  <Menu.LinkItem href={viewHref('chair')} className="menu-item" closeOnClick>
                    <span>Chair portal</span><span className="mono dim">Approvals</span>
                  </Menu.LinkItem>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </nav>
        <DubaiClock />
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger className="top-burger" aria-label="Open menu">
            <MenuIcon size={20} aria-hidden="true" />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="sheet-bg" />
            <Dialog.Popup className="sheet">
              <div className="sheet-head">
                <Dialog.Title className="sheet-title"><Wordmark /></Dialog.Title>
                <Dialog.Close className="top-burger" aria-label="Close menu"><X size={20} aria-hidden="true" /></Dialog.Close>
              </div>
              <nav aria-label="Main" className="sheet-nav">
                <a href="#/" onClick={() => setOpen(false)} className="sheet-link">Home</a>
                {SECTIONS.map((s) => (
                  <a
                    key={s.id} href={sectionHref(view, s.id)} className="sheet-link"
                    onClick={(e) => {
                      setOpen(false);
                      if (view !== 'home') return;
                      e.preventDefault();
                      setTimeout(() => scrollToSection(s.id, NAV_H), 60); // after the dialog releases its scroll lock
                    }}
                  >{s.label}</a>
                ))}
                <p className="mono dim sheet-group">Tools</p>
                <a href={viewHref('timer')} onClick={() => setOpen(false)} className="sheet-link">Floor timer</a>
                <a href={viewHref('portal')} onClick={() => setOpen(false)} className="sheet-link">Delegate portal</a>
                <a href={viewHref('chair')} onClick={() => setOpen(false)} className="sheet-link">Chair portal</a>
              </nav>
              <div className="sheet-foot"><DubaiClock /></div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <span className="top-progress" aria-hidden="true"><span ref={barRef} /></span>
    </header>
  );
}
