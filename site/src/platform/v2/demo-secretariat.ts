// Demo SecretariatApi over the shared demo store: set-up, seats, team, schedule, files, notices, check-in, awards.
//
// Choices made where the contract leaves room:
//   * Every call needs an admin. Changing roles and chairs needs a core member (isCore); you can't change your own role.
//   * overview().chitsWaiting = chits to the dais from a seat that the dais has not replied to yet (chits are
//     delivered by default, so 'pending' never piles up in the demo). papersIn = papers sent (submitted, late or seen).
//   * checkin(code, day): `first` is true the first time that code checks in on that day.
//   * A new committee gets the default timer, criteria and session 1 'scheduled'; its seats are added separately.
import {
  type Applicant, type ChairRole, type CheckinResult, type Committee, type OverviewRow, type Phase, type Role, type Seat,
  type SecretariatApi, type TeamMember,
} from './contract';
import {
  announcementView, awardRank, checkLibraryFile, cleanIso, cleanLink, cleanText, clone, committeeRef, committeesSorted, demoAuth, fail,
  fileView, filledSeatCount, holdersOf, liveView, newestFirst, openUrl, optText, paperView, pause, profileName, rankingFor, scheduleSorted,
  seatRef, seatsOf, signedInProfile, sortFiles, subscribeFiltered,
} from './demo-common';
import { defaultTimer } from './demo-seed';
import { ensureScenario, getState, nowIso, rememberFile, scenarioFromUrl, uid, write, type DemoState, type ProfileRow } from './demo-store';

const PHASES: Phase[] = ['before', 'live', 'after'];
const ROLES: Role[] = ['delegate', 'chair', 'admin'];
const CHAIR_ROLES: ChairRole[] = ['chair', 'vice_chair', 'rapporteur'];
const STATUS_ORDER = { applied: 0, allocated: 1, withdrawn: 2, rejected: 3 } as const;
const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

function admin(s: DemoState): ProfileRow {
  const p = signedInProfile(s);
  if (p.role !== 'admin') fail('Sign in with a secretariat account to do this.');
  return p;
}
function core(s: DemoState): ProfileRow {
  const p = admin(s);
  if (!p.isCore) fail('Only core secretariat members can change the team.');
  return p;
}
function committeeExists(s: DemoState, id: unknown) {
  const c = s.committees.find((x) => x.id === id);
  if (!c) fail('That committee does not exist.');
  return c;
}

