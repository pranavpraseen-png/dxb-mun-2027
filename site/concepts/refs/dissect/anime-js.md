# Anime.js (LIKED)
https://animejs.com/ · Awwwards page shows "Site of the Day, May 6 2025" (SOTD 7.62, Dev 7.84); no "Site of the Month" line on the site page (refs.ts says SOTM May 2025, not confirmed there) · AI, tech & dev tools · credit on Awwwards: Julian Garnier · Awwwards palette: #252423, #DAD5D0 (matches our measurement) · Awwwards "Elements": The complete animator's toolbox, Scroll scrubber, Lightweight and modular, Header animation, Start animating, Anime.js features · no fonts listed on Awwwards

## Fonts
display: **DINish** (variable, axes slnt/wdth/wght; by Bert Driehuis / playbeing, derived from D-DIN), loaded as family `DIN` from `/assets/fonts/DINish[slnt,wdth,wght].woff2` and always set to **`font-variation-settings: "wdth" 125`** (the Expanded width) · licence: **free, SIL OFL 1.1** (github.com/playbeing/dinish) · hero "All-in-one animation engine.": 64px/700, line-height 55.36px (0.865), tracking 0, at 1440; 40px/700, line-height 34.6px at 390 · feature titles: 52px/700, line-height 44.98px (0.865), each in its own accent colour; 32px at 390 · section titles: 40px/800, tracking -0.5px, line-height 38px; 32px/800 at 390 · sentence case throughout, never caps for display.
text: DINish expanded, 20px/600, line-height 25px, colour #D5D3D1 (hero sub) · 16px/400, tracking -0.24px, line-height 24px (paragraphs) · 12px/400 list items (#B4B1AF).
labels/nav: **Berkeley Mono** (US Graphics Company), loaded as `Mono` from `/assets/fonts/BerkeleyMono-Regular.woff2` (only 400 Regular is shipped; the 600 weight used in the UI is browser-synthesised bold) · nav, buttons and bullets: 12px/600, tracking 0.12px (0.01em), line-height 24px, UPPERCASE, #B4B1AF (nav) or #FF4B4B (Sponsor) · the phone menu uses the same at 20px/600, line-height 40px.
mono: Berkeley Mono 12px/400, line-height 12px in code cards (One Dark syntax colours #ABB2BF, #61AEEE, #98C379, #D19A66, #C678DD); `npm i animejs` at 14px · **Digital-7** (Style-7) is declared for a seven-segment readout but stayed "unloaded" on the homepage.
free equivalent we can legally ship: DINish → **ship it as is** (OFL). Berkeley Mono (retail) → **Commit Mono** (OFL): the same neutral, slightly squarish grotesque-mono drawing with an even rhythm at 12px caps; JetBrains Mono (OFL) is a wider-known second choice. Digital-7 (DaFont: "free for personal use" only) → **DSEG7 Classic** (OFL), a true seven-segment face.

## Colour
ground **#252423** (warm near-black; html, body and `--backgroundColor`; 2.59M px² at first screen) · raised surfaces #302E2D (`--hex-bg-3`; code cards, pills) and #353432 · ink #F6F4F2 (`--hex-fg-1`, headlines) · body #D5D3D1 (`--hex-fg-2`) · UI grey #B4B1AF (`--hex-fg-3`, nav and labels; the most-used text colour at 1,503 chars) · muted #93908D (`--hex-fg-4`) and #615E5B (`--hex-fg-5`) · light "world" ground **#DAD5D0** (`--worldColorLight1`) for the exploded-drawing chapter (y≈1800–5000) with ink #302E2D/#353432 · drawing lines #93908D-grey hairlines, 3D rim light `--rimColor` #FFC7A8 · accent primary **#FF4B4B** (`--hex-red-1`; Sponsor button, SVG fills ×49) · one accent per feature: Intuitive API #FF4B4B, Enhanced transforms #FFA828, Scroll Observer #00FFAA, Advanced staggering #4D9CFF, SVG toolset #05DBE9, Springs #B7FF54 (plus #FFCC2A, #8DFF55, #A369FF, #7C85FF in the ring). The token system is 23 hues × 8 steps (`--hex-<hue>-1…8`, step 1 = neon, step 8 = almost the ground, e.g. red #FF4B4B → #2C2523). Colours: 2 grounds + 4 greys + about 12 neon accents. Dark. Accent appears as: the rainbow segmented ring of the dial, the feature title colour, and the code-card syntax.

## Loading screen
yes · about 3.5 s (the hero is complete by the 6 s frame) · sequence: 0.6 s pure black (#000) → about 2 s a ring of **red hairline tick marks draws itself clockwise** (a dial being calibrated) → 3.5 s the full dial appears with its rainbow segmented outer ring on #1B1A19-ish dark, and the headline starts revealing ("Al…" visible, wiped in left to right) · exit: no wipe; the dial IS the hero, the ticks simply become its scale, and the ground lifts to #252423 · the loader becomes part of the hero: yes, entirely.

## First screen
3 zones: headline block left (x=64; 64px DINish expanded, 3 lines + 20px sub), the **dial instrument dead centre** (about 640px diameter: rainbow segmented outer ring, red tick scale, an inner red waveform of horizontal lines and a dotted easing curve being drawn), and bottom chrome (`npm i animejs` copy chip + outlined "LEARN MORE ↓" button bottom-left, "Sponsored by" + logo tile bottom-right; this bar is `position: fixed` at y=788, 112px tall). Header: logo left, mono nav right. About 12 elements. Hook: a single precision instrument that is visibly alive.

## Navigation
bar · `header` 72px tall (56px at 390), static (scrolls away), transparent · items (desktop): logo · DOCS · EASINGS · LEARN · CodePen icon · GitHub icon · SPONSOR (filled red pill, white heart icon) → 7 places · icons sit before each label (line icons 14px) · hover: label colour #B4B1AF → #F6F4F2 (`color 0.1s ease-out`) · phone: hamburger (two lines) top-right; the menu is a 352px off-canvas `nav`, fixed at x=390 (slides in from the right) listing DOCS, EASINGS, LEARN, EXAMPLES, GITHUB, SPONSOR in Mono 20px/600 caps. Open animation: not captured (the script did not identify the icon button).

## Layout and grid
max content width 1392px (24px header gutters); content gutters **64px** at 1440; 16px at 390 · `max-width` tokens: 432px (text blocks ×12), 320px, 336px, 1500px · columns: effectively 3 zones (text left 64–400, stage centre, cards right 1040–1376) · no CSS grid on the home · page length **21,142 px = 23.5 screens** (23.9 at 390) · rhythm: each chapter is a fixed full-screen stage plus 900px `section-spacer` blocks giving it scroll time (4 spacers = 4 screens for the toolbox chapter), so one idea holds for 2–4 screens · whitespace: generous; the stage dominates.

## Type behaviour
the hero headline is revealed by a left-to-right wipe (3.5 s frame shows "Al" cut by a hard edge, no blur) · feature titles swap with the section (each new title appears in its accent colour; no split-letter motion observed in stills) · size contrast: 64px vs 12px labels = 5.3×; vs 20px sub = 3.2× · case: sentence case display, UPPERCASE mono for all UI.

## Motion
smooth scroll: **no** (probe: a 300px wheel → scrollY 300 at 0 ms; native) · pinned scenes: yes, `fixed-section` stages (`position: fixed` full-screen) with spacer runway · the persistent object: the dial stays centred through every feature section and re-skins (red square, then morphing shapes, then a lime circle for Springs) while the rainbow ring dims except for the active segment · chapter 2: the dial **explodes into a 3D engine** (dark, rim-lit #FFC7A8, scroll-02) that then turns into a **line drawing on the light #DAD5D0 ground with mono call-out leaders** (waapi, timeline, stagger, svg, spring, animation / timer, easings, draggable, scroll, scope) · a bottom-right **scrub ruler** (tick strip with a red playhead, in a #302E2D pill) shows progress through the section · CSS transitions: `transform 0.5s ease-out` (×50), `color 0.1s ease-out` (×21), `opacity, color 0.125s ease` · page transitions: none observed.

## 3D / WebGL / media
One full-viewport **WebGL2** canvas (2880×1800 backing store = DPR 2 internally even at DPR 1) renders the 3D engine; 5 × 800×800 **2D canvases** (669–697px CSS) draw the dial layers · 110 inline SVGs (icons, ticks, leader lines) · no video · central: yes, the instrument is the whole page.

## Interaction details
cursor: default; a `div.scroll-cursor` + `scroll-cursor-ghost` (3px wide) exist, which is a scroll-position marker in the ruler, not a pointer follower · hover: nav grey → white; outlined "LEARN MORE" #93908D → #B4B1AF; `transform 0.125s ease-out` on the button · details: copy-to-clipboard chip with icon, version selector (4.5.0 / 3.2.2 / 2.1.0), "KB" bundle-size readouts in mono, funding goal meter, code cards with One Dark syntax colours, arrows "→" before caps bullets, hairline divider (1px #F6F4F2 at low opacity, 256px) above the bullet list.

## Phone
Single column: header 56px with a hairline under it, logo left + hamburger right; headline 40px over 2 lines, sub 16px; the dial fills the full width (about 370px) under the text; the bottom bar keeps "LEARN MORE ↓" and the sponsor tile, but **drops the npm chip**. Feature sections keep the dial; titles 32px. Off-canvas right menu. 23.9 screens, no horizontal overflow.

## Tech detected
Hand-built static site, no framework (no Vue/React/Nuxt/Next markers; globals only `gtag`, `dataLayer`) · **Anime.js v4 itself**, bundled as ES chunks (`/assets/js/home.js` + `/assets/js/chunks/chunk-*.js`; no global, as v4 is ESM) · Web Workers via `blob:` scripts · WebGL2 (3D engine) + Canvas 2D (dial) · Carbon Ads, Google Analytics, Cloudflare Insights · self-hosted fonts.

## Clean because… / Insane because…
Clean: one warm-black ground and one object per screen; every UI word is 12px mono caps in one grey; headline left, instrument centre, cards right, every time; a strict token ramp (23 hues × 8 steps) instead of ad-hoc colours.
Insane: the loader's tick marks become the hero dial; the same instrument persists and re-tunes per section; it explodes into a rim-lit 3D engine and then a blueprint with mono call-outs; a scrub ruler shows the timeline like an editor.

## Evidence
shots/anime-js/: load-0_2s, load-0_6s, load-1_2s, load-2s, load-3_5s, load-6s, first-screen, scroll-01…scroll-24, hover-0…3-nav-before/after, hover-4-button-before/after, phone-0…phone-3 (.jpg), data.json.
