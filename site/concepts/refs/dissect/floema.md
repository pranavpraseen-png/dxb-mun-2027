# Floema (NOT LIKED)
https://www.floema.com/en (it redirects to floema.com/en) · Awwwards page: Site of the Day, May 13, 2026 (SOTD 7.65, Dev 7.67), by Bürocratik. refs.ts says "Site of the Month, May 2026"; the page showed only the SOTD line · architecture / urban furniture

Measured 2026-11-05 with `scripts/batch-d.mjs` (lighter pass). Headless Chrome, 1440×900 and 390×844, DPR 1. The cookie banner was declined ("Deny"). Raw numbers are in `shots/floema/measure.json`.

## Fonts
- **One family for everything:** `Zimula`, a variable TTF (`Zimula-Variable.*.ttf`, self-hosted), weight 400 only. The foundry and licence weren't verified.
- **display:** 57.2 px at 1440 and 32 px at 390, lh 1.05, tracking −2.29 px (−0.04em), sentence case, `#241F21`. The secondary display is 51 px and 43.75 px (ls −0.04em).
- **text:** 15.15 px, ls −0.02em, lh 1.4. Also 14, 16 and 18 px.
- **labels/nav:** 12 px, ls −0.24 px, UPPERCASE, inside white pill buttons.
- **mono:** none.
- **Free equivalent:** not needed (NOT LIKED).

## Colour
These are measured from the CSS variables and computed styles.
- **ground:** bright ivory `#F2EFEA` (`--color-brightIvory50`, body; the largest area).
- **ink:** stone brown `#241F21` (`--color-stoneBrown800`, 1,201 chars). Secondary `#988F8B`.
- **accents:** flour yellow `#E9E778` (the cookie and chat button, and some text), urban coral `#F76C46` (the "Urban" tag and the catalogue cover), golf celadon `#BACFA3`, replastic vista blue `#85A1C5`, and nature kraft `#C6AF88` (per-category tags). Awwwards lists `#E9E778` and `#241F21`.
- **Number of colours:** a 23-variable palette; about 6 visible on the homepage.
- **Light or dark:** it opens light ivory, then dark photo sections with a grey overlay (`scroll-02…12`).
- **Image warmth:** mean R−B is +8.1.

## Loading screen
- **Partly observed:** the headless page didn't commit its document until 6.6 s (domcontentloaded at 6,627 ms), so the frames labelled 0.6–6 s were actually taken at 5.9–6.8 s.
- **What they show:** white (`load-0200`), then a flat ivory `#F2EFEA` with nothing on it (`load-0600` … `load-6000`).
- **Then:** the image cloud and headline appear (`first-screen`, about 9 s). The transition between them wasn't captured.
- **Awwwards element list:** "Homepage Header"; no preloader is listed.

## First screen
- **Composition:** one centred sentence ("Spaces for people, made for life.", 57 px). Around it, about 35 small product photos and cut-outs float at different depths and opacities: near ones are sharp, far ones faded (`first-screen`).
- **Chrome:** the logo and search top-left, 4 pill links and "EN" top-right, and a yellow round button bottom-left.
- **Hook:** the same "image cloud around a centred line" idea as Getty (LIKED). But here the images are pale, low-contrast product shots on ivory.

## Navigation
- **Type:** a top bar.
  - The `nav` is fixed, 86 px high, with a transparent background.
  - Items: logo, search, then "PRODUCTS", "ABOUT", "SUSTAINABILITY", "JOURNAL" as white pills, then "EN".
- **On scroll:** it stays fixed and visible at every step (`navTop` 0).
- **Phone:** logo, "EN" and a hamburger plus search pill. It opens a full-screen ivory overlay with a search field, 4 large links (about 26 px) and a two-column footer list (`phone-menu`).

## Layout and grid
- **Width:** full-bleed, no max-width. Text starts at x 32 (right edge 50) at 1440, and 16 px at 390.
- **Columns:** a counter column at x 30, a text column at x 370, and a card at the right.
- **Page length:** 14,381 px = **16 screens** at 1440, and 18.8 at 390.
- **Sections:** full-screen photo sections, numbered "01 Urban", "02 Nature", "03 Replastic". Each has a 51 px headline, a pill CTA and a "Scroll to Explore ↓".

## Type behaviour
- **How headlines enter:** they appear without visible splitting in the captures (`scroll-02` … `scroll-12`), and change with each section.
- **Size contrast:** 57.2 / 15.15 = **3.8 : 1**.
- **Case:** sentence case.

## Motion
- **Smooth scroll:** yes, Lenis (`html.lenis`).
- **Hero:** the image cloud is WebGL. three.js r181 is present, with 3 full-width canvases (1440×900, 1440×1048 and 1440×450).
- **Sections:** the photo sections cross-fade or wipe from one category to the next (`scroll-04` → `scroll-05`, where the boundary is a horizontal edge).
- **Scrubbed or triggered:** the transitions look scrubbed.
- **Awwwards elements:** "Scroll video zooming", "Sustainability Material 3D" and "Sustainability Scroll Interaction".

## 3D / WebGL / media
- **WebGL:** image planes in depth (the hero cloud). 65 `img` and 53 SVG; no `video` elements on the homepage at load.
- **Hook gap:** our context hook logged no `getContext` calls, though 3 canvases exist. The contexts may come from a worker or OffscreenCanvas; this wasn't verified.

## Interaction details
- **Cursor:** default; no custom cursor.
- **Details:** a numbered section counter ("01"); category pills with icons; a floating "Urban Catalogue" download card bottom-right (`scroll-02`).

## Phone
- **First screen:** the same centred sentence (32 px) with floating tiles (`phone-0`).
- **Sections:** stacked photo sections with the same pills (`phone-1…3`).
- **Menu:** the full-screen ivory overlay.

## Tech detected
- **Nuxt / Vue:** `useNuxtApp`, `__VUE__`, `#__nuxt`, `data-v-`.
- **three.js** r181.
- **Lenis:** `html.lenis`.
- **Other:** Cookiebot, GTM, Meta pixel, Umami, Plausible.
- **Not present:** no `window.gsap` global (Awwwards lists GSAP; it's likely bundled).

## Clean because… / Insane because…
- **Clean:** one family at one weight, an ivory ground, one sentence in the hero.
- **Insane:** photos and 3D swirling in depth around the line.
- **Why it may have been rejected:**
  - The rest of the page is a generic photo-with-dark-overlay template: grey-veiled photos, pill buttons, a catalogue card.
  - It reads as a product catalogue, not an event.

## Evidence
`shots/floema/`:
- load-0200 … load-6000
- first-screen
- scroll-01 … scroll-12
- phone-0 … phone-3, phone-menu
- sheet-loading, sheet-scroll, sheet-phone
- measure.json

Awwwards: https://www.awwwards.com/sites/floema (read 2026-11-05).
