-- 0005: secretariat accounts must pass the authenticator-app step (owner, 2026-11-07: recommended sign-in setup).
-- An admin is treated as an admin only in a session at aal2 (signed in AND passed the app code). At aal1 the same
-- account sees and does nothing a non-admin can't. The dashboards show the app-code screen to get to aal2
-- (portal/screens/SecondStep.tsx). Chairs and delegates are unchanged.
--
-- Every admin check in the schema goes through these four functions (is_admin, is_core, staff_can,
-- my_chaired_committees), so redefining them covers every policy and RPC. Same signatures and settings as 0001.
--
-- Reset a lost phone (database owner only): delete from auth.mfa_factors where user_id = '<profile id>';
-- the person then links a new app at their next sign-in.

create or replace function public.mfa_passed() returns boolean
language sql stable security definer set search_path = '' as
$$ select coalesce((auth.jwt() ->> 'aal') = 'aal2', false) $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as
$$ select public.mfa_passed()
      and coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false) $$;

create or replace function public.is_core() returns boolean
language sql stable security definer set search_path = '' as
$$ select public.mfa_passed()
      and coalesce((select role = 'admin' and admin_level = 'core' from public.profiles where id = auth.uid()), false) $$;

create or replace function public.staff_can(p_area text, p_committee uuid default null) returns boolean
language sql stable security definer set search_path = '' as
$$ select public.is_core() or (public.mfa_passed() and exists (
     select 1 from public.staff_areas s join public.profiles p on p.id = s.profile_id
     where s.profile_id = auth.uid() and p.role = 'admin' and s.area = p_area
       and (p_area <> 'committee' or s.committee_id = p_committee))) $$;

create or replace function public.my_chaired_committees() returns setof uuid
language sql stable security definer set search_path = '' as
$$ select id from public.committees where public.is_core()
   union
   select committee_id from public.committee_staff where profile_id = auth.uid()
   union
   select s.committee_id from public.staff_areas s join public.profiles p on p.id = s.profile_id
    where s.profile_id = auth.uid() and p.role = 'admin' and s.area = 'committee' and public.mfa_passed() $$;

-- Same rule as 0001: nothing executable by default, the policy helpers for signed-in users.
revoke execute on function public.mfa_passed() from public, anon, authenticated;
grant execute on function public.mfa_passed() to authenticated;
