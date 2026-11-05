-- ════════════════════════════════════════════════════════════════════════════
-- DXB MUN v2: the conference-day system (contract: src/platform/v2/contract.ts)
-- Builds on 0001_init.sql, 0002_seed_committees.sql and 0003_admin_bootstrap.sql.
--
--   1. columns on existing tables      6. RLS policies
--   2. new tables                      7. RPCs (delegate, chair, secretariat)
--   3. indexes                         8. realtime publication
--   4. helper functions                9. storage buckets and policies
--   5. triggers                       10. privileges
--
-- Rules kept from 0001: RLS on every table; privileged writes go through SECURITY DEFINER
-- functions with `search_path = ''`; every function is granted explicitly (0001 revoked the
-- defaults). Exception texts are plain English, so the app can show them as they are.
--
-- Gone in v2: fees, consent, code of conduct and seat acceptance. Assigning a seat means
-- the delegate is allocated and ready. Position papers may arrive late (they are marked late).
-- Written to be re-runnable: `if not exists`, `create or replace`, and drop-then-create.
-- ════════════════════════════════════════════════════════════════════════════

-- ───────────────────────── 1. Columns on existing tables ─────────────────────────
alter table public.committees      add column if not exists room text check (length(room) <= 120);
alter table public.sessions        add column if not exists roll_open boolean not null default false;
alter table public.position_papers add column if not exists seen_at timestamptz;
alter table public.position_papers add column if not exists seen_by uuid references public.profiles (id) on delete set null;
alter table public.announcements   add column if not exists urgent boolean not null default false;
alter table public.announcements   add column if not exists from_role text not null default 'secretariat'
  check (from_role in ('secretariat', 'chair'));

-- Sessions: more than six per committee is allowed now (the chair opens the next number).
alter table public.sessions drop constraint if exists sessions_number_check;
alter table public.sessions add constraint sessions_number_check check (number between 1 and 50);

-- Scores: the total can exceed 999.99 once criteria are edited (12 criteria × 100).
alter table public.scores alter column total type numeric(7,2);

-- Documents (resolutions). A draft is a row with submitted_at null. 'rejected' is shown as "returned".
-- submitted_at defaults to now(), so v1's submit_document() rows stay "submitted".
do $$ begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'documents' and column_name = 'submitted_at') then
    alter table public.documents add column submitted_at timestamptz default now();
    update public.documents set submitted_at = created_at;     -- existing rows were all submitted
  end if;
end $$;
alter table public.documents add column if not exists updated_at timestamptz not null default now();
alter table public.documents add column if not exists return_comment text check (length(return_comment) <= 1000);
alter table public.documents add column if not exists clause text check (length(clause) <= 120);
alter table public.documents add column if not exists original_name text check (length(original_name) <= 200);
alter table public.documents add column if not exists submitted_seat_id uuid references public.seats (id) on delete set null;

-- Votes: one ballot per seat per vote round (vote_rounds below). Round ballots leave motion_id and document_id null.
-- (The column and its foreign key are added after vote_rounds exists, in section 2.)

-- ───────────────────────── 2. New tables ─────────────────────────

-- The committee's shared state: agenda, current motion and the timer. One row per committee.
-- The UI computes: remaining = running ? max(0, ends_at - now) : timer_remaining.
create table if not exists public.committee_live (
  committee_id          uuid primary key references public.committees (id) on delete cascade,
  agenda_item           text check (length(agenda_item) <= 200),
  current_motion        text check (length(current_motion) <= 200),
  timer_kind            text not null default 'session' check (timer_kind in ('speech', 'caucus', 'session', 'other')),
  timer_label           text check (length(timer_label) <= 120),
  timer_duration        integer not null default 0 check (timer_duration between 0 and 10800),   -- 0 = not set yet
  timer_running         boolean not null default false,
  timer_ends_at         timestamptz,
  timer_remaining       integer not null default 0 check (timer_remaining between 0 and 10800),
  timer_speaker_seat_id uuid references public.seats (id) on delete set null,
  updated_at            timestamptz not null default now(),
  check (not timer_running or timer_ends_at is not null)
);

-- The conference schedule (secretariat). committee_id null = everyone.
create table if not exists public.schedule_items (
  id           uuid primary key default gen_random_uuid(),
  day          smallint not null check (day between 1 and 3),
  title        text not null check (length(title) between 1 and 120),
  starts_at    timestamptz,
  ends_at      timestamptz,
  location     text check (length(location) <= 120),
  committee_id uuid references public.committees (id) on delete cascade,
  created_at   timestamptz not null default now(),
  check (starts_at is null or ends_at is null or ends_at >= starts_at)
);

-- Awards rubric per committee: [{key, label, max}]. Missing row = the contract's DEFAULT_CRITERIA.
create table if not exists public.committee_criteria (
  committee_id uuid primary key references public.committees (id) on delete cascade,
  criteria     jsonb not null check (jsonb_typeof(criteria) = 'array'),
  updated_by   uuid references public.profiles (id) on delete set null,
  updated_at   timestamptz not null default now()
);

-- Private notes: only the writer ever sees them.
create table if not exists public.my_notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body       text not null check (length(body) between 1 and 2000),
  tag        text not null default 'general' check (tag in ('poi', 'doubt', 'speech', 'general')),
  done       boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Files: conference-wide (secretariat), committee (chairs), or a delegate's own (shared with chosen seats).
-- A row holds a file in the 'library' bucket or a link, never both.
create table if not exists public.library_files (
  id             uuid primary key default gen_random_uuid(),
  scope          text not null check (scope in ('conference', 'committee', 'mine')),
  committee_id   uuid references public.committees (id) on delete cascade,
  owner_id       uuid references public.profiles (id) on delete cascade,
  title          text not null check (length(title) between 1 and 160),
  kind           text not null default 'other' check (kind in ('guide', 'rules', 'handbook', 'schedule', 'map', 'research', 'other')),
  file_path      text unique,
  original_name  text check (length(original_name) <= 200),
  link           text check (length(link) <= 2000 and link ~* '^https?://'),
  size_bytes     bigint check (size_bytes >= 0),
  added_by       uuid references public.profiles (id) on delete set null,
  added_by_label text check (length(added_by_label) <= 120),
  created_at     timestamptz not null default now(),
  check ((file_path is null) <> (link is null)),
  check ((scope = 'committee') = (committee_id is not null)),
  check ((scope = 'mine') = (owner_id is not null))
);

create table if not exists public.library_shares (
  file_id    uuid not null references public.library_files (id) on delete cascade,
  seat_id    uuid not null references public.seats (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (file_id, seat_id)
);

-- A vote the chair opens on a motion, a draft resolution or an amendment. Ballots live in `votes`.
-- Counts are stored when the vote closes; a recorded (placard) count wins over phone ballots.
create table if not exists public.vote_rounds (
  id               uuid primary key default gen_random_uuid(),
  committee_id     uuid not null references public.committees (id) on delete cascade,
  session_id       uuid references public.sessions (id) on delete set null,
  target           text not null check (target in ('motion', 'resolution', 'amendment')),
  motion_id        uuid references public.motions (id) on delete set null,
  document_id      uuid references public.documents (id) on delete set null,
  title            text not null check (length(title) between 1 and 200),
  majority         text not null default 'simple' check (majority in ('simple', 'two_thirds')),
  status           text not null default 'open' check (status in ('open', 'closed')),
  recorded_yes     integer check (recorded_yes >= 0),
  recorded_no      integer check (recorded_no >= 0),
  recorded_abstain integer check (recorded_abstain >= 0),
  yes_count        integer,
  no_count         integer,
  abstain_count    integer,
  not_voted        integer,
  passed           boolean,
  opened_by        uuid references public.profiles (id) on delete set null,
  opened_at        timestamptz not null default now(),
  closed_at        timestamptz,
  check (motion_id is null or document_id is null),
  check ((status = 'closed') = (closed_at is not null))
);

alter table public.votes add column if not exists round_id uuid references public.vote_rounds (id) on delete cascade;
alter table public.votes drop constraint if exists votes_check;
alter table public.votes add constraint votes_check check (
  (round_id is not null and motion_id is null and document_id is null)
  or (round_id is null and (motion_id is null) <> (document_id is null)));
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'votes_round_id_seat_id_key') then
    alter table public.votes add constraint votes_round_id_seat_id_key unique (round_id, seat_id);
  end if;
end $$;

-- ───────────────────────── 3. Indexes ─────────────────────────
create index if not exists committee_live_speaker_idx   on public.committee_live (timer_speaker_seat_id);
create index if not exists schedule_items_order_idx     on public.schedule_items (day, starts_at);
create index if not exists schedule_items_committee_idx on public.schedule_items (committee_id);
create index if not exists committee_criteria_by_idx    on public.committee_criteria (updated_by);
create index if not exists my_notes_owner_idx           on public.my_notes (owner_id, created_at);
create index if not exists library_files_committee_idx  on public.library_files (committee_id);
create index if not exists library_files_owner_idx      on public.library_files (owner_id);
create index if not exists library_files_added_by_idx   on public.library_files (added_by);
create index if not exists library_shares_seat_idx      on public.library_shares (seat_id);
create index if not exists vote_rounds_committee_idx    on public.vote_rounds (committee_id, opened_at);
create index if not exists vote_rounds_session_idx      on public.vote_rounds (session_id);
create index if not exists vote_rounds_motion_idx       on public.vote_rounds (motion_id);
create index if not exists vote_rounds_document_idx     on public.vote_rounds (document_id);
create index if not exists vote_rounds_opened_by_idx    on public.vote_rounds (opened_by);
create unique index if not exists vote_rounds_one_open  on public.vote_rounds (committee_id) where status = 'open';
create index if not exists position_papers_seen_by_idx  on public.position_papers (seen_by);
create index if not exists documents_seat_idx           on public.documents (submitted_seat_id);
create unique index if not exists documents_number_unique on public.documents (committee_id, lower(number)) where number is not null;
create unique index if not exists awards_one_per_chair  on public.awards (committee_id, seat_id, award, nominated_by);

-- ───────────────────────── 4. Helper functions ─────────────────────────

-- The caller's seat (a delegate holds at most one).
create or replace function public.my_seat() returns uuid
language sql stable security definer set search_path = '' as
$$ select a.seat_id from public.assignments a join public.registrations r on r.id = a.registration_id
   where r.profile_id = auth.uid() limit 1 $$;

-- Policy helpers that read another table without RLS (no policy recursion).
create or replace function public.my_sponsored_documents() returns setof uuid
language sql stable security definer set search_path = '' as
$$ select ds.document_id from public.document_sponsors ds where ds.seat_id in (select public.my_seats()) $$;

create or replace function public.my_library_files() returns setof uuid
language sql stable security definer set search_path = '' as
$$ select f.id from public.library_files f where f.owner_id = auth.uid() $$;

