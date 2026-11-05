# Igloo Inc (LIKED)
https://www.igloo.inc/ · Awwwards Site of the Day, 23 Jul 2024, plus Dev Award (refs.ts says Site of the Year 2024; the awwwards.com/sites/igloo-inc page I read on 2026-11-05 showed only the SOTD and the Dev Award, so the SOTY claim is not confirmed here) · AI, tech and dev tools (Igloo Inc. is a consumer-brands company: the on-screen manifesto says "Community, AI, and crypto")

Awwwards credits: abeto and Bureaux. Scores: SOTD 7.92 (design 8.05, usability 7.5, creativity 8.31, content 7.91); Dev 7.66 (animations 9.60, WPO 8.00, responsive 8.40, semantics 6.60, accessibility 6.60, markup 6.40). Tags: Animation, Infinite Scroll, Transitions, 3D. Colours listed: #b6bac5, #383e4e. Fonts: none listed.

## Fonts
Important: every letter on this site is drawn inside WebGL as MSDF text (multi-channel signed-distance-field glyphs), not as HTML text. The DOM has no visible text at all (my text scan found 0 text elements at 1440 and at 390). So sizes come from glyph-advance measurements on the screenshots: IBM Plex Mono's advance is 0.6 em, so size = (line width / characters) / 0.6.

