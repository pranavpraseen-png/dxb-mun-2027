// Alt 4 · The Floor: the top nav (version A). Hidden until the gavel (visible), then it slides down once.
// Opaque ground + one hairline. Every section in one click, the one in view is marked. Phones: a full-screen menu.
// The bar's layout responds to its own width (container queries), so it also works framed on a design board:
// with `demo`, it sits absolutely inside its parent and the phone menu opens inside that parent box.
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { conference } from '@/data/conference';
import { getLenis, scrollToSection } from '@/shared/scroll';
import { NAV_H, SECTIONS } from './layout';
import { portal, register, signIn } from './links';

const LINKS = SECTIONS.filter((s) => s.id !== 'home');
const PHONE_MAX = 860;

/** Which section is under the reading line (30% down, below the nav). '' while the hero is in view. */
function useActiveSection() {
  const [active, setActive] = useState('');
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const line = NAV_H + innerHeight * 0.3;
      let cur = '';
      for (const s of LINKS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) cur = s.id;
      }
      // The last short sections can never reach the line: at the very bottom, the last one wins.
      if (cur && innerHeight + scrollY >= document.documentElement.scrollHeight - 2) cur = LINKS[LINKS.length - 1].id;
      setActive(cur);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', on);
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
  return active;
}

/** The host mark: a small maroon seal and the host's name. */
export function HostMark({ short = false }: { short?: boolean }) {
  return (
    <span className="f-host" title={'Hosted by ' + conference.host}>
      <span className="f-host-seal" aria-hidden="true">IHS</span>
      {!short && <span className="f-host-text">Hosted by {conference.host}</span>}
    </span>
  );
}

function Wordmark() {
  return (
    <span className="f-word">
      <b>DXB MUN</b> <span>27</span>
    </span>
  );
}

export const Arrow = () => (
  <svg className="f-arrow" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4 12 12 4M6 4h6v6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
  </svg>
);

export function NavA({ visible, demo = false }: { visible: boolean; demo?: boolean }) {
  const active = useActiveSection();
  const [open, setOpen] = useState(false);
  const pending = useRef<string | null>(null);
  const bar = useRef<HTMLElement>(null);
  const [box, setBox] = useState<HTMLElement | null>(null);

  // Demo: the menu portals into the nav's parent. Both modes: close the menu if the bar grows past phone width.
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    if (demo) setBox(el.parentElement);
    const ro = new ResizeObserver(() => { if (el.clientWidth > PHONE_MAX) setOpen(false); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [demo]);

  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // keep Lenis's own anchor handler out of it: scrollToSection uses the nav offset
    if (open) { pending.current = id; setOpen(false); return; } // scroll after the menu has closed and unlocked
    scrollToSection(id, NAV_H);
    history.replaceState(null, '', '#' + id);
  };
  const closed = (isOpen: boolean) => {
    if (isOpen || !pending.current) return;
    const id = pending.current;
    pending.current = null;
    getLenis()?.start();
    requestAnimationFrame(() => { scrollToSection(id, NAV_H); history.replaceState(null, '', '#' + id); });
  };
  useEffect(() => {
    if (demo) return;
    const l = getLenis();
    if (open) l?.stop(); else l?.start();
  }, [open, demo]);

  return (
    <header ref={bar} className={'f-nav' + (visible ? ' is-in' : '') + (demo ? ' is-demo' : '')}
      aria-hidden={visible ? undefined : 'true'} inert={!visible}>
      <div className="f-nav-in">
        <a className="f-nav-home" href="#home" onClick={go('home')} aria-label={conference.edition + ', back to the top'}>
          <Wordmark />
        </a>
        <span className="f-nav-sep" aria-hidden="true" />
        <HostMark />

        <nav className="f-nav-links" aria-label="Sections">
          {LINKS.map((s) => (
            <a key={s.id} href={'#' + s.id} onClick={go(s.id)} aria-current={active === s.id ? 'location' : undefined}>
              {s.label}
            </a>
          ))}
          <a className="f-nav-portal" href={portal}>Portal <Arrow /></a>
        </nav>

        <Dialog.Root open={open} onOpenChange={setOpen} onOpenChangeComplete={closed} modal={demo ? 'trap-focus' : true}>
          <Dialog.Trigger className="f-menu-btn" aria-label="Open the menu">
            <span>Menu</span><i aria-hidden="true" />
          </Dialog.Trigger>
          <Dialog.Portal container={demo ? box : undefined}>
            <Dialog.Popup className={'f-menu' + (demo ? ' is-demo' : '')}>
              <div className="f-menu-top">
                <Wordmark />
                <Dialog.Close className="f-menu-btn f-menu-close" aria-label="Close the menu">
                  <span>Close</span><i aria-hidden="true" />
                </Dialog.Close>
              </div>
              <Dialog.Title className="f-sr">Sections</Dialog.Title>
              <nav className="f-menu-links" aria-label="Sections">
                {LINKS.map((s, i) => (
                  <a key={s.id} href={'#' + s.id} onClick={go(s.id)} aria-current={active === s.id ? 'location' : undefined}>
                    <span className="f-menu-n">{String(i + 1).padStart(2, '0')}</span>
                    {s.label}
                  </a>
                ))}
              </nav>
              <div className="f-menu-foot">
                <div className="f-menu-ctas">
                  <a className="f-btn f-btn--un" href={register}>Register</a>
                  <a className="f-btn f-btn--line" href={signIn}>Sign in</a>
                </div>
                <a className="f-menu-portal" href={portal}>Portal <Arrow /></a>
                <HostMark />
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </header>
  );
}

/** The contract name used by main.tsx. */
export const Nav = NavA;
