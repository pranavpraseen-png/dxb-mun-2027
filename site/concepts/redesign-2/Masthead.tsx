import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { conference } from '@/data/conference';
import { type View } from '@/shared/hooks';
import { getLenis, scrollToSection } from '@/shared/scroll';
import { HostMark, NAV_H, ROMAN, SECTIONS, Wordmark } from './ui';
import { register, signIn } from './links';
// Library components (coss ui, read-only imports from the dashboard's copy; see LIBRARY.md).
import { Button } from '../../portal/ui/coss/button';
import { Sheet, SheetClose, SheetPopup, SheetTitle, SheetTrigger } from '../../portal/ui/coss/sheet';

/** coss Button themed for the masthead: Geist capitals, wide tracking, small and precise. */
const BTN = 'h-10 sm:h-10 px-4 text-[13px] sm:text-[13px] font-semibold tracking-[0.14em] rounded-[2px]';
export const JUMP_KEY = 'r2-jump';

// Scroll-spy: the section whose top has passed 40% of the screen is the current one.
function useActive(enabled: boolean, bar: React.RefObject<HTMLSpanElement | null>) {
  const [active, setActive] = useState<string | null>(null);
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    if (!enabled) { setActive(null); setSolid(true); return; }
    let raf = 0;
    const measure = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      const line = innerHeight * 0.4;
      let cur: string | null = null;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) cur = s.id;
      }
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = SECTIONS[SECTIONS.length - 1].id;
      setActive(cur);
      setSolid(scrollY > 24);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', on);
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, [enabled, bar]);
  return { active, solid };
}

export function Masthead({ view }: { view: View }) {
  const home = view === 'home';
  const [open, setOpen] = useState(false);
  const progress = useRef<HTMLSpanElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const { active, solid } = useActive(home, progress);

  // The sliding index mark under the current section (transform only).
  useLayoutEffect(() => {
    const nav = navRef.current, mark = markRef.current;
    if (!nav || !mark) return;
    const place = () => {
      const id = view === 'timer' ? 'timer' : active;
      const a = id ? nav.querySelector<HTMLElement>(`a[data-id="${id}"]`) : null;
      if (!a) { mark.style.opacity = '0'; return; }
      mark.style.opacity = '1';
      mark.style.transform = `translateX(${a.offsetLeft}px) scaleX(${a.offsetWidth / 100})`;
    };
    place();
    addEventListener('resize', place);
    return () => removeEventListener('resize', place);
  }, [active, view]);

  const go = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setOpen(false);
    if (home) requestAnimationFrame(() => scrollToSection(id, NAV_H));
    else { try { sessionStorage.setItem(JUMP_KEY, id); } catch { /* ignore */ } location.hash = '#/'; }
  };
  const toTop = (e: React.MouseEvent) => {
    if (!home) return;
    e.preventDefault();
    const l = getLenis();
    if (l) l.scrollTo(0, { duration: 1.4 }); else scrollTo({ top: 0 });
  };

  return (
    <header className={clsx('mast', solid && 'is-solid')} data-view={view}>
      <a className="mast-brand" href="#/" onClick={toTop} aria-label="DXB MUN, back to the start">
        <Wordmark />
        <span className="mast-ed" aria-hidden="true">{conference.year}</span>
      </a>

      <nav ref={navRef} className="mast-nav" aria-label="Sections">
        {SECTIONS.map((s, i) => (
          <a key={s.id} data-id={s.id} href={home ? `#${s.id}` : '#/'} onClick={(e) => go(e, s.id)}
            className={clsx(active === s.id && 'is-on')} aria-current={active === s.id ? 'location' : undefined}>
            <span className="mast-n" aria-hidden="true">{ROMAN[i]}</span>{s.label}
          </a>
        ))}
        <a href="#/timer" data-id="timer" className={clsx(view === 'timer' && 'is-on')} aria-current={view === 'timer' ? 'page' : undefined}>
          <span className="mast-n" aria-hidden="true">{ROMAN[SECTIONS.length]}</span>Timer
        </a>
        <span ref={markRef} className="mast-mark" aria-hidden="true" />
      </nav>

      <div className="mast-act">
        <Button variant="outline" className={clsx(BTN, 'mast-signin')} render={<a href={signIn} />}>Sign in</Button>
        <Button className={BTN} render={<a href={register} />}>Register</Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="outline" className={clsx(BTN, 'mast-index')} aria-label="Open the index" />}>
            Index
          </SheetTrigger>
          <SheetPopup side="right" showCloseButton={false} className="toc w-full max-w-none border-s-0">
            <div className="toc-head">
              <SheetTitle className="toc-title">Index</SheetTitle>
              <SheetClose render={<Button variant="outline" className={BTN} />}>Close</SheetClose>
            </div>
            <nav aria-label="All sections" className="toc-nav">
              {SECTIONS.map((s, i) => (
                <a key={s.id} href={home ? `#${s.id}` : '#/'} onClick={(e) => go(e, s.id)}>
                  <span className="toc-n">{ROMAN[i]}</span><span className="toc-l">{s.label}</span>
                </a>
              ))}
              <a href="#/timer" onClick={() => setOpen(false)}>
                <span className="toc-n">{ROMAN[SECTIONS.length]}</span><span className="toc-l">Floor timer</span>
              </a>
            </nav>
            <div className="toc-tools">
              <Button size="xl" className="rounded-[2px]" render={<a href={signIn} />}>Sign in</Button>
              <Button size="xl" variant="outline" className="rounded-[2px]" render={<a href={register} />}>Register</Button>
              <p className="toc-note">Delegates, advisors and chairs sign in to the delegate dashboard.</p>
            </div>
            <HostMark host={conference.host} city={conference.city} className="host-mark--toc" />
          </SheetPopup>
        </Sheet>
      </div>
      {home && <span ref={progress} className="mast-progress" aria-hidden="true" />}
    </header>
  );
}
