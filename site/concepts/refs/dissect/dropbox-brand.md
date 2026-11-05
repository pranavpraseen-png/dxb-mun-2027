# Dropbox Brand (LIKED)
https://brand.dropbox.com/ · Awwwards page shows "Site of the Day, Feb 12 2025" (SOTD 7.67, Dev 7.8); no "Site of the Month" line on the site page (refs.ts says SOTM Feb 2025, not confirmed there) · Finance & B2B (brand guidelines) · credits on Awwwards: Daybreak Studio, Taha Hossain, Jenny Rudziensky, Kiran Patel, Jessica_Lai, Ben Giannis, denis ish (no roles) · Awwwards palette: #0061FE, #1A1918 · Awwwards "Elements": Typography Widgets, Motion Easing Demo, Logo Design Breakdown, Iconography Slot Machine, Motion Timeline, Typography Cursors, Color System Showcase, Nav Menu (most live on the sub-pages, which we did not open) · no fonts listed on Awwwards

## Fonts
display: **Sharp Grotesk DB** (Sharp Type's Sharp Grotesk, custom Dropbox cut), variable, loaded as `Dbsharpgroteskvariable Vf` from `.../DBSharpGroteskVariable-VF.ttf` (weight axis 250–900) and set with **`font-variation-settings: "ital" 0, "wdth" 106, "wght" 520`** (computed weight 700, rendered wght 520, slightly wide) · licence: **retail / proprietary** (Sharp Type; the DB version is Dropbox-only) · statement 36px, line-height 43.2px (1.2), tracking -0.72px (-0.02em), #0061FE, at 1440; 24px, tracking -0.48px at 390 · block statement 29px, tracking -0.58px (-0.02em), line-height 34.8px, white on blue · tile titles 33.6px/500, tracking -0.672px (-0.02em), line-height 26.88px (0.8), each in its tile's "on" colour; 20px at 390 · quote 30px/700 #1E1919 · sentence case, no caps.
text: **Atlas Grotesk** (Commercial Type) as `Atlasgrotesk Web`, Regular 400 and Medium 500 (.woff from the Webflow CDN; Dropbox's own CDN also serves Atlas Grotesk Thin→Black) · licence: retail · body 14px/400, line-height 22px, tracking 0, #736C64 (`--text--text-subtle-light`).
labels/nav: Atlas Grotesk 14px/400, line-height 20px, #0061FE (utility links "Brand Partner Toolkit", "Legal Branding Resources") · credits 12px/500, line-height 20px, #5F9DFF; 10px/500 at 390.
mono: **Noto Sans Mono** 400/500 (Google Fonts, OFL; loaded by the WebFont loader, `wf-notosansmono-n4-active`) but no mono text is visible on the home page.
free equivalent we can legally ship: Sharp Grotesk DB → **Archivo** (Omnibus-Type, OFL, Google; variable `wdth` 62–125 and `wght`): set at `wdth` 106–110 and `wght` 520–600, it gives the same wide, flat-sided grotesk with tight negative tracking. Atlas Grotesk → **Instrument Sans** (OFL, Google): a compact, neutral neo-grotesk with similar Akzidenz-style proportions at 14px; Inter (OFL) as the safe fallback. Noto Sans Mono → ship as is (OFL).

## Colour
ground **#FFFFFF** (3.87M px² at the first screen) · grid hairlines **#5F9DFF at 40%** (`--color--accent--line: #5f9dff66`; about #BFD8FF on white), 1px, plus `--annotation--hairline: #C5DBFF` · primary ink/accent **#0061FE** (`--accent--ui-accent`, Dropbox blue; headline text and the big statement block) · dark ink #1E1919 (`--text--text-light`), base ink #1A1918 (`--text--base`) · subtle text #736C64 · off-white #F7F5F2 (`--color--accent--coconut`, the most frequent hex in the CSS, ×75). Tile pairs (fill / ink on it, both from `--color--identity--*` and `--on-*`): navy #283750 / #B4C8E1 (Framework) · yellow #FAD24B / #684505 (Voice & Tone) · cyan #3DD3EE / #055463 (Logo) · red-orange #FA551E / #4E0119 (Typography) · lime #B4DC19 / #175641 (Iconography) · orange (tokens `--color--identity--orange` #F9A34B and `--color--accent--tangerine` #FF8C19; the exact tile fill was not sampled) / #6D2E09 (Color) · plum #892055 / pink #FFAFA5 (Imagery) · lilac #C8AFF0 / #682760 (Motion). The fills #283750, #C8AFF0, #FAD24B and #892055 were sampled with elementsFromPoint on the bento screen (scroll-04); the others are matched to their tokens by the tile text colours we measured. Colours: 1 ground, 1 hairline blue, 1 brand blue, 2 inks, 8 tone-on-tone pairs. Light. Accent: blue for the opening; the full palette appears only when the grid fills into the bento.

## Loading screen
yes, short (about 1.5 s after first paint) · `html.wf-loading` hides everything until the fonts are ready (0.6 s frame is blank white) · then **blue hairlines draw in from the edges** (1.2 s frame: line stubs at the corners and tiny tick marks inside; CSS `drawIn` 1250ms linear on SVG paths, plus SVG `transform` 1600ms `cubic-bezier(0.2,0,0.3,1)`) · exit: the lines complete into the page grid and the statement types into the centre cell (3.5 s) · the loader becomes the hero: yes, the drawn lines ARE the grid of the first screen.

## First screen
One tall centre cell (x=320–1120, 800px wide, y=50–850) framed by a 1px hairline grid that runs off every edge; inside it, top-left: a 4-line 36px blue statement; bottom-left: the Dropbox glyph; bottom-right: a double-chevron "scroll" icon. Nothing else; about 4 elements. Hook: an empty, architectural grid that clearly wants to move.

## Navigation
No bar. The **home itself is the navigation**: after the grid animation it settles into a bento of 9 coloured tiles (Framework, Voice & Tone, Logo, Typography, Iconography, Color, Imagery, Motion + a blue Dropbox tile), 10px gutters, about 4px radius, each tile with a 33.6px title top-left and one large tone-on-tone pictogram (bezier handles, quote marks, "Aa", padlock, landscape, colour chips). Utility links "Brand Partner Toolkit" and "Legal Branding Resources" in 14px blue. The nav is a `position: fixed` full-viewport `div.nav` with centred 90×90 (64×64 on phone) `div.menu` anchors. Behaviour on scroll: the scroll position drives the grid. Menu-open animation: n/a.

## Layout and grid
A visible **hairline grid** whose column and row sizes change on scroll (first screen: columns at x≈320/608/832/1120; next: 70/470/616/824/970/1370; then 194/470/628/812/970/1245) · the outro uses a CSS grid of **12 × 78px columns, 24px gaps, 1200px wide** · content side margins: 320px at the first screen at 1440, 32px at 390 · page length **2,700 px = 3 screens** (a short scroll runway; at 390 also 3 screens) · whitespace: extreme at the start (one cell used of about 15), then fully filled (bento) at the end. Sections: 3 states (statement cell → blue block → bento).

## Type behaviour
No line, word or char splitting observed; text sits in cells and moves with them (the statement cell scales from 800px to a 500px blue square, and its text swaps to the second statement) · size contrast: 36px vs 14px = 2.6× (low; the size of the CELLS carries the hierarchy, not the type) · case: sentence case only.

## Motion
smooth scroll: **no** (probe: 300px wheel → scrollY 300 at 0 ms; native) · pinned: the whole stage is fixed (`div.nav` fixed 1440×900) and the 2,700px document is runway · the move: the grid **re-flows cell by cell**: column and row lines slide to new positions, one cell floods solid blue (#0061FE), coloured cells grow in from the edges (orange from the left, cyan from the right), and then they all lock into the bento with 10px gutters · scroll-linked (positions change continuously between our 0.7s steps), not time-triggered · easing: `cubic-bezier(0.4,0,0.2,1)` 0.35s on tiles (Material standard), `cubic-bezier(0.15,0.5,0.05,1)` 0.4s for transform+opacity, `cubic-bezier(0.5,0,0,1)` 3s for big transforms, `opacity 1.5s ease-in-out` (×32) · page transitions: not observed (we did not click through).

## 3D / WebGL / media
None. No WebGL, no video, no `<img>` (0); 35 inline SVGs carry all the pictograms. Pure DOM + CSS + SVG.

## Interaction details
cursor: `cursor-anchor` and `cursortag` elements exist (0px wide at rest), which suggests a cursor label appears over tiles; not captured · hover: the centre statement had no computed change; tile hovers not captured · details: double-chevron scroll cue, a floating cookie-preferences button (32px, bottom-left, from Dropbox's CCPA iframe), and a quote card (Charles Eames: "The details are not the details…") in the outro.

## Phone
Same idea at 390: the hairline grid becomes 4 columns (x≈32/132/258/358), the statement cell spans 32–358 (326px) at 24px type; the blue cell is a 240px square; tiles enter from the edges as on desktop. Nothing is dropped; 3 screens; no horizontal overflow. No menu button (the bento is the menu).

## Tech detected
**Webflow** (`meta generator="Webflow"`, `window.Webflow`, `data-wf-page`, `webflow.schunk.*.js`, `cdn.prod.website-files.com`) · **jQuery 3.5.1** (Webflow default) · Webflow Interactions (`w-mod-ix` on html) for the scroll-linked grid · Google WebFont loader 1.6.26 (`wf-loading`, `wf-active` classes) · no GSAP, Lenis or ScrollTrigger globals · Dropbox privacy-consent bundle + CCPA iframe · Adobe Launch, GA4.

## Clean because… / Insane because…
Clean: white page, 1px blue hairlines, one blue statement in one cell; every element snaps to the grid; one display face and one text face; each tile is exactly two colours (fill + its own dark "on" tone).
Insane: the hairline grid draws itself as the loader, then the grid lines physically re-flow as you scroll until empty cells become a full colour bento; all of it is plain DOM/CSS, no WebGL.

## Evidence
shots/dropbox-brand/: load-0_2s, load-0_6s, load-1_2s, load-2s, load-3_5s (with cookie banner, before "Decline" was clicked), load-6s, first-screen, scroll-01…scroll-04 (page end), hover-0-button-before/after, phone-0…phone-3 (.jpg), data.json. The cookie banner was closed with "Decline".
