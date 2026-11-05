# Lando Norris (LIKED)
https://landonorris.com/ · Awwwards page text: "Site of the Day - Nov 17, 2025", SOTD 8.18, Dev 7.58; by OFF+BRAND. refs.ts says "Site of the Year 2025": the SOTY line was not in the page text we read, so that label is unconfirmed here · mobility / sport

Measured 2026-11-05 with `scripts/batch-b.mjs` (headless Chrome with SwiftShader WebGL, 1440×900 and 390×844, DPR 1). Raw numbers: `shots/lando-norris/measure.json`.
- WebGL did start: `webgl2` contexts were created on "ANGLE … SwiftShader driver".
- It was too slow to draw the hero portrait inside the capture window, so the desktop pass hit its 170 s hard cap after 18 scroll steps, and no mid-page re-measure was taken.
- The portrait is therefore shown from **secondary evidence**: the earlier board capture `concepts/refs/shots/lando-norris-0.jpg` (headless Chrome, same site), labelled as such below.

## Fonts
Fluid root: `--fluid-font: calc(clamp(992px, 100vw, 1920px) / 1728 * 16)`, so the design is drawn at 1728 px. At 1440 the rem is 13.33 px; the max width is 1920.

- **display A (sans):** `"Mona Sans Variable"`. The font file's name table says "Mona Sans, © 2022 The Mona Sans Project Authors, manufacturer GitHub, designer Deni Anggara, SIL Open Font License 1.1", axes wdth 75–125 and wght 200–900. **Free (OFL): we can ship it as is.**
  - Headlines: 700, `uppercase`.
  - Sizes at 1440: 93.3 px (ls -3.33 px, lh 0.82), 70 px, 60 px (ls -1.67), 38 px, 32 px.
  - The big statement line "LIMITS, FIGHTING FOR…" is 105.8 px at **400** weight (ls -0.83 px, lh 0.9).
  - At 390: 43.3 / 39 / 37.9 px.
- **display B (serif):** `Brier` (Bold file only). The name table says "© 2021 by Fatima Abbas, designer Fatima Abbas", vendor `UKWN`, fsType 8. **No licence string in the file, so its licence is not verified here; treat it as not cleared to ship.**
  - It's a wide, high-contrast, sharp-serif display face. It's used for single accent words inside the sans headlines ("REDEFINING", "WINS", "LEGACY", "CHAMPION", "OFF"), always in lime-off `#B2C73A` on dark.
  - Sizes at 1440: 110 px (ls -2.5, lh 0.83), 97.5, 72.5, 62.5 px, all uppercase. At 390: 43.3 / 39 / 37.9 px.
  - It's also the quote face: 26.7 px and 20 px, mixed case, ls +0.67 px ("Since I was 7 years old…").
- **text:** Mona Sans 400, 16.67 px, lh 20.8 px, ls -0.17 px, sentence case, `#282C20` on light (or `#B9BBAD`). The small body is 14 px / 20 px.
- **labels/nav:**
  - Mona Sans 800, 16.67 px uppercase (buttons such as "STORE", whose label is duplicated for a roll hover).
  - Photo captions ("QATAR, 2024"): 8.33 px, uppercase, `#535450`.
  - The "NEXT RACE" card: 8.33 px uppercase.
  - Eyebrow token `--text--eyebrow: .578rem`.
- **mono:** none.
- **Free equivalent for Brier:** **Fraunces** (OFL, Google, variable) at wght 300–400, opsz 144, SOFT 0, WONK 0. It gives the same wide, high-contrast display serif with sharp wedge serifs, and it can be tuned. Gilda Display (OFL) is a fixed-weight second choice. Mona Sans itself is free.

## Colour
Measured from CSS variables (`--color--*`) and computed styles. The body ground is `#282C20`.

- **ground:**
  - dark green `#282C20` (body; the largest area);
  - off-white `#F4F4ED` (footer and light sections);
  - near-black `#111112` (the helmets grid);
  - mid grey-green during the colour morph (`scroll-08`);
  - the hero ground is the WebGL canvas, which looks off-white in the captures. Its CSS value can't be read because it's drawn.
- **ink:**
  - `#282C20` on light, `#F4F4ED` on dark;
  - secondary: `#535450` (tint-2), `#B9BBAD` (grey-on-track), `#DDE1D2` (off-white-1, the big statement), `#B4B8A5` (off-white-2).
- **accents:**
  - lime `#D2FF00`: the STORE button, the loader screen, SVG strokes such as the signature and track lines, and the year numbers in the helmet grid;
  - lime-off `#B2C73A`: the serif accent words on dark;
  - papaya orange `#FF6B00` (defined, used only sparingly).