export function createDemoSecretariatApi(): SecretariatApi {
  const fromUrl = scenarioFromUrl();
  if (fromUrl) ensureScenario(fromUrl);

  const read = async <T>(fn: (s: DemoState, me: ProfileRow) => T): Promise<T> => {
    await pause();
    const s = getState();
    return clone(fn(s, admin(s)));
  };
  const change = async <T>(topics: Parameters<typeof write>[0], committeeId: string | null, fn: (s: DemoState, me: ProfileRow) => T): Promise<T> => {
    await pause();
    return write(topics, committeeId, (s) => fn(s, admin(s)));
  };

  return {
    ...demoAuth,

    // ── Conference ──
    async phase() { await pause(); return getState().phase; },
    async setPhase(p) {
      if (!PHASES.includes(p)) fail('Choose Before, Live or After.');
      await change(['phase'], null, (s) => { s.phase = p; });
    },
    overview: () => read((s) => committeesSorted(s).map((c): OverviewRow => {
      const l = liveView(s, c.id);
      const roll = s.rolls.find((r) => r.committeeId === c.id);
      const rollThisSession = roll && l.session && roll.sessionNumber === l.session.number;
      const seatIds = new Set(seatsOf(s, c.id).map((x) => x.id));
      const chits = s.chits.filter((x) => x.committeeId === c.id);
      return {
        committee: l.committee, room: c.room, session: l.session, agendaItem: l.agendaItem, timer: l.timer,
        seats: seatIds.size,
        present: rollThisSession ? Object.entries(roll.marks).filter(([id, m]) => seatIds.has(id) && m !== 'absent').length : null,
        openVote: s.votes.find((v) => v.committeeId === c.id && v.status === 'open')?.title ?? null,
        resolutionsPassed: s.resolutions.filter((r) => r.committeeId === c.id && r.status === 'passed').length,
        chitsWaiting: chits.filter((x) => x.status === 'pending' ||
          (x.fromSeatId !== null && x.toSeatId === null && !chits.some((y) => y.replyTo === x.id && y.fromSeatId === null))).length,
        papersIn: [...seatIds].filter((id) => paperView(s, id).status !== 'not_sent').length,
      };
    })),

    // ── Committees, seats and delegates ──
    committees: () => read((s) => committeesSorted(s).map((c): Committee => ({
      id: c.id, abbr: c.abbr, name: c.name, sort: c.sort, room: c.room, seats: seatsOf(s, c.id).length, filled: filledSeatCount(s, c.id),
    }))),
    async saveCommittee(input) {
      const abbr = cleanText(input?.abbr, 'A short name (like UNSC)', 12).toUpperCase();
      if (!/^[A-Z0-9&-]+$/.test(abbr)) fail('Use letters and numbers only for the short name.');
      const name = cleanText(input.name, 'The committee name', 120);
      const room = optText(input.room, 'The room', 80);
      if (input.sort !== undefined && (!Number.isInteger(input.sort) || input.sort < 0 || input.sort > 1000)) fail('The order must be a whole number.');
      await change(['seat', 'live'], input.id ?? null, (s) => {
        if (s.committees.some((c) => c.abbr === abbr && c.id !== input.id)) fail(`${abbr} is already a committee.`);
        if (input.id) {
          const c = committeeExists(s, input.id);
          Object.assign(c, { abbr, name, room, sort: input.sort ?? c.sort });
          return;
        }
        let id = `cmte-${abbr.toLowerCase()}`;
        if (s.committees.some((c) => c.id === id)) id = uid('cmte');
        s.committees.push({ id, abbr, name, room, sort: input.sort ?? s.committees.reduce((m, c) => Math.max(m, c.sort), 0) + 1 });
        s.live.push({ committeeId: id, session: { number: 1, status: 'scheduled', startedAt: null }, agendaItem: null, currentMotion: null, timer: defaultTimer(), updatedAt: nowIso() });
      });
    },
    seats: (committeeId) => read((s) => {
      committeeExists(s, committeeId);
      return seatsOf(s, committeeId).map((x): Seat => ({
        id: x.id, committeeId: x.committeeId, label: x.label, capacity: x.capacity,
        holders: holdersOf(s, x.id).map((r) => ({ registrationId: r.id, fullName: r.fullName })),
      }));
    }),
    async addSeats(committeeId, labels, capacity) {
      if (!Array.isArray(labels)) fail('Enter one seat per line.');
      if (capacity !== 1 && capacity !== 2) fail('Choose single or double delegation.');
      return change(['seat'], committeeId, (s) => {
        committeeExists(s, committeeId);
        const taken = new Set(seatsOf(s, committeeId).map((x) => x.label.toLowerCase()));
        const skipped: string[] = [];
        let added = 0;
        for (const raw of labels) {
          const label = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
          if (!label) continue;
          if (label.length > 80 || taken.has(label.toLowerCase())) { skipped.push(label); continue; }
          taken.add(label.toLowerCase());
          s.seats.push({ id: uid('seat'), committeeId, label, capacity });
          added += 1;
        }
        return { added, skipped };
      });
    },
    async removeSeat(seatId) {
      const cid = getState().seats.find((x) => x.id === seatId)?.committeeId ?? null;
      await change(['seat'], cid, (s) => {
        if (!s.seats.some((x) => x.id === seatId)) fail('That seat does not exist.');
        if (holdersOf(s, seatId).length) fail('Move the delegates off this seat first.');
        s.seats = s.seats.filter((x) => x.id !== seatId);
        s.speakers = s.speakers.filter((x) => x.seatId !== seatId);
      });
    },
    applicants: () => read((s) => s.registrations.map((r): Applicant => {
      const p = s.profiles.find((x) => x.id === r.profileId);
      const seat = r.status === 'allocated' && r.seatId ? s.seats.find((x) => x.id === r.seatId) : undefined;
      return {
        registrationId: r.id, person: { id: r.profileId, fullName: p?.fullName ?? null, email: p?.email ?? '' },
        fullName: r.fullName, schoolName: r.schoolName, grade: r.grade,
        choices: r.choiceIds.filter((id) => s.committees.some((c) => c.id === id)).map((id) => committeeRef(s, id)),
        status: r.status, seat: seat ? { id: seat.id, label: seat.label, committeeId: seat.committeeId } : null,
        checkedIn: r.checkinDays.length > 0, createdAt: r.createdAt,
      };
    }).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || byName(a.fullName, b.fullName))),
    async setApplicantStatus(registrationId, status) {
      if (status !== 'applied' && status !== 'withdrawn' && status !== 'rejected') fail('Choose Applied, Withdrawn or Rejected.');
      await change(['seat'], null, (s) => {
        const r = s.registrations.find((x) => x.id === registrationId);
        if (!r) fail('That delegate does not exist.');
        r.status = status; r.seatId = null;
      });
    },
    async assignSeat(registrationId, seatId) {
      const cid = seatId ? getState().seats.find((x) => x.id === seatId)?.committeeId ?? null : null;
      await change(['seat'], cid, (s) => {
        const r = s.registrations.find((x) => x.id === registrationId);
        if (!r) fail('That delegate does not exist.');
        if (seatId === null) { r.seatId = null; if (r.status === 'allocated') r.status = 'applied'; return; }
        const seat = s.seats.find((x) => x.id === seatId);
        if (!seat) fail('That seat does not exist.');
        const others = holdersOf(s, seatId).filter((x) => x.id !== r.id);
        if (others.length >= seat.capacity) fail(`${seat.label} is already taken.`);
        r.seatId = seatId; r.status = 'allocated';
      });
    },

    // ── Team ──
    team: (query) => read((s) => {
      const q = (query ?? '').trim().toLowerCase();
      return s.profiles
        .filter((p) => (q ? (p.fullName ?? '').toLowerCase().includes(q) || p.email.includes(q) : p.role !== 'delegate'))
        .map((p): TeamMember => ({
          id: p.id, fullName: p.fullName, email: p.email, role: p.role, isCore: p.role === 'admin' && p.isCore,
          chairs: s.chairs.filter((c) => c.profileId === p.id).map((c) => ({ committeeId: c.committeeId, role: c.role })),
        }))
        .sort((a, b) => ROLES.indexOf(b.role) - ROLES.indexOf(a.role) || byName(a.fullName ?? a.email, b.fullName ?? b.email));
    }),
    async setRole(profileId, role, isCore) {
      if (!ROLES.includes(role)) fail('Choose Delegate, Chair or Secretariat.');
      await pause();
      write(['seat'], null, (s) => {
        const me = core(s);
        const p = s.profiles.find((x) => x.id === profileId);
        if (!p) fail('That person does not exist.');
        if (p.id === me.id) fail("You can't change your own role.");
        p.role = role;
        p.isCore = role === 'admin' ? isCore ?? p.isCore : false;
        if (role === 'delegate') s.chairs = s.chairs.filter((c) => c.profileId !== p.id);
      });
    },
    async addChair(committeeId, profileId, role) {
      if (!CHAIR_ROLES.includes(role)) fail('Choose Chair, Vice chair or Rapporteur.');
      await pause();
      write(['seat'], committeeId, (s) => {
        core(s);
        committeeExists(s, committeeId);
        const p = s.profiles.find((x) => x.id === profileId);
        if (!p) fail('That person does not exist.');
        if (p.role === 'delegate') p.role = 'chair';
        s.chairs = s.chairs.filter((c) => !(c.committeeId === committeeId && c.profileId === profileId));
        s.chairs.push({ committeeId, profileId, role });
      });
    },
    async removeChair(committeeId, profileId) {
      await pause();
      write(['seat'], committeeId, (s) => {
        core(s);
        if (!s.chairs.some((c) => c.committeeId === committeeId && c.profileId === profileId)) fail('That person does not chair this committee.');
        s.chairs = s.chairs.filter((c) => !(c.committeeId === committeeId && c.profileId === profileId));
      });
    },

    // ── Schedule and deadlines ──
    schedule: () => read((s) => scheduleSorted(s.schedule)),
    async saveScheduleItem(input) {
      const day = Number(input?.day);
      if (!Number.isInteger(day) || day < 1 || day > 7) fail('Choose a day from 1 to 7.');
      const title = cleanText(input.title, 'A title', 120);
      const startsAt = cleanIso(input.startsAt, 'The start time');
      const endsAt = cleanIso(input.endsAt, 'The end time');
      if (startsAt && endsAt && endsAt < startsAt) fail('The end time must be after the start time.');
      const location = optText(input.location, 'The place', 120);
      await change(['schedule'], null, (s) => {
        const committeeId = input.committeeId ?? null;
        if (committeeId) committeeExists(s, committeeId);
        const item = { day, title, startsAt, endsAt, location, committeeId };
        if (input.id) {
          const row = s.schedule.find((x) => x.id === input.id);
          if (!row) fail('That schedule item does not exist.');
          Object.assign(row, item);
        } else s.schedule.push({ id: uid('sch'), ...item });
      });
    },
    async removeScheduleItem(id) {
      await change(['schedule'], null, (s) => {
        if (!s.schedule.some((x) => x.id === id)) fail('That schedule item does not exist.');
        s.schedule = s.schedule.filter((x) => x.id !== id);
      });
    },
    deadlines: () => read((s) => s.deadlines),
    async setDeadline(key, dueAt) {
      const due = cleanIso(dueAt, 'The deadline');
      await change(['schedule', 'papers'], null, (s) => {
        const d = s.deadlines.find((x) => x.key === key);
        if (!d) fail('That deadline does not exist.');
        d.dueAt = due;
      });
    },

    // ── Files and notices ──
    files: () => read((s) => sortFiles(s.files.filter((f) => f.scope !== 'mine').map((f) => fileView(s, f, { canRemove: true })))),
    async addFile(input) {
      if (!input || typeof input !== 'object') fail('Choose a file or paste a link.');
      const title = cleanText(input.title, 'A title', 200);
      if (!['guide', 'rules', 'handbook', 'schedule', 'map', 'research', 'other'].includes(input.kind)) fail('Choose what kind of file this is.');
      if (!input.file && !input.link) fail('Add a file or a link.');
      if (input.file && input.link) fail('Add a file or a link, not both.');
      const file = input.file ? checkLibraryFile(input.file) : null;
      const link = input.link ? cleanLink(input.link) : null;
      await change(['files'], input.committeeId ?? null, (s, me) => {
        if (input.committeeId) committeeExists(s, input.committeeId);
        s.files.push({
          id: uid('file'), title, kind: input.kind, scope: input.committeeId ? 'committee' : 'conference', committeeId: input.committeeId ?? null,
          ownerProfileId: me.id, fileName: file?.name ?? null, link, sizeBytes: file?.size ?? null, fileKey: file ? rememberFile(file) : null,
          addedBy: me.fullName, addedAt: nowIso(), sharedWithSeatIds: [],
        });
      });
    },
    async removeFile(id) {
      const cid = getState().files.find((f) => f.id === id)?.committeeId ?? null;
      await change(['files'], cid, (s) => {
        if (!s.files.some((f) => f.id === id && f.scope !== 'mine')) fail('That file does not exist.');
        s.files = s.files.filter((f) => f.id !== id);
      });
    },
    openFile: (id) => read((s) => {
      const f = s.files.find((x) => x.id === id && x.scope !== 'mine');
      if (!f) fail("That file isn't available.");
      return openUrl(f);
    }),
    announcements: () => read((s) => [...s.announcements].sort(newestFirst).map(announcementView)),
    async announce(input) {
      const title = cleanText(input?.title, 'A title', 120);
      const body = optText(input.body, 'The message', 1000, true);
      if (!['all', 'delegates', 'chairs', 'committee'].includes(input.audience)) fail('Choose who the notice is for.');
      if (input.audience === 'committee' && !input.committeeId) fail('Choose the committee.');
      const committeeId = input.audience === 'committee' ? input.committeeId : null;
      await change(['announcements'], committeeId, (s) => {
        if (committeeId) committeeExists(s, committeeId);
        s.announcements.push({ id: uid('ann'), title, body, urgent: !!input.urgent, from: 'secretariat', committeeId, audience: input.audience, publishedAt: nowIso() });
      });
    },
    async removeAnnouncement(id) {
      await change(['announcements'], null, (s) => {
        if (!s.announcements.some((a) => a.id === id)) fail('That notice does not exist.');
        s.announcements = s.announcements.filter((a) => a.id !== id);
      });
    },

    // ── Check-in ──
    async checkin(code, day) {
      const c = typeof code === 'string' ? code.trim().toUpperCase().replace(/\s+/g, '') : '';
      if (!c) fail('Scan the QR code or type the code.');
      if (day !== 1 && day !== 2 && day !== 3) fail('Choose day 1, 2 or 3.');
      return change(['seat'], null, (s): CheckinResult => {
        const r = s.registrations.find((x) => x.checkinCode.toUpperCase() === c);
        if (!r) fail('No delegate has that code. Check it and try again.');
        if (r.status === 'withdrawn' || r.status === 'rejected') fail(`${r.fullName} is not registered for the conference.`);
        const first = !r.checkinDays.includes(day);
        if (first) r.checkinDays = [...r.checkinDays, day].sort();
        const seat = r.status === 'allocated' && r.seatId ? s.seats.find((x) => x.id === r.seatId) : undefined;
        return { first, fullName: r.fullName, committee: seat ? committeeRef(s, seat.committeeId) : null, seat: seat ? seatRef(s, seat.id) : null };
      });
    },

    // ── Awards ──
    ranking: (committeeId) => read((s) => { committeeExists(s, committeeId); return rankingFor(s, committeeId); }),
    nominations: (committeeId) => read((s) => s.nominations
      .filter((n) => committeeId === null || n.committeeId === committeeId)
      .map((n) => ({ id: n.id, seat: seatRef(s, n.seatId), award: n.award, nominatedBy: profileName(s, n.nominatedBy), final: n.final, committee: committeeRef(s, n.committeeId) }))
      .sort((a, b) => (s.committees.find((c) => c.id === a.committee.id)?.sort ?? 0) - (s.committees.find((c) => c.id === b.committee.id)?.sort ?? 0)
        || awardRank(a.award) - awardRank(b.award) || a.seat.label.localeCompare(b.seat.label))),
    async setFinal(nominationId, final) {
      const cid = getState().nominations.find((n) => n.id === nominationId)?.committeeId ?? null;
      await change(['scores'], cid, (s) => {
        const n = s.nominations.find((x) => x.id === nominationId);
        if (!n) fail('That nomination does not exist.');
        n.final = !!final;
      });
    },

    subscribe(cb) { return subscribeFiltered(() => null, cb); },
  };
}
