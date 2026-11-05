# ERA Residence (LIKED)
https://www.era-residence.com/ · Awwwards page text: "Site of the Day - Aug 31, 2026", SOTD 7.61, Dev 7.31; by The First The Last (with Maksym Stepenko, Ivan Chopei). refs.ts lists "SOTM Aug 2026": the page text did not show a SOTM line, so that label is unconfirmed here · architecture / real estate

Measured 2026-11-05 with `scripts/batch-b.mjs` (headless Chrome 1440×900 and 390×844, DPR 1). Raw numbers: `shots/era-residence/measure.json`.

## Fonts
The site scales all type with the viewport: CSS tokens are written for a 1600 px canvas (`calc(192rem/16)`), and at 1440 everything renders at 0.9× (html font-size 14.4 px). At 390 the factor is about 0.47 for display and 1.04 for text.

- **display:** `ambroise-francois-std` (Adobe Fonts kit `pig8glj`). The font file's name table says "Ambroise Std Francois, 2001-2018 Copyright Jean Francois Porchez, Typofonderie", EULA fonts.adobe.com. This is Ambroise François, the condensed width of Ambroise: a high-contrast, very condensed Didone. **Retail** (Adobe Fonts / Typofonderie).
  - weight 400 only, always `uppercase`.
  - Tokens: h1 192/87.5%/-0.024em, h2 136, h3 96, h4 63/-0.016em, h5 40/-0.008em, h6 28/0.
  - Rendered at 1440: 172.8 px (lh 150.3, ls -4.15 px), 122.4, 86.4, 56.7 (ls -0.91), 36 (ls -0.29), 25.2 (button label), and 22.5 px with 18 px tracking (0.8em, the spaced-out "C O S T A   D E L   S O L").
  - Rendered at 390: 90, 68.4, 52.5, 37.5, 26.25, and 17.8 px with 14.25 px tracking.
- **accent script:** `sloop-script-three` (Adobe Fonts). The name table says "SloopScriptThree, © 1994 The Font Bureau, Inc., designed by Richard Lipton". **Retail.**
  - 400, mixed case.
  - Tokens a1 192 / a2 120. Rendered at 1440: 172.8 (a ghost "Estepona" behind the loader), 108 ("yours"), 57.6 ("Estepona" under the wordmark). At 390: 90, 67.5, 45.
  - Always overlaps a capital headline (it swashes through "THIS YEAR").
- **text:** `"Maison Neue Extended", Arial`. The font file's name table says "Maison Neue Ext Book/Bold, © 2020-2023 Monotype Imaging Inc., designer Timo Gaessner, vendor MONO". **Retail** (Monotype / Milieu Grotesque).
  - Self-hosted on the Webflow CDN as `MaisonNeueExt-Book.woff2` (400) and `-Bold.woff2` (700).
  - Paragraph p1: 13 px token, rendered 11.7 px at 1440 and 12.19 px at 390; lh 138%; ls -0.024em; sentence case; centred.
- **labels/nav:** Maison Neue Extended 700, `uppercase`.
  - l1: 11 px token, rendered 9.9 px, ls 0.048em (0.475 px), lh 145%.
  - l2: 9 px token, rendered 8.1 px, ls 0.32em (2.59 px), used for "BOOK A CALL" and "CONTACT".
  - The nav's "SELECT AN APARTMENT" is set in the display face at 25.2 px, underlined.
- **mono:** none.
- **Free equivalents we can legally ship:**
  - **Ambroise François → Instrument Serif** (OFL, Google Fonts). It's the only free display serif with similarly condensed proportions and Didone-style contrast, and it sets well in caps. It's a little wider and has less contrast, so tighten it to -0.03em. For more contrast but no condensing, use Bodoni Moda (OFL).
  - **Sloop Script → Pinyon Script** (OFL, Google). Both are engraved roundhand with hairline entry strokes and a steep slant. Great Vibes (OFL) is the looser second choice.
  - **Maison Neue Extended → Archivo at wdth 112–125** (OFL, Google, variable width axis). It's the closest free extended neo-grotesk with flat terminals; the caps labels match well at 700.

