// Shared pieces of the live (Supabase) adapters: one client per origin, sign-in, error wording, row mappers,
// realtime and the awards ranking maths. Schema: supabase/migrations/0001_init.sql + 0004_conference_day.sql.
//
// Rules followed:
//   * Reads go straight to tables; RLS decides what each person may see.
//   * Every privileged write is an RPC from 0004 (SECURITY DEFINER, checks the caller).
//   * Embedded selects are avoided (several tables have two foreign keys to the same table); joins are done here.
//   * The three dashboards share one auth storage key, so one sign-in on the origin works on /portal/, /chair/ and /admin/.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_CRITERIA,
  type Announcement, type AuthApi, type Chit, type CommitteeLive, type CommitteeRef, type Criterion, type Deadline, type FileInput,
  type LibraryFile, type Me, type Phase, type PositionPaper, type RankingRow, type Resolution, type ResolutionStatus, type Role,
  type ScheduleItem, type SeatRef, type Speaker, type Timer, type Topic, type Unsubscribe, type Vote, type VoteChoice,
} from './contract';

export type Sb = SupabaseClient;

/** One auth storage key for every dashboard on this origin. */
export const AUTH_STORAGE_KEY = 'dxbmun-auth';

const clients = new Map<string, SupabaseClient>();
export function getClient(url: string, anonKey: string): SupabaseClient {
  const key = `${url}|${anonKey}`;
  let c = clients.get(key);
  if (!c) {
    c = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: AUTH_STORAGE_KEY } });
    clients.set(key, c);
  }
  return c;
}

// ───────────────────────── Errors ─────────────────────────
export function fail(message: string): never {
  throw new Error(message);
}

type DbError = { message?: string; code?: string; status?: number | string; statusCode?: number | string };

/** Messages from 0001's RPCs and triggers that need rewording. 0004's own messages are already plain English. */
const KNOWN: [string, string][] = [
  ['Not allowed', "You don't have permission to do that."],
  ['Seat is full', 'That seat is full. Pick another seat, or unassign someone first.'],
  ['Seat is not in this committee', 'That seat is not in this committee.'],
  ["Seat is not in this session's committee", 'That seat is not in this committee.'],
  ["Seat is not in this document's committee", 'Every sponsor and signatory must be a seat in your committee.'],
  ['Parent document is in another committee', 'Amendments can only change a draft resolution in your committee.'],
  ['Amendments must point at a draft resolution', 'Amendments can only change a draft resolution.'],
  ['Cannot remove the last core admin', "You can't remove the last core admin."],
  ['No such profile', 'That person no longer exists. Refresh.'],
  ['row-level security', "You don't have permission to do that."],
  ['mime type', 'That file type is not allowed.'],
  ['invalid_mime_type', 'That file type is not allowed.'],
  ['Payload too large', 'That file is too big.'],
  ['exceeded the maximum allowed size', 'That file is too big.'],
];

export function friendly(err: DbError, duplicate = 'That has already been saved.'): never {
  console.error('[supabase]', err);
  const m = err.message ?? '';
  const known = KNOWN.find(([k]) => m.includes(k));
  if (known) fail(known[1]);
  if (err.code === 'P0001' && m) fail(/[.!?]$/.test(m) ? m : `${m}.`);   // raised by our own functions
  if (err.code === '23505') fail(duplicate);
  if (err.code === '23503') fail('That item no longer exists. Refresh and try again.');
  if (err.code === '23514' || err.code === '22001') fail('Something you entered is too long or not allowed.');
  if (err.code === '22P02' || err.code === '22007') fail('That value is not valid.');
  const status = Number(err.status ?? err.statusCode);
  if (err.code === '42501' || err.code === 'PGRST301' || status === 401 || status === 403) fail("You don't have permission to do that.");
  if (err.code === 'PGRST116') fail('That item no longer exists. Refresh and try again.');
  if (/fetch|network|Failed to fetch/i.test(m)) fail("Can't reach the server. Check your connection and try again.");
  fail('Something went wrong. Please try again.');
}

/** Unwraps a Supabase result, throwing a plain-English error. */
export async function q<T>(p: PromiseLike<{ data: unknown; error: DbError | null }>, duplicate?: string): Promise<T> {
  const { data, error } = await p;
  if (error) friendly(error, duplicate);
  return data as T;
}

/** Reads every row, 1000 at a time (PostgREST's page size). */
export async function all<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown; error: DbError | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const rows = await q<T[]>(page(from, from + 999));
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

