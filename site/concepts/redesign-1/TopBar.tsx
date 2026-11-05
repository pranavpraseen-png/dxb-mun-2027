import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Menu as MenuIcon } from 'lucide-react';
import clsx from 'clsx';
import { conference } from '@/data/conference';
import { BAR_H, NAV, activeAt, flyTo } from './nav';
import { STOPS, useUI } from './store';
import { Wordmark } from './ui';
import { register, signIn } from './links';
// Library components (coss ui, read-only imports from the dashboard's copy; see LIBRARY.md).
import { Button } from '../../portal/ui/coss/button';
import { Menu, MenuLinkItem, MenuPopup, MenuTrigger } from '../../portal/ui/coss/menu';
import { Sheet, SheetClose, SheetPopup, SheetTitle, SheetTrigger } from '../../portal/ui/coss/sheet';

const two = (n: number) => String(n).padStart(2, '0');

export function TopBar() {
  const [open, setOpen] = useState(false);
  const stop = useUI((u) => u.stop);
  const lit = activeAt(stop);
  const go = (e: React.MouseEvent, s: number, id: string) => {
    e.preventDefault();
    setOpen(false);
    requestAnimationFrame(() => flyTo(s, id));
  };

  return (
    <header className="bar" style={{ height: BAR_H }}>
      <a className="bar-brand" href="#home" aria-label="DXB MUN, back to the opening" onClick={(e) => go(e, 0, 'home')}>
        <Wordmark />
      </a>
      <p className="bar-cam" aria-live="off">
        <span className="bar-tally" aria-hidden="true" />
        <span className="bar-cam-k">Cam {two(stop + 1)}</span>
        <span className="bar-cam-v">{STOPS[stop].cam}</span>
      </p>

      <nav className="bar-nav" aria-label="Sections">
        {NAV.map((n, k) => {
          const on = n.stop === lit;
          return (
            <a key={n.id} href={'#' + n.id} onClick={(e) => go(e, n.stop, n.id)} className={clsx(on && 'is-on')} aria-current={on ? 'location' : undefined}>
              <span className="bar-no">{two(k + 1)}</span>
              {n.label}
              {on && <motion.span layoutId="bar-ul" className="bar-ul" transition={{ type: 'spring', stiffness: 380, damping: 34 }} />}
            </a>
          );
        })}
      </nav>

      <div className="bar-actions">
        <Menu>
          <MenuTrigger render={<Button className="group bar-btn" />}>
            Portal <ChevronDown aria-hidden="true" className="transition-transform duration-200 group-data-[popup-open]:rotate-180" />
          </MenuTrigger>
          <MenuPopup align="end" sideOffset={6} className="z-[120] min-w-[280px]">
            <MenuLinkItem href={signIn} className="group/item flex-col items-start gap-0 px-3 py-2.5 data-highlighted:bg-primary data-highlighted:text-primary-foreground sm:text-base">
              <span className="menu-k">Sign in</span>
              <span className="menu-d group-data-highlighted/item:text-primary-foreground">Delegates, advisors and chairs</span>
            </MenuLinkItem>
            <MenuLinkItem href={register} className="group/item flex-col items-start gap-0 px-3 py-2.5 data-highlighted:bg-primary data-highlighted:text-primary-foreground sm:text-base">
              <span className="menu-k">Register</span>
              <span className="menu-d group-data-highlighted/item:text-primary-foreground">Sign in, then apply to {conference.edition}</span>
            </MenuLinkItem>
          </MenuPopup>
        </Menu>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="outline" size="icon" className="bar-menu" aria-label="Open menu" />}>
            <MenuIcon className="size-[22px]" aria-hidden="true" />
          </SheetTrigger>
          <SheetPopup side="right" showCloseButton={false} className="sheet w-full max-w-none border-s-0">
            <div className="sheet-head">
              <SheetTitle className="sheet-title">Camera stops</SheetTitle>
              <SheetClose render={<Button variant="outline" className="bar-btn" />}>Close</SheetClose>
            </div>
            <nav aria-label="All sections" className="sheet-nav">
              {NAV.map((n, k) => (
                <a key={n.id} href={'#' + n.id} onClick={(e) => go(e, n.stop, n.id)} className={clsx(n.stop === lit && 'is-on')}>
                  <span className="bar-no">{two(k + 1)}</span>{n.label}
                </a>
              ))}
            </nav>
            <div className="sheet-tools">
              <Button size="xl" render={<a href={signIn} />}>Sign in</Button>
              <Button size="xl" variant="outline" render={<a href={register} />}>Register</Button>
              <p className="sheet-note">Delegates, advisors and chairs sign in to the delegate dashboard.</p>
            </div>
          </SheetPopup>
        </Sheet>
      </div>
      <span id="top-progress" className="bar-progress" aria-hidden="true" />
    </header>
  );
}
