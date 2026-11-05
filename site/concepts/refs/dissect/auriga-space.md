# Auriga Space (NOT LIKED)
https://www.aurigaspace.com/ · Awwwards page: Honorable Mention, Jan 12, 2026, by tonik · aerospace / defence

Measured 2026-11-05 with `scripts/batch-d.mjs` (lighter pass). Headless Chrome, 1440×900 and 390×844, DPR 1. Raw numbers are in `shots/auriga-space/measure.json`.

## Fonts
- **display:** `Univers LT` 400 (`UniversLTStd.otf` on the Webflow CDN), UPPERCASE. Univers LT Std is a Linotype/Monotype retail face.
  - The hero claim is 24 px with ls −0.96 px (−0.04em) at 1440, and 22.9 px at 390.
  - It's split into one span per letter (SplitText).
  - The giant "AURIGA" wordmark (about 1,390 px wide, `first-screen`) is not DOM text: it's an SVG or image (245 SVG elements on the page).
- **text:** `Spline Sans Mono` 400, 12 px, lh 15.6 px. It's the most-used style (3,193 chars). Spline Sans Mono is OFL on Google Fonts and self-hosted here as a variable TTF.
- **labels/nav:** Spline Sans Mono 400, 12 px, ls 0.12 px (0.01em), UPPERCASE ("TECHNOLOGY", "PRODUCTS"…).
- **mono:** yes; the mono face is the body face.
- **Free equivalent:** not needed (NOT LIKED).

## Colour
These are measured from the CSS variables.
- **ground:** off-black `#080809` (`--c-auriga--off-black`, body; the largest area). Secondary panels are `#1C1C1C`.
- **ink:** white `#FFFFFF` (4,538 chars).
- **accents:** cyan `#00CAFF` (`--c-auriga--blue`), used for "SPACE AND DEFENSE." in the hero claim, the logo mark and the category words. Space grey `#797D80`.
- **Number of colours:** 4. Awwwards lists `#080809` and `#00CAFF`.
- **Light or dark:** dark, and cold. Image warmth (mean R−B over 13 frames) is −14.1.

## Loading screen
- **0.2 s:** white.
- **0.6 s:** the black page, nav and claim are already there (`load-0600`).
- **0.6–3.5 s:** the claim and the mono sub-line type on letter by letter (`load-2000`: "…FOR SPA").
- **By 6 s:** the "AURIGA" wordmark is in (`load-6000`). It wasn't present at 3.5 s; how it entered wasn't captured.
- **Loader screen:** no full-screen loader was observed. Awwwards lists "Preloader" and "Branding (from Loading)", which may be this wordmark build.
- **Does the loader become the hero?** Yes, in the sense that the wordmark build *is* the hero.

## First screen
- **Composition:** a black field.
  - The full-width wordmark "AURIGA" sits at the top under the nav.
  - The two-line claim ("POWERING THE FUTURE OF PROPULSION FOR SPACE AND DEFENSE.", the last words cyan) sits bottom-left.
  - The mono sub-line sits bottom-centre and a "SEE OUR PRODUCTS" button bottom-right.
  - A strip of sky footage peeks in at the bottom edge.
- **About 9 elements.**

## Navigation
- **Type:** a thin bar 32 px high, fixed.
  - The logo mark is left, and 5 mono caps links are spread evenly across the full width: "TECHNOLOGY", "PRODUCTS", "CAREERS", "NEWS & MEDIA", "CONTACT".
- **On scroll:** it stays fixed and visible.
- **Phone:** a bottom bar with the logo and a "MENU" pill (`phone-0…3`). Our menu probe only looked in the top 140 px, so the menu was **not opened**.

## Layout and grid
- **Margins:** text starts at x 24 at 1440 and 15 px at 390.
- **Columns:** full-bleed. The footer columns use `max-width: 960px`.
- **Page length:** 11,456 px = **12.7 screens** at 1440, and 12.1 at 390.
- **Rhythm:**
  - Hero.
  - Footage in a frame with corner brackets, opening on a cross-hair hairline (`scroll-02…05`).
  - A logo strip of defence programmes.
  - A "LATEST NEWS" ticker.
  - "ELECTROMAGNETIC LAUNCH" in two columns.
  - Bracket-framed footage tiles with vertical "AURIGA" / "FOR SPACE APPLICATIONS" labels (`scroll-12`).

## Type behaviour
- **How headings enter:** letter-by-letter type-on (SplitText char spans; `load-2000` shows half-typed lines).
- **Size contrast:** DOM type is 24 px vs 12 px = 2 : 1. Counting the SVG wordmark (about 165 px cap height, read from the screenshot) it's about 14 : 1.
- **Case:** all UPPERCASE.

## Motion
- **Smooth scroll:** yes, Lenis (`html.lenis lenis-smooth`).
- **Scroll mechanics:** GSAP plus ScrollTrigger.
- **The footage frame:** it grows from a small bracketed box to full width as you scroll (`scroll-02` → `scroll-05`), and a vertical hairline runs through the centre.
- **Scrubbed or triggered:** scrubbed.
- **refs.ts move:** numbered steps (Charge, Accelerate, Launch) with videos. The `Charge_mp4`, `accelerate_mp4` and `Launch_mp4` videos are in the DOM, but those steps lie beyond our 12 capture steps.

## 3D / WebGL / media
- **No WebGL** (0 canvases, no contexts).
- **Video:** 12 `video` elements (autoplay loop): launch footage, defence and space clips, and a `footer-symbol.webm`.
- **Images:** 53. The media is real footage and photos.

## Interaction details
- **Frames:** corner-bracket frames on the media; a cross-hair hairline; bracketed button labels "[ CLOSE ]".
- **Text:** a news ticker; the cyan accent words.
- **Cursor:** default.

## Phone
- **First screen:** the wordmark is stacked over the claim and CTA, with a footage strip below (`phone-0`).
- **Nav:** moves to a bottom bar.
- **Elsewhere:** the bracket frames stay.

## Tech detected
- **Webflow:** `meta generator` Webflow, `w-mod-*` classes and the Webflow CDN.
- **jQuery** 3.5.1.
- **GSAP**, ScrollTrigger and SplitText (all globals).
- **Lenis.**
- **Other:** Finsweet attributes (`fs-components.js`), Plyr, BugHerd, GTM, Plausible.

## Clean because… / Insane because…
- **Clean:** black, white and one accent; mono labels; strict columns.
- **Insane:** mild. A bracketed footage frame opens to full width.
- **Note:** this is the rejected site **closest to the liked ones** (dark, technical, mono, hairlines, like anime-js, igloo and terminal). So "dark tech" itself is not what the owner rejected.
  - The measurable differences are a small DOM type scale (24 px max) and no 3D or line-drawing object.
  - It also has the most generic Webflow corporate sections below the fold: a logo strip, a news ticker, two-column text.

## Evidence
`shots/auriga-space/`:
- load-0200 … load-6000
- first-screen
- scroll-01 … scroll-12
- phone-0 … phone-3
- sheet-loading, sheet-scroll, sheet-phone
- measure.json

Awwwards: https://www.awwwards.com/sites/auriga-space (read 2026-11-05).
