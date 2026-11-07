// Morph: Material-style "container transform" for Alt 4 · The Floor.
// A trigger (a button, a card, a word in the roll call) grows into a panel and the panel shrinks back into it.
// How: the panel is laid out by CSS at its final place, then measured; the container's box (left, top, width,
// height, corner radius, background, border colour) is tweened from the trigger's box with the Web Animations API.
// Real box tweening (not a scale transform) keeps borders, radii and text undistorted, and works with the fixed
// panel and Lenis. The trigger's own face (a clone) fades out in the first quarter; the panel's content fades and
// rises in only over the last ~45% ("fade through"). Closing runs the same path back into the trigger, even if the
// trigger changed while open (`from` may change). Esc, the close button and the scrim close it; focus moves in and
// back; Tab is trapped; page scroll (Lenis + html) is locked; the rest of the page is inert. Phones (<= 640 px):
// a full-screen sheet. `html.still` / reduced motion: a short fade, no morph.
// Exports: MorphSheet (the engine), CommitteesMorphButton (a ready button that opens every committee).
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { committees, tba } from '@/data/conference';
import { getLenis, scrollToSection } from '@/shared/scroll';
import { isStill } from '@/shared/hooks';
import { NAV_H } from '../layout';
import './morph.css';

const EASE = 'cubic-bezier(0.2, 0, 0, 1)'; // Material 3 "emphasized"
const OPEN_MS = 380;
const CLOSE_MS = 320;
const FADE_MS = 140; // still mode
const pad2 = (n: number) => String(n).padStart(2, '0');
const still = () => isStill() || document.documentElement.classList.contains('still');
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

