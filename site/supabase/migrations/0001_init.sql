-- ════════════════════════════════════════════════════════════════════════════
-- DXB MUN platform: initial schema (Supabase, Postgres 17)
-- Plan and reasoning: site/PLATFORM.md
--
-- File order (it applies top to bottom on a fresh project):
--   1. extensions and types          6. row level security policies
--   2. tables                        7. privileged actions (RPCs)
--   3. indexes                       8. realtime publication
--   4. helper functions              9. storage buckets and policies
--   5. triggers                     10. table and function privileges
--
-- Security model
--   * Row Level Security is on for every table. Most users are minors, so every
--     read is scoped: a delegate sees their own records and their committee's
--     room; a chair sees only the committees they chair; an advisor sees only
--     the schools they run; staff see only their area; core sees everything.
--   * Plain users write directly only where a policy plus a column grant can
--     fully check the write. Everything else (allocation, payment, approval,
--     invites, votes, marking, document submission, check-in) goes through
--     SECURITY DEFINER functions that check the caller and write to audit_log.
--   * Every SECURITY DEFINER function pins `search_path = ''` and names every
--     object with its schema.
--   * Policy helpers are SECURITY DEFINER so they read the tables they need
--     without RLS (no policy recursion). Row-independent helpers are wrapped as
--     `(select fn())` in policies so Postgres runs them once per statement.
-- ════════════════════════════════════════════════════════════════════════════

-- Supabase ships pgcrypto in the `extensions` schema; this is a no-op there.
create extension if not exists pgcrypto with schema extensions;

-- ───────────────────────── 1. Types ─────────────────────────
create type public.user_role      as enum ('delegate', 'chair', 'advisor', 'admin');
create type public.admin_level    as enum ('core', 'staff');
create type public.school_status  as enum ('pending', 'approved', 'rejected');
-- applied → approved → allocated → confirmed. 'allocated' and 'confirmed' are set by the system only.
create type public.reg_status     as enum ('applied', 'approved', 'allocated', 'confirmed', 'withdrawn', 'rejected');
create type public.committee_kind as enum ('general', 'crisis', 'press', 'court', 'cabinet', 'regional', 'security');
create type public.seat_kind      as enum ('country', 'portfolio', 'press', 'judge', 'advocate', 'other');
create type public.roll_status    as enum ('present', 'present_voting', 'absent');
create type public.session_status as enum ('scheduled', 'live', 'closed');
create type public.motion_status  as enum ('proposed', 'voting', 'passed', 'failed', 'withdrawn');
create type public.doc_type       as enum ('working_paper', 'draft_resolution', 'amendment');
create type public.doc_status     as enum ('submitted', 'approved', 'rejected', 'voting', 'passed', 'failed');
create type public.vote_choice    as enum ('yes', 'no', 'abstain');
create type public.note_status    as enum ('pending', 'delivered', 'rejected');

-- ───────────────────────── 2. Tables ─────────────────────────
-- Actor columns (assigned_by, marked_by, cast_by …) are `on delete set null` so a
-- user's account can always be deleted on request; audit_log keeps the history.

-- People ------------------------------------------------------------------
create table public.schools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 2 and 160),
  status      public.school_status not null default 'pending',
  advisor_id  uuid,                         -- FK added after profiles exists
  paid        boolean not null default false,
  paid_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- Secretariat-only notes about a school, kept apart so no school reader can see them.
create table public.school_notes (
  school_id  uuid primary key references public.schools (id) on delete cascade,
  notes      text check (length(notes) <= 4000),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text check (length(full_name) <= 120),
  grade       text check (length(grade) <= 20),
  school_name text check (length(school_name) <= 160),   -- free text for individual applicants
  role        public.user_role not null default 'delegate',
  admin_level public.admin_level,
  school_id   uuid references public.schools (id) on delete set null,   -- set only by invite or staff RPC
  created_at  timestamptz not null default now(),
  check ((role = 'admin') = (admin_level is not null))
);

alter table public.schools
  add constraint schools_advisor_fk foreign key (advisor_id) references public.profiles (id) on delete set null;

-- Advisors invite students by email. The invite is bound to that email address.
create table public.school_invites (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  email       text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  token       uuid not null unique default gen_random_uuid(),
  expires_at  timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (school_id, email)
);

-- Structure ---------------------------------------------------------------
create table public.committees (
  id               uuid primary key default gen_random_uuid(),
  abbr             text not null unique,
  name             text not null,
  kind             public.committee_kind not null default 'general',
  sort             smallint not null default 0,
  study_guide_path text,                    -- path in the 'study-guides' storage bucket
  created_at       timestamptz not null default now()
);

create table public.seats (
  id           uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees (id) on delete cascade,
  label        text not null check (length(label) between 1 and 120),   -- "France", "Minister of Finance", "Reuters"
  kind         public.seat_kind not null default 'country',
  capacity     smallint not null default 1 check (capacity between 1 and 2), -- 2 = double delegation
  unique (committee_id, label)
);

create table public.committee_staff (
  committee_id uuid not null references public.committees (id) on delete cascade,
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  role         text not null default 'chair' check (role in ('chair', 'vice_chair', 'rapporteur')),
  primary key (committee_id, profile_id)
);

-- Staff admins only see their own areas: 'registration' (no committee), or one committee per row.
create table public.staff_areas (
  id           bigint generated always as identity primary key,
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  area         text not null check (area in ('registration', 'committee')),
  committee_id uuid references public.committees (id) on delete cascade,
  check ((area = 'committee') = (committee_id is not null)),
  unique nulls not distinct (profile_id, area, committee_id)
);

-- Registration ------------------------------------------------------------
create table public.registrations (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null unique references public.profiles (id) on delete cascade,
  school_id        uuid references public.schools (id) on delete set null,   -- null = individual applicant
  status           public.reg_status not null default 'applied',
  experience       text check (length(experience) <= 600),
  motivation       text check (length(motivation) <= 600),
  paid             boolean not null default false,
  paid_at          timestamptz,
  coc_accepted_at  timestamptz,             -- code of conduct
  seat_accepted_at timestamptz,             -- the delegate accepted their allocated seat
  created_at       timestamptz not null default now()
);

-- The QR check-in code. Kept out of `registrations` so chairs and advisors, who can
-- read a registration, cannot read the code. Owner and registration staff only.
create table public.checkin_codes (
  registration_id uuid primary key references public.registrations (id) on delete cascade,
  code            text not null unique default encode(extensions.gen_random_bytes(16), 'hex')
);

create table public.preferences (
  registration_id uuid not null references public.registrations (id) on delete cascade,
  rank            smallint not null check (rank between 1 and 3),
  committee_id    uuid not null references public.committees (id) on delete cascade,
  seat_id         uuid references public.seats (id) on delete set null,   -- must be in committee_id (trigger)
  reason          text check (length(reason) <= 300),
  primary key (registration_id, rank),
  unique (registration_id, committee_id)
);

create table public.assignments (
  registration_id uuid primary key references public.registrations (id) on delete cascade,
  seat_id         uuid not null references public.seats (id) on delete cascade,
  assigned_by     uuid references public.profiles (id) on delete set null,
  assigned_at     timestamptz not null default now()
);

