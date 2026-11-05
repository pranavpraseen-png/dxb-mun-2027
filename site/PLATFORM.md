# DXB MUN platform: logins, database and the conference process

This document is the plan for turning the portals from sample data into a real system. It is built from the owner's answers on 2026-11-04. The design stays whichever concept the owner picks (Merged for now). This document is about what the system does.

## Decisions so far

| Topic | Decision |
|---|---|
| Who signs up | **Both**: schools register a delegation through a faculty advisor, and students can also apply individually |
| Allocation | Delegates rank preferences, then the **secretariat allocates** seats in the admin dashboard |
| Logins | Delegates, Chairs (Executive Board), Faculty advisors, Secretariat |
| Sign-in | **Email + 6-digit one-time code**, with no passwords |
| Admin levels | **Two**: core team (everything) and staff (only their area, such as the registration desk or a group of committees) |
| Special committees | Every committee has **seats, and each seat is a role** (France, Minister of Finance, Reuters journalist, Judge). Crisis directives, press articles and ICJ filings come later |
| Double delegations | Undecided, so a seat can hold **1 or 2 delegates** |
| Fees | Paid **offline**; the secretariat ticks "paid" |
| Before the conference | Position papers, study guides, parent consent and code of conduct |
| During | Notes (chits), roll call and speakers list, motions and voting, working papers, resolutions and amendments |
| After | Awards, certificates and a feedback survey |
| Backend | **Supabase**: Postgres, Auth with email OTP, Row Level Security, Realtime and Storage |

## The conference, end to end

| # | Stage | Who | What happens on the site |
|---|---|---|---|
| 1 | Setup | Secretariat | Create the 19 committees and their seats, assign chairs, upload study guides, set deadlines (registration, allocation, position papers) |
| 2 | Registration opens | Advisors and students | An **advisor** registers the school, the secretariat approves it, and the advisor invites students by email. An **individual** student applies (name, school, grade, MUN experience) and the secretariat approves |
| 3 | Preferences | Delegates (or their advisor) | Rank 3 committees, optionally with preferred seats, and add a short "why" |
| 4 | Allocation | Secretariat | An allocation board shows every committee with open and filled seats beside the applicants' preferences. Assigning a seat notifies the delegate and their advisor |
| 5 | Confirmation | Delegate, parent, secretariat | The delegate accepts the seat and the code of conduct. A **parent confirms consent** through an emailed link. The secretariat marks fees paid (per school or per individual) |
| 6 | Preparation | Delegates, chairs | The study guide appears in the delegate's dashboard. The delegate uploads a **position paper** by the deadline, and chairs read and mark it (score + comment) |
| 7 | Arrival | Registration desk (staff) | Each delegate has a **QR code** in their dashboard, and the desk scans it to check them in on each day |
| 8 | Committee sessions 1–6 | Chairs, delegates | **Roll call** (present / present and voting). **Speakers list** live on screen. **Motions** (moderated or unmoderated caucus and so on) and **votes** from phones. **Notes** through the chair. **Working papers → draft resolutions → amendments**, with the chair numbering them (DR 1.1). **Voting procedure** with results live. Chairs **score** each delegate each session |
| 9 | Closing | Secretariat | Chairs nominate awards from their scores, the core team finalises them, and the awards are published at the closing ceremony |
| 10 | After | Everyone | Delegates download a **certificate** PDF (participation or award) and fill in the **feedback** survey (committee and chair). Advisors see their school's results |

## Roles and what each one sees

| Role | Dashboard |
|---|---|
| **Delegate** | Status checklist (applied → allocated → consent → paid → position paper), seat and committee, study guide, position paper upload, QR check-in badge. During sessions: notes, speakers list, motions and votes, documents. Afterwards: certificate and feedback |
| **Chair** | Their committee only. Roster and roll call, speakers list control, motions and voting, note approval queue, documents queue (approve and number), position paper marking, session scoring, award nominations |
| **Faculty advisor** | Their school only. Add and invite students, see each student's progress and allocation, preferences on their behalf, paid status, results and certificates |
| **Secretariat: core** | Everything. Approve schools and applicants, allocation board, committees, seats and chairs, deadlines, fees, announcements, awards, exports (CSV), audit log |
| **Secretariat: staff** | Only their area. For example the registration desk (check-in scanner, paid ticks) or a committee group (those committees' chairs and documents) |

## Data model (Postgres)

- **People:** `profiles` (one per login: name, email, role, admin level), `schools` (name, status, advisor, paid), `staff_areas` (which staff member can see which area).
- **Structure:** `committees` (abbr, name, kind: general / crisis / press / court / cabinet / regional), `seats` (committee, label, kind, capacity 1 or 2), `committee_staff` (chair, vice chair).
- **Registration:** `registrations` (person, school or individual, status, paid, code-of-conduct time), `preferences` (ranked), `assignments` (seat ↔ registration; two rows allowed when capacity is 2), `consents` (parent name and email, confirmed time).
- **Preparation:** `position_papers` (file, submitted time, chair mark and comment), with study guides as files on `committees`.
- **Conference:** `checkins`, `sessions` (committee, 1–6, status), `roll_calls`, `speakers` (ordered list, general or moderated), `motions`, `votes` (one per seat per motion or document), `documents` (working paper, draft resolution or amendment; number; sponsors; signatories; status), `notes` (from seat, to seat or to chair, status), `scores` (per session, per seat).
- **After:** `awards`, `feedback`. Certificates are generated on demand from `assignments` plus `awards`, so nothing needs to be stored.
- **Running the site:** `announcements`, `deadlines`, `audit_log`.

**Access rules (Row Level Security)** are enforced by the database, not the page:
- a delegate reads only their own records and their committee's public data;
- a chair reads and writes only their committee;
- an advisor reads only their school;
- staff see only their area, and the core team sees everything.

Votes and notes are checked server-side, so nobody can vote twice or for another seat.

**Live updates (Realtime):** the speakers list, motions and vote tallies, the notes queue and roll call update on every screen without refreshing.

## Safety, since most delegates are minors

- Collect the minimum: name, school, grade, email. No phone numbers, addresses or photos of students. A parent's email is used only for consent.
- No public lists of delegates. Allocations are visible only inside the logged-in committee.
- Every chair and admin action goes into `audit_log`, so approved notes and changed scores are traceable.
- Notes always pass through the chair, never directly between delegates (this keeps the rule from the mock portals).

## Things to settle before launch

- **Email sending:** Supabase's built-in email is meant for testing and allows only a handful of sign-in emails per hour. With thousands of students, sign-in codes need a proper sender (for example Resend or Postmark) on a DXB MUN or IHS domain. This belongs to the security and traffic phase.
- **Double delegations:** decide which committees, if any. The data model already allows them.
- **Position paper rules:** deadline, file type (PDF), size limit, and whether late submissions are allowed.
- **Deadlines and dates:** these come from the owner, along with venue, contact, Instagram and logo.

## Build order

1. Create the Supabase project (free tier, Mumbai region `ap-south-1`, the closest to Dubai), then the schema, access rules and seed data: the 19 committees from `conference.ts` plus sample seats.
2. Sign-in with email codes, plus a role-aware dashboard shell.
3. Registration (advisor and individual), preferences, the allocation board, consent, and fees ticks.
4. Preparation: study guides and position papers with chair marking.
5. Committee tools: roll call, speakers list, motions and votes, notes, documents, scoring, all live.
6. Check-in QR, awards, certificates and feedback.
7. Security and traffic hardening: rate limits, email sender, load test, backups.
