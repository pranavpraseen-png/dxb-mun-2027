// DXB MUN v2 contract: the conference-day system (spec: site/DASHBOARD-PLAN.md, build brief: site/SYSTEM.md).
// FROZEN. The three dashboards (portal/ = delegate, chair/ = dais, admin/ = secretariat) import only from here
// via '@/platform/v2'. The data layer implements it twice: demo (one shared in-browser store, so a chair tab
// drives a delegate tab) and Supabase (live). Need a change? Report it to the lead; don't edit it alone.
//
// Conventions
//   * Times are ISO strings. null = "To be announced" in the UI. Never invent a date, room or name.
//   * Every list is already sorted the way the UI shows it.
//   * Errors are thrown as Error with a plain-English message the UI can show as-is.
//   * No fees, payments, consent, code of conduct, seat acceptance, certificates or feedback anywhere.

// ───────────────────────── Shared ─────────────────────────
export type Phase = 'before' | 'live' | 'after';             // set by the secretariat
export type Role = 'delegate' | 'chair' | 'admin';
export type ChairRole = 'chair' | 'vice_chair' | 'rapporteur';
export type VoteChoice = 'yes' | 'no' | 'abstain';
export type RollStatus = 'present' | 'present_voting' | 'absent';
export type Unsubscribe = () => void;

export type CommitteeRef = { id: string; abbr: string; name: string };
export type SeatRef = { id: string; label: string };            // "France", "Minister of Finance"
export type Person = { id: string; fullName: string | null; email: string };

export type Me = { id: string; email: string; fullName: string | null; role: Role; isCore: boolean };

/** Sign in with a Google or Microsoft account (Supabase providers 'google' and 'azure'). */
export type AuthProvider = 'google' | 'microsoft';
/** aal2 = signed in AND passed the authenticator-app step this session. */
export type MfaState = { level: 'aal1' | 'aal2'; enrolled: boolean };
/** A new authenticator-app link: show `qr` (an image URL) and `secret` (to type in by hand). */
export type MfaEnrollment = { factorId: string; qr: string; secret: string };

/**
 * Sign-in is the same everywhere: email, then the 6–10 digit code from the email; or a Google / Microsoft account.
 * Secretariat accounts add an authenticator-app code (mfa); the database only treats them as admins at aal2.
 * Added 2026-11-07 (owner picked the recommended sign-in setup): providers, remember me, captcha token, mfa.
 */
