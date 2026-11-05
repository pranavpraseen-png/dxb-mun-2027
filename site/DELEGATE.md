# Delegate dashboard: the spec

This is the binding spec for the agents building the delegate dashboard. **Re-read this file and `src/platform/api.ts` at the start of every major step.** The lead updates them as the owner gives feedback, and the newest version always wins.

Background: `PLATFORM.md` covers the whole MUN process, roles and data. `BRIEF.md` covers the design rules.

## Owner's words (2026-11-04)

- "Prioritize the delegate dashboard."
- "Make it easy to navigate, super easy to lay your eyes on."
- "I don't want you to hallucinate."

## Rules against making things up

- Conference facts come **only** from `src/data/conference.ts`: name, host, motto, the 19 committees and the schedule. Dates, venue, deadlines, fees and contacts are **unknown**, so show "To be announced" and never invent a value.
- Demo mode shows **sample people and sample activity**, and the page says so ("Sample data") wherever it appears. Sample seat names are real UN member states or plain role names. Nothing should look like a real student.
- Never claim a feature works unless you ran it. Report only what you checked, with the command or the screenshot. If something is unfinished, say so.
- Don't add features the spec doesn't list. Suggest them in your report instead.

## Where things live

| Part | Path | Owner |
|---|---|---|
| Contract (frozen) | `src/platform/api.ts` | lead |
| Data layer: demo + Supabase + auth | `src/platform/*.ts` (except api.ts) | data agent |
| Dashboard UI | `portal/` (its own Vite page: `portal/index.html`) | UI agent |
| Database | `supabase/migrations/` | lead |

Each agent edits only its own paths. If you need the contract changed, stop and report the exact change you need.

The UI gets the API from `import { getApi } from '@/platform'`, which returns the demo adapter unless `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set. In demo mode, `?demo=<scenario>` picks the state. Scenarios: `new` (signed in, not applied), `applied`, `allocated` (seat given, to-dos open), `ready` (everything done, before the conference), `live` (conference day, session running, a vote open), `after` (award and certificate). The demo starts signed out, and any email works with code `123456`.

## What "easy to lay eyes on" means here

1. **One next step, always.** The top of Home is one big card: the single most important thing to do now, with one button. Examples: "Choose your committees", "Ask your parent to confirm", "Upload your position paper", and on the day "Vote now: Moderated caucus". If nothing needs doing, say so plainly ("You're all set. See you on day 1.").
2. **Five places, no more.** **Home · Committee · Session · Documents · Me.**
   - Desktop: a left rail with icons and labels, always visible.
   - Phone: a bottom tab bar with icons and labels, thumb-reachable, with safe-area padding.
   - The current place is obvious. Nothing is hidden behind a hamburger menu.
3. **Glanceable status.** The readiness checklist is a short vertical list. Each row has an icon, a label and one short line. One colour language is used everywhere:
   - UN blue = your turn
   - green = done
   - amber = waiting on someone else
   - grey = locked or not yet
   - red = only for a problem

   Don't rely on colour alone: every state also has an icon and a word.
4. **Big where it matters.** Your seat and committee look like a nameplate (the Merged/Placard look): the seat label large, the committee abbreviation and full name below. On conference day the vote buttons are huge (Yes / No / Abstain), full width on phones.
5. **Short words.** Every line is under about 12 words. There are no paragraphs and no jargon without a plain-language hint: "Position paper: your country's view on the topic, 1–2 pages".
6. **Every state is designed:**
   - **Loading:** skeletons, not spinners on blank pages.
   - **Empty:** "No notes yet".
   - **Locked:** "Opens on conference day".
   - **Error:** a plain sentence with a retry.
   - **Success:** a toast plus the item changing state.
7. **Phone first.** At 390×844 each screen's main content and action are visible without scrolling, with large tap targets (at least 44px). It also works at 820 and 1440, where desktop uses the space with two columns and not just stretched rows.

## Screens

- **Sign in:** email → 6-digit code (six separate boxes, paste works, auto-submit), then a resend after 30s. It explains in one line: "We'll email you a 6-digit code. No password needed."
- **Home:** the next-step card, the readiness checklist, the seat nameplate (or "Not allocated yet"), key dates (all "To be announced" for now) and the latest announcements.
  - Before applying: the Home card is "Apply to DXB MUN". The form has school (from the approved list, or "I'm applying individually"), MUN experience, why you want to join, then committee preferences.
- **Accepting the seat (added 2026-11-04):** once a seat is allocated, the next-step card is "Accept your seat: France, UNSC" with one button. The checklist has an **Accept seat** row after Allocation. The contract has `acceptSeat()` and `Registration.seatAcceptedAt`.
- **School invite (added 2026-11-04):** opening `#/invite/<token>` signs the delegate in if needed, then shows "Join <school>'s delegation?" with one button, calling `acceptInvite(token)`. The application form's school list stays only for individual applicants, who choose "I'm applying individually". A school's students join through their advisor's invite. In demo mode any token works and joins "Sample School A".
- **Committee:** the seat nameplate, the committee roster (`committeeRoster()`: seat and name only, with your row highlighted), the committee's full name, the chairs, the study guide button (or "Study guide coming soon"), the position paper card (upload PDF, its status, then the chair's mark and comment) and the preferences (editable while applying).
- **Session:** locked until the phase is live.
  - When live, the top shows the session number and your roll-call status.
  - **If a vote is open, it takes over the top with the big buttons.**
  - Then the speakers list (your position highlighted, "You're up next"), current and recent motions with results, and notes.
  - Notes: an inbox and sent list, "Write a note" to a delegate or to the chair, a 500-character limit, a status per note (waiting for chair, delivered, not approved) and reply.
