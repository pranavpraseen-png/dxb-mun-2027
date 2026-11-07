// NAME: Numbered section index
// IDEA: The bar carries the page's table of contents as 01–07, an orange progress rule under it marks where you are and where each section starts.
// WHY: Chunking and a visible map: people see how long the page is and how far they have read, so one more section never feels endless.
// WILD: The progress rule becomes a scrubber: drag along it to fly through the page, the section number snapping as you pass each tick.
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { conference } from '@/data/conference';
import { getLenis, scrollToSection } from '@/shared/scroll';
import { NAV_H, SECTIONS } from '../layout';
import { portal, register, signIn } from '../links';
import { Doodle } from './doodle';
import './nav-b.css';

const LINKS = SECTIONS.filter((s) => s.id !== 'home');
const pad2 = (n: number) => String(n).padStart(2, '0');
const PHONE_MAX = 860;

/** The section under the reading line, the page progress (0–1) and where each section starts on that rule. */
function useReading() {
  const [active, setActive] = useState('');
  const [ticks, setTicks] = useState<{ id: string; at: number }[]>([]);
  const fill = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const t: { id: string; at: number }[] = [];
      for (const s of LINKS) {
        const el = document.getElementById(s.id);
        if (el) t.push({ id: s.id, at: Math.min(1, Math.max(0, (el.getBoundingClientRect().top + scrollY - NAV_H) / max)) });
      }
      setTicks(t);
    };
    const check = () => {
      raf = 0;
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      if (fill.current) fill.current.style.transform = `scaleX(${Math.min(1, scrollY / max)})`;
      const line = NAV_H + innerHeight * 0.3;
      let cur = '';
      for (const s of LINKS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) cur = s.id;
      }
      if (cur && innerHeight + scrollY >= document.documentElement.scrollHeight - 2) cur = LINKS[LINKS.length - 1].id;
      setActive(cur);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(check); };
    const onResize = () => { measure(); on(); };
    measure(); check();
    const ro = new ResizeObserver(onResize);
    ro.observe(document.body);
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', onResize);
    return () => { ro.disconnect(); removeEventListener('scroll', on); removeEventListener('resize', onResize); cancelAnimationFrame(raf); };
  }, []);
  return { active, ticks, fill };
}

const Arrow = () => (
  <svg className="navb-arrow" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M4 12 12 4M6 4h6v6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
  </svg>
);

export function NavB({ visible, demo = false }: { visible: boolean; demo?: boolean }) {
  const { active, ticks, fill } = useReading();
  const [open, setOpen] = useState(false);
  const pending = useRef<string | null>(null);
  const bar = useRef<HTMLElement>(null);
  const [box, setBox] = useState<HTMLElement | null>(null);
  const idx = LINKS.findIndex((s) => s.id === active);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    if (demo) setBox(el.parentElement);
    const ro = new ResizeObserver(() => { if (el.clientWidth > PHONE_MAX) setOpen(false); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [demo]);

  useEffect(() => {
    if (demo) return;
    const l = getLenis();
    if (open) l?.stop(); else l?.start();
  }, [open, demo]);

  const jump = (id: string) => { scrollToSection(id, NAV_H); history.replaceState(null, '', '#' + id); };
  const go = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (open) { pending.current = id; setOpen(false); return; }
    jump(id);
  };
  const closed = (isOpen: boolean) => {
    if (isOpen || !pending.current) return;
    const id = pending.current;
    pending.current = null;
    getLenis()?.start();
    requestAnimationFrame(() => jump(id));
  };

  return (
    <header ref={bar} className={'navb' + (visible ? ' is-in' : '') + (demo ? ' is-demo' : '')}
      aria-hidden={visible ? undefined : 'true'} inert={!visible}>
      <div className="navb-in">
        <a className="navb-home" href="#home" onClick={go('home')} aria-label={conference.edition + ', back to the top'}>
          <Doodle visible={visible} />
        </a>
        <span className="navb-seal" title={'Hosted by ' + conference.host} aria-label={'Hosted by ' + conference.host}>IHS</span>

        <nav className="navb-index" aria-label="Sections">
          <ol>
            {LINKS.map((s, i) => (
              <li key={s.id}>
                <a href={'#' + s.id} onClick={go(s.id)} aria-current={active === s.id ? 'location' : undefined}
                  className={idx > i ? 'is-read' : undefined}>
                  <span className="navb-n">{pad2(i + 1)}</span>
                  <span className="navb-l">{s.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <a className="navb-portal" href={portal}>Portal <Arrow /></a>

        <Dialog.Root open={open} onOpenChange={setOpen} onOpenChangeComplete={closed} modal={demo ? 'trap-focus' : true}>
          <Dialog.Trigger className="navb-menu-btn" aria-label="Open the section index">
            <span className="navb-where" aria-hidden="true">
              <b>{idx >= 0 ? pad2(idx + 1) : '00'}</b> / {pad2(LINKS.length)}
            </span>
            <span className="navb-menu-word">Index</span>
          </Dialog.Trigger>
          <Dialog.Portal container={demo ? box : undefined}>
            <Dialog.Popup className={'navb-menu' + (demo ? ' is-demo' : '')}>
              <div className="navb-menu-top">
                <span className="navb-home"><b>DXB MUN</b><span>27</span></span>
                <Dialog.Close className="navb-menu-btn navb-close" aria-label="Close the section index">
                  <span className="navb-menu-word">Close</span>
                </Dialog.Close>
              </div>
              <Dialog.Title className="navb-sr">Section index</Dialog.Title>
              <nav aria-label="Sections">
                <ol className="navb-menu-list">
                  {LINKS.map((s, i) => (
                    <li key={s.id}>
                      <a href={'#' + s.id} onClick={go(s.id)} aria-current={active === s.id ? 'location' : undefined}>
                        <span className="navb-menu-n">{pad2(i + 1)}</span>
                        <span className="navb-menu-l">{s.label}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
              <div className="navb-menu-foot">
                <a className="navb-btn navb-btn--un" href={register}>Register</a>
                <a className="navb-btn navb-btn--line" href={signIn}>Sign in</a>
                <a className="navb-menu-portal" href={portal}>Portal <Arrow /></a>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <div className="navb-rule" aria-hidden="true">
        <span className="navb-fill" ref={fill} />
        {ticks.map((t) => <i key={t.id} style={{ left: t.at * 100 + '%' }} />)}
      </div>
    </header>
  );
}