export interface AuthApi {
  readonly mode: 'demo' | 'live';
  /** `captchaToken`: the bot-check token, when the bot check is switched on. */
  sendCode(email: string, captchaToken?: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  /** Leaves the page for the provider's sign-in, then comes back here signed in. */
  signInWith(provider: AuthProvider): Promise<void>;
  /** Remember me: true keeps the sign-in after the browser closes; false ends it with the browser tab. */
  setRemember(on: boolean): void;
  remembered(): boolean;
  signOut(): Promise<void>;
  onAuth(cb: (signedIn: boolean) => void): Unsubscribe;
  me(): Promise<Me>;
  mfa: {
    state(): Promise<MfaState>;
    /** Starts linking an authenticator app (drops any half-finished link first). */
    enroll(): Promise<MfaEnrollment>;
    /** Checks a 6-digit authenticator code; `factorId` when finishing a new link, else the linked app. */
    verify(code: string, factorId?: string): Promise<void>;
  };
}

// ───────────────────────── Conference-day building blocks ─────────────────────────
/**
 * The committee's shared timer. The UI computes what to show:
 *   remaining = running ? max(0, (Date.parse(endsAt) - now()) / 1000) : remainingSeconds
 * Delegates and the dais all read the same row, so every screen shows the same countdown.
 */
export type Timer = {
  kind: 'speech' | 'caucus' | 'session' | 'other';
  label: string | null;                 // "France, opening speech", "Moderated caucus: water security"
  durationSeconds: number;              // what the chair set (editable: any length 5 s – 3 h)
  running: boolean;
  endsAt: string | null;                // set while running
  remainingSeconds: number;             // while paused / stopped
  speaker: SeatRef | null;              // who is speaking, for kind 'speech'
};

export type CommitteeLive = {
  committee: CommitteeRef;
  room: string | null;
  session: { number: number; status: 'scheduled' | 'live' | 'closed'; startedAt: string | null } | null;   // current or next
  agendaItem: string | null;            // "Water security in arid regions"
  currentMotion: string | null;         // "Moderated caucus, 10 min total, 1 min speeches"
  timer: Timer;
  updatedAt: string;
};

export type ScheduleItem = {
  id: string; day: number;              // 1, 2, 3
  title: string;                        // "Committee session 1", "Lunch", "Opening ceremony"
  startsAt: string | null; endsAt: string | null;
  location: string | null;
  committeeId: string | null;           // null = everyone
};

export type Deadline = { key: 'position_paper' | 'resolution' | 'registration'; label: string; dueAt: string | null };

export type Announcement = {
  id: string; title: string; body: string | null; urgent: boolean;
  from: 'secretariat' | 'chair'; committeeId: string | null; publishedAt: string;
};

export type RollCall = {
  open: boolean; sessionNumber: number | null;
  rows: { seat: SeatRef; status: RollStatus | null }[];   // delegate: only their own row
};

export type Speaker = { id: string; seat: SeatRef; position: number; status: 'waiting' | 'speaking' | 'done'; isMe: boolean };

export type VoteTarget = 'motion' | 'resolution' | 'amendment';
export type Vote = {
  id: string; target: VoteTarget; targetId: string | null; title: string;   // "Motion to close debate", "DR 1.1"
  majority: 'simple' | 'two_thirds';
  status: 'open' | 'closed'; openedAt: string; closedAt: string | null;
  myVote: VoteChoice | null;            // delegate only
  counts: { yes: number; no: number; abstain: number; notVoted: number } | null;   // delegate: null while open
  passed: boolean | null;               // null while open
};

export type PaperStatus = 'not_sent' | 'submitted' | 'late' | 'seen';
export type PositionPaper = { status: PaperStatus; fileName: string | null; submittedAt: string | null; seenAt: string | null };

export type ResolutionStatus = 'draft' | 'submitted' | 'returned' | 'approved' | 'voting' | 'passed' | 'failed';
export type Resolution = {
  id: string; kind: 'working_paper' | 'draft_resolution' | 'amendment';
  number: string | null;                // "DR 1.1", given by the chair on approval
  title: string; body: string | null; fileName: string | null;
  parentId: string | null;              // amendments point at their resolution
  clause: string | null;                // amendments: which clause, e.g. "Operative 3"
  status: ResolutionStatus; returnComment: string | null;
  sponsors: SeatRef[]; signatories: SeatRef[];
  submittedBy: SeatRef | null; mine: boolean; createdAt: string; updatedAt: string;
};
export type ResolutionInput = {
  id?: string;                          // set = edit my draft
  kind: Resolution['kind']; title: string; body?: string; file?: File;
  parentId?: string; clause?: string;
  sponsorSeatIds: string[]; signatorySeatIds: string[];   // the author's seat is always a sponsor
  submit: boolean;                      // false = save as draft, true = send to the chair
};

/** Chits: short notes between seats, or to/from the dais. The dais can read every chit. */
export type Chit = {
  id: string; from: SeatRef | null; to: SeatRef | null;   // null = the dais
  body: string; replyTo: string | null;
  status: 'pending' | 'delivered' | 'blocked';            // chairs may hold a chit back
  direction: 'in' | 'out' | 'other';                      // relative to the viewer; 'other' = dais watching
  createdAt: string;
};

/** Private notes: only the writer ever sees them. */
export type NoteTag = 'poi' | 'doubt' | 'speech' | 'general';
export type MyNote = { id: string; body: string; tag: NoteTag; done: boolean; createdAt: string; updatedAt: string };

/** Files: conference-wide, committee, or a delegate's own (+ button). Links are allowed instead of files. */
export type FileKind = 'guide' | 'rules' | 'handbook' | 'schedule' | 'map' | 'research' | 'other';
export type FileScope = 'conference' | 'committee' | 'mine' | 'shared_with_me';
export type LibraryFile = {
  id: string; title: string; kind: FileKind; scope: FileScope;
  fileName: string | null; link: string | null; sizeBytes: number | null;
  addedBy: string | null; addedAt: string;
  committeeId: string | null;
  sharedWith: SeatRef[];                // only for my own files
  canRemove: boolean;
};
export type FileInput = { title: string; kind: FileKind; file?: File; link?: string; shareWithSeatIds?: string[] };   // exactly one of file / link

// ───────────────────────── Delegate ─────────────────────────
export type Registration = {
  status: 'applied' | 'allocated' | 'withdrawn' | 'rejected';
  fullName: string; schoolName: string; grade: string;
  choices: CommitteeRef[];               // ranked 1–3
  createdAt: string;
};
export type MySeat = {
  committee: CommitteeRef; seat: SeatRef; room: string | null;
  partner: string | null;                // double delegation
  chairs: { fullName: string | null; role: ChairRole }[];
  checkinCode: string;                   // shown as a QR at the desk
};

export interface DelegateApi extends AuthApi {
  phase(): Promise<Phase>;
  committees(): Promise<CommitteeRef[]>;
  // Sign-up (no fees): name, school, grade, three committee choices
  registration(): Promise<Registration | null>;   // null = not signed up yet
  signUp(input: { fullName: string; schoolName: string; grade: string; committeeIds: string[] }): Promise<void>;
  seat(): Promise<MySeat | null>;                  // null until the secretariat allocates
  // Room
  live(): Promise<CommitteeLive | null>;           // null until allocated
  schedule(): Promise<ScheduleItem[]>;
  deadlines(): Promise<Deadline[]>;
  announcements(): Promise<Announcement[]>;
  committeeSeats(): Promise<SeatRef[]>;            // for sponsors, chits and sharing
  rollCall(): Promise<RollCall>;
  answerRoll(status: 'present' | 'present_voting'): Promise<void>;   // only while open
  speakers(): Promise<Speaker[]>;
  joinSpeakers(): Promise<void>;
  leaveSpeakers(): Promise<void>;
  votes(): Promise<Vote[]>;                        // open first, then the most recent closed
  castVote(voteId: string, choice: VoteChoice): Promise<void>;   // abstain not allowed if I answered present_voting
  // Papers and resolutions
  positionPaper(): Promise<PositionPaper>;
  uploadPositionPaper(file: File): Promise<void>;  // PDF or DOCX, max 10 MB; replaces the old one
  resolutions(): Promise<Resolution[]>;            // mine, ones I sponsor/sign, and every approved one in my committee
  saveResolution(input: ResolutionInput): Promise<string>;   // returns the id
  // Notes
  chits(): Promise<Chit[]>;
  sendChit(toSeatId: string | null, body: string, replyTo?: string): Promise<void>;   // body 1–300 chars; null = the dais
  myNotes(): Promise<MyNote[]>;
  saveNote(input: { id?: string; body: string; tag: NoteTag }): Promise<string>;
  setNoteDone(id: string, done: boolean): Promise<void>;
  deleteNote(id: string): Promise<void>;
  // Files
  files(): Promise<LibraryFile[]>;
  addFile(input: FileInput): Promise<void>;        // always scope 'mine'
  shareFile(id: string, seatIds: string[]): Promise<void>;
  removeFile(id: string): Promise<void>;
  openFile(id: string): Promise<string>;           // a URL to open in a new tab
  /** Live updates. cb names what changed; the UI re-fetches that. */
  subscribe(cb: (what: Topic) => void): Unsubscribe;
}
export type Topic = 'live' | 'roll' | 'speakers' | 'votes' | 'resolutions' | 'chits' | 'files' | 'announcements' | 'schedule' | 'phase' | 'seat' | 'papers' | 'scores';

// ───────────────────────── Chair (dais) ─────────────────────────
export type ChairCommittee = CommitteeRef & { myRole: ChairRole; room: string | null };
export type DaisSeat = {
  seat: SeatRef; delegates: string[];    // full names (1, or 2 for a double delegation); empty = unfilled
  checkedIn: boolean;
};
export type PaperRow = { seat: SeatRef; delegates: string[]; paper: PositionPaper };

/** Awards rubric. Criteria are editable per committee; each is scored 1..max. */
export type Criterion = { key: string; label: string; max: number };
export const DEFAULT_CRITERIA: Criterion[] = [
  { key: 'speeches', label: 'Speeches', max: 10 },
  { key: 'pois', label: 'POIs', max: 10 },
  { key: 'diplomacy', label: 'Diplomacy', max: 10 },
  { key: 'resolution', label: 'Resolution work', max: 10 },
  { key: 'knowledge', label: 'Knowledge of agenda', max: 10 },
  { key: 'paper', label: 'Position paper', max: 10 },
];
export const DEFAULT_AWARDS = ['Best Delegate', 'High Commendation', 'Special Mention', 'Best Position Paper'] as const;
export type ScoreSheet = {
  seatId: string; sessionNumber: number; chairId: string;
  marks: Record<string, number>;         // criterion key → 1..max; missing = not scored
  comment: string | null; updatedAt: string;
};
export type RankingRow = {
  seat: SeatRef; delegates: string[];
  total: number;                          // average per scored session, summed over criteria, all chairs
  byCriterion: Record<string, number>;    // average mark per criterion
  sessionsScored: number;
  byChair: { chairId: string; chairName: string | null; total: number }[];
};
export type Nomination = { id: string; seat: SeatRef; award: string; nominatedBy: string | null; final: boolean };

export interface ChairApi extends AuthApi {
  phase(): Promise<Phase>;
  myCommittees(): Promise<ChairCommittee[]>;      // admins see every committee
  // Run the session (every call takes the committee id)
  live(c: string): Promise<CommitteeLive>;
  startSession(c: string): Promise<void>;         // opens the next session number
  endSession(c: string): Promise<void>;
  setAgenda(c: string, input: { agendaItem: string | null; currentMotion: string | null }): Promise<void>;
  // Timer: the length is always editable
  setTimer(c: string, input: { kind: Timer['kind']; label: string | null; durationSeconds: number; speakerSeatId?: string | null }): Promise<void>;   // stops and loads it
  startTimer(c: string): Promise<void>;
  pauseTimer(c: string): Promise<void>;
  resetTimer(c: string): Promise<void>;           // back to durationSeconds, stopped
  addTime(c: string, seconds: number): Promise<void>;   // may be negative; works while running
  // People in the room
  seats(c: string): Promise<DaisSeat[]>;
  rollCall(c: string): Promise<RollCall>;
  openRoll(c: string): Promise<void>;
  closeRoll(c: string): Promise<void>;            // unanswered seats become absent
  markRoll(c: string, seatId: string, status: RollStatus): Promise<void>;
  speakers(c: string): Promise<Speaker[]>;
  addSpeaker(c: string, seatId: string): Promise<void>;
  moveSpeaker(id: string, toPosition: number): Promise<void>;
  removeSpeaker(id: string): Promise<void>;
  nextSpeaker(c: string, speechSeconds: number): Promise<void>;   // marks the current one done, loads + starts the timer for the next
  // Votes
  votes(c: string): Promise<Vote[]>;              // counts always visible to the dais
  openVote(c: string, input: { target: VoteTarget; targetId?: string | null; title: string; majority: Vote['majority'] }): Promise<string>;
  closeVote(voteId: string): Promise<void>;
  recordCount(voteId: string, counts: { yes: number; no: number; abstain: number }): Promise<void>;   // placard count instead of phones
  // Papers and resolutions
  papers(c: string): Promise<PaperRow[]>;
  openPaper(c: string, seatId: string): Promise<string>;
  markPaperSeen(c: string, seatId: string): Promise<void>;
  resolutions(c: string): Promise<Resolution[]>;  // everything except other people's drafts
  approveResolution(id: string, number: string): Promise<void>;
  returnResolution(id: string, comment: string): Promise<void>;
  // Chits
  chits(c: string): Promise<Chit[]>;              // every chit in the committee
  setChitStatus(id: string, status: 'delivered' | 'blocked'): Promise<void>;
  sendChit(c: string, toSeatId: string | null, body: string, replyTo?: string): Promise<void>;   // from the dais; null = all seats
  // Committee files and notices
  files(c: string): Promise<LibraryFile[]>;      // conference + this committee's
  addFile(c: string, input: FileInput): Promise<void>;   // scope 'committee'
  removeFile(id: string): Promise<void>;
  openFile(id: string): Promise<string>;
  announcements(c: string): Promise<Announcement[]>;
  announce(c: string, input: { title: string; body: string | null; urgent: boolean }): Promise<void>;
  // Awards rubric (never visible to delegates)
  criteria(c: string): Promise<Criterion[]>;      // DEFAULT_CRITERIA until edited
  setCriteria(c: string, criteria: Criterion[]): Promise<void>;
  scores(c: string, sessionNumber: number): Promise<ScoreSheet[]>;   // only my own sheets
  saveScore(c: string, input: { seatId: string; sessionNumber: number; marks: Record<string, number>; comment: string | null }): Promise<void>;
  ranking(c: string): Promise<RankingRow[]>;      // all chairs of this committee combined, best first
  nominations(c: string): Promise<Nomination[]>;
  nominate(c: string, seatId: string, award: string): Promise<void>;
  removeNomination(id: string): Promise<void>;
  subscribe(c: string, cb: (what: Topic) => void): Unsubscribe;
}

// ───────────────────────── Secretariat ─────────────────────────
export type Committee = CommitteeRef & { sort: number; room: string | null; seats: number; filled: number };
export type Seat = { id: string; committeeId: string; label: string; capacity: 1 | 2; holders: { registrationId: string; fullName: string }[] };
export type Applicant = {
  registrationId: string; person: Person; fullName: string; schoolName: string; grade: string;
  choices: CommitteeRef[]; status: Registration['status'];
  seat: { id: string; label: string; committeeId: string } | null;
  checkedIn: boolean; createdAt: string;
};
export type TeamMember = Person & { role: Role; isCore: boolean; chairs: { committeeId: string; role: ChairRole }[] };
export type OverviewRow = {
  committee: CommitteeRef; room: string | null;
  session: CommitteeLive['session']; agendaItem: string | null; timer: Timer;
  seats: number; present: number | null;  // null = no roll call yet this session
  openVote: string | null;                // title of the open vote
  resolutionsPassed: number; chitsWaiting: number; papersIn: number;
};
export type CheckinResult = { first: boolean; fullName: string; committee: CommitteeRef | null; seat: SeatRef | null };

export interface SecretariatApi extends AuthApi {
  // Conference
  phase(): Promise<Phase>;
  setPhase(p: Phase): Promise<void>;
  overview(): Promise<OverviewRow[]>;
  // Committees, seats and delegates
  committees(): Promise<Committee[]>;
  saveCommittee(input: { id?: string; abbr: string; name: string; room: string | null; sort?: number }): Promise<void>;
  seats(committeeId: string): Promise<Seat[]>;
  addSeats(committeeId: string, labels: string[], capacity: 1 | 2): Promise<{ added: number; skipped: string[] }>;
  removeSeat(seatId: string): Promise<void>;      // only if empty
  applicants(): Promise<Applicant[]>;
  setApplicantStatus(registrationId: string, status: 'applied' | 'withdrawn' | 'rejected'): Promise<void>;
  assignSeat(registrationId: string, seatId: string | null): Promise<void>;   // assigning sets status 'allocated'
  // Team
  team(query: string): Promise<TeamMember[]>;     // search by name or email; '' = everyone with a role above delegate
  setRole(profileId: string, role: Role, isCore?: boolean): Promise<void>;
  addChair(committeeId: string, profileId: string, role: ChairRole): Promise<void>;
  removeChair(committeeId: string, profileId: string): Promise<void>;
  // Schedule and deadlines
  schedule(): Promise<ScheduleItem[]>;
  saveScheduleItem(input: Omit<ScheduleItem, 'id'> & { id?: string }): Promise<void>;
  removeScheduleItem(id: string): Promise<void>;
  deadlines(): Promise<Deadline[]>;
  setDeadline(key: Deadline['key'], dueAt: string | null): Promise<void>;
  // Files and notices
  files(): Promise<LibraryFile[]>;               // conference-wide + every committee's
  addFile(input: FileInput & { committeeId: string | null }): Promise<void>;
  removeFile(id: string): Promise<void>;
  openFile(id: string): Promise<string>;
  announcements(): Promise<Announcement[]>;
  announce(input: { title: string; body: string | null; urgent: boolean; audience: 'all' | 'delegates' | 'chairs' | 'committee'; committeeId: string | null }): Promise<void>;
  removeAnnouncement(id: string): Promise<void>;
  // Check-in
  checkin(code: string, day: 1 | 2 | 3): Promise<CheckinResult>;
  // Awards
  ranking(committeeId: string): Promise<RankingRow[]>;
  nominations(committeeId: string | null): Promise<(Nomination & { committee: CommitteeRef })[]>;   // null = all committees
  setFinal(nominationId: string, final: boolean): Promise<void>;
  subscribe(cb: (what: Topic) => void): Unsubscribe;
}
