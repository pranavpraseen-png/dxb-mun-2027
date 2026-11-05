# Getty · Tracing Art (LIKED)
https://www.getty.edu/tracingart/ · Awwwards page shows "Site of the Day, Jul 22 2025" (SOTD 7.68, Dev 7.69); the page text has no "Site of the Month" line (refs.ts says SOTM Jul 2025, not confirmed on the site page) · Culture & museums · credits on Awwwards: Resn, Getty (no roles shown) · Awwwards palette: #FFFFFF, #DAE2E8 (we did not observe #DAE2E8 on the first 12 screens; it may belong to a later chapter) · Awwwards "Elements": Main Scroll, Hover Effects, Scroll Animations, Data Visualisation · no fonts are listed on the Awwwards page (its "Font & Color" section shows colours only)

## Fonts
display: **Bradford LL** (Lineto), loaded under the misspelt family name `Bardford`, files `/tracingart/fonts/bradford/BradfordLLSub-Regular.woff2` and `BradfordLL-LightItalic.otf` · licence: retail (Lineto) · h1 "Tracing Art": 72px at 1440 / 41.6px at 390, weight 400, tracking -2.16px (-0.03em), line-height 72px (1.0), sentence case · story sentences (h2): 54px / 64.8px line-height (1.2), tracking -1.08px (-0.02em) at 1440; 29.12px, tracking -0.58px at 390; weight 400, centred, sentence case.
text: **Graphik** (Commercial Type), weights 400, 500 and 600, files `/tracingart/fonts/graphik/Graphik-{Regular,Medium,Semibold}-Web.woff2` · licence: retail · captions 12px/400, tracking -0.24px (-0.02em), colour #FFFFFF on images or #9D9D9D for the credit line · kickers 12.6px/500, tracking -0.126px (-0.01em) ("Millions of Resources, Spanning Five Centuries") · years 12.6px/600 ("1700", "1936", "1940"). At 390 the labels grow to 14.56px, so they are larger on phone than on desktop.
labels/nav: the nav is icon-only (a black 36×36 rounded-square menu button); the button label "Scroll down" is Graphik 12.6px/500, tracking -0.252px · mono: none.
Evidence note: in headless Chrome the 3 Graphik files returned **403** (`document.fonts` status "error"), so the sans in our shots is the fallback stack `Roboto, "Helvetica Neue", sans-serif`. Bradford loaded fine.
free equivalent we can legally ship: Bradford → **Newsreader** (Production Type, OFL, Google Fonts): a contemporary text serif with optical sizes, the same sharp, slightly calligraphic serifs and moderate contrast, and it holds up at 54–72px with tight tracking. Second choice: Source Serif 4 (OFL). Graphik → **Inter** (OFL): the same neutral, low-contrast grotesque at 12–14px with slight negative tracking; Hanken Grotesk (OFL) is closer in its rounder geometric shapes.

## Colour
ground #FFFFFF (by area, 1.30M px² of the 1.30M visible) · ink #000000 (7,876 chars) · secondary ink #9D9D9D (credit lines; 445 chars) · on-image captions #FFFFFF · translucent tiles #BABABA at 20% (placeholder cards and the pill button, about #F1F1F1 on white) · hairlines #0D0D0D at 10%, 1px · black #000000 menu button · the only real colour comes from the artworks themselves. html and body are transparent; everything is painted by a full-screen WebGL2 canvas over white. No colour custom properties on :root (the only `--` vars are a debug-panel kit, `--sb-*`). Colours: 4 (white, black, #9D9D9D grey, 20% grey tint). Light. Accent: none; "accent" = the artwork images.

## Loading screen
yes · about 2.6–3.5 s · white screen with only the "Getty" wordmark centred (load-0_6s, load-2s; DOM `div.pageLoader` opacity 1 until about 2.6 s) · exit: the wordmark slides up from the centre to y≈343, the title "Tracing Art" appears in pale grey with a wavy ribbon of tiny artwork thumbnails threading between the words (load-3_5s), then the wordmark settles at the top centre and the artwork tiles scatter out to the first screen · the loader becomes the hero: the same wordmark becomes the header logo, and the tile ribbon becomes the floating artwork field.

## First screen
centred column: kicker (12.6px) → a 3-line 54px serif sentence → a grey pill button "↓ Scroll down"; wordmark at the top centre; black menu square top-right; a vertical pill progress rail on the right edge (x≈1386–1422, y≈410–490). About 15 artwork tiles float around at different depths: about half are full-colour and half are 20%-grey placeholder rectangles, which gives depth with no blur. Elements: about 5 UI items plus tiles. Hook: a single serious sentence floating in a calm cloud of real artworks.