display: there is no display font. The biggest type is the IGLOO wordmark, a custom rounded, extended logotype drawn from a texture (`logo-datatexture.ktx2`), about 158 × 32 px at 1440. It is a logo, not a font.
text: IBM Plex Mono Regular. Foundry: IBM, produced by Bold Monday (designers Mike Abbink, Paul van der Laan, Pieter van Rosmalen). Version 2.3, **SIL Open Font License 1.1, free to ship**. All of this is read from the font file's name table, not from memory. Corner copy measures about 13.8 px at 1440 ("// Copyright © 2026": 19 characters across 158 px gives 8.3 px per character, so 13.8 px) and about 12.1 px at 390 (138 px for 19 characters). Line height is about 14.5 px (≈1.05), so the lines are set very tight. Weight 400, tracking 0, mixed case. The manifesto block is right-aligned and ragged-left.
labels/nav: IBM Plex Mono Medium (the same licence and foundry, read from its own file; @font-face family "IBMPlexMono-Medium"). It's used for the portfolio callouts mid-scroll ("PORTFOLIO_CO_02 / OVERPATT", "TEMP 29.92", dates), at about 19 px (170 px for 15 characters), in UPPERCASE, with underscores as separators. The MSDF atlas loaded is `IBMPlexMono-Medium.json` plus `IBMPlexMono-Medium-datatexture.ktx2` (110 KB).
mono: Plex Mono is the only family on the site. Section marks are typed as ASCII: "//", "//////", "_".
free equivalent we can legally ship: none is needed. IBM Plex Mono is OFL (it's on Google Fonts and Fontsource), so we can ship the exact font.

## Colour
ground: **#a0a5b1**. This is measured: it's the html and body background, set as the CSS custom property `--bgColor: #A0A5B1`, and it's the flat colour of the whole loading screen. The rendered 3D scene keeps to a narrow band of cool blue-greys; the pixel histogram of the first screen (most common first) is #8d919d, #8a8e9a, #9195a2, #818692, #9599a5, #858996, #b5b9c5, #999eaa, #7d818e, #9da1ad, #bdc1cc, #b2b6c1.
ink: white. The UI text is white (#ffffff, the most frequent colour literal in the app's JS, 17 uses) with a faint glow. Awwwards lists #b6bac5 (light) and #383e4e (dark slate).
accents: there is no UI accent colour. The only "accent" is light: icy blue-white glow inside the igloo and on the shattered rings. Blue-tinted literals in the JS include #d1e3ff, #b5d5ff, #d7ebfa, #e1e6f1, #a7b2d6 and #83a1c5. Their exact roles are not observed; they are JS constants, probably light and fog tints. A few warm literals (#cda05e, #ab8349, #904619) also exist, but I didn't see them on any screen I captured.
count: effectively 1 hue (cool grey-blue) plus white. It reads as light-mid, not dark: a foggy, overcast monochrome.

## Loading screen
yes · about 5 s of ASCII loader, then about 4 s of 3D build, so roughly 9 s until the first screen is calm (frames: `probe-loader-0700ms` to `probe-loader-9100ms`, plus `load-*`).
- **What it shows:** a single centred line of mono ASCII characters ("-==++==---", "=------===") on flat #a0a5b1. The characters shuffle in place as a progress bar, about 95 px wide and 9 characters long, with no % and no number.
- **How it exits:** at about 5–6 s the ground stays the same grey and a white hairline **plexus** draws itself (`maxPlexusPoints` and `maxPlexusConnections` in the JS). It's a 3D web of white lines with tiny numbered nodes ("47", "59", "83") around a wireframe igloo seen from above. Then the camera swoops down to eye level while the wireframe fills in as a photoreal snow igloo and the plexus fades.
- **Does the loader become part of the hero:** yes. The plexus points survive as 3–5 numbered points on the igloo blocks, joined by hairlines ("50", "52", "21", "66", "49", "30", "22", "16"). The corner text decodes in with a character scramble ("Kyv jfxxflk fx" becomes "Our mission is").

## First screen
- **Composition:** one 3D object dead centre, a snow igloo of loose blocks lit from inside, on a foggy mountain field filling the frame.
- **Text:** small mono text pinned to the corners, with a 50 px inset at 1440:
  - top-left: IGLOO logo at (50, 46); "// Copyright © 2026" at y 99; "Igloo, Inc. / All Rights Reserved." at y 130.
  - top-right, right-aligned to x 1390: "////// Manifesto", then a 7-line, 14 px manifesto.
  - bottom-left: "Scroll down to discover." and a speaker icon with "Sound: Off" at y 842.
- **Element count:** about 7 elements (object, logo, 4 text groups, sound toggle).
- **Hook:** the igloo is a living object. Its blocks hover slightly apart and re-settle, the numbered hairline points float on it, and the camera turns with the cursor.

## Navigation
- **Type:** minimal corners. There is no menu, no nav bar and no links on the first screen; the logo is the only fixed item.
- **Items:** the logo and "Sound: Off" (a toggle). The last scene has a social carousel ("Medium · LinkedIn · X / Twitter") inside corner-bracket frames.
- **Behaviour on scroll:** the logo (top-left) and the sound toggle (bottom-left) stay fixed through every scene. The copyright and manifesto text leave after the first scene.
- **Menu open animation:** not applicable (no menu).

## Layout and grid
- **Max width:** none; it's a full-bleed canvas.
- **Margins:** 50 px at 1440 (logo x 50, right text edge 1390, sound label 58 px from the bottom). About 25 px at 390.
- **Columns:** none. Text hugs the 4 corners and the centre belongs to the object.
- **Whitespace feel:** "empty" because of fog, not white space.
- **Sections and length:** document height = 1 screen (900 px); it's a virtual scroll. 24 wheel steps of 450 px each moved through about 5 scenes:
  1. the igloo on its mountain;
  2. a fly-through into fog with a floating ice shard;
  3. portfolio ice blocks with callout labels ("PORTFOLIO_CO_02 OVERPATT"), with a big blurred year "2024" in the background;
  4. shattered concentric ice rings with a particle core;
  5. a particle-cloud character on concentric discs, with the socials carousel.
- **Section rhythm:** one object per scene, about 4–5 wheel steps (about 2 screens of input) per scene.

## Type behaviour
- **Entry:** headings and copy enter by a **character scramble / decode**. Random letters and symbols resolve into the real text ("))**+ I^K" and "Kyv jfxxflk fx yi" seen mid-decode in `first-screen-pre-gate.jpg`; "D 06.01.3)34 DNKEM WJ HTLPKVB" mid-decode in `scroll-08.jpg`).
- **Size contrast:** very low. Body text is about 14 px and the largest live type about 19 px, a ratio of about 1.4. Hierarchy comes from the 3D object, not from type.
- **Case:** the corners are sentence case; the callouts are UPPERCASE with underscores.

## Motion
- **Smooth scroll:** a custom virtual scroll. The wheel drives a camera timeline; there is no Lenis and scrollY stays 0. GSAP and ScrollTrigger strings are present in `App3D-d68cb154.js`.
- **Pinned scenes:** the whole site is one pinned canvas.
- **Between sections:** continuous camera flights through fog, so the scenes cross-fade inside the 3D world. There are no cuts.
- **Scrubbed or triggered:** scroll-scrubbed camera; triggered text decodes; a cursor-driven camera tilt (compare `probe-cursor-left` with `probe-cursor-right`).
- **Easing and durations:** heavy, damped and slow. The loader takes about 5 s and the plexus build about 4 s. Not measured further.
- **Page transitions:** not observed. Project items use their own sounds ("enter-project.ogg", "leave-project.ogg").

## 3D / WebGL / media
Everything is WebGL2 (2 contexts; the renderer was my real GPU, "ANGLE (AMD Radeon) Direct3D11", so no SwiftShader was needed and the capture rendered fully). three.js is confirmed by the `__THREE__` global.

| Kind | Count and examples |
|---|---|
| Draco models | 20, e.g. igloo, igloo_outline, igloo_cage, mountain, floor, shattered_ring2, intro_particles, blurrytext_cylinder, background_shapes |
| KTX2 textures | 45 |
| EXR environment | 1 (cubes_env.exr) |
| PNG noise textures | e.g. advect.png, perlin-datatexture.png |
| OGG audio files | 18 (music-highq 1.5 MB, wind, room, beeps, UI clicks) |

The 3D is the entire site: it carries 100% of the content.

## Interaction details
- **Cursor:** the system cursor (no custom cursor element in the DOM), but moving it tilts the camera and stirs the blocks.
- **Sound:** a full sound design that is **off by default** ("Sound: Off" toggle).
- **Small details:**
  - numbered plexus points joined by hairlines;
  - "//" and "//////" ASCII section marks;
  - character-scramble decode;
  - corner-bracket selection frames ([ LinkedIn ]);
  - thin arrow glyphs "←——" and "——→" in the last scene;
  - telemetry-style labels ("TEMP 29.92", "02/28").
- **Drag:** not observed.

## Phone
The phone version is the same scene and the same 4-corner layout, scaled down: margins about 25 px, text about 12 px, the logo about 135 px wide. The igloo fills the middle of a tall frame and nothing is dropped. (`phone-0` caught the scene before the text had decoded; `phone-2` shows all the corner text.) There is no menu button on the phone.

## Tech detected
- **3D:** three.js (`__THREE__` global; WebGLRenderer and GLSL strings in the 1.45 MB `App3D-d68cb154.js`), plus Draco (`draco_decoder.wasm`), Basis/KTX2 (`basis_transcoder.wasm`) and EXR loaders.
- **Text:** MSDF text (`msdfworker-ac346fa7.js`).
- **Post-processing:** EffectComposer/postprocessing strings.
- **Animation:** GSAP and ScrollTrigger strings.
- **Workers:** a sound worker (`audioworker-036a09db.js`).
- **Build:** Vite-style hashed assets (`/assets/index-2e130bc1.js`).
- **Other:** no framework markers; React and Svelte strings matched in the bundle but there is no root marker, so the UI framework is not confirmed. No analytics globals seen.

## Clean because… / Insane because…
Clean because:
- one object per screen;
- one typeface (Plex Mono) at about 2 sizes;
- one hue (fog grey-blue) plus white;
- nothing but 4 corner text blocks;
- no buttons, no menu, no cards.

Insane because:
- the loader's ASCII bar turns into a numbered hairline plexus, which builds the igloo in wireframe before it becomes photoreal;
- even the text is GPU-rendered and decodes letter by letter;
- one continuous camera flight replaces "sections";
- there's a full spatial sound design (18 tracks).

## Evidence
`shots/igloo-inc/`:
- loading: `load-0_2s`, `load-0_6s`, `load-1_2s`, `load-2s`, `load-3_5s`, `load-6s`; `probe-loader-0700ms` … `probe-loader-9100ms` (13 frames);
- first screen: `first-screen-pre-gate`;
- cursor: `probe-cursor-left`, `probe-cursor-right`, `probe-cursor-igloo`;
- scroll: `scroll-01` … `scroll-24`;
- phone: `phone-0` … `phone-3`;
- data: `measure.json` (DOM, colours, network, WebGL renderer), `probe.json` (font name tables, asset list, JS colour literals).

Hover: none was captured, because there are no DOM links to hover.