// ───────────────────────── Input checks ─────────────────────────
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/i;
export function cleanEmail(email: string): string {
  const e = String(email ?? '').trim().toLowerCase();
  if (!EMAIL.test(e)) fail('Enter a valid email address.');
  return e;
}
export function cleanCode(code: string): string {
  const c = String(code ?? '').replace(/\s+/g, '');
  if (!/^\d{6,10}$/.test(c)) fail('Enter the code from the email. It has 6 to 10 digits.');
  return c;
}
export function cleanText(v: unknown, what: string, max: number): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) fail(`${what} is missing.`);
  if (s.length > max) fail(`${what} is too long. Keep it under ${max} characters.`);
  return s;
}
export function optText(v: unknown, what: string, max: number): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length > max) fail(`${what} is too long. Keep it under ${max} characters.`);
  return s || null;
}
export function cleanLink(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!/^https?:\/\/\S+$/i.test(s)) fail('Links must start with http:// or https://.');
  if (s.length > 2000) fail('That link is too long.');
  return s;
}
export function cleanIso(v: unknown, what: string): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) fail(`${what} is not a valid date and time.`);
  return new Date(v).toISOString();
}
const uniq = <T>(xs: T[]) => [...new Set(xs)];
export const uniqIds = (xs: unknown): string[] => (Array.isArray(xs) ? uniq(xs.filter((x): x is string => typeof x === 'string' && !!x)) : []);

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
/** PDF or DOCX up to `maxMb`, checked by its first bytes too. Returns the extension and content type. */
export async function checkPaperFile(file: File, maxMb = 10): Promise<{ ext: 'pdf' | 'docx'; type: string }> {
  if (!file || typeof file.size !== 'number') fail('Choose a file first.');
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isDocx = file.type === DOCX || /\.docx$/i.test(file.name);
  if (!isPdf && !isDocx) fail('Only PDF or Word (.docx) files can be uploaded.');
  if (file.size === 0) fail('That file is empty. Choose it again.');
  if (file.size > maxMb * 1024 * 1024) fail(`That file is over ${maxMb} MB. Upload a smaller one.`);
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const sig = String.fromCharCode(...head);
  if (isPdf && sig === '%PDF-') return { ext: 'pdf', type: 'application/pdf' };
  if (isDocx && sig.startsWith('PK\u0003\u0004')) return { ext: 'docx', type: DOCX };
  fail("That file doesn't look like a real PDF or Word file. Save it again and retry.");
}

const LIBRARY_TYPES = new Set([
  'application/pdf', DOCX, 'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel',
  'text/plain', 'text/csv', 'image/png', 'image/jpeg', 'image/webp',
]);
const FILE_KINDS: LibraryFile['kind'][] = ['guide', 'rules', 'handbook', 'schedule', 'map', 'research', 'other'];

export function safeName(name: string): string {
  const base = (name || 'file').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
  return (base || 'file').slice(-80);
}
export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ───────────────────────── Auth ─────────────────────────
type ProfileRow = { id: string; email: string; full_name: string | null; role: 'delegate' | 'chair' | 'advisor' | 'admin'; admin_level: 'core' | 'staff' | null };
export const toRole = (r: ProfileRow['role']): Role => (r === 'admin' ? 'admin' : r === 'chair' ? 'chair' : 'delegate');

export async function requireUid(sb: Sb): Promise<string> {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) fail('Please sign in first.');
  return session.user.id;
}

export async function loadMe(sb: Sb): Promise<Me> {
  const id = await requireUid(sb);
  const p = await q<ProfileRow | null>(sb.from('profiles').select('id, email, full_name, role, admin_level').eq('id', id).maybeSingle());
  if (!p) fail('Your account is still being set up. Reload in a moment.');
  return { id: p.id, email: p.email, fullName: p.full_name, role: toRole(p.role), isCore: p.role === 'admin' && p.admin_level === 'core' };
}

/** Email + code sign-in, the same on every dashboard. `onChange` runs on every auth change (to clear caches). */
export function makeAuth(sb: Sb, onChange: () => void): AuthApi {
  return {
    mode: 'live',
    async sendCode(email) {
      const { error } = await sb.auth.signInWithOtp({ email: cleanEmail(email), options: { shouldCreateUser: true } });
      if (error) {
        console.error('[supabase auth]', error);
        if (error.status === 429) fail('Too many codes asked for. Wait a minute and try again.');
        fail("We couldn't send the code. Check the email and try again.");
      }
    },
    async verifyCode(email, code) {
      const { error } = await sb.auth.verifyOtp({ email: cleanEmail(email), token: cleanCode(code), type: 'email' });
      if (error) {
        console.error('[supabase auth]', error);
        if (error.status === 429) fail('Too many tries. Wait a minute and try again.');
        fail("That code isn't right, or it has expired. Check the email and try again.");
      }
      onChange();
    },
    async signOut() {
      const { error } = await sb.auth.signOut();
      onChange();
      if (error) friendly(error);
    },
    onAuth(cb) {
      // Supabase fires INITIAL_SESSION straight away, so cb learns the current state without a separate call.
      const { data } = sb.auth.onAuthStateChange((_e, session) => { onChange(); cb(!!session); });
      return () => data.subscription.unsubscribe();
    },
    me: () => loadMe(sb),
  };
}

