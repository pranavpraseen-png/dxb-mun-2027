# Alt 2 · Poster: notes and decisions

Page: http://127.0.0.1:5320/concepts/alt-2/ (`?still` gives the calm static version). Built 2026-11-05 while the owner was asleep ("no questions, no stopping"), so every judgement call is written down here.

**The idea in one line:** the BLUEPRINT page printed as a poster. One huge black word, a black wireframe globe, cream paper and a single IHS-maroon accent.

## Spec followed
- **Structure:** `BLUEPRINT.md` sections 0–8, nav (section 4) and motion rules (section 5). Its colour and font rows are swapped for the ones below.
- **Colour, C3 "Poster" with the maroon accent:**
  - ground `#EDE4DD`;
  - cards `#E2D8D0`;
  - ink and lines `#111112`;
  - the ONE accent is IHS maroon `#600E0E`.
  
  Two extra opaque neutrals were needed:
  - `--grey #A0958D` is the "not yet filled" letter colour in the clause fill. It's transient, and every clause is fully ink by the middle of its screen;
  - `--mute #4A4441` is for secondary mono labels.
  
  IHS gold and cream are **not** used, because the brief says one accent. Maroon carries the host colour: it's the footer host strip, the rule under the wordmark, the verbs and the delegate-pass stub.
- **Type, T2:**
  - **DINish is NOT on npm through Fontsource.** `npm view @fontsource-variable/dinish` and `npm view @fontsource/dinish` both return 404 (run through the lock).
    - `npm search dinish` found only third-party packages (`@fontpkg/dinish-expanded` with "SEE LICENSE IN README" and placeholder repo links, and `@sarap422/font-dinish`). I did **not** install either: unknown publishers, and outside the brief's "Fontsource" instruction.
    - So display and text use **Archivo Variable at `font-stretch: 125%`** (already installed, `@fontsource-variable/archivo/wdth.css`), the closest expanded grotesk we have. Weights used: 300 (verbs), 400–600 (text), 800 (display).
  - Labels use **IBM Plex Mono** 400/500 (already installed).
  - No serif anywhere. **Nothing was installed.**
- **Content:** only `src/data/conference.ts`; unknown values say "To be announced". The clause wording follows the Merged page's clauses ("Hosted by", "Guided by", "Convenes", "Meets for", "Dates"). Links are copied from `concepts/final/links.ts` into `links.ts`.

## References and the exact technique taken from each
| Reference | Technique | Where |
|---|---|---|
| Outfit (`outfit-hellohello.md`) | A full-width word, fitted edge to edge, with letters rising from behind a mask line one by one | hero "DXB MUN", footer "DXB MUN 2027" (`FitWord.tsx`) |
| Outfit | The 5 px accent rule under the word, drawn with scaleX from the left; a 4-column caption row | hero |
| Outfit | 000→100 mono counter in the loader; the 8 px cursor dot that grows into a VIEW disc | `Loader.tsx`, `Cursor.tsx` |
| Outfit | A wall with one empty cell left on purpose | committees (cell 20) |
| Lando Norris | Heavy-versus-tiny contrast: 112–300 px display vs 11–12 px mono labels. Light 300 maroon verbs against 800 ink facts (T2 has no serif, so the contrast is weight and colour) | everywhere, clauses |
| Lando Norris | Loader exits by splitting into top and bottom bars; one easing `cubic-bezier(0.65,0.05,0,1)` at 0.75 s / 1.1 s; menu items struck through in the accent | `Loader.tsx`, `motion.ts`, `Nav.tsx` |
| Igloo | Numbered points joined into a wireframe; scramble text reveal; mono labels at corners and crosshair ends | `globe.ts`, loader |
| Oryzo / Dropbox | Hairlines draw in from the edges and become the page grid | loader lines land exactly on the nav line, the crosshairs and the hero-foot line |
| Getty | The loader's wordmark flies to the top-left and becomes the nav logo | `Loader.tsx` |
| Terminal Industries | Letters fill from grey to ink as you scroll; mono call-outs on hairline leaders tracking the city | `Clauses.tsx`, `Flight.tsx` |
| Dropbox | The grid becomes the nameplates: lines draw, cells flood, labels slice up; two-tone tiles (card + ink) | `Committees.tsx` |
| Anime.js | A horizontal ruler with numbered ticks and a scrubbing playhead | `Schedule.tsx` |
| Siena | The ticket stub with perforation and notches, as the Register section and as the live nav button | `Register.tsx`, `Nav.tsx` |

## Avoided (NOT-LIKED-COMMON.md)
- **No pale or low-contrast screen.** Black ink covers a large share of the first screen (the 300 px word and a dense line globe), and the loader is solid ink.
- **No blur, dissolve or glow anywhere.** Text appears only by masks, clip-path slices, scramble and letter fill.
- **The loader builds the globe the hero keeps;** it never waits.
- **No realistic 3D:** the globe is pure linework (limb, dotted graticule, dot lattice, spokes, numbered points).
- **No template blocks:** no logo strip, pill soup or photo cards.

