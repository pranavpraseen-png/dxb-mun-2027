# Oryzo (by Lusion) (LIKED)
https://oryzo.ai/ · Awwwards page text: "Site of the Day - Apr 13, 2026", SOTD 7.86, Dev 7.87; by Lusion. refs.ts says "SOTM Apr 2026": no SOTM line was in the page text, so that label is unconfirmed here · studio / product

Measured 2026-11-05 with `scripts/batch-b.mjs` (headless Chrome with SwiftShader WebGL, 1440×900 and 390×844, DPR 1). Raw numbers: `shots/oryzo-ai/measure.json`.
- **WebGL rendered**: `webgl2` on "ANGLE … SwiftShader driver", and the 3D cork coaster is visible in every capture.
- It is slow, though. The 6 loading frames landed at 0.2 / 0.6 / 4.1 / 6.1 / 9.9 / 14.2 s rather than at the targets, because the page blocked the screenshotter.
- The desktop pass hit its 170 s cap after 23 scroll steps (10,770 px of a 56,691 px page), so only the first ~19 % of the page is captured, and no mid-page computed style was taken.

## Fonts
Type is sized in "screen units": `--screen-unit: min((100vw − 2×3.125vw) / 1800, 900px/1024×1.25)`, which is 0.75 at 1440. All the tokens below are multiples of it.

- **display:** `halyard-display-variable` (Adobe Fonts kit `pmn6ngx`). The font file's name table says "Halyard Display, © 2017 Joshua Darden, Inc.", vendor DRDN, wght axis 100–900, EULA at fonts.adobe.com. This is Halyard by Joshua Darden (Darden Studio). **Retail** (Adobe Fonts or Darden Studio).
  - It's used for every visible string; the `halyard-text-variable` face is declared but was `unloaded`.
  - Headline tokens: `--h1` 164 su (123 px at 1440), `--h2` 68 su (51 px), `--h3` 45 (33.75), `--h4` 32 (24), `--h5` 20 (15).
  - Seen at 1440:
    - "Powered by AI" and "it's wearable": mixed case, about 120 px tall, glyphs heavy and tight. The token is 123 px; this one's computed style was not captured.
    - "ISN'T JUST A COASTER.": uppercase, about 45 px.
    - Measured: 40.8 px / 500 / uppercase / lh 0.9 (outro), and 24 px / 500 / uppercase / lh 1.09 ("DESIGNED BY LUSION").
  - Tracking is always `normal` (0); weight 500 for caps, 400 for body.
- **text:** Halyard Display 400.
  - Lead (`--body1`, 38 su): 28.5 px, lh 36 px (1.26), mixed case.
  - Small body: 18 px, lh 24 px.
  - Colour: cream `#FFEDD7`.
- **labels/nav:** Halyard Display 500, 12 px, uppercase, lh 12 px, ls 0.
  - Every nav letter is duplicated for a per-letter "flipper" roll (DOM text "I I N N T T R R O O").
  - Tiny labels: 9.6 px ("PLAY"). The edge tab "ORYZO-1 MODEL" is 15 px / lh 60 px, dark on cream.
- **serif:** `Literata` (variable opsz 7–72, wght 200–900). The name table says "© 2017 The Literata Project Authors", OFL. Self-hosted at `/fonts/Literata.woff2`. **Free (OFL).** Its use was not observed in the captured first 19 % of the page.
- **mono:** `DM Mono` 400. The name table says "© 2020 The DM Mono Project Authors", OFL, at `/fonts/DM-Mono-400-Latin.woff2`. **Free (OFL).** Its use was not observed in the captured part (probably the spec/measure section further down).
- **Free equivalent for Halyard:** **Instrument Sans** (OFL, Google, variable wght and wdth). It has the same contemporary grotesk build: round, near-geometric bowls, a double-storey a, slightly narrow caps, and it sits well at weight 500 in tight caps. **Hanken Grotesk** (OFL) is the second choice. Literata and DM Mono are free as they are.

## Colour
Measured from `:root` variables and computed styles.

- **ground:** warm near-black `#100904` (`--color-black`, html background), with a brown `#382416` (`--color-brown`) glow in the lower-left corner (`scroll-08`, `-18`).
  - The loader ground is a cutting-mat green drawn on canvas: visually between `--color-green` `#445231` and `--color-green-light` `#5D6C49`. Its exact pixel value was not measured.
- **ink:** warm cream `#FFEDD7` (`--color-white`): all text, the logo and hairlines. Hairlines are cream at 20 % (`#FFEDD7` @0.2), dotted or dashed.
- **accent:** orange `#DC5000` (`--color-orange`): the "ORYZO-1" label, the "Lusion" credit link, the glow token.
  - The loader's CAD handles draw in a lighter orange. Awwwards lists `#FF8539`; the canvas pixel was not measured.
