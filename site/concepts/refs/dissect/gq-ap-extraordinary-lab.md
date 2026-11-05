# GQ × Audemars Piguet · The Extraordinary Lab (LIKED)
https://www.gq.com/sponsored/story/the-extraordinary-lab · Awwwards page text: "Site of the Day - Mar 26, 2026", SOTD 7.74, Dev 7.18 (Animations/Transitions 8.60); by Immersive Garden. refs.ts says "SOTM Mar 2026": no SOTM line was in the page text, so that label is unconfirmed here · luxury / editorial

Measured 2026-11-05 with `scripts/batch-b.mjs` (headless Chrome with SwiftShader WebGL, 1440×900 and 390×844, DPR 1). Raw numbers: `shots/gq-ap-extraordinary-lab/measure.json`.

**What limited this capture:**
- **WebGL rendered:** `webgl` and `webgl2` on "ANGLE … SwiftShader driver"; the wireframe lab is visible.
- **The host page is a Condé Nast article.** It loads about 45 third-party ad and analytics scripts (GTM, DoubleClick, Prebid, Amazon APS, TikTok, Snap, Pinterest, LinkedIn, Bing, Permutive…). Together with SwiftShader, each screenshot took about 10 s.
  - The 0.2 s frame failed; the others landed at 10.2 / 20.2 / 30.2 / 40.2 / 50.3 s.
  - The desktop pass hit its 170 s cap after the enter click and one scroll step.
- **The experience is a single fixed screen** (page height = viewport: 900 px, 844 px on phone). Scroll and drag drive the camera inside the canvas, so the "scroll story" can't be sampled as page positions.
- **Story beyond the intro:** partly seen on phone (subtitled intro). For the rest, see the Awwwards tags (secondary evidence).

## Fonts
The experience ships its own fonts from `interactive.gq.com/audemars-piquet-gq-rd5/assets/`. The `GQSans` and `GaramondPremierPro` faces in `document.fonts` belong to the GQ host page chrome, not the experience.

- **display (title "THE EXTRAORDINARY LAB"):** not a DOM text node; it's drawn in the WebGL canvas and gets the canvas's RGB-split post-process.
  - The letterforms are a thin, wide-set grotesque in caps. The experience bundle ships **GT America Standard** Thin (200), Light (300), Regular, Medium, Bold and Black. Name table: "GT America, © 2016 Noël Leu, manufacturer Grilli Type GmbH".
  - So the title is very likely GT America Standard Thin or Light. Not provable from computed style.
  - Size read off the screenshot: cap height ≈ 75 px at 1440, "EXTRAORDINARY" ≈ 855 px wide, 3 centred lines, line gap ≈ 95 px. That implies a font size of about 100–105 px.
  - Tracking looks slightly open, about +0.02em (estimate from the screenshot, not measured).
- **Licence:** **Retail** (Grilli Type).
- **labels/nav:** `GT-America` (computed).
  - "SOUND": 500, 11 px (13 px on phone), uppercase, lh 1.2, ls normal, `#FFFFFF`.
  - The CTA "CLICK ANYWHERE TO ENABLE SOUND": 400, 10 px, lh 14 px, uppercase, inside a 1 px white @30 % box (about 230×44 px).
  - The strapline "FOLLOW A STORY TOLD BY CAM WOLF, GQ WATCH EDITOR AND J BALVIN": bold caps, about 11 px (from the screenshot).
- **text (subtitles):** a serif in mixed case, centred, white, with the next words greyed until they're spoken ("Joining me in conversation is the very talented J Bal|vin.", `phone-3`).
  - The bundle ships **Adobe Garamond Pro** Regular (`Garamond-Adobe-Regular.woff2`; name table "Adobe Garamond Pro, © 1989–2001 Adobe Systems, designer Robert Slimbach"), and `Adobe Garamond Pro 400` was the only serif face reported as **loaded**.
  - **Retail** (Adobe). The phone subtitle is about 19 px.
