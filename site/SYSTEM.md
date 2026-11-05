# DXB MUN v2: the system build brief (shared by every agent; RE-READ before each major step)

The owner approved the plan in `site/DASHBOARD-PLAN.md`. It's the product spec: read it first, and every
item in it must exist. The contract is `src/platform/v2/contract.ts` (FROZEN). Report any needed change to the lead.

## Owner rules (non-negotiable)
- **No hallucination:** no invented dates, rooms, names, numbers or facts. An unknown value shows "To be announced". Demo data is labelled as samples ("Sample Delegate 3"); seats may use real UN member state names.
- **Gone:** fees, paid status, consent, code of conduct, seat acceptance, the readiness stepper, certificates and feedback.
- **Easy to read at a glance:**
  - one clear main action per screen;
  - short lines, no paragraphs;
  - status shown with colour plus icon plus word;
  - large type for the timer;
  - works at 390 px (phone) and 1440 px (desktop), with no horizontal scroll.
- **Build from the design library, never from scratch:** coss ui first (already copied into `portal/ui/coss/`), then shadcn/ui, then Base CN.
  - Reuse the components already in the repo; copy in new ones from the library when needed.
  - Record each component's source in your folder's `LIBRARY.md`.
  - Hand-written CSS is only for layout glue.
- **Colours:** use ONLY the semantic tokens from `portal/theme.css` (`bg-background`, `bg-card`, `text-muted-foreground`, `primary`, `success`, `warning`, `destructive`, `border`, plus `maroon`, `gold` and `cream` for IHS).
  - No hex values and no new colours in your files: the owner is choosing a new palette, and the lead will swap the tokens in that one file.
  - Don't edit `portal/theme.css`.
  - UN blue (`primary`) is the only action colour.
  - Gold is only for awards.
- **Nav:** at most 7 places in the main nav. On phones, use a bottom bar with up to 5 places plus a "More" sheet.

## The machine has very little free RAM (~1.5 GB)
- **Never start your own dev server.** The lead runs one shared Vite dev server at **http://127.0.0.1:5320**. It serves every page (`/portal/`, `/chair/`, `/admin/`, `/concepts/…`) with hot reload.
- **Run every heavy command through the lock:** `node scripts/heavy.mjs "<command>"`, from `site/`. Heavy means tsc, vite build, and puppeteer or Chrome screenshots.
  - Typecheck: `node scripts/heavy.mjs "npx tsc --noEmit --singleThreaded"`. Other agents' files may have errors mid-build, so look only at errors in YOUR files.
  - Screenshots: write a small puppeteer-core script in your own folder, modelled on `scripts/live-shots.mjs`. Point it at the shared server, take 1440 and 390 shots, close the browser, and run it through heavy.mjs.
- Don't run `npm install` without asking the lead.
- **Never deploy, commit or push.** Never touch the live database. Never create `site/.env*`.

## Shared data layer (`src/platform/v2/`)
- `contract.ts`: the types and interfaces. The lead owns it; it's frozen.
- `index.ts`: exports `getDelegateApi()`, `getChairApi()` and `getSecretariatApi()`, and re-exports every contract type.
  - If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, they return the live adapters; otherwise they return the demo adapters.
  - UIs import only from `@/platform/v2`.
- **Demo:** a single shared in-browser store in localStorage, kept in sync across tabs through the `storage` event. A chair tab starting the timer makes the delegate tab's timer run.
  - Sign-in: any email, code `123456`.
  - The demo picks the role from the email: anything with "chair" is a chair (of UNSC), anything with "admin" or "sec" is core secretariat, and everything else is a delegate.
  - On the delegate dashboard, `?demo=new|applied|seated|live|after` picks a scenario.
  - A demo "Reset sample data" helper is exported for the UIs.
- **Live:** Supabase project `phzbbmkeuvjdzvqsnigh`. The schema is in `supabase/migrations/0001_init.sql`, `0003`, and the new `0004_conference_day.sql`.

## Who owns what (only edit your own files)
| Agent | Owns |
|---|---|
| **demo-data** | `src/platform/v2/index.ts`, `src/platform/v2/demo*.ts` |
| **live-data** | `supabase/migrations/0004_conference_day.sql`, `src/platform/v2/supabase*.ts` |
| **delegate-ui** | `portal/**` except `portal/theme.css` and `portal/ui/coss/**` (which you may ADD files to) |
| **chair-ui** | `chair/**` (new page: `chair/index.html`, `chair/main.tsx`, ...). Import tokens via `@import "../portal/theme.css"` as `admin/admin.css` does, and reuse `portal/ui/coss/*` by import, never by editing. |
| **secretariat-ui** | `admin/**` |
| **website-options** | `concepts/option-a/**`, `concepts/option-b/**`, `concepts/option-c/**` |
| **lead** | contract, `portal/theme.css`, vite configs, deploy scripts, `SYSTEM.md`, `DASHBOARD-PLAN.md` |

The old v1 files (`src/platform/api.ts`, `demo.ts`, `supabase.ts`, `admin.ts`, `admin-demo.ts`, `steps.ts`, `certificate.ts`) are being replaced. Don't import them from new code. The lead deletes them at the end.

## Sign-in
Every dashboard uses one email box, then one code box that takes 6–10 digits. A pasted code auto-submits. See the current `portal/screens/SignIn.tsx`, which is shared: the chair and admin pages import it with their own title. It takes an `AuthApi`.

## Definition of done (for each UI agent)
- Every item for your dashboard in DASHBOARD-PLAN.md works in the demo, end to end.
- There are no type errors in your files.
- Screenshots at 1440 and 390 of every page are saved in `site/shots/v2/<your-dashboard>/`, with no console errors and no horizontal overflow.
- Your report lists only what you actually ran and saw. If something doesn't work, say so.
