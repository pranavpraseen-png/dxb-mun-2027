-- Owner access before the first sign-in: emails listed here become core admins
-- the moment their account is created. No policies, so nobody can read or edit
-- the list through the API; only the database owner (SQL / migrations) can.
create table if not exists public.admin_bootstrap (
  email text primary key check (email = lower(email)),
  added_at timestamptz not null default now()
);
alter table public.admin_bootstrap enable row level security;
revoke all on public.admin_bootstrap from anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as
$$ begin
  if exists (select 1 from public.admin_bootstrap b where b.email = lower(coalesce(new.email, ''))) then
    insert into public.profiles (id, email, role, admin_level)
      values (new.id, coalesce(new.email, ''), 'admin', 'core');
  else
    insert into public.profiles (id, email) values (new.id, coalesce(new.email, ''));
  end if;
  return new;
end $$;

insert into public.admin_bootstrap (email) values ('praseenv@gmail.com') on conflict do nothing;

insert into public.admin_bootstrap (email) values ('pranavpraseen@gmail.com') on conflict do nothing;
