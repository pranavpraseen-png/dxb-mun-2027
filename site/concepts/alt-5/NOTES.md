# Alt 5 · Motion: notes and decisions

> **Revision 2026-11-06 (owner feedback: the intro is liked, below it is "too much").** The loader and the hero are
> unchanged. Below the hero the page is calmed:
> - **Grounds and colour:** every section is now on the hero's black. Orange is an accent only: section numbers, the
>   active day and committee, and the Register card. The Sign in card is black with a 1px off-white border.
> - **Transitions:** the stairs and the colour-block wipe are removed. Sections are split by one hairline and
>   generous space, and nav clicks scroll with Lenis.
> - **Titles:** set at `clamp(48px, 7vw, 104px)`, left-aligned at normal width, not fitted to the edges.
> - **Kinetic response below the hero:** no scroll-speed ripple; a gentle cursor stretch (0.45) only on the line
>   under the pointer (`hoverOnly`).
> - **Stats, day tabs and wellness:** set calmly in Anybody 600 at normal width. Numbers are orange, and the day
>   tabs and wellness items are normal controls with the active one orange.
> - **Committees:** the marquee is about half the height and slower, with no squeeze. The detail code is about 60 %
>   of its old size.
> - **Tally:** unchanged.
>
> Parts of the text below that describe the stairs, the wipe and the per-section grounds are history.

Page: http://127.0.0.1:5320/concepts/alt-5/ · calm version: `?still` (also used for `prefers-reduced-motion`).
Screenshots: `site/shots/r3/alt-5/`, made by `node scripts/heavy.mjs "node concepts/alt-5/shots.mjs"` from `site/`.

**The idea in one line:** the whole homepage is a debate in progress, told only in type. Every section is a motion on
the floor (Motion 01 About … Motion 07 Contact), the headlines are one variable family that stretches and squeezes
with your scroll speed and your cursor, a vote tally docked at the bottom of the screen is the scroll indicator, and
hard colour blocks wipe between the motions.

## How it differs from what exists
- **Night Lab** (warm black, globe, typed loader), **Alt 1** (paper, ink, one blue), **Alt 2** (cream poster, one fitted
  word, Archivo 125 %, wireframe globe), **Alt 3** (one 3D camera).
- Here there is **no globe, no 3D, no photo, no line drawing**. The only "image" is type.
- Alt 2's word is fitted once and then sits still; here every big line is re-solved every frame: its width stays
  locked to the column while each letter's width and weight move.
- New loader (gavel strikes, not a counter or typing), new palette (pure black, off-white, signal orange), new
  families (Anybody + Martian Mono, used nowhere else), new scroll indicator (the vote board), new section
  transitions (colour blocks).

## References and the exact technique borrowed
| Reference | Technique taken (code is my own) | Where |
|---|---|---|
| **Mat Voyce** (kinetic typography portfolio, Awwwards SOTD; in `award-winning-sites.md`) | Letters on a variable font whose **width and weight follow the cursor**: the letter nearest the pointer swells (wider, heavier) and the rest of the line squeezes so the line keeps its length. A **velocity wave**: fast scrolling ripples the width axis along the line and drops the weight; at rest it settles. | `kinetic.ts` engine, every big line |
| **WEIMA** (colour-block page transitions; in `award-winning-sites.md`) | **Opaque full-screen colour blocks** sweep across in sequence, the page changes underneath while it is covered, then the blocks sweep off. Used for every nav jump. On scroll, the same idea is scrubbed: each motion's colour rises over the last one in **stepped hard-edged columns**. | `Wipe.tsx`, `Stairs` in `Sections.tsx` |
| **Lando Norris** (`dissect/lando-norris.md`) | **Modular sections**, each with its own ground colour (the ground switches dark → light → accent as you go); **heavy-vs-tiny contrast** (giant caps vs 10–12 px labels); a **cursor-reactive hero**; on the phone a hand gesture instead of a cursor (here: drag your finger across the type); a full-screen solid menu with huge caps items. | hero, section grounds, phone menu |
| **Outfit** (`dissect/outfit-hellohello.md`) | The loader is black with a cream wordmark that **builds**, then a **hard cut** (not a fade) to the hero. | `Loader.tsx` |
| **Anime.js** (`dissect/anime-js.md`) | A docked **progress instrument** that is always visible; here it is the vote board. | `Tally.tsx` |