- **mono:** `DM Mono` faces are declared by the host page, but they were unloaded and not seen in the experience.
- **Free equivalents:**
  - **GT America → Libre Franklin** (OFL, Google, 100–900). GT America blends Franklin Gothic with neo-grotesque construction, and Libre Franklin is the free Franklin-style grotesk that has a true Thin and ExtraLight for the hairline title. Public Sans (OFL, also Franklin-derived) is the second choice.
  - **Adobe Garamond Pro → EB Garamond** (OFL, Google). It's the same Garamond model (Claude Garamont's roman) at text size, with real italics.

## Colour
- **ground:** pure black `#000000` (the splash screen and canvas).
- **ink:** pure white `#FFFFFF`. Type, wireframe lines, and "plans, sketches and handwriting" textures are all white.
  - Hairline UI uses white at 30 % (the CTA border) and 40 % (SVG strokes).
  - The title has a red/cyan chromatic fringe (post-process), not a colour token.
- **accents:** none in the UI.
  - Light itself is the accent: a soft white spotlight bloom on the lab table (`scroll-01`, `phone-0`).
  - Warm footage appears in the intro film (a dusk horizon, orange band; `phone-3`), which is media, not CSS.
- **Host tokens:** GQ's surface `#121212` and gold accent `#C6A348` (`--color-border-accent`, `rgba(198,163,72)`). They're not visible inside the experience.
- **Number of colours:** 2 (black and white) plus white alpha steps.
- **Light or dark:** dark.
- **Awwwards palette:** not shown.

## Loading screen
- **Yes.** Its duration couldn't be measured: the first successful frame was at 10.2 s, already showing the finished intro.
- **What it shows (phone, `phone-intro`, ≈6 s after load):** a black screen with the white "GQ × AP" lockup dead centre, while the wireframe lab fades in faintly behind it.
- **Exit (comparing phone-intro with the desktop 10 s frame):** the lockup moves up to sit above the title (desktop y≈180), and the 3-line title, strapline, outlined "CLICK ANYWHERE TO ENABLE SOUND" box and a headphones icon appear.
- **The loader becomes the hero:** the lockup stays in the hero, and the 3D scene that faded in behind the loader *is* the hero.
- **Enter (clicking the CTA, `enter-before` → `enter-after-1s/3s/6s`):** the title and UI fade to about 40 % and then out, the scene greys, and the camera starts drifting into the room. After that, a wheel step lands the camera close on a lit table (`scroll-01`).

## First screen
- **Composition:** a black, full-bleed 3D room built only of white hairlines. Wall panels carry handwritten letters, a pocket-watch sketch, an archive photo of the AP manufacture and a certificate; lab tables are drawn as wire boxes with floor plans; perspective lines cross at a vanishing point.
- **Centred column:** the "GQ × AP" lockup, then the 3-line thin caps title, then one caps strapline, then one outlined button, then a headphones icon.
- **Corners:** "BACK" (top-left) and "SOUND" (top-right) in the header.
- **About 6 UI elements.**
- **Hook:** the whole world is a pencil-and-ink drawing in 3D space, and you walk into it.

## Navigation
- **Type:** minimal corners. "GQ × AP" or "BACK" top-left, "SOUND" top-right; nothing else (`phone-3`: "GQ × AP" left, "SOUND" right, 24 px margins).
- **No menu:** there's no menu button (the phone menu search found none). Progress is linear, with a "› SKIP INTRO" link bottom-centre on the phone.
- **Behaviour:** fixed over the canvas.

## Layout and grid
- **Single screen, no page scroll:** 1.0 screen at 1440 and at 390. Everything is centred on one vertical axis.
- **Margins:** header 56 px at 1440 ("SOUND" ends 56 px from the right edge) and 24 px at 390.
- **Grid:** none (1 column). Huge negative space: the UI takes up less than 5 % of the screen.
- **Sections:** chapters happen inside the canvas (camera moves), not as DOM sections.

## Type behaviour
- **Title:** thin caps; each letter sits on a faint rectangular "type box" (visible behind "THE" in `load-0_6s`), like a drafting or typesetting guide, with an RGB-split fringe. It fades with the UI on enter.
- **Subtitles:** word by word, karaoke-style. Spoken words turn white and upcoming ones stay grey (`phone-3`).
- **Size contrast:** about 100 px title vs 10–11 px labels = **about 10 : 1** (estimate; the title size is read from the screenshot).
- **Case:** title and labels UPPERCASE; subtitles in mixed-case serif.

