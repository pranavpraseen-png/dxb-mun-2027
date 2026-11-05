# Dissecting the reference sites (shared brief; RE-READ before each site)

The owner reviewed the reference board (`concepts/refs/`, data in `refs.ts`) and gave this instruction, word for word:
> "from everyhting i liked, u shud copy the fonts the loading screens everyhting n find commons between which I DIDNT LIKE. take every aspect disect make a whole strucutre"

**LIKED (11):** getty-tracing-art, anime-js, dropbox-brand, terminal-industries, gq-ap-extraordinary-lab, era-residence, lando-norris, oryzo-ai, igloo-inc, siena-film, outfit-hellohello
**NOT LIKED (7):** montfort, cartier-ww25, floema, auriga-space, david-whyte, immersive-garden, age-of-union

Look up the exact slug and URL in `refs.ts`.

Then, word for word: "colours, fonts, everyhting" and "from the references i selected i need everything … such as fonts colours everyhintg … that makes it insane n absolutely clean".
So the LIKED sites' **colours and fonts become our theme**, replacing the earlier Dusk + Official Record pick. Measure colours as exact hex values and fonts as exact families, weights, sizes and tracking.

## Goal
Measure each site, every aspect of it, with evidence. Never guess. If you can't observe something, write "not observed" and say why.

## Method: puppeteer-core, through the lock only
- Write your script in `concepts/refs/dissect/scripts/<your-agent-name>.mjs`, modelled on `scripts/live-shots.mjs` (it shows how Chrome is found).
- Run it ONLY with `node scripts/heavy.mjs "node concepts/refs/dissect/scripts/<file>.mjs"`, from `site/`.
- Memory is very tight:
  - one site per browser launch;
  - close the browser after each site;
  - 40 s timeout per site;
  - JPEG quality 75, deviceScaleFactor 1.
- Never sign in, submit forms or accept non-essential cookies. Decline or close banners if you can; otherwise capture as-is.

## What to capture per site
Save into `concepts/refs/dissect/shots/<slug>/`.

1. **Loading sequence:** load at 1440×900 and screenshot at 0.2, 0.6, 1.2, 2, 3.5 and 6 s after navigation starts, without waiting for idle.
2. **Scroll story:** scroll in steps of 0.5 viewport, with a 700 ms wait at each step, screenshotting each step. Cap at 24 steps. Also record the total page height in screens.
3. **Hover:** hover the main nav links, the primary button and one card or link, screenshotting before and after each.
4. **Phone:** at 390×844, capture the first screen and 3 scroll steps. If there's a menu button, open it and capture that too.
5. **Measured with `page.evaluate`:**
   - **Fonts:**
     - `document.fonts` (each loaded family, weight and style);
     - every `@font-face` src URL, found by reading the stylesheets you can access;
     - the computed `font-family`, `font-size`, `font-weight`, `letter-spacing`, `line-height` and `text-transform` of the largest heading, the body paragraph, the nav links, the buttons and small labels or kickers.
   - **Colours:** the computed `background-color` of html and body and the main sections, the text colours, and the root CSS custom properties that hold colours. List the distinct colours, most used first.
   - **Tech:**
     - script src hostnames and filenames;
     - window globals such as gsap, ScrollTrigger, Lenis, THREE, PIXI, barba, Swup, Webflow, __NEXT_DATA__, __NUXT__, Framer and Spline;
     - whether there are canvas or WebGL contexts;
     - whether there are video elements.
   - **Layout:**
     - the max content width;
     - side margins at 1440 and at 390;
     - the column count, judged from where the main blocks sit;
     - the gap between sections;
     - the nav height and position (fixed, sticky or static);
     - the number of nav items and the nav labels.
   - **Cursor:** any custom cursor element, or a `cursor` CSS value on the body.
6. **The site's Awwwards page:** read the "Technologies" and "Colors and fonts" sections and the credits, if they're shown. Its link is in `refs.ts`.

## Write one dossier per site: `concepts/refs/dissect/<slug>.md`
Use these EXACT headings, so the dossiers can be compared line by line.

```
# <Site name> (<LIKED|NOT LIKED>)
URL · award · sector
## Fonts
display: family, foundry, licence (free/OFL/Google, or retail), sizes px at 1440 and 390, weight, tracking, case
text: …   ·   labels/nav: …   ·   mono: …
free equivalent we can legally ship (for retail fonts), with the reason it's close
## Colour
ground, ink, accents (hex), number of colours, light or dark, where the accent appears
## Loading screen
yes/no · duration · what it shows (counter, %, logo, line, image sequence, 3D build) · how it EXITS into the first screen (wipe, split, scale, morph, fade) · whether the loader becomes part of the hero
## First screen
composition (what is biggest, where things sit), how many elements, one line on the "hook"
## Navigation
type (bar, minimal corners, menu button, full-screen overlay) · items · behaviour on scroll · menu open animation
## Layout and grid
max width, margins, columns, whitespace feel, number of sections, page length in screens, section rhythm
## Type behaviour
how headings enter (lines, words, chars, mask, scramble, none), size contrast (largest vs body ratio), case
## Motion
smooth scroll (yes/no, which), pinned scenes, section-to-section transition, scroll-scrubbed vs triggered, easing feel, typical durations, page transitions
## 3D / WebGL / media
what is rendered, and how central it is
## Interaction details
cursor, hover effects, drag, sound, small details (counters, numbered labels, hairlines, coordinates, timecodes)
## Phone
how the design adapts, what is dropped
## Tech detected
libraries and frameworks, with evidence
## Clean because… / Insane because…
two short lists
## Evidence
list of screenshot files
```

## Rules
- Borrow techniques and structure only, never brand assets, copy or images. We copy fonts only when they're free to ship; for retail fonts we name the closest free equivalent.
- Don't edit anything outside `concepts/refs/dissect/`. Don't install anything, don't deploy or commit, and never start a dev server.
- In your report, list each site's 5 most telling facts.