type Box = { left: number; top: number; width: number; height: number };
type Look = { background: string; border: string; radius: string; borderWidth: number };
const boxOf = (el: Element): Box => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };
const px = (b: Box) => ({ left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px' });
const opaque = (c: string) => !/rgba\(.*,\s*0\)$|transparent/.test(c);
function lookOf(el: Element, fallbackBg: string): Look {
  const cs = getComputedStyle(el);
  const bg = opaque(cs.backgroundColor) ? cs.backgroundColor : fallbackBg;
  const bw = parseFloat(cs.borderTopWidth) || 0;
  return { background: bg, border: bw && opaque(cs.borderTopColor) ? cs.borderTopColor : bg, radius: cs.borderTopLeftRadius, borderWidth: bw };
}

/** A copy of the trigger's face (its label), styled from its computed text styles so it reads the same inside the box. */
function faceOf(el: HTMLElement): HTMLElement {
  const cs = getComputedStyle(el);
  const f = el.cloneNode(true) as HTMLElement;
  f.removeAttribute('id'); f.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  f.className = 'mph-face';
  f.setAttribute('aria-hidden', 'true');
  const keep = ['font-family', 'font-size', 'font-weight', 'font-stretch', 'font-style', 'font-variation-settings', 'line-height', 'letter-spacing',
    'text-transform', 'text-align', 'color', 'display', 'align-items', 'justify-content', 'gap', 'padding-top', 'padding-right', 'padding-bottom',
    'padding-left', 'white-space', 'box-sizing', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-style'];
  for (const k of keep) f.style.setProperty(k, cs.getPropertyValue(k));
  f.style.borderColor = 'transparent';
  f.style.visibility = 'visible'; // the trigger itself is hidden while the sheet stands in for it
  const r = el.getBoundingClientRect(); // fractional, so the label never re-wraps
  f.style.boxSizing = 'border-box';
  f.style.width = r.width + 'px';
  f.style.height = r.height + 'px';
  return f;
}

export type MorphSheetProps = {
  /** Open or closed. The sheet animates both ways and stays mounted until the close animation ends. */
  open: boolean;
  /** Called on Esc, the close button or a scrim click. Set `open` to false in it. */
  onClose: () => void;
  /** The element the panel grows out of and shrinks back into. Read at open and again at close, so it may change while open. */
  from: HTMLElement | null;
  /** Where focus goes after closing. Defaults to `from`. */
  returnFocus?: HTMLElement | null;
  /** Accessible name of the dialog (used when `labelledBy` is not given). */
  label?: string;
  /** Id of the heading inside the panel that names the dialog. */
  labelledBy?: string;
  /** Mono label at the top left of the panel bar. */
  kicker?: ReactNode;
  /** Panel width on desktop. wide = 960, narrow = 720. Phones are always full-screen. */
  size?: 'wide' | 'narrow';
  /** Extra class on the panel box. */
  className?: string;
  /** Pinned below the scrolling body (actions). */
  footer?: ReactNode;
  /** After the close animation has finished and focus has returned. */
  onClosed?: () => void;
  children: ReactNode;
};

/** The container-transform sheet. Controlled: pass `open`, `onClose` and `from`. */
export function MorphSheet({ open, onClose, from, returnFocus, label, labelledBy, kicker, size = 'wide', className, footer, onClosed, children }: MorphSheetProps) {
  const [mounted, setMounted] = useState(open);
  const root = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const hidden = useRef<HTMLElement | null>(null); // the trigger we are standing in for
  const anims = useRef<Animation[]>([]);
  const face = useRef<HTMLElement | null>(null);
  const lastKids = useRef<ReactNode>(children);
  const lastFooter = useRef<ReactNode>(footer);
  const fromRef = useRef(from); if (from) fromRef.current = from; // remember the last trigger, so a close with `from` cleared still lands somewhere
  const focusRef = useRef(returnFocus); focusRef.current = returnFocus;
  const closedRef = useRef(onClosed); closedRef.current = onClosed;
  const after = useRef<{ to: HTMLElement | null } | null>(null); // focus target once the page is live again
  if (open) { lastKids.current = children; lastFooter.current = footer; } // keep showing the last content while it shrinks away

  if (open && !mounted) setMounted(true);

  const stopAll = () => { anims.current.forEach((a) => a.cancel()); anims.current = []; };
  const hide = (el: HTMLElement | null) => {
    if (hidden.current && hidden.current !== el) hidden.current.style.visibility = '';
    if (el) el.style.visibility = 'hidden';
    hidden.current = el;
  };

  // ---- page lock: scroll, Lenis, inert siblings. Lives exactly as long as the sheet is mounted.
  useLayoutEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    const prev = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter };
    html.style.overflow = 'hidden';
    // Only keep a gutter if there was a real scrollbar (desktop); phones and overlay scrollbars get the full width.
    if (innerWidth - html.clientWidth > 0) html.style.scrollbarGutter = 'stable';
    getLenis()?.stop();
    const inerted: Element[] = [];
    for (const el of Array.from(document.body.children)) {
      if (el === root.current || el.hasAttribute('inert') || el.tagName === 'SCRIPT') continue;
      el.setAttribute('inert', ''); inerted.push(el);
    }
    return () => {
      inerted.forEach((el) => el.removeAttribute('inert'));
      html.style.overflow = prev.overflow;
      html.style.scrollbarGutter = prev.gutter;
      getLenis()?.start();
      const a = after.current; after.current = null;
      if (a) { a.to?.focus({ preventScroll: true }); closedRef.current?.(); }
    };
  }, [mounted]);

  // Keys that land outside the box (a click on the panel's background drops focus to <body>) still reach the sheet.
  const keyRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  useEffect(() => { keyRef.current = onKey; });
  useEffect(() => {
    if (!mounted) return;
    const h = (e: KeyboardEvent) => { if (!root.current?.contains(e.target as Node)) keyRef.current?.(e); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [mounted]);

  // ---- open
  useLayoutEffect(() => {
    if (!open || !mounted) return;
    const b = box.current!, s = scrim.current!, inn = inner.current!;
    const trig = fromRef.current;
    stopAll();
    face.current?.remove(); face.current = null;
    b.style.cssText = ''; inn.style.cssText = ''; // a re-open mid-close starts from a clean layout
    closeBtn.current?.focus({ preventScroll: true });
    if (still() || !trig || !trig.isConnected) {
      hide(trig);
      anims.current = [s, b].map((el) => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: still() ? FADE_MS : 200, easing: 'linear' }));
      return;
    }
    const end = boxOf(b);
    const endLook = lookOf(b, getComputedStyle(b).backgroundColor);
    const start = boxOf(trig);
    const startLook = lookOf(trig, endLook.background);
    hide(trig);
    // Hold the content at its final size so nothing reflows while the box grows.
    inn.style.cssText = `position:absolute;left:0;top:0;width:${b.clientWidth}px;height:${b.clientHeight}px`;
    b.style.cssText = 'margin:0;right:auto;bottom:auto;max-height:none';
    const f = faceOf(trig);
    f.style.marginLeft = f.style.marginTop = -endLook.borderWidth + 'px';
    b.prepend(f); face.current = f;
    const opts = { duration: OPEN_MS, easing: EASE, fill: 'both' as const };
    const a = b.animate([{ ...px(start), borderRadius: startLook.radius }, { ...px(end), borderRadius: endLook.radius }], opts);
    const tint = b.animate([
      { backgroundColor: startLook.background, borderColor: startLook.border, easing: EASE },
      { backgroundColor: endLook.background, borderColor: endLook.border, offset: 0.25 },
      { backgroundColor: endLook.background, borderColor: endLook.border },
    ], { duration: OPEN_MS, easing: 'linear', fill: 'both' });
    anims.current = [
      a, tint,
      s.animate([{ opacity: 0 }, { opacity: 1, offset: 0.6 }, { opacity: 1 }], { duration: OPEN_MS, easing: 'linear', fill: 'both' }),
      f.animate([{ opacity: 1 }, { opacity: 0, offset: 0.25 }, { opacity: 0 }], { duration: OPEN_MS, easing: 'linear', fill: 'both' }),
      inn.animate([
        { opacity: 0, transform: 'translateY(12px)' },
        { opacity: 0, transform: 'translateY(12px)', offset: 0.55, easing: EASE },
        { opacity: 1, transform: 'none' },
      ], { duration: OPEN_MS, fill: 'both' }),
    ];
    a.finished.then(() => {
      stopAll(); f.remove(); face.current = null;
      b.style.cssText = ''; inn.style.cssText = '';
    }, () => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted]);

  // ---- a new trigger while open (e.g. next committee): it becomes the one we return to
  useEffect(() => { if (open && mounted && from) hide(from); }, [from, open, mounted]);

  // ---- close
  useLayoutEffect(() => {
    if (open || !mounted) return;
    const b = box.current!, s = scrim.current!, inn = inner.current!;
    const trig = fromRef.current && fromRef.current.isConnected ? fromRef.current : null;
    const done = () => {
      stopAll();
      face.current?.remove(); face.current = null;
      hide(null);
      after.current = { to: focusRef.current ?? trig };
      setMounted(false);
    };
    // Freeze where we are (mid-open is fine), then run the path back.
    const now = boxOf(b);
    const cs = getComputedStyle(b);
    const nowLook = { background: cs.backgroundColor, border: cs.borderTopColor, radius: cs.borderTopLeftRadius };
    const sOp = getComputedStyle(s).opacity, iOp = getComputedStyle(inn).opacity, iTf = getComputedStyle(inn).transform;
    const innW = b.clientWidth, innH = b.clientHeight, fixedInner = inn.style.position === 'absolute';
    const fOp = face.current ? getComputedStyle(face.current).opacity : '0';
    stopAll();
    if (still() || !trig) {
      anims.current = [s, b].map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: still() ? FADE_MS : 180, easing: 'linear', fill: 'both' }));
      anims.current[0].finished.then(done, () => {});
      return;
    }
    if (!fixedInner) inn.style.cssText = `position:absolute;left:0;top:0;width:${innW}px;height:${innH}px`;
    b.style.cssText = 'margin:0;right:auto;bottom:auto;max-height:none';
    const end = boxOf(trig);
    const bw = parseFloat(cs.borderTopWidth) || 0;
    const endLook = lookOf(trig, nowLook.background);
    let f = face.current;
    if (!f) { f = faceOf(trig); f.style.marginLeft = f.style.marginTop = -bw + 'px'; b.prepend(f); face.current = f; }
    const a = b.animate([{ ...px(now), borderRadius: nowLook.radius }, { ...px(end), borderRadius: endLook.radius }], { duration: CLOSE_MS, easing: EASE, fill: 'both' });
    const tint = b.animate([
      { backgroundColor: nowLook.background, borderColor: nowLook.border },
      { backgroundColor: nowLook.background, borderColor: nowLook.border, offset: 0.6 },
      { backgroundColor: endLook.background, borderColor: endLook.border },
    ], { duration: CLOSE_MS, easing: 'linear', fill: 'both' });
    anims.current = [
      a, tint,
      s.animate([{ opacity: sOp }, { opacity: 0 }], { duration: CLOSE_MS, easing: 'linear', fill: 'both' }),
      inn.animate([{ opacity: iOp, transform: iTf === 'none' ? 'none' : iTf }, { opacity: 0, transform: 'translateY(8px)', offset: 0.2 }, { opacity: 0 }], { duration: CLOSE_MS, easing: 'linear', fill: 'both' }),
      f.animate([{ opacity: fOp }, { opacity: fOp, offset: 0.4 }, { opacity: 1, offset: 0.8 }, { opacity: 1 }], { duration: CLOSE_MS, easing: 'linear', fill: 'both' }),
    ];
    a.finished.then(done, () => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted]);

  // ---- unmount safety: never leave a trigger hidden
  useEffect(() => () => { stopAll(); if (hidden.current) hidden.current.style.visibility = ''; }, []);

  const onKey = (e: ReactKeyboardEvent<HTMLDivElement> | KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); if (open) onClose(); return; }
    if (e.key !== 'Tab') return;
    if (!box.current!.contains(document.activeElement)) { e.preventDefault(); closeBtn.current?.focus(); return; }
    const items = Array.from(box.current!.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest('.mph-face') && el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  if (!mounted) return null;
  return createPortal(
    <div ref={root} className="mph" data-lenis-prevent="" data-state={open ? 'open' : 'closing'} onKeyDown={onKey}>
      <div ref={scrim} className="mph-scrim" onClick={() => open && onClose()} aria-hidden="true" />
      <div ref={box} className={'mph-box mph-' + size + (className ? ' ' + className : '')} role="dialog" aria-modal="true"
        aria-label={labelledBy ? undefined : label} aria-labelledby={labelledBy}>
        <div ref={inner} className="mph-inner">
          <div className="mph-bar">
            <span className="mph-kicker">{kicker}</span>
            <button ref={closeBtn} type="button" className="mph-close" onClick={() => open && onClose()} aria-label="Close">
              <span className="mph-close-k" aria-hidden="true">Esc</span>
              <span className="mph-close-l">Close</span>
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" fill="none" /></svg>
            </button>
          </div>
          <div className="mph-body">{open ? children : lastKids.current}</div>
          {(open ? footer : lastFooter.current) ? <div className="mph-foot">{open ? footer : lastFooter.current}</div> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** A ready button for the hero: it grows into a panel with every committee. Pass the hero's button classes. */
export function CommitteesMorphButton({ className, label }: { className?: string; label: string }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const after = useRef<(() => void) | null>(null);
  const hid = useId();
  const N = committees.length;
  const goToSection = () => {
    after.current = () => {
      scrollToSection('committees', NAV_H);
      document.getElementById('committees')?.querySelector<HTMLElement>('input,button,a[href]')?.focus({ preventScroll: true });
    };
    setOpen(false);
  };
  return (
    <>
      <button ref={btn} type="button" className={'mph-trigger' + (className ? ' ' + className : '')} aria-haspopup="dialog" aria-expanded={open}
        onClick={() => setOpen(true)}>
        {label}
      </button>
      <MorphSheet open={open} onClose={() => setOpen(false)} from={btn.current} labelledBy={hid} size="wide"
        kicker={<><b>Committees</b> · {N} on the floor</>}
        returnFocus={btn.current}
        onClosed={() => { const f = after.current; after.current = null; f?.(); }}
        footer={<>
          <p className="mph-note">Agendas: {tba(null).toLowerCase()}.</p>
          <button type="button" className="mph-act" onClick={goToSection}>Open the roll call <span aria-hidden="true">→</span></button>
        </>}>
        <h2 className="mph-h" id={hid}>All {N} committees.</h2>
        <ol className="mph-list">
          {committees.map((c, i) => (
            <li key={c.abbr} className="mph-row">
              <span className="mph-row-n">{pad2(i + 1)}</span>
              <span className="mph-row-a">{c.abbr}</span>
              <span className="mph-row-name">{c.name}</span>
            </li>
          ))}
        </ol>
      </MorphSheet>
    </>
  );
}