// ───────────────────────── Small shared reads ─────────────────────────
export async function loadPhase(sb: Sb): Promise<Phase> {
  const r = await q<{ phase: string } | null>(sb.from('settings').select('phase').eq('id', true).maybeSingle());
  return r?.phase === 'live' || r?.phase === 'after' ? r.phase : 'before';
}

export type CommitteeRow = { id: string; abbr: string; name: string; sort: number; room: string | null };
export const toCommitteeRef = (c: { id: string; abbr: string; name: string }): CommitteeRef => ({ id: c.id, abbr: c.abbr, name: c.name });

/** Committees change rarely: cached for 30 s per client. */
export function committeeCache(sb: Sb) {
  let at = 0;
  let p: Promise<CommitteeRow[]> | null = null;
  const rows = () => {
    if (!p || Date.now() - at > 30_000) {
      at = Date.now();
      p = q<CommitteeRow[]>(sb.from('committees').select('id, abbr, name, sort, room').order('sort').order('abbr'));
      p.catch(() => { p = null; });
    }
    return p;
  };
  return {
    rows,
    clear: () => { p = null; },
    async byId(id: string): Promise<CommitteeRow> {
      const c = (await rows()).find((x) => x.id === id);
      if (!c) fail('That committee no longer exists. Reload and try again.');
      return c;
    },
  };
}

export type SeatRow = { id: string; committee_id: string; label: string; capacity: number };
export async function seatRows(sb: Sb, committeeId: string): Promise<SeatRow[]> {
  return q<SeatRow[]>(sb.from('seats').select('id, committee_id, label, capacity').eq('committee_id', committeeId).order('label'));
}
/** Seat labels by id; unknown ids still get a readable label. */
export function labeller(rows: { id: string; label: string }[]) {
  const m = new Map(rows.map((s) => [s.id, s.label]));
  return (id: string): SeatRef => ({ id, label: m.get(id) ?? 'Seat removed' });
}

const DEADLINE_KEYS: Deadline['key'][] = ['registration', 'position_paper', 'resolution'];
const DEADLINE_LABELS: Record<Deadline['key'], string> = { registration: 'Registration', position_paper: 'Position papers', resolution: 'Resolutions' };
export async function loadDeadlines(sb: Sb): Promise<Deadline[]> {
  const rows = await q<{ key: string; label: string; due_at: string | null }[]>(sb.from('deadlines').select('key, label, due_at'));
  return DEADLINE_KEYS.map((key) => {
    const r = rows.find((x) => x.key === key);
    return { key, label: r?.label ?? DEADLINE_LABELS[key], dueAt: r?.due_at ?? null };
  }).sort((a, b) => (a.dueAt && b.dueAt ? a.dueAt.localeCompare(b.dueAt) : a.dueAt ? -1 : b.dueAt ? 1 : 0));
}
export async function paperDueAt(sb: Sb): Promise<string | null> {
  const r = await q<{ due_at: string | null } | null>(sb.from('deadlines').select('due_at').eq('key', 'position_paper').maybeSingle());
  return r?.due_at ?? null;
}

export type ScheduleRow = { id: string; day: number; title: string; starts_at: string | null; ends_at: string | null; location: string | null; committee_id: string | null };
export async function loadSchedule(sb: Sb): Promise<ScheduleItem[]> {
  const rows = await q<ScheduleRow[]>(sb.from('schedule_items').select('id, day, title, starts_at, ends_at, location, committee_id')
    .order('day').order('starts_at', { ascending: true, nullsFirst: false }).order('created_at'));
  return rows.map((r) => ({ id: r.id, day: r.day, title: r.title, startsAt: r.starts_at, endsAt: r.ends_at, location: r.location, committeeId: r.committee_id }));
}

export type AnnRow = { id: string; title: string; body: string | null; urgent: boolean; from_role: 'secretariat' | 'chair'; committee_id: string | null; published_at: string | null; created_at: string };
export const ANN_COLS = 'id, title, body, urgent, from_role, committee_id, published_at, created_at';
export const toAnnouncement = (r: AnnRow): Announcement => ({
  id: r.id, title: r.title, body: r.body, urgent: r.urgent, from: r.from_role === 'chair' ? 'chair' : 'secretariat',
  committeeId: r.committee_id, publishedAt: r.published_at ?? r.created_at,
});

