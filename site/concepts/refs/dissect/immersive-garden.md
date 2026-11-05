# Immersive Garden (NOT LIKED)
https://immersive-g.com/ · Awwwards page: Site of the Day, Jan 7, 2025 (score 8/10, Dev 7.5), by Immersive Garden. refs.ts says "Site of the Month, Jan 2025"; the page showed only the SOTD line · studio

Measured 2026-11-05 with `scripts/batch-d.mjs` (lighter pass). Headless Chrome, 1440×900 and 390×844, DPR 1. The script clicked the page centre once, as `capture.mjs` did. Raw numbers are in `shots/immersive-garden/measure.json`.

This time the bas-relief **did** render, unlike the earlier board capture, which was blank.

## Fonts
- **display / text:** `PSTimes` 400 (`PSTimes-Regular.*.woff2`, self-hosted). The foundry and licence weren't verified.
  - It's used for everything large: hero line 28 px, statements 36 px (the most-used style, 2,178 chars), "See all projects" 44 px. Sentence case, tracking normal, lh 1.2.
  - At 390 it's 28 and 34 px.
- **labels/nav:** `HelveticaNeueRegular` 14 px ("Menu", "Scroll down", "See all projects"). A `HelveticaNeueLight` face is declared too. Helvetica Neue is a Linotype retail face.
- **logo:** the "IMMERSIVE GARDEN" wordmark is small tracked caps, an image or SVG.
- **mono:** none.
- **Free equivalent:** not needed (NOT LIKED).

## Colour
- **ground:** body `#E8E8E8` (light grey). The WebGL relief is white plaster on that ground.
- **ink:** near-black `#030303`.
- **accents:** none in CSS. Colour comes only from the project images (a Louis Vuitton desert, the David Whyte watercolours).
- **Awwwards palette:** `#000000`, `#C2C2C2`.
- **Number of colours:** 2.
- **Image stats (13 frames):** saturation 2.4 %, warmth 0.3 (neutral grey), luma 182, spread 26.8.

## Loading screen
- **Yes, about 6 s.**
- **0.2 s:** white.
- **0.6–2 s:** flat grey `#E8E8E8`.
- **By 3.5 s:** one line across the middle: the logo left, "Innovative digital experiences studio" centre (fading in left to right), and a counter on the right (`load-3500`, `load-6000`). DOM: `introLoader` with `__logo`, `__progressWrapper`, `__progressBar`, `__baseline`.
- **Exit:** after the gate click, the white plaster relief (birds, flowers) rises out of the grey ground around the same line (`first-screen`).
- **Does the loader become the hero?** **Yes.** The loader line stays as the hero line.

## First screen
- **Composition:** one thin line across the middle: the logo, "Innovative digital experiences studio" (28 px), and "Scroll down". Around it, white-on-white bas-relief flowers and birds.
- **Corners:** "Menu" top-right, "See all projects" bottom-left, a progress ring bottom-right.
- **About 6 elements.**
- **Hook:** white relief on a white wall, so it's very low contrast.

## Navigation
- **Type:** minimal corners. "Menu" only (`nav.headerBlock__menu`, absolute, 96 px area).
- **On scroll:** it stays (virtual scroll; the page never moves).
- **Phone:** "Menu" top-right. The phone menu tap fired, but `phone-menu` shows only a fade of the content, so the overlay wasn't captured open.

## Layout and grid
- **Scroll:** virtual (`scrollHeight` 900 = 1 screen). Wheel events move the content.
- **Margins:** 40 px at 1440 and 32 px at 390.
- **Rhythm:** one statement per screen, alternating left, centre and right. Project images appear in small framed windows (`scroll-03`, `scroll-06`, `scroll-10`), with relief sculptures between them.
- **Content:** 327 words.

## Type behaviour
- **How headings enter:** they **dissolve into and out of the relief**. In `scroll-01`, "Transcend anything seen or felt before…" has letters eaten away where the relief passes (a mask or displacement), and statements pass through a soft blurred state (`scroll-04`: "A global leader…" half-dissolved).
- **Size contrast:** 44 / 14 = 3.1 : 1. The first screen is 28 vs 14 = 2 : 1.
- **Case:** sentence case.

## Motion
- **Scroll:** a custom virtual scroll (no Lenis class).
- **Camera:** the relief wall slides and the camera drifts. Project windows pass through.
- **Awwwards elements:** "Bas-relief" (interaction), "Menu Transition", "Rapid Scroll feature".
- **Easing:** slow and soft.

## 3D / WebGL / media
- **WebGL:** three.js r151, with a full-viewport WebGL canvas plus 11 small canvases (22 px and 30 px: loaders and icons).
- **What it renders:** a **photo-real plaster bas-relief** (flowers, birds, animals).
- **How central:** central.
- **Media:** no `video`; 39 images.

## Interaction details
- **Cursor:** a custom cursor (`.cursor`, `.cursor__follow`, `.cursor__ease`, fixed; a `scrollCursor` element).
- **Sound:** Howler.js is loaded; the phone shows an "On" sound toggle.
- **Details:** a progress ring in the corner.

## Phone
- **First screen:** the hero line stacks (logo, then "Innovative digital experiences studio" in 28 px serif) over the relief birds (`phone-0`).
- **Statements:** 28 px serif, in a single centred column (`phone-1…3`).

## Tech detected
- **Nuxt / Vue:** `__NUXT__`, `useNuxtApp`, `__VUE__`.
- **three.js** r151 and Howler.
- **Content:** Contentful (Awwwards).
- **Other:** GTM.
- **Not present:** no GSAP global.

## Clean because… / Insane because…
- **Clean:** one serif, one grey, a statement per screen, corner-only chrome.
- **Insane:** a sculpted plaster relief that reacts and dissolves text.
- **Why it may have been rejected:**
  - Grey-on-grey, the lowest-saturation site.
  - Small serif type (28 px hero).
  - Text that dissolves.
  - A soft, realistic sculpture.
  - Almost no hierarchy.

## Evidence
`shots/immersive-garden/`:
- load-0200 … load-6000
- first-screen
- scroll-01 … scroll-12
- phone-0 … phone-3, phone-menu
- sheet-loading, sheet-scroll, sheet-phone
- measure.json

Awwwards: https://www.awwwards.com/sites/immersive-garden-website (read 2026-11-05).
