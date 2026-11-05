import { useEffect, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { conference } from '@/data/conference';
import { getLenis, scrollToSection } from '@/shared/scroll';
import { NAV_H } from './motion';
import { NAV, stubFor } from './sections';
import { register } from './links';

/*
  Navigation (BLUEPRINT section 4).
  Desktop: one thin solid cream bar, a hairline under it, every section numbered in mono caps; the current one is
  struck through in maroon (Lando). At the right, the ticket stub: "Register →" plus a stub that shows the
  section in view, live (Siena).
  Phone: a MENU pill opens a full-screen solid cream sheet (Base UI Dialog) with big caps items (Lando, Oryzo).
*/
function Stub({ current }: { current: string }) {
  const s = stubFor(current);
  return (
    <a className="stub" href={register} data-cursor="link" aria-label="Register (opens the delegate dashboard)">
      <span className="stub-main">Register →</span>
      <span className="stub-side" aria-hidden="true">
        <span key={current} className="stub-live"><b>{s.n}</b><small>{s.label}</small></span>
      </span>
    </a>
  );
}

export function Nav({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    // wait a frame so the sheet's scroll lock is released before the smooth scroll starts
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToSection(id, NAV_H)));
  };
  useEffect(() => { const l = getLenis(); if (open) l?.stop(); else l?.start(); }, [open]);

  return (
    <header className="nav">
      <a id="nav-logo" className="logo" href="#home" onClick={go('home')} data-cursor="link">{conference.edition}</a>
      <nav className="nav-items" aria-label="Sections">
        {NAV.map((s) => (
          <a key={s.id} href={'#' + s.id} onClick={go(s.id)} aria-current={current === s.id ? 'true' : undefined} data-cursor="link">
            <span className="n">{s.n}</span> {s.label}
          </a>
        ))}
      </nav>
      <Stub current={current} />

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger className="menu-pill">Menu</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup className="menu">
            <div className="menu-top">
              <span className="logo">{conference.edition}</span>
              <Dialog.Close className="menu-pill">Close</Dialog.Close>
            </div>
            <Dialog.Title className="sr-only">Sections</Dialog.Title>
            <nav className="menu-items" aria-label="Sections">
              {NAV.map((s) => (
                <a key={s.id} href={'#' + s.id} onClick={go(s.id)} aria-current={current === s.id ? 'true' : undefined}>
                  <span className="k">{s.n}</span><b>{s.label}</b>
                </a>
              ))}
            </nav>
            <div className="menu-foot">
              <a className="btn btn--ink" href={register}>Register →</a>
              <span className="k">Hosted by {conference.host}</span>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}