// ───────────────────────── The room: live row and sessions ─────────────────────────
type LiveRow = {
  committee_id: string; agenda_item: string | null; current_motion: string | null; timer_kind: Timer['kind']; timer_label: string | null;
  timer_duration: number; timer_running: boolean; timer_ends_at: string | null; timer_remaining: number;
  timer_speaker_seat_id: string | null; updated_at: string;
};
export type SessionRow = { id: string; number: number; status: 'scheduled' | 'live' | 'closed'; started_at: string | null; roll_open: boolean };

/** The session to show: the live one, else the next scheduled one, else the last closed one (as display_session() in SQL). */
export function displaySession(rows: SessionRow[]): SessionRow | null {
  const live = rows.filter((s) => s.status === 'live').sort((a, b) => b.number - a.number)[0];
  if (live) return live;
  const lastClosed = Math.max(0, ...rows.filter((s) => s.status === 'closed').map((s) => s.number));
  const next = rows.filter((s) => s.status === 'scheduled' && s.number > lastClosed).sort((a, b) => a.number - b.number)[0];
  if (next) return next;
  return rows.filter((s) => s.status === 'closed').sort((a, b) => b.number - a.number)[0] ?? null;
}
/** The session whose roll call and speakers' list count now: the live one, else the last one that ran. */
export function currentSession(rows: SessionRow[]): SessionRow | null {
  return rows.filter((s) => s.status === 'live').sort((a, b) => b.number - a.number)[0]
    ?? rows.filter((s) => s.status === 'closed').sort((a, b) => b.number - a.number)[0] ?? null;
}
export async function sessionRows(sb: Sb, committeeId: string): Promise<SessionRow[]> {
  return q<SessionRow[]>(sb.from('sessions').select('id, number, status, started_at, roll_open').eq('committee_id', committeeId).order('number'));
}

export const EMPTY_TIMER: Timer = { kind: 'session', label: null, durationSeconds: 0, running: false, endsAt: null, remainingSeconds: 0, speaker: null };
export function toTimer(r: Pick<LiveRow, 'timer_kind' | 'timer_label' | 'timer_duration' | 'timer_running' | 'timer_ends_at' | 'timer_remaining' | 'timer_speaker_seat_id'> | null,
  speakerLabel: string | null): Timer {
  if (!r) return { ...EMPTY_TIMER };
  return {
    kind: r.timer_kind, label: r.timer_label, durationSeconds: r.timer_duration, running: r.timer_running,
    endsAt: r.timer_running ? r.timer_ends_at : null, remainingSeconds: r.timer_remaining,
    speaker: r.timer_speaker_seat_id ? { id: r.timer_speaker_seat_id, label: speakerLabel ?? 'Seat removed' } : null,
  };
}

export async function loadLive(sb: Sb, committee: CommitteeRow): Promise<CommitteeLive> {
  const [row, sessions] = await Promise.all([
    q<LiveRow | null>(sb.from('committee_live').select('committee_id, agenda_item, current_motion, timer_kind, timer_label, timer_duration, timer_running, timer_ends_at, timer_remaining, timer_speaker_seat_id, updated_at')
      .eq('committee_id', committee.id).maybeSingle()),
    sessionRows(sb, committee.id),
  ]);
  let speakerLabel: string | null = null;
  if (row?.timer_speaker_seat_id) {
    const s = await q<{ label: string } | null>(sb.from('seats').select('label').eq('id', row.timer_speaker_seat_id).maybeSingle());
    speakerLabel = s?.label ?? null;
  }
  const s = displaySession(sessions);
  return {
    committee: toCommitteeRef(committee), room: committee.room,
    session: s ? { number: s.number, status: s.status, startedAt: s.started_at } : null,
    agendaItem: row?.agenda_item ?? null, currentMotion: row?.current_motion ?? null,
    timer: toTimer(row, speakerLabel), updatedAt: row?.updated_at ?? new Date().toISOString(),
  };
}

