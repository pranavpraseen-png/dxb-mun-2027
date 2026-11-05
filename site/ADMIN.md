# Secretariat dashboard: the spec

This is binding. **Re-read it, and `DELEGATE.md` (its sections on the library, IHS colours and scope), before each major step.**

- **The owner's words:** "secretariat team dashboard, everything online, no certificates, finish fast".
- **The database is live:** Supabase project `phzbbmkeuvjdzvqsnigh`. The schema is `supabase/migrations/0001_init.sql` (applied), seeded with the 19 committees, no seats, `settings.phase = before`, and deadlines that are null.
- **The whole process** is described in `PLATFORM.md`.

## Rules

- **Build from the library:** coss ui first (already copied into `portal/ui/coss/`, so reuse those files by importing them), then shadcn/ui, then Base CN. Record anything new in `admin/LIBRARY.md`.
- **Look:** the same tokens as the delegate dashboard: navy, UN blue for actions, IHS maroon for the host mark, gold never on status. Same type.
- **Density:** it is a working tool for the organising team, so denser than the delegate side. Use tables with sticky headers, filters and search, but still have one clear primary action per screen.
- **No made-up data.** Live mode shows only what's in the database. Demo mode (for previews) uses obvious "Sample …" names and real committees from `conference.ts`.
- **Access:** only profiles with `role = 'admin'` may use it. Everyone else sees "This area is for the DXB MUN secretariat" plus a link to the delegate dashboard. `core` admins see everything; `staff` admins see only their areas (`staff_areas`). The database enforces this anyway; the UI should hide what a staff admin can't use.
- **Sign-in** is the same email + 6-digit code flow as the delegate dashboard. Reuse its sign-in component, don't re-create it.

## Screens

The left rail on desktop. On phones, a bottom bar with the 4 most used, plus "More".

1. **Overview:** counts at a glance, each linking to a filtered list:
   - applications by status;
   - schools pending;
   - allocated / seat accepted / confirmed;
   - paid / unpaid;
   - consent pending;
   - position papers in.
2. **Applications:** a searchable, filterable table of registrations: name, school or "Individual", status, preferences, paid, consent, paper.
   - **Row actions:** approve, reject, withdraw (`admin_set_registration_status`) and mark paid (`admin_mark_paid`).
   - **Bulk:** approve and mark paid on selected rows.
   - **Export:** CSV of the current filter.
3. **Schools:** pending and approved schools with their advisor. Actions:
   - approve or reject (`admin_set_school_status`);
   - mark the whole school paid (`admin_mark_paid(p_school)`);
   - create a student invite link for a school (`create_school_invite`), with a copy-link button. The link is `<site>/portal/#/invite/<token>`.
4. **Allocation:** pick a committee, and its seats are listed: filled, partly filled or open.
   - **Add seats:** core inserts into `seats` directly, one at a time or by pasting a list, one label per line, with kind and capacity.
   - **Assign:** each applicant is shown with their ranked preferences. Assign with `admin_assign_seat`; a null seat unassigns.
   - Show conflicts clearly, such as "Seat is full".
5. **Committees and people:**
   - Assign chairs: add to `committee_staff`, and set the role with `admin_set_role(p,'chair')`.
   - Promote someone to staff or core admin, with staff areas.
   - Set a member's school with `admin_set_member_school`.
   - Search profiles by name or email.
6. **Announcements:** create, edit and publish, with an audience (all, delegates, chairs, advisors or one committee) and a publish time.
7. **Settings:** the conference phase (before / live / after) with a confirm dialog, and the deadlines (registration, allocation, position paper), whose dates may stay empty = "To be announced".
8. **Check-in:** a day picker (1–3) and a big code field.
   - **Camera:** use the browser's built-in `BarcodeDetector` where available (Chrome and Android), with no new dependency. Elsewhere, type the code.
   - **Call:** `checkin_by_code(code, day)`.
   - **Result:** a huge green "Checked in: name · committee · seat" or an amber "Already checked in today", plus a red error for a bad code.

**Leave out:** certificates, awards, feedback.

## Data layer

- **You own** `src/platform/admin.ts` (an `AdminApi` interface, a Supabase implementation and a small demo implementation) and `admin/` (a Vite page: `admin/index.html`).
- **Don't edit** `src/platform/api.ts`, `demo.ts`, `supabase.ts` or `portal/`. Import shared bits from them if needed, for example the Supabase client: check `src/platform/supabase.ts` for an exported client or factory. If it has none, create your own client from the same env vars.
- **Build:** `vite.config.ts` must include `admin/index.html`. Add it the same way `portal` is added (an `existsSync` check). That's the only shared file you may touch, and only that one line block. `tsconfig.json`: add `"admin"` to `include`.

## Done means

- `npx tsc --noEmit` and `npx vite build` pass.
- Screenshots of every screen in demo mode at 1440 and 390, which you look at yourself.
- A scripted demo run of approve → mark paid → add seats → assign → check-in.
- **Live, without signing in:** confirm the page loads, shows sign-in, and that `committees` reads 19 rows with the anon key.
- **Live, signed in:** can't be tested yet, because there is no admin account until the owner signs in once and the lead promotes them. Say so.
