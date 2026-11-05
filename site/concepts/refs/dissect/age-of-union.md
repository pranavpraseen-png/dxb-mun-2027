# Age of Union (NOT LIKED)
https://ageofunion.com/ · Awwwards page: Site of the Day, Oct 20, 2022 (SOTD 7.63, Dev 7.53), by Locomotive · NGO / conservation

Measured 2026-11-05 with `scripts/batch-d.mjs` (lighter pass). Headless Chrome, 1440×900 and 390×844, DPR 1. Raw numbers are in `shots/age-of-union/measure.json`.

## Fonts
- **One family:** `FoundersGrotesk` (Klim Type Foundry, retail), weights 400 and 500, self-hosted.
- **display:** 500 UPPERCASE, with tight tracking.
  - "THIS IS THE DECADE OF ACTION": 156 px, ls −7.02 px (−0.045em), lh 0.72.
  - "YANUNI": 100 px. "ABOUT": 67.5 px.
  - The first-screen headline is 40 px, lh 0.9.
  - At 390: 49 px max, and 21 px for the first-screen headline.
- **text:** 400; the sizes are 16, 20 and 22 px, and a 60 px manifesto paragraph. lh 1.3.
- **labels/nav:** 500 UPPERCASE.
  - The nav is 26 px, ls −0.78 px ("AGE OF UNION", "MENU", "PROJECTS").
  - Dates are 12 px in coral; category tags ("FILM") are 16 px.
- **mono:** none.
- **Free equivalent:** not needed (NOT LIKED).

## Colour
- **ground:** light grey `#F2F2F2` (html). There's a large `#D6D6CD` painted area, which is the menu or overlay layer, not visible in the first screen.
- **ink:** black `#000000` (3,279 chars).
- **accents:** coral `#DB4B2D` (the loader screen, the fixed header bar, dates, 345 chars). Awwwards lists `#000`, `#D14836`, `#FFFFFF`.
- **Rules:** heavy black (15 bordered elements; thick rules visible in every scroll frame).
- **Number of colours:** 3 plus photos.
- **Light or dark:** light. It has the highest edge density of all 18 sites (mean gradient 37.2 and 24 % hard-edge pixels; next is Siena at 23.4 and 14 %).

## Loading screen
- **Yes, about 4–5 s.**
- **0.2 s:** white.
- **0.6–3.5 s:** a full coral screen with a huge "AGE OF UNION" wordmark in pale grey along the bottom edge (`load-0600`…`load-3500`, `c-preloader`).
- **By 6 s:** a cut to the newspaper homepage (`load-6000`).
- **Does the loader become the hero?** Partly. The same wordmark sits at the top of the page (black, smaller), but the change was a cut, not a morph (none caught between frames).

## First screen
- **Composition:** a newspaper front page (`first-screen`).
  - A thin top line: "AGE OF UNION · MENU · PROJECTS".
  - A thick black rule, then the full-width black wordmark.
  - A three-column block: a film poster photo; a 40 px headline, a paragraph, "FILM" and a date, and "MORE →"; and an "ARTICLES (115)" list of 4 thumbnails with titles and dates.
- **About 20+ elements.**
- **Hook:** density and heavy rules.

## Navigation
- **Type:** three words in the top line: "AGE OF UNION" left, "MENU" centre, "PROJECTS" right (26 px caps).
  - Once scrolled, the fixed `header.c-header -fixed` is a **coral** bar (`#DB4B2D`, 60 px). It sat at top −60 px (hidden) at every scroll step down, so it shows only on scroll-up (not captured).
- **Phone:** a black "PROJECTS" bar on top, then "MENU", then the wordmark (`phone-0`). The menu tap targeted y −22 (the hidden header), so it was **not opened**.

## Layout and grid
- **Width:** full-bleed. Margins are 20 px left and 35 px right at 1440, and 18 px at 390.
- **Columns:** about 4 (column starts at x 20, 540, 1180, 1310).
- **Page length:** 9,112 px = **10.1 screens** (11.6 at 390).
- **Rhythm:**
  - The newspaper hero.
  - "FILMS (15) / YANUNI", with T-shaped rules dividing sections (`scroll-01…03`).
  - A staggered photo grid of articles.
  - "STORIES OF CHANGE AND DIRECT ACTION" centred between photos.
  - "THIS IS THE DECADE OF ACTION" (156 px).
  - The manifesto at 60 px with a world-map loop.
  - Satellite Earth imagery and "IGNITING PROJECTS AROUND THE…" (`scroll-12`).

## Type behaviour
- **How headings enter:** headings scroll into place; a centred block slides between photos (`scroll-05/06`). No char splitting was seen.
- **Size contrast:** 156 / 16 = **9.75 : 1** on the page, and 40 / 16 = 2.5 : 1 on the first screen.
- **Case:** headings UPPERCASE, text sentence case.

## Motion
- **Smooth scroll:** yes, Lenis (`html.lenis lenis-smooth`). Awwwards lists Locomotive Scroll; no `[data-scroll-container]` was found, so this build uses Lenis.
- **Other motion:** GSAP (a global) for reveals. Photos are staggered at different speeds (parallax, `scroll-04/05`).
- **refs.ts move** (a hover row inverts and a photo follows the cursor): not tested (no hover pass).

## 3D / WebGL / media
- **No WebGL** (0 canvases).
- **Media:** 2 looping videos (a manifesto loop and a world-map loop) and 24 images. It's photo-led throughout.

## Interaction details
- **Navigation:** T-junction section rules; count labels ("ARTICLES (115)", "FILMS (15)"); "MORE →" links.
- **Text:** coral dates.
- **Cursor:** default.

## Phone
- **Layout:** a single column with the same rules.
- **First screen:** the poster photo first, then the headline (`phone-0`).
- **Below:** photo-heavy (`phone-1…3`).

## Tech detected
- **WordPress** (`wp-content` theme `ageofunion`), with **Vue** (a global), **GSAP** (a global), jQuery and Lenis.
- **Other:** reCAPTCHA, Meta pixel, GTM, Cloudflare Insights. Awwwards also lists Swiper.js.

## Clean because… / Insane because…
- **Clean:** one grotesk, black and coral, ruled like a newspaper.
- **Insane:** a hover-follow photo per row (per refs.ts; not verified here).
- **Why it may have been rejected:**
  - The **densest** page of all 18: many photos, a lot of copy, 30 headings.
  - It reads as a news/magazine homepage.
  - Activist photography.
  - No single "one move".

## Evidence
`shots/age-of-union/`:
- load-0200 … load-6000
- first-screen
- scroll-01 … scroll-12
- phone-0 … phone-3, phone-menu (menu not opened)
- sheet-loading, sheet-scroll, sheet-phone
- measure.json

Awwwards: https://www.awwwards.com/sites/age-of-union (read 2026-11-05).