// ───────────────────────── Speakers ─────────────────────────
type SpeakerRow = { id: string; seat_id: string; position: number; status: Speaker['status']; session_id: string | null; created_at: string };
const SPEAKER_ORDER = { speaking: 0, waiting: 1, done: 2 } as const;
/** Speaking first, then the queue (1..n), then who already spoke this session (latest first). */
export async function loadSpeakers(sb: Sb, committeeId: string, mySeatId: string | null): Promise<Speaker[]> {
  const [sessions, seats] = await Promise.all([sessionRows(sb, committeeId), seatRows(sb, committeeId)]);
  const cur = currentSession(sessions);
  let req = sb.from('speakers').select('id, seat_id, position, status, session_id, created_at').eq('committee_id', committeeId);
  req = cur ? req.or(`status.in.(waiting,speaking),and(status.eq.done,session_id.eq.${cur.id})`) : req.in('status', ['waiting', 'speaking']);
  const rows = await q<SpeakerRow[]>(req);
  const seat = labeller(seats);
  return rows
    .sort((a, b) => SPEAKER_ORDER[a.status] - SPEAKER_ORDER[b.status]
      || (a.status === 'done' ? b.created_at.localeCompare(a.created_at) : a.position - b.position))
    .map((r) => ({ id: r.id, seat: seat(r.seat_id), position: r.status === 'waiting' ? r.position : 0, status: r.status, isMe: !!mySeatId && r.seat_id === mySeatId }));
}

// ───────────────────────── Votes ─────────────────────────
type VoteRpcRow = {
  id: string; target: Vote['target']; target_id: string | null; title: string; majority: Vote['majority']; status: Vote['status'];
  opened_at: string; closed_at: string | null; my_vote: VoteChoice | null; yes_count: number | null; no_count: number | null;
  abstain_count: number | null; not_voted: number | null; passed: boolean | null;
};
export async function loadVotes(sb: Sb, committeeId: string, dais: boolean): Promise<Vote[]> {
  const rows = await q<VoteRpcRow[]>(sb.rpc('committee_votes', { p_committee: committeeId }));
  return (rows ?? []).map((r) => ({
    id: r.id, target: r.target, targetId: r.target_id, title: r.title, majority: r.majority, status: r.status,
    openedAt: r.opened_at, closedAt: r.closed_at,
    myVote: dais ? null : r.my_vote,
    counts: r.yes_count === null ? null : { yes: r.yes_count, no: r.no_count ?? 0, abstain: r.abstain_count ?? 0, notVoted: r.not_voted ?? 0 },
    passed: r.status === 'closed' ? r.passed : null,
  }));
}

// ───────────────────────── Papers ─────────────────────────
export function toPaper(r: { file_path: string | null; original_name: string | null; submitted_at: string | null; seen_at: string | null } | null,
  dueAt: string | null): PositionPaper {
  if (!r || !r.file_path || !r.submitted_at) return { status: 'not_sent', fileName: null, submittedAt: null, seenAt: null };
  const status = r.seen_at ? 'seen' : dueAt && Date.parse(r.submitted_at) > Date.parse(dueAt) ? 'late' : 'submitted';
  return { status, fileName: r.original_name ?? r.file_path.split('/').pop() ?? null, submittedAt: r.submitted_at, seenAt: r.seen_at };
}

// ───────────────────────── Resolutions ─────────────────────────
export type DocRow = {
  id: string; committee_id: string; type: Resolution['kind']; number: string | null; title: string; body: string | null;
  file_path: string | null; original_name: string | null; parent_id: string | null; clause: string | null;
  status: 'submitted' | 'approved' | 'rejected' | 'voting' | 'passed' | 'failed'; return_comment: string | null;
  submitted_by: string | null; submitted_seat_id: string | null; submitted_at: string | null; created_at: string; updated_at: string;
};
export const DOC_COLS = 'id, committee_id, type, number, title, body, file_path, original_name, parent_id, clause, status, return_comment, submitted_by, submitted_seat_id, submitted_at, created_at, updated_at';
export const docStatus = (r: DocRow): ResolutionStatus => (r.submitted_at === null ? 'draft' : r.status === 'rejected' ? 'returned' : r.status);

export async function loadResolutions(sb: Sb, committeeId: string, uid: string, order: 'updated' | 'inbox'): Promise<Resolution[]> {
  const [rows, seats] = await Promise.all([
    q<DocRow[]>(sb.from('documents').select(DOC_COLS).eq('committee_id', committeeId).order('updated_at', { ascending: false }).limit(500)),
    seatRows(sb, committeeId),
  ]);
  const ids = rows.map((r) => r.id);
  const sponsors = ids.length
    ? await q<{ document_id: string; seat_id: string; role: 'sponsor' | 'signatory' }[]>(sb.from('document_sponsors').select('document_id, seat_id, role').in('document_id', ids))
    : [];
  const seat = labeller(seats);
  const list = rows.map((r): Resolution => ({
    id: r.id, kind: r.type, number: r.number, title: r.title, body: r.body,
    fileName: r.original_name ?? (r.file_path ? r.file_path.split('/').pop() ?? null : null),
    parentId: r.parent_id, clause: r.clause, status: docStatus(r), returnComment: r.return_comment,
    sponsors: sponsors.filter((s) => s.document_id === r.id && s.role === 'sponsor').map((s) => seat(s.seat_id)).sort((a, b) => a.label.localeCompare(b.label)),
    signatories: sponsors.filter((s) => s.document_id === r.id && s.role === 'signatory').map((s) => seat(s.seat_id)).sort((a, b) => a.label.localeCompare(b.label)),
    submittedBy: r.submitted_seat_id ? seat(r.submitted_seat_id) : null,
    mine: r.submitted_by === uid, createdAt: r.created_at, updatedAt: r.updated_at,
  }));
  if (order === 'inbox') {
    const rank: Record<ResolutionStatus, number> = { submitted: 0, voting: 1, approved: 2, returned: 3, passed: 4, failed: 5, draft: 6 };
    return list.filter((r) => r.status !== 'draft' || r.mine)
      .sort((a, b) => rank[a.status] - rank[b.status] || b.updatedAt.localeCompare(a.updatedAt));
  }
  return list;
}

