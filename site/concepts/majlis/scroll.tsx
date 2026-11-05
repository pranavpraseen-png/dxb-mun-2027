import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { scrollToSection as sharedScrollTo } from '@/shared/scroll';

export const HEADER = 64;

// When a section link is used from another view, remember it and scroll once home mounts.
export const pending: { id: string | null } = { id: null };

/** Shared scroll feel (Lenis via @/shared/scroll), plus focus moved to the section heading. */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  sharedScrollTo(id, HEADER);
  const target = el.querySelector<HTMLElement>('h2, h1') ?? el;
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

/** An in-page link (#about etc.) that also works from the timer and portal views. */
export function SectionLink({ to, onNavigate, ...rest }: { to: string; onNavigate?: () => void } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    onNavigate?.();
    const onHome = !location.hash.startsWith('#/') || location.hash === '#/';
    if (onHome && document.getElementById(to)) scrollToSection(to);
    else { pending.id = to; location.hash = '#/'; }
  };
  return <a href={'#' + to} onClick={onClick} {...rest} />;
}
