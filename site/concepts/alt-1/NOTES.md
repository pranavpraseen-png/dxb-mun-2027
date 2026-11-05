# Alt 1 · Terminal Paper: notes

Page: http://127.0.0.1:5320/concepts/alt-1/ (add `?still` for the calm static version). Picker id `alt-1`.

**The idea in one line:** the approved BLUEPRINT structure (sections 0–8), printed on paper: a light ground, deep teal-black ink, one Dropbox blue that only marks Dubai and actions, and an IHS maroon strip.

The spec is `site/BLUEPRINT.md` with colour set **C2** and type set **T3** instead of C1 and T1. The owner was asleep and said "no questions, no stopping", so every decision below was made here and is listed so it can be overruled.

## Colour (C2, all opaque)
| Token | Value | Use |
|---|---|---|
| ground | #EDEDED | page, nav, loader bars (Terminal's loader/frame grey) |
| card | #FFFFFF | nameplates, the delegate pass, call-out labels |
| ink | #052424 | all text, the wireframe globe, hairline leaders (Terminal's `--c-dark-green`) |
| lines | #C2C2C2 | 1px page grid, table rules, unrevealed clause letters (Terminal's `--c-light-gray`) |
| accent | #0061FE | Dubai on the globe, operative verbs, Register, the playhead, section numbers (Dropbox blue) |
| IHS maroon | #600E0E | footer host strip; a 10px square on the HOST call-out |
| IHS cream | #DCBDAB | text on the maroon strip only |
| ink-3 (derived) | #8E9898 | a fixed mix of ink and ground, used ONLY for the globe's limb dots, minor graticule and hour ticks; never for text |

- **Decision:** ink-3 was added because the clarity checklist forbids alpha, and a wireframe globe needs one step of depth. It's a mix of two existing tokens, not a new hue.
- **Decision:** no gold. BLUEPRINT's C2 row lists only the maroon strip for the host, so gold stays out.
- **Contrast:** ink on ground is about 14:1, and white on the blue is about 5:1. The palest text on screen is a clause's not-yet-filled letters (#C2C2C2). Those are transitional, the same as Terminal's #DDDDDD, and fill to ink as you scroll. Every resting text is ink, white or cream.

## Type (T3)
- **Inter Tight Variable** for display and text:
  - hero wordmark 600, −0.05em, fitted edge to edge in whole pixels;
  - clauses 500 at 40→76px, −0.03em;
  - section titles 600 at 36→64px, −0.04em.
- **Geist Mono Variable** for every label: 11→12px, caps, +0.08em.
- **Newsreader Variable italic 400** for the accent word only: the operative verbs, "Diplomacy around us.", *one*, *sessions*, *delegate* and "Pick three".
- **Clarity:**
  - every size is a Utopia clamp with whole-pixel endpoints at 390 and 1440;
  - `font-synthesis: none`;
  - auto smoothing on the light ground.