## Colour
All values are measured (computed styles and Webflow variables). Names come from the site's own variables.

- **ground:**
  - velvet plum `#340C24`: loader, hero and dark sections; the largest area on the first 10 screens.
  - cream `#F3F3EC`: `html` background, light sections.
  - powder sky `#B5CEDB`: the "brand" sections.
- **ink:** deep navy `#17233B` (`base-1000`), used for all text on light grounds, with alpha steps 99/4D/1A/0D (60/30/10/5 %).
  - Text on dark is cream `#F3F3EC` or `#FFFFFF` on photos, with white alpha steps CC/66/33/1A.
- **accents:**
  - blush bloom `#F8BBCB`: defined as a brand variable, but no element used it in the 1440 capture.
  - The real accent is the magenta bougainvillea footage (video), not a CSS colour.
  - Status colours exist but aren't seen on the homepage: success `#1BA64B`, alert `#FFA800`, error `#E23D3D`.
- **Number of colours:** 4 core (plum, cream, navy, powder sky) plus white.
- **Light or dark:** mixed. It opens dark (plum), then alternates plum → sky → cream → plum, each section a solid block. Hairlines are ink at 10 % (`#17233B1A`) or cream at 10 %.
- **Awwwards palette:** `#B5CEDB`, `#F8BBCB` (it agrees with the variables).

## Loading screen
- **Yes, about 6 s, then about 3 s more for the arch.**
- **0–2.0 s:** solid plum `#340C24`, nothing else (`load-0_2s` … `load-2s`; confirmed by the load-only re-run, where all four frames are the same 8,456-byte plain-plum image).
- **About 3.5 s:** the title builds.
  - The ornament logo is centred top. "ERA" sets in first; "RESIDENCE" and the script "Estepona" are half-drawn.
  - The letters fade in one by one, with SplitText (`split-word` / char spans).
  - "C O S T A" (left) and "D E L  S O L" (right) are tracked out at 0.8em; a vertical hairline and the caption "ERA RESIDENCE / A PLACE TO RETURN TO." sit below (`load-3_5s`).
- **6 s:** the full title card.
  - An octagonal (chamfered-corner) 1 px inset frame sits about 22 px from the edges.
  - A giant ghost "Estepona" script, in plum one step lighter, fills the background (`load-6s`).
- **Exit:** an arched window with a double hairline arch rises from the bottom over the title and shows the pool photo (`first-screen`, about 9 s).
- **The loader becomes the hero:** the arch then widens to full bleed, and the same wordmark reappears at giant size in white over the photo.
  - This happens **on its own, without scrolling**: the re-run's `first-screen.jpg`, taken about 50 s after load with no scroll, already shows the full-bleed hero. In the first run it was reached by the first wheel step.
  - The wordmark is set in split chars at 172.8 px with `font-feature-settings:"case"`.
  - The preloader is a `position:fixed` div 1440×1800 holding the hero wordmark.

## First screen
- **Composition:** after the reveal, a full-bleed photo.
  - The giant white wordmark "ERA RESIDENCE" (display face, about 470 px wide) sits top-centre, with the script "Estepona" swashing through it.
  - "A PLACE" (left) and "TO RETURN TO" (right) are split across the width.
  - A "BY DAY —— BY NIGHT" toggle sits under the wordmark.
  - A circular rotating-text logo ("ERA RESIDENCE" round the ornament) is top-left; a 3-line nav is top-right.
  - A left rail holds the scroll counter "02" and a vertical "SCROLL ↓".
  - Circle hotspots (rings with a dot) sit on the photo, and a circular "VIEW AVAILABLE APARTMENTS" button with a rotating arc sits bottom-centre.
- **About 10 elements.**
- **Hook:** the title card you just watched load opens like an arched window onto the place.