// ───────────────────────── Chits ─────────────────────────
type NoteRow = { id: string; from_seat_id: string | null; to_seat_id: string | null; body: string; reply_to: string | null; status: 'pending' | 'delivered' | 'rejected'; created_at: string };
export async function loadChits(sb: Sb, committeeId: string, viewer: { seatId: string } | 'dais'): Promise<Chit[]> {
  const [rows, seats] = await Promise.all([
    q<NoteRow[]>(sb.from('notes').select('id, from_seat_id, to_seat_id, body, reply_to, status, created_at')
      .eq('committee_id', committeeId).order('created_at', { ascending: false }).limit(500)),
    seatRows(sb, committeeId),
  ]);
  const seat = labeller(seats);
  return rows.map((r) => ({
    id: r.id, from: r.from_seat_id ? seat(r.from_seat_id) : null, to: r.to_seat_id ? seat(r.to_seat_id) : null,
    body: r.body, replyTo: r.reply_to, status: r.status === 'rejected' ? 'blocked' : r.status,
    direction: viewer === 'dais'
      ? (r.from_seat_id === null ? 'out' : r.to_seat_id === null ? 'in' : 'other')
      : (r.from_seat_id === viewer.seatId ? 'out' : 'in'),
    createdAt: r.created_at,
  }));
}

// ───────────────────────── Files ─────────────────────────
type FileRow = {
  id: string; scope: 'conference' | 'committee' | 'mine'; committee_id: string | null; owner_id: string | null; title: string;
  kind: LibraryFile['kind']; file_path: string | null; original_name: string | null; link: string | null; size_bytes: number | null;
  added_by_label: string | null; created_at: string;
};
const FILE_COLS = 'id, scope, committee_id, owner_id, title, kind, file_path, original_name, link, size_bytes, added_by_label, created_at';
const SCOPE_ORDER: Record<LibraryFile['scope'], number> = { conference: 0, committee: 1, mine: 2, shared_with_me: 3 };

/** Files the caller can see (RLS), narrowed by `where`, as the contract's LibraryFile. */
export async function loadFiles(sb: Sb, uid: string, opts: {
  where: (r: FileRow) => boolean; canRemove: (r: FileRow) => boolean;
}): Promise<LibraryFile[]> {
  const rows = (await q<FileRow[]>(sb.from('library_files').select(FILE_COLS).order('created_at', { ascending: false }).limit(1000))).filter(opts.where);
  const mineIds = rows.filter((r) => r.scope === 'mine' && r.owner_id === uid).map((r) => r.id);
  const shares = mineIds.length ? await q<{ file_id: string; seat_id: string }[]>(sb.from('library_shares').select('file_id, seat_id').in('file_id', mineIds)) : [];
  const seatIds = [...new Set(shares.map((s) => s.seat_id))];
  const seats = seatIds.length ? await q<{ id: string; label: string }[]>(sb.from('seats').select('id, label').in('id', seatIds)) : [];
  const seat = labeller(seats);
  return rows.map((r): LibraryFile => {
    const scope: LibraryFile['scope'] = r.scope === 'mine' ? (r.owner_id === uid ? 'mine' : 'shared_with_me') : r.scope;
    return {
      id: r.id, title: r.title, kind: r.kind, scope,
      fileName: r.file_path ? r.original_name ?? r.file_path.split('/').pop() ?? null : null,
      link: r.link, sizeBytes: r.size_bytes, addedBy: r.added_by_label, addedAt: r.created_at, committeeId: r.committee_id,
      sharedWith: scope === 'mine' ? shares.filter((s) => s.file_id === r.id).map((s) => seat(s.seat_id)).sort((a, b) => a.label.localeCompare(b.label)) : [],
      canRemove: opts.canRemove(r),
    };
  }).sort((a, b) => SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope] || b.addedAt.localeCompare(a.addedAt));
}

