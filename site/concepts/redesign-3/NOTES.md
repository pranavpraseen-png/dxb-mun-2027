# Redesign 3: "On Air" (`redesign-3`)

**Idea in one line:** the homepage is a serious world-news broadcast control room covering the conference: a countdown slate goes live, a program monitor carries the lower-third, a tracking map locks onto Dubai, and the committees run as a multiview wall.

## References looked at, and the exact technique taken from each
I fetched landonorris.com, weima.com and terminal-industries.com, plus the Awwwards pages for Opal Tadpole, TitanGate Equity and Iventions (those pages only list tags and scores, so their notes in `award-winning-sites.md` were used too). I borrowed techniques only: no layouts, copy or brand assets.

| Reference | Sector | Technique borrowed | Where it lives here |
|---|---|---|---|
| Lando Norris (Site of the Year 2025) | sport / personality | A cursor-reactive hero overlay: the program-monitor photo parallaxes under the pointer, and a camera "framing box" with X/Y readouts trails the cursor. Plus the modular "On Track / Off Track" idea: the page is a set of numbered channel modules (CH 01–07) instead of a long story. | `ColdOpen.tsx` (PGM monitor), `Bar.tsx` (channel numbering) |
| Terminal Industries (Site of the Month, Sept 2025) | B2B logistics | Instrument-like data micro-motion: numbered markers (01–07), digit readouts that roll (NumberFlow and the Magic UI ticker), hairline grids that draw in, and a running timecode. | readouts in the hero, the tracker HUD, the multiview tile counters, the rundown row numbers |
| WEIMA | industrial | Colour-block page transitions. A click on any nav channel drops four colour columns (maroon, terracotta, surface, cream) over the screen. The jump happens behind them, then they lift off. Each section slate also keys on with a colour block that sweeps across the title. | `Wipe.tsx`, `Slate.tsx` |
| Opal Tadpole (E-commerce Site of the Year 2024) | product | A scroll-pinned explainer in plain words ("explain it like I'm five"). One question per step (Where? Who hosts? Why? How big? How long? When?), and the answer is a single clause from the existing facts. Show, don't tell: the globe does the "where". | `Tracker.tsx` |
| TitanGate Equity (Site of the Day, Dec 2025) | finance | A serious, trustworthy grid: one bordered grid of equal modules with hairline rules, mono labels and no cards floating on gradients. | `Desk.tsx` (timer, wellness, resources), the rundown table |
| Iventions (CSSDA Website of the Month) | events | An events structure driven by GSAP with a Three.js scene: a menu that acts as the page transition, and a numbered events (rundown) list. | the Three.js tracking globe (`TrackerGlobe.ts`), the rundown schedule |

## Page structure (new, not Merged's)
1. **Control bar (nav):** a maroon "ON AIR" tally block and the wordmark on the left. In the middle, the numbered channels CH 01–07 (About, Committees, Schedule, Timer, Wellness, Resources, Contact), with a UN-blue underline that slides between them. On the right, the Dubai clock and Sign in. Below 1100px the channels move into a coss Sheet ("Rundown"). Every channel click runs the WEIMA wipe.
2. **CH 00 Cold open (`#home`):** a 3-second standby slate. A countdown ring, a NumberFlow 3-2-1 and corner slate metadata (programme, source, date "To be announced", running timecode) lead to the "going live" cut: the colour blocks split, the tally lights up, and the control room appears.
   - **Desktop:** a large PGM monitor (the photo, cursor-reactive) carries the lower-third h1 "DXB MUN 2027". Beside it are three PVW monitors: a tracking readout, a data readout (19 / 3 / 6) and the call to action.
   - A ticker (Magic UI Marquee) runs along the bottom.
3. **CH 01 Tracking (`#about`):** pinned. The Three.js globe searches, then locks onto Dubai with a coordinate HUD (lat/lon readouts, range, lock status, a reticle). Six plain-words steps each key on one clause as a headline card, using Animate UI RollingText flip letters. A rundown of all six clauses sits beside it, so the big text alone tells the story.
4. **CH 02 Multiview (`#committees`):** a sticky PGM monitor shows the selected committee's nameplate, with its full name as a lower-third (React Bits DecryptedText, the one scramble on the page). Beside it is a wall of 19 channel tiles, each a small UN placard ("CH 01 · IPMC"), plus one status tile. The tiles "power on" in a stagger when the wall scrolls in.
5. **CH 03 Rundown (`#schedule`):** a TV run sheet with day tabs (Cult UI DirectionAwareTabs, made square). The columns are #, time, item and duration, with a kind colour bar: session in terracotta, ceremony in sand, logistics in cream, breaks muted.
6. **CH 04–06 Desk (`#timer`, `#wellness`, `#resources`):** one TitanGate-style bordered grid of three modules: a working mini floor timer (full screen at `#/timer`), Quick reset (coss Checkbox), and Resources with Register / Sign in.
7. **CH 07 Sign-off (`#contact`):** a full maroon IHS colour block with the contact roll (everything "To be announced") and the host line, then a slim footer.

## Colour and type (Dubai Dusk + Official Record, the owner's pick of 2026-11-05; spec in site/THEME.md)
- **Tokens** are defined once as CSS custom properties at the top of `onair.css`, with a numeric copy in `theme.ts` for the three.js globe. Every token is opaque; there is no alpha anywhere.
- **Ground** sea-blue `ground` / `surface` / `raised`, 1px `line` hairlines, `ink` and `muted` text.
- **Sand** (`action`) is the one action colour: buttons, links, nameplate faces. Hover goes sand to cream.
- **Terracotta** (`accent`): clause verbs, rules, focus, the bar underline and progress, the "on air" PGM tag, the timer's "Time is up" (it replaces the old broadcast red and UN blue).
- **IHS maroon** (`maroon`): colour blocks (tally, wipes, slate key-on, nameplate band, sign-off band). **Cream**: host text on maroon. **Gold**: only the small host rule (host line, rundown sheet, the host card's edge, one slate strip).
- **Type:** Source Serif 4 600 (-0.02em, optical sizing) for display and headlines, its italic for the clause verbs and the motto; Public Sans for text, nav and buttons; IBM Plex Mono 400/500 for timecodes, committee codes and data labels. Sizes are fluid between whole pixels at 390 and 1440.
- **Clarity:** no blur, glow, noise, soft shadow or backdrop-filter; the control bar is opaque `surface` with a 1px `line` border; the globe renders at min(devicePixelRatio, 2) on every device; the hero photo is capped to about 960 CSS px wide.

## Facts
Every fact comes from `src/data/conference.ts`. Dates and venue say "To be announced". The Dubai coordinates are geography (the same constants Merged uses). The timecode and the "range" readout are instrument decoration, not claims.
