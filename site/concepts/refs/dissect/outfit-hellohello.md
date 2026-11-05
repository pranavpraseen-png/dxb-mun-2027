# Outfit by ++hellohello (LIKED)
https://outfit.hellohello.is/ · Awwwards Site of the Day, 11 May 2026, plus Dev Award · fashion (++hellohello's own merch store)

Awwwards credits: ++hellohello, Pablo Picart and SEB®. Scores: SOTD 7.37 (design 7.63, usability 7.25, creativity 7.03, content 7.39); Dev 7.57 (animations 8.20, WPO 8.20, responsive 7.40). Tags: E-Commerce, Fashion, Animation, Clean, Minimal, Photographic, Interaction Design, UI design, GSAP, React, Shopify. The Awwwards page lists no colours or fonts.

## Fonts
One family only: **Neue Haas Grotesk Text Pro**.
- **Foundry and licence:** Linotype GmbH (trademark Monotype), designer Christian Schwartz, version 1.05, vendor ID LINO. All of this is read from the woff2 name tables. **Retail, not free.** The files' licence string says "Microsoft supplied font … may only embed … as permitted by the license terms … of the Microsoft product", so even this copy is not one we may lift.
- **How it's loaded:** as a CSS family called `font` with 3 faces:

| CSS weight | File |
|---|---|
| 400 | `NeueHaasGroteskTextPro` (Regular) |
| 700 | `NeueHaasGroteskTextPro_Medium` (usWeightClass 500) |
| 800 | `NeueHaasGroteskTextPro_Bold` (700) |

  CSS weight 900 falls back to the 800 Bold file. The fallback face is `local("Arial")`.

display:
- The hero "OUTFIT®" is an **SVG wordmark**, not live text: 7 paths, viewBox 0 0 1391 296, drawn 1392 × 296 px at 1440 and about 358 px wide at 390, filled #ff0001. It's drawn in the same grotesk, bold.
- The live display type is the footer statement "Made to be worn. / Or judged. Or both.":

| | 1440 | 390 |
|---|---|---|
| size / line-height | 86.4 / 86.4 px (1.0) | 44 / 44 px |
| tracking | **−4.32 px (−0.05 em)** | −2.2 px |
| weight | 900, which renders the Bold file | same |

  It's set in sentence case.
- "©26" is 183.6 px at 1440 (175.5 px at 390), with the same −0.05 em tracking.

text:
- Product names and prices: 18 / 20 px, weight 400, tracking 0, sentence case.
- Intro paragraph: 14 / 16 px, weight 700 (Medium file), −0.35 px (−0.025 em) at 1440. At 390 it's 14 / 20 px, weight 400.
- Footer statement paragraph: 24 / 32 px, weight 400, −0.6 px.
- Footer links: 14 / 20 px, weight 700.

labels/nav:
- Nav "Shop" and "Bag (0)": 24 / 32 px, weight 400, −0.6 px (−0.025 em) at 1440; 16 / 24 px, −0.4 px at 390. The current page is underlined.
- Column kickers ("OUTFIT", "WHY", "VISIT ++ WEBSITE", "SHIPPING & RETURNS"): 12 / 16 px, weight 700, UPPERCASE, tracking 0.
- Product category ("● APPAREL"): 11 / 16.5 px, weight 400, UPPERCASE, behind a 6 px red dot.
- Phone menu items: 60 / 60 px, weight 400, −1.5 px.
- Loader counter: 24 / 32 px, weight 400.

mono: none.

free equivalent we can legally ship:
- **Inter Tight** (OFL, Google Fonts) for display and nav, with **Inter** (OFL) for text. Both are neo-grotesques with flat horizontal terminals and the same "Swiss" voice; Inter Tight's built-in tight spacing survives the −0.05 em display tracking without letters touching.
- Inter's x-height is taller and its apertures more open than Neue Haas, so the match is close in feel, not identical.
- The most literal Helvetica-shaped free alternative is TeX Gyre Heros (GUST Font License, derived from URW Nimbus Sans), but it's less refined at text sizes.

## Colour
The site ships 3 themes, chosen with 3 swatches at the top right. **Default = "red" theme** (all values from computed styles and root CSS variables):

| Role | Value |
|---|---|
| ground | **#ede4dd** cream (`--color-cream`; note `--color-white` is also #ede4dd, so the site has no pure white) |
| ink | **#ff0001** pure red (`--color-red`, also `--cursor-color`) |
| black | #000000 (`--color-black`), used for the loader, for photo grounds and as the dark theme's ground |
| image placeholder | **#d2cac3** (the warm grey box behind each photo while it loads) |
| nav ink | **#00c0eb** cyan (lab(69.67 −41.28 −36.39), and in the red theme `oklab(0.73 −0.14 −0.1)`), set with **`mix-blend-mode: difference`** on the fixed nav |