## Navigation
minimal corners: the wordmark (centre at load, moves to top-left x≈18 when you scroll) and one black rounded-square menu button top-right (36×36); a right-edge chapter rail (3 dots/segments = 3 chapters; anchors at y=0, 16,740 and 46,350 px). Everything sits in one `position: fixed` full-screen `div.nav` layer. A "Click on an artwork to learn more." toast (light grey pill) appears bottom-right once tiles are interactive. Menu-open animation: not observed (the icon-only button had no text or aria label, so the script did not find it as a menu).

## Layout and grid
No grid: a single centred column (headline block 810px wide at x=315, centre 720) over a free-floating tile field. Side margin of the content is 315px at 1440; 31px at 390 (text column 314px wide, `max-width: 500px`). Page length: **81,450 px = 90.5 screens**, which is a scroll runway (all content is position: fixed and driven by scroll). 3 chapters. Section rhythm: one sentence at a time centred below a hero artwork, with a horizontal **year timeline** (a 1px line with the current year label, "1700 → 1936 → 1940") at the bottom centre. Whitespace: very generous; 50–60% of each screen is empty white.

## Type behaviour
Sentences enter by **opacity**, scrubbed: mid-transition text reads in grey and then turns black (scroll-14 shows a sentence at partial opacity); no masks, no splits, no scramble · size contrast: 54px sentence vs 12px caption = 4.5×; h1 72px vs 12px = 6× · case: sentence case everywhere, no caps.

## Motion
smooth scroll: yes, **Lenis** (`html.lenis`). Probe: one 300px wheel tick → scrollY 44 → 111 → 181 → 241 → 287 → 298 over 0 / 60 / 150 / 300 / 600 / 1000 ms (an exponential lerp settling in about 1 s) · pinned: everything is fixed; the 81k px page is pure runway · transitions: tiles drift past at different speeds (parallax by depth), and one hero artwork stays centred and changes scale · **scroll-scrubbed**: 15+ `ScrollTrigger` instances, all `scrub: true`, start/end computed as fractions of the page height (`()=>t*s.height`) · easing on UI: CSS `cubic-bezier(0.39,0.575,0.565,1)` (easeOutSine) 0.5s; `cubic-bezier(0.25,0.46,0.45,0.94)` (easeOutQuad) 0.3–0.4s; `cubic-bezier(0.215,0.61,0.355,1)` (easeOutCubic) 0.8s; and `all 0.2s ease` on 20 elements · page transitions: none (single page). The "ring/cluster gathering" from refs.ts was **not reached**: 24 half-screen steps cover about 12 of the 90.5 screens, all inside chapter 1.

## 3D / WebGL / media
One full-viewport **WebGL2** canvas (1440×900, recorded via the getContext hook) renders every artwork tile as a textured quad at varying depth, with the grey placeholder rectangles as far-depth or not-yet-loaded tiles. It is central: it IS the page. No video. 17 `<img>`, 17 `<svg>` (icons).

## Interaction details
cursor: default (`auto`), no custom cursor (the cursor-follow check found nothing). Hover: the menu button and the "Scroll down" pill showed no computed style change after a 700 ms hover (`transition: all` is declared, but no visible delta was captured). Click an artwork to open its record. Small details: a running **year counter on a timeline hairline**, an artwork caption with an underlined title plus a grey credit line ("No copyright" link), a 3-segment chapter rail in a translucent pill, and a "rotate your device" notice (10px) for landscape phones.

## Phone
Same composition scaled: wordmark top centre (52px wide), black menu square top-right (about 40px), chapter rail on the right edge. Sentence at 29.12px, 4 lines, centred; kicker grows to 14.56px. The hero artwork is 242px wide, centred, with the caption below. Toast becomes "Tap on an artwork to learn more." in a full-width grey pill at the bottom. Nothing structural is dropped; it is still 90.5 screens. No horizontal overflow.

## Tech detected
**Nuxt 3 / Vue** (`window.__NUXT__`, `__nuxt`, `__VUE__`, `data-v-*` attributes, `/_nuxt/*.js` chunks) · **GSAP ScrollTrigger** (`window.ScrollTrigger`, 15+ scrubbed triggers; `gsap` itself is not global) · **Lenis** (`html.lenis` class, lerped scroll probe) · **WebGL2** canvas (custom renderer; no `THREE` global) · fonts self-hosted under `/tracingart/fonts/`.

## Clean because… / Insane because…
Clean: white ground, black serif, nothing else; one sentence per screen; no boxes, no rules except one timeline hairline; icon-only chrome in the corners; colour comes only from the content.
Insane: hundreds of real artworks float in WebGL depth and reorganise as you read; the loader wordmark becomes the logo, and the thumbnail ribbon becomes the field; a 90-screen scrubbed story driven by a year counter.

## Evidence
shots/getty-tracing-art/: load-0_2s, load-0_6s, load-1_2s, load-2s, load-3_5s, load-6s, first-screen, scroll-01…scroll-24, hover-0-nav-before/after, hover-1-nav-before/after, hover-2-button-before/after, phone-0…phone-3 (.jpg), data.json (every measurement quoted here).
