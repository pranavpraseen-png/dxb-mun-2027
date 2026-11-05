// Every word on the page comes from src/data/conference.ts. Nothing here is a new fact:
// these are the same facts re-cut as clauses, nav labels and ruler positions.
import { committees, conference, schedule, stats, tba, type Slot } from '@/data/conference';

export { committees, conference, schedule, stats, tba };

/** Dubai (public geography), as the brief specifies. */
export const DUBAI = { lat: 25.2, lon: 55.27 } as const;
export const COORDS = '25.20° N 55.27° E';

/* ------------------------------------------------------------------ navigation */
export type SectionId = 'top' | 'about' | 'committees' | 'schedule' | 'register' | 'wellness' | 'resources' | 'contact';
export const NAV: { id: SectionId; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'committees', label: 'Committees' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'register', label: 'Pass' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'resources', label: 'Resources' },
  { id: 'contact', label: 'Contact' },
];
export const SECTION_LABEL: Record<SectionId, string> = {
  top: 'Dubai',
  about: 'About',
  committees: 'Committees',
  schedule: 'Schedule',
  register: 'Pass',
  wellness: 'Wellness',
  resources: 'Resources',
  contact: 'Contact',
};
export const navNo = (id: SectionId) => {
  const i = NAV.findIndex((n) => n.id === id);
  return i < 0 ? '00' : String(i + 1).padStart(2, '0');
};

/* ------------------------------------------------------------------ the resolution: one clause per screen */
export type Clause = { verb: string; rest: string };
const firstC = committees[0], lastC = committees[committees.length - 1];
export const CLAUSES: Clause[] = [
  { verb: 'Hosted by', rest: `${conference.host}, in ${conference.city}.` },
  { verb: 'Guided by', rest: `one motto: ${conference.motto}.` },
  { verb: 'Convenes', rest: `${committees.length} committees, from ${firstC.abbr} to ${lastC.abbr}.` },
  { verb: 'Meets for', rest: `${stats[1].value} days and ${stats[2].value} committee sessions.` },
  { verb: 'Notes', rest: `that dates and venue are ${tba(conference.dates).toLowerCase()}.` },
];

/* ------------------------------------------------------------------ committees: two-tone nameplates */
export type Tone = 'cream' | 'sand';
// Dropbox's rule: every tile is exactly two tones, a fill and its own dark ink. The pattern is fixed, not data:
// a cream/sand checkerboard on the 5-column wall (the head takes cell 0). Orange is kept for hover and focus only.
const TONES: Tone[] = committees.map((_, i) => ((Math.floor((i + 1) / 5) + ((i + 1) % 5)) % 2 ? 'sand' : 'cream'));
export const PLATES = committees.map((c, i) => ({ ...c, no: String(i + 1).padStart(2, '0'), tone: TONES[i % TONES.length] }));

/* ------------------------------------------------------------------ schedule on a ruler */
const toMin = (t: string) => {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return 0;
  let h = +m[1] % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + +m[2];
};
const durMin = (d: string) => {
  const h = d.match(/(\d+)\s*hour/);
  const mm = d.match(/(\d+)\s*minute/);
  return (h ? +h[1] * 60 : 0) + (mm ? +mm[1] : 0);
};
export type Kind = 'session' | 'ceremony' | 'logistics' | 'break';
export const kindOf = (name: string): Kind =>
  /Committee Session/.test(name) ? 'session'
    : /Ceremony/.test(name) ? 'ceremony'
      : /Break|Lunch|Socials|Dispersal/.test(name) ? 'break' : 'logistics';

/** The ruler shows each day from 09:00 to 19:30 (the earliest start and the latest dispersal in the schedule). */
export const DAY_START = 9 * 60;
export const DAY_END = 19 * 60 + 30;
export const DAY_SPAN = DAY_END - DAY_START;
/** Gap between days on the ruler, in minutes of ruler length. */
export const DAY_GAP = 90;

export type RulerSlot = Slot & { day: number; kind: Kind; start: number; end: number; x0: number; x1: number; idx: number };
let idx = 0;
export const RULER: RulerSlot[] = schedule.flatMap((d, di) =>
  d.slots.map((s) => {
    const [a, b] = s.time.split('–').map((x) => x.trim());
    const start = toMin(a);
    const end = b ? toMin(b) : start + durMin(s.duration);
    const off = di * (DAY_SPAN + DAY_GAP) - DAY_START;
    return { ...s, day: d.day, kind: kindOf(s.name), start, end, x0: off + start, x1: off + end, idx: idx++ };
  }),
);
export const RULER_LEN = schedule.length * DAY_SPAN + (schedule.length - 1) * DAY_GAP;
export const dayX = (di: number) => di * (DAY_SPAN + DAY_GAP);
export const hh = (m: number) => String(Math.floor(m / 60)).padStart(2, '0');