- **Other tokens:** grey-brown `#6C5F51`, green-lightest (cream) `#F6E0C6`, pure white and black.
- **Number of colours:** 3 core (near-black, cream, orange) plus a brown glow, plus green for the opening scene.
- **Light or dark:** dark and warm. One exception: the "AI" scene draws a rainbow edge glow round the viewport (`scroll-14`).
- **Awwwards palette:** `#100904`, `#FF8539`.

## Loading screen
- **Yes, at least 14 s under SwiftShader;** it would be much shorter on a real GPU, but that was not measured.
- **What it shows:** a CAD-style vector drawing of the product, on the green ground.
  - At first: a small circle with orange Bézier handles and dashed construction lines through the centre (`load-0_6s`).
  - Then the circle scales up to two concentric dashed circles (inner and outer rim) with orange tangent handles, and a pale sector fills the ring clockwise like a pie-chart progress meter (`load-2s` at 6.1 s actual, `load-6s` at 14.2 s actual).
- **No number or %:** the progress is the ring fill.
- **Exit:** the vector drawing becomes the real object. The photo-real cork coaster appears inside the same handles and dashed outline on a cutting mat with a ruler scale (`first-screen`). Then the handles fade and the desk scene darkens (`scroll-01`).
- **The loader IS the hero object:** the wireframe turns into the model.

## First screen
Secondary evidence: the earlier board capture `concepts/refs/shots/oryzo-ai-0.jpg`, taken after a full load.