-- Parent consent. The secret confirmation token lives in a table no client can read.
create table public.consents (
  registration_id uuid primary key references public.registrations (id) on delete cascade,
  parent_name     text not null check (length(parent_name) <= 120),
  parent_email    text not null check (parent_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  requested_at    timestamptz not null default now(),
  confirmed_at    timestamptz
);
create table public.consent_tokens (
  registration_id uuid primary key references public.consents (registration_id) on delete cascade,
  token           uuid not null default gen_random_uuid() unique,
  expires_at      timestamptz not null default now() + interval '14 days'
);

-- Preparation -------------------------------------------------------------
create table public.position_papers (
  registration_id uuid primary key references public.registrations (id) on delete cascade,
  file_path       text not null,           -- path in the 'position-papers' storage bucket
  original_name   text check (length(original_name) <= 200),   -- the uploaded file's name, for display
  submitted_at    timestamptz not null default now(),          -- always set by the server (trigger)
  mark            smallint check (mark between 0 and 10),
  comment         text check (length(comment) <= 1000),
  marked_by       uuid references public.profiles (id) on delete set null,
  marked_at       timestamptz
);

create table public.deadlines (
  key    text primary key,                 -- 'registration', 'allocation', 'position_paper'
  label  text not null,
  due_at timestamptz
);

-- Conference-wide switch the dashboards read (before / live / after). Exactly one row.
create table public.settings (
  id         boolean primary key default true check (id),
  phase      text not null default 'before' check (phase in ('before', 'live', 'after')),
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (true);

-- Conference days ---------------------------------------------------------
create table public.checkins (
  registration_id uuid not null references public.registrations (id) on delete cascade,
  day             smallint not null check (day between 1 and 3),
  checked_at      timestamptz not null default now(),
  checked_by      uuid default auth.uid() references public.profiles (id) on delete set null,
  primary key (registration_id, day)
);

create table public.sessions (
  id           uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees (id) on delete cascade,
  number       smallint not null check (number between 1 and 6),
  status       public.session_status not null default 'scheduled',
  started_at   timestamptz,
  ended_at     timestamptz,
  unique (committee_id, number)
);

create table public.roll_calls (
  session_id uuid not null references public.sessions (id) on delete cascade,
  seat_id    uuid not null references public.seats (id) on delete cascade,
  status     public.roll_status not null,
  marked_at  timestamptz not null default now(),
  primary key (session_id, seat_id)
);

create table public.speakers (
  id           uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees (id) on delete cascade,
  session_id   uuid references public.sessions (id) on delete set null,
  seat_id      uuid not null references public.seats (id) on delete cascade,
  list         text not null default 'general' check (list in ('general', 'moderated')),
  position     integer not null,
  status       text not null default 'waiting' check (status in ('waiting', 'speaking', 'done')),
  created_at   timestamptz not null default now()
);

create table public.motions (
  id               uuid primary key default gen_random_uuid(),
  committee_id     uuid not null references public.committees (id) on delete cascade,
  session_id       uuid references public.sessions (id) on delete set null,
  kind             text not null check (length(kind) <= 60),     -- 'moderated caucus', 'unmoderated caucus', 'close debate' …
  topic            text check (length(topic) <= 200),
  duration_seconds integer check (duration_seconds between 0 and 7200),
  speaking_seconds integer check (speaking_seconds between 0 and 600),
  proposer_seat_id uuid references public.seats (id) on delete set null,
  status           public.motion_status not null default 'proposed',
  -- A chair may record a voice or placard count instead of phone votes; tallies prefer these.
  recorded_yes     smallint check (recorded_yes >= 0),
  recorded_no      smallint check (recorded_no >= 0),
  recorded_abstain smallint check (recorded_abstain >= 0),
  opened_at        timestamptz,
  closed_at        timestamptz,
  created_at       timestamptz not null default now()
);

create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees (id) on delete cascade,
  type         public.doc_type not null,
  number       text,                      -- assigned by the chair on approval, e.g. 'DR 1.1'
  title        text not null check (length(title) <= 200),
  body         text check (length(body) <= 60000),
  file_path    text,                      -- path in the 'documents' bucket: <committee_id>/<file>
  parent_id    uuid references public.documents (id) on delete cascade,   -- amendments point at their draft resolution
  submitted_by uuid references public.profiles (id) on delete set null,
  status       public.doc_status not null default 'submitted',
  created_at   timestamptz not null default now(),
  check ((type = 'amendment') = (parent_id is not null))
);

create table public.document_sponsors (
  document_id uuid not null references public.documents (id) on delete cascade,
  seat_id     uuid not null references public.seats (id) on delete cascade,
  role        text not null default 'sponsor' check (role in ('sponsor', 'signatory')),
  primary key (document_id, seat_id)
);

-- One vote per seat per motion or document. Written only by cast_vote().
create table public.votes (
  id           uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees (id) on delete cascade,
  motion_id    uuid references public.motions (id) on delete cascade,
  document_id  uuid references public.documents (id) on delete cascade,
  seat_id      uuid not null references public.seats (id) on delete cascade,
  choice       public.vote_choice not null,
  cast_by      uuid references public.profiles (id) on delete set null,
  cast_at      timestamptz not null default now(),
  check ((motion_id is null) <> (document_id is null)),
  unique (motion_id, seat_id),             -- NULL motion_id rows are document votes, covered below
  unique (document_id, seat_id)
);

-- Notes always pass through the chair. from_seat_id null = from the chair; to_seat_id null = to the chair.
create table public.notes (
  id           uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees (id) on delete cascade,
  from_seat_id uuid references public.seats (id) on delete cascade,
  to_seat_id   uuid references public.seats (id) on delete cascade,
  body         text not null check (length(body) between 1 and 500),
  reply_to     uuid references public.notes (id) on delete set null,
  status       public.note_status not null default 'pending',
  sent_by      uuid references public.profiles (id) on delete set null,
  decided_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  check (from_seat_id is not null or to_seat_id is not null)   -- at least one side is a seat (chair ↔ seat or seat ↔ seat)
);

create table public.scores (
  session_id uuid not null references public.sessions (id) on delete cascade,
  seat_id    uuid not null references public.seats (id) on delete cascade,
  chair_id   uuid not null references public.profiles (id) on delete cascade,
  criteria   jsonb not null default '{}'::jsonb,   -- e.g. {"speeches":4,"diplomacy":5,"resolution":3}
  total      numeric(5,2),
  comment    text check (length(comment) <= 500),
  updated_at timestamptz not null default now(),
  primary key (session_id, seat_id, chair_id)
);

-- After -------------------------------------------------------------------
create table public.awards (
  id           uuid primary key default gen_random_uuid(),
  committee_id uuid not null references public.committees (id) on delete cascade,
  seat_id      uuid not null references public.seats (id) on delete cascade,
  award        text not null check (length(award) <= 80),   -- 'Best Delegate', 'Outstanding Delegate', 'Verbal Mention'
  nominated_by uuid references public.profiles (id) on delete set null,
  final        boolean not null default false,
  published    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table public.feedback (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.profiles (id) on delete cascade,
  committee_id     uuid references public.committees (id) on delete set null,
  committee_rating smallint check (committee_rating between 1 and 5),
  chair_rating     smallint check (chair_rating between 1 and 5),
  comment          text check (length(comment) <= 1500),
  created_at       timestamptz not null default now(),
  unique nulls not distinct (profile_id, committee_id)    -- one general survey, one per committee
);

-- Running the site --------------------------------------------------------
create table public.announcements (
  id           uuid primary key default gen_random_uuid(),
  audience     text not null default 'all' check (audience in ('all', 'delegates', 'chairs', 'advisors', 'committee')),
  committee_id uuid references public.committees (id) on delete cascade,
  title        text not null check (length(title) <= 140),
  body         text check (length(body) <= 4000),
  published_at timestamptz,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  check ((audience = 'committee') = (committee_id is not null))
);

create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor      uuid,
  action     text not null,
  table_name text,
  row_id     text,
  data       jsonb,
  at         timestamptz not null default now()
);

-- ───────────────────────── 3. Indexes ─────────────────────────
-- Foreign keys used by policies, helper functions, RPC lookups and cascades.
-- (Primary keys and unique constraints already index their leading columns.)

-- One approved school per name (case-insensitive). Pending duplicates are allowed, so a
-- pending application cannot squat a real school's name; staff resolve it on approval.
create unique index schools_name_approved on public.schools (lower(name)) where status = 'approved';
-- An advisor has at most one pending school application at a time.
create unique index schools_one_pending_per_advisor on public.schools (advisor_id) where status = 'pending';
create index on public.schools (advisor_id);
create index on public.profiles (school_id);
create index on public.school_invites (school_id);
create index on public.committee_staff (profile_id);
create index on public.registrations (school_id);
create index on public.preferences (committee_id);
create index on public.assignments (seat_id);
create index on public.roll_calls (seat_id);
create index on public.speakers (committee_id, list, position);
create index on public.speakers (session_id);
create index on public.motions (committee_id);
create index on public.motions (session_id);
create index on public.documents (committee_id);
create index on public.documents (parent_id);
create index on public.document_sponsors (seat_id);
create index on public.votes (committee_id);
create index on public.votes (seat_id);
create index on public.votes (cast_by);
create index on public.notes (committee_id, status, created_at);
create index on public.notes (from_seat_id);
create index on public.notes (to_seat_id);
create index on public.notes (sent_by);
create index on public.scores (seat_id);
create index on public.awards (committee_id);
create index on public.feedback (committee_id);
create index on public.audit_log (table_name, at);
-- Remaining foreign keys (seat links and actor columns): keep cascades and `set null` cheap,
-- and keep Supabase's "unindexed foreign key" advisor quiet.
create index on public.staff_areas (committee_id);
create index on public.school_invites (accepted_by);
create index on public.school_invites (created_by);
create index on public.preferences (seat_id);
create index on public.assignments (assigned_by);
create index on public.position_papers (marked_by);
create index on public.checkins (checked_by);
create index on public.speakers (seat_id);
create index on public.motions (proposer_seat_id);
create index on public.documents (submitted_by);
create index on public.notes (decided_by);
create index on public.notes (reply_to);
create index on public.scores (chair_id);
create index on public.awards (seat_id);
create index on public.awards (nominated_by);
create index on public.announcements (committee_id);
create index on public.announcements (created_by);

-- ───────────────────────── 4. Helper functions ─────────────────────────
-- SECURITY DEFINER, STABLE and read-only, so policies can call them without
-- recursive RLS. Each one answers only about the caller (auth.uid()).

create or replace function public.my_role() returns public.user_role
language sql stable security definer set search_path = '' as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as
$$ select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false) $$;

