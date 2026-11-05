// Live SecretariatApi (Supabase). Contract: ./contract.ts. Schema: 0001_init.sql + 0004_conference_day.sql.
// Writes: RPCs where 0004/0001 have one (sec_*, admin_assign_seat, admin_set_role, add/remove_library_file);
// otherwise direct writes that RLS limits to the core secretariat (committees, seats, settings, deadlines,
// schedule_items, announcements, awards.final). Direct writes return their rows, so a write RLS silently
// skipped is reported instead of looking like it worked.
import {
  DEFAULT_AWARDS,
  type Applicant, type ChairRole, type CheckinResult, type Committee, type OverviewRow, type Phase, type Role, type Seat,
  type SecretariatApi, type TeamMember, type Timer,
} from './contract';
import {
  ANN_COLS, CONFERENCE_WATCHES, addLibraryFile, all, cleanIso, cleanText, fail, getClient, labeller, loadDeadlines, loadFiles, loadMe,
  loadPhase, loadRanking, loadSchedule, makeAuth, openLibraryFile, optText, q, removeLibraryFile, requireUid, toAnnouncement,
  toCommitteeRef, toTimer, watchTables, type AnnRow, type CommitteeRow,
} from './supabase-core';

const PHASES: Phase[] = ['before', 'live', 'after'];
const ROLES: Role[] = ['delegate', 'chair', 'admin'];
const CHAIR_ROLES: ChairRole[] = ['chair', 'vice_chair', 'rapporteur'];
const STATUS_ORDER = { applied: 0, allocated: 1, withdrawn: 2, rejected: 3 } as const;
const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
const awardRank = (a: string) => { const i = (DEFAULT_AWARDS as readonly string[]).indexOf(a); return i < 0 ? DEFAULT_AWARDS.length : i; };
const NOT_CORE = 'Only the core secretariat can change this.';

type RegStatus = 'applied' | 'approved' | 'allocated' | 'confirmed' | 'withdrawn' | 'rejected';
const regStatus = (s: RegStatus): Applicant['status'] => (s === 'approved' ? 'applied' : s === 'confirmed' ? 'allocated' : s);
type ProfileRow = { id: string; email: string; full_name: string | null; school_name: string | null; grade: string | null; role: 'delegate' | 'chair' | 'advisor' | 'admin'; admin_level: 'core' | 'staff' | null };
const PROFILE_COLS = 'id, email, full_name, school_name, grade, role, admin_level';
type OverviewRpcRow = {
  committee_id: string; abbr: string; name: string; room: string | null; session_number: number | null;
  session_status: 'scheduled' | 'live' | 'closed' | null; session_started_at: string | null; agenda_item: string | null;
  current_motion: string | null; timer_kind: Timer['kind']; timer_label: string | null; timer_duration: number; timer_running: boolean;
  timer_ends_at: string | null; timer_remaining: number; speaker_seat_id: string | null; speaker_label: string | null; updated_at: string;
  seats: number; present: number | null; open_vote: string | null; resolutions_passed: number; chits_waiting: number; papers_in: number;
};
type SeatFull = { id: string; committee_id: string; label: string; capacity: number };

