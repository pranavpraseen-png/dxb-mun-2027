# David Whyte Experience (NOT LIKED)
https://davidwhyte.com/experience/ · Awwwards page: Site of the Day, Dec 31, 2024 (SOTD 7.63, Dev 7.29), by Immersive Garden. refs.ts says "Site of the Month, Dec 2024"; the page showed only the SOTD line · culture / poetry

Measured 2026-11-05 with `scripts/batch-d.mjs` (lighter pass). Headless Chrome, 1440×900 and 390×844, DPR 1. The cookie banner was declined ("Deny"). Raw numbers are in `shots/david-whyte/measure.json`.

The URL serves the page titled "Experience & advantages": the poem experience on top, then a subscription pitch, plans and an FAQ (WordPress/WooCommerce template `page-template-unsubscribed`).

## Fonts
- **display:** `Canela Text` (Commercial Type, retail), self-hosted (`CanelaText-Thin/Light/Regular.woff2`).
  - Poem lines are about 32 px. The headings are weight **100 (Thin)**: 52 px "Become a companion…" and 86 px "David Whyte" in the footer.
  - Mixed case, tracking normal.
  - At 390: 52 px and 49 px.
- **text:** `Roobert` (Displaay, retail).
  - 16 px at weight **100** for the intro paragraph (the font only ships 300/400/500, so the browser renders the lightest available).
  - 18 px at 400 is the most-used style (1,769 chars).
- **labels/nav:** Roobert 400, 12–14 px, sentence case, no tracking.
- **mono:** none.
- **Free equivalent:** not needed (NOT LIKED).

## Colour
These are measured from computed styles.
- **ground:** warm pale grey. The html is `#EFEAE2`, and the largest painted area is `#E7E7E2`. The watercolour WebGL layer adds grey-green, sky blue and moss.
- **ink:** black `#000000` (3,099 chars).
- **accents:** ochre `#D8914C` (the top banner link), rust `#AC4F27` (a small block).
- **Awwwards palette:** `#E1E1E1`, `#000000`.
- **Image stats:** mean saturation 2.2 % (the second-greyest of all 18 sites), mean luma 224, luma spread (std) 15.7, the **lowest tonal contrast of all 18 sites** measured.
- **Light or dark:** light, washed out.

## Loading screen
- **Yes, about 8 s.**
- **0.2 s:** white.
- **0.6–2 s:** black, with a small handwritten signature logo centred (`load-0600`…`load-2000`).
- **3.5 s:** an empty pale grey.
- **6 s:** pale grey with a thin circle labelled "Loading" and two lines of small text ("Access David's library…") (`load-6000`).
- **Exit:** a fade to the first screen.
- **Does the loader become the hero?** No.

## First screen
- **Composition:**
  - A 6-line poem set left in Canela at about 32 px. The last two lines are **blurred** ("of remembrance", "(from 'The Painter's Hand')").
  - To the right, a watercolour tree painted into the pale ground, with an "Open the landscape" label in serif on a curve.
  - "Scroll to explore" bottom-left, and a wave icon bottom-right (`first-screen`).
- **About 5 elements.**
- **Hook:** the watercolour paints in.

## Navigation
- **Desktop:** at load the `header` sits at top −101 px, i.e. hidden. Only a corner circle (top-left) and the wave icon show.
  - The DOM menu has 18 items (Home, Three Sundays, Companion Portal, Poetry & Prose, Walking Tours, Events & Retreats, Speaking, Store, Sign in…).
- **Phone:** "David Whyte · Sign in · Subscribe · ≡" (`phone-0`). Our menu tap targeted y −53 (the hidden header), so the menu was **not opened**.
- **On scroll:** the header stayed hidden (`navVisible` false at all 12 steps).

## Layout and grid
- **Margins:** text starts at x 109–150 at 1440 and 25 px at 390.
- **Page length:** 5,866 px = **6.5 screens**.
- **Columns:** one text column left, and the image right.
- **Rhythm (from the scroll sheet):**
  - 3 poem screens.
  - A "Become a companion" heading.
  - A "Subscriber Benefits" list (Poetry and essays, Video and talks, Maps).
  - Two plan rows with price buttons.
  - "Commonly Asked Questions" (5 rows).
  - A footer with the giant thin "David Whyte".

## Type behaviour
- **How poem lines enter:** by **blur and opacity**. The lines further from the reading position are blurred (`first-screen`, `scroll-02`: "There you can be sure" blurred above, "Despair takes us in…" blurred below).
- **Size contrast:** 86 / 16 = 5.4 : 1, but the first screen is 32 px vs 14 px.
- **Case:** mixed case throughout.

## Motion
- **Smooth scroll:** yes, Lenis (`html.lenis`).
- **The watercolour scene:** a WebGL watercolour scene (three.js r149, a fixed full-viewport canvas). Landscapes bleed into each other as you scroll (`scroll-01…12`: tree → islands → hills → viaduct).
- **Awwwards elements:** "Watercolor effect", "Longpress – Landscape reveal", "Poem – Full screen".
- **Easing:** slow; blur-and-fade transitions.

## 3D / WebGL / media
- **WebGL:** the watercolour shader is the whole background, central and painterly. Contexts: webgl, webgl2 (×3), and several 2D contexts.
- **Media:** 2 looping `video` elements. Mapbox GL is loaded, for the "Maps" benefit.

## Interaction details
- **Cursor:** a custom cursor (`div.cursor-w`, fixed, hidden on mobile and tablet), shown as a ring with a dot (`scroll-02`).
- **Interaction:** a long-press reveal (Awwwards).
- **Labels:** curved text labels on the painting.
- **Sound:** not observed.

## Phone
- **First screen:** the poem is left on a pale ground, with the painting faint behind it (`phone-0`).
- **Headings:** they stack at 52 px Thin (`phone-2`).
- **Header:** visible on the phone (Sign in / Subscribe), unlike desktop.

## Tech detected
- **WordPress** (custom theme `davidwhyte`) plus WooCommerce, jQuery and Stripe.
- **three.js** r149, Lenis and Mapbox GL.
- **Other:** tarteaucitron (cookies), reCAPTCHA, GTM, Cloudflare Insights.

## Clean because… / Insane because…
- **Clean:** a pale ground, one serif, a few lines per screen, no boxes.
- **Insane:** watercolour landscapes painting themselves.
- **Why it may have been rejected:**
  - Lowest contrast of all 18 sites.
  - Blurred text.
  - Thin (100) type.
  - Painterly and soft.
  - No visible nav on desktop.
  - It turns into a subscription sales page.

## Evidence
`shots/david-whyte/`:
- load-0200 … load-6000
- first-screen
- scroll-01 … scroll-12
- phone-0 … phone-3, phone-menu (menu not opened)
- sheet-loading, sheet-scroll, sheet-phone
- measure.json

Awwwards: https://www.awwwards.com/sites/david-whyte-experience (read 2026-11-05).
