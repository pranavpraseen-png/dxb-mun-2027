// The control bar: ON AIR tally + wordmark, the numbered channels (every section), the Dubai clock and Sign in.
// Channel clicks go through the WEIMA colour-block wipe. Below 1100px the channels move into a coss Sheet ("Rundown").
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Menu as MenuIcon, X } from 'lucide-react';
import clsx from 'clsx';
import { conference } from '@/data/conference';
import { type View } from '@/shared/hooks';
import { channels } from './data';
import { BAR_H, DubaiClock, Wordmark } from './ui';
import { wipeTo } from './Wipe';
import { register, signIn } from './links';
// Library: coss ui (read-only imports from the dashboard's copy; see LIBRARY.md).
import { Button } from '../../portal/ui/coss/button';
import { Sheet, SheetClose, SheetPopup, SheetTitle, SheetTrigger } from '../../portal/ui/coss/sheet';

// After a channel click the clicked channel stays lit until the reader scrolls away from where it landed
// (Timer, Wellness and Resources share one row, so the plain scroll-spy alone cannot tell them apart).
const pin: { id: string | null; y: number; t: number } = { id: null, y: 0, t: 0 };

function useActive(enabled: boolean, bar: React.RefObject<HTMLSpanElement | null>) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) { setActive(null); return; }
    let raf = 0;
    const measure = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
      const line = innerHeight * 0.4;
      let cur: string | null = null;
      for (const c of channels) {
        const el = document.getElementById(c.id);
        if (el && el.getBoundingClientRect().top <= line) cur = c.id;
      }
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = channels[channels.length - 1].id;
      if (pin.id && (performance.now() - pin.t < 1600 || Math.abs(scrollY - pin.y) < 160)) cur = pin.id === 'home' ? null : pin.id;
      else pin.id = null;
      setActive(cur);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', on);
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, [enabled, bar]);
  return active;
}

export function Bar({ view, still }: { view: View; still: boolean }) {
  const home = view === 'home';
  const [open, setOpen] = useState(false);
  const progress = useRef<HTMLSpanElement>(null);
  const active = useActive(home, progress);

  const go = (e: React.MouseEvent, id: string) => {
    if (!home) return; // from the timer view the plain href (#/) brings you back home
    e.preventDefault();
    setOpen(false);
    const el = document.getElementById(id);
    pin.id = id;
    pin.t = performance.now();
    pin.y = id === 'home' || !el ? 0 : Math.min(el.getBoundingClientRect().top + scrollY - BAR_H, document.documentElement.scrollHeight - innerHeight);
    requestAnimationFrame(() => wipeTo(id));
  };

  return (
    <header className="bar" data-view={view}>
      <a className="bar-brand" href="#/" aria-label={`${conference.name}, back to the start`} onClick={(e) => go(e, 'home')}>
        <span className="tally" aria-hidden="true"><i />On air</span>
        <Wordmark />
      </a>

      <nav className="bar-nav" aria-label="Sections">
        {channels.map((c) => {
          const on = active === c.id;
          return (
            <a key={c.id} href={home ? `#${c.id}` : '#/'} onClick={(e) => go(e, c.id)} className={clsx('bar-ch', on && 'is-on')} aria-current={on ? 'location' : undefined}>
              <span className="bar-ch-n">{c.ch}</span>
              <span className="bar-ch-l">{c.label}</span>
              {on && <motion.span layoutId={still ? undefined : 'bar-under'} className="bar-under" transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }} aria-hidden="true" />}
            </a>
          );
        })}
      </nav>

      <div className="bar-end">
        <DubaiClock className="bar-clock" />
        <Button size="sm" className="bar-btn" render={<a href={signIn} />}>Sign in</Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="outline" size="icon" className="bar-menu" aria-label="Open the rundown (all sections)" />}>
            <MenuIcon className="size-[22px]" aria-hidden="true" />
          </SheetTrigger>
          <SheetPopup side="right" showCloseButton={false} className="rsheet w-full max-w-[440px] border-s-0">
            <div className="rsheet-head">
              <SheetTitle className="rsheet-title">Rundown</SheetTitle>
              <SheetClose render={<Button variant="outline" size="icon" aria-label="Close" />}><X aria-hidden="true" /></SheetClose>
            </div>
            <nav aria-label="All sections" className="rsheet-nav">
              <a href="#/" onClick={(e) => go(e, 'home')}><span>00</span>Home</a>
              {channels.map((c) => (
                <a key={c.id} href={home ? `#${c.id}` : '#/'} onClick={(e) => go(e, c.id)} className={clsx(active === c.id && 'is-on')}>
                  <span>{c.ch}</span>{c.label}
                </a>
              ))}
            </nav>
            <div className="rsheet-tools">
              <Button size="lg" render={<a href={register} />}>Register</Button>
              <Button size="lg" variant="outline" render={<a href={signIn} />}>Sign in</Button>
              <Button size="lg" variant="outline" render={<a href="#/timer" onClick={() => setOpen(false)} />}>Floor timer</Button>
            </div>
            <p className="rsheet-host"><i aria-hidden="true" />Hosted by {conference.host}, {conference.city}</p>
          </SheetPopup>
        </Sheet>
      </div>
      {home && <span ref={progress} className="bar-progress" aria-hidden="true" />}
    </header>
  );
}