Avoided, per `NOT-LIKED-COMMON.md`:
- **No pale or low-contrast first screen.** It is pure black with full-width off-white and orange type.
- **No light display weight.** Display runs 600–900; thin weights appear only as the moving squeeze, never at rest.
- **No blur, dissolve, glow, alpha or gradient.** Every block is opaque and hard-edged; text never fades.
  It appears by being **stretched into place** (the width axis opens from 50 to its fitted value).
- **The loader is a performance, not a wait.**

## Palette (tokens in `alt5.css`)
| Token | Hex | Use |
|---|---|---|
| `--ink` | `#000000` | hero, Committees, Register and Resources grounds; text on light |
| `--paper` | `#F2EFE8` | About and Wellness grounds; text on dark |
| `--signal` | `#FF4D00` | the one action colour: Register, the active nav item, "2027", FOR votes, the Schedule ground |
| `--host` | `#600E0E` | IHS maroon: the host mark, the Contact ground, ABSTAIN votes |
| `--cream` | `#DCBDAB` | IHS cream: only on the maroon Contact ground (host text) |
| `--grey` | `#8A867E` | one opaque neutral for secondary mono labels on black (6.1:1 on #000) |

- **Gold #FFB606 is not used.** The page has no honours to mark.
- Contrast: paper on ink 18.9:1; ink on signal 6.6:1; paper on host 11.6:1; cream on host 7.4:1.

## Type
- **Anybody Variable** (`@fontsource-variable/anybody`, OFL), checked in its Fontsource metadata: **wdth 50–150, wght
  100–900** (plus ital). It is the only display and text face.
- **Martian Mono Variable** (`@fontsource-variable/martian-mono`, OFL): wdth 75–112.5, wght 100–800. Used for every
  label and time, set at wdth 87.5.
- Both are new installs. Neither is used by another build.
- **Digits:** plain zeros in both families (checked in the screenshots: "2027", "M00", "12:30 PM", the tally).

## The kinetic engine (`kinetic.ts`)
- **Measure once:** after the fonts load, every character is measured at 5 widths × 3 weights (one batched layout).
- **Solve every frame:** for each line on screen:
  - Each letter gets a target width offset and weight from the cursor distance, the scroll speed wave, a slow idle
    breath (hero only, so phones move too) and its segment's emphasis (tabs and toggles).
  - A bisection then finds the base width that makes the whole line exactly fill its column at its font size.
  - If the width axis runs out, the font size gives way instead.
- **Self-correcting:** at the start of each frame the real width is read back (layout is clean then, so there is no
  thrash) and a per-line correction factor absorbs any measuring error.
- Only lines in view are solved, and nothing is written when values have settled.
- **Segments:** a line can hold buttons (the day tabs, the wellness toggles). The active one is wide and heavy, the
  rest are squeezed and light, and the line still fills the column.

## Sections (each a "motion on the floor")
| # | Motion | Ground | Content |
|---|---|---|---|
| 00 | **The floor is open** (hero) | ink | "DXB MUN" fitted full width; "2027" in signal beside the key facts; "DIPLOMACY AROUND US" fitted; Register |
| 01 | **About** | paper | Hosted by / Guided by / Convenes / Meets for / In / Dates / Venue, as numbered clauses; 19 · 3 · 6 as kinetic numerals |
| 02 | **Committees** | ink | A marquee of the 19 codes; its speed and direction follow your scroll and its letters squeeze when you scroll fast. Hover, focus, tap or step through: the marquee stops, that code stretches to wdth 150 in signal, and the focus line below stretches it in from 22 % to its full column (left 63 % of the width), with the number, full name and "Agenda: To be announced" beside it. 01–19 picker and ← → |
| 03 | **Schedule** | signal | "DAY 1 DAY 2 DAY 3" as one kinetic line of tabs; each slot as time / name / duration |
| 04 | **Register** | ink | "TAKE THE FLOOR"; Register and Sign in (to the delegate dashboard); dates and venue TBA |
| 05 | **Wellness** | paper | "WATER STRETCH BREATHE" as one kinetic line of toggles (saved per device per day, the shared hook) |
| 06 | **Resources** | ink | Rules of procedure: "To be announced" |
| 07 | **Contact** | host | Email and Instagram "To be announced"; host; the giant "DXB MUN 2027" footer in cream |

- **The vote board** (`Tally.tsx`, NumberFlow) docks at the bottom of the screen.
  - It shows the motion on the floor, 7 cells (one per motion, each filling as you read it, and clickable), and
    FOR / AGAINST / ABSTAIN with a result word.
  - FOR = % of the floor read; AGAINST = % still ahead; ABSTAIN = motions you jumped past without stopping (via the
    nav), so the board tells the truth about your visit.
  - The result reads IN DEBATE, then CARRIED, then ADOPTED at the end.
  - Plain digits in Anybody (no slashed zeros).
- **Loader, "the gavel count"** (about 2.6 s; any key, tap or wheel skips; skipped when a hash is in the URL):
  1. Strike 1: "ORDER," slams in wide and black-heavy.
  2. Strike 2: "ORDER, ORDER" fills the width; the first word squeezes to make room.
  3. The line compresses (width 50, weight light).
  4. Strike 3: while still thin, the 12 letters hard-swap left to right into "DXB MUN 2027" (also 12 characters).
  5. The wordmark stretches back to full width and full weight. A hard cut then reveals the hero, whose lines
     stretch in from about half their width.
  - On phones the line is two rows: "ORDER," / "ORDER" becomes "DXB MUN" / "2027".
  - A mono gavel counter (1 / 3, 2 / 3, 3 / 3) and the session line sit in the corners.
  - Each strike jolts the line and turns it signal orange for a moment. There is no full-screen flash, for
    photosensitivity.
- **Nav:**
  - Solid black, 56 px. Logo and IHS host mark on the left; M01–M07 with names; the active one is a solid signal
    block; Register on the right.
  - A click runs the colour-block wipe, which shows the target's "MOTION 0N" while it covers.
  - **Phone:** Register plus Menu. The full-screen black menu has 7 huge kinetic items that stretch in.
- **Calm version** (`?still` or reduced motion): no loader, no marquee motion, no wipes, no velocity or cursor
  response. Every line is still fitted once, the committee list is a wrapped grid of 19 buttons, and nav jumps are
  instant.

## Decisions made without the owner
1. **Hero facts:** only Dubai, Indian High School, the motto, 19 committees, 3 days; dates and venue are "To be
   announced".
2. **Register and Sign in** go to `portal + '#/now'` (copied `links.ts`, as Alt 3). The data's `registerUrl` is
   null, so no other URL is used.
3. **The Timer is not ported** (not in the brief's section list), as in Alt 2 and Alt 3.
4. **Agenda lines:** the data has none, so every committee reads "Agenda: To be announced".
5. **The loader plays on every load** (it is 2.6 s and skippable), so the owner sees it each time he opens the preview.
6. **The committee focus line is not literally edge to edge.** A 2-letter code (AU, EU) at full width would need a
   ~700 px font size. So the code fills the left 63 % of the width, capped at 27 % of the screen height, and the
   meta sits in the right column. Long codes fill their column; short ones stop at the cap.
7. **The stairs only cover empty space.** Each motion ends with 19 vh of empty padding, and the next motion's
   columns are 17 vh tall, so they never cover text. An earlier version with 26 vh columns covered the last clauses
   mid-read, and was changed.

## What is untested or weak
- **Tested only in headless Chrome** (`shots.mjs`, 1440×900 and 390×844, DPR 1). Not tested in Safari, Firefox, on a
  real phone, or with a real trackpad. The frame rate on a real machine was not measured. The engine re-shapes up to
  ~100 letter spans per frame while you scroll; that is the main performance risk.
- **The cursor response** was checked with puppeteer mouse moves. **The touch-drag response** was not checked.
- **`prefers-reduced-motion`** itself was not emulated. The calm page was checked through `?still`, which uses the
  same `isStill()`.
- **Kerning:** per-letter spans turn kerning off, so pairs like "AV" and "TA" sit a little loose at display sizes.