## Navigation
- **Type:** minimal corners, no bar. The re-run measured the fixed `div.header-nav` at 98 px tall, 43 px from the top, transparent, with 3 items.
  - Top-left: the rotating circular logo, 122×122 at (43,43), fixed.
  - Top-right: the fixed `header-nav`. Items: "SELECT AN APARTMENT" (display face, 25.2 px, underlined, two lines), "BOOK A CALL" and "CONTACT" (8.1 px, ls 0.32em).
  - Every label is duplicated in the DOM ("BOOK A CALL BOOK A CALL"), so the hover is a vertical roll that slides the copy up.
- **Behaviour on scroll:** always fixed; it inverts colour per section (white on photo, navy on cream and sky; classes `theme_on-color`, `theme_on-brand`, `theme_on-dark`).
- **Hover (re-run, `hover-1..3-nav-before/after`):** each nav label is split into per-character spans (`split-char`, with `font-feature-settings:"case"`). On hover the underline under "SELECT AN APARTMENT" drops away and the characters start their roll.
- **Phone:** "MENU ⋮" top-right (measured `header-nav` 165×23 at x 203).
  - The phone re-run clicked "MENU" at (285, 34) and captured 0.3 s and 1.5 s after.
  - **No overlay was visible within 1.5 s** (`phone-menu-open-1_5s` matches the hero), so the menu-open animation was **not observed**. Either the click target was the duplicated label rather than the trigger, or the menu opens later.

## Layout and grid
- **Margins:** side offset token 48 px (`--offset-l/-r`), rendered 43 px at 1440 and 23 px at 390. Grid gap token 16 px (14.4 px rendered).
- **Max width:** no max-width; it's full-bleed edge to edge.
- **Columns:** the main grid is 10 columns (39 grids measured), then 8, 6 and 4. Text blocks sit centred in the middle 4–6 columns.
- **Whitespace:** very generous. One headline plus one short paragraph per screen, and big empty cream or sky fields.
- **Sections:** 15 `section`s. The page is 21,670 px = **24.1 screens** at 1440 (it grew to 24,605 px after lazy content) and 18.2 screens at 390.
- **Rhythm:** each section is 900–1260 px (one screen), with some sticky scroll areas 2,970–3,379 px tall. There's no padding between sections: each one is a full colour block that butts against the next.
- Sticky scenes: `hero-w`, `loc-scroll-area_screen` (horizontal travel), `scroll-area_screen`, `arch-w`.

## Type behaviour
- **How headings enter:**
  - Chars or words via SplitText (`split-word` spans): letters fade and slide in one by one, as in the loader and in "REAL-LIFE LOCATION", where the letters are still tracking in (`scroll-08`).
  - "THREE REASONS TO CHOOSE ERA" is set on an arc that follows the arch's curve (`scroll-08`).
  - A long headline slides in horizontally, clipped (`scroll-15/16`: "…IS A BOUTIQUE GATED COMMUNITY" scrolls in from the left).
- **Size contrast:** largest 172.8 px vs body 11.7 px = **14.8 : 1**.
- **Case:** display always UPPERCASE, the script always mixed, body sentence case, labels UPPERCASE.

