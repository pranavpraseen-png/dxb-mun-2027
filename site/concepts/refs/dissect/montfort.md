# Montfort (NOT LIKED)
https://mont-fort.com/ · Awwwards page: Site of the Day, Jun 23, 2025 (SOTD 7.62, Dev 7.84), by Immersive Garden. refs.ts says "Site of the Month, Jun 2025"; the page read on 2026-11-05 showed only the SOTD line · finance / commodities

Measured 2026-11-05 with `scripts/batch-d.mjs` (lighter pass: no hover pass). Headless Chrome, 1440×900 and 390×844, DPR 1. Raw numbers are in `shots/montfort/measure.json`.

## Fonts
- **display (wordmark "MONTFORT"):** `Josefin Sans` 300, uppercase, 62 px at 1440 (18 px at 390), tracking 19.84 px (0.32em), colour `#2D628C`. Self-hosted (`/assets/fonts/JosefinSans-*.woff2`). Josefin Sans is OFL on Google Fonts.
- **headlines:** `Century Gothic` 400, uppercase.
  - 50 px (ls 2.24 px) and 40 px (ls 1.6 px) at 1440; the statements are split into one span per letter ("M", "O"…).
  - 36 px (ls 1.44 px) at 390.
  - Century Gothic is a Monotype retail face; the files are self-hosted (`CenturyGothic*.woff2`).
- **text:** Century Gothic 400, 16 px, ls 1.28 px (0.08em), lh 25.6 px, white on the cloud scenes. The 24 px lead is ls 0.48 px.
- **labels/nav:** Century Gothic 400, 12 px, ls 0.48 px, UPPERCASE, `#2D628C`. Kickers: 14 px 700, ls 3.36 px (0.24em), UPPERCASE ("WHO WE ARE").
- **mono:** none.
- **Free equivalent:** not needed, because this site is NOT LIKED and none of its fonts go into the theme.
  - If ever wanted: Josefin Sans is already free.
  - For Century Gothic, use TeX Gyre Adventor (GUST licence). It's an ITC Avant Garde Gothic clone, the design Century Gothic was drawn to match.

## Colour
- **ground:** no CSS ground; html and body are transparent, and the whole ground is the WebGL canvas.
  - Captures average `#D7DFE6` (pale cold mist) on screens 1–6, then darken to about `#677783` (slate storm cloud) on screens 7–12.
  - These are pixel means from `shots/batch-d-image-stats.json`, not CSS values.
- **ink:** `#2D628C` (Awwwards lists `#29648E`) on light cloud. White `#FFFFFF` (4,789 chars, the most-used text colour) on the dark cloud. Secondary `#81A0BB`.
- **accents:** none beyond the blue. The tint `#A9BFD2` at 30 % fills small chips.
- **Number of colours:** 2 (blue and white), plus a blue-grey tint.
- **Light or dark:** it opens pale and turns stormy grey-blue. Image warmth (mean R−B) is **−20**, the coldest of the 7 rejected sites after Auriga.

## Loading screen
- **No loader screen.** It's pure white from 0.2 s to 3.5 s (`load-0200` … `load-3500`).
- **At 6 s:** the full scene (mountain, clouds, wordmark, nav) is there (`load-6000`). It fades in from white; the in-between frame wasn't captured.
- **Does the loader become the hero?** No. There's nothing to carry over.

## First screen
- **Composition:** a photo-real snowy peak rises out of a cloud sea, filling the frame (`first-screen`).
  - Logo mark plus "MONTFORT" in wide, thin caps, left of centre at y≈450.
  - The nav is a thin caps line at the top.
  - "SCROLL DOWN TO DISCOVER" sits bottom-left, with a short hairline bottom-right.
- **About 9 elements.**
- **Hook:** mist and mountain. Everything is pale blue on pale grey, so the contrast is low.

