// Shared pieces of the three demo adapters: sign-in, who the signed-in person is, input checks, and turning
// store rows into the contract's view types. Plain messages only; the UI shows them as-is.
import {
  DEFAULT_AWARDS, DEFAULT_CRITERIA,
  type Announcement, type AuthApi, type CommitteeLive, type CommitteeRef, type Criterion, type LibraryFile, type Me,
  type PositionPaper, type RankingRow, type Resolution, type ScheduleItem, type SeatRef, type Speaker, type Topic, type Vote,
} from './contract';
import {
  blobFor, getState, subscribeStore,
  type AnnouncementRow, type DemoState, type FileRow, type ProfileRow, type RegRow, type ResolutionRow, type VoteRow,
} from './demo-store';
import { tally } from './demo-seed';

// ───────────────────────── Errors and input checks ─────────────────────────
export function fail(message: string): never {
  throw new Error(message);
}

/** Trimmed text; required unless `optional`. Collapses inner runs of spaces on one-line fields. */
export function cleanText(value: unknown, what: string, max: number, opts: { optional?: boolean; multiline?: boolean } = {}): string {
  if (value !== undefined && value !== null && typeof value !== 'string') fail(`${what} must be text.`);
  let v = (value ?? '').trim();
  if (!opts.multiline) v = v.replace(/\s+/g, ' ');
  if (!v && !opts.optional) fail(`Enter ${what.toLowerCase()}.`);
  if (v.length > max) fail(`${what} is too long. Keep it to ${max} characters.`);
  return v;
}
export function optText(value: unknown, what: string, max: number, multiline = false): string | null {
  return cleanText(value, what, max, { optional: true, multiline }) || null;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export function cleanEmail(email: unknown): string {
  const e = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!EMAIL.test(e) || e.length > 200) fail('Enter a valid email address.');
  return e;
}

export const DEMO_CODE = '123456';
export function cleanCode(code: unknown): string {
  const c = typeof code === 'string' ? code.replace(/[\s-]+/g, '') : '';
  if (!/^\d{6,10}$/.test(c)) fail('Enter the code from the email. It has 6 to 10 digits.');
  return c;
}

export function intIn(value: unknown, min: number, max: number, message: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) fail(message);
  return value;
}

/** An ISO date-time or null. */
export function cleanIso(value: unknown, what: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) fail(`${what} is not a valid date and time.`);
  return new Date(value).toISOString();
}

export function cleanLink(value: unknown): string {
  const v = typeof value === 'string' ? value.trim() : '';
  let ok = false;
  try { const u = new URL(v); ok = u.protocol === 'https:' || u.protocol === 'http:'; } catch { ok = false; }
  if (!ok) fail('Enter a full link that starts with https://');
  if (v.length > 2000) fail('That link is too long.');
  return v;
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const PAPER_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const LIBRARY_EXT = /\.(pdf|docx?|pptx?|xlsx?|txt|png|jpe?g)$/i;

function checkFileBasics(file: unknown): File {
  if (!file || typeof file !== 'object' || typeof (file as File).name !== 'string' || typeof (file as File).size !== 'number') fail('Choose a file first.');
  const f = file as File;
  if (f.size === 0) fail('That file is empty. Choose another one.');
  if (f.size > MAX_FILE_BYTES) fail('That file is too big. The limit is 10 MB.');
  if (f.name.length > 200) fail('That file name is too long. Rename it and try again.');
  return f;
}
/** Position papers and resolution files: PDF or DOCX, up to 10 MB. */
export function checkPaperFile(file: unknown): File {
  const f = checkFileBasics(file);
  if (!/\.(pdf|docx)$/i.test(f.name) && !PAPER_TYPES.includes(f.type)) fail('Upload a PDF or a Word (.docx) file.');
  return f;
}
/** Library files: common documents and images, up to 10 MB. */
export function checkLibraryFile(file: unknown): File {
  const f = checkFileBasics(file);
  if (!LIBRARY_EXT.test(f.name)) fail('Upload a PDF, Word, PowerPoint, Excel, text or image file.');
  return f;
}

export const clone = <T>(v: T): T => structuredClone(v);

/** A little latency, so loading states can be seen in the demo. */
export const pause = () => new Promise<void>((r) => setTimeout(r, 40 + Math.random() * 80));

// ───────────────────────── Sign-in (one per tab, shared by the three adapters) ─────────────────────────
const AUTH_KEY = 'dxbmun.v2.email';
let memoryEmail: string | null = null;

function session(): Storage | null {
  try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; } catch { return null; }
}
export function currentEmail(): string | null {
  try { return session()?.getItem(AUTH_KEY) ?? memoryEmail; } catch { return memoryEmail; }
}
function setEmail(e: string | null) {
  memoryEmail = e;
  try { const ss = session(); if (ss) { if (e === null) ss.removeItem(AUTH_KEY); else ss.setItem(AUTH_KEY, e); } } catch { /* memory only */ }
  for (const cb of [...authListeners]) { try { cb(e !== null); } catch (err) { console.error(err); } }
}
const authListeners = new Set<(signedIn: boolean) => void>();

