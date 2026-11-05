import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu as MenuIcon } from 'lucide-react';
import clsx from 'clsx';
import { conference, nav } from '@/data/conference';
import { viewHref, type View } from '@/shared/hooks';
import { getLenis, scrollToSection } from '@/shared/scroll';
import { HostMark, NAV_H, Wordmark } from './ui';
import { chair, register, signIn } from './links';
// Library components (coss ui, read-only imports from the dashboard's copy; see LIBRARY.md).
import { Button } from '../../portal/ui/coss/button';
import { Menu, MenuLinkItem, MenuPopup, MenuTrigger } from '../../portal/ui/coss/menu';
import { Sheet, SheetClose, SheetPopup, SheetTitle, SheetTrigger } from '../../portal/ui/coss/sheet';

// Shared theming for the coss Buttons in the bar: Archivo capitals, tracked, at the bar's size.
const barBtn = 'text-[15px] tracking-[0.1em]';

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
        // A section can name a different element as its scroll-spy trigger (the pinned opening does).
        const el = document.querySelector(`[data-spy="${s.id}"]`) ?? document.getElementById(s.id);
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
        </nav>
      )}

      <div className="topbar-actions">
        {home && <Button variant="outline" className={clsx(barBtn, 'tb-timer')} render={<a href={viewHref('timer')} />}>Timer</Button>}
        <Menu>
          <MenuTrigger render={<Button className={clsx(barBtn, 'group')} />}>
            Portal <ChevronDown aria-hidden="true" className="transition-transform duration-200 group-data-[popup-open]:rotate-180" />
          </MenuTrigger>
          <MenuPopup align="end" sideOffset={6} className="min-w-[280px] z-[120]">
            <MenuLinkItem href={signIn} className="flex-col items-start gap-0 px-3 py-2.5 sm:text-base data-highlighted:bg-primary data-highlighted:text-primary-foreground group/item">
              <span className="font-display text-[24px] font-bold leading-[1.1]">Sign in</span>
              <span className="text-base text-g5 group-data-highlighted/item:text-ink">Delegates, advisors and chairs</span>
            </MenuLinkItem>
            <MenuLinkItem href={register} className="flex-col items-start gap-0 px-3 py-2.5 sm:text-base data-highlighted:bg-primary data-highlighted:text-primary-foreground group/item">
              <span className="font-display text-[24px] font-bold leading-[1.1]">Register</span>
              <span className="text-base text-g5 group-data-highlighted/item:text-ink">Sign in, then apply to {conference.edition}</span>
            </MenuLinkItem>
            <MenuLinkItem href={chair} className="flex-col items-start gap-0 px-3 py-2.5 sm:text-base data-highlighted:bg-primary data-highlighted:text-primary-foreground group/item">
              <span className="font-display text-[24px] font-bold leading-[1.1]">Chair</span>
              <span className="text-base text-g5 group-data-highlighted/item:text-ink">Chair dashboard</span>
            </MenuLinkItem>
          </MenuPopup>
        </Menu>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="outline" size="icon" className="tb-menu" aria-label="Open menu" />}>
            <MenuIcon className="size-[22px]" aria-hidden="true" />
          </SheetTrigger>
          <SheetPopup side="right" showCloseButton={false} className="sheet w-full max-w-none border-s-0">
            <div className="sheet-head">
              <SheetTitle className="sheet-title">Menu</SheetTitle>
              <SheetClose render={<Button variant="outline" className={barBtn} />}>Close</SheetClose>
            </div>
            <nav aria-label="All pages" className="sheet-nav">
              {sections.map((s) => (
                <a key={s.id} href={sectionHref(s.id)} onClick={(e) => { setOpen(false); jump(e, s.id); }}>
                  {s.label}
                </a>
              ))}
            </nav>
            <div className="sheet-tools">
              <Button size="xl" render={<a href={signIn} />}>Sign in</Button>
              <Button size="xl" variant="outline" render={<a href={register} />}>Register</Button>
              <Button size="xl" variant="outline" render={<a href="#/timer" onClick={() => setOpen(false)} />}>Floor timer</Button>
              <p className="sheet-note">Delegates, advisors and chairs sign in to the delegate dashboard.</p>
            </div>
            <HostMark host={conference.host} city={conference.city} className="host-mark--sheet" />
          </SheetPopup>
        </Sheet>
      </div>
      {home && <span ref={progress} className="topbar-progress" aria-hidden="true" />}
    </header>
  );
}
