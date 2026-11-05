// Demo seed: the SAMPLE world for each delegate scenario. Committees and schedule titles come from
// src/data/conference.ts; seats are real UN member state names (not a claim about the real council); people are
// "Sample …"; every room, date, deadline and schedule time is null ("To be announced"). Relative times are used
// only for activity that "just happened" (chits, votes, uploads).
import { committees as conferenceCommittees, schedule as conferenceSchedule } from '../../data/conference';
import type { ScheduleItem, Timer, VoteChoice } from './contract';
import type {
  AnnouncementRow, ChairRow, ChitRow, CommitteeRow, Counts, DemoScenario, DemoState, FileRow, LiveRow, NoteRow,
  NominationRow, PaperFileRow, ProfileRow, RegRow, ResolutionRow, RollRow, ScoreRow, SeatRow, SpeakerRow, VoteRow,
} from './demo-store';

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const inSeconds = (s: number) => new Date(Date.now() + s * 1000).toISOString();
const DAY = 60 * 24;

export const committeeId = (abbr: string) => `cmte-${abbr.toLowerCase()}`;
export const UNSC_ID = committeeId('UNSC');

// Fifteen real UN member states as sample UNSC seats. Not a claim about the real council's membership.
export const UNSC_SEATS = ['France', 'China', 'Russian Federation', 'United Kingdom', 'United States', 'Brazil', 'Egypt', 'Ghana',
  'India', 'Ireland', 'Japan', 'Kenya', 'Mexico', 'Norway', 'United Arab Emirates'];