/**
 * Which sample person an email signs in as:
 *   an email already in the store → that person;
 *   contains "chair"  → Sample Vice Chair if it also contains "vice", else Sample Chair (both chair UNSC);
 *   contains "admin" or "sec" → Sample Secretariat (core);
 *   "delegateN@…" (N = 1–20) → Sample Delegate N;
 *   anything else → Sample Delegate 1, the scenario delegate (France).
 */
export function resolveProfileId(s: DemoState, email: string): string {
  const e = email.toLowerCase();
  const exact = s.profiles.find((p) => p.email === e);
  if (exact) return exact.id;
  if (e.includes('chair')) return e.includes('vice') ? 'p-vice' : 'p-chair';
  if (e.includes('admin') || e.includes('sec')) return 'p-admin';
  const m = /delegate[-_.]?(\d+)/.exec(e.split('@')[0]);
  if (m && s.profiles.some((p) => p.id === `p-d${Number(m[1])}`)) return `p-d${Number(m[1])}`;
  return 'p-d1';
}

export function signedInProfile(s: DemoState): ProfileRow {
  const email = currentEmail();
  if (!email) fail('Please sign in first.');
  const id = resolveProfileId(s, email);
  const p = s.profiles.find((x) => x.id === id);
  if (!p) fail('Please sign in first.');
  return p;
}

export function meView(s: DemoState): Me {
  const p = signedInProfile(s);
  return { id: p.id, email: currentEmail()!, fullName: p.fullName, role: p.role, isCore: p.role === 'admin' && p.isCore };
}

export const demoAuth: AuthApi = {
  mode: 'demo',
  async sendCode(email) { cleanEmail(email); await pause(); },
  async verifyCode(email, code) {
    const e = cleanEmail(email);
    const c = cleanCode(code);
    await pause();
    if (c !== DEMO_CODE) fail("That code isn't right. Check the email and try again.");
    setEmail(e);
  },
  async signOut() { await pause(); setEmail(null); },
  onAuth(cb) {
    authListeners.add(cb);
    queueMicrotask(() => { if (authListeners.has(cb)) cb(currentEmail() !== null); });
    return () => { authListeners.delete(cb); };
  },
  async me() { await pause(); return meView(getState()); },
};

/** Subscribe to store changes, skipping changes that belong to a different committee. */
export function subscribeFiltered(committee: () => string | null, cb: (what: Topic) => void) {
  return subscribeStore((topics, cid) => {
    const mine = committee();
    if (cid && mine && cid !== mine) return;
    for (const t of topics) cb(t);
  });
}

