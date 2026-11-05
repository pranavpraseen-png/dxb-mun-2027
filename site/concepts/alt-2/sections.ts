// The full top nav: every section, numbered in mono caps (BLUEPRINT section 4).
// The delegate pass (Register) is not numbered: it is the ticket stub at the right of the nav.
export const NAV = [
  { id: 'about', n: '01', label: 'About' },
  { id: 'committees', n: '02', label: 'Committees' },
  { id: 'schedule', n: '03', label: 'Schedule' },
  { id: 'wellness', n: '04', label: 'Wellness' },
  { id: 'resources', n: '05', label: 'Resources' },
  { id: 'contact', n: '06', label: 'Contact' },
] as const;

export const WATCHED = ['about', 'committees', 'schedule', 'register', 'wellness', 'resources', 'contact'];

/** What the live ticket stub shows for the section in view. */
export function stubFor(id: string): { n: string; label: string } {
  if (id === 'register') return { n: '→', label: 'Your pass' };
  const hit = NAV.find((s) => s.id === id);
  return hit ? { n: hit.n, label: hit.label } : { n: '00', label: 'Home' };
}
