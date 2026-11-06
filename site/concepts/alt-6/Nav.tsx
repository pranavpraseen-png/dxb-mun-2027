// Fixed ink bar: every cable one click away, the current one inverted. Phones get a full-screen menu that prints in.
import { useEffect, useRef, useState } from 'react';
import { CABLES, type CableId } from './content';
import { NAV_H, Type } from './ui';
import { getLenis, scrollToSection } from '@/shared/scroll';
import { signIn } from './links';

export function Nav({ active, shown }: { active: CableId | null; shown: boolean }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    getLenis()?.stop();
    document.documentElement.classList.add('menu-open');
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    addEventListener('keydown', onKey);
    return () => {
      getLenis()?.start();
      document.documentElement.classList.remove('menu-open');
      removeEventListener('keydown', onKey);
      btn.current?.focus();
    };
  }, [open]);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    requestAnimationFrame(() => scrollToSection(id, NAV_H));
    history.replaceState(null, '', '#' + id);
  };

  return (
    <>
      <header className={'nav' + (shown ? ' is-on' : '')}>
        <a className="nav-mark" href="#home" onClick={go('home')} aria-label="DXB MUN 2027, top">
          <span className="nm-t">DXB MUN</span>
          <span className="nm-y">27</span>
          <span className="host-mark" title="Hosted by Indian High School">IHS</span>
        </a>
        <nav aria-label="Sections" className="nav-list">
          <ul>
            {CABLES.map((c) => (
              <li key={c.id}>
                <a href={'#' + c.id} onClick={go(c.id)} aria-current={active === c.id ? 'true' : undefined} className={active === c.id ? 'is-active' : undefined}>
                  <span className="nl-n">{c.n}</span> {c.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <a className="nav-sign" href={signIn}>Sign in</a>
        <button ref={btn} type="button" className="nav-menu" aria-expanded={open} aria-controls="menu" onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Menu'}
        </button>
      </header>

      <div id="menu" className={'menu' + (open ? ' is-open' : '')} role="dialog" aria-modal="true" aria-label="Sections" hidden={!open}>
        <p className="menu-k">ZCZC · INDEX OF CABLES</p>
        <ol className="menu-list">
          {CABLES.map((c, i) => (
            <li key={c.id}>
              <a href={'#' + c.id} onClick={go(c.id)} className={active === c.id ? 'is-active' : undefined} aria-current={active === c.id ? 'true' : undefined}>
                <span className="ml-n">{c.n}</span>
                <span className="ml-t"><Type text={c.label.toUpperCase()} run={open} delay={0.04 * i} cps={60} /></span>
              </a>
            </li>
          ))}
        </ol>
        <div className="menu-foot">
          <a className="btn btn-paper" href={signIn}>Sign in</a>
          <p>Hosted by Indian High School · Dubai</p>
          <p className="menu-k">NNNN</p>
        </div>
      </div>
    </>
  );
}