// ───────────────────────── Lookups ─────────────────────────
export function committeeRef(s: DemoState, id: string): CommitteeRef {
  const c = s.committees.find((x) => x.id === id);
  if (!c) fail('That committee does not exist.');
  return { id: c.id, abbr: c.abbr, name: c.name };
}
export function committeesSorted(s: DemoState) {
  return [...s.committees].sort((a, b) => a.sort - b.sort || a.abbr.localeCompare(b.abbr));
}
export function seatRef(s: DemoState, id: string): SeatRef {
  const seat = s.seats.find((x) => x.id === id);
  return { id, label: seat?.label ?? 'Removed seat' };
}
export function seatsOf(s: DemoState, committeeId: string) {
  return s.seats.filter((x) => x.committeeId === committeeId).sort((a, b) => a.label.localeCompare(b.label));
}
export function holdersOf(s: DemoState, seatId: string): RegRow[] {
  return s.registrations.filter((r) => r.seatId === seatId && r.status === 'allocated').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export const holderNames = (s: DemoState, seatId: string) => holdersOf(s, seatId).map((r) => r.fullName);
export const filledSeatCount = (s: DemoState, committeeId: string) => s.seats.filter((x) => x.committeeId === committeeId && holdersOf(s, x.id).length > 0).length;
export function seatInCommittee(s: DemoState, committeeId: string, seatId: string) {
  const seat = s.seats.find((x) => x.id === seatId && x.committeeId === committeeId);
  if (!seat) fail('That seat is not in this committee.');
  return seat;
}
export function profileName(s: DemoState, id: string | null): string | null {
  return id ? s.profiles.find((p) => p.id === id)?.fullName ?? null : null;
}
export function liveRow(s: DemoState, committeeId: string) {
  const l = s.live.find((x) => x.committeeId === committeeId);
  if (!l) fail('That committee does not exist.');
  return l;
}

// ───────────────────────── Views ─────────────────────────
export function liveView(s: DemoState, committeeId: string): CommitteeLive {
  const l = liveRow(s, committeeId);
  const c = s.committees.find((x) => x.id === committeeId)!;
  return clone({ committee: committeeRef(s, committeeId), room: c.room, session: l.session, agendaItem: l.agendaItem, currentMotion: l.currentMotion, timer: l.timer, updatedAt: l.updatedAt });
}

export function speakersView(s: DemoState, committeeId: string, mySeatId: string | null): Speaker[] {
  return s.speakers.filter((x) => x.committeeId === committeeId).sort((a, b) => a.position - b.position)
    .map((x) => ({ id: x.id, seat: seatRef(s, x.seatId), position: x.position, status: x.status, isMe: x.seatId === mySeatId }));
}

export function paperView(s: DemoState, seatId: string): PositionPaper {
  const p = s.papers.find((x) => x.seatId === seatId);
  if (!p) return { status: 'not_sent', fileName: null, submittedAt: null, seenAt: null };
  const due = s.deadlines.find((d) => d.key === 'position_paper')?.dueAt ?? null;
  const status = p.seenAt ? 'seen' : due && p.submittedAt > due ? 'late' : 'submitted';
  return { status, fileName: p.fileName, submittedAt: p.submittedAt, seenAt: p.seenAt };
}

/** Delegates see counts only after the vote closes; the dais always sees them. */
export function voteView(s: DemoState, v: VoteRow, viewer: { seatId: string | null } | 'dais'): Vote {
  const dais = viewer === 'dais';
  const counts = v.status === 'closed' ? v.final : dais ? tally(v, filledSeatCount(s, v.committeeId)) : null;
  return {
    id: v.id, target: v.target, targetId: v.targetId, title: v.title, majority: v.majority, status: v.status,
    openedAt: v.openedAt, closedAt: v.closedAt,
    myVote: dais ? null : viewer.seatId ? v.ballots[viewer.seatId] ?? null : null,
    counts: counts ? { ...counts } : null,
    passed: v.status === 'closed' ? v.passed : null,
  };
}
export function votesSorted(s: DemoState, committeeId: string) {
  return s.votes.filter((v) => v.committeeId === committeeId).sort((a, b) =>
    a.status === b.status ? (b.closedAt ?? b.openedAt).localeCompare(a.closedAt ?? a.openedAt) : a.status === 'open' ? -1 : 1);
}

export function resolutionView(s: DemoState, r: ResolutionRow, mySeatId: string | null): Resolution {
  return {
    id: r.id, kind: r.kind, number: r.number, title: r.title, body: r.body, fileName: r.fileName,
    parentId: r.parentId, clause: r.clause, status: r.status, returnComment: r.returnComment,
    sponsors: r.sponsorSeatIds.map((id) => seatRef(s, id)), signatories: r.signatorySeatIds.map((id) => seatRef(s, id)),
    submittedBy: r.authorSeatId ? seatRef(s, r.authorSeatId) : null,
    mine: !!mySeatId && r.authorSeatId === mySeatId,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  };
}

const SCOPE_ORDER: Record<LibraryFile['scope'], number> = { conference: 0, committee: 1, mine: 2, shared_with_me: 3 };
export function fileView(s: DemoState, f: FileRow, opts: { scope?: LibraryFile['scope']; canRemove: boolean }): LibraryFile {
  const scope = opts.scope ?? f.scope;
  return {
    id: f.id, title: f.title, kind: f.kind, scope, fileName: f.fileName, link: f.link, sizeBytes: f.sizeBytes,
    addedBy: f.addedBy, addedAt: f.addedAt, committeeId: f.committeeId,
    sharedWith: scope === 'mine' ? f.sharedWithSeatIds.map((id) => seatRef(s, id)) : [],
    canRemove: opts.canRemove,
  };
}
export function sortFiles(list: LibraryFile[]) {
  return list.sort((a, b) => SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope] || b.addedAt.localeCompare(a.addedAt));
}

export function announcementView(a: AnnouncementRow): Announcement {
  return { id: a.id, title: a.title, body: a.body, urgent: a.urgent, from: a.from, committeeId: a.committeeId, publishedAt: a.publishedAt };
}
export const newestFirst = (a: AnnouncementRow, b: AnnouncementRow) => b.publishedAt.localeCompare(a.publishedAt);