export function createSupabaseSecretariatApi(url: string, anonKey: string): SecretariatApi {
  const sb = getClient(url, anonKey);
  const rpc = (fn: string, args: Record<string, unknown>, duplicate?: string) => q<unknown>(sb.rpc(fn, args), duplicate).then(() => undefined);
  const committeeRows = () => q<CommitteeRow[]>(sb.from('committees').select('id, abbr, name, sort, room').order('sort').order('abbr'));
  /** A direct write that must touch at least one row (RLS skips rows silently). */
  const mustTouch = async (p: PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }>, msg: string, duplicate?: string) => {
    const rows = await q<unknown[] | null>(p, duplicate);
    if (!rows || rows.length === 0) fail(msg);
  };

  const api: SecretariatApi = {
    ...makeAuth(sb, () => undefined),

    // ── Conference ──
    phase: () => loadPhase(sb),
    async setPhase(p) {
      if (!PHASES.includes(p)) fail('Choose Before, Live or After.');
      await mustTouch(sb.from('settings').update({ phase: p, updated_at: new Date().toISOString() }).eq('id', true).select('id'), NOT_CORE);
    },
    async overview() {
      const rows = await q<OverviewRpcRow[]>(sb.rpc('sec_overview'));
      return rows.map((r): OverviewRow => ({
        committee: { id: r.committee_id, abbr: r.abbr, name: r.name }, room: r.room,
        session: r.session_number !== null && r.session_status ? { number: r.session_number, status: r.session_status, startedAt: r.session_started_at } : null,
        agendaItem: r.agenda_item,
        timer: toTimer({
          timer_kind: r.timer_kind, timer_label: r.timer_label, timer_duration: r.timer_duration, timer_running: r.timer_running,
          timer_ends_at: r.timer_ends_at, timer_remaining: r.timer_remaining, timer_speaker_seat_id: r.speaker_seat_id,
        }, r.speaker_label),
        seats: r.seats, present: r.present, openVote: r.open_vote,
        resolutionsPassed: r.resolutions_passed, chitsWaiting: r.chits_waiting, papersIn: r.papers_in,
      }));
    },

    // ── Committees, seats and delegates ──
    async committees() {
      const [rows, seats, assigned] = await Promise.all([
        committeeRows(),
        all<{ id: string; committee_id: string }>((a, b) => sb.from('seats').select('id, committee_id').order('id').range(a, b)),
        all<{ seat_id: string }>((a, b) => sb.from('assignments').select('seat_id').order('registration_id').range(a, b)),
      ]);
      const filledSeats = new Set(assigned.map((x) => x.seat_id));
      return rows.map((c): Committee => {
        const mine = seats.filter((s) => s.committee_id === c.id);
        return { ...toCommitteeRef(c), sort: c.sort, room: c.room, seats: mine.length, filled: mine.filter((s) => filledSeats.has(s.id)).length };
      });
    },
    async saveCommittee(input) {
      const abbr = cleanText(input?.abbr, 'A short name (like UNSC)', 12).toUpperCase();
      if (!/^[A-Z0-9&-]+$/.test(abbr)) fail('Use letters and numbers only for the short name.');
      const name = cleanText(input.name, 'The committee name', 120);
      const room = optText(input.room, 'The room', 120);
      if (input.sort !== undefined && (!Number.isInteger(input.sort) || input.sort < 0 || input.sort > 1000)) fail('The order must be a whole number.');
      const dup = `${abbr} is already a committee.`;
      if (input.id) {
        const patch: Record<string, unknown> = { abbr, name, room };
        if (input.sort !== undefined) patch.sort = input.sort;
        await mustTouch(sb.from('committees').update(patch).eq('id', input.id).select('id'), NOT_CORE, dup);
        return;
      }
      const sort = input.sort ?? (await committeeRows()).reduce((m, c) => Math.max(m, c.sort), 0) + 1;
      await mustTouch(sb.from('committees').insert({ abbr, name, room, sort }).select('id'), NOT_CORE, dup);
    },
    async seats(committeeId) {
      const seats = await q<SeatFull[]>(sb.from('seats').select('id, committee_id, label, capacity').eq('committee_id', committeeId));
      const ids = seats.map((s) => s.id);
      const asg = ids.length ? await q<{ registration_id: string; seat_id: string }[]>(sb.from('assignments').select('registration_id, seat_id').in('seat_id', ids)) : [];
      const regs = asg.length ? await q<{ id: string; profile_id: string }[]>(sb.from('registrations').select('id, profile_id').in('id', asg.map((a) => a.registration_id))) : [];
      const profs = regs.length ? await q<{ id: string; email: string; full_name: string | null }[]>(sb.from('profiles').select('id, email, full_name').in('id', regs.map((r) => r.profile_id))) : [];
      const nameOf = (regId: string) => {
        const p = profs.find((x) => x.id === regs.find((r) => r.id === regId)?.profile_id);
        return p?.full_name ?? p?.email ?? 'Name not given';
      };
      return seats.sort((a, b) => byName(a.label, b.label)).map((s): Seat => ({
        id: s.id, committeeId: s.committee_id, label: s.label, capacity: s.capacity === 2 ? 2 : 1,
        holders: asg.filter((a) => a.seat_id === s.id).map((a) => ({ registrationId: a.registration_id, fullName: nameOf(a.registration_id) }))
          .sort((a, b) => byName(a.fullName, b.fullName)),
      }));
    },
    async addSeats(committeeId, labels, capacity) {
      if (!Array.isArray(labels)) fail('Enter one seat per line.');
      if (capacity !== 1 && capacity !== 2) fail('Choose single or double delegation.');
      const existing = await q<{ label: string }[]>(sb.from('seats').select('label').eq('committee_id', committeeId));
      const taken = new Set(existing.map((x) => x.label.toLowerCase()));
      const skipped: string[] = [];
      const add: string[] = [];
      for (const raw of labels) {
        const label = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
        if (!label) continue;
        if (label.length > 80 || taken.has(label.toLowerCase())) { skipped.push(label); continue; }
        taken.add(label.toLowerCase());
        add.push(label);
      }
      if (add.length) {
        await mustTouch(sb.from('seats').insert(add.map((label) => ({ committee_id: committeeId, label, capacity }))).select('id'),
          NOT_CORE, 'One of those seats already exists. Refresh and try again.');
      }
      return { added: add.length, skipped };
    },
    removeSeat: (seatId) => rpc('sec_remove_seat', { p_seat: seatId }),
    async applicants() {
      const [regs, profiles, prefs, asg, seats, checkins, committees] = await Promise.all([
        all<{ id: string; profile_id: string; status: RegStatus; created_at: string }>((a, b) =>
          sb.from('registrations').select('id, profile_id, status, created_at').order('id').range(a, b)),
        all<ProfileRow>((a, b) => sb.from('profiles').select(PROFILE_COLS).order('id').range(a, b)),
        all<{ registration_id: string; rank: number; committee_id: string }>((a, b) =>
          sb.from('preferences').select('registration_id, rank, committee_id').order('registration_id').order('rank').range(a, b)),
        all<{ registration_id: string; seat_id: string }>((a, b) => sb.from('assignments').select('registration_id, seat_id').order('registration_id').range(a, b)),
        all<SeatFull>((a, b) => sb.from('seats').select('id, committee_id, label, capacity').order('id').range(a, b)),
        all<{ registration_id: string }>((a, b) => sb.from('checkins').select('registration_id').order('registration_id').range(a, b)),
        committeeRows(),
      ]);
      const prof = new Map(profiles.map((p) => [p.id, p]));
      const seatBy = new Map(seats.map((s) => [s.id, s]));
      const seatOf = new Map(asg.map((a) => [a.registration_id, a.seat_id]));
      const cBy = new Map(committees.map((c) => [c.id, c]));
      const checked = new Set(checkins.map((c) => c.registration_id));
      return regs.map((r): Applicant => {
        const p = prof.get(r.profile_id);
        const seat = seatBy.get(seatOf.get(r.id) ?? '');
        const fullName = p?.full_name ?? '';
        return {
          registrationId: r.id, person: { id: r.profile_id, fullName: p?.full_name ?? null, email: p?.email ?? '' },
          fullName, schoolName: p?.school_name ?? '', grade: p?.grade ?? '',
          choices: prefs.filter((x) => x.registration_id === r.id).sort((a, b) => a.rank - b.rank)
            .map((x) => cBy.get(x.committee_id)).filter((c): c is CommitteeRow => !!c).map(toCommitteeRef),
          status: seat ? 'allocated' : regStatus(r.status),
          seat: seat ? { id: seat.id, label: seat.label, committeeId: seat.committee_id } : null,
          checkedIn: checked.has(r.id), createdAt: r.created_at,
        };
      }).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || byName(a.fullName || a.person.email, b.fullName || b.person.email));
    },
    async setApplicantStatus(registrationId, status) {
      if (status !== 'applied' && status !== 'withdrawn' && status !== 'rejected') fail('Choose Applied, Withdrawn or Rejected.');
      await rpc('sec_set_applicant_status', { p_reg: registrationId, p_status: status });
    },
    assignSeat: (registrationId, seatId) => rpc('admin_assign_seat', { p_reg: registrationId, p_seat: seatId }),

    // ── Team ──
    async team(query) {
      const term = (query ?? '').trim().toLowerCase().replace(/[%_,()\\*]/g, ' ').trim();
      const staff = await q<{ committee_id: string; profile_id: string; role: ChairRole }[]>(sb.from('committee_staff').select('committee_id, profile_id, role'));
      let rows: ProfileRow[];
      if (term) {
        rows = await q<ProfileRow[]>(sb.from('profiles').select(PROFILE_COLS).or(`full_name.ilike.%${term}%,email.ilike.%${term}%`).limit(50));
      } else {
        const ids = [...new Set(staff.map((s) => s.profile_id))];
        const [ranked, chairs] = await Promise.all([
          q<ProfileRow[]>(sb.from('profiles').select(PROFILE_COLS).in('role', ['chair', 'admin'])),
          ids.length ? q<ProfileRow[]>(sb.from('profiles').select(PROFILE_COLS).in('id', ids)) : Promise.resolve([] as ProfileRow[]),
        ]);
        rows = [...new Map([...ranked, ...chairs].map((p) => [p.id, p])).values()];
      }
      return rows.map((p): TeamMember => {
        const role: Role = p.role === 'admin' ? 'admin' : p.role === 'chair' ? 'chair' : 'delegate';
        return {
          id: p.id, fullName: p.full_name, email: p.email, role, isCore: p.role === 'admin' && p.admin_level === 'core',
          chairs: staff.filter((s) => s.profile_id === p.id).map((s) => ({ committeeId: s.committee_id, role: s.role })),
        };
      }).sort((a, b) => ROLES.indexOf(b.role) - ROLES.indexOf(a.role) || byName(a.fullName ?? a.email, b.fullName ?? b.email));
    },
    async setRole(profileId, role, isCore) {
      if (!ROLES.includes(role)) fail('Choose Delegate, Chair or Secretariat.');
      const me = await loadMe(sb);
      if (!me.isCore) fail('Only core secretariat members can change the team.');
      if (profileId === me.id) fail("You can't change your own role.");
      const p = await q<{ role: string; admin_level: 'core' | 'staff' | null } | null>(sb.from('profiles').select('role, admin_level').eq('id', profileId).maybeSingle());
      if (!p) fail('That person does not exist.');
      const level = role === 'admin' ? (isCore === undefined ? p.admin_level ?? 'staff' : isCore ? 'core' : 'staff') : null;
      if (role === 'delegate') {
        const chairs = await q<{ committee_id: string }[]>(sb.from('committee_staff').select('committee_id').eq('profile_id', profileId));
        for (const c of chairs) await rpc('sec_remove_chair', { p_committee: c.committee_id, p_profile: profileId });
      }
      await rpc('admin_set_role', { p_profile: profileId, p_role: role, p_level: level });
    },
    async addChair(committeeId, profileId, role) {
      if (!CHAIR_ROLES.includes(role)) fail('Choose Chair, Vice chair or Rapporteur.');
      await rpc('sec_add_chair', { p_committee: committeeId, p_profile: profileId, p_role: role });
    },
    removeChair: (committeeId, profileId) => rpc('sec_remove_chair', { p_committee: committeeId, p_profile: profileId }),

    // ── Schedule and deadlines ──
    schedule: () => loadSchedule(sb),
    async saveScheduleItem(input) {
      const day = Number(input?.day);
      if (!Number.isInteger(day) || day < 1 || day > 3) fail('Choose day 1, 2 or 3.');
      const title = cleanText(input.title, 'A title', 120);
      const startsAt = cleanIso(input.startsAt, 'The start time');
      const endsAt = cleanIso(input.endsAt, 'The end time');
      if (startsAt && endsAt && Date.parse(endsAt) < Date.parse(startsAt)) fail('The end time must be after the start time.');
      const location = optText(input.location, 'The place', 120);
      const row = { day, title, starts_at: startsAt, ends_at: endsAt, location, committee_id: input.committeeId ?? null };
      if (input.id) await mustTouch(sb.from('schedule_items').update(row).eq('id', input.id).select('id'), 'That schedule item no longer exists, or only the core secretariat can change it.');
      else await mustTouch(sb.from('schedule_items').insert(row).select('id'), NOT_CORE);
    },
    async removeScheduleItem(id) {
      await mustTouch(sb.from('schedule_items').delete().eq('id', id).select('id'), 'That schedule item no longer exists, or only the core secretariat can change it.');
    },
    deadlines: () => loadDeadlines(sb),
    async setDeadline(key, dueAt) {
      const labels = { registration: 'Registration', position_paper: 'Position papers', resolution: 'Resolutions' } as const;
      if (!(key in labels)) fail('That deadline does not exist.');
      const due = cleanIso(dueAt, 'The deadline');
      await mustTouch(sb.from('deadlines').upsert({ key, label: labels[key], due_at: due }, { onConflict: 'key', ignoreDuplicates: false }).select('key'), NOT_CORE);
    },

    // ── Files and notices ──
    async files() {
      const [uid, me] = await Promise.all([requireUid(sb), loadMe(sb)]);
      return loadFiles(sb, uid, { where: (r) => r.scope !== 'mine', canRemove: () => me.isCore });
    },
    async addFile(input) {
      if (!input || typeof input !== 'object') fail('Choose a file or paste a link.');
      const cid = input.committeeId ?? null;
      await addLibraryFile(sb, input, cid
        ? { scope: 'committee', committeeId: cid, folder: `committee/${cid}/` }
        : { scope: 'conference', committeeId: null, folder: 'conference/' });
    },
    removeFile: (id) => removeLibraryFile(sb, id),
    openFile: (id) => openLibraryFile(sb, id),
    async announcements() {
      const rows = await q<AnnRow[]>(sb.from('announcements').select(ANN_COLS).order('created_at', { ascending: false }).limit(200));
      return rows.map(toAnnouncement).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    },
    async announce(input) {
      const title = cleanText(input?.title, 'A title', 140);
      const body = typeof input.body === 'string' ? input.body.trim() : '';
      if (body.length > 4000) fail('The text is too long. Keep it under 4000 characters.');
      if (!['all', 'delegates', 'chairs', 'committee'].includes(input.audience)) fail('Choose who the notice is for.');
      if (input.audience === 'committee' && !input.committeeId) fail('Choose the committee.');
      const uid = await requireUid(sb);
      await mustTouch(sb.from('announcements').insert({
        title, body: body || null, urgent: !!input.urgent, audience: input.audience, from_role: 'secretariat',
        committee_id: input.audience === 'committee' ? input.committeeId : null, published_at: new Date().toISOString(), created_by: uid,
      }).select('id'), NOT_CORE);
    },
    async removeAnnouncement(id) {
      await mustTouch(sb.from('announcements').delete().eq('id', id).select('id'), 'That notice no longer exists, or only the core secretariat can remove it.');
    },

    // ── Check-in ──
    async checkin(code, day) {
      const c = typeof code === 'string' ? code.trim().toLowerCase().replace(/\s+/g, '') : '';
      if (!c) fail('Scan the QR code or type the code.');
      if (day !== 1 && day !== 2 && day !== 3) fail('Choose day 1, 2 or 3.');
      const rows = await q<{ first_checkin: boolean; full_name: string; committee_id: string | null; committee_abbr: string | null; committee_name: string | null; seat_id: string | null; seat_label: string | null }[]>(
        sb.rpc('sec_checkin', { p_code: c, p_day: day }));
      const r = rows[0];
      if (!r) fail('No delegate has that code. Check it and try again.');
      return {
        first: r.first_checkin, fullName: r.full_name,
        committee: r.committee_id ? { id: r.committee_id, abbr: r.committee_abbr ?? '', name: r.committee_name ?? '' } : null,
        seat: r.seat_id ? { id: r.seat_id, label: r.seat_label ?? '' } : null,
      } satisfies CheckinResult;
    },

    // ── Awards ──
    ranking: (committeeId) => loadRanking(sb, committeeId),
    async nominations(committeeId) {
      let req = sb.from('awards').select('id, committee_id, seat_id, award, nominated_by, final');
      if (committeeId) req = req.eq('committee_id', committeeId);
      const rows = await q<{ id: string; committee_id: string; seat_id: string; award: string; nominated_by: string | null; final: boolean }[]>(req);
      if (!rows.length) return [];
      const seatIds = [...new Set(rows.map((r) => r.seat_id))];
      const byIds = [...new Set(rows.map((r) => r.nominated_by).filter((x): x is string => !!x))];
      const [seats, profs, committees] = await Promise.all([
        q<{ id: string; label: string }[]>(sb.from('seats').select('id, label').in('id', seatIds)),
        byIds.length ? q<{ id: string; full_name: string | null }[]>(sb.from('profiles').select('id, full_name').in('id', byIds)) : Promise.resolve([]),
        committeeRows(),
      ]);
      const seat = labeller(seats);
      const names = new Map(profs.map((p) => [p.id, p.full_name]));
      const cBy = new Map(committees.map((c) => [c.id, c]));
      return rows.map((r) => {
        const c = cBy.get(r.committee_id);
        return {
          id: r.id, seat: seat(r.seat_id), award: r.award, nominatedBy: r.nominated_by ? names.get(r.nominated_by) ?? null : null, final: r.final,
          committee: c ? toCommitteeRef(c) : { id: r.committee_id, abbr: '', name: 'Committee removed' },
          sort: c?.sort ?? 0,
        };
      }).sort((a, b) => a.sort - b.sort || awardRank(a.award) - awardRank(b.award) || a.seat.label.localeCompare(b.seat.label))
        .map(({ sort: _sort, ...n }) => n);
    },
    async setFinal(nominationId, final) {
      await mustTouch(sb.from('awards').update({ final: !!final }).eq('id', nominationId).select('id'),
        'That nomination no longer exists, or only the core secretariat can finalise awards.');
    },

    subscribe(cb) {
      return watchTables(sb, 'secretariat', [
        ...CONFERENCE_WATCHES,
        { table: 'committees', topics: ['seat', 'live'] },
        { table: 'committee_live', topics: ['live'] },
        { table: 'sessions', topics: ['live', 'roll'] },
        { table: 'roll_calls', topics: ['roll', 'live'] },
        { table: 'vote_rounds', topics: ['votes', 'live'] },
        { table: 'documents', topics: ['resolutions', 'live'] },
        { table: 'notes', topics: ['chits', 'live'] },
        { table: 'position_papers', topics: ['papers', 'live'] },
        { table: 'registrations', topics: ['seat'] },
        { table: 'assignments', topics: ['seat'] },
        { table: 'checkins', topics: ['seat'] },
        { table: 'scores', topics: ['scores'] },
        { table: 'awards', topics: ['scores'] },
        { table: 'committee_criteria', topics: ['scores'] },
      ], cb);
    },
  };
  return api;
}