## Decisions made without the owner
1. **Loader as a printing plate.**
   - It's an ink sheet with the same globe drawn in cream, at exactly the hero's pose; the pose is published by the hero through `setHeroPose`.
   - At 100 it splits into top and bottom bars that leave by the edges. The ink-on-cream globe beneath is revealed in the same place, so the object "stays" while the colours invert.
   - It plays once per tab session (`sessionStorage`). It's skipped by any key, tap or wheel, by a URL hash, and by `?still` or reduced motion.
2. **The nav is solid cream with no `mix-blend-mode: difference`.**
   - The blueprint asks for both "solid, never see-through" and difference blending; on a page that is cream everywhere, difference adds nothing. Solid wins (the clarity checklist).
   - The cursor is a solid maroon dot (Outfit's cursor isn't blended either).
3. **The hero corners:**
   - logo top-left and Register top-right in the nav;
   - the coordinates and "Scroll ↓" sit at the two ends of the horizontal crosshair through the globe, not in the bottom corners, because the bottom of the screen belongs to the wordmark.
   - In flight they become a live centre readout and a `ZOOM ×NN.N` readout.
4. **Numbered points on the globe** (01–14) are unlabelled lattice markers joined to Dubai by great-circle spokes. No names are shown, so nothing claims who attends.
5. **Numbering:**
   - Nav sections are 01 About, 02 Committees, 03 Schedule, 04 Wellness, 05 Resources, 06 Contact.
   - Register isn't numbered: it's the ticket stub.
   - The index rows therefore show 04–06, not "01–03", so the nav and the page count the same way.
6. **Committee tiles open a nameplate dialog** (Base UI Dialog). It shows the code, full name, "Agenda: To be announced", previous/next and Register, so VIEW has a real purpose.
   - The backdrop is solid ink, not a translucent wash (clarity rule).
7. **Schedule on the phone (< 900 px) and in still mode:**
   - On the phone, the ruler becomes three hairline tables, because 30-minute slots would be 17 px wide.
   - In still mode, the ruler shows without the playhead.
   - Positions are computed from the published times; the 7:00 PM and 5:30 PM "Dispersal" slots use their published 30-minute duration.
8. **The delegate-pass barcode** is decoration derived from the committee codes; it encodes nothing. The pass carries only data fields.
9. **The Timer is not ported** (the live site's nav has it, but the brief's section list doesn't). Nothing links to it.
10. **Nameplate baseline (coordinator fix):** each tile is a fixed grid of rows: top labels, free space, code, then a name box sized for the longest name (2 lines at 1440, 5 at 390; phone tiles grew to 164 px).
    - Every code shares one baseline across a row.
    - Long codes (INTERPOL, UNOOSA…) keep the same size and narrow the width axis (`font-stretch: 100%`) instead of shrinking.
    - `shots.mjs tiles` measures the baseline spread per row and checks whether any name is cut off; both are 0 at 1440 and 390.
11. **No Lenis-driven pin library:** the pinned stages use CSS `position: sticky`, with ScrollTrigger only reading progress (scrub 0.4–0.7 s). This is robust with Lenis and costs nothing when idle.

## Motion inventory
- **Loader (3.5 s):**
  - lines draw;
  - points, then spokes, limb, meridians, parallels and land lattice scan north to south;
  - the counter steps through NumberFlow;
  - scramble;
  - the split at 2.45 s;
  - the logo flies to the nav;
  - the hero letters rise, the rule draws and the captions slice.
- **Flight (220 vh, pinned):**
  - the hero foot slides under its mask;
  - the globe recentres, turns to Dubai and zooms ×22;
  - a 1° grid appears;
  - three call-outs draw their leaders and slice open.
  - At rest the globe sways ±10° in longitude; the loop pauses off screen and in background tabs.
- **Clauses (100 vh + 5 × 55 vh, pinned):**
  - one clause per stop, rising and leaving through a line mask;
  - letter fill;
  - numbers roll with NumberFlow when the fill reaches them;
  - a clause counter plus a maroon progress rule on the bottom hairline.
- **Committees:** a scrubbed build (lines, then fills, then labels); hover inverts; the cursor shows the VIEW disc; the dialog opens from its middle (clip-path).
- **Schedule (desktop, 100 vh + 140 vh, pinned):** the playhead scrubs from 9:00 AM to 7:30 PM, the slot under it turns maroon, and the readout names it for each day.
- **Pass:** the main card slices open, the stub slices in, the bars draw.
- **Headings:** SplitText line masks. Mono labels use clip-path slices.

## Clarity checklist status
- Every token is opaque, and there's no `rgba` or alpha ink.
- No shadows, blur, `backdrop-filter`, noise or grain.
- Fonts use `font-synthesis: none`, and only real weights are used (Archivo is variable 100–900; Plex Mono uses its 400 and 500 files).
- Smoothing is auto on cream; `antialiased` is used only on the ink loader.
- The canvas backing store is CSS size × min(dpr, 2).
- Fluid sizes are `clamp()` pinned to 390 and 1440 (the fitted words round down to whole pixels).
- Screenshots use DSF 2 and `--force-color-profile=srgb`.
