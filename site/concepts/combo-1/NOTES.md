# Combo 1 · Order + Dispatch

The owner said "i like the intro of alt 5" and "i like the home page of alt 6", then "combine those 2".

**Preview:** http://127.0.0.1:5320/concepts/combo-1/
- Calm version: `?still` (also used for reduced motion).
- No WebGL2: a CSS dither hero.

**Screenshots:** `site/shots/r3/combo-1/`, made by `node scripts/heavy.mjs "node concepts/combo-1/shots.mjs"`.
- `ONLY=1440 | 390 | still | nogl | widths` runs one part.

**Deploy:** this is its own Vercel app, served at `/`.
- `links.ts` uses `VITE_DEPLOY=1` for the portal, admin and chair links.
- Nothing in this folder has been deployed or committed.

## What the page does
1. **Opening:** Alt 5's ORDER, ORDER loader, exactly as it was.
   - It keeps its own black #000, off-white, orange #FF4D00 and Martian Mono corners.
   - Key, wheel or tap skips it.
   - A hash deep link (`#schedule` etc.) skips it.
2. **Hard cut** into Alt 6's hero, with no fade.
   - The dither field was already drawn underneath, held on one frame.
   - On the cut it starts moving, the lens opens in six hard steps, and the CABLE 00 rows print.
3. **Hero (Alt 6):**
   - The 1-bit Bayer dither noise field in two colours.
   - The cursor/finger lens shows "DIPLOMACY AROUND US" and the Dubai coordinates.
   - The CABLE 00 box (dates redacted, "To be announced"), with the LENS readout.
   - "DXB MUN / 2027", and the Register / The cables ↓ buttons.
4. **Below:** Alt 5's calmed motions 01–07.
   - One ink ground, with hairlines between motions.
   - Left-aligned titles at clamp(48px, 7vw, 104px).
   - The half-height committee marquee, normal day tabs and wellness toggles.
   - The vote-tally bar docked at the bottom.

## Decisions
- **Palette (Alt 6):**
  - Ink #0B0B0A as the one ground.
  - Paper #E9E4D8 for text and the dither light.
  - Signal #E8461E as an accent only: active nav and tab, the Register card, the stats numbers, the committee code, tally fills.
  - IHS maroon #600E0E for the host mark, with the IHS cream #DCBDAB only as that mark's text.
  - The derived greys are opaque: #8E8A80 for secondary text and #3A3833 for hairlines.
  - No alpha, blur or glow.
- **Type:**
  - **Anybody** for every title, including the hero "DXB MUN 2027". The loader ends on the wordmark in Anybody, so the cut lands on the same face. The lens motto is drawn in Anybody condensed too.
  - **Courier Prime** (Alt 6's typewriter mono) for every label, so the CABLE 00 box and the motion rules read as one system.
  - Martian Mono is used only in the loader's corners, to keep it unchanged.
  - Alt 6's Sofia Sans Extra Condensed is dropped.
- **Hero title swell (optional item, kept):** the kinetic engine fits each title line to its column.
  - The line under the pointer swells gently: cursor 0.6, hover-only, no speed ripple, no breathing.
  - Each line sits on a solid ink block, so it never mixes with the dither.
  - The lens keeps following the pointer behind the title. The two don't fight, because the swell only changes width while the lens only shows the layer underneath.
- **Redaction bars (optional item, sparing):** used only where a date or venue is unknown.
  - They appear in the hero DATES row and in About's Dates and Venue clauses.
  - Every other unknown is plain "To be announced".
- **Margins:** Alt 6's margin, clamp(24px, 5vw, 72px), for the nav, hero boxes, motions and tally, so everything shares one left edge.
  - Phones use 16px.
  - Nav links show from 1280px; below that, Register and a Menu button.
- **Vocabulary:** the hero keeps Alt 6's "CABLE 00" and "The cables ↓" as asked; the sections and nav say "Motion".
  - This is easy to unify later if the owner wants one word.
- **Not brought back:** cream section grounds, stepped transitions, colour wipes, Alt 6's paper strip and its teleprinter opening.

## Modes
- **`?still` or reduced motion:**
  - No loader.
  - One still frame of the field, with the lens parked over the motto.
  - Titles are fitted once, the marquee wraps as a static list, and the tally numbers don't roll.
- **No WebGL2:** a CSS Bayer tile ground, the motto as a paper block with the coordinates, and the same boxes and title.
- **Pausing:** the field pauses when the hero is off-screen or the tab is hidden.

## Facts
Every fact comes from `src/data/conference.ts`. Dates, venue, email, Instagram and agendas are null there, so they read "To be announced". The Dubai coordinates are geography, as on the other builds.
