# DXB MUN 2027 homepage: the structure taken from the owner's references

**Status:** APPROVED. The owner's explicit picks on 2026-11-05 were "C1 Night Lab (Recommended)", "T1 Mona Sans set (Recommended)" and "Yes, build it". Build exactly this: C1 colours (section 7) and T1 fonts (section 6). Nothing goes live without a separate go-ahead.

**Source:**
- the owner's picks on the reference board, 2026-11-05;
- the measured dossiers in `concepts/refs/dissect/` (11 liked, 7 not liked);
- the comparison in `concepts/refs/dissect/NOT-LIKED-COMMON.md`.

The owner's words: "from the references i selected i need everything … fonts colours everything … that makes it insane n absolutely clean", and "find commons between which I DIDNT LIKE".

## 1. The DNA: what the 11 liked sites share (measured)
| Trait | Liked sites that have it |
|---|---|
| **The loader builds something, and that thing BECOMES the page** (never a spinner or a wait) | 11/11. Getty: the wordmark becomes the logo. Anime.js: a tick ring becomes the dial. Dropbox: lines draw in and become the grid. Terminal: the mark scales into a notched panel. GQ: the lockup gives way to a wireframe room. ERA: the title builds inside a frame, and an arch opens it. Lando: the monogram splits into bars. Oryzo: a CAD circle becomes the 3D object. Igloo: ASCII becomes a numbered web, then a wireframe, then the object. Siena: stripes become the logo, then a ticket. Outfit: a 000–100 counter, then a curtain. |
| **A drawn-line layer** (hairlines, grids, wireframes, numbered points, rulers) | 10/11 |
| **Tiny uppercase mono or caps labels** (10–13 px, wide tracking) under huge type | 10/11 |
| **Huge, tight display type** (82–173 px, tracking −0.02 to −0.05 em, line-height 0.8–1.0) | 9/11 |
| **2–4 colours with one accent at most**; often ink on ground and nothing else | 11/11 |
| **Minimal chrome** (corner labels, a pill, a ticket stub, few nav items) | 10/11 |
| **Numbers as decoration** (counters, %, years, timestamps, numbered points, rulers) | 8/11 |
| **Text that appears crisply:** scramble (Igloo), letters filling with colour (Terminal), letter build (ERA), slices (Siena), rising behind a mask (Outfit), greying in (Getty). Never blur. | 11/11 |
| **One easing for everything:** Lando uses `cubic-bezier(0.65,0.05,0,1)`, 0.75 s | measured on Lando; the others feel the same |
| **One object or one stage carries the whole page** (dial, globe-like object, room, grid) | 8/11 |

## 2. What the 7 rejected sites share (avoid all of these)
- **Pale, washed-out, low-contrast first screens** (mist, beige haze, watercolour, plaster): 5/7 rejected vs 1/11 liked.
- **Realistic or painterly 3D with no line layer on top:** 4/7 rejected vs 0/11 liked.
- **Text that blurs, dissolves or glows in:** found only on rejected sites.
- **Loaders that just wait or fade** (blank white, a progress line, a click gate).
- **Generic template sections below the fold:** logo strips, pill buttons, photo-with-overlay cards.

Not the reason (the liked sites have these too): photos, smooth scroll, serif vs sans, warm vs cool colour.

## 3. The page structure: a short page with a full nav
Facts come only from `src/data/conference.ts`. Anything unknown says "To be announced".

**0. Loader (about 3 s; once per visit; skippable with any key or tap)**
- Sequence:
  - A mono counter in the bottom-left counts `000 → 100` (Outfit).
  - Hairlines draw in from the edges and become the page grid (Dropbox).
  - In the centre, a field of numbered points connects into a wireframe globe (Igloo, Oryzo).
  - "DXB MUN 2027" resolves by scramble (Igloo).
- At 100 the screen splits into top and bottom bars (Lando). The globe stays and becomes the hero object, and the wordmark flies to the top-left as the logo (Getty).

**1. Hero (first screen)**
- One object, centred: the wireframe globe, drawn in lines with numbered points.
- Mono corner labels (Igloo), for example:
  - top-left: logo;
  - top-right: Register;
  - bottom-left: `25.20° N 55.27° E`;
  - bottom-right: `Scroll`.