create or replace function public.files_shared_with_me() returns setof uuid
language sql stable security definer set search_path = '' as
$$ select s.file_id from public.library_shares s where s.seat_id in (select public.my_seats()) $$;

-- Internal (not granted): after the conference, delegate actions are read-only.
create or replace function public.require_not_after() returns void
language plpgsql stable security definer set search_path = '' as
$$ begin
  if (select s.phase from public.settings s where s.id = true) = 'after' then
    raise exception 'The conference has ended. This is read-only now.';
  end if;
end $$;

-- Internal: the committee's live session, if one is running.
create or replace function public.live_session(p_committee uuid) returns uuid
language sql stable security definer set search_path = '' as
$$ select s.id from public.sessions s where s.committee_id = p_committee and s.status = 'live' order by s.number desc limit 1 $$;

-- Internal: the session to show: the live one, else the next scheduled one, else the last closed one.
create or replace function public.display_session(p_committee uuid) returns uuid
language sql stable security definer set search_path = '' as
$$ select coalesce(
     (select s.id from public.sessions s where s.committee_id = p_committee and s.status = 'live' order by s.number desc limit 1),
     (select s.id from public.sessions s where s.committee_id = p_committee and s.status = 'scheduled'
        and s.number > coalesce((select max(x.number) from public.sessions x where x.committee_id = p_committee and x.status = 'closed'), 0)
      order by s.number limit 1),
     (select s.id from public.sessions s where s.committee_id = p_committee and s.status = 'closed' order by s.number desc limit 1)) $$;

-- Internal: make sure the committee has its live row.
create or replace function public.ensure_live(p_committee uuid) returns void
language sql security definer set search_path = '' as
$$ insert into public.committee_live (committee_id) values (p_committee) on conflict (committee_id) do nothing $$;

-- Internal: the waiting speakers are always numbered 1..n.
create or replace function public.renumber_speakers(p_committee uuid) returns void
language sql security definer set search_path = '' as
$$ update public.speakers s set position = o.rn
   from (select x.id, row_number() over (order by x.position, x.created_at) as rn
         from public.speakers x where x.committee_id = p_committee and x.status = 'waiting') o
   where s.id = o.id and s.position is distinct from o.rn $$;

-- Internal: who can vote: seats answering present in that session's roll call, else every filled seat.
create or replace function public.round_eligible(p_committee uuid, p_session uuid) returns integer
language sql stable security definer set search_path = '' as
$$ select case
     when p_session is not null and exists (select 1 from public.roll_calls r where r.session_id = p_session)
       then (select count(*) from public.roll_calls r where r.session_id = p_session and r.status <> 'absent')::integer
     else (select count(distinct a.seat_id) from public.assignments a join public.seats s on s.id = a.seat_id
           where s.committee_id = p_committee)::integer
   end $$;

-- The contract's DEFAULT_CRITERIA (keep the two in step).
create or replace function public.default_criteria() returns jsonb
language sql immutable set search_path = '' as
$$ select '[{"key":"speeches","label":"Speeches","max":10},{"key":"pois","label":"POIs","max":10},
            {"key":"diplomacy","label":"Diplomacy","max":10},{"key":"resolution","label":"Resolution work","max":10},
            {"key":"knowledge","label":"Knowledge of agenda","max":10},{"key":"paper","label":"Position paper","max":10}]'::jsonb $$;

-- ───────────────────────── 5. Triggers ─────────────────────────

-- Every committee has a live row.
create or replace function public.committee_live_row() returns trigger
language plpgsql security definer set search_path = '' as
$$ begin
  insert into public.committee_live (committee_id) values (new.id) on conflict (committee_id) do nothing;
  return new;
end $$;
drop trigger if exists committees_live_row on public.committees;
create trigger committees_live_row after insert on public.committees
  for each row execute function public.committee_live_row();
insert into public.committee_live (committee_id) select id from public.committees on conflict (committee_id) do nothing;

drop trigger if exists committee_live_touch on public.committee_live;
create trigger committee_live_touch before update on public.committee_live for each row execute function public.touch_updated_at();
drop trigger if exists my_notes_touch on public.my_notes;
create trigger my_notes_touch before update on public.my_notes for each row execute function public.touch_updated_at();
drop trigger if exists committee_criteria_touch on public.committee_criteria;
create trigger committee_criteria_touch before update on public.committee_criteria for each row execute function public.touch_updated_at();
drop trigger if exists documents_touch on public.documents;
create trigger documents_touch before update on public.documents for each row execute function public.touch_updated_at();

-- Position papers: no deadline block any more (late papers are shown as late). The server stamps the
-- time, and a new file clears "seen by chair". (Same function name, so the 0001 trigger keeps using it.)
create or replace function public.position_paper_guard() returns trigger
language plpgsql set search_path = '' as
$$ begin
  new.submitted_at := now();
  new.seen_at := null;
  new.seen_by := null;
  return new;
end $$;

create or replace function public.vote_round_links() returns trigger
language plpgsql security definer set search_path = '' as
$$ begin
  if new.session_id is not null and (select committee_id from public.sessions where id = new.session_id) is distinct from new.committee_id then
    raise exception 'That session is in another committee.'; end if;
  if new.motion_id is not null and (select committee_id from public.motions where id = new.motion_id) is distinct from new.committee_id then
    raise exception 'That motion is in another committee.'; end if;
  if new.document_id is not null and (select committee_id from public.documents where id = new.document_id) is distinct from new.committee_id then
    raise exception 'That paper is in another committee.'; end if;
  return new;
end $$;
drop trigger if exists vote_rounds_links on public.vote_rounds;
create trigger vote_rounds_links before insert or update on public.vote_rounds
  for each row execute function public.vote_round_links();

drop trigger if exists vote_rounds_audit on public.vote_rounds;
create trigger vote_rounds_audit after insert or update or delete on public.vote_rounds for each row execute function public.audit_row();

-- Seats named in the live row and the shares must be in the right committee.
create or replace function public.v2_seat_links() returns trigger
language plpgsql security definer set search_path = '' as
$$ begin
  if tg_table_name = 'committee_live' then
    if new.timer_speaker_seat_id is not null and public.committee_of_seat(new.timer_speaker_seat_id) is distinct from new.committee_id then
      raise exception 'That seat is not in this committee.'; end if;
  elsif tg_table_name = 'library_shares' then
    -- the owner's committee (through their seat)
    if public.committee_of_seat(new.seat_id) is distinct from
       (select s.committee_id from public.library_files f
          join public.registrations r on r.profile_id = f.owner_id
          join public.assignments a on a.registration_id = r.id
          join public.seats s on s.id = a.seat_id
         where f.id = new.file_id limit 1) then
      raise exception 'You can only share with seats in your committee.'; end if;
  end if;
  return new;
end $$;
drop trigger if exists committee_live_links on public.committee_live;
create trigger committee_live_links before insert or update on public.committee_live for each row execute function public.v2_seat_links();
drop trigger if exists library_shares_links on public.library_shares;
create trigger library_shares_links before insert or update on public.library_shares for each row execute function public.v2_seat_links();

-- ───────────────────────── 6. Row Level Security ─────────────────────────
alter table public.committee_live     enable row level security;
alter table public.schedule_items     enable row level security;
alter table public.committee_criteria enable row level security;
alter table public.my_notes           enable row level security;
alter table public.library_files      enable row level security;
alter table public.library_shares     enable row level security;
alter table public.vote_rounds        enable row level security;

-- Live room state: committee members and admins read; chairs write through RPCs only.
drop policy if exists "live read" on public.committee_live;
create policy "live read" on public.committee_live for select to authenticated using (
  committee_id in (select public.my_committees()) or (select public.is_admin()));

-- Schedule: everyone signed in sees the shared items and their own committee's; core admins write.
drop policy if exists "schedule read" on public.schedule_items;
create policy "schedule read" on public.schedule_items for select to authenticated using (
  committee_id is null or committee_id in (select public.my_committees()) or (select public.is_admin()));
drop policy if exists "core writes schedule" on public.schedule_items;
create policy "core writes schedule" on public.schedule_items for all to authenticated
  using ((select public.is_core())) with check ((select public.is_core()));

-- Rubric: the committee's chairs and admins only. Never delegates. Written by chair_set_criteria().
drop policy if exists "criteria read" on public.committee_criteria;
create policy "criteria read" on public.committee_criteria for select to authenticated using (
  committee_id in (select public.my_chaired_committees()) or (select public.is_admin()));

-- Private notes: the owner only, for every action. Admins cannot read them either.
drop policy if exists "my notes owner" on public.my_notes;
create policy "my notes owner" on public.my_notes for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Files: conference files to everyone signed in; committee files to members and admins;
-- private files to the owner and the seats they shared with. Written through RPCs only.
drop policy if exists "files read" on public.library_files;
create policy "files read" on public.library_files for select to authenticated using (
  scope = 'conference'
  or (scope = 'committee' and (committee_id in (select public.my_committees()) or (select public.is_admin())))
  or (scope = 'mine' and (owner_id = (select auth.uid()) or id in (select public.files_shared_with_me()))));
drop policy if exists "shares read" on public.library_shares;
create policy "shares read" on public.library_shares for select to authenticated using (
  seat_id in (select public.my_seats()) or file_id in (select public.my_library_files()));

-- Votes: members see the rounds (counts are stored only when a round closes).
drop policy if exists "vote rounds read" on public.vote_rounds;
create policy "vote rounds read" on public.vote_rounds for select to authenticated using (
  committee_id in (select public.my_committees()) or (select public.is_admin()));

-- Resolutions: the author always; sponsors and signatories once submitted; the dais once submitted;
-- everyone in the committee once approved. Other people's drafts stay private.
drop policy if exists "documents read" on public.documents;
create policy "documents read" on public.documents for select to authenticated using (
  submitted_by = (select auth.uid())
  or (submitted_at is not null and (
        committee_id in (select public.my_chaired_committees())
        or (status in ('approved', 'voting', 'passed', 'failed') and committee_id in (select public.my_committees()))
        or id in (select public.my_sponsored_documents()))));

-- Scores and nominations: also readable by every admin (secretariat awards page). Still never delegates.
drop policy if exists "scores admin read" on public.scores;
create policy "scores admin read" on public.scores for select to authenticated using ((select public.is_admin()));
drop policy if exists "awards admin read" on public.awards;
create policy "awards admin read" on public.awards for select to authenticated using ((select public.is_admin()));

-- ───────────────────────── 7. RPCs ─────────────────────────

-- 7a. Registration and allocation (no fees, consent, code of conduct or seat acceptance) ----------

-- Confirmation is just "has a seat": assigned = 'allocated'. ('confirmed' is no longer used.)
create or replace function public.recompute_confirmation(p_reg uuid) returns public.reg_status
language plpgsql security definer set search_path = '' as
$$ declare st public.reg_status; want public.reg_status;
begin
  select r.status into st from public.registrations r where r.id = p_reg;
  if st is null or st not in ('allocated', 'confirmed') then return st; end if;
  want := case when exists (select 1 from public.assignments a where a.registration_id = p_reg)
               then 'allocated'::public.reg_status else 'applied'::public.reg_status end;
  if want <> st then update public.registrations set status = want where id = p_reg; end if;
  return want;