## Each move and its reference
| Section | Move | Reference (dossier) |
|---|---|---|
| 0 Loader | Mono counter 000→100, bottom-left | Outfit |
| 0 Loader | The hero's own hairlines draw in from the edges. The loader copies their exact rects, so they *become* the grid | Dropbox (`drawIn` lines → grid); Terminal (#EDEDED loader that becomes the frame) |
| 0 Loader | 60 numbered lattice points appear, the graticule draws and closes the limb, then land dots fill north to south: a wireframe globe | Igloo (numbered plexus), Oryzo (drawing becomes the object) |
| 0 Loader | "DXB MUN 2027" resolves by scramble (GSAP ScrambleText) | Igloo |
| 0 Loader | At 100 the paper splits into a top and a bottom bar; the globe stays as the hero object; the wordmark FLIPs onto the logo | Lando (split into bars), Getty (wordmark becomes the logo) |
| 1 Hero | One object (the ink wireframe globe), mono corner labels, "DXB MUN" edge to edge at −0.05em, and the serif-italic accent line | Igloo corners, Outfit edge-to-edge type, Lando type contrast |
| 1 Hero | The Tropic of Cancer (23.44° N) and Dubai's meridian are drawn in full ink; the other graticule lines are ink-3 | Terminal (measured, technical line layer) |
| 2 Flight | Fixed stage, scroll-scrubbed: the globe turns to Dubai, then dives about 20×. Graticule density goes 15° → 5° → 1°, and range rings at 1°, 2° and 4° appear (pure geometry) | Oryzo/Igloo dive; the line layer is always on top (NOT-LIKED rule 9) |
| 2 Flight | Mono call-outs on hairline leaders track Dubai: DUBAI 25.20 N · 55.27 E / HOST (maroon square) / DATES To be announced. A live LAT/LON/zoom readout | Terminal (computer-vision labels) |
| 3 Clauses | Pinned. One clause per screen; letters fill grey → ink with scroll; the operative verb fills to blue in Newsreader italic. Clauses swap with a clip wipe | Terminal (per-character colour fill), Getty (one sentence per screen) |
| 3 Clauses | A bottom hairline with 5 ticks, an ink progress fill and `CLAUSE 03 / 05` (NumberFlow) | Getty (year counter on a hairline) |
| 4 Committees | Pinned. Hairlines start bunched around a centre cell and slide out to the 5×4 column/row edges; cells flood in from an edge (clip-path), centre first, and lock into white nameplates | Dropbox (grid re-flows into the bento) |
| 4 Committees | Two tones per plate (white + its ink), inverted on hover; the 20th cell is the blue "Pick three" tile; the cursor dot grows into a blue "PICK" disc | Dropbox two-tone tiles, its blue cell; Outfit cursor |
| 5 Schedule | Pinned. One horizontal mono ruler (3 days, time-proportional, hour ticks + taller slot ticks), a blue playhead scrubbed by scroll with the current slot's name and time, and the slot list below with the current row inverted | Anime.js (ruler + playhead) |
| 6 Register | A ticket-stub pass: notches cut with a crisp CSS mask, a dashed perforation, a decorative barcode, and a blue Register CTA | Siena (ticket stub) |
| 6 Register | The nav's Register button is the same stub (notched), and its top line updates live: `§ 02 · COMMITTEES` | Siena |
| 7 Index | Wellness / Resources / Contact as numbered hairline rows; the row inverts on hover; the wellness check-in works (shared `useWellness`, Base UI Checkbox) | Lando/Outfit index rows |
| 8 Footer | "DXB MUN 2027" edge to edge, then the IHS maroon strip with cream text | BLUEPRINT §3.8 |
| Nav | A solid ground bar, a hairline under it, numbered mono items; the current item is struck through in blue. Phone: a MENU pill opens a full-screen solid sheet (Base UI Dialog), big caps, current item struck through | Lando, Oryzo |

## Decisions made without asking (overrule any of them)
1. **No difference blend on the nav.** BLUEPRINT says both "solid, never see-through" and "difference blend". On a light ground, a solid bar already reads over the globe and over paper, and a difference blend on a solid bar would turn it dark. Solid won.
2. **Only one easing, `cubic-bezier(0.65, 0.05, 0, 1)`.** It's solved numerically in `geo.ts` so GSAP uses the exact CSS curve. Timings are 0.75 s for UI and 1.1 s for big reveals.
3. **Nav sections:** About, Committees, Schedule, Register, Wellness, Resources, Contact (01–07). The live site's "Timer" is left out because this alt is the homepage only and has no timer view.
4. **The flight never invents a place for IHS.** The repo has no coordinates for the school, so HOST is a label on the Dubai stack, not a separate pin.
5. **Clause wording:** five clauses, built only from `conference.ts`:
   - "Hosted by Indian High School, Dubai.";
   - "Convenes 19 committees.";
   - "Meets for 3 days and 6 committee sessions.";
   - "Guided by 'Diplomacy around us.'";
   - "Notes that dates and venue are to be announced."
6. **Committee tiles link to Register** (`portal/#/now`). This is because the real sign-up form asks for three ranked committee choices (`portal/screens/SignUp.tsx`), so "Pick three" is a true statement.
7. **The loader runs once per tab** (sessionStorage `alt1.opened`), and any key, tap or wheel skips it to the split. It never waits on the network: it starts once fonts are ready, or after 700 ms at most.
8. **Phone:**
   - the committee wall is 2 columns, and each plate floods as it enters (no pin);
   - the schedule pin shows only the current day's list;
   - flight call-outs stack at the left gutter with one leader;
   - the hero's "Dates" and "Hosted by" meta are hidden (both appear in the call-outs and the pass).
9. **`?still` / reduced motion:**
   - no loader and no pins;
   - the globe is drawn once in the hero;
   - the flight becomes one landed-at-Dubai panel;
   - all five clauses, all 20 plates and all three days are listed in full.
10. **Picker:** the "Night Lab" group didn't exist yet, so "Alternatives" was created as the first group (per the brief).

## Files
- `main.tsx`: the app, nav, stub and phone sheet.
- `Loader.tsx`: the opening.
- `Stage.tsx`: the fixed globe, call-outs and readout, plus `LandedGlobe` for still mode.
- `geo.ts`: projection, easing and canvas drawing.
- `landmask.ts`: a copy of merged's 1-bit land mask, which originally comes from cobe (MIT).
- `sections.tsx`: sections 1–8.
- `fx.tsx`: the ScrollTrigger progress hook, fitted type, NumberFlow count and cursor disc.
- `links.ts`: copied from `concepts/final/links.ts`.
- `alt1.css`, `shots.mjs`, `tsconfig.json`.