- **Other tokens:** `#3B3C38`, `#EBEEE0`, `#EFEFE5`, `#C8CBBD`.
- **Number of colours:** about 5 core (dark green, off-white, black, lime, lime-off) and about 8 greys.
- **Light or dark:** mixed. The light hero changes to a dark green body, the background shifts colour as you scroll, and the page ends on a light footer.
- **Awwwards palette:** `#D2FF00`, `#111112` (it agrees).

## Loading screen
- **Yes, about 3.5–5 s.**
- **0.2 s:** blank (no text yet).
- **0.6 s:** a full-screen lime `#D2FF00` with one label, "LOAD NORRIS", bottom-centre in 700 caps (fallback font).
- **2 s:** the same, now in Mona Sans.
- **3.5 s:** the "LN" monogram (about 50 px, dark) appears dead centre.
- **6 s:** the lime is gone; you see the contour-line hero, the nav, the "NEXT RACE" card, and no portrait yet (SwiftShader).
- **Exit (secondary evidence, `concepts/refs/shots/lando-norris-0.jpg`):** the lime panel collapses into two rounded lime bars hugging the top and bottom edges, like a split wipe, while the portrait is already in place. "LOAD NORRIS" stays as a small lime pill bottom-centre.
- **Does the loader become part of the hero?** Partly: the LN monogram stays as the centre logo at the top of the hero.

## First screen
- **Composition:** one centred head-and-shoulders portrait, about 60 % of the height, rendered as a live WebGL layer (secondary evidence: board capture). It sits on an off-white ground with drifting grey topographic contour lines and soft blob shapes, also WebGL.
- **Corners:**
  - top-left: the stacked "LANDO / NORRIS" logo (a serif over a bold sans);
  - top-centre: the LN monogram;
  - top-right: a lime "STORE" pill and a square outlined menu button;
  - bottom-left: a tiny ticket-shaped "NEXT RACE" card with a track outline, "SÃO PAULO GP" and "MCLAREN F1 SINCE 2019".
- **About 6 elements.**
- **Hook:** the face reacts to your cursor, per Awwwards ("Gestures / Interaction") and refs.ts. On the phone there's an explicit hand button ("TAP TO LOCK").

## Navigation
- **Type:** minimal corners. A fixed `div.nav`, 1440×83, transparent, with 3 items: Store, "Open navigation menu" (`button.nav-ham`, 60×60) and the centre home monogram.
- **On scroll:** it stays fixed and shrinks a little (the STORE pill goes from 118 px wide at the top to about 100 px in later shots), and the menu button inverts from an outline on light to filled off-white on dark.
- **Menu open (phone, `phone-menu-open-0_3s`, `-1_5s`):** a full-screen dark green `#282C20` overlay over the contour lines, already fully in place at 0.3 s.
  - 4 huge centred caps items: HOME / ON TRACK / OFF TRACK / CALENDAR, Mona Sans 700, about 40 px.
  - The current page is greyed and struck through with a hand-drawn lime squiggle.
  - Below: the laurel badge and "MCLAREN F1 SINCE 2019"; at the bottom, "BUSINESS ENQUIRIES" and TIKTOK · INSTAGRAM · YOUTUBE · TWITCH. The socials type in with a lime block cursor at 0.3 s: a typewriter or scramble reveal.
  - The menu button turns into a lime square with ×, and the lime STORE pill stays.

## Layout and grid
- **Max width:** design width 1728; `--max-width: 1920px`; `--fluid-container: clamp(992px, 100vw, 1920px)`.
- **Margins:** the container pads 1.25rem (16.7 px at 1440, measured 17 px nav inset); 14 px at 390.
- **Columns:**
  - The helmets grid is 4 columns with a 16.67 px gap: notched cards with a cut corner and hairline border.
  - The "Off track" gallery is free-placed photos at scattered x positions, with no columns.
  - Statements are centred.
- **Whitespace:** the hero is airy; the middle of the page is dense (photo scatter, the helmet wall, the store).
- **Sections:** 12. The page is 13,577 px = **15.1 screens** at 1440 and 11.9 screens at 390.
- **Rhythm:** sections run 476–3,143 px. There's a 3,143 px horizontal pinned track (`is-horizontal-track`, sticky) and a pinned "ON TRACK / OFF TRACK" split screen. Shapes between sections are curved, e.g. a convex dark edge over the store section in the board capture.