The nav cyan is never seen as cyan on cream: difference turns it into about #ed240e red-orange on cream, and leaves it cyan on black photos (visible in `scroll-02.jpg`, where the "++" logo turns cyan over a black tee).

- **Light theme:** ground #ede4dd, ink #000000.
- **Dark theme:** ground #000000, ink #ede4dd.
- **Pixel histogram of the first screen:** #ede4df 42.6%, #fe0000 13.2%, then photo greys.
- **Count:** 2 colours plus black (one ground, one ink).
- **Light or dark:** light.
- **Where the accent appears:** red is everything. The wordmark, the 5 px rule, all text and the cursor are red; there is no second accent.

## Loading screen
yes · about 4.8 s, then about 1 s reveal (frames `probe-loader-0900ms` to `probe-loader-6000ms`, 300 ms apart).

What it shows: a black #000000 full screen. A 3-digit counter in cream, 24 px ("000", 063 at 3.0 s, 090 at 3.5 s, 099 at 4.2 s), sits top-right of a centred cream "OUTFIT®" wordmark (about 450 px wide). The letters of the wordmark build up while a **stack of 6 product photos** (12 vw wide, 9:12) shuffles in the centre with small rotations (measured `matrix(0.975, 0.221 …)`, about ±13°) and cyan/red glitch offsets.

How it exits (from the frames and the computed clip-paths):
1. At about 4.8 s a cream floor appears at the bottom.
2. The black layer is wiped **upwards** by a `clip-path` (`inset(0%)` on the loader).
3. At 5.4 s the hero's red "OUTFIT" letters **rise from behind a mask line** at the wordmark's baseline, one letter after another.
4. The nav drops in from `translateY(-96px)`, opacity 0.
5. The product photos then wipe in.

The computed styles also show an extra full-screen #ff0001 layer clipped to a top band (`polygon(0 18.28%, 100% 18.28%, 100% 0, 0 0)` at 1.5 s, fully closed by 3.0 s); it wasn't visible in the captured frames.

Does the loader become part of the hero: yes. The loader's small cream wordmark becomes the full-width red hero wordmark.

## First screen
- **Composition:** the **full-width "OUTFIT®" wordmark** (1392 × 296 px, 24 px margins) fills the top half.
- **The rule:** a **5 px red rule** (`h-[5px] w-full origin-left bg-current`) sits 24 px under it at y 424.
- **Caption row:** a 4-column caption row:
  - col 1: "OUTFIT";
  - col 2: "WHY" plus a 3-line, 14 px intro;
  - col 4: "VISIT ++ WEBSITE / SHIPPING & RETURNS" and "© 2026".
- **Product row:** the first row of 4 product photos starts at y 573.
- **Element count:** about 10.
- **Hook:** a single word as wide as the screen, in one red on cream, over a hard rule. It's a poster, not a web page.

## Navigation
- **Type:** minimal bar, fixed, 100 px tall, transparent, mix-blend difference.
- **Items:** "++" logo (with a hidden "OUTFIT®" for screen readers), "Shop", "Bag (0)" and 3 theme swatches (black, cream, red; each 18 px). That's 3 links plus the swatches.
- **On scroll:** it stays put and inverts over photos thanks to difference blending; it doesn't hide.
- **Phone:** the bar is "++ · Bag (0) · Menu". "Menu" opens a **full-screen #ff0001 panel that drops from the top**: at 250 ms it's an 84 px red band behind the nav; at about 1.4 s it's full screen. The panel holds "Shop" and "Bag (0)" in cream at 60 px, three 68 px theme swatches, and the footer "++ hellohello © 2026 · Montevideo, Uruguay.". The button text becomes "Close".

## Layout and grid
- **Max width:** none; the content runs full width. The longest text measure is capped at 832 px.
- **Margins:** **24 px at 1440** (`lg:px-6`) and **16 px at 390** (`px-4`).
- **Columns:** **4 columns of 330 px with 24 px gutters** at 1440 (x = 24, 378, 732, 1086); 2 columns on the phone (`grid-cols-2 lg:grid-cols-4`).
- **The product wall is staggered off-grid:**
  - row 1: four equal 330 × 440 tiles;
  - row 2: two small 242 px tiles, an empty gap, then one 684 px square spanning 2 columns;
  - later rows mix small and large tiles at varying heights and leave **empty cells on purpose**.
- **Gaps:** about 136 px between the product section and the footer (`mb-34`).
- **Length:** **4.51 screens** at 1440 (4061 px). There are 3 parts: hero and caption row, the product wall, and the footer statement.
- **Rhythm:** a poster, then a wall, then a poster again.