## Navigation
- **Type:** a top bar with 5 division links left ("MONTFORT GROUP", "TRADING", "CAPITAL", "MARITIME", "FORT ENERGY"), and "NEWS" with a "29" badge plus "MENU" and two dots on the right.
  - The `header` is fixed: top 80 px, height 82 px, 7 items.
- **On scroll:** the header is no longer visible from the first scroll step onward (`navVisible` false at steps 1–12, and no nav in `scroll-01…12`).
- **Menu open animation:** not captured. On the phone, the "MENU" tap (at 310,64) didn't produce a visible overlay in `phone-menu`.

## Layout and grid
- **Width:** the menu container has `max-width: 1920px`. Text starts at x=196 at 1440 (a 196 px left margin) and 32 px at 390.
- **Page length:** 16,896 px = **18.8 screens** at 1440 and 19.6 at 390. The 12 captured steps cover only screens 1–7.
- **Layout:** one statement per screen, alternating left and right blocks over the cloud.
- **Whitespace:** very large, and mostly cloud.

## Type behaviour
- Headlines are split into one span per letter (letters are measured as separate "M", "O" nodes).
- In `scroll-02` and `scroll-05`, the lower lines of a statement are still pale while the upper lines are full blue, so it's a line-by-line or letter fade-in.
- **Size contrast:** largest 62 px vs body 16 px = **3.9 : 1**. All caps for headlines.

## Motion
- **Smooth scroll:** yes, Lenis (`html.lenis`).
- **Scroll mechanics:** the camera descends through the clouds as you scroll (`scroll-01` → `scroll-07`: the peak sinks and the cloud thickens). Then a ship sails across a storm sea, with a diamond marker and a thin line (`scroll-08` … `scroll-12`).
- **Scrubbed or triggered:** the camera is scroll-scrubbed. Text fades in.
- **Page transitions:** an Astro `ClientRouter` script is present, so there are SPA transitions.

## 3D / WebGL / media
- **WebGL2:** one full-viewport canvas (1440×900), three.js r169 (`__THREE__`=169).
- **What it renders:** photo-real mountains, volumetric-looking clouds and a ship.
- **How central:** totally central. The scene is the whole page; there are 17 images and no videos.

## Interaction details
- **Cursor:** a custom cursor element (`div.cursor`, fixed); the body cursor is `auto`.
- **Small details:** a news count badge "29"; a hairline under the active nav item; diamond waypoint markers in the sea scenes.
- **Sound:** not observed.

## Phone
- **First screen:** the peak and the centred stacked logo, with "SWIPE DOWN" (`phone-0`).
- **Statements:** set as 36 px caps blocks, one per screen (`phone-1…3`).
- **Nav:** collapses to "MONTFORT GROUP · 29 · MENU".
- **Same on both:** the WebGL scene stays.

## Tech detected
- **Astro 7.4.5:** the `meta generator` tag and the script names `ClientRouter.astro`, `WebGL.astro`, `ChaptersNavigation.astro`.
- **three.js** r169.
- **Lenis:** `html.lenis`.
- **Other:** Cookiebot, GTM, Cloudflare Insights.
- **Not present:** no `window.gsap` global.

## Clean because… / Insane because…
- **Clean:** two colours; one statement per screen; thin caps throughout.
- **Insane:** a continuous camera fly-through from the peak to the sea in WebGL.
- **Why it may have been rejected:**
  - It's pale-on-pale with low contrast.
  - The display is thin and wide-tracked.
  - The hero is atmospheric, all mist and nature.
  - The nav disappears once you scroll.

## Evidence
`shots/montfort/`:
- load-0200, load-0600, load-1200, load-2000, load-3500, load-6000
- first-screen
- scroll-01 … scroll-12
- phone-0 … phone-3, phone-menu
- sheet-loading, sheet-scroll, sheet-phone (contact sheets)
- measure.json

Awwwards: https://www.awwwards.com/sites/montfort (read 2026-11-05). Image stats: `shots/batch-d-image-stats.json`.