create or replace function public.is_core() returns boolean
language sql stable security definer set search_path = '' as
$$ select coalesce((select role = 'admin' and admin_level = 'core' from public.profiles where id = auth.uid()), false) $$;

-- Core can do everything. Staff only in their assigned areas, and only while they are still admins.
create or replace function public.staff_can(p_area text, p_committee uuid default null) returns boolean
language sql stable security definer set search_path = '' as
$$ select public.is_core() or exists (
     select 1 from public.staff_areas s join public.profiles p on p.id = s.profile_id
     where s.profile_id = auth.uid() and p.role = 'admin' and s.area = p_area
       and (p_area <> 'committee' or s.committee_id = p_committee)) $$;

create or replace function public.my_school() returns uuid
language sql stable security definer set search_path = '' as
$$ select school_id from public.profiles where id = auth.uid() $$;

-- Schools the caller is the advisor of (any status).
create or replace function public.advised_schools() returns setof uuid
language sql stable security definer set search_path = '' as
$$ select id from public.schools where advisor_id = auth.uid() $$;

-- The caller's seat(s) as a delegate.
create or replace function public.my_seats() returns setof uuid
language sql stable security definer set search_path = '' as
$$ select a.seat_id from public.assignments a
   join public.registrations r on r.id = a.registration_id
   where r.profile_id = auth.uid() $$;

-- Committees the caller runs: chair seats, committee staff areas, or all of them for core.
create or replace function public.my_chaired_committees() returns setof uuid
language sql stable security definer set search_path = '' as
$$ select id from public.committees where public.is_core()
   union
   select committee_id from public.committee_staff where profile_id = auth.uid()
   union
   select s.committee_id from public.staff_areas s join public.profiles p on p.id = s.profile_id
    where s.profile_id = auth.uid() and p.role = 'admin' and s.area = 'committee' $$;

-- Committees the caller belongs to: their seat's committee plus any they run.
create or replace function public.my_committees() returns setof uuid
language sql stable security definer set search_path = '' as
$$ select s.committee_id from public.seats s where s.id in (select public.my_seats())
   union
   select public.my_chaired_committees() $$;

create or replace function public.chairs(p_committee uuid) returns boolean
language sql stable security definer set search_path = '' as
$$ select coalesce(p_committee in (select public.my_chaired_committees()), false) $$;

create or replace function public.committee_of_seat(p_seat uuid) returns uuid
language sql stable security definer set search_path = '' as
$$ select committee_id from public.seats where id = p_seat $$;

-- Registrations and profiles of delegates seated in committees the caller runs.
create or replace function public.chaired_registrations() returns setof uuid
language sql stable security definer set search_path = '' as
$$ select a.registration_id from public.assignments a join public.seats s on s.id = a.seat_id
   where s.committee_id in (select public.my_chaired_committees()) $$;

create or replace function public.chaired_profiles() returns setof uuid
language sql stable security definer set search_path = '' as
$$ select r.profile_id from public.registrations r where r.id in (select public.chaired_registrations()) $$;

-- True while a deadline is unset or still in the future.
create or replace function public.deadline_open(p_key text) returns boolean
language sql stable security definer set search_path = '' as
$$ select not exists (select 1 from public.deadlines where key = p_key and due_at is not null and now() > due_at) $$;

-- Internal: append to audit_log. Not callable by clients (see section 10).
create or replace function public.log(p_action text, p_table text, p_row text, p_data jsonb default null) returns void
language sql security definer set search_path = '' as
$$ insert into public.audit_log (actor, action, table_name, row_id, data) values (auth.uid(), p_action, p_table, p_row, p_data) $$;

-- ───────────────────────── 5. Triggers ─────────────────────────

