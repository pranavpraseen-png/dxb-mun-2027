// Everything the page says, derived from the shared data. No new facts: unknowns go through tba().
import { committees, conference, resources, schedule, stats, tba } from '@/data/conference';

/** Dubai's coordinates (geography, not a conference fact), as on the other builds. */
export const DUBAI_LABEL = '25.2048° N · 55.2708° E';

export const TBA = 'To be announced';

/** The seven cables, in nav order. */
export const CABLES = [
  { id: 'about', n: '01', label: 'About', subj: 'The conference' },
  { id: 'committees', n: '02', label: 'Committees', subj: 'Nineteen files' },
  { id: 'schedule', n: '03', label: 'Schedule', subj: 'Three days' },
  { id: 'register', n: '04', label: 'Register', subj: 'Credentials' },
  { id: 'wellness', n: '05', label: 'Wellness', subj: 'Welfare' },
  { id: 'resources', n: '06', label: 'Resources', subj: 'Annexes' },
  { id: 'contact', n: '07', label: 'Contact', subj: 'Reply to' },
] as const;
export type CableId = (typeof CABLES)[number]['id'];

const up = (s: string) => s.toUpperCase();

/** The teleprinter header, printed by the shader. Lines stay ≤ 27 characters so they fit a 390 px phone. */
export const LOADER_LINES = [
  'ZCZC',
  `FROM: ${up(conference.name)} SECRETARIAT`,
  'TO: ALL DELEGATIONS',
  'PRIORITY: IMMEDIATE',
  `SUBJ: ${up(conference.edition)}`,
  `HOST: ${up(conference.host)}`,
  `CITY: ${up(conference.city)}`,
  `DATES: ${up(tba(conference.dates))}`,
  'NNNN',
];

export const facts = {
  edition: conference.edition,
  kind: conference.kind,
  city: conference.city,
  host: conference.host,
  motto: conference.motto,
  dates: conference.dates,
  venue: conference.venue,
  email: conference.email,
  instagram: conference.instagram,
  registerUrl: conference.registerUrl,
};

export const statLines = stats.filter((s) => s.label !== 'Dubai').map((s) => ({ value: String(s.value), label: s.label }));

export { committees, schedule, resources, tba };