## Motion
- **Smooth scroll:** Lenis is present (`window.lenisVersion`), but the page doesn't scroll; wheel and drag move the 3D camera.
- **Hammer.js** (`window.Hammer`) handles gestures; a custom `div.draggingCursor` (fixed) appears while dragging.
- **Pinned:** the whole experience (one fixed canvas, 2160×1350 backing store for a 1440×900 view, i.e. rendered at 1.5× even at DPR 1).
- **Transitions:** UI cross-fades and the camera dollies and cuts between the lab, a lit table close-up and the film intro (`phone-3`).
- **Easing feel:** slow and filmic. Durations weren't measurable.
- **Page transitions:** n/a (single page).
- **Awwwards Dev score** for Animations/Transitions: 8.60.

## 3D / WebGL / media
- **Central:** a three.js (`__THREE__`) scene rendered as **white line drawings**: wireframe furniture, plan drawings, and handwriting and photo textures on floating panels. A Blender scene, per Awwwards "Blender".
- **Post-processing:** chromatic aberration and glow ("sparkle" stars where lines cross); a soft spotlight pool on the table.
- **Media:** a voice-led film intro with subtitles (on phone); there are no `<video>` elements in the DOM, so it's probably a texture in the canvas (not verified). Sound is opt-in through the CTA.

## Interaction details
- **Cursor:** a custom drag cursor (`draggingCursor`).
- **Gestures:** Hammer.js; Awwwards tags "Gestures / Interaction".
- **Sound:** an opt-in "CLICK ANYWHERE TO ENABLE SOUND" with a headphones icon, plus a SOUND toggle.
- **Small details:**
  - per-letter guide boxes behind the title;
  - star-glints where wireframe lines meet;
  - handwritten archive letters as wall textures;
  - karaoke subtitles;
  - "SKIP INTRO".
- **Hover:** "BACK" and "SOUND" captured before and after; no visible change at capture resolution.

## Phone
- The same single screen.
- The intro is the lockup alone over the dim wireframe (`phone-intro`). After a tap, the camera lands on a brightly lit table holding documents (`phone-0`), then plays the subtitled film intro (`phone-3`).
- The header shrinks to "GQ × AP" and "SOUND" at 24 px margins; the title and button aren't shown after the tap.
- The canvas is rendered at 585×1266 for 390×844 (1.5×).

## Tech detected
- **Experience:** **Nuxt** (`__NUXT__`), **Vue** (`__VUE__`), **three.js** (`__THREE__`), **Hammer.js**, **Lenis** (`lenisVersion`). Assets come from `interactive.gq.com/audemars-piquet-gq-rd5/`.
- **Host:** Condé Nast "verso" GQ article template with a Fides consent tool (no banner was shown to our UA), GTM and about 45 ad/analytics scripts.
- **Awwwards technologies:** WebGL, Nuxt.js, Blender, 3D, Responsive Design.

## Clean because… / Insane because…
- **Clean because:**
  - black and white only;
  - one thin caps title, one strapline, one outlined button;
  - nav reduced to two corner words;
  - no page scroll and no sections, just one screen.
- **Insane because:**
  - an entire room drawn in white hairlines in 3D, and you walk into it;
  - archive handwriting and plans float as panels;
  - an RGB-split title with drafting guide-boxes;
  - karaoke subtitles over a voiced film;
  - sound designed in, opt-in.

## Evidence
`shots/gq-ap-extraordinary-lab/`:
- load-0_6s (10.2 s actual), load-1_2s, load-2s, load-3_5s, load-6s (20–50 s actual). The 0.2 s frame failed.
- enter-before, enter-after-1s, -3s, -6s
- first-screen (post-enter)
- hover-1-nav (BACK), hover-2-nav (SOUND), each before/after
- scroll-01
- phone-intro, phone-0 … phone-3
- measure.json

Secondary, from the earlier board capture: `concepts/refs/shots/gq-ap-extraordinary-lab-0.jpg … -2.jpg` (the same intro).

Awwwards: https://www.awwwards.com/sites/gq-ap-the-extraordinary-lab (read 2026-11-05).