end $$;
update public.registrations set status = 'allocated' where status = 'confirmed';

-- Allocation (core only). A seat = allocated and ready. A null seat removes it (back to applied).
create or replace function public.admin_assign_seat(p_reg uuid, p_seat uuid)
returns void language plpgsql security definer set search_path = '' as
$$ declare st public.reg_status;
begin
  if not public.is_core() then raise exception 'Only the core secretariat can assign seats.'; end if;
  select status into st from public.registrations where id = p_reg for update;
  if st is null then raise exception 'That delegate no longer exists. Refresh.'; end if;
  if st in ('withdrawn', 'rejected') then raise exception 'This delegate is %. Set them back to applied first.', st; end if;
  if p_seat is null then
    delete from public.assignments where registration_id = p_reg;
    update public.registrations set status = 'applied' where id = p_reg and status in ('allocated', 'confirmed');
  else
    insert into public.assignments (registration_id, seat_id, assigned_by) values (p_reg, p_seat, auth.uid())
      on conflict (registration_id) do update set seat_id = excluded.seat_id, assigned_by = excluded.assigned_by, assigned_at = now();
    update public.registrations set status = 'allocated' where id = p_reg;
  end if;
  perform public.log('assign_seat', 'assignments', p_reg::text, jsonb_build_object('seat', p_seat));
end $$;

