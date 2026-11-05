// Section 4 of the blueprint: a solid top bar with every section numbered in mono caps, the ticket-stub
// Register top-right (Siena), and on phones a MENU pill that opens a full-screen solid overlay (Lando),
// with the current item struck through in orange. The overlay is a Base UI Dialog (focus trap, Esc, inert page).
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { conference } from '@/data/conference';
import { COORDS, NAV, navNo } from './data';
import { signIn } from './links';
import { BIG, EASE, UI, gsap, still } from './motion';
import { useSection } from './store';
import { NavStub } from './Stub';
import { go, useMedia } from './ui';

export function Nav() {
  const current = useSection();
  const phone = useMedia('(max-width: 1199px)');
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!phone) setOpen(false); }, [phone]);

  return (
    <header className="nav">
      <a
        id="nl-logo"
        className="logo"
        href="#top"
        onClick={(e) => { e.preventDefault(); go('top'); }}
      >
        {conference.edition}
      </a>
      {!phone && (
        <nav className="nav-links" aria-label="Sections">
          <ol>
            {NAV.map((n, i) => (
              <li key={n.id}>
                <a
                  href={'#' + n.id}
                  className={'nl' + (current === n.id ? ' is-on' : '')}
                  aria-current={current === n.id ? 'location' : undefined}
                  onClick={(e) => { e.preventDefault(); go(n.id); }}
                >
                  <span className="nl-no">{String(i + 1).padStart(2, '0')}</span>
                  <span className="nl-roll" data-t={n.label}><span>{n.label}</span></span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="nav-end">
        {!phone && <a className="nav-sign mono" href={signIn}>Sign in</a>}
        <NavStub current={current} className={phone ? 'stub--compact' : ''} />
        {phone && <MenuButton open={open} setOpen={setOpen} />}
      </div>
    </header>
  );
}

function MenuButton({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const current = useSection();
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (!open || still) return;
    const id = requestAnimationFrame(() => {
      const items = list.current?.querySelectorAll('.mi-t');
      if (items) gsap.fromTo(items, { yPercent: 110 }, { yPercent: 0, duration: BIG, stagger: 0.05, ease: EASE, delay: 0.15 });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);
  const pick = (id: string) => {
    setOpen(false);
    // wait for the overlay to close so the page is scrollable again
    window.setTimeout(() => go(id), still ? 0 : UI * 600);
  };
  return (
    <Dialog.Root open={open} onOpenChange={(o) => setOpen(o)}>
      <Dialog.Trigger className="menu-pill mono" aria-label="Open the menu">Menu</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Popup className="menu" aria-label="Sections">
          <div className="menu-top">
            <span className="logo">{conference.edition}</span>
            <Dialog.Close className="menu-pill menu-pill--on mono">Close</Dialog.Close>
          </div>
          <Dialog.Title className="sr">Sections</Dialog.Title>
          <nav aria-label="Sections">
            <ol className="menu-list" ref={list}>
              {NAV.map((n) => (
                <li key={n.id} className={'mi' + (current === n.id ? ' is-on' : '')}>
                  <a
                    href={'#' + n.id}
                    aria-current={current === n.id ? 'location' : undefined}
                    onClick={(e) => { e.preventDefault(); pick(n.id); }}
                  >
                    <span className="mi-no mono">{navNo(n.id)}</span>
                    <span className="mi-m"><span className="mi-t">{n.label}</span></span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="menu-foot">
            <NavStub current={current} className="stub--wide" />
            <div className="menu-meta">
              <a className="mono" href={signIn}>Sign in</a>
              <span className="mono">{COORDS}</span>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