-- New sign-in → a delegate profile. Roles are raised only by core admins.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as
$$ begin
  insert into public.profiles (id, email) values (new.id, coalesce(new.email, ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Every registration gets an unguessable check-in code for its QR badge.
create or replace function public.create_checkin_code() returns trigger
language plpgsql security definer set search_path = '' as
$$ begin
  insert into public.checkin_codes (registration_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger registrations_checkin_code after insert on public.registrations
  for each row execute function public.create_checkin_code();

-- A seat holds at most `capacity` delegates. The seat row is locked so two
-- concurrent allocations to the same seat are serialised.
create or replace function public.check_seat_capacity() returns trigger
language plpgsql set search_path = '' as
$$ declare cap smallint; used integer;
begin
  select capacity into cap from public.seats where id = new.seat_id for update;
  select count(*) into used from public.assignments where seat_id = new.seat_id and registration_id <> new.registration_id;
  if used >= cap then raise exception 'Seat is full'; end if;
  return new;
end $$;
create trigger assignments_capacity before insert or update on public.assignments
  for each row execute function public.check_seat_capacity();

-- Rows that point at a seat, session or parent document must stay inside one committee.
create or replace function public.check_committee_links() returns trigger
language plpgsql security definer set search_path = '' as
$$ declare c uuid; t public.doc_type;
begin
  case tg_table_name
  when 'preferences' then
    if new.seat_id is not null and public.committee_of_seat(new.seat_id) is distinct from new.committee_id then
      raise exception 'Seat is not in that committee'; end if;
  when 'roll_calls', 'scores' then
    select committee_id into c from public.sessions where id = new.session_id;
    if public.committee_of_seat(new.seat_id) is distinct from c then
      raise exception 'Seat is not in this session''s committee'; end if;
  when 'speakers' then
    if public.committee_of_seat(new.seat_id) is distinct from new.committee_id then
      raise exception 'Seat is not in this committee'; end if;
    if new.session_id is not null and (select committee_id from public.sessions where id = new.session_id) is distinct from new.committee_id then
      raise exception 'Session is not in this committee'; end if;
  when 'awards' then
    if public.committee_of_seat(new.seat_id) is distinct from new.committee_id then
      raise exception 'Seat is not in this committee'; end if;
  when 'notes' then
    if (new.from_seat_id is not null and public.committee_of_seat(new.from_seat_id) is distinct from new.committee_id)
       or (new.to_seat_id is not null and public.committee_of_seat(new.to_seat_id) is distinct from new.committee_id) then
      raise exception 'Seat is not in this committee'; end if;
  when 'motions' then
    if new.proposer_seat_id is not null and public.committee_of_seat(new.proposer_seat_id) is distinct from new.committee_id then
      raise exception 'Seat is not in this committee'; end if;
    if new.session_id is not null and (select committee_id from public.sessions where id = new.session_id) is distinct from new.committee_id then
      raise exception 'Session is not in this committee'; end if;
  when 'documents' then
    if new.parent_id is not null then
      select committee_id, type into c, t from public.documents where id = new.parent_id;
      if c is distinct from new.committee_id then raise exception 'Parent document is in another committee'; end if;
      if t is distinct from 'draft_resolution' then raise exception 'Amendments must point at a draft resolution'; end if;
    end if;
  when 'document_sponsors' then
    if public.committee_of_seat(new.seat_id) is distinct from (select committee_id from public.documents where id = new.document_id) then
      raise exception 'Seat is not in this document''s committee'; end if;
  end case;
  return new;
end $$;
create trigger preferences_links       before insert or update on public.preferences       for each row execute function public.check_committee_links();
create trigger roll_calls_links        before insert or update on public.roll_calls        for each row execute function public.check_committee_links();
create trigger scores_links            before insert or update on public.scores            for each row execute function public.check_committee_links();
create trigger speakers_links          before insert or update on public.speakers          for each row execute function public.check_committee_links();
create trigger awards_links            before insert or update on public.awards            for each row execute function public.check_committee_links();
create trigger notes_links             before insert or update on public.notes             for each row execute function public.check_committee_links();
create trigger motions_links           before insert or update on public.motions           for each row execute function public.check_committee_links();
create trigger documents_links         before insert or update on public.documents         for each row execute function public.check_committee_links();
create trigger document_sponsors_links before insert or update on public.document_sponsors for each row execute function public.check_committee_links();

-- A note from the chair (no from_seat) is delivered immediately.
create or replace function public.notes_from_chair() returns trigger
language plpgsql set search_path = '' as
$$ begin
  if new.from_seat_id is null then
    new.status := 'delivered';
    new.decided_by := new.sent_by;
    new.decided_at := now();
  end if;
  return new;
end $$;
create trigger notes_from_chair before insert on public.notes
  for each row execute function public.notes_from_chair();

-- Position papers: the server stamps the submission time and enforces the deadline
-- (deadlines.key = 'position_paper', when due_at is set). Core admins may still file late papers.
create or replace function public.position_paper_guard() returns trigger
language plpgsql set search_path = '' as
$$ begin
  if not public.deadline_open('position_paper') and not public.is_core() then
    raise exception 'The position paper deadline has passed';
  end if;
  new.submitted_at := now();
  return new;
end $$;
create trigger position_papers_guard before insert or update of file_path on public.position_papers
  for each row execute function public.position_paper_guard();

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as
$$ begin new.updated_at := now(); return new; end $$;
create trigger settings_touch before update on public.settings for each row execute function public.touch_updated_at();
create trigger scores_touch   before update on public.scores   for each row execute function public.touch_updated_at();

-- Chair actions are written straight to their tables, so they are audited by trigger.
-- Updates store only the changed fields; document bodies are recorded as "changed" only.
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = '' as
$$ declare r jsonb; o jsonb; d jsonb;
begin
  if tg_op = 'DELETE' then r := to_jsonb(old); else r := to_jsonb(new); end if;
  if tg_op = 'UPDATE' then
    o := to_jsonb(old);
    select jsonb_object_agg(key, case when key = 'body' then to_jsonb('changed'::text)
                                      else jsonb_build_object('old', o -> key, 'new', value) end)
      into d from jsonb_each(r) where (o -> key) is distinct from value;
    if d is null then return null; end if;            -- nothing changed
  else
    d := r - 'body';
  end if;
  insert into public.audit_log (actor, action, table_name, row_id, data)
  values (auth.uid(), lower(tg_op), tg_table_name,
          coalesce(r ->> 'id', concat_ws('/', r ->> 'session_id', r ->> 'seat_id', r ->> 'chair_id')), d);
  return null;
end $$;
create trigger notes_audit      after insert or update or delete on public.notes      for each row execute function public.audit_row();
create trigger scores_audit     after insert or update or delete on public.scores     for each row execute function public.audit_row();
create trigger documents_audit  after insert or update or delete on public.documents  for each row execute function public.audit_row();
create trigger roll_calls_audit after insert or update or delete on public.roll_calls for each row execute function public.audit_row();
create trigger motions_audit    after insert or update or delete on public.motions    for each row execute function public.audit_row();
create trigger awards_audit     after insert or update or delete on public.awards     for each row execute function public.audit_row();

-- ───────────────────────── 6. Row Level Security ─────────────────────────
do $$ declare t text;
begin
  foreach t in array array['schools','school_notes','profiles','school_invites','committees','seats','committee_staff',
    'staff_areas','registrations','checkin_codes','preferences','assignments','consents','consent_tokens',
    'position_papers','deadlines','settings','checkins','sessions','roll_calls','speakers','motions','documents',
    'document_sponsors','votes','notes','scores','awards','feedback','announcements','audit_log']
  loop execute format('alter table public.%I enable row level security', t); end loop;
end $$;
-- consent_tokens and audit_log get no client policies: only SECURITY DEFINER functions and the service role touch them.
-- assignments, consents and votes have read policies only: they are written by RPCs.

-- Public conference info (readable without signing in). Anon policies call no functions.
create policy "committees readable" on public.committees for select to anon, authenticated using (true);
create policy "seats readable"      on public.seats      for select to anon, authenticated using (true);
create policy "deadlines readable"  on public.deadlines  for select to anon, authenticated using (true);
create policy "settings readable"   on public.settings   for select to anon, authenticated using (true);
create policy "announcements public" on public.announcements for select to anon
  using (audience = 'all' and published_at <= now());
create policy "awards public"        on public.awards        for select to anon using (published);

-- Core admins manage structure and content
create policy "core writes committees"    on public.committees      for all to authenticated using ((select public.is_core())) with check ((select public.is_core()));
create policy "core writes seats"         on public.seats           for all to authenticated using ((select public.is_core())) with check ((select public.is_core()));
create policy "core writes deadlines"     on public.deadlines       for all to authenticated using ((select public.is_core())) with check ((select public.is_core()));
create policy "core writes settings"      on public.settings        for update to authenticated using ((select public.is_core())) with check ((select public.is_core()));
create policy "core writes announcements" on public.announcements   for all to authenticated using ((select public.is_core())) with check ((select public.is_core()));
create policy "core writes staff"         on public.committee_staff for all to authenticated using ((select public.is_core())) with check ((select public.is_core()));
create policy "core writes staff areas"   on public.staff_areas     for all to authenticated using ((select public.is_core())) with check ((select public.is_core()));
create policy "committee staff readable"  on public.committee_staff for select to authenticated using (true);
create policy "staff areas own"           on public.staff_areas     for select to authenticated using (profile_id = (select auth.uid()) or (select public.is_core()));

create policy "announcements" on public.announcements for select to authenticated using (
  (published_at <= now() and (
     audience = 'all'
     or (audience = 'delegates' and (select public.my_role()) = 'delegate')
     or (audience = 'chairs'    and (select public.my_role()) = 'chair')
     or (audience = 'advisors'  and (select public.my_role()) = 'advisor')
     or (audience = 'committee' and committee_id in (select public.my_committees()))))
  or (select public.is_core()));

-- Profiles: own row, plus whoever legitimately looks after you
create policy "profiles read" on public.profiles for select to authenticated using (
  id = (select auth.uid())
  or (select public.staff_can('registration'))
  or school_id in (select public.advised_schools())
  or id in (select public.chaired_profiles()));
-- Column grants (section 10): users change only full_name, grade and school_name.
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Schools
create policy "schools read" on public.schools for select to authenticated using (
  status = 'approved' or advisor_id = (select auth.uid()) or (select public.staff_can('registration')));
create policy "advisor registers school" on public.schools for insert to authenticated
  with check (advisor_id = (select auth.uid()));          -- status and paid keep their defaults (column grants)
create policy "school notes staff" on public.school_notes for all to authenticated
  using ((select public.staff_can('registration'))) with check ((select public.staff_can('registration')));

-- School invites: created and accepted only through RPCs; advisors see and revoke their own.
create policy "invites read" on public.school_invites for select to authenticated using (
  school_id in (select public.advised_schools()) or (select public.staff_can('registration')));
create policy "invites revoke" on public.school_invites for delete to authenticated using (
  accepted_at is null and (school_id in (select public.advised_schools()) or (select public.staff_can('registration'))));

-- Registrations
create policy "registrations read" on public.registrations for select to authenticated using (
  profile_id = (select auth.uid())
  or (select public.staff_can('registration'))
  or school_id in (select public.advised_schools())
  or id in (select public.chaired_registrations()));
-- A student applies for themselves; the school is whatever their invite gave them (or none).
create policy "apply" on public.registrations for insert to authenticated with check (
  profile_id = (select auth.uid()) and school_id is not distinct from (select public.my_school()));
create policy "edit own application" on public.registrations for update to authenticated
  using (profile_id = (select auth.uid()) and status in ('applied', 'approved'))
  with check (profile_id = (select auth.uid()));

create policy "checkin code read" on public.checkin_codes for select to authenticated using (
  registration_id in (select r.id from public.registrations r where r.profile_id = (select auth.uid()))
  or (select public.staff_can('registration')));

-- Preferences: the applicant, or their school's advisor, until allocation
create policy "preferences read" on public.preferences for select to authenticated using (
  registration_id in (select r.id from public.registrations r));          -- inherits registrations RLS
create policy "preferences write" on public.preferences for all to authenticated
  using (registration_id in (select r.id from public.registrations r where r.status in ('applied', 'approved')
           and (r.profile_id = (select auth.uid()) or r.school_id in (select public.advised_schools()))))
  with check (registration_id in (select r.id from public.registrations r where r.status in ('applied', 'approved')
           and (r.profile_id = (select auth.uid()) or r.school_id in (select public.advised_schools()))));

-- Assignments: visible to whoever can see the registration (delegate, advisor, chair, registration staff)
create policy "assignments read" on public.assignments for select to authenticated using (
  registration_id in (select r.id from public.registrations r));

-- Consent (parent name and email): the delegate, their advisor and registration staff. Not chairs.
create policy "consents read" on public.consents for select to authenticated using (
  registration_id in (select r.id from public.registrations r
                      where r.profile_id = (select auth.uid()) or r.school_id in (select public.advised_schools()))
  or (select public.staff_can('registration')));

-- Position papers: read with the registration; the owner submits until marked; chairs mark via mark_paper()
create policy "papers read" on public.position_papers for select to authenticated using (
  registration_id in (select r.id from public.registrations r));
create policy "papers submit" on public.position_papers for insert to authenticated with check (
  registration_id in (select r.id from public.registrations r where r.profile_id = (select auth.uid())));
create policy "papers resubmit" on public.position_papers for update to authenticated
  using (registration_id in (select r.id from public.registrations r where r.profile_id = (select auth.uid())) and mark is null)
  with check (registration_id in (select r.id from public.registrations r where r.profile_id = (select auth.uid())) and mark is null);

-- Check-in: registration staff (checkin_by_code() is the normal path)
create policy "checkins read"  on public.checkins for select to authenticated using (
  (select public.staff_can('registration'))
  or registration_id in (select r.id from public.registrations r where r.profile_id = (select auth.uid())));
create policy "checkins write" on public.checkins for insert to authenticated with check (
  (select public.staff_can('registration')) and checked_by = (select auth.uid()));

-- Committee room: members read, chairs run it
create policy "sessions read"  on public.sessions for select to authenticated using (committee_id in (select public.my_committees()));
create policy "sessions chair" on public.sessions for all to authenticated
  using (committee_id in (select public.my_chaired_committees())) with check (committee_id in (select public.my_chaired_committees()));
create policy "roll read"  on public.roll_calls for select to authenticated using (session_id in (select s.id from public.sessions s));
create policy "roll chair" on public.roll_calls for all to authenticated
  using (session_id in (select s.id from public.sessions s where s.committee_id in (select public.my_chaired_committees())))
  with check (session_id in (select s.id from public.sessions s where s.committee_id in (select public.my_chaired_committees())));
-- Speakers list is chair-run: delegates cannot add themselves.
create policy "speakers read"  on public.speakers for select to authenticated using (committee_id in (select public.my_committees()));
create policy "speakers chair" on public.speakers for all to authenticated
  using (committee_id in (select public.my_chaired_committees())) with check (committee_id in (select public.my_chaired_committees()));
create policy "motions read"   on public.motions  for select to authenticated using (committee_id in (select public.my_committees()));
create policy "motions chair"  on public.motions  for all to authenticated
  using (committee_id in (select public.my_chaired_committees())) with check (committee_id in (select public.my_chaired_committees()));

-- Votes: chairs see all; a delegate sees their own seat's vote while voting is open,
-- and every vote in their committee once the motion or document has closed.
create policy "votes read" on public.votes for select to authenticated using (
  committee_id in (select public.my_chaired_committees())
  or seat_id in (select public.my_seats())
  or motion_id in (select m.id from public.motions m where m.status in ('passed', 'failed'))
  or document_id in (select d.id from public.documents d where d.status in ('passed', 'failed')));

-- Documents: delegates submit through submit_document(); chairs approve, number and decide
create policy "documents read"  on public.documents for select to authenticated using (committee_id in (select public.my_committees()));
create policy "documents chair" on public.documents for update to authenticated
  using (committee_id in (select public.my_chaired_committees())) with check (committee_id in (select public.my_chaired_committees()));
create policy "sponsors read"   on public.document_sponsors for select to authenticated using (
  document_id in (select d.id from public.documents d));
create policy "sponsors chair"  on public.document_sponsors for all to authenticated
  using (document_id in (select d.id from public.documents d where d.committee_id in (select public.my_chaired_committees())))
  with check (document_id in (select d.id from public.documents d where d.committee_id in (select public.my_chaired_committees())));

-- Notes: always through the chair. Recipients see a note only once it is delivered.
create policy "notes read" on public.notes for select to authenticated using (
  committee_id in (select public.my_chaired_committees())
  or from_seat_id in (select public.my_seats())
  or (to_seat_id in (select public.my_seats()) and status = 'delivered'));
create policy "notes send" on public.notes for insert to authenticated with check (
  sent_by = (select auth.uid()) and status = 'pending' and decided_by is null
  and from_seat_id in (select public.my_seats())
  and committee_id = public.committee_of_seat(from_seat_id));            -- to_seat checked by trigger
create policy "notes from chair" on public.notes for insert to authenticated with check (
  sent_by = (select auth.uid()) and from_seat_id is null and to_seat_id is not null and status = 'delivered'
  and committee_id in (select public.my_chaired_committees()));
create policy "notes chair decides" on public.notes for update to authenticated
  using (committee_id in (select public.my_chaired_committees())) with check (committee_id in (select public.my_chaired_committees()));

-- Scores: chairs of that committee, each writing their own rows
create policy "scores chair" on public.scores for all to authenticated
  using (session_id in (select s.id from public.sessions s where s.committee_id in (select public.my_chaired_committees())))
  with check (chair_id = (select auth.uid())
              and session_id in (select s.id from public.sessions s where s.committee_id in (select public.my_chaired_committees())));

-- Awards: chairs nominate and may edit or withdraw their own nominations until core finalises them
create policy "awards read" on public.awards for select to authenticated using (
  published or committee_id in (select public.my_chaired_committees()));
create policy "awards core" on public.awards for all to authenticated
  using ((select public.is_core())) with check ((select public.is_core()));
create policy "nominate award" on public.awards for insert to authenticated with check (
  committee_id in (select public.my_chaired_committees()) and final = false and published = false
  and nominated_by = (select auth.uid()));
create policy "edit own nomination" on public.awards for update to authenticated
  using (nominated_by = (select auth.uid()) and final = false and committee_id in (select public.my_chaired_committees()))
  with check (nominated_by = (select auth.uid()) and final = false and published = false
              and committee_id in (select public.my_chaired_committees()));
create policy "withdraw own nomination" on public.awards for delete to authenticated
  using (nominated_by = (select auth.uid()) and final = false and committee_id in (select public.my_chaired_committees()));

-- Feedback: write your own (general, or for a committee you were in); core admins read all
create policy "feedback own"  on public.feedback for insert to authenticated with check (
  profile_id = (select auth.uid()) and (committee_id is null or committee_id in (select public.my_committees())));
create policy "feedback read" on public.feedback for select to authenticated using (
  profile_id = (select auth.uid()) or (select public.is_core()));

-- ───────────────────────── 7. Privileged actions (RPC) ─────────────────────────

-- Internal: derive 'confirmed' ⇄ 'allocated'. Confirmed = seat assigned and accepted,
-- code of conduct accepted, parent consent confirmed, fees paid. Undoing any of them reverts.
create or replace function public.recompute_confirmation(p_reg uuid) returns public.reg_status
language plpgsql security definer set search_path = '' as
$$ declare st public.reg_status; ready boolean; want public.reg_status;
begin
  select r.status,
         exists (select 1 from public.assignments a where a.registration_id = r.id)
         and r.seat_accepted_at is not null and r.coc_accepted_at is not null and r.paid
         and exists (select 1 from public.consents c where c.registration_id = r.id and c.confirmed_at is not null)
    into st, ready
    from public.registrations r where r.id = p_reg;
  if st is null or st not in ('allocated', 'confirmed') then return st; end if;
  want := case when ready then 'confirmed'::public.reg_status else 'allocated'::public.reg_status end;
  if want <> st then
    update public.registrations set status = want where id = p_reg;
    perform public.log('confirmation', 'registrations', p_reg::text, jsonb_build_object('status', want));
  end if;
  return want;
end $$;

-- Roles ------------------------------------------------------------------
create or replace function public.admin_set_role(p_profile uuid, p_role public.user_role, p_level public.admin_level default null)
returns void language plpgsql security definer set search_path = '' as
$$ begin
  if not public.is_core() then raise exception 'Not allowed'; end if;
  if (select role = 'admin' and admin_level = 'core' from public.profiles where id = p_profile)
     and not (p_role = 'admin' and coalesce(p_level, 'staff') = 'core')
     and (select count(*) from public.profiles where role = 'admin' and admin_level = 'core') = 1 then
    raise exception 'Cannot remove the last core admin';
  end if;
  update public.profiles set role = p_role, admin_level = case when p_role = 'admin' then coalesce(p_level, 'staff') end
   where id = p_profile;
  if not found then raise exception 'No such profile'; end if;
  perform public.log('set_role', 'profiles', p_profile::text, jsonb_build_object('role', p_role, 'level', p_level));
end $$;

-- Schools and membership ---------------------------------------------------
create or replace function public.admin_set_school_status(p_school uuid, p_status public.school_status)
returns void language plpgsql security definer set search_path = '' as
$$ declare adv uuid;
begin
  if not public.staff_can('registration') then raise exception 'Not allowed'; end if;
  update public.schools set status = p_status where id = p_school returning advisor_id into adv;
  if not found then raise exception 'No such school'; end if;
  if adv is not null and p_status = 'approved' then
    update public.profiles set role = 'advisor', school_id = p_school where id = adv and role = 'delegate';
  elsif adv is not null then
    -- No longer approved: the advisor loses the role unless they still run another approved school.
    update public.profiles set role = 'delegate' where id = adv and role = 'advisor'
       and not exists (select 1 from public.schools where advisor_id = adv and status = 'approved');
  end if;
  perform public.log('school_status', 'schools', p_school::text, jsonb_build_object('status', p_status));
end $$;

-- Registration staff move a person into (or out of, with null) a school.
create or replace function public.admin_set_member_school(p_profile uuid, p_school uuid)
returns void language plpgsql security definer set search_path = '' as
$$ begin
  if not public.staff_can('registration') then raise exception 'Not allowed'; end if;
  update public.profiles set school_id = p_school where id = p_profile;
  if not found then raise exception 'No such profile'; end if;
  update public.registrations set school_id = p_school where profile_id = p_profile;
  perform public.log('member_school', 'profiles', p_profile::text, jsonb_build_object('school', p_school));
end $$;

-- An advisor (or registration staff) invites a student to an approved school. Returns the token
-- for the emailed link. Re-inviting the same email refreshes the token.
create or replace function public.create_school_invite(p_school uuid, p_email text)
returns uuid language plpgsql security definer set search_path = '' as
$$ declare tok uuid;
begin
  if not exists (select 1 from public.schools where id = p_school and status = 'approved'
                 and (advisor_id = auth.uid() or public.staff_can('registration'))) then
    raise exception 'Not allowed';
  end if;
  insert into public.school_invites (school_id, email, created_by) values (p_school, lower(trim(p_email)), auth.uid())
  on conflict (school_id, email) do update
    set token = gen_random_uuid(), expires_at = now() + interval '14 days', created_by = excluded.created_by
    where public.school_invites.accepted_at is null
  returning token into tok;
  if tok is null then raise exception 'This student has already accepted an invite'; end if;
  perform public.log('invite', 'school_invites', p_school::text, jsonb_build_object('email', lower(trim(p_email))));
  return tok;
end $$;

-- What an invite link is for, shown before sign-in (anon may call it). Always one row:
-- the school's name (null for an unknown token) and whether the invite can still be accepted.
-- It never returns the invited email or anything else.
create or replace function public.invite_info(p_token uuid)
returns table (school_name text, valid boolean)
language sql stable security definer set search_path = '' as
$$ select s.name, coalesce(i.accepted_at is null and i.expires_at > now() and s.status = 'approved', false)
   from (select 1) one
   left join public.school_invites i on i.token = p_token
   left join public.schools s on s.id = i.school_id $$;

-- The invited student accepts: sets their name, grade and school, and creates their
-- registration (status 'applied') if they have none. Returns the school's name.
create or replace function public.accept_invite(p_token uuid, p_full_name text default null, p_grade text default null)
returns text language plpgsql security definer set search_path = '' as
$$ declare inv_id uuid; inv_email text; sch uuid; sch_name text;
begin
  select i.id, i.email, i.school_id, s.name into inv_id, inv_email, sch, sch_name
    from public.school_invites i join public.schools s on s.id = i.school_id
   where i.token = p_token and i.accepted_at is null and i.expires_at > now() and s.status = 'approved'
   for update of i;
  if inv_id is null then raise exception 'This invite is invalid or has expired'; end if;
  if inv_email <> (select lower(email) from public.profiles where id = auth.uid()) then
    raise exception 'This invite was sent to a different email address';
  end if;
  update public.profiles
     set school_id = sch, full_name = coalesce(p_full_name, full_name), grade = coalesce(p_grade, grade)
   where id = auth.uid();
  insert into public.registrations (profile_id, school_id) values (auth.uid(), sch)
  on conflict (profile_id) do update set school_id = excluded.school_id;
  update public.school_invites set accepted_at = now(), accepted_by = auth.uid() where id = inv_id;
  perform public.log('accept_invite', 'school_invites', inv_id::text, jsonb_build_object('school', sch));
  return sch_name;
end $$;

-- An individual student applies (their school, if any, comes from an accepted invite).
create or replace function public.apply_individual(p_full_name text, p_grade text, p_experience text default null, p_motivation text default null)
returns uuid language plpgsql security definer set search_path = '' as
$$ declare reg uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.registrations where profile_id = auth.uid()) then
    raise exception 'You have already applied';
  end if;
  update public.profiles set full_name = p_full_name, grade = p_grade where id = auth.uid();
  insert into public.registrations (profile_id, school_id, experience, motivation)
  values (auth.uid(), (select school_id from public.profiles where id = auth.uid()), p_experience, p_motivation)
  returning id into reg;
  perform public.log('apply', 'registrations', reg::text);
  return reg;
end $$;

-- Registration status and fees ---------------------------------------------
-- Staff set only the manual statuses. 'allocated' and 'confirmed' come from the seat and confirmation flow.
create or replace function public.admin_set_registration_status(p_reg uuid, p_status public.reg_status)
returns void language plpgsql security definer set search_path = '' as
$$ begin
  if not public.staff_can('registration') then raise exception 'Not allowed'; end if;
  if p_status in ('allocated', 'confirmed') then
    raise exception 'Status % is set by the system (assign a seat, then the delegate confirms)', p_status;
  end if;
  if not exists (select 1 from public.registrations where id = p_reg) then raise exception 'No such registration'; end if;
  if p_status in ('withdrawn', 'rejected') then
    delete from public.assignments where registration_id = p_reg;
    update public.registrations set status = p_status, seat_accepted_at = null where id = p_reg;
  else
    if exists (select 1 from public.assignments where registration_id = p_reg) then
      raise exception 'Remove the seat first (admin_assign_seat with a null seat)';
    end if;
    update public.registrations set status = p_status where id = p_reg;
  end if;
  perform public.log('registration_status', 'registrations', p_reg::text, jsonb_build_object('status', p_status));
end $$;

create or replace function public.admin_mark_paid(p_reg uuid default null, p_school uuid default null, p_paid boolean default true)
returns void language plpgsql security definer set search_path = '' as
$$ begin
  if not public.staff_can('registration') then raise exception 'Not allowed'; end if;
  if p_reg is not null then
    update public.registrations set paid = p_paid, paid_at = case when p_paid then now() end where id = p_reg;
    perform public.recompute_confirmation(p_reg);
  end if;
  if p_school is not null then
    update public.schools set paid = p_paid, paid_at = case when p_paid then now() end where id = p_school;
    update public.registrations set paid = p_paid, paid_at = case when p_paid then now() end where school_id = p_school;
    perform public.recompute_confirmation(id) from public.registrations where school_id = p_school;
  end if;
  perform public.log('mark_paid', case when p_reg is not null then 'registrations' else 'schools' end,
                     coalesce(p_reg, p_school)::text, jsonb_build_object('paid', p_paid));
end $$;

-- Allocation (core only). A null seat removes the allocation. Moving to a different seat
-- clears the delegate's seat acceptance, so they must accept the new seat.
create or replace function public.admin_assign_seat(p_reg uuid, p_seat uuid)
returns void language plpgsql security definer set search_path = '' as
$$ declare st public.reg_status; cur uuid;
begin
  if not public.is_core() then raise exception 'Not allowed'; end if;
  select status into st from public.registrations where id = p_reg;
  if st is null then raise exception 'No such registration'; end if;
  if st in ('withdrawn', 'rejected') then raise exception 'Registration is %', st; end if;
  select seat_id into cur from public.assignments where registration_id = p_reg;
  if p_seat is null then
    delete from public.assignments where registration_id = p_reg;
    update public.registrations set status = 'approved', seat_accepted_at = null
     where id = p_reg and status in ('allocated', 'confirmed');
  else
    insert into public.assignments (registration_id, seat_id, assigned_by) values (p_reg, p_seat, auth.uid())
      on conflict (registration_id) do update set seat_id = excluded.seat_id, assigned_by = excluded.assigned_by, assigned_at = now();
    update public.registrations
       set status = 'allocated',
           seat_accepted_at = case when cur is not distinct from p_seat then seat_accepted_at end
     where id = p_reg;
    perform public.recompute_confirmation(p_reg);
  end if;
  perform public.log('assign_seat', 'assignments', p_reg::text, jsonb_build_object('seat', p_seat));
end $$;

-- Confirmation (the delegate) ----------------------------------------------
create or replace function public.accept_seat()
returns void language plpgsql security definer set search_path = '' as
$$ declare reg uuid;
begin
  select r.id into reg from public.registrations r
   where r.profile_id = auth.uid() and r.status in ('allocated', 'confirmed')
     and exists (select 1 from public.assignments a where a.registration_id = r.id);
  if reg is null then raise exception 'You have no seat to accept'; end if;
  update public.registrations set seat_accepted_at = coalesce(seat_accepted_at, now()) where id = reg;
  perform public.recompute_confirmation(reg);
  perform public.log('accept_seat', 'registrations', reg::text);
end $$;

create or replace function public.accept_code_of_conduct()
returns void language plpgsql security definer set search_path = '' as
$$ declare reg uuid;
begin
  update public.registrations set coc_accepted_at = coalesce(coc_accepted_at, now())
   where profile_id = auth.uid() returning id into reg;
  if reg is null then raise exception 'No registration'; end if;
  perform public.recompute_confirmation(reg);
end $$;

-- The delegate names a parent; a token is created for the emailed confirmation link
-- (sent by an Edge Function with the service role). Re-requesting resets the confirmation.
create or replace function public.request_consent(p_parent_name text, p_parent_email text)
returns void language plpgsql security definer set search_path = '' as
$$ declare reg uuid; mail text := lower(trim(p_parent_email));
begin
  select id into reg from public.registrations where profile_id = auth.uid();
  if reg is null then raise exception 'No registration'; end if;
  if mail = (select lower(trim(email)) from public.profiles where id = auth.uid()) then
    raise exception 'The parent''s email must be different from your own';
  end if;
  insert into public.consents (registration_id, parent_name, parent_email) values (reg, p_parent_name, mail)
    on conflict (registration_id) do update set parent_name = excluded.parent_name, parent_email = excluded.parent_email,
      requested_at = now(), confirmed_at = null;
  insert into public.consent_tokens (registration_id) values (reg)
    on conflict (registration_id) do update set token = gen_random_uuid(), expires_at = now() + interval '14 days';
  perform public.recompute_confirmation(reg);
  perform public.log('request_consent', 'consents', reg::text);
end $$;

-- Called from the parent's link (anon). Knowing the unguessable token is the proof.
create or replace function public.confirm_consent(p_token uuid)
returns boolean language plpgsql security definer set search_path = '' as
$$ declare reg uuid;
begin
  delete from public.consent_tokens where token = p_token and expires_at > now() returning registration_id into reg;
  if reg is null then return false; end if;
  update public.consents set confirmed_at = now() where registration_id = reg;
  perform public.recompute_confirmation(reg);
  perform public.log('consent_confirmed', 'consents', reg::text);
  return true;
end $$;

-- Preparation ------------------------------------------------------------
-- A chair of the delegate's committee (or committee staff, or core) marks a position paper.
create or replace function public.mark_paper(p_reg uuid, p_mark integer, p_comment text default null)
returns void language plpgsql security definer set search_path = '' as
$$ begin
  if p_reg is null or p_reg not in (select public.chaired_registrations()) then raise exception 'Not allowed'; end if;
  update public.position_papers
     set mark = p_mark, comment = p_comment, marked_by = auth.uid(), marked_at = now()
   where registration_id = p_reg;
  if not found then raise exception 'No position paper submitted'; end if;
  perform public.log('mark_paper', 'position_papers', p_reg::text, jsonb_build_object('mark', p_mark));
end $$;

-- Arrival ----------------------------------------------------------------
-- The registration desk scans a QR code. Returns who it is; records the check-in once per day.
create or replace function public.checkin_by_code(p_code text, p_day integer)
returns table (registration_id uuid, full_name text, committee_abbr text, seat_label text,
               status public.reg_status, first_checkin boolean)
language plpgsql security definer set search_path = '' as
$$ declare reg uuid; n integer;
begin
  if not public.staff_can('registration') then raise exception 'Not allowed'; end if;
  select c.registration_id into reg from public.checkin_codes c where c.code = lower(trim(p_code));
  if reg is null then raise exception 'Unknown check-in code'; end if;
  insert into public.checkins (registration_id, day, checked_by) values (reg, p_day, auth.uid())
    on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then perform public.log('checkin', 'checkins', reg::text, jsonb_build_object('day', p_day)); end if;
  return query
    select r.id, p.full_name, cm.abbr, s.label, r.status, n > 0
      from public.registrations r
      join public.profiles p on p.id = r.profile_id
      left join public.assignments a on a.registration_id = r.id
      left join public.seats s on s.id = a.seat_id
      left join public.committees cm on cm.id = s.committee_id
     where r.id = reg;
end $$;

-- Committee room -----------------------------------------------------------
-- Who holds which seat. Members and chairs of that committee only; names only (no email, grade or school).
create or replace function public.committee_roster(p_committee uuid)
returns table (seat_id uuid, seat_label text, seat_kind public.seat_kind, full_name text)
language sql stable security definer set search_path = '' as
$$ select s.id, s.label, s.kind, p.full_name
   from public.seats s
   left join public.assignments a on a.seat_id = s.id
   left join public.registrations r on r.id = a.registration_id
   left join public.profiles p on p.id = r.profile_id
   where s.committee_id = p_committee and p_committee in (select public.my_committees())
   order by s.label, p.full_name $$;

-- The chairs of the caller's committees (names and chair roles only).
create or replace function public.my_committee_chairs()
returns table (committee_id uuid, full_name text, role text)
language sql stable security definer set search_path = '' as
$$ select cs.committee_id, p.full_name, cs.role
   from public.committee_staff cs join public.profiles p on p.id = cs.profile_id
   where cs.committee_id in (select public.my_committees())
   order by cs.committee_id, cs.role, p.full_name $$;

-- A delegate submits a working paper, draft resolution or amendment, with its sponsors and
-- signatories, in one step. The caller's seat is always a sponsor; every seat must be in the
-- caller's committee; an amendment's parent must be a draft resolution in the same committee.
create or replace function public.submit_document(p_type public.doc_type, p_title text, p_body text default null,
  p_parent uuid default null, p_sponsors uuid[] default '{}', p_signatories uuid[] default '{}', p_file_path text default null)
returns uuid language plpgsql security definer set search_path = '' as
$$ declare my_seat uuid; cid uuid; doc uuid; bad integer;
begin
  select s into my_seat from public.my_seats() s limit 1;
  if my_seat is null then raise exception 'You have no seat'; end if;
  cid := public.committee_of_seat(my_seat);
  if (p_type = 'amendment') <> (p_parent is not null) then
    raise exception 'Amendments need a parent draft resolution, and only amendments have one';
  end if;
  select count(*) into bad from unnest(coalesce(p_sponsors, '{}') || coalesce(p_signatories, '{}')) x
   where public.committee_of_seat(x) is distinct from cid;
  if bad > 0 then raise exception 'Every sponsor and signatory must be a seat in your committee'; end if;
  insert into public.documents (committee_id, type, title, body, file_path, parent_id, submitted_by)
  values (cid, p_type, p_title, p_body, p_file_path, p_parent, auth.uid())     -- parent checked by trigger
  returning id into doc;
  insert into public.document_sponsors (document_id, seat_id, role)
  select doc, x, case when bool_or(sp) then 'sponsor' else 'signatory' end
    from (select my_seat as x, true as sp
          union all select unnest(coalesce(p_sponsors, '{}')), true
          union all select unnest(coalesce(p_signatories, '{}')), false) t
   group by x;
  return doc;
end $$;

-- Votes. The seat must be the caller's, the motion or document open for voting in that seat's
-- committee, and the seat marked present in the committee's current live session.
-- 'present_voting' seats may not abstain on substantive (document) votes.
create or replace function public.cast_vote(p_seat uuid, p_choice public.vote_choice, p_motion uuid default null, p_document uuid default null)
returns void language plpgsql security definer set search_path = '' as
$$ declare cid uuid; sid uuid; rs public.roll_status;
begin
  if p_seat is null or p_seat not in (select public.my_seats()) then raise exception 'Not your seat'; end if;
  if (p_motion is null) = (p_document is null) then raise exception 'Vote on one motion or one document'; end if;
  if p_motion is not null then
    select committee_id into cid from public.motions where id = p_motion and status = 'voting';
  else
    select committee_id into cid from public.documents where id = p_document and status = 'voting';
  end if;
  if cid is null then raise exception 'Voting is not open'; end if;
  if public.committee_of_seat(p_seat) <> cid then raise exception 'Seat is not in this committee'; end if;
  select id into sid from public.sessions where committee_id = cid and status = 'live' order by number desc limit 1;
  if sid is null then raise exception 'There is no live session in this committee'; end if;
  select status into rs from public.roll_calls where session_id = sid and seat_id = p_seat;
  if rs is null or rs = 'absent' then raise exception 'Your seat is not marked present in this session'; end if;
  if p_document is not null and rs = 'present_voting' and p_choice = 'abstain' then
    raise exception 'Present and voting delegations cannot abstain on substantive votes';
  end if;
  insert into public.votes (committee_id, motion_id, document_id, seat_id, choice, cast_by)
    values (cid, p_motion, p_document, p_seat, p_choice, auth.uid());
  perform public.log('vote', 'votes', coalesce(p_motion, p_document)::text, jsonb_build_object('seat', p_seat, 'choice', p_choice));
end $$;

-- Tallies follow the votes rule: chairs any time; committee members once it has closed.
-- A motion's recorded (voice or placard) count wins over phone votes when the chair entered one.
create or replace function public.motion_tally(p_motion uuid)
returns table (yes_count integer, no_count integer, abstain_count integer)
language plpgsql stable security definer set search_path = '' as
$$ declare m record;
begin
  select committee_id, status, recorded_yes, recorded_no, recorded_abstain into m from public.motions where id = p_motion;
  if m.committee_id is null then raise exception 'No such motion'; end if;
  if not (public.chairs(m.committee_id)
          or (m.status in ('passed', 'failed') and m.committee_id in (select public.my_committees()))) then
    raise exception 'Results are not published yet';
  end if;
  if coalesce(m.recorded_yes, m.recorded_no, m.recorded_abstain) is not null then
    return query select coalesce(m.recorded_yes, 0)::integer, coalesce(m.recorded_no, 0)::integer, coalesce(m.recorded_abstain, 0)::integer;
  else
    return query select (count(*) filter (where v.choice = 'yes'))::integer, (count(*) filter (where v.choice = 'no'))::integer,
                        (count(*) filter (where v.choice = 'abstain'))::integer
                   from public.votes v where v.motion_id = p_motion;
  end if;
end $$;

create or replace function public.document_tally(p_document uuid)
returns table (yes_count integer, no_count integer, abstain_count integer)
language plpgsql stable security definer set search_path = '' as
$$ declare cid uuid; st public.doc_status;
begin
  select committee_id, status into cid, st from public.documents where id = p_document;
  if cid is null then raise exception 'No such document'; end if;
  if not (public.chairs(cid) or (st in ('passed', 'failed') and cid in (select public.my_committees()))) then
    raise exception 'Results are not published yet';
  end if;
  return query select (count(*) filter (where v.choice = 'yes'))::integer, (count(*) filter (where v.choice = 'no'))::integer,
                      (count(*) filter (where v.choice = 'abstain'))::integer
                 from public.votes v where v.document_id = p_document;
end $$;

-- ───────────────────────── 8. Live updates ─────────────────────────
-- Realtime applies the same SELECT policies per subscriber, so a delegate receives only the
-- rows they could select (for example only their own registration, consent and paper).
alter publication supabase_realtime add table public.notes, public.speakers, public.motions, public.votes,
  public.roll_calls, public.documents, public.sessions, public.announcements, public.settings,
  public.registrations, public.consents, public.position_papers;

-- ───────────────────────── 9. Storage ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('study-guides',    'study-guides',    true,  20971520, array['application/pdf']),
  ('position-papers', 'position-papers', false, 10485760, array['application/pdf']),
  ('documents',       'documents',       false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- Position papers: stored at <registration_id>/<file>.pdf. The owner uploads before the deadline
-- and until the paper is marked; owner, their advisor, their chair and registration staff read.
create policy "paper upload" on storage.objects for insert to authenticated with check (
  bucket_id = 'position-papers'
  and (storage.foldername(objects.name))[1] in (select r.id::text from public.registrations r where r.profile_id = (select auth.uid()))
  and (select public.deadline_open('position_paper'))
  and not exists (select 1 from public.position_papers p
                  where p.registration_id::text = (storage.foldername(objects.name))[1] and p.mark is not null));
create policy "paper replace" on storage.objects for update to authenticated
  using (
    bucket_id = 'position-papers'
    and (storage.foldername(objects.name))[1] in (select r.id::text from public.registrations r where r.profile_id = (select auth.uid()))
    and (select public.deadline_open('position_paper'))
    and not exists (select 1 from public.position_papers p
                    where p.registration_id::text = (storage.foldername(objects.name))[1] and p.mark is not null))
  with check (
    bucket_id = 'position-papers'
    and (storage.foldername(objects.name))[1] in (select r.id::text from public.registrations r where r.profile_id = (select auth.uid())));
create policy "paper read" on storage.objects for select to authenticated using (
  bucket_id = 'position-papers'
  and (storage.foldername(objects.name))[1] in (select r.id::text from public.registrations r));   -- registrations RLS decides

-- Study guides: a public bucket (served without RLS); only core uploads.
create policy "study guides admin" on storage.objects for all to authenticated
  using (bucket_id = 'study-guides' and (select public.is_core()))
  with check (bucket_id = 'study-guides' and (select public.is_core()));

-- Committee documents: stored at <committee_id>/<file>.pdf. Members read and upload;
-- only chairs replace or delete. Folder names are compared as text (a bad name never errors).
create policy "documents files read" on storage.objects for select to authenticated using (
  bucket_id = 'documents' and (storage.foldername(objects.name))[1] in (select c::text from public.my_committees() c));
create policy "documents files upload" on storage.objects for insert to authenticated with check (
  bucket_id = 'documents' and (storage.foldername(objects.name))[1] in (select c::text from public.my_committees() c));
create policy "documents files chair update" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(objects.name))[1] in (select c::text from public.my_chaired_committees() c))
  with check (bucket_id = 'documents' and (storage.foldername(objects.name))[1] in (select c::text from public.my_chaired_committees() c));
create policy "documents files chair delete" on storage.objects for delete to authenticated using (
  bucket_id = 'documents' and (storage.foldername(objects.name))[1] in (select c::text from public.my_chaired_committees() c));

-- ───────────────────────── 10. Privileges ─────────────────────────
-- Supabase grants ALL on public tables to anon and authenticated by default. Narrow that:
-- anon only reads (RLS then limits it to public info); nobody truncates through the API roles.
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- RPC-only and server-only tables: no direct client writes at all.
revoke all on public.consent_tokens, public.audit_log from anon, authenticated;
revoke insert, update, delete on public.assignments, public.consents, public.votes, public.checkin_codes,
  public.school_invites from authenticated;
grant delete on public.school_invites to authenticated;                 -- advisors revoke unaccepted invites (policy)
revoke insert on public.documents from authenticated;                   -- documents arrive through submit_document()

-- Column grants: what a plain user may write directly (policies still decide which rows).
revoke insert, update on public.profiles from authenticated;
grant update (full_name, grade, school_name) on public.profiles to authenticated;
revoke insert, update on public.schools from authenticated;
grant insert (name, advisor_id) on public.schools to authenticated;
revoke insert, update on public.registrations from authenticated;
grant insert (profile_id, school_id, experience, motivation) on public.registrations to authenticated;
grant update (experience, motivation) on public.registrations to authenticated;
revoke insert, update on public.position_papers from authenticated;
grant insert (registration_id, file_path, original_name) on public.position_papers to authenticated;
grant update (file_path, original_name) on public.position_papers to authenticated;

-- Functions: nothing is executable by default ...
revoke execute on all functions in schema public from public, anon, authenticated;

-- ... then signed-in users get the policy helpers (policies run them as the caller) and the RPCs.
grant execute on function
  public.my_role(), public.is_admin(), public.is_core(), public.staff_can(text, uuid), public.my_school(),
  public.advised_schools(), public.my_seats(), public.my_chaired_committees(), public.my_committees(),
  public.chairs(uuid), public.committee_of_seat(uuid), public.chaired_registrations(), public.chaired_profiles(),
  public.deadline_open(text)
to authenticated;
grant execute on function
  public.admin_set_role(uuid, public.user_role, public.admin_level),
  public.admin_set_school_status(uuid, public.school_status),
  public.admin_set_member_school(uuid, uuid),
  public.admin_set_registration_status(uuid, public.reg_status),
  public.admin_mark_paid(uuid, uuid, boolean),
  public.admin_assign_seat(uuid, uuid),
  public.create_school_invite(uuid, text),
  public.invite_info(uuid),
  public.accept_invite(uuid, text, text),
  public.apply_individual(text, text, text, text),
  public.accept_seat(),
  public.accept_code_of_conduct(),
  public.request_consent(text, text),
  public.confirm_consent(uuid),
  public.mark_paper(uuid, integer, text),
  public.checkin_by_code(text, integer),
  public.committee_roster(uuid),
  public.my_committee_chairs(),
  public.submit_document(public.doc_type, text, text, uuid, uuid[], uuid[], text),
  public.cast_vote(uuid, public.vote_choice, uuid, uuid),
  public.motion_tally(uuid),
  public.document_tally(uuid)
to authenticated;
-- The parent's consent link and the invite landing page work without signing in.
grant execute on function public.confirm_consent(uuid), public.invite_info(uuid) to anon;
-- Not granted to any client: log, recompute_confirmation and the trigger functions
-- (handle_new_user, create_checkin_code, check_seat_capacity, check_committee_links,
--  notes_from_chair, position_paper_guard, touch_updated_at, audit_row).

-- Future functions: Supabase grants EXECUTE on new public functions to anon and authenticated
-- (per schema), and Postgres grants it to PUBLIC (globally). Turn both off so every later
-- migration must grant its functions explicitly.
alter default privileges in schema public revoke execute on functions from anon, authenticated;
alter default privileges revoke execute on functions from public;
