# DXB MUN 2027: dashboard plan (draft for the owner's OK)

The dashboard is built around **what happens while the MUN is running**.

**Removed:** fees, payment status, consent forms, code-of-conduct ticks, seat-acceptance steps, the to-do stepper, certificates, awards and feedback.

There are three dashboards that talk to each other live:

- **Delegate**: what one delegate needs in the room.
- **Chair (dais)**: runs the committee. It drives the timer, roll call, votes and resolutions that delegates see.
- **Secretariat**: sets up the conference and watches every committee.

---

## 1. Delegate dashboard

**Top bar (always visible)**
- Committee, country or portfolio, and room.
- **Live timer**: the current session's time left. While the delegate is speaking, it shows their speech time instead.
- The current agenda item, such as "Moderated caucus: water security, 1 min speeches".

**Pages (shown in the nav)**

| # | Page | What it does |
|---|------|--------------|
| 1 | **Now** | The current session, the timer, the next break, and the latest announcement. It's the page to look at during committee. |
| 2 | **Roll call and voting** | When the chair opens roll call, the delegate taps Present or Present and voting. When the chair opens a vote, they tap Yes, No or Abstain, then see the result. |
| 3 | **Speakers' list** | Add yourself or remove yourself. It shows your place in the queue. |
| 4 | **Position paper** | Upload a PDF or DOCX before the deadline. It shows the status (Not sent, Submitted, Late, Seen by chair) and a countdown to the deadline. |
| 5 | **Resolutions** | Start a working paper (write it, or upload a file). Add sponsors and signatories from your committee, then submit it to the chair. Track it as Received, Approved, Numbered (e.g. DR 1.1), then Passed or Failed. Submit amendments to a clause. |
| 6 | **Notes** | **Chits**: send a short note to another delegate or to the chair. The chair can read all chits, as in a real MUN. **My notes**: a private notepad that's quick to open in the middle of a session. Tag a note as a **POI** (a point of information to raise), a **Doubt** (to ask the chair) or a **Speech point**, tick it off once it's used, and filter by tag. |
| 7 | **Documents** | Background guide, rules of procedure, schedule and delegate handbook. A **+** button adds your own files (research, bloc drafts), which are private unless you share them with chosen delegates. |
| 8 | **Schedule** | Every day's sessions, with the current one highlighted. |
| 9 | **Announcements** | Notices from the secretariat and your chair. Urgent ones pop up. |

## 2. Chair (dais) dashboard

| # | Page | What it does |
|---|------|--------------|
| 1 | **Run session** | Start, pause and end the session. Set the current agenda item and the motion in progress (moderated or unmoderated caucus, speech length). |
| 2 | **Timer** | A speaker timer whose **speech time is editable**: type any length (e.g. 45s or 1:30) or tap a quick preset. It also sets the caucus length. Start, pause, reset, add time and yield. Delegates see the same timer live. |
| 3 | **Roll call** | Open roll call, see who has answered, and mark absences by hand. |
| 4 | **Speakers' list** | Reorder the list, call the next speaker (which starts the timer), and remove speakers. |
| 5 | **Voting** | Open a vote on a motion, draft resolution or amendment, close it, and show the result (a simple or two-thirds majority). |
| 6 | **Position papers** | See every delegate's paper (sent, late or missing), open it, and mark it Seen. |
| 7 | **Resolutions** | An inbox of working papers and amendments. Approve, number (DR 1.1), return with a comment, or put it to a vote. |
| 8 | **Notes** | Read and moderate the note passing, and reply to notes sent to the dais. |
| 9 | **Committee docs (+)** | Add the guide, the rules and any updates for your committee. |
| 10 | **Committee announcements** | Post a notice to your committee only. |
| 11 | **Awards rubric** | A private scoring sheet for each delegate, used to pick Best Delegate, High Commendation, Special Mention and Best Position Paper. The default criteria, which the chair can edit, are speeches, POIs, diplomacy, resolution work, knowledge of the agenda and the position paper. Each is scored 1–10, with a comment, as many times as needed during sessions. A ranking adds up the totals, and each chair (chair, vice chair, rapporteur) scores separately, then compares. Delegates never see this page. |

## 3. Secretariat dashboard

| # | Page | What it does |
|---|------|--------------|
| 1 | **Live overview** | Every committee at a glance: the current session, how many are present, whether a vote is open, and resolutions passed. |
| 2 | **Delegates and seats** | The delegate list. Give each delegate a committee and a country or portfolio. |
| 3 | **Committees and chairs** | Add committees and give each one its chairs. |
| 4 | **Schedule** | Set the days and the session times. Every timer and the Now page read from this. |
| 5 | **Deadlines** | The position paper deadline (and resolution cut-off, if used). |
| 6 | **Documents (+)** | Add conference-wide files: the handbook, rules of procedure, the schedule PDF and the venue map. |
| 7 | **Announcements** | Post to everyone, to delegates, to chairs, or to one committee, and mark it urgent. |
| 8 | **Check-in** | Scan a delegate's QR code or type their code at the desk. |
| 9 | **Team access** | Choose who is secretariat and who is a chair. |
| 10 | **Awards** | See each committee's final rubric ranking and lock the winners. |

---

## The flow

1. **Set-up (secretariat):** add committees and chairs, the schedule, the deadlines and the documents.
2. **Getting a seat:** the delegate signs in with their email. The secretariat gives them a committee and a country, and the dashboard then shows their seat. The open question is whether delegates register themselves first.
3. **Before the day:** the delegate reads the guides and uploads their position paper by the deadline. The chair sees it arrive.
4. **Conference day:** the delegate checks in at the desk (QR) and the dashboard switches to **live**.
   - The chair starts the session, and every delegate's timer starts.
   - The chair opens roll call, and delegates answer.
   - Speakers' list, then speeches with the live timer.
   - Working paper, then sponsors, then submitted to the chair, then numbered DR 1.1.
   - The chair opens the vote, delegates vote, and the result appears.
5. **After:** everything becomes read-only. Delegates can still open their papers, resolutions and notes.

**Unknown facts (dates, rooms, session times, deadlines)** show "To be announced" until the secretariat enters them.