## Type behaviour
- **Mixing:** the headlines mix two faces inside one line: sans caps with serif accent words ("REDEFINING LIMITS, FIGHTING FOR WINS"). This is the signature move.
- **Entry:** lines rise in. The statement is revealed line by line as you scroll (`scroll-04/05`). A handwritten signature is drawn as a thick lime SVG stroke over a video placeholder ("MESSAGE FROM LANDO", `scroll-02/03`).
- **Size contrast:** 110 px vs 16.67 px body = **6.6 : 1** (14 px small body: 7.9 : 1).
- **Case:** headlines UPPERCASE; quotes in serif mixed case; body sentence case.

## Motion
- **Smooth scroll:** yes, Lenis (`html.lenis`; a `lenis` object on window).
- **Library:** GSAP is not exposed globally; it's bundled in `lando-by-OFF+BRAND.05.js`. Awwwards lists GSAP.
- **Easing token:** `--cubic-default: cubic-bezier(0.65, 0.05, 0, 1)` with `--duration-default: 0.75s`. That's a hard ease-in-out: a fast middle and a long settle.
- **Pinned:**
  - the hero (`sticky-item home-hero`);
  - the horizontal photo track (`horizontal-pin-sticky`);
  - the ON/OFF TRACK sticky split.
- **Background colour:** scroll-scrubbed between sections (dark green → grey-green → light).
- **Contour lines:** drift continuously (WebGL `gl-background`, fixed full-screen).
- **Page transitions:** not observed.

## 3D / WebGL / media
- **Central.**
- **Canvases:**
  - a fixed full-screen WebGL canvas, `gl` / `gl-background`, 1440×900: the contour field and the hero portrait;
  - a 1061×665 canvas and an 800×571 canvas (section visuals);
  - about 15 small 2D canvases for icons (13 px, 46 px, 60 px, 80×42, probably Rive or Lottie-style icons; not identified).
- Three webgl/webgl2 contexts were created, and the `__THREE__` global is present, so three.js is in use.
- No `<video>` elements.
- 3D helmet renders appear in the helmet grid (images).

## Interaction details
- **Cursor:** default (no custom cursor element), but the hero portrait follows the cursor (Awwwards tag "Gestures / Interaction"; not measurable headless).
- **Hover:** button labels are duplicated for a vertical roll ("Store STORE", "view on track VIEW ON TRACK").
- **Shapes:** ticket and notched shapes, e.g. the "NEXT RACE" card and the helmet cards with a cut corner.
- **Small details:**
  - photo captions with place and year ("MONACO, 2023");
  - a race counter box ("1" plus a flag);
  - a hand-drawn signature under the quotes;
  - laurel and helmet badges.

## Phone
- The STORE pill moves to the top-left and the menu stays top-right.
- The logo becomes one line, "LANDO NORRIS", centred under the LN monogram, with "MCLAREN F1 SINCE 2019" under it.
- The portrait is replaced by a tap interaction: a lime hand button bottom-right (`phone-0`), with the label "TAP TO LOCK" / "BACK TO SCROLL" in the phone DOM, so a tap locks the page so you can play with the portrait.
- The "NEXT RACE" card is dropped from the first screen.
- Display type falls to 43 px max; margins 14 px; 11.9 screens.

## Tech detected
- **Webflow:** `data-wf-site`, `lando-offbrand.*.js` on the Webflow CDN; **jQuery** 3.5.1.
- **Custom bundle:** `lando.itsoffbrand.io/dev-js/lando-by-OFF+BRAND.05.js` (35 requests to that host).
- **three.js:** the `__THREE__` global.
- **Lenis:** the html class plus the global.
- **GA4.**
- **Fonts self-hosted** on the Webflow CDN.

## Clean because… / Insane because…
- **Clean because:**
  - one free sans plus one accent serif;
  - a corner-only nav;
  - a hero with one face and one card;
  - strict tokenised colours (5 core);
  - one easing curve for everything.
- **Insane because:**
  - a cursor-reactive WebGL portrait over moving contour lines;
  - a lime full-screen loader that splits away;
  - serif words dropped into sans headlines;
  - a drawn signature;
  - a background colour that morphs while you scroll;
  - a horizontal pinned photo track.

## Evidence
`shots/lando-norris/`:
- load-0_2s, load-0_6s, load-1_2s, load-2s, load-3_5s, load-6s
- first-screen
- hover-1-nav (Store), hover-2-nav (home), hover-3-card (next race), each before/after
- scroll-01 … scroll-18 (the hard cap stopped it at 18)
- phone-0 … phone-3, phone-menu-before, phone-menu-open-0_3s, phone-menu-open-1_5s (phone re-run)
- measure.json

Secondary, from the earlier board capture: `concepts/refs/shots/lando-norris-0.jpg` (portrait, loader bars), `-1.jpg`, `-2.jpg` (store section).

Awwwards: https://www.awwwards.com/sites/lando-norris (read 2026-11-05).