/** Uploads (if a file) and records a library file. `folder` is conference/ | committee/<id>/ | mine/<uid>/. */
export async function addLibraryFile(sb: Sb, input: FileInput, target: { scope: 'conference' | 'committee' | 'mine'; committeeId: string | null; folder: string }) {
  if (!input || typeof input !== 'object') fail('Choose a file or add a link.');
  const title = cleanText(input.title, 'The title', 160);
  const kind = FILE_KINDS.includes(input.kind) ? input.kind : fail('Choose what kind of file this is.');
  const hasFile = !!input.file;
  const hasLink = typeof input.link === 'string' && input.link.trim() !== '';
  if (hasFile === hasLink) fail('Add a file or a link, not both.');
  const share = target.scope === 'mine' ? uniqIds(input.shareWithSeatIds) : [];
  let path: string | null = null;
  if (input.file) {
    const f = input.file;
    if (f.size === 0) fail('That file is empty. Choose it again.');
    if (f.size > 20 * 1024 * 1024) fail('That file is over 20 MB. Upload a smaller one.');
    if (f.type && !LIBRARY_TYPES.has(f.type)) fail('That file type is not allowed. Use PDF, Word, PowerPoint, Excel, text or an image.');
    path = `${target.folder}${newId()}-${safeName(f.name)}`;
    const { error } = await sb.storage.from('library').upload(path, f, { contentType: f.type || undefined, upsert: false, cacheControl: '3600' });
    if (error) friendly({ message: error.message });
  }
  const { error } = await sb.rpc('add_library_file', {
    p_scope: target.scope, p_committee: target.committeeId, p_title: title, p_kind: kind,
    p_file_path: path, p_original_name: input.file ? input.file.name.slice(0, 200) : null,
    p_link: hasLink ? cleanLink(input.link) : null, p_size: input.file ? input.file.size : null, p_share: share,
  });
  if (error) {
    if (path) await sb.storage.from('library').remove([path]);
    friendly(error);
  }
}
export async function removeLibraryFile(sb: Sb, id: string) {
  const path = await q<string | null>(sb.rpc('remove_library_file', { p_file: id }));
  if (path) {
    const { error } = await sb.storage.from('library').remove([path]);
    if (error) console.error('[supabase storage] could not delete', path, error);   // the row is gone; the file is unreachable
  }
}
export async function openLibraryFile(sb: Sb, id: string): Promise<string> {
  const r = await q<{ file_path: string | null; link: string | null } | null>(sb.from('library_files').select('file_path, link').eq('id', id).maybeSingle());
  if (!r) fail('That file is no longer available.');
  if (r.link) return r.link;
  return signedUrl(sb, 'library', r.file_path!);
}
export async function signedUrl(sb: Sb, bucket: string, path: string): Promise<string> {
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) friendly({ message: error?.message ?? 'That file is no longer available.' });
  return data.signedUrl;
}

