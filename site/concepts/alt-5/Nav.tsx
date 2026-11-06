// Top nav: solid black. Every motion in one click; the one on the floor is a solid signal block.
// Phone: Register + Menu; the menu is a full-screen black sheet with huge kinetic items that stretch in.
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { conference } from '@/data/conference';
import { getLenis } from '@/shared/scroll';
import { MOTIONS, NAV, jumpTo, useFloor } from './floor';
import { KLine } from './KLine';
import { register, signIn } from './links';

export function HostMark() {
  return <span className="host-mark" title={'Hosted by ' + conference.host}>IHS</span>;
}

export function Nav() {
  const { active } = useFloor();
  const [open, setOpen] = useState(false);
  const pending = useRef<string | null>(null);
  const current = MOTIONS[active].id;
  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // keep Lenis's own anchor handling out of it: jumpTo scrolls with the shared offset
    if (open) { pending.current = id; setOpen(false); return; } // scroll once the menu has closed and unlocked
    jumpTo(id);
  };
  const closed = (isOpen: boolean) => {
    if (isOpen || !pending.current) return;
    const id = pending.current;
    pending.current = null;
    getLenis()?.start();
    requestAnimationFrame(() => jumpTo(id));
  };
  useEffect(() => { const l = getLenis(); if (open) l?.stop(); else l?.start(); }, [open]);

  return (
    <header className="nav">
      <a className="logo" href="#home" onClick={go('home')} aria-label={conference.edition + ', back to the top'}>
        <b>DXB MUN</b><span>27</span>
      </a>
      <HostMark />
      <nav className="nav-items" aria-label="Sections">
        {NAV.map((s) => (
          <a key={s.id} href={'#' + s.id} onClick={go(s.id)} aria-current={current === s.id ? 'true' : undefined}>
            <span className="n">M{s.n}</span>{s.label}
          </a>
        ))}
      </nav>
      <a className="nav-reg" href={register}>Register</a>

      <Dialog.Root open={open} onOpenChange={setOpen} onOpenChangeComplete={closed}>
        <Dialog.Trigger className="menu-btn">Menu</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Popup className="menu">
            <div className="menu-top">
              <span className="logo"><b>DXB MUN</b><span>27</span></span>
              <Dialog.Close className="menu-btn">Close</Dialog.Close>
            </div>
            <Dialog.Title className="sr">Sections</Dialog.Title>
            <nav className="menu-items" aria-label="Sections">
              {NAV.map((s, i) => (
                <a key={s.id} href={'#' + s.id} onClick={go(s.id)} aria-current={current === s.id ? 'true' : undefined}>
                  <span className="n">M{s.n}</span>
                  <KLine text={s.label.toUpperCase()} className="menu-k" stretchFrom={0.2 + i * 0.04} opts={{ mode: 'fit', weight: 800, wave: 0, bMax: 125 }} />
                </a>
              ))}
            </nav>
            <div className="menu-foot">
              <a className="btn btn--signal" href={register}>Register</a>
              <a className="btn btn--paper" href={signIn}>Sign in</a>
              <span className="mono">Hosted by {conference.host} · {conference.city}</span>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}