## Motion
- **Smooth scroll:** yes, Lenis 1.3.21 (`html.lenis`; it's `lenis-stopped` with `overflow:hidden` during the loader).
- **Scroll mechanics:** GSAP 3.15.1 with ScrollTrigger, SplitText, CustomEase and Observer.
- **Pinned scenes:** the hero arch expansion; an arch of powder sky rising over the photo (`scroll-08`); a horizontal location strip with a hand-drawn coastline map whose dots and minutes are marked "GIBRALTAR 50 MIN … MALAGA AIRPORT 45 MIN" (`scroll-19..21`); a quote over a photo.
- **Section-to-section:** shape wipes. The arch shape grows to reveal the next colour; photos are clipped into arch or rectangle windows.
- **Scrubbed or triggered:** mostly scroll-scrubbed (the arch growth and the horizontal travel); text reveals are triggered.
- **Easing:** soft and slow (Lenis inertia plus CustomEase).
- **Counter:** the left rail shows a 2-digit scroll percentage (00 → 46 by step 24).
- **Page transitions:** Barba 2.10.3 is loaded, so there are SPA page transitions.
- **Lottie** 5.12.2 is loaded, probably for the ornament or line drawings. Not verified.

## 3D / WebGL / media
- **No WebGL.** Only two tiny 2D canvases (1×1 and 300×150, probably feature tests).
- **Media:** large photos (renders of the residences) and 8 looping muted `.webm` videos of bougainvillea flowers (`assets.era-residence.com/flowers/bougainvillea-flowers_0N.webm`, 576–1018 px squares) drifting at the section edges as transparent cut-outs.
- The photography is central; motion is DOM, CSS and GSAP only.

## Interaction details
- **Cursor:** default (`cursor:auto`, no custom element).
- **Hover:** nav labels roll vertically (duplicated text). Circle hotspots sit on the photo, the "VIEW AVAILABLE APARTMENTS" circle has a rotating arc stroke, and a slider has a progress hairline and "1 —— 2" counters (`scroll-10`).
- **Small details:**
  - the circular rotating logo text;
  - the 2-digit scroll % counter on a vertical hairline rail;
  - the vertical "SCROLL ↓";
  - the octagonal inset frame;
  - the double-hairline arch;
  - words set on an arc;
  - a hand-drawn coastline map with minutes;
  - a "BY DAY / BY NIGHT" toggle.
- **Sound:** none observed.

## Phone
- **Loader:** the same plum card and frame, but the arch is a tall narrow window (`phone-0`).
- **Hero:** the stacked wordmark "ERA / RESIDENCE / Estepona" with "A PLACE"/"TO RETURN TO" under it, and the circle CTA (`phone-2`).
- **Nav:** collapses to "MENU ⋮"; the circular logo stays top-left at 75 px.
- **Dropped:** the left counter rail and "SCROLL" are not in the phone fixed elements.
- **Type and length:** display 90 px max; margins 23 px; 18.2 screens long.

## Tech detected
- **Webflow:** `data-wf-site`, `webflow.*.js`, the `w-` classes and Webflow CDN.
- **jQuery** 3.5.1.
- **GSAP 3.15.1:** jsDelivr `gsap@3.15` with ScrollTrigger, SplitText, CustomEase; `window.Observer` present.
- **Lenis** 1.3.21 (unpkg), **Barba** core 2.10.3, **lottie-web** 5.12.2.
- **Slater** (`assets.slater.app`, custom JS host for Webflow).
- **Adobe Fonts:** `use.typekit.net/pig8glj.js`.
- **Analytics:** GTM, GA4, Meta pixel.

## Clean because… / Insane because…
- **Clean because:**
  - 4 flat colours with named tokens and alpha steps;
  - one display face in caps only;
  - one headline and one small paragraph per screen;
  - nav reduced to 3 words in the corner;
  - no boxes or cards, only hairlines.
- **Insane because:**
  - the loader title becomes the hero through an arched window;
  - the arch motif carries every transition (window, wipe, text on an arc);
  - a script swashes through the condensed caps;
  - transparent flower videos drift between sections;
  - a scroll-% counter, a horizontal coastline map and a day/night toggle.

## Evidence
`shots/era-residence/`:
- load-0_2s, load-0_6s, load-1_2s, load-2s, load-3_5s, load-6s (from the load-only re-run, actual 0.20/0.64/1.20/2.01/3.50/6.01 s)
- first-screen
- hover-1..3-nav and hover-4-card, each before/after (re-run); hover-1-card (run 1, "Back to top")
- scroll-01 … scroll-24
- phone-0 … phone-3, phone-menu-before, phone-menu-open-0_3s, phone-menu-open-1_5s
- measure.json

Awwwards: https://www.awwwards.com/sites/era-residence (read 2026-11-05).