// ───────────────────────── Awards ─────────────────────────
export function cleanCriteria(raw: unknown): Criterion[] {
  if (!Array.isArray(raw)) return DEFAULT_CRITERIA.map((c) => ({ ...c }));
  const out = raw.filter((c): c is Criterion => !!c && typeof c.key === 'string' && typeof c.label === 'string' && typeof c.max === 'number')
    .map((c) => ({ key: c.key, label: c.label, max: c.max }));
  return out.length ? out : DEFAULT_CRITERIA.map((c) => ({ ...c }));
}
export async function loadCriteria(sb: Sb, committeeId: string): Promise<Criterion[]> {
  const r = await q<{ criteria: unknown } | null>(sb.from('committee_criteria').select('criteria').eq('committee_id', committeeId).maybeSingle());
  return cleanCriteria(r?.criteria);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Ranking maths (the same as the demo), per seat and criterion:
 *   1. in each session, average the marks every chair gave for that criterion;
 *   2. average those session values over the sessions where it was scored → byCriterion;
 *   3. total = the sum of byCriterion over the committee's current criteria.
 * byChair uses the same maths on one chair's sheets. Best first; ties by seat name.
 */
export async function loadRanking(sb: Sb, committeeId: string): Promise<RankingRow[]> {
  const [criteria, seats, sessions, chairs] = await Promise.all([
    loadCriteria(sb, committeeId),
    q<{ seat_id: string; seat_label: string; delegates: string[] }[]>(sb.rpc('dais_seats', { p_committee: committeeId })),
    sessionRows(sb, committeeId),
    q<{ profile_id: string; full_name: string | null }[]>(sb.rpc('committee_chairs', { p_committee: committeeId })),
  ]);
  const sessionNo = new Map(sessions.map((s) => [s.id, s.number]));
  const sheets = sessions.length
    ? await all<{ session_id: string; seat_id: string; chair_id: string; criteria: Record<string, unknown> }>((a, b) =>
      sb.from('scores').select('session_id, seat_id, chair_id, criteria').in('session_id', sessions.map((s) => s.id)).order('session_id').range(a, b))
    : [];
  const names = new Map(chairs.map((c) => [c.profile_id, c.full_name]));
  const totals = (rows: typeof sheets) => {
    const byCriterion: Record<string, number> = {};
    const scored = new Set<number>();
    for (const c of criteria) {
      const perSession = new Map<number, number[]>();
      for (const r of rows) {
        const v = r.criteria?.[c.key];
        if (typeof v !== 'number' || v < 1 || v > c.max) continue;
        const n = sessionNo.get(r.session_id) ?? 0;
        scored.add(n);
        perSession.set(n, [...(perSession.get(n) ?? []), v]);
      }
      if (perSession.size) byCriterion[c.key] = round2(mean([...perSession.values()].map(mean)));
    }
    return { byCriterion, total: round2(Object.values(byCriterion).reduce((a, b) => a + b, 0)), sessions: scored.size };
  };
  return (seats ?? []).map((s): RankingRow => {
    const mine = sheets.filter((x) => x.seat_id === s.seat_id);
    const t = totals(mine);
    return {
      seat: { id: s.seat_id, label: s.seat_label }, delegates: s.delegates ?? [],
      total: t.total, byCriterion: t.byCriterion, sessionsScored: t.sessions,
      byChair: [...new Set(mine.map((x) => x.chair_id))]
        .map((id) => ({ chairId: id, chairName: names.get(id) ?? null, total: totals(mine.filter((x) => x.chair_id === id)).total }))
        .sort((a, b) => (a.chairName ?? '').localeCompare(b.chairName ?? '')),
    };
  }).sort((a, b) => b.total - a.total || a.seat.label.localeCompare(b.seat.label));
}

// ───────────────────────── Realtime ─────────────────────────
export type Watch = { table: string; filter?: string; topics: Topic[]; also?: () => void };

/**
 * Subscribes to postgres changes (RLS applies per subscriber) and reports contract Topics.
 * Bursts are merged: each topic fires at most once per 150 ms.
 */
export function watchTables(sb: Sb, name: string, watches: Watch[], cb: (t: Topic) => void): Unsubscribe {
  const pending = new Set<Topic>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  const flush = () => {
    timer = null;
    const list = [...pending];
    pending.clear();
    for (const t of list) if (!stopped) cb(t);
  };
  const channel = sb.channel(`${name}-${newId()}`);
  for (const w of watches) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table: w.table, ...(w.filter ? { filter: w.filter } : {}) }, () => {
      w.also?.();
      w.topics.forEach((t) => pending.add(t));
      timer ??= setTimeout(flush, 150);
    });
  }
  channel.subscribe();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    void sb.removeChannel(channel);
  };
}

/** The tables every dashboard listens to, whatever the committee. */
export const CONFERENCE_WATCHES: Watch[] = [
  { table: 'settings', topics: ['phase'] },
  { table: 'announcements', topics: ['announcements'] },
  { table: 'schedule_items', topics: ['schedule'] },
  { table: 'deadlines', topics: ['schedule', 'papers'] },
  { table: 'library_files', topics: ['files'] },
  { table: 'library_shares', topics: ['files'] },
];

/** The tables of one committee's room. */
export function committeeWatches(committeeId: string, opts: { scores: boolean }): Watch[] {
  const f = `committee_id=eq.${committeeId}`;
  const list: Watch[] = [
    { table: 'committee_live', filter: f, topics: ['live'] },
    { table: 'committees', filter: `id=eq.${committeeId}`, topics: ['live', 'seat'] },
    { table: 'sessions', filter: f, topics: ['live', 'roll', 'speakers'] },
    { table: 'roll_calls', topics: ['roll'] },
    { table: 'speakers', filter: f, topics: ['speakers'] },
    { table: 'vote_rounds', filter: f, topics: ['votes'] },
    { table: 'votes', filter: f, topics: ['votes'] },
    { table: 'documents', filter: f, topics: ['resolutions'] },
    { table: 'document_sponsors', topics: ['resolutions'] },
    { table: 'notes', filter: f, topics: ['chits'] },
  ];
  if (opts.scores) {
    list.push(
      { table: 'scores', topics: ['scores'] },
      { table: 'awards', filter: f, topics: ['scores'] },
      { table: 'committee_criteria', filter: f, topics: ['scores'] },
    );
  }
  return list;
}