- **Documents:** the committee's working papers, draft resolutions and amendments with number, status and sponsors, plus "Submit a working paper" (title + text). You can vote on a draft resolution when voting is open.
- **Me:**
  - name, grade, school and email;
  - the code of conduct (read and accept);
  - parent consent (parent name and email, then the status);
  - fees status (read-only: "Paid" or "Not paid yet, pay through your school or the secretariat");
  - the **check-in QR badge**, large, for the registration desk;
  - after the conference: the award, the certificate download and the feedback form;
  - sign out.

## Owner scope change (2026-11-04, latest): live, lean, fast

The owner's words: "no need certificates and all, finish fast", and "everything online".

- **Remove from the UI:**
  - the certificate download;
  - the award card;
  - the feedback form;
  - anything else that is only for after the conference.

  The `after` scenario can go too; the scenario menu becomes new, applied, allocated, ready, live. Leave the contract methods in place, unused, and don't render them.
- **The dashboard must work against the live database** (`src/platform/supabase.ts`, project `phzbbmkeuvjdzvqsnigh`, schema applied) as well as demo.
  - **Live mode** is the production build. Remove the scenario switcher and the "Sample data" marker there.
  - **Demo mode** stays for previews only.
- **Speed matters:** finish what's listed rather than polishing extras.

## Owner rule: build from the library, never from scratch (2026-11-04)

The owner's words: "Don't make anything from scratch, for example the login page. Always use the library." The library is the designeer catalogue in the `design-resources` skill (`C:\Users\praseen\.claude\skills\design-resources\by-category\ui-component-libraries.md`).

- **Primary kit: coss ui** (https://coss.com/ui). It is accessible and built on **Base UI**, which is already installed, with Tailwind. You add it by copying source in, with the shadcn CLI or by hand.
- **Fallbacks, in order:**
  1. **shadcn/ui** (https://ui.shadcn.com): its blocks, for example the login blocks, the sidebar block, `input-otp` and sonner toasts.
  2. **Base CN** (https://basecn.dev).
  3. **Animate UI** and **Motion Primitives**, for any motion.
- Every visible building block comes from one of these, then gets themed with our tokens: the sign-in form and OTP input, the app shell (sidebar and the mobile bottom tabs), cards, badges, the checklist/stepper, buttons, toasts, tabs, select, textarea, file upload, dialogs, skeletons and empty states.
- Hand-written CSS is allowed only for tokens, layout glue and the DXB MUN nameplate, which is our signature element.
- Keep `portal/LIBRARY.md` up to date: one row per component, with the library, the component name, its URL and its licence.
- If no library has a component, say so in that file and in your report, before writing one.

## IHS colours (2026-11-04)

These are the host school's colours, read from the official site ihsdubai.org (its Elementor global colours and the crest):

| Token | Value | Source |
|---|---|---|
| `--ihs-maroon` | `#600E0E` | the site's top bar and borders (`--e-global-color-c463773`) |
| `--ihs-maroon-2` | `#7A1A1A` | a lighter step for hover and borders. Derived, not from the site |
| `--ihs-gold` | `#FFB606` | the site's primary colour (`--e-global-color-primary`) |
| `--ihs-gold-2` | `#E6A303` | the site's secondary colour (`--e-global-color-secondary`) |
| `--ihs-cream` | `#DCBDAB` | the crest's cream (sampled from the site) |

**How to use them.** IHS is the *host*, and DXB MUN stays UN-themed, dark and serious. UN blue stays the only "action" colour: the primary buttons and "your turn".

- **Maroon** carries host branding:
  - a slim "Hosted by Indian High School" strip or mark in the shell;
  - the sign-in page's host panel or band;
  - the nameplate's bottom band;
  - section rules or dividers where a quiet second colour helps.
- **Gold** is used *sparingly* for honours: the award card, the certificate and the "Hosted by" mark detail. Never put gold on status chips.
- **The status "waiting" colour must not be confused with gold.** Keep "waiting" as amber `#F2B33D` with an hourglass icon *and* the word, and never put gold next to a waiting chip. If they still read as the same, shift "waiting" toward orange and say so.
- **Contrast:**
  - White on maroon is fine.
  - Gold text on navy is fine.
  - Never put gold text on maroon at body size; check it.
  - All text must stay at 4.5:1 or better.

## Look

- Use the Merged concept's system: the tokens are at the top of `concepts/merged/merged.css`. That means deep navy `#07111F`, UN blue `#009EDB` as the only accent, Barlow Condensed for display, Inter Tight for body, Geist Mono for data, and nameplates in `--plate` white.
- It's a calm working tool, not a landing page:
  - no scroll animations;
  - motion only for state changes, toasts and tab switches, under 250 ms;
  - respect reduced motion.
- Use Lucide icons with labels everywhere. Contrast must be at least 4.5:1, focus rings must be visible, and it must be fully usable by keyboard. Announce live updates (a new note, a vote opening) through `aria-live`.

## Done means

- `npx tsc --noEmit` passes, and `npx vite build` passes.
- Screenshots of every screen and scenario at 390 and 1440, read by you. Run `node scripts/portal-shots.mjs` (the UI agent writes it, based on `scripts/shots.mjs`).
- Each flow done once in the browser by script in demo mode, reporting what happened:
  - sign in;
  - apply, then choose preferences;
  - accept the code of conduct;
  - request consent;
  - upload a PDF;
  - send a note;
  - vote;
  - submit a working paper;
  - download a certificate.
- No horizontal scroll, no covered buttons and no text under 14px on phones.