-- The delegate signs up: name, school, grade and 1–3 ranked committee choices. Can be re-sent while applied.
create or replace function public.sign_up(p_full_name text, p_school_name text, p_grade text, p_committees uuid[])
returns uuid language plpgsql security definer set search_path = '' as
$$ declare reg uuid; st public.reg_status; n text := regexp_replace(trim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
          sch text := trim(coalesce(p_school_name, '')); g text := trim(coalesce(p_grade, '')); cnt integer;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if length(n) < 2 then raise exception 'Enter your full name.'; end if;
  if length(n) > 120 then raise exception 'Your name is too long. Keep it under 120 characters.'; end if;
  if sch = '' then raise exception 'Enter your school.'; end if;
  if length(sch) > 160 then raise exception 'The school name is too long. Keep it under 160 characters.'; end if;
  if g = '' then raise exception 'Enter your grade.'; end if;
  if length(g) > 20 then raise exception 'Grade is too long. Keep it under 20 characters.'; end if;
  cnt := coalesce(array_length(p_committees, 1), 0);
  if cnt < 1 or cnt > 3 then raise exception 'Choose up to three committees.'; end if;
  if (select count(distinct x) from unnest(p_committees) x) <> cnt then raise exception 'Pick a different committee for each choice.'; end if;
  if exists (select 1 from unnest(p_committees) x where x is null or not exists (select 1 from public.committees c where c.id = x)) then
    raise exception 'One of those committees does not exist. Reload and try again.';
  end if;
  select id, status into reg, st from public.registrations where profile_id = auth.uid() for update;
  if reg is null and not public.deadline_open('registration') then raise exception 'Sign-up has closed.'; end if;
  if st is not null and st not in ('applied', 'approved') then
    raise exception 'Your sign-up can no longer be changed. Ask the secretariat.';
  end if;
  update public.profiles set full_name = n, school_name = sch, grade = g where id = auth.uid();
  if reg is null then
    insert into public.registrations (profile_id, school_id) values (auth.uid(), (select school_id from public.profiles where id = auth.uid()))
    returning id into reg;
  end if;
  delete from public.preferences where registration_id = reg;
  insert into public.preferences (registration_id, rank, committee_id)
  select reg, t.ord::smallint, t.c from unnest(p_committees) with ordinality as t(c, ord);
  perform public.log('sign_up', 'registrations', reg::text);
  return reg;
end $$;

-- The delegate's seat card: committee, seat, room, double-delegation partner and check-in code.
create or replace function public.my_seat_info()
returns table (committee_id uuid, committee_abbr text, committee_name text, room text, seat_id uuid, seat_label text,
               partner text, checkin_code text)
language sql stable security definer set search_path = '' as
$$ select c.id, c.abbr, c.name, c.room, s.id, s.label,
     (select coalesce(p2.full_name, 'Name not given') from public.assignments a2
        join public.registrations r2 on r2.id = a2.registration_id
        join public.profiles p2 on p2.id = r2.profile_id
       where a2.seat_id = s.id and r2.id <> r.id order by r2.created_at limit 1),
     cc.code
   from public.registrations r
   join public.assignments a on a.registration_id = r.id
   join public.seats s on s.id = a.seat_id
   join public.committees c on c.id = s.committee_id
   left join public.checkin_codes cc on cc.registration_id = r.id
   where r.profile_id = auth.uid()
   limit 1 $$;

-- The chairs of a committee, with profile ids (members, chairs and admins).
create or replace function public.committee_chairs(p_committee uuid)
returns table (profile_id uuid, full_name text, role text)
language sql stable security definer set search_path = '' as
$$ select cs.profile_id, p.full_name, cs.role
   from public.committee_staff cs join public.profiles p on p.id = cs.profile_id
   where cs.committee_id = p_committee and (p_committee in (select public.my_committees()) or public.is_admin())
   order by case cs.role when 'chair' then 0 when 'vice_chair' then 1 else 2 end, p.full_name $$;

-- 7b. Delegate in the room ----------------------------------------------------------

create or replace function public.answer_roll(p_status public.roll_status) returns void
language plpgsql security definer set search_path = '' as
$$ declare seat uuid; cid uuid; sid uuid; is_open boolean;
begin
  perform public.require_not_after();
  seat := public.my_seat();
  if seat is null then raise exception 'This opens once you have a seat.'; end if;
  if p_status is null or p_status = 'absent' then raise exception 'Answer present, or present and voting.'; end if;
  cid := public.committee_of_seat(seat);
  select s.id, s.roll_open into sid, is_open from public.sessions s where s.id = public.live_session(cid);
  if sid is null or not is_open then raise exception 'Roll call is not open.'; end if;
  insert into public.roll_calls (session_id, seat_id, status) values (sid, seat, p_status)
    on conflict (session_id, seat_id) do update set status = excluded.status, marked_at = now();
end $$;

create or replace function public.join_speakers() returns void
language plpgsql security definer set search_path = '' as
$$ declare seat uuid; cid uuid; pos integer;
begin
  perform public.require_not_after();
  seat := public.my_seat();
  if seat is null then raise exception 'This opens once you have a seat.'; end if;
  cid := public.committee_of_seat(seat);
  perform 1 from public.committee_live where committee_id = cid for update;   -- serialise joins
  if exists (select 1 from public.speakers where committee_id = cid and seat_id = seat and status in ('waiting', 'speaking')) then
    raise exception 'You are already on the speakers list.';
  end if;
  select coalesce(max(position), 0) + 1 into pos from public.speakers where committee_id = cid and status = 'waiting';
  insert into public.speakers (committee_id, session_id, seat_id, position) values (cid, public.live_session(cid), seat, pos);
end $$;

create or replace function public.leave_speakers() returns void
language plpgsql security definer set search_path = '' as
$$ declare seat uuid; cid uuid;
begin
  perform public.require_not_after();
  seat := public.my_seat();
  if seat is null then raise exception 'This opens once you have a seat.'; end if;
  cid := public.committee_of_seat(seat);
  delete from public.speakers where committee_id = cid and seat_id = seat and status = 'waiting';
  if not found then raise exception 'You are not waiting on the speakers list.'; end if;
  perform public.renumber_speakers(cid);
end $$;

-- One ballot per seat. Absent seats cannot vote; present-and-voting seats cannot abstain.
create or replace function public.cast_ballot(p_vote uuid, p_choice public.vote_choice) returns void
language plpgsql security definer set search_path = '' as
$$ declare r public.vote_rounds; seat uuid; rs public.roll_status;
begin
  perform public.require_not_after();
  select * into r from public.vote_rounds where id = p_vote;
  if r.id is null then raise exception 'That vote no longer exists.'; end if;
  if r.status <> 'open' then raise exception 'This vote is closed.'; end if;
  if p_choice is null then raise exception 'Choose yes, no or abstain.'; end if;
  select x into seat from public.my_seats() x where public.committee_of_seat(x) = r.committee_id limit 1;
  if seat is null then raise exception 'You can only vote in your own committee.'; end if;
  if r.session_id is not null then
    select rc.status into rs from public.roll_calls rc where rc.session_id = r.session_id and rc.seat_id = seat;
  end if;
  if rs = 'absent' then raise exception 'You are marked absent. Tell the chair.'; end if;
  if rs = 'present_voting' and p_choice = 'abstain' then
    raise exception 'You answered present and voting, so you cannot abstain.';
  end if;
  begin
    insert into public.votes (committee_id, round_id, seat_id, choice, cast_by) values (r.committee_id, p_vote, seat, p_choice, auth.uid());
  exception when unique_violation then
    raise exception 'Your seat has already voted.';
  end;
end $$;

-- Every vote in a committee, open first, then the most recent closed.
-- Delegates get their own ballot and no counts while a vote is open; the dais always gets counts.
create or replace function public.committee_votes(p_committee uuid)
returns table (id uuid, target text, target_id uuid, title text, majority text, status text, opened_at timestamptz,
               closed_at timestamptz, my_vote public.vote_choice, yes_count integer, no_count integer,
               abstain_count integer, not_voted integer, passed boolean)
language plpgsql stable security definer set search_path = '' as
$$
#variable_conflict use_column
declare dais boolean := public.chairs(p_committee); me uuid;
begin
  if not dais and p_committee not in (select public.my_committees()) then
    raise exception 'You can only see votes in your own committee.';
  end if;
  select x into me from public.my_seats() x where public.committee_of_seat(x) = p_committee limit 1;
  return query
  select r.id, r.target, coalesce(r.motion_id, r.document_id), r.title, r.majority, r.status, r.opened_at, r.closed_at,
         (select v.choice from public.votes v where v.round_id = r.id and v.seat_id = me),
         case when r.status = 'closed' then r.yes_count     when dais then coalesce(r.recorded_yes, lc.y) end,
         case when r.status = 'closed' then r.no_count      when dais then coalesce(r.recorded_no, lc.n) end,
         case when r.status = 'closed' then r.abstain_count when dais then coalesce(r.recorded_abstain, lc.a) end,
         case when r.status = 'closed' then r.not_voted
              when dais then greatest(public.round_eligible(r.committee_id, r.session_id)
                                      - coalesce(r.recorded_yes, lc.y) - coalesce(r.recorded_no, lc.n) - coalesce(r.recorded_abstain, lc.a), 0) end,
         r.passed
    from public.vote_rounds r
    cross join lateral (
      select (count(*) filter (where v.choice = 'yes'))::integer as y,
             (count(*) filter (where v.choice = 'no'))::integer as n,
             (count(*) filter (where v.choice = 'abstain'))::integer as a
        from public.votes v where v.round_id = r.id) lc
   where r.committee_id = p_committee
   order by (r.status = 'open') desc, coalesce(r.closed_at, r.opened_at) desc
   limit 50;
end $$;

-- Save (or edit) my working paper, draft resolution or amendment; optionally send it to the chair.
-- My seat is always a sponsor. Editing is allowed while it is a draft or after the chair returned it.
create or replace function public.save_document(
  p_id uuid, p_type public.doc_type, p_title text, p_body text, p_parent uuid, p_clause text,
  p_sponsors uuid[], p_signatories uuid[], p_file_path text, p_original_name text, p_submit boolean)
returns uuid language plpgsql security definer set search_path = '' as
$$ declare mine uuid; cid uuid; d public.documents; doc uuid; bad integer;
          t text := trim(coalesce(p_title, ''));
          b text := nullif(trim(coalesce(p_body, '')), '');
          cl text := nullif(trim(coalesce(p_clause, '')), '');
begin
  perform public.require_not_after();
  mine := public.my_seat();
  if mine is null then raise exception 'This opens once you have a seat.'; end if;
  cid := public.committee_of_seat(mine);
  if t = '' then raise exception 'Give your paper a title.'; end if;
  if length(t) > 200 then raise exception 'The title is too long. Keep it under 200 characters.'; end if;
  if length(b) > 60000 then raise exception 'The text is too long. Keep it under 60000 characters.'; end if;
  if length(cl) > 120 then raise exception 'The clause is too long. Keep it under 120 characters.'; end if;
  if p_type = 'amendment' and p_parent is null then raise exception 'Choose the draft resolution this amendment changes.'; end if;
  if p_type <> 'amendment' and p_parent is not null then raise exception 'Only amendments point at a draft resolution.'; end if;
  if p_parent is not null and not exists (
       select 1 from public.documents x where x.id = p_parent and x.committee_id = cid and x.type = 'draft_resolution'
         and x.status in ('approved', 'voting')) then
    raise exception 'Amendments can only change an approved draft resolution in your committee.';
  end if;
  select count(*) into bad from unnest(coalesce(p_sponsors, '{}') || coalesce(p_signatories, '{}')) x
   where public.committee_of_seat(x) is distinct from cid;
  if bad > 0 then raise exception 'Every sponsor and signatory must be a seat in your committee.'; end if;
  if p_file_path is not null and split_part(p_file_path, '/', 1) <> cid::text then
    raise exception 'That file was not uploaded to your committee.';
  end if;
  if p_id is not null then
    select * into d from public.documents where id = p_id for update;
    if d.id is null or d.submitted_by is distinct from auth.uid() then raise exception 'You can only edit your own papers.'; end if;
    if not (d.submitted_at is null or d.status = 'rejected') then
      raise exception 'This paper is with the chair. You can edit it only if the chair returns it.';
    end if;
  end if;
  if p_submit then
    if b is null and p_file_path is null and d.file_path is null then raise exception 'Add the text of your paper or upload a file.'; end if;
    if not public.deadline_open('resolution') then raise exception 'The resolution deadline has passed.'; end if;
  end if;
  if p_id is not null then
    update public.documents
       set type = p_type, title = t, body = b, parent_id = p_parent, clause = cl,
           file_path = coalesce(p_file_path, file_path),
           original_name = case when p_file_path is not null then left(p_original_name, 200) else original_name end,
           submitted_at = case when p_submit then now() end,
           status = 'submitted',
           return_comment = case when p_submit then null else return_comment end
     where id = p_id;
    doc := p_id;
    delete from public.document_sponsors where document_id = doc;
  else
    insert into public.documents (committee_id, type, title, body, file_path, original_name, parent_id, clause,
                                  submitted_by, submitted_seat_id, submitted_at, status)
    values (cid, p_type, t, b, p_file_path, left(p_original_name, 200), p_parent, cl,
            auth.uid(), mine, case when p_submit then now() end, 'submitted')
    returning id into doc;
  end if;
  insert into public.document_sponsors (document_id, seat_id, role)
  select doc, x, case when bool_or(sp) then 'sponsor' else 'signatory' end
    from (select mine as x, true as sp
          union all select unnest(coalesce(p_sponsors, '{}')), true
          union all select unnest(coalesce(p_signatories, '{}')), false) s
   where x is not null
   group by x;
  return doc;
end $$;

-- Chits from a delegate. null = to the dais. Every chit is delivered at once; the dais reads them all and can
-- block one later (chair_set_chit_status), which hides it from the recipient. Same rule as the demo.
create or replace function public.send_chit(p_to uuid, p_body text, p_reply_to uuid default null) returns void
language plpgsql security definer set search_path = '' as
$$ declare mine uuid; cid uuid; b text := trim(coalesce(p_body, ''));
begin
  perform public.require_not_after();
  mine := public.my_seat();
  if mine is null then raise exception 'This opens once you have a seat.'; end if;
  cid := public.committee_of_seat(mine);
  if b = '' then raise exception 'Write something before sending.'; end if;
  if length(b) > 300 then raise exception 'Chits can be up to 300 characters.'; end if;
  if p_to is not null and (p_to = mine or public.committee_of_seat(p_to) is distinct from cid) then
    raise exception 'Choose a seat in your committee.';
  end if;
  if p_reply_to is not null and not exists (
       select 1 from public.notes n where n.id = p_reply_to and n.committee_id = cid
         and (n.from_seat_id = mine or (n.to_seat_id = mine and n.status = 'delivered'))) then
    raise exception 'You can only reply to your own chits.';
  end if;
  insert into public.notes (committee_id, from_seat_id, to_seat_id, body, reply_to, status, sent_by)
  values (cid, mine, p_to, b, p_reply_to, 'delivered', auth.uid());
end $$;

-- 7c. Files (all three dashboards) ----------------------------------------------------

-- Add a file (already uploaded to the 'library' bucket) or a link.
--   conference: core admins, path conference/…   committee: its chairs, path committee/<id>/…
--   mine: anyone signed in, path mine/<uid>/…, optionally shared with seats in their committee.
create or replace function public.add_library_file(p_scope text, p_committee uuid, p_title text, p_kind text,
  p_file_path text, p_original_name text, p_link text, p_size bigint, p_share uuid[] default '{}')
returns uuid language plpgsql security definer set search_path = '' as
$$ declare fid uuid; t text := trim(coalesce(p_title, '')); lbl text; mine uuid; prefix text;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if t = '' then raise exception 'Give the file a title.'; end if;
  if length(t) > 160 then raise exception 'The title is too long. Keep it under 160 characters.'; end if;
  if (p_file_path is null) = (nullif(trim(coalesce(p_link, '')), '') is null) then raise exception 'Add a file or a link, not both.'; end if;
  if p_link is not null and trim(p_link) !~* '^https?://' then raise exception 'Links must start with http:// or https://.'; end if;
  if p_scope = 'conference' then
    if not public.is_core() then raise exception 'Only the core secretariat can add conference files.'; end if;
    prefix := 'conference/'; lbl := 'Secretariat';
  elsif p_scope = 'committee' then
    if p_committee is null or not public.chairs(p_committee) then raise exception 'Only the chairs of this committee can add committee files.'; end if;
    prefix := 'committee/' || p_committee::text || '/';
    lbl := coalesce((select full_name from public.profiles where id = auth.uid()), 'Chair');
  elsif p_scope = 'mine' then
    prefix := 'mine/' || auth.uid()::text || '/';
    lbl := (select full_name from public.profiles where id = auth.uid());
  else
    raise exception 'Unknown file type.';
  end if;
  if p_file_path is not null and left(p_file_path, length(prefix)) <> prefix then raise exception 'That file was uploaded to the wrong folder.'; end if;
  if coalesce(p_kind, 'other') not in ('guide', 'rules', 'handbook', 'schedule', 'map', 'research', 'other') then
    raise exception 'Choose what kind of file this is.';
  end if;
  insert into public.library_files (scope, committee_id, owner_id, title, kind, file_path, original_name, link, size_bytes, added_by, added_by_label)
  values (p_scope, case when p_scope = 'committee' then p_committee end, case when p_scope = 'mine' then auth.uid() end,
          t, coalesce(p_kind, 'other'), p_file_path, left(p_original_name, 200), nullif(trim(coalesce(p_link, '')), ''),
          p_size, auth.uid(), lbl)
  returning id into fid;
  if p_scope = 'mine' and coalesce(array_length(p_share, 1), 0) > 0 then
    perform public.share_library_file(fid, p_share);
  end if;
  return fid;
end $$;

-- Replace who a private file is shared with (seats in the owner's committee).
create or replace function public.share_library_file(p_file uuid, p_seats uuid[]) returns void
language plpgsql security definer set search_path = '' as
$$ declare mine uuid;
begin
  if not exists (select 1 from public.library_files where id = p_file and owner_id = auth.uid()) then
    raise exception 'You can only share your own files.';
  end if;
  mine := public.my_seat();
  if coalesce(array_length(p_seats, 1), 0) > 0 then
    if mine is null then raise exception 'You can share once you have a seat.'; end if;
    if exists (select 1 from unnest(p_seats) x where public.committee_of_seat(x) is distinct from public.committee_of_seat(mine)) then
      raise exception 'You can only share with seats in your committee.';
    end if;
  end if;
  delete from public.library_shares where file_id = p_file;
  insert into public.library_shares (file_id, seat_id)
  select distinct p_file, x from unnest(coalesce(p_seats, '{}')) x where x is not null and x is distinct from mine;
end $$;

-- Remove a file row. Returns its storage path (or null for a link) so the app deletes the object.
create or replace function public.remove_library_file(p_file uuid) returns text
language plpgsql security definer set search_path = '' as
$$ declare f public.library_files;
begin
  select * into f from public.library_files where id = p_file;
  if f.id is null then raise exception 'That file has already been removed.'; end if;
  if not ((f.scope = 'mine' and f.owner_id = auth.uid())
          or (f.scope = 'committee' and public.chairs(f.committee_id))
          or (f.scope = 'conference' and public.is_core())) then
    raise exception 'You can only remove files you are allowed to manage.';
  end if;
  delete from public.library_files where id = p_file;
  return f.file_path;
end $$;

-- 7d. Chair: run the session ----------------------------------------------------------

-- Committees the caller runs (admins: every committee), with the caller's dais role.
create or replace function public.my_dais_committees()
returns table (id uuid, abbr text, name text, room text, sort smallint, my_role text)
language sql stable security definer set search_path = '' as
$$ select c.id, c.abbr, c.name, c.room, c.sort,
          coalesce((select cs.role from public.committee_staff cs where cs.committee_id = c.id and cs.profile_id = auth.uid()), 'chair')
   from public.committees c where c.id in (select public.my_chaired_committees())
   order by c.sort, c.abbr $$;

create or replace function public.chair_start_session(p_committee uuid) returns void
language plpgsql security definer set search_path = '' as
$$ declare n integer;
begin
  if not public.chairs(p_committee) then raise exception 'Only the chairs of this committee can do that.'; end if;
  perform public.require_not_after();
  perform public.ensure_live(p_committee);
  perform 1 from public.committee_live where committee_id = p_committee for update;
  if public.live_session(p_committee) is not null then raise exception 'A session is already running. End it first.'; end if;
  select coalesce(max(number), 0) + 1 into n from public.sessions where committee_id = p_committee and status in ('live', 'closed');
  if n > 50 then raise exception 'This committee has reached the session limit.'; end if;
  insert into public.sessions (committee_id, number, status, started_at, ended_at, roll_open)
  values (p_committee, n, 'live', now(), null, false)
  on conflict (committee_id, number) do update set status = 'live', started_at = now(), ended_at = null, roll_open = false;
  perform public.log('start_session', 'sessions', p_committee::text, jsonb_build_object('number', n));
end $$;

create or replace function public.chair_end_session(p_committee uuid) returns void
language plpgsql security definer set search_path = '' as
$$ declare sid uuid;
begin
  if not public.chairs(p_committee) then raise exception 'Only the chairs of this committee can do that.'; end if;
  sid := public.live_session(p_committee);
  if sid is null then raise exception 'No session is running.'; end if;
  update public.sessions set status = 'closed', ended_at = now(), roll_open = false where id = sid;
  perform public.ensure_live(p_committee);
  update public.committee_live
     set timer_remaining = case when timer_running then least(greatest(0, ceil(extract(epoch from timer_ends_at - now())))::integer, 10800) else timer_remaining end,
         timer_running = false, timer_ends_at = null
   where committee_id = p_committee;
  perform public.log('end_session', 'sessions', sid::text);
end $$;

create or replace function public.chair_set_agenda(p_committee uuid, p_agenda text, p_motion text) returns void
language plpgsql security definer set search_path = '' as
$$ declare ag text := nullif(trim(coalesce(p_agenda, '')), ''); mo text := nullif(trim(coalesce(p_motion, '')), '');
begin
  if not public.chairs(p_committee) then raise exception 'Only the chairs of this committee can do that.'; end if;
  if length(ag) > 200 or length(mo) > 200 then raise exception 'Keep it under 200 characters.'; end if;
  perform public.ensure_live(p_committee);
  update public.committee_live set agenda_item = ag, current_motion = mo where committee_id = p_committee;
end $$;

-- Load the timer (stopped). Any length from 5 seconds to 3 hours.
create or replace function public.chair_set_timer(p_committee uuid, p_kind text, p_label text, p_duration integer, p_speaker uuid default null)
returns void language plpgsql security definer set search_path = '' as
$$ begin
  if not public.chairs(p_committee) then raise exception 'Only the chairs of this committee can do that.'; end if;
  if p_kind is null or p_kind not in ('speech', 'caucus', 'session', 'other') then raise exception 'Choose a timer type.'; end if;
  if p_duration is null or p_duration < 5 or p_duration > 10800 then raise exception 'The timer can be from 5 seconds to 3 hours.'; end if;
  if p_speaker is not null and public.committee_of_seat(p_speaker) is distinct from p_committee then
    raise exception 'That seat is not in this committee.';
  end if;
  perform public.ensure_live(p_committee);
  update public.committee_live
     set timer_kind = p_kind, timer_label = nullif(left(trim(coalesce(p_label, '')), 120), ''), timer_duration = p_duration,
         timer_running = false, timer_ends_at = null, timer_remaining = p_duration, timer_speaker_seat_id = p_speaker
   where committee_id = p_committee;
end $$;

-- start | pause | reset | add (p_seconds may be negative; works while running).
create or replace function public.chair_timer(p_committee uuid, p_action text, p_seconds integer default 0)
returns void language plpgsql security definer set search_path = '' as
$$ declare t public.committee_live; left_s integer;
begin
  if not public.chairs(p_committee) then raise exception 'Only the chairs of this committee can do that.'; end if;
  perform public.ensure_live(p_committee);
  select * into t from public.committee_live where committee_id = p_committee for update;
  left_s := case when t.timer_running then greatest(0, ceil(extract(epoch from t.timer_ends_at - now())))::integer
                 else t.timer_remaining end;
  if p_action = 'start' then
    if t.timer_running then return; end if;
    if left_s <= 0 then left_s := t.timer_duration; end if;
    if left_s <= 0 then raise exception 'Set the timer length first.'; end if;
    update public.committee_live set timer_running = true, timer_ends_at = now() + make_interval(secs => left_s), timer_remaining = left_s
     where committee_id = p_committee;
  elsif p_action = 'pause' then
    update public.committee_live set timer_running = false, timer_ends_at = null, timer_remaining = least(left_s, 10800)
     where committee_id = p_committee;
  elsif p_action = 'reset' then
    update public.committee_live set timer_running = false, timer_ends_at = null, timer_remaining = timer_duration
     where committee_id = p_committee;
  elsif p_action = 'add' then
    if p_seconds is null or abs(p_seconds) > 10800 then raise exception 'You can add up to 3 hours at a time.'; end if;
    left_s := least(greatest(left_s + p_seconds, 0), 10800);
    if t.timer_running then
      update public.committee_live set timer_ends_at = now() + make_interval(secs => left_s), timer_remaining = left_s
       where committee_id = p_committee;
    else
      update public.committee_live set timer_remaining = left_s where committee_id = p_committee;
    end if;
  else
    raise exception 'Unknown timer action.';
  end if;
end $$;

-- Roll call (needs a running session). Closing marks every unanswered filled seat absent.
create or replace function public.chair_open_roll(p_committee uuid) returns void
language plpgsql security definer set search_path = '' as
$$ declare sid uuid;
begin
  if not public.chairs(p_committee) then raise exception 'Only the chairs of this committee can do that.'; end if;
  perform public.require_not_after();
  sid := public.live_session(p_committee);
  if sid is null then raise exception 'Start the session first.'; end if;
  update public.sessions set roll_open = true where id = sid;
end $$;

create or replace function public.chair_close_roll(p_committee uuid) returns void
language plpgsql security definer set search_path = '' as
$$ declare sid uuid;
begin
  if not public.chairs(p_committee) then raise exception 'Only the chairs of this committee can do that.'; end if;
  sid := public.live_session(p_committee);
  if sid is null then raise exception 'No session is running.'; end if;
  insert into public.roll_calls (session_id, seat_id, status)
  select sid, s.id, 'absent' from public.seats s
   where s.committee_id = p_committee and exists (select 1 from public.assignments a where a.seat_id = s.id)
  on conflict (session_id, seat_id) do nothing;
  update public.sessions set roll_open = false where id = sid;
end $$;

create or replace function public.chair_mark_roll(p_committee uuid, p_seat uuid, p_status public.roll_status) returns void
language plpgsql security definer set search_path = '' as
$$ declare sid uuid;
begin
  if not public.chairs(p_committee) then raise exception 'Only the chairs of this committee can do that.'; end if;
  if public.committee_of_seat(p_seat) is distinct from p_committee then raise exception 'That seat is not in this committee.'; end if;
  if p_status is null then raise exception 'Choose present, present and voting, or absent.'; end if;
  sid := public.live_session(p_committee);
  if sid is null then raise exception 'Start the session first.'; end if;
  insert into public.roll_calls (session_id, seat_id, status) values (sid, p_seat, p_status)
    on conflict (session_id, seat_id) do update set status = excluded.status, marked_at = now();
end $$;

-- Speakers' list.
create or replace function public.chair_add_speaker(p_committee uuid, p_seat uuid) returns void
language plpgsql security definer set search_path = '' as
$$ declare pos integer;
begin
  if not public.chairs(p_committee) then raise exception 'Only the chairs of this committee can do that.'; end if;
  perform public.require_not_after();
  if public.committee_of_seat(p_seat) is distinct from p_committee then raise exception 'That seat is not in this committee.'; end if;
  perform public.ensure_live(p_committee);
  perform 1 from public.committee_live where committee_id = p_committee for update;
  if exists (select 1 from public.speakers where committee_id = p_committee and seat_id = p_seat and status in ('waiting', 'speaking')) then
    raise exception 'That seat is already on the speakers list.';
  end if;
  select coalesce(max(position), 0) + 1 into pos from public.speakers where committee_id = p_committee and status = 'waiting';
  insert into public.speakers (committee_id, session_id, seat_id, position) values (p_committee, public.live_session(p_committee), p_seat, pos);
end $$;

create or replace function public.chair_move_speaker(p_speaker uuid, p_position integer) returns void
language plpgsql security definer set search_path = '' as
$$ declare cid uuid; st text; n integer; target integer;
begin
  select committee_id, status into cid, st from public.speakers where id = p_speaker;
  if cid is null then raise exception 'That speaker is no longer on the list.'; end if;
  if not public.chairs(cid) then raise exception 'Only the chairs of this committee can do that.'; end if;
  if st <> 'waiting' then raise exception 'Only waiting speakers can be moved.'; end if;
  perform public.renumber_speakers(cid);
  select count(*) into n from public.speakers where committee_id = cid and status = 'waiting';
  target := least(greatest(coalesce(p_position, 1), 1), n);
  update public.speakers set position = case
           when id = p_speaker then target
           when position >= target and position < (select position from public.speakers where id = p_speaker) then position + 1
           when position <= target and position > (select position from public.speakers where id = p_speaker) then position - 1
           else position end
   where committee_id = cid and status = 'waiting';
  perform public.renumber_speakers(cid);
end $$;

create or replace function public.chair_remove_speaker(p_speaker uuid) returns void
language plpgsql security definer set search_path = '' as
$$ declare cid uuid;
begin
  select committee_id into cid from public.speakers where id = p_speaker;
  if cid is null then return; end if;
  if not public.chairs(cid) then raise exception 'Only the chairs of this committee can do that.'; end if;
  delete from public.speakers where id = p_speaker;
  update public.committee_live set timer_speaker_seat_id = null
   where committee_id = cid and timer_speaker_seat_id is not null
     and not exists (select 1 from public.speakers s where s.committee_id = cid and s.status = 'speaking');
  perform public.renumber_speakers(cid);
end $$;

-- The current speaker is done; the next waiting one speaks and the timer starts for them.
create or replace function public.chair_next_speaker(p_committee uuid, p_seconds integer) returns void
language plpgsql security definer set search_path = '' as
$$ declare sid uuid; nxt uuid; nxt_seat uuid; lbl text; had_current boolean;
begin
  if not public.chairs(p_committee) then raise exception 'Only the chairs of this committee can do that.'; end if;
  if p_seconds is null or p_seconds < 5 or p_seconds > 10800 then raise exception 'The timer can be from 5 seconds to 3 hours.'; end if;
  perform public.ensure_live(p_committee);
  perform 1 from public.committee_live where committee_id = p_committee for update;
  sid := public.live_session(p_committee);
  update public.speakers set status = 'done', session_id = coalesce(sid, session_id)
   where committee_id = p_committee and status = 'speaking';
  had_current := found;
  select s.id, s.seat_id into nxt, nxt_seat from public.speakers s
   where s.committee_id = p_committee and s.status = 'waiting' order by s.position, s.created_at limit 1;
  if nxt is null then
    if not had_current then raise exception 'No one is waiting on the speakers list.'; end if;
    update public.committee_live set timer_running = false, timer_ends_at = null, timer_remaining = 0, timer_speaker_seat_id = null
     where committee_id = p_committee;
    return;
  end if;
  update public.speakers set status = 'speaking', session_id = coalesce(sid, session_id) where id = nxt;
  select label into lbl from public.seats where id = nxt_seat;
  update public.committee_live
     set timer_kind = 'speech', timer_label = left(lbl, 120), timer_duration = p_seconds, timer_running = true,
         timer_ends_at = now() + make_interval(secs => p_seconds), timer_remaining = p_seconds, timer_speaker_seat_id = nxt_seat
   where committee_id = p_committee;
  perform public.renumber_speakers(p_committee);
end $$;

-- 7e. Chair: votes -----------------------------------------------------------------

-- Internal: close a round, store its counts and result, and mark the motion or paper passed / failed.
create or replace function public.finish_round(p_vote uuid) returns void
language plpgsql security definer set search_path = '' as
$$ declare r public.vote_rounds; y integer; n integer; a integer; elig integer; ok boolean;
begin
  select * into r from public.vote_rounds where id = p_vote;
  if r.recorded_yes is not null or r.recorded_no is not null or r.recorded_abstain is not null then
    y := coalesce(r.recorded_yes, 0); n := coalesce(r.recorded_no, 0); a := coalesce(r.recorded_abstain, 0);
  else
    select (count(*) filter (where v.choice = 'yes'))::integer, (count(*) filter (where v.choice = 'no'))::integer,
           (count(*) filter (where v.choice = 'abstain'))::integer
      into y, n, a from public.votes v where v.round_id = p_vote;
  end if;
  elig := public.round_eligible(r.committee_id, r.session_id);
  ok := case when r.majority = 'two_thirds' then y > 0 and y * 3 >= (y + n) * 2 else y > n end;
  update public.vote_rounds
     set status = 'closed', closed_at = coalesce(closed_at, now()),
         yes_count = y, no_count = n, abstain_count = a, not_voted = greatest(elig - y - n - a, 0), passed = ok
   where id = p_vote;
  if r.document_id is not null then
    update public.documents set status = case when ok then 'passed'::public.doc_status else 'failed'::public.doc_status end
     where id = r.document_id;
  end if;
  if r.motion_id is not null then
    update public.motions set status = case when ok then 'passed'::public.motion_status else 'failed'::public.motion_status end,
           closed_at = coalesce(closed_at, now())
     where id = r.motion_id;
  end if;
end $$;

create or replace function public.chair_open_vote(p_committee uuid, p_target text, p_target_id uuid, p_title text, p_majority text)
returns uuid language plpgsql security definer set search_path = '' as
$$ declare vid uuid; t text := trim(coalesce(p_title, '')); dt public.doc_type; dst public.doc_status; mid uuid; did uuid;
begin
  if not public.chairs(p_committee) then raise exception 'Only the chairs of this committee can do that.'; end if;
  perform public.require_not_after();
  if p_target is null or p_target not in ('motion', 'resolution', 'amendment') then raise exception 'Choose what the vote is on.'; end if;
  if p_majority is null or p_majority not in ('simple', 'two_thirds') then raise exception 'Choose a simple or two-thirds majority.'; end if;
  if t = '' then raise exception 'Give the vote a title.'; end if;
  if length(t) > 200 then raise exception 'The title is too long. Keep it under 200 characters.'; end if;
  if exists (select 1 from public.vote_rounds where committee_id = p_committee and status = 'open') then
    raise exception 'Close the open vote first.';
  end if;
  if p_target_id is not null then
    if p_target = 'motion' then
      if not exists (select 1 from public.motions where id = p_target_id and committee_id = p_committee) then
        raise exception 'That motion is not in this committee.'; end if;
      mid := p_target_id;
      update public.motions set status = 'voting', opened_at = now() where id = mid;
    else
      select type, status into dt, dst from public.documents where id = p_target_id and committee_id = p_committee and submitted_at is not null;
      if dt is null then raise exception 'That paper is not in this committee.'; end if;
      if (p_target = 'amendment') <> (dt = 'amendment') then raise exception 'That paper is the wrong kind for this vote.'; end if;
      if dst not in ('approved', 'voting') then raise exception 'Approve the paper before putting it to a vote.'; end if;
      did := p_target_id;
      update public.documents set status = 'voting' where id = did;
    end if;
  end if;
  insert into public.vote_rounds (committee_id, session_id, target, motion_id, document_id, title, majority, opened_by)
  values (p_committee, public.live_session(p_committee), p_target, mid, did, t, p_majority, auth.uid())
  returning id into vid;
  return vid;
exception when unique_violation then
  raise exception 'Close the open vote first.';
end $$;

create or replace function public.chair_close_vote(p_vote uuid) returns void
language plpgsql security definer set search_path = '' as
$$ declare cid uuid; st text;
begin
  select committee_id, status into cid, st from public.vote_rounds where id = p_vote for update;
  if cid is null then raise exception 'That vote no longer exists.'; end if;
  if not public.chairs(cid) then raise exception 'Only the chairs of this committee can do that.'; end if;
  if st = 'closed' then return; end if;
  perform public.finish_round(p_vote);
end $$;

-- A placard count instead of phones. It wins over phone ballots; on a closed vote the result is recomputed.
create or replace function public.chair_record_count(p_vote uuid, p_yes integer, p_no integer, p_abstain integer) returns void
language plpgsql security definer set search_path = '' as
$$ declare cid uuid; st text;
begin
  select committee_id, status into cid, st from public.vote_rounds where id = p_vote for update;
  if cid is null then raise exception 'That vote no longer exists.'; end if;
  if not public.chairs(cid) then raise exception 'Only the chairs of this committee can do that.'; end if;
  if p_yes is null or p_no is null or p_abstain is null or p_yes < 0 or p_no < 0 or p_abstain < 0
     or p_yes > 1000 or p_no > 1000 or p_abstain > 1000 then
    raise exception 'Counts must be whole numbers from 0 to 1000.';
  end if;
  update public.vote_rounds set recorded_yes = p_yes, recorded_no = p_no, recorded_abstain = p_abstain where id = p_vote;
  if st = 'closed' then perform public.finish_round(p_vote); end if;
end $$;

-- 7f. Chair: people, papers, resolutions, chits, notices ----------------------------------

-- Every seat with its delegates' names and whether one of them has checked in (any conference day).
create or replace function public.dais_seats(p_committee uuid)
returns table (seat_id uuid, seat_label text, capacity smallint, delegates text[], checked_in boolean)
language sql stable security definer set search_path = '' as
$$ select s.id, s.label, s.capacity,
          coalesce(array_agg(coalesce(p.full_name, 'Name not given') order by p.full_name) filter (where r.id is not null), '{}'::text[]),
          coalesce(bool_or(exists (select 1 from public.checkins ci where ci.registration_id = r.id)), false)
   from public.seats s
   left join public.assignments a on a.seat_id = s.id
   left join public.registrations r on r.id = a.registration_id
   left join public.profiles p on p.id = r.profile_id
   where s.committee_id = p_committee and public.chairs(p_committee)
   group by s.id, s.label, s.capacity
   order by s.label $$;

-- Every seat's latest position paper.
create or replace function public.committee_papers(p_committee uuid)
returns table (seat_id uuid, seat_label text, delegates text[], registration_id uuid, file_path text, original_name text,
               submitted_at timestamptz, seen_at timestamptz)
language sql stable security definer set search_path = '' as
$$ select s.id, s.label,
          coalesce((select array_agg(coalesce(p.full_name, 'Name not given') order by p.full_name)
                      from public.assignments a join public.registrations r on r.id = a.registration_id
                      join public.profiles p on p.id = r.profile_id where a.seat_id = s.id), '{}'::text[]),
          pp.registration_id, pp.file_path, pp.original_name, pp.submitted_at, pp.seen_at
   from public.seats s
   left join lateral (select x.registration_id, x.file_path, x.original_name, x.submitted_at, x.seen_at
                        from public.position_papers x join public.assignments a on a.registration_id = x.registration_id
                       where a.seat_id = s.id order by x.submitted_at desc limit 1) pp on true
   where s.committee_id = p_committee and public.chairs(p_committee)
   order by s.label $$;

create or replace function public.chair_mark_paper_seen(p_committee uuid, p_seat uuid) returns void
language plpgsql security definer set search_path = '' as
$$ begin
  if not public.chairs(p_committee) then raise exception 'Only the chairs of this committee can do that.'; end if;
  if public.committee_of_seat(p_seat) is distinct from p_committee then raise exception 'That seat is not in this committee.'; end if;
  update public.position_papers set seen_at = now(), seen_by = auth.uid()
   where registration_id in (select a.registration_id from public.assignments a where a.seat_id = p_seat);
  if not found then raise exception 'This seat has not sent a position paper yet.'; end if;
end $$;

create or replace function public.chair_approve_document(p_document uuid, p_number text) returns void
language plpgsql security definer set search_path = '' as
$$ declare d public.documents; num text := nullif(trim(coalesce(p_number, '')), '');
begin
  select * into d from public.documents where id = p_document for update;
  if d.id is null or d.submitted_at is null then raise exception 'That paper no longer exists.'; end if;
  if not public.chairs(d.committee_id) then raise exception 'Only the chairs of this committee can do that.'; end if;
  if num is null then raise exception 'Give it a number, like DR 1.1.'; end if;
  if length(num) > 20 then raise exception 'Keep the number under 20 characters.'; end if;
  if d.status not in ('submitted', 'approved') then raise exception 'Only a submitted paper can be approved.'; end if;
  update public.documents
     set status = 'approved', number = num, return_comment = null,
         type = case when d.type = 'working_paper' then 'draft_resolution'::public.doc_type else d.type end
   where id = p_document;
exception when unique_violation then
  raise exception 'That number is already used in this committee.';
end $$;

create or replace function public.chair_return_document(p_document uuid, p_comment text) returns void
language plpgsql security definer set search_path = '' as
$$ declare d public.documents; c text := trim(coalesce(p_comment, ''));
begin
  select * into d from public.documents where id = p_document for update;
  if d.id is null or d.submitted_at is null then raise exception 'That paper no longer exists.'; end if;
  if not public.chairs(d.committee_id) then raise exception 'Only the chairs of this committee can do that.'; end if;
  if c = '' then raise exception 'Say what needs to change.'; end if;
  if length(c) > 1000 then raise exception 'Keep the comment under 1000 characters.'; end if;
  if d.status not in ('submitted', 'approved') then raise exception 'Only a submitted paper can be returned.'; end if;
  update public.documents set status = 'rejected', return_comment = c, number = null where id = p_document;
end $$;

create or replace function public.chair_set_chit_status(p_note uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as
$$ declare cid uuid;
begin
  select committee_id into cid from public.notes where id = p_note;
  if cid is null then raise exception 'That chit no longer exists.'; end if;
  if not public.chairs(cid) then raise exception 'Only the chairs of this committee can do that.'; end if;
  if p_status is null or p_status not in ('delivered', 'blocked') then raise exception 'Choose deliver or block.'; end if;
  update public.notes
     set status = case when p_status = 'delivered' then 'delivered'::public.note_status else 'rejected'::public.note_status end,
         decided_by = auth.uid(), decided_at = now()
   where id = p_note;
end $$;

-- A chit from the dais. null = to every seat in the committee (one chit each).
create or replace function public.chair_send_chit(p_committee uuid, p_to uuid, p_body text, p_reply_to uuid default null) returns void
language plpgsql security definer set search_path = '' as
$$ declare b text := trim(coalesce(p_body, ''));
begin
  if not public.chairs(p_committee) then raise exception 'Only the chairs of this committee can do that.'; end if;
  if b = '' then raise exception 'Write something before sending.'; end if;
  if length(b) > 300 then raise exception 'Chits can be up to 300 characters.'; end if;
  if p_to is not null and public.committee_of_seat(p_to) is distinct from p_committee then
    raise exception 'Choose a seat in this committee.';
  end if;
  if p_reply_to is not null and not exists (select 1 from public.notes n where n.id = p_reply_to and n.committee_id = p_committee) then
    raise exception 'That chit is not in this committee.';
  end if;
  if p_to is not null then
    insert into public.notes (committee_id, from_seat_id, to_seat_id, body, reply_to, sent_by)
    values (p_committee, null, p_to, b, p_reply_to, auth.uid());
  else
    if not exists (select 1 from public.seats where committee_id = p_committee) then raise exception 'This committee has no seats yet.'; end if;
    insert into public.notes (committee_id, from_seat_id, to_seat_id, body, reply_to, sent_by)
    select p_committee, null, s.id, b, p_reply_to, auth.uid() from public.seats s where s.committee_id = p_committee;
  end if;
end $$;

create or replace function public.chair_announce(p_committee uuid, p_title text, p_body text, p_urgent boolean) returns void
language plpgsql security definer set search_path = '' as
$$ declare t text := trim(coalesce(p_title, '')); b text := nullif(trim(coalesce(p_body, '')), '');
begin
  if not public.chairs(p_committee) then raise exception 'Only the chairs of this committee can do that.'; end if;
  if t = '' then raise exception 'Give the notice a title.'; end if;
  if length(t) > 140 then raise exception 'The title is too long. Keep it under 140 characters.'; end if;
  if length(b) > 4000 then raise exception 'The text is too long. Keep it under 4000 characters.'; end if;
  insert into public.announcements (audience, committee_id, title, body, urgent, from_role, published_at, created_by)
  values ('committee', p_committee, t, b, coalesce(p_urgent, false), 'chair', now(), auth.uid());
end $$;

-- 7g. Chair: awards rubric (never visible to delegates) ------------------------------------

create or replace function public.chair_set_criteria(p_committee uuid, p_criteria jsonb) returns void
language plpgsql security definer set search_path = '' as
$$ declare n integer; c jsonb; clean jsonb := '[]'::jsonb; k text; l text; m numeric;
begin
  if not public.chairs(p_committee) then raise exception 'Only the chairs of this committee can do that.'; end if;
  if p_criteria is null or jsonb_typeof(p_criteria) <> 'array' then raise exception 'Add at least one criterion.'; end if;
  n := jsonb_array_length(p_criteria);
  if n < 1 or n > 12 then raise exception 'Use between 1 and 12 criteria.'; end if;
  for c in select value from jsonb_array_elements(p_criteria) loop
    k := c ->> 'key'; l := trim(coalesce(c ->> 'label', ''));
    if k is null or k !~ '^[a-z0-9_]{1,40}$' then raise exception 'Each criterion needs a short key (letters, numbers, _).'; end if;
    if l = '' or length(l) > 60 then raise exception 'Each criterion needs a label under 60 characters.'; end if;
    if jsonb_typeof(c -> 'max') <> 'number' then raise exception 'Each criterion needs a top mark from 1 to 100.'; end if;
    m := (c ->> 'max')::numeric;
    if m <> trunc(m) or m < 1 or m > 100 then raise exception 'Each criterion needs a top mark from 1 to 100.'; end if;
    if clean @> jsonb_build_array(jsonb_build_object('key', k)) then raise exception 'Two criteria have the same key.'; end if;
    clean := clean || jsonb_build_array(jsonb_build_object('key', k, 'label', l, 'max', m::integer));
  end loop;
  insert into public.committee_criteria (committee_id, criteria, updated_by) values (p_committee, clean, auth.uid())
  on conflict (committee_id) do update set criteria = excluded.criteria, updated_by = excluded.updated_by;
end $$;

-- My score sheet for one seat in one session. Marks: {criterion key: 1..max}; missing = not scored.
create or replace function public.chair_save_score(p_committee uuid, p_seat uuid, p_session integer, p_marks jsonb, p_comment text)
returns void language plpgsql security definer set search_path = '' as
$$ declare crit jsonb; sid uuid; k text; v jsonb; mx integer; num numeric; tot numeric := 0;
          cm text := nullif(trim(coalesce(p_comment, '')), '');
begin
  if not public.chairs(p_committee) then raise exception 'Only the chairs of this committee can do that.'; end if;
  if public.committee_of_seat(p_seat) is distinct from p_committee then raise exception 'That seat is not in this committee.'; end if;
  if p_session is null or p_session < 1 or p_session > 50 then raise exception 'Choose a session.'; end if;
  if p_marks is null or jsonb_typeof(p_marks) <> 'object' then raise exception 'Add the marks.'; end if;
  if length(cm) > 500 then raise exception 'Keep the comment under 500 characters.'; end if;
  crit := coalesce((select criteria from public.committee_criteria where committee_id = p_committee), public.default_criteria());
  for k, v in select e.key, e.value from jsonb_each(p_marks) e loop
    select (x ->> 'max')::integer into mx from jsonb_array_elements(crit) x where x ->> 'key' = k;
    if mx is null then raise exception 'That criterion is not in this committee''s rubric. Reload and try again.'; end if;
    if jsonb_typeof(v) <> 'number' then raise exception 'Each mark must be a whole number from 1 to %.', mx; end if;
    num := (v #>> '{}')::numeric;
    if num <> trunc(num) or num < 1 or num > mx then raise exception 'Each mark must be a whole number from 1 to %.', mx; end if;
    tot := tot + num;
  end loop;
  insert into public.sessions (committee_id, number) values (p_committee, p_session) on conflict (committee_id, number) do nothing;
  select id into sid from public.sessions where committee_id = p_committee and number = p_session;
  insert into public.scores (session_id, seat_id, chair_id, criteria, total, comment)
  values (sid, p_seat, auth.uid(), p_marks, tot, cm)
  on conflict (session_id, seat_id, chair_id) do update set criteria = excluded.criteria, total = excluded.total, comment = excluded.comment;
end $$;

-- 7h. Secretariat ------------------------------------------------------------------

-- Every committee at a glance.
create or replace function public.sec_overview()
returns table (committee_id uuid, abbr text, name text, room text, session_number smallint, session_status public.session_status,
               session_started_at timestamptz, agenda_item text, current_motion text, timer_kind text, timer_label text,
               timer_duration integer, timer_running boolean, timer_ends_at timestamptz, timer_remaining integer,
               speaker_seat_id uuid, speaker_label text, updated_at timestamptz, seats integer, present integer,
               open_vote text, resolutions_passed integer, chits_waiting integer, papers_in integer)
language plpgsql stable security definer set search_path = '' as
$$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'Only the secretariat can see this.'; end if;
  return query
  select c.id, c.abbr, c.name, c.room, ss.number, ss.status, ss.started_at,
         l.agenda_item, l.current_motion, coalesce(l.timer_kind, 'session'), l.timer_label, coalesce(l.timer_duration, 0),
         coalesce(l.timer_running, false), l.timer_ends_at, coalesce(l.timer_remaining, 0), l.timer_speaker_seat_id, sp.label,
         coalesce(l.updated_at, c.created_at),
         (select count(*) from public.seats s where s.committee_id = c.id)::integer,
         (select case when count(*) = 0 then null else (count(*) filter (where rc.status <> 'absent'))::integer end
            from public.roll_calls rc where rc.session_id = ss.id),
         (select vr.title from public.vote_rounds vr where vr.committee_id = c.id and vr.status = 'open' limit 1),
         (select count(*) from public.documents d where d.committee_id = c.id and d.status = 'passed')::integer,
         (select count(*) from public.notes n where n.committee_id = c.id and (n.status = 'pending'
            or (n.from_seat_id is not null and n.to_seat_id is null and n.status = 'delivered'
                and not exists (select 1 from public.notes y where y.reply_to = n.id and y.from_seat_id is null))))::integer,
         (select count(*) from public.position_papers pp join public.assignments a on a.registration_id = pp.registration_id
            join public.seats s on s.id = a.seat_id where s.committee_id = c.id)::integer
    from public.committees c
    left join public.committee_live l on l.committee_id = c.id
    left join public.seats sp on sp.id = l.timer_speaker_seat_id
    left join public.sessions ss on ss.id = public.display_session(c.id)
   order by c.sort, c.abbr;
end $$;

create or replace function public.sec_remove_seat(p_seat uuid) returns void
language plpgsql security definer set search_path = '' as
$$ begin
  if not public.is_core() then raise exception 'Only the core secretariat can remove seats.'; end if;
  if exists (select 1 from public.assignments where seat_id = p_seat) then
    raise exception 'This seat has a delegate. Unassign them first.';
  end if;
  delete from public.seats where id = p_seat;
  perform public.log('remove_seat', 'seats', p_seat::text);
end $$;

create or replace function public.sec_set_applicant_status(p_reg uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as
$$ begin
  if not public.staff_can('registration') then raise exception 'Only the secretariat can do that.'; end if;
  if p_status is null or p_status not in ('applied', 'withdrawn', 'rejected') then raise exception 'Choose applied, withdrawn or rejected.'; end if;
  if not exists (select 1 from public.registrations where id = p_reg) then raise exception 'That delegate no longer exists. Refresh.'; end if;
  delete from public.assignments where registration_id = p_reg;
  update public.registrations set status = p_status::public.reg_status where id = p_reg;
  perform public.log('registration_status', 'registrations', p_reg::text, jsonb_build_object('status', p_status));
end $$;

create or replace function public.sec_add_chair(p_committee uuid, p_profile uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as
$$ begin
  if not public.is_core() then raise exception 'Only the core secretariat can choose chairs.'; end if;
  if p_role is null or p_role not in ('chair', 'vice_chair', 'rapporteur') then raise exception 'Choose chair, vice chair or rapporteur.'; end if;
  if not exists (select 1 from public.profiles where id = p_profile) then raise exception 'That person no longer exists. Refresh.'; end if;
  insert into public.committee_staff (committee_id, profile_id, role) values (p_committee, p_profile, p_role)
    on conflict (committee_id, profile_id) do update set role = excluded.role;
  update public.profiles set role = 'chair' where id = p_profile and role in ('delegate', 'advisor');
  perform public.log('add_chair', 'committee_staff', p_committee::text, jsonb_build_object('profile', p_profile, 'role', p_role));
end $$;

create or replace function public.sec_remove_chair(p_committee uuid, p_profile uuid) returns void
language plpgsql security definer set search_path = '' as
$$ begin
  if not public.is_core() then raise exception 'Only the core secretariat can choose chairs.'; end if;
  delete from public.committee_staff where committee_id = p_committee and profile_id = p_profile;
  update public.profiles set role = 'delegate'
   where id = p_profile and role = 'chair' and not exists (select 1 from public.committee_staff where profile_id = p_profile);
  perform public.log('remove_chair', 'committee_staff', p_committee::text, jsonb_build_object('profile', p_profile));
end $$;

-- The desk scans a QR code. Records the check-in once per day and says who it is.
create or replace function public.sec_checkin(p_code text, p_day integer)
returns table (first_checkin boolean, full_name text, committee_id uuid, committee_abbr text, committee_name text,
               seat_id uuid, seat_label text)
language plpgsql security definer set search_path = '' as
$$
#variable_conflict use_column
declare reg uuid; n integer;
begin
  if not public.staff_can('registration') then raise exception 'Only the secretariat can check delegates in.'; end if;
  if p_day is null or p_day not in (1, 2, 3) then raise exception 'Choose day 1, 2 or 3.'; end if;
  select c.registration_id into reg from public.checkin_codes c where c.code = lower(trim(coalesce(p_code, '')));
  if reg is null then raise exception 'Unknown check-in code. Check it and try again.'; end if;
  if exists (select 1 from public.registrations r where r.id = reg and r.status in ('withdrawn', 'rejected')) then
    raise exception 'This delegate is not registered for the conference.';
  end if;
  insert into public.checkins (registration_id, day, checked_by) values (reg, p_day, auth.uid()) on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then perform public.log('checkin', 'checkins', reg::text, jsonb_build_object('day', p_day)); end if;
  return query
    select n > 0, coalesce(p.full_name, p.email), cm.id, cm.abbr, cm.name, s.id, s.label
      from public.registrations r
      join public.profiles p on p.id = r.profile_id
      left join public.assignments a on a.registration_id = r.id
      left join public.seats s on s.id = a.seat_id
      left join public.committees cm on cm.id = s.committee_id
     where r.id = reg;
end $$;

-- ───────────────────────── 8. Live updates ─────────────────────────
do $$ declare t text;
begin
  foreach t in array array['committee_live', 'schedule_items', 'library_files', 'library_shares', 'vote_rounds',
    'document_sponsors', 'assignments', 'deadlines', 'committees', 'scores', 'awards', 'committee_criteria', 'checkins']
  loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ───────────────────────── 9. Storage ─────────────────────────
-- Position papers and committee papers: PDF or DOCX.
update storage.buckets set allowed_mime_types = array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
 where id in ('position-papers', 'documents');

-- The file library: conference/<file>, committee/<committee_id>/<file>, mine/<user_id>/<file>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('library', 'library', false, 20971520, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel',
    'text/plain', 'text/csv', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Position papers: late papers are allowed now, so the deadline check is gone (they show as late).
drop policy if exists "paper upload" on storage.objects;
create policy "paper upload" on storage.objects for insert to authenticated with check (
  bucket_id = 'position-papers'
  and (storage.foldername(objects.name))[1] in (select r.id::text from public.registrations r where r.profile_id = (select auth.uid()))
  and not exists (select 1 from public.position_papers p
                  where p.registration_id::text = (storage.foldername(objects.name))[1] and p.mark is not null));
drop policy if exists "paper replace" on storage.objects;
create policy "paper replace" on storage.objects for update to authenticated
  using (
    bucket_id = 'position-papers'
    and (storage.foldername(objects.name))[1] in (select r.id::text from public.registrations r where r.profile_id = (select auth.uid()))
    and not exists (select 1 from public.position_papers p
                    where p.registration_id::text = (storage.foldername(objects.name))[1] and p.mark is not null))
  with check (
    bucket_id = 'position-papers'
    and (storage.foldername(objects.name))[1] in (select r.id::text from public.registrations r where r.profile_id = (select auth.uid())));

-- Library: upload and delete by folder; read whatever library_files row the caller can see.
drop policy if exists "library upload" on storage.objects;
create policy "library upload" on storage.objects for insert to authenticated with check (
  bucket_id = 'library' and (
    ((storage.foldername(objects.name))[1] = 'conference' and (select public.is_core()))
    or ((storage.foldername(objects.name))[1] = 'committee'
        and (storage.foldername(objects.name))[2] in (select c::text from public.my_chaired_committees() c))
    or ((storage.foldername(objects.name))[1] = 'mine' and (storage.foldername(objects.name))[2] = (select auth.uid())::text)));
drop policy if exists "library delete" on storage.objects;
create policy "library delete" on storage.objects for delete to authenticated using (
  bucket_id = 'library' and (
    ((storage.foldername(objects.name))[1] = 'conference' and (select public.is_core()))
    or ((storage.foldername(objects.name))[1] = 'committee'
        and (storage.foldername(objects.name))[2] in (select c::text from public.my_chaired_committees() c))
    or ((storage.foldername(objects.name))[1] = 'mine' and (storage.foldername(objects.name))[2] = (select auth.uid())::text)));
drop policy if exists "library read" on storage.objects;
create policy "library read" on storage.objects for select to authenticated using (
  bucket_id = 'library' and exists (select 1 from public.library_files f where f.file_path = objects.name));   -- library_files RLS decides

-- ───────────────────────── 10. Privileges ─────────────────────────
-- New tables: anon gets nothing; signed-in users read (RLS limits rows) and write only where noted.
revoke all on public.committee_live, public.schedule_items, public.committee_criteria, public.my_notes,
  public.library_files, public.library_shares, public.vote_rounds from anon;
revoke insert, update, delete, truncate, references, trigger on public.committee_live, public.committee_criteria,
  public.library_files, public.library_shares, public.vote_rounds from authenticated;
revoke truncate, references, trigger on public.schedule_items, public.my_notes from authenticated;
grant select on public.committee_live, public.schedule_items, public.committee_criteria, public.my_notes,
  public.library_files, public.library_shares, public.vote_rounds to authenticated;
grant insert, update, delete on public.schedule_items to authenticated;             -- core only (policy)
revoke insert, update on public.my_notes from authenticated;
grant delete on public.my_notes to authenticated;                                  -- owner only (policy)
grant insert (body, tag, done), update (body, tag, done) on public.my_notes to authenticated;

-- Fees, consent, code of conduct and seat acceptance are gone: nobody may call those RPCs any more.
revoke execute on function public.admin_mark_paid(uuid, uuid, boolean), public.accept_seat(), public.accept_code_of_conduct(),
  public.request_consent(text, text), public.confirm_consent(uuid) from anon, authenticated;

-- Policy helpers (policies run them as the caller).
grant execute on function public.my_seat(), public.my_sponsored_documents(), public.my_library_files(),
  public.files_shared_with_me() to authenticated;

-- RPCs.
grant execute on function
  public.sign_up(text, text, text, uuid[]),
  public.my_seat_info(),
  public.committee_chairs(uuid),
  public.answer_roll(public.roll_status),
  public.join_speakers(),
  public.leave_speakers(),
  public.cast_ballot(uuid, public.vote_choice),
  public.committee_votes(uuid),
  public.save_document(uuid, public.doc_type, text, text, uuid, text, uuid[], uuid[], text, text, boolean),
  public.send_chit(uuid, text, uuid),
  public.add_library_file(text, uuid, text, text, text, text, text, bigint, uuid[]),
  public.share_library_file(uuid, uuid[]),
  public.remove_library_file(uuid),
  public.my_dais_committees(),
  public.chair_start_session(uuid),
  public.chair_end_session(uuid),
  public.chair_set_agenda(uuid, text, text),
  public.chair_set_timer(uuid, text, text, integer, uuid),
  public.chair_timer(uuid, text, integer),
  public.chair_open_roll(uuid),
  public.chair_close_roll(uuid),
  public.chair_mark_roll(uuid, uuid, public.roll_status),
  public.chair_add_speaker(uuid, uuid),
  public.chair_move_speaker(uuid, integer),
  public.chair_remove_speaker(uuid),
  public.chair_next_speaker(uuid, integer),
  public.chair_open_vote(uuid, text, uuid, text, text),
  public.chair_close_vote(uuid),
  public.chair_record_count(uuid, integer, integer, integer),
  public.dais_seats(uuid),
  public.committee_papers(uuid),
  public.chair_mark_paper_seen(uuid, uuid),
  public.chair_approve_document(uuid, text),
  public.chair_return_document(uuid, text),
  public.chair_set_chit_status(uuid, text),
  public.chair_send_chit(uuid, uuid, text, uuid),
  public.chair_announce(uuid, text, text, boolean),
  public.chair_set_criteria(uuid, jsonb),
  public.chair_save_score(uuid, uuid, integer, jsonb, text),
  public.sec_overview(),
  public.sec_remove_seat(uuid),
  public.sec_set_applicant_status(uuid, text),
  public.sec_add_chair(uuid, uuid, text),
  public.sec_remove_chair(uuid, uuid),
  public.sec_checkin(text, integer)
to authenticated;
-- admin_assign_seat keeps its 0001 grant. Not granted to any client (internal): require_not_after, live_session,
-- display_session, ensure_live, renumber_speakers, round_eligible, finish_round, default_criteria and the trigger
-- functions (committee_live_row, vote_round_links, v2_seat_links).

-- Seed: the resolution cut-off deadline key (no date until the secretariat sets one).
insert into public.deadlines (key, label, due_at) values ('resolution', 'Resolutions', null) on conflict (key) do nothing;
