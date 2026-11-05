# Siena Film Foundation (LIKED)
https://siena.film/ · Awwwards Site of the Day, 18 Mar 2025, plus Dev Award (refs.ts says "Site of the Month, Mar 2025"; the awwwards.com/sites/siena-film-foundation page I read on 2026-11-05 showed SOTD and Dev Award, so SOTM is not confirmed here) · culture (a boutique film production house)

Awwwards credits: Niccolò Miranda (PRO), Federico (PRO) and G-NS Studio. Scores: SOTD 7.9 (design 7.99, usability 7.61, creativity 8.13, content 8.0); Dev 7.51 (animations 8.60). Tags: Film & TV, Institutions, Infinite Scroll, Navigation Menu, Transitions, Filters and Effects, Copy design, Microinteractions. Colours listed ("2 colours"): **#000000, #FAF7EF**. Fonts: none listed.

## Fonts
There are three retail families, each identified from its TTF name table (files served from Webflow's CDN):
1. **Neue Brucke**:
   - Due Studio (Italy), designer Massimiliano Vitti, © 2023, version 1.00.
   - **The production file is the "Neue Brucke - Trial" build**: its name table family is "Neue Brucke - Trial". The site ships a trial font.
   - **Retail, not free.**
2. **P22 Parrish Roman**: P22 type foundry, © 1999 (Fontographer 4.1.3 build). **Retail.**
3. **NB International Regular**: Neubau (Stefan Gandl), © 2008, version 2.000, with a "LEGAL NOTICE" licence (Neubau EULA). **Retail.**

display: Neue Brucke 400. Film titles ("OUTSIDER FREUD"):

| | 1440 | 390 |
|---|---|---|
| size / line-height | **89.6 / 71.68 px** (line-height **0.8**) | **48 / 38.4 px** |
| tracking | **−2.688 px (−0.03 em)** | −1.44 px |

Titles are set UPPERCASE in a narrow centred stack, split into one DOM div per character (194 char-divs), so they can be sliced. The SIENA logo is a separate SVG logotype (98 × 47 px at 1440): a condensed display with flared serifs.

text: Neue Brucke 400, UPPERCASE everywhere. There is no lowercase running text on the home screen.

| Use | Size / line-height | Tracking |
|---|---|---|
| Review quotes ("A JOURNEY INTO FREUD'S LIFE") | 25.6 / 23.04 px (0.9) at 1440; 19.2 px at 390 | 0 |
| Credits table ("DIRECTOR / YAIR QEDAR", "YEAR", "CATEGORY") | 20 / 18 px | −0.2 px |
| Award line ("2024 BEST FEATURE DOCUMENTARY") | 32 px for the year, 16.8 px for the line | 0 |

labels/nav:
- Ticket-stub title: Neue Brucke 20 / 18 px.
- Ticket-stub meta ("DOCUMENTARY · 2024 · MIN.66"): Neue Brucke 7.2 / 7.2 px, +2 px (0.28 em), at 70% opacity.
- Buttons ("ENTER", "EXPLORE"): Neue Brucke 12 / 10.8 px, **+1.8 px (0.15 em)**.
- Menu ("WORK / ABOUT / CONTACT"): Neue Brucke 32 / 28.8 px, with "01 02 03" numbers. Footer links ("COOKIE TERMS PRIVACY"): 12 px, +1.12 px.
- Kickers ("DOCUMENTARY", and publication names like "THE JERUSALEM POST", "IMDB"): **P22 Parrish Roman 9.6 px, tracking 2.88–3.36 px (0.30–0.35 em), UPPERCASE**. This is the only serif on the site.
- Tutorial tips: NB International 10 / 10 px, +0.8 px, uppercase. The custom cursor label "SCROLL" is NB International 12 px. Dropdown field labels ("HEADLINE", "DIRECTOR"): NB International 6 px, +1.8 px.

mono: none.

free equivalents we can legally ship:
- **Neue Brucke → Bricolage Grotesque** (OFL, Google Fonts). It's a contemporary grotesk with round geometric O and C, compact caps and a slightly eccentric voice; set it in caps with −0.03 em tracking and 0.8 line-height. My only evidence for Neue Brucke's shapes is the captured titles, so treat this match as "close in feel".
- **P22 Parrish → Cinzel** (OFL, Google). Both are inscriptional Roman caps-only serifs that hold up at 9–10 px with wide 0.3 em tracking.
- **NB International → Inter** (OFL). Both are neutral grotesks, and NB International is only used for tiny UI text.

## Colour
- **ground:** **#000000**, the body background and the 2 gradient bands (`linear-gradient(#000, transparent)`, 117 px tall top and bottom).
- **ink:** **#faf7ef** warm off-white, the computed text colour of every white label and the Awwwards palette value.
- **paper:** the ticket stub and the menu card use the same **#faf7ef** as their fill, with **#000000** text.
- **Hairlines:** #000000 at 1 px and 30% opacity on the cream stub; #faf7ef at 30% (2 px) on the dark side.
- **On screen:** what reads on screen is film footage under a grain filter. The pixel histogram is warm near-blacks: #040404, #0b0a0a, #130c0a, #0b0604, #1b120c, #1a0e0b, #1c1411, #23140c, plus #faf7f0 text.
- **accents:** none in the UI. Colour comes only from the films.
- **count:** 2 (#000000, #faf7ef).
- **Light or dark:** dark.
- **Where the accent appears:** nowhere. The cream ticket stub is the only "light" object on screen.

## Loading screen
yes · about 6 s, then an ENTER gate. The loader is a **video** (`logo_intro_desktop.mp4`, 2160×1440, muted autoplay, from cdn.jsdelivr.net/gh/niccolomiranda/siena; `intro_mobile.mp4` on phones).

What it shows (frames `load-*`):
- 0.6–1.2 s: black.
- ~2 s: a **cream (#faf7ef) field with about 21 evenly spaced black vertical stripes** (about 67 px apart).
- ~3.5 s: it inverts to black with cream stripes, and the stripes **slide to build the SIENA logotype**.
- ~6 s: it settles on the SIENA logo (about 500 px wide), "F I L M  F O U N D A T I O N" in widely tracked caps, and an **ENTER button shaped as a ticket** (notched corners, a perforated arrow stub).

How it exits: after ENTER, the whole vertical **film strip rolls past at speed**, motion-blurred and ghosted, through several films (`gate-exit-400ms`, `gate-exit-800ms`). By about 1.6 s it decelerates onto the first film card (`gate-exit-1600ms`); the logo and ticket stub are already in place.

Does the loader become part of the hero: partly. The stripe motif returns as the horizontal strips of the title-slice transition, and the ticket shape of ENTER returns as the nav.

## First screen
- **Composition:** one **film card**, a rounded rectangle about 1310 × 660 px (x 65 to 1375, y 115 to 775), with the edges of the previous and next cards peeking above and below (40 px gaps). Grain lies over everything.
- **Card contents:**
  - left column: award ("2024 / BEST FEATURE DOCUMENTARY" with a laurel) at the top; a "DOCUMENTARY" kicker, then the 89.6 px stacked title and a 3-row ruled credits table at the bottom;
  - right column: three 5-star review blocks (star row, Parrish kicker, 25.6 px quote) and a ticket-shaped "EXPLORE →" button.
- **Corners:** the SIENA logo top-left (34, 32) and the **ticket stub** top-right (341 × 103 px at x 1065).
- **Element count:** about 12.
- **Hook:** it looks like a film poster in a projector gate, and the nav is a cinema ticket.

## Navigation
- **Type:** the menu is a **cinema ticket stub** fixed at the top right (`.menu-w` 341 × 103 px):
  - the left part (237 px) shows the current film (38 px thumbnail with 6 px radius, title, and a dropdown chevron) over a 3-cell meta row (category · year · minutes);
  - a **dashed perforation** separates it from a square stub holding a 3-line hamburger;
  - semicircle "punch" notches sit at the perforation ends and the corners.
- **Items:** Work, About, Contact (numbered 01–03), plus Cookie, Terms, Privacy, Instagram, Facebook and LinkedIn icons, and the © line.
- **On scroll/drag:** the stub stays fixed, and its film title and meta **update to the film in view** (it became "THE HOUSEWIFE · FEATURE FILM · 2026 · MIN.102" after a drag, then "MOON IN THE 12TH HOUSE · 2014 · MIN.109").
- **Menu open animation:** on desktop my probe did not open the menu (my click missed), so the animation is not observed. The DOM has the menu items at x 1065 to 1406 just under the stub (32 px). On the phone (`probe-phone-menu-1500ms`), the menu is a **cream ticket card** dropping under a 46 px cream square button that turns into "×". It contains:
  - "01 WORK / 02 ABOUT / 03 CONTACT" at 32 px;
  - dashed separators;
  - Cookie, Terms and Privacy;
  - social icons;
  - "©2024. SIENA FILM FOUNDATION.".

  The page behind dims.

## Layout and grid
- **Max width:** none; the canvas is full-bleed.
- **Margins:** chrome at a **34 px** inset (logo and stub); the film card at a **65 px** side inset at 1440. At 390 the card has a 16 px inset.
- **Columns:** inside the card there are 2 text columns (left about 365 px wide at x 124 to 488; right about 200 px centred at x 1237), with the photo between them. Other blocks: not observed.
- **Length:** document height = 1 screen; it's a virtual, infinite vertical film strip ("Infinite Scroll" tag). There are 8 or more films (the ticket dropdown list: Savoy, Moon in the 12th House, Taboo, …).
- **Section rhythm:** one film per screen, cards stacked vertically with about 40 px of black between them.

## Type behaviour
- **Entry:** the **sliced-title swap**. The title is broken into horizontal strips that shift vertically, out of sync, so for a moment two titles interleave ("OUTSIDER" over "FREUD" in `first-screen-clean.jpg` and `probe-wheel-1-300ms.jpg`), then they resolve. The lil-gui debug panel in the DOM names the shader controls: **roll effect, time_influence, grid_size, grid_strips_width, post: bulge_radius**. The credits table rows also overlap, by design.
- **Size contrast:** 89.6 px title vs 9.6 px kicker is about 9.3×; vs the 25.6 px quotes it's 3.5×.
- **Case:** 100% UPPERCASE.

## Motion
- **Smooth scroll:** Lenis (html class `lenis`; the `lenisVersion` global; string in `app.js`), driving a WebGL film strip.
- **Navigation:** **drag is the reliable control** ("HOLD AND DRAG TO NAVIGATE THE CONTENT"). In headless, small and large wheel steps only jittered the title strips and snapped back to the same film; a 480 px vertical drag moved to the next film (`probe-drag-held`, then `probe-drag-release-800ms`).
- **While dragging:** the cards **bulge** (a WebGL lens) and the cursor becomes a ring with ^ and v chevrons.
- **Section to section:** film to film by a vertical roll with bulge and the title slice swap.
- **Easing:** the buttons use **cubic-bezier(0.23, 1, 0.32, 1)** (an out-quint feel) over **0.8 s with a 0.1 s delay**.
- **Page transitions:** not observed.

## 3D / WebGL / media
- One full-screen **WebGL2** canvas renders the film strip, with the roll, strip grid and bulge post effects.
- Film stills and footage sit on the cards; grain is a filter over everything.
- Videos: 3 (the logo intro, the mobile intro, and a tutorial video, `tutorial-final.mp4`, inside the tip card).
- Howler.js audio is loaded (the Howler and Howl globals); no sound was observed in the muted capture.

The canvas is the whole page: central.

## Interaction details
- **Cursor:** a custom **~100 px thin ring labelled "SCROLL"** (`.cursor-box`) that turns into a drag ring with chevrons while holding. `cursor-hide-hitbox` zones hide it over the logo and buttons. The computed cursor is "grab" over the cards.
- **Hover on EXPLORE:** the ticket button fills with #faf7ef, its label turns black and slides up 16 px, over 0.8 s cubic-bezier(0.23, 1, 0.32, 1).
- **Ticket details:** dashed perforations, punch notches, "MIN.66" runtime, the "01 02 03" menu numbers, star rows.
- **Grain:** film grain over everything.
- **Gradients:** 117 px black fades at the top and bottom.
- **Tutorial card:** "Hold and drag … / Scroll to unlock the immersive film experience / Click on left-side menu to quick navigate films", with a CLOSE button.

## Phone
- **No ENTER gate.** The site loads straight into the first film.
- The card goes almost full width (16 px inset) and re-stacks: two review columns on top, the image, then the centred title (48 px), credits and EXPLORE.
- The ticket stub shrinks to a **46 px cream square menu button**.
- The awards block is dropped from the first view.
- A "Rotate your device to ensure a better experience" layer exists for landscape.

## Tech detected
- **Webflow** (html `data-wf-site`, the `Webflow` global, `webflow.*.js`, the website-files.com CDN) with **jQuery 3.5.1**.
- A custom bundle `siena-film-foundation.vercel.app/app.js` containing GSAP, ScrollTrigger, SplitText, Lenis, Howler, GLSL, glTF and KTX2 strings. `gsapVersions` and `lenisVersion` are globals.
- WebGL2 (the renderer was the real GPU).
- **lil-gui** left in production (closed).
- Google Analytics (gtag).
- No framework.

## Clean because… / Insane because…
Clean because:
- 2 colours (#000000, #faf7ef);
- one film per screen;
- everything in caps;
- the nav is a single object (the ticket);
- chrome is pushed to 2 corners.

It's busier than the others: grain, stars and three quotes per card.

Insane because:
- the menu is a perforated cinema ticket that updates live with the film in view;
- a striped video loader builds the logo;
- the ENTER gate releases a motion-blurred film-strip roll;
- titles slice into strips and re-assemble (a WebGL shader with tunable strip width);
- a drag-to-navigate infinite film strip with a bulge lens.

## Evidence
`shots/siena-film/`:
- loading and gate: `load-0_6s`, `load-1_2s`, `load-2s`, `load-3_5s`, `load-6s` (0.2 s was blank); `first-screen-pre-gate`; `gate-exit-400ms` … `gate-exit-2400ms`; `first-screen-after-gate`; `first-screen-clean`;
- hover: `hover-0-before`, `hover-1-nav-after` … `hover-6-card-after`;
- scroll and drag: `scroll-01` … `scroll-24` (the wheel did not advance); `probe-wheel-*`; `probe-drag-held`; `probe-drag-release-150/400/800/1400ms`; `probe-key-down`;
- ticket and menu: `probe-ticket-drop-*`, `probe-menu-*` (the desktop menu did not open); `probe-start`;
- phone: `phone-0` … `phone-3` (`phone-menu-*` hit the logo, not the menu); `probe-phone-menu-300ms`, `probe-phone-menu-1500ms`;
- data: `measure.json`, `probe.json`.
