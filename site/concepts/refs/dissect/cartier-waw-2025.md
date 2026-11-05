# Cartier · Watches & Wonders 2025 (NOT LIKED)
https://cartier-waw-0225.dev.60fps.fr/ · Awwwards page: Site of the Day, Aug 18, 2025 (SOTD 7.64, Dev 7.55). Credits: Immersive Garden, 60fps, mooders (sound). refs.ts says "Site of the Month, Aug 2025"; the page showed only the SOTD line · luxury

The slug is `cartier-waw-2025`, as in refs.ts; the task brief called it "cartier-ww25".

Measured 2026-11-05 with `scripts/batch-d.mjs` (lighter pass). Headless Chrome, 1440×900 and 390×844, DPR 1. The script clicked the page centre once to pass the "enter" intro, as `capture.mjs` did. Raw numbers are in `shots/cartier-waw-2025/measure.json`.

## Fonts
- **Families:** `Brilliant Cut Pro` (300, 400 and 600 loaded) and `Fancy Cut Pro` (300 and 400 loaded), self-hosted at `/assets/fonts/BrilliantCutPro-*.woff2` and `FancyCutPro-*.woff2`.
  - These are Cartier brand faces. The licence can't be verified from the site.
- **No text in the DOM:** after the intro, the DOM has 0 words, 0 headings, 0 images and 0 SVGs.
  - All type ("PANTHÈRE DE CARTIER", "TANK LOUIS CARTIER", "SON", the "Cartier" logo) is drawn in WebGL, using two 2D canvases (256² and 1024²) that look like glyph or texture atlases.
  - So the computed sizes, weights and tracking are **not observable**.
- **From the screenshots:**
  - Product names are wide caps in a light-weight sans, white at partial opacity, about 40 px cap height (`scroll-04`).
  - The intro quote is serif caps, small, at about 14 px (`load-3500`). It's in DOM at that moment, but was gone by measurement time.
- **Free equivalent:** not needed (NOT LIKED).

## Colour
No CSS colours apply (html and body are transparent, with no DOM elements). These are pixel means from the captures (`shots/batch-d-image-stats.json`):
- **Intro ground:** beige `#C8B6A6`-ish, the flat field in `load-3500`. The top 32-level bins are `#B0B090` and `#B09090`.
- **First screen after "enter":** a radial gradient, mean `#AC9D8B`, lighter in the centre (`first-screen`).
- **Rooms:** cream `#D2C2AD` (`scroll-04`); the dark "Tank" rooms are near-black brown `#22140D` (`scroll-06`), and the "joaillerie" room is `#1C1816` (`scroll-10`).
- **Accents:** gold (the product and gilded tiles) and the product's own colours.
- **Number of colours:** about 3 tones (beige, cream, dark brown) plus gold.
- **Warmth (mean R−B over 13 frames):** **+27.9**, the warmest of the rejected set.
- **Light or dark:** mostly light beige, with two dark rooms.

## Loading screen
- **0.2–2 s:** blank white.
- **3.5–6 s:** a beige screen with a two-line serif-caps quote.
  - Its words light up from white to faded (`load-3500`: the first half is bright, the second faded), so it's a word-by-word opacity reveal.
  - A thin progress hairline sits near the bottom with a "„" mark (`load-6000`, the bar about 70 % full).
- **Exit:** a gate. The page waits for a click (we clicked once), then shows an empty beige gradient with only "SON" (sound) top-left (`first-screen`).
- **Does the loader become the hero?** No.

## First screen
- **After the gate:** an empty warm-beige radial gradient with one tiny "SON" label (`first-screen`, `scroll-01`). That's 1 element.
- **Hook:** none until you scroll. The first wheel steps fly the camera into a draped room (`scroll-02`).

## Navigation
- **None:** there's no menu and no links.
- **Chrome:** "SON" (sound) top-left, the "Cartier" logo top-centre once inside the rooms, and a 7-dot vertical index on the right edge (`scroll-04`).
- **Phone:** the same, plus a "DÉFILER" (scroll) cue (`phone-0`). No menu button was found.

## Layout and grid
- **Layout:** no DOM layout; 1 screen high (`scrollHeight` 900), with scroll virtualised into a camera path.
- **Composition:** each scene is centred and symmetrical, with one product in the middle and its name below.

## Type behaviour
- **How names enter:** product names fade in from transparency, low-contrast white on cream (`scroll-04`: "PANTHÈRE DE CARTIER" half-faded).
- **Size contrast:** not measurable, because it's canvas text.

## Motion
- **Scroll:** virtual; wheel events drive the camera.
- **Camera walk:** it moves through archways and draped corridors into rooms (`scroll-02` → `scroll-05`). The rooms change material per watch: gilded tiles, leather panels, crumpled paper planes, black sand, cream sculpture (`scroll-05` … `scroll-12`).
- **Scrubbed or triggered:** scroll-scrubbed.
- **Easing:** slow, eased and cinematic.

## 3D / WebGL / media
- **WebGL2:** a single context, three.js r173 (`__THREE__`=173). The canvas isn't in the light DOM: `querySelectorAll('canvas')` returned 0 while a webgl2 context was created, so it's probably in a shadow root or detached.
- **What it renders:** fully **photo-real** 3D, with soft global light, drapes, gold and leather.
- **How central:** 100 %.

## Interaction details
- **Sound:** "SON" toggle (credited sound design by mooders).
- **Details:** the dot index; the archive photos curl around each watch (`scroll-08`).
- **Cursor:** the body cursor is `auto`; no cursor element was found.

## Phone
- **Same experience:** "Cartier / PRÉSENTE / WATCHES & WONDERS / DÉFILER" over a cream room (`phone-0`), with the products centred (`phone-1…3`).
- **Dropped:** nothing obvious, but 1–2 sentences of text total.

## Tech detected
- **three.js** r173 (`__THREE__`).
- **App bundle:** a single `sixftyfps-waw-app.js` (60fps).
- **Not present:** no framework globals, no GSAP global, no Lenis class.
- **Canvas contexts:** 2d 256×256, 2d 1024×1024, webgl2.

## Clean because… / Insane because…
- **Clean:** one object per scene, a single warm tone and almost no chrome.
- **Insane:** a walk-through of photo-real rooms.
- **Why it may have been rejected:**
  - Nothing is readable: no DOM text, and the type is faded white on beige.
  - There's a click gate.
  - Beige and gold luxury.
  - No nav.

## Evidence
`shots/cartier-waw-2025/`:
- load-0200 … load-6000
- first-screen
- scroll-01 … scroll-12
- phone-0 … phone-3
- sheet-loading, sheet-scroll, sheet-phone
- measure.json

Awwwards: https://www.awwwards.com/sites/cartier-watches-wonders-2025 (read 2026-11-05).