- Below it, "DXB MUN" runs edge to edge in huge display type with −0.05 em tracking (Outfit). Its one accent line, "Diplomacy around us.", is in the serif italic (Lando's type contrast).

**2. The flight to Dubai (pinned, scroll-scrubbed)**
- The globe turns and the camera dives to Dubai.
- Mono call-outs with hairline leaders track the city (Terminal), for example `DUBAI · 25.20 N`, plus the host, Indian High School.
- The 3D always has the line layer on top, never a realistic render alone.

**3. The resolution: one clause per screen (Getty pacing, Terminal reveal)**
- Each fact is a single resolution clause, centred.
- The letters fill from grey to ink as you scroll (Terminal). The operative verb is in the serif italic, in the accent colour.
- A year or clause counter rides a hairline at the bottom (Getty), for example `CLAUSE 02 / 05`.

**4. Committees: the grid becomes the nameplates (Dropbox)**
- The hairline grid lines move, and cells flood and grow until they lock into a tile wall of the 19 committees.
- Each tile is a nameplate with exactly two tones: a fill and its own dark ink (Dropbox), showing the mono code and the full name.
- Hover inverts the tile. The cursor dot grows into a "VIEW" disc (Outfit).

**5. Schedule: a ruler with a playhead (Anime.js)**
- The days sit on a horizontal mono ruler, with a playhead that scrubs as you scroll. Numbered ticks.

**6. Register: the delegate pass (Siena ticket stub)**
- A ticket-stub card with perforation and notches: `DXB MUN 2027 · DELEGATE PASS · Register →`.
- The same stub is fixed top-right as the nav's Register button, and it updates live with the section in view (Siena).

**7. Wellness, Resources, Contact:** short index rows in a hairline table. Row hover inverts, numbered `01–03`.

**8. Footer:** "DXB MUN 2027" edge to edge, hosted by Indian High School, with the IHS maroon strip.

## 4. Navigation
- **Desktop:** a thin top bar with every section, numbered in mono caps (`01 About · 02 Committees · …`), plus the ticket-stub Register.
  - Hairline underneath. Solid, never see-through.
  - It uses a difference blend so it reads over the globe and over paper (Outfit).
- **Phone:** a "MENU" pill opens a full-screen solid overlay (Lando, Oryzo). Items are big caps; the current item is struck through with the accent colour (Lando).

## 5. Motion rules (all of it)
- **Easing:** one curve everywhere, `cubic-bezier(0.65, 0.05, 0, 1)`; 0.75 s for UI and 1.1 s for big reveals.
- **Scroll:** Lenis smooth scroll with GSAP ScrollTrigger scrubbing. Pinned stages for the globe and the clauses.
- **Text reveals:** scramble, letter colour-fill, line masks or slices only. No blur, dissolve or glow, ever.
- **Numbers:** they count (NumberFlow) wherever a figure appears.
- **Reduced motion:** a calm static version with every fact visible.
- **Performance:** 60 fps, using transform, clip-path and shaders only. WebGL at `dpr [1, 2]`, paused off-screen.

## 6. Type: these are the fonts the liked sites really ship, where they're free
| Role | Option T1 (recommended) | Option T2 | Option T3 |
|---|---|---|---|
| Display + text | **Mona Sans** (shipped by Lando; free, OFL; has a width axis) | **DINish Expanded** (shipped by Anime.js; free, OFL) | **Inter Tight** (the free equal to Outfit's and Terminal's grotesks) |
| Mono labels | **Geist Mono** (shipped by Terminal; free) | **IBM Plex Mono** (shipped by Igloo; free) | **Geist Mono** |
| One accent word | **Instrument Serif** italic (stands in for ERA's serif) | none (pure grotesk, like Anime.js) | **Newsreader** italic (stands in for Getty's Bradford) |

- **Installs needed:** Mona Sans (`@fontsource-variable/mona-sans`) and DINish need installing. Geist Mono, IBM Plex Mono, Instrument Serif, Inter Tight and Newsreader are already installed.

## 7. Colour: three sets taken directly from the liked sites
All three are high-contrast and crisp, which is the opposite of the rejected pale and misty look.

| | C1 "Night Lab" (GQ, Siena, Oryzo) | C2 "Terminal Paper" (Terminal, Getty, Dropbox) | C3 "Poster" (Outfit, Lando) |
|---|---|---|---|
| ground | #100904 near-black | #EDEDED | #EDE4DD cream |
| surface/cards | #1C130C | #FFFFFF | #E2D8D0 |
| ink | #FAF7EF cream | #052424 deep teal-black | #111112 |
| lines | #382416 / cream at full opacity for wireframes | #C2C2C2 | #111112 |
| one accent | #DC5000 orange (Oryzo) | #0061FE blue (Dropbox), close to UN blue | #FF0001 red (Outfit), or IHS maroon #600E0E |
| IHS host | maroon strip, gold rule | maroon strip | maroon replaces red as the accent |

- **C1 fits the owner's earlier briefs** (dark, serious, warm orange and brown). C2 is the cleanest and most "official", with a blue close to UN blue. C3 is the most poster-like.
- **These replace Dusk + Official Record** for the homepage. The dashboards follow whichever set is picked.

## 8. Picks needed from the owner
1. Colour: C1, C2 or C3.
2. Type: T1, T2 or T3.
3. Approval of the structure in section 3, or changes to it.
