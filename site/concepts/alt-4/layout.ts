// Shared layout constants for Alt 4 · The Floor.
export const NAV_H = 64;
export const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'committees', label: 'Committees' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'register', label: 'Register' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'resources', label: 'Resources' },
  { id: 'contact', label: 'Contact' },
] as const;
export type SectionId = (typeof SECTIONS)[number]['id'];