export function scheduleSorted(items: ScheduleItem[]): ScheduleItem[] {
  return items.map((x, i) => ({ x, i })).sort((a, b) => {
    if (a.x.day !== b.x.day) return a.x.day - b.x.day;
    if (a.x.startsAt && b.x.startsAt && a.x.startsAt !== b.x.startsAt) return a.x.startsAt.localeCompare(b.x.startsAt);
    return a.i - b.i;
  }).map(({ x }) => ({ ...x }));
}

// ───────────────────────── Files: what "open" gives you ─────────────────────────
function textBlobUrl(text: string): string {
  try { return URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); }
  catch { return `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`; }
}
const size = (n: number | null) => (n === null ? '' : n >= 1024 * 1024 ? `, ${(n / 1024 / 1024).toFixed(1)} MB` : `, ${Math.max(1, Math.round(n / 1024))} KB`);

/** A URL to open: the link, the uploaded file (this tab only), or a small placeholder that says it's a sample. */
export function openUrl(item: { title: string; fileName: string | null; link?: string | null; fileKey: string | null; sizeBytes: number | null }): string {
  if (item.link) return item.link;
  const blob = blobFor(item.fileKey);
  if (blob) return blob;
  if (item.fileKey) {
    return textBlobUrl(`DXB MUN 2027 demo\n\n${item.title}\n\nThis file (${item.fileName ?? 'no name'}${size(item.sizeBytes)}) was uploaded in another tab or an earlier visit.\nThe demo keeps only its name and size.\n`);
  }
  return textBlobUrl(`DXB MUN 2027 demo\n\n${item.title}\n\nThis is a sample file. It has no real content.\nThe real file will be added by the secretariat or the chairs.\n`);
}

// ───────────────────────── Awards rubric ─────────────────────────
export function criteriaFor(s: DemoState, committeeId: string): Criterion[] {
  return clone(s.criteria[committeeId] ?? DEFAULT_CRITERIA);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Ranking maths, per seat and per criterion:
 *   1. in each session, average the marks every chair gave for that criterion;
 *   2. average those session values over the sessions where the criterion was scored → byCriterion;
 *   3. total = the sum of byCriterion over the committee's current criteria.
 * byChair uses the same maths on one chair's sheets. sessionsScored counts sessions with at least one mark.
 * Seats with no marks are listed last with a total of 0. Best first; ties by seat name.
 */
export function rankingFor(s: DemoState, committeeId: string): RankingRow[] {
  const criteria = criteriaFor(s, committeeId);
  const sheets = s.scores.filter((x) => x.committeeId === committeeId);
  const valid = (k: string, v: unknown, max: number) => typeof v === 'number' && v >= 1 && v <= max && criteria.some((c) => c.key === k);

  const totals = (rows: typeof sheets) => {
    const byCriterion: Record<string, number> = {};
    const sessions = new Set<number>();
    for (const c of criteria) {
      const perSession = new Map<number, number[]>();
      for (const r of rows) {
        const v = r.marks[c.key];
        if (!valid(c.key, v, c.max)) continue;
        sessions.add(r.sessionNumber);
        perSession.set(r.sessionNumber, [...(perSession.get(r.sessionNumber) ?? []), v]);
      }
      if (perSession.size) byCriterion[c.key] = round2(mean([...perSession.values()].map(mean)));
    }
    return { byCriterion, total: round2(Object.values(byCriterion).reduce((a, b) => a + b, 0)), sessions: sessions.size };
  };

  const rows: RankingRow[] = seatsOf(s, committeeId).map((seat) => {
    const mine = sheets.filter((x) => x.seatId === seat.id);
    const all = totals(mine);
    const chairIds = [...new Set(mine.map((x) => x.chairId))];
    return {
      seat: { id: seat.id, label: seat.label }, delegates: holderNames(s, seat.id),
      total: all.total, byCriterion: all.byCriterion, sessionsScored: all.sessions,
      byChair: chairIds.map((id) => ({ chairId: id, chairName: profileName(s, id), total: totals(mine.filter((x) => x.chairId === id)).total }))
        .sort((a, b) => (a.chairName ?? '').localeCompare(b.chairName ?? '')),
    };
  });
  return rows.sort((a, b) => b.total - a.total || a.seat.label.localeCompare(b.seat.label));
}

export const awardRank = (a: string) => { const i = (DEFAULT_AWARDS as readonly string[]).indexOf(a); return i < 0 ? DEFAULT_AWARDS.length : i; };