- **Composition:** a top-down photo-real desk (wood, a green cutting mat with cm ruler, pencils, a cutter), with the 3D coaster dead centre.
  - A giant "ORYZO" wordmark sits top-left, about 610 px wide, cream, as SVG (it isn't a text node). "MADE FOR MUGS. BUILT FOR TABLES." is above it.
  - The nav is top-right. One lead sentence sits right of the object.
  - A translucent card bottom-left reads "DESIGNED BY LUSION…". A video thumbnail with "PLAY" sits bottom-right (a Vimeo embed), and "SCROLL TO CONTINUE" is bottom-centre.
  - A cream vertical tab on the right edge reads "• ORYZO-1 MODEL".
- **About 9 elements.**
- **Hook:** a cork coaster treated as a precision-engineered product; the object is drawn as CAD first, then becomes real.

## Navigation
- **Type:** a minimal top-right text bar. `header.link-header` is fixed, `--site-header: 21px`. Items: INTRO · FEATURES · PRODUCT · CONTACT. The active one has a dotted underline.
  - The "ORYZO" logo, 90 px wide, joins top-left after the hero.
  - A cream tab on the right edge works as a scroll-progress or model label (its height grows as you scroll: `scroll-03` vs `-23`).
- **Hover:** a per-letter flip (each letter is duplicated and rolls vertically).
- **Phone:** a "• MENU" pill with a dotted outline, top-right (`phone-0`). The menu holds INTRO / FEATURES / PRODUCT / CONTACT at 38.5 px plus HELLO@LUSION.CO.
  - **Open state (`phone-menu-open-0_3s`, `-1_5s`):** a near-black panel (by eye the same as the `#100904` ground; not measured) covers the right 72 % of the screen (x≈111–390). The page behind is dimmed, not blurred. The four items are cream caps, left-aligned in the panel; the current item (INTRO) has a dotted underline. "GENERAL ENQUIRES:" sits in small grey caps above HELLO@LUSION.CO at the bottom. The pill becomes a solid cream "• CLOSE" pill.
  - **Speed:** already fully open at 0.3 s, so the open transition takes under 0.3 s; it wasn't caught mid-motion.

## Layout and grid
- **Columns:** 16 (`--grid-columns: 16`). The gap-to-column ratio is 24/90, so the gap is 18 px at 1440 (measured `16 cols (gap 18px)`).
- **Margins:** `--site-padding-x: 3.125vw` = 45 px at 1440. At 390 it's `calc(16 * 100vw / 375)` = 16.6 px. The row unit is `3.125vw × 8/60`.
- **Max width:** none; fluid edge to edge, with the type capped through `--screen-unit`.
- **Sections:** the page is almost one long pinned WebGL stage. Only 2 `.section` blocks were found: the hero and the footer, at 55,710 px.
- **Length:** 56,691 px = **63 screens** at 1440, and 60.8 screens at 390.
- **Rhythm:** one object, one headline and one or two small captions per screen; huge negative space.
- **Placement:** text on the left at x≈45–130, the object centred, captions right-aligned at x≈1060–1400.

## Type behaviour
- **Enter:** words slide up and blur in. "Powered by AI" arrives with "AI" still blurred (`scroll-08`) and then sharp (`scroll-14`). That blur-in is a known clarity-rule conflict: borrow the slide, not the blur.
- **Glow:** the giant mixed-case words glow (a cream bloom behind them, "it's wearable", `scroll-23`), and the object passes in front of the type (depth layering).
- **Size contrast:** 123 px headline vs 18 px body = **6.8 : 1** (vs the 12 px labels, 10 : 1).
- **Case:** big statements in Mixed case; secondary headlines and labels in UPPERCASE; body sentence case.
- **Jokes:** footnote asterisks ("AI*" → "* ADOBE ILLUSTRATOR") set as tiny right-aligned captions over a dotted rule.

## Motion
- **Scroll engine:** custom. There's no Lenis, GSAP or Locomotive global; Lusion's own engine is bundled in Astro's `_astro/hoisted.*.js`. The scroll is native height, with the stage `position:fixed` and scrubbed.
- **Pinned:** effectively the whole page. A fixed 1440×900 canvas sits behind fixed text layers.
- **Section changes are camera and material changes on the same object:**
  - top-down desk view → the object floats on black → a 3D hand catches it ("TRY TO HOVER HAND") → a spec/turntable frame with a dashed square, a dashed circle and tick marks ("SO PORTABLE,") → a photo/video card that slides in over the giant type.
- **Scrubbed vs triggered:** object pose and camera are scroll-scrubbed; text is triggered.
- **Easing:** not readable (inside the bundle).
- **Renderer:** has temporal anti-aliasing (`window.toggleTAA` / `resetTAA` globals).

## 3D / WebGL / media
- **Central:** the product is a three.js model (`__THREE__` global) with a photo-real cork material, carried through the whole page.
- **Canvases:** a fixed 1440×900 main stage, plus 571×734, 495×495, 321×321 and a second 1440×900.
- **Media:** 2 looping muted mp4s (`/images/wearable-gallery/yoga.mp4`, `bite.mp4`), and a Vimeo iframe (the "PLAY" card).

## Interaction details
- **Cursor:** default. The 4 elements found with "cursor" in their name are 0-width (hidden or idle cursor-hint SVGs). A "TRY TO HOVER HAND" prompt with a hand icon invites a hover interaction in 3D.
- **Small details:**
  - dotted and dashed hairlines everywhere (underline, captions, spec frame);
  - CAD Bézier handles;
  - a ruler scale on the cutting mat;
  - tick marks at 12/3/6/9 o'clock round the object;
  - a white dot as the frame's corner marker;
  - footnote asterisks;
  - a per-letter flip nav;
  - an edge tab as the progress indicator;
  - a "SCROLL TO CONTINUE" chevron in a dotted circle.
- **Sound:** none observed (muted browser).

## Phone
- The same scene, stacked.
- "ORYZO" spans the full width (about 350 px). The tagline and lead text are right-aligned under it, the coaster sits in the middle, and the "DESIGNED BY LUSION" card and "PLAY" video card share the bottom.
- The nav collapses to a "• MENU" pill; tapping it slides in a dark side panel (72 % width) with 4 caps items and a cream "• CLOSE" pill (`phone-menu-open-*`).
- Margins 16.6 px. Type: 38.5 px menu, 31.6 px outro, 18.7 px body.
- The page is still 60.8 screens; nothing structural is dropped.

## Tech detected
- **Astro** (`/_astro/hoisted.CRsATKbF.js`, `_astro/index.*.css`).
- **three.js** (`__THREE__`), with a custom TAA (`toggleTAA`).
- **Adobe Fonts** (`use.typekit.net/pmn6ngx.css`); Literata and DM Mono self-hosted.
- **Vimeo** player; **Cloudflare** Insights.
- **`html.is-desktop` / `is-mobile`, `is-ready` state classes**, and a `--vh` variable set by JS.

## Clean because… / Insane because…
- **Clean because:**
  - 3 colours (warm black, cream, orange) and one type family;
  - one object per screen;
  - nav is 4 words;
  - all chrome is dotted hairlines and tiny caps.
- **Insane because:**
  - the loader is a CAD drawing that becomes the real product;
  - one 3D object carries a 63-screen story through desk, hand, spec frame and video;
  - giant glowing type with the object passing in front;
  - a per-letter flip nav;
  - the rainbow edge glow on "Powered by AI".

## Evidence
`shots/oryzo-ai/`:
- load-0_2s, load-0_6s, load-1_2s (4.1 s actual), load-2s (6.1 s), load-3_5s (9.9 s), load-6s (14.2 s)
- first-screen
- scroll-01 … scroll-23
- phone-0 … phone-3, phone-menu-before, phone-menu-open-0_3s, phone-menu-open-1_5s (menu found as "MENU" at 336,31)
- measure.json

Hover: no hover target was in the viewport at measure time (the nav sat at y=-36 while hidden during the intro), so there are no hover captures.

Secondary, from the earlier board capture: `concepts/refs/shots/oryzo-ai-0.jpg` (fully loaded first screen), `-1.jpg`, `-2.jpg`.

Awwwards: https://www.awwwards.com/sites/oryzo-ai (read 2026-11-05).