export const seatId = (label: string) => `seat-unsc-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
const S = (label: string) => seatId(label);

/** The demo's sign-in emails (any other email works too; see demo-common.ts resolveProfileId). */
export const DEMO_EMAILS = {
  delegate: 'delegate1@demo.test',      // the scenario delegate (France); any unknown email is this person too
  otherDelegate: 'delegate2@demo.test', // delegate2 … delegate15 hold the other UNSC seats; 16 … 20 are unseated applicants
  chair: 'chair@demo.test',
  viceChair: 'vice.chair@demo.test',
  secretariat: 'admin@demo.test',
} as const;

export const SCHOOLS = ['Sample School A', 'Sample School B', 'Sample School C'];

export function defaultTimer(): Timer {
  return { kind: 'speech', label: null, durationSeconds: 60, running: false, endsAt: null, remainingSeconds: 60, speaker: null };
}

/** Yes / no / abstain from ballots (or the placard count), plus how many filled seats did not vote. */
export function tally(v: Pick<VoteRow, 'ballots' | 'recorded'>, eligible: number): Counts {
  const c = v.recorded ?? Object.values(v.ballots).reduce(
    (acc, b) => { acc[b] += 1; return acc; }, { yes: 0, no: 0, abstain: 0 } as Record<VoteChoice, number>);
  return { yes: c.yes, no: c.no, abstain: c.abstain, notVoted: Math.max(0, eligible - c.yes - c.no - c.abstain) };
}

/**
 * Simple majority: more yes than no. Two-thirds: yes is at least two-thirds of the yes + no votes.
 * Abstentions don't count either way (members "present and voting"). No yes votes never passes.
 */
export function passes(c: Counts, majority: VoteRow['majority']): boolean {
  if (c.yes === 0) return false;
  return majority === 'simple' ? c.yes > c.no : c.yes * 3 >= (c.yes + c.no) * 2;
}

export function buildSeed(scenario: DemoScenario): DemoState {
  const live = scenario === 'live';
  const after = scenario === 'after';
  const seatedOrLater = scenario === 'seated' || live || after;

  // ── Committees, seats, live rows ──
  const committees: CommitteeRow[] = conferenceCommittees.map((c, i) => ({ id: committeeId(c.abbr), abbr: c.abbr, name: c.name, sort: i + 1, room: null }));
  const seats: SeatRow[] = UNSC_SEATS.map((label) => ({ id: S(label), committeeId: UNSC_ID, label, capacity: 1 }));
  const sessionNumber = live ? 2 : after ? 6 : 1;
  const liveRows: LiveRow[] = committees.map((c) => ({
    committeeId: c.id,
    session: { number: sessionNumber, status: live ? 'live' : after ? 'closed' : 'scheduled', startedAt: live ? ago(25) : null },
    agendaItem: null, currentMotion: null, timer: defaultTimer(), updatedAt: ago(live ? 1 : DAY),
  }));
  if (live) {
    const unsc = liveRows.find((l) => l.committeeId === UNSC_ID)!;
    unsc.agendaItem = 'Sample agenda item';
    unsc.currentMotion = 'Moderated caucus, 10 min total, 1 min speeches';
    unsc.timer = { kind: 'speech', label: 'Kenya', durationSeconds: 60, running: true, endsAt: inSeconds(48), remainingSeconds: 48, speaker: { id: S('Kenya'), label: 'Kenya' } };
  }

  // ── People ──
  const profiles: ProfileRow[] = [
    { id: 'p-chair', email: DEMO_EMAILS.chair, fullName: 'Sample Chair', role: 'chair', isCore: false },
    { id: 'p-vice', email: DEMO_EMAILS.viceChair, fullName: 'Sample Vice Chair', role: 'chair', isCore: false },
    { id: 'p-admin', email: DEMO_EMAILS.secretariat, fullName: 'Sample Secretariat', role: 'admin', isCore: true },
  ];
  const chairs: ChairRow[] = [
    { committeeId: UNSC_ID, profileId: 'p-chair', role: 'chair' },
    { committeeId: UNSC_ID, profileId: 'p-vice', role: 'vice_chair' },
  ];
  const registrations: RegRow[] = [];
  const choiceSets = [['UNSC', 'DISEC', 'UNHRC'], ['UNSC', 'ECOSOC', 'WHO'], ['DISEC', 'UNSC', 'NATO'], ['UNHRC', 'UNEP', 'UNSC']];
  for (let i = 1; i <= 20; i++) {
    const me = i === 1;
    const name = `Sample Delegate ${i}`;
    profiles.push({ id: `p-d${i}`, email: `delegate${i}@demo.test`, fullName: me && scenario === 'new' ? null : name, role: 'delegate', isCore: false });
    if (me && scenario === 'new') continue;
    const seated = i <= 15 && (!me || seatedOrLater);
    registrations.push({
      id: `reg-${i}`, profileId: `p-d${i}`, status: seated ? 'allocated' : 'applied',
      fullName: name, schoolName: SCHOOLS[(i - 1) % SCHOOLS.length], grade: String(10 + (i % 3)),
      choiceIds: choiceSets[(i - 1) % choiceSets.length].map(committeeId),
      seatId: seated ? S(UNSC_SEATS[i - 1]) : null,
      checkinCode: `DEMO-${String(i).padStart(4, '0')}`,
      checkinDays: seated ? (live ? [1, 2] : after ? [1, 2, 3] : []) : [],
      createdAt: ago(DAY * (40 - i)),
    });
  }

  // ── Roll call ──
  const rolls: RollRow[] = [];
  if (live) {
    rolls.push({ committeeId: UNSC_ID, sessionNumber: 2, open: true, marks: {
      [S('China')]: 'present_voting', [S('Russian Federation')]: 'present', [S('United Kingdom')]: 'present_voting',
      [S('United States')]: 'present_voting', [S('Brazil')]: 'present', [S('Egypt')]: 'present_voting', [S('India')]: 'present',
      [S('Japan')]: 'present', [S('Kenya')]: 'present_voting', [S('Mexico')]: 'present', [S('Norway')]: 'present_voting',
    } });
  }
  if (after) {
    const marks: RollRow['marks'] = {};
    UNSC_SEATS.forEach((l, i) => { marks[S(l)] = i === 7 ? 'absent' : i % 2 ? 'present' : 'present_voting'; });
    rolls.push({ committeeId: UNSC_ID, sessionNumber: 6, open: false, marks });
  }

  // ── Speakers ──
  const speakers: SpeakerRow[] = live ? [
    ['United Kingdom', 'done'], ['Kenya', 'speaking'], ['Brazil', 'waiting'], ['France', 'waiting'], ['Japan', 'waiting'],
  ].map(([label, status], i) => ({ id: `spk-${i + 1}`, committeeId: UNSC_ID, seatId: S(label), position: i + 1, status: status as SpeakerRow['status'] })) : [];

  // ── Votes ──
  const ballotsFrom = (yes: string[], no: string[], abstain: string[]) => {
    const b: Record<string, VoteChoice> = {};
    yes.forEach((l) => { b[S(l)] = 'yes'; }); no.forEach((l) => { b[S(l)] = 'no'; }); abstain.forEach((l) => { b[S(l)] = 'abstain'; });
    return b;
  };
  const closed = (v: Omit<VoteRow, 'final' | 'passed' | 'status'>): VoteRow => {
    const final = tally(v, UNSC_SEATS.length);
    return { ...v, status: 'closed', final, passed: passes(final, v.majority) };
  };
  const votes: VoteRow[] = [];
  if (live || after) {
    votes.push(closed({
      id: 'vote-1', committeeId: UNSC_ID, target: 'motion', targetId: null, title: 'Motion to open the speakers’ list (sample)', majority: 'simple',
      openedAt: ago(live ? 20 : DAY), closedAt: ago(live ? 19 : DAY - 1), recorded: null,
      ballots: ballotsFrom(['France', 'China', 'United Kingdom', 'United States', 'Brazil', 'Egypt', 'India', 'Japan', 'Kenya', 'Mexico', 'Norway'], ['Russian Federation', 'Ireland'], ['United Arab Emirates']),
    }));
  }
  if (live) {
    votes.unshift({
      id: 'vote-2', committeeId: UNSC_ID, target: 'motion', targetId: null, title: 'Motion for a moderated caucus (sample)', majority: 'simple',
      status: 'open', openedAt: ago(1), closedAt: null, recorded: null, final: null, passed: null,
      ballots: ballotsFrom(['United Kingdom', 'Kenya', 'Brazil', 'Mexico'], ['China'], ['Japan']),
    });
  }
  if (after) {
    votes.unshift(closed({
      id: 'vote-3', committeeId: UNSC_ID, target: 'resolution', targetId: 'res-1', title: 'DR 1.1', majority: 'simple',
      openedAt: ago(DAY / 4), closedAt: ago(DAY / 4 - 5), recorded: null,
      ballots: ballotsFrom(['France', 'China', 'United Kingdom', 'United States', 'Brazil', 'Egypt', 'India', 'Japan', 'Kenya', 'Norway'], ['Russian Federation', 'Mexico'], ['Ireland', 'United Arab Emirates']),
    }));
  }

  // ── Position papers ──
  const paper = (label: string, minutesAgo: number, seen: boolean): PaperFileRow => ({
    seatId: S(label), fileName: `${label} position paper (sample).pdf`, sizeBytes: null, fileKey: null,
    submittedAt: ago(minutesAgo), seenAt: seen ? ago(minutesAgo - 60) : null,
  });
  const papers: PaperFileRow[] = live || after
    ? [paper('France', DAY * 3, after), paper('China', DAY * 4, true), paper('United Kingdom', DAY * 2, false), paper('Kenya', DAY * 5, true), paper('Brazil', DAY * 2, false)]
    : [];

  // ── Resolutions ──
  const res = (r: Partial<ResolutionRow> & Pick<ResolutionRow, 'id' | 'kind' | 'title' | 'status' | 'authorSeatId'>): ResolutionRow => ({
    committeeId: UNSC_ID, number: null, body: 'Sample text. This is not a real resolution.', fileName: null, fileKey: null,
    parentId: null, clause: null, returnComment: null, sponsorSeatIds: r.authorSeatId ? [r.authorSeatId] : [], signatorySeatIds: [],
    authorProfileId: null, createdAt: ago(90), updatedAt: ago(30), ...r,
  });
  const resolutions: ResolutionRow[] = [];
  if (live || after) {
    resolutions.push(
      res({ id: 'res-1', kind: 'draft_resolution', number: 'DR 1.1', title: 'Sample draft resolution 1', status: after ? 'passed' : 'approved',
        authorSeatId: S('United Kingdom'), authorProfileId: 'p-d4', sponsorSeatIds: [S('United Kingdom'), S('Japan')],
        signatorySeatIds: [S('France'), S('Brazil'), S('Norway')], createdAt: ago(120), updatedAt: ago(after ? DAY / 4 : 40) }),
      res({ id: 'res-2', kind: after ? 'draft_resolution' : 'working_paper', number: after ? 'DR 1.2' : null, title: 'Sample working paper A',
        status: after ? 'failed' : 'submitted', authorSeatId: S('Kenya'), authorProfileId: 'p-d12',
        sponsorSeatIds: [S('Kenya'), S('France')], signatorySeatIds: [S('Ghana'), S('India')], createdAt: ago(60), updatedAt: ago(15) }),
      res({ id: 'res-3', kind: 'working_paper', title: 'Sample working paper B (France)', status: after ? 'returned' : 'draft',
        returnComment: after ? 'Sample comment from the dais.' : null,
        authorSeatId: S('France'), authorProfileId: 'p-d1', createdAt: ago(45), updatedAt: ago(10) }),
      res({ id: 'res-4', kind: 'amendment', title: 'Sample amendment to DR 1.1', status: after ? 'failed' : 'submitted',
        parentId: 'res-1', clause: 'Operative 3', authorSeatId: S('Mexico'), authorProfileId: 'p-d13', createdAt: ago(12), updatedAt: ago(12) }),
    );
  }

  // ── Chits ──
  const chit = (id: string, from: string | null, to: string | null, body: string, minutesAgo: number, extra: Partial<ChitRow> = {}): ChitRow => ({
    id, committeeId: UNSC_ID, fromSeatId: from && S(from), toSeatId: to && S(to), toAll: false, body, replyTo: null, status: 'delivered', createdAt: ago(minutesAgo), ...extra,
  });
  const chits: ChitRow[] = live || after ? [
    chit('chit-7', 'Mexico', 'Norway', 'Sample note held back by the dais.', 5, { status: 'blocked' }),
    chit('chit-6', 'Japan', 'Brazil', 'Sample note between two other delegates.', 8),
    chit('chit-5', null, 'France', 'Added. You are on the list.', 10, { replyTo: 'chit-4' }),
    chit('chit-4', 'France', null, 'Can France be added to the speakers’ list?', 12),
    chit('chit-3', 'France', 'Kenya', 'Yes. Please add France as a sponsor.', 22, { replyTo: 'chit-2' }),
    chit('chit-2', 'Kenya', 'France', 'Would France co-sponsor our working paper?', 25),
    chit('chit-1', null, null, 'Sample notice from the dais: keep chits short.', 30, { toAll: true }),
  ] : [];

  // ── Private notes (the scenario delegate's) ──
  const note = (id: string, body: string, tag: NoteRow['tag'], done: boolean, minutesAgo: number): NoteRow =>
    ({ id, profileId: 'p-d1', body, tag, done, createdAt: ago(minutesAgo), updatedAt: ago(minutesAgo) });
  const notes: NoteRow[] = live || after ? [
    note('note-1', 'Ask Kenya how the plan would be paid for.', 'poi', false, 14),
    note('note-2', 'Do amendments need a second?', 'doubt', false, 20),
    note('note-3', 'Open with France’s support for the working paper.', 'speech', true, 40),
  ] : [];

  // ── Files ──
  const file = (id: string, title: string, kind: FileRow['kind'], fileName: string, extra: Partial<FileRow> = {}): FileRow => ({
    id, title, kind, scope: 'conference', committeeId: null, ownerProfileId: null, fileName, link: null, sizeBytes: null, fileKey: null,
    addedBy: 'Sample Secretariat', addedAt: ago(DAY * 7), sharedWithSeatIds: [], ...extra,
  });
  const files: FileRow[] = [
    file('file-handbook', 'Delegate handbook (sample)', 'handbook', 'delegate-handbook-sample.pdf'),
    file('file-rules', 'Rules of procedure (sample)', 'rules', 'rules-of-procedure-sample.pdf'),
    file('file-schedule', 'Conference schedule (sample)', 'schedule', 'schedule-sample.pdf'),
    file('file-map', 'Venue map (sample)', 'map', 'venue-map-sample.pdf'),
    file('file-unsc-guide', 'UNSC background guide (sample)', 'guide', 'unsc-background-guide-sample.pdf',
      { scope: 'committee', committeeId: UNSC_ID, addedBy: 'Sample Chair', addedAt: ago(DAY * 6) }),
  ];
  if (live || after) {
    files.push(
      file('file-mine-1', 'My research notes (sample)', 'research', 'research-notes-sample.docx',
        { scope: 'mine', committeeId: UNSC_ID, ownerProfileId: 'p-d1', addedBy: 'Sample Delegate 1', addedAt: ago(DAY), sharedWithSeatIds: [S('Kenya')] }),
      file('file-kenya-1', 'Bloc draft (sample)', 'other', 'bloc-draft-sample.docx',
        { scope: 'mine', committeeId: UNSC_ID, ownerProfileId: 'p-d12', addedBy: 'Sample Delegate 12', addedAt: ago(50), sharedWithSeatIds: [S('France'), S('Ghana')] }),
    );
  }

  // ── Announcements ──
  const announcements: AnnouncementRow[] = [
    { id: 'ann-1', title: 'Welcome to the DXB MUN 2027 dashboard (sample notice)', body: 'Dates, rooms and deadlines will be announced here.',
      urgent: false, from: 'secretariat', committeeId: null, audience: 'all', publishedAt: ago(DAY * 6) },
  ];
  if (seatedOrLater) announcements.unshift({ id: 'ann-2', title: 'Seat allocations are out (sample notice)', body: 'Check your committee and seat on the Now page.',
    urgent: false, from: 'secretariat', committeeId: null, audience: 'delegates', publishedAt: ago(DAY * 2) });
  if (live) announcements.unshift(
    { id: 'ann-3', title: 'Committee session 2 has started (sample notice)', body: null, urgent: false, from: 'chair', committeeId: UNSC_ID, audience: 'committee', publishedAt: ago(25) },
    { id: 'ann-4', title: 'Sample urgent notice', body: 'This is how an urgent notice looks.', urgent: true, from: 'secretariat', committeeId: null, audience: 'all', publishedAt: ago(3) },
  );
  if (after) announcements.unshift({ id: 'ann-5', title: 'The conference has ended (sample notice)', body: 'Your papers, resolutions and notes stay here to read.',
    urgent: false, from: 'secretariat', committeeId: null, audience: 'all', publishedAt: ago(60 * 3) });
  announcements.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  // ── Schedule: titles from the live site, every time and place to be announced ──
  const schedule: ScheduleItem[] = conferenceSchedule.flatMap((d) => d.slots.map((slot, i) => ({
    id: `sch-d${d.day}-${i + 1}`, day: d.day, title: slot.name, startsAt: null, endsAt: null, location: null, committeeId: null,
  })));

  // ── Awards rubric ──
  const score = (chairId: string, label: string, sessionNumber: number, m: number[], minutesAgo: number): ScoreRow => ({
    committeeId: UNSC_ID, seatId: S(label), sessionNumber, chairId, comment: null, updatedAt: ago(minutesAgo),
    marks: Object.fromEntries(['speeches', 'pois', 'diplomacy', 'resolution', 'knowledge', 'paper'].map((k, i) => [k, m[i]]).filter(([, v]) => v !== undefined)),
  });
  const scores: ScoreRow[] = [];
  if (live || after) {
    scores.push(
      score('p-chair', 'France', 1, [7, 6, 8, 7, 8, 7], DAY), score('p-chair', 'Kenya', 1, [8, 7, 7, 8, 7, 8], DAY),
      score('p-chair', 'United Kingdom', 1, [8, 8, 6, 7, 8, 6], DAY), score('p-chair', 'Brazil', 1, [6, 6, 7, 6], DAY),
      score('p-vice', 'France', 1, [8, 7, 7, 6, 8, 7], DAY), score('p-vice', 'Kenya', 1, [7, 8, 8, 8, 6, 8], DAY),
    );
  }
  if (after) {
    scores.push(score('p-chair', 'France', 2, [8, 7, 8, 8, 8, 7], DAY / 2), score('p-chair', 'Kenya', 2, [9, 8, 8, 9, 8, 8], DAY / 2));
  }
  const nominations: NominationRow[] = after ? [
    { id: 'nom-1', committeeId: UNSC_ID, seatId: S('Kenya'), award: 'Best Delegate', nominatedBy: 'p-chair', final: false },
    { id: 'nom-2', committeeId: UNSC_ID, seatId: S('United Kingdom'), award: 'High Commendation', nominatedBy: 'p-vice', final: false },
    { id: 'nom-3', committeeId: UNSC_ID, seatId: S('France'), award: 'Best Position Paper', nominatedBy: 'p-chair', final: false },
  ] : [];

  return {
    version: 1, scenario, rev: 0, change: { topics: [], committeeId: null },
    phase: live ? 'live' : after ? 'after' : 'before',
    profiles, registrations, committees, seats, chairs, live: liveRows, rolls, speakers, votes, papers, resolutions, chits, notes, files,
    announcements, schedule,
    deadlines: [
      { key: 'position_paper', label: 'Position paper', dueAt: null },
      { key: 'resolution', label: 'Resolution cut-off', dueAt: null },
      { key: 'registration', label: 'Registration closes', dueAt: null },
    ],
    criteria: {}, scores, nominations,
  };
}
