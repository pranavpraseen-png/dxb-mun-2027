# DXB MUN 2027

The website and conference-day dashboards for **DXB MUN 2027**, a Model United Nations conference in Dubai hosted by **Indian High School**, plus every design option made along the way.

## Live
| Link | What it is |
|---|---|
| https://dxbmun-2027.vercel.app | **The official site:** Combo 2 (Night Lab with Alt 6's dither and Alt 5's kinetic title), opened by Combo 1's "ORDER, ORDER" loader |
| https://dxbmun-2027.vercel.app/portal/ | Delegate dashboard |
| https://dxbmun-2027.vercel.app/chair/ | Chair (dais) dashboard |
| https://dxbmun-2027.vercel.app/admin/ | Secretariat dashboard |
| https://dxbmun-2027-alt1.vercel.app | Design preview **Combo 1**: Alt 5's "ORDER, ORDER" intro into Alt 6's dithered home |
| https://dxbmun-2027-alt2.vercel.app | Design preview **Combo 2**: Night Lab mixed with Alt 5 and Alt 6 |

The live dashboards use the real database and email sign-in. The preview apps are design options only.

## Run it on your computer
1. Install **Node.js 22 LTS or newer** from https://nodejs.org (once per computer).
2. Get the code: **Code → Download ZIP** and unzip it, or
   ```bash
   git clone https://github.com/pranavpraseen-png/dxb-mun-2027.git
   ```
3. Open a terminal in the folder and run:
   ```bash
   npm start
   ```
   The first run installs packages (a few minutes). Then your browser opens the **design picker**, with every design in the left-hand list. Press **Ctrl+C** to stop.

Shortcuts you can double-click instead: `START-WINDOWS.bat` (Windows) and `start-mac.command` (Mac; the first time, right-click → Open).

**Dashboards on your computer** run in demo mode with sample data. Sign in with any email and the code **123456**. An email containing "chair" opens the chair view; one containing "admin" opens the secretariat view.

## The designs
| Design | Folder | In one line |
|---|---|---|
| **Combo 2 + ORDER loader** ★ live | `site/concepts/combo-2` (`?loader=order`) | Night Lab drawn in 1-bit dither, cursor lens, kinetic title, opened by Combo 1's loader |
| **Alt 4 · The Floor** (new) | `site/concepts/alt-4` | Hold to take the floor: drone, heartbeat, gavel, shockwave, the floor rises into DXB MUN. Every part in A/B/C |
| Alt 4 board | `site/concepts/alt-4-board` | Pick A, B or C for each part of Alt 4 and open the combination |
| Night Lab | `site/concepts/night-lab` | Warm near-black, typed loader, wireframe globe, flight into Dubai, nameplate wall |
| Combo 1 | `site/concepts/combo-1` | Alt 5 intro + Alt 6 home, calm sections in ink, paper and red-orange |
| Combo 2 | `site/concepts/combo-2` | Night Lab drawn in 1-bit dither, cursor lens, kinetic title |
| Alt 1 · Terminal Paper | `site/concepts/alt-1` | Light paper, deep ink, one blue |
| Alt 2 · Poster | `site/concepts/alt-2` | Cream, black, IHS maroon, huge type |
| Alt 3 · One Stage | `site/concepts/alt-3` | One 3D camera moving through six scenes |
| Old Alt 4 · Assembly | `site/concepts/alt-4-assembly` | Real-time 3D General Assembly hall of 193 seats |
| Alt 5 · Motion | `site/concepts/alt-5` | "ORDER, ORDER" loader, kinetic variable type, vote tally |
| Alt 6 · Dispatch | `site/concepts/alt-6` | 1-bit dithered field, cursor reveal lens, facts as cables |

Earlier concepts, restyles and the colour, font and motion boards are in `site/concepts/` too, and all of them are listed in the picker. Each design folder has a `NOTES.md` (the idea and the references it borrows from) and a `LIBRARY.md` (where each component comes from).

## Where things are
- `site/`: the app (React 19, Vite, TypeScript, Tailwind, GSAP, Lenis, three.js).
  - `site/picker/`: the design picker.
  - `site/concepts/<name>/`: one folder per homepage design.
  - `site/portal/`, `site/chair/` and `site/admin/`: the three dashboards.
  - `site/src/data/conference.ts`: every fact the sites show. Unknown details read "To be announced".
  - `site/supabase/`: the database schema and migrations.
- `site/BLUEPRINT.md`: the homepage structure behind Night Lab. `site/ALTS-R3.md` is the brief for Alts 5–6, and `site/ALT4-FLOOR.md` is the brief for the new Alt 4.
- `site/concepts/refs/dissect/`: written breakdowns of the award-winning reference sites. Screenshots of those sites are kept off GitHub, because they are other people's work. That means the reference board shows no images in a fresh copy.

## Deploying
From `site/`:
```bash
node scripts/deploy.mjs
```
This builds and deploys the official site (Combo 2 with the ORDER, ORDER loader) to dxbmun-2027.vercel.app.

The preview apps use `VERCEL_PROJECT` and `HOME_CONCEPT`, for example:
```bash
VERCEL_PROJECT=dxbmun-2027-alt1 HOME_CONCEPT=combo-1 node scripts/deploy.mjs
```
The script refuses to put anything other than the owner's current pick (`LIVE` in `scripts/deploy.mjs`) on the official project.

## Notes
- **Supabase key:** `site/.env.live` holds only the public Supabase URL and publishable browser key. Row Level Security in the database decides what each user can do. Never commit a secret or service-role key.
- **Licence:** some dashboard components come from [coss ui](https://coss.com/ui), which is AGPL-3.0.