## Type behaviour
- **Entry:**
  - The hero wordmark letters rise from below a mask line, per letter.
  - The SplitText plugin is in the bundle, so the text uses split reveals, but no text entry was isolated in my frames beyond the wordmark.
  - The 5 px rule has `origin-left`, which suggests a scaleX draw-in (not directly filmed).
- **Size contrast:** extreme. The wordmark's 296 px cap block against 14 px body is about 21×. The live headline (86.4 px) against product text (18 px) is 4.8×.
- **Case:** UPPERCASE only for 11–12 px kickers. Everything else is sentence case.

## Motion
- **Smooth scroll:** yes, **Lenis 1.3.11** (html class `lenis`; the version string is in the bundle).
- **Pinned scenes:** none observed. It's a normal document scroll; scrollY went 0 to 3161.
- **Section transitions:** none; it's one continuous page.
- **Product reveals:** triggered as tiles enter view. Each photo appears through a **left-to-right `clip-path` polygon wipe** (from `polygon(0 0, 0 0, 0 100%, 0 100%)` to full), going from `brightness(4) contrast(1.5)` to normal (a white flash settling into the photo), with a 1.2 → 1 scale (measured 396 → 330 px). The easing class is `ease-[cubic-bezier(0.87,0,0.13,1)]`, a hard in-out.
- **UI transitions:** the theme button uses `0.2s cubic-bezier(0,0,0.2,1)`.
- **Page transitions:** not observed.

## 3D / WebGL / media
None. There's no canvas, no WebGL context and no video. All the media is flat product photography (23 images) on #d2cac3 placeholders.

## Interaction details
- **Cursor:** a custom **8 px dot in #ff0001** (`--cursor-color`; html class `has-custom-cursor`). Over a product it grows into a **~100 px red disc reading "VIEW MORE"** in cream.
- **Product hover:** a second shot of the product (on a red backdrop) wipes in left-to-right over the first, with the same brightness flash (`probe-card-hover-250ms`, `-1150ms`).
- **Nav hover:** no visible change (the "Shop" underline marks the current page, not hover).
- **Small details:**
  - "●" red dots before categories;
  - "( )" around the bag count;
  - "®" and "©26" used as graphic marks;
  - a 5 px rule, then a 2 px hr in the footer;
  - the theme switcher (3 dots), shown as giant swatches in the phone menu.
- **Sound and drag:** none.

## Phone
- **What carries over:** the same poster logic. The wordmark (16 px margins), the 5 px rule and the caption row (now 2 columns: OUTFIT/WHY, then VISIT/©) remain, and the wall becomes 2 columns.
- **Type:** the headline drops from 86.4 to 44 px; nav type drops from 24 to 16 px.
- **What's dropped:** "Shop" and the swatches move into the red full-screen menu.
- **Length:** the page grows to 4581 px (5.43 phone screens).

## Tech detected
- **Next.js** with Turbopack chunks (`/_next/static/chunks/turbopack-*.js`), on **Vercel** (`?dpl=dpl_…` deployment ids).
- **React** (strings in several chunks; Awwwards also lists React).
- **GSAP 3.14.2** with **ScrollTrigger** and **SplitText** (strings in the chunks).
- **Lenis 1.3.11**.
- **Tailwind CSS v4** (utility class names; `--color-*` tokens in `lab()`; `red:`/`dark:` custom variants for the themes).
- **Shopify** headless (strings, plus the Awwwards tag).
- Google Tag Manager.
- No WebGL.

## Clean because… / Insane because…
Clean because:
- one family, one ink, one ground;
- a 4-column Swiss grid with 24 px gutters everywhere;
- uppercase only at 12 px;
- one 5 px rule as the only ornament;
- deliberately empty cells.

Insane because:
- a wordmark the full width of the screen;
- the nav inverts itself with `mix-blend-mode: difference`;
- a loader made of a shuffling photo stack and counter that hands its wordmark to the hero;
- photos flash in from white through a hard-eased clip wipe;
- the cursor becomes a red "VIEW MORE" disc;
- a 3-theme switch built into the nav.

## Evidence
`shots/outfit-hellohello/`:
- loading: `load-0_2s` … `load-6s`; `probe-loader-0900ms` … `probe-loader-6000ms` (18 frames);
- first screen: `first-screen-pre-gate`;
- hover: `hover-0-before`, `hover-1-nav-after` … `hover-5-card-after`; `probe-card-before`, `probe-card-hover-250ms`, `probe-card-hover-1150ms`;
- themes: `probe-theme-0` (dark), `probe-theme-1` (light), `probe-theme-2` (red);
- scroll: `scroll-01` … `scroll-11` (end of page);
- phone: `phone-0` … `phone-3`, `phone-menu-opening`, `phone-menu-open`;
- data: `measure.json`, `probe.json` (loader styles, blend mode, rule, SVG wordmark, hover diff, theme colours).
