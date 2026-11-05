# Colour and type board: notes

Page: http://127.0.0.1:5320/concepts/board/ · Files: `palettes.ts` (OKLCH tokens), `color.ts` (OKLCH to sRGB, APCA), `fonts.ts` (pairings and font imports), `main.tsx`, `board.css`, `shots.mjs`.

The owner said: "change the colours make the colours feel more real n find the best colour patterns, go through the library n websites n find the best fonts." Then: "i want irl resolution uk that clearness u see in good websites".

## Method
- **Colour space:** OKLCH (oklch.com). Neutrals carry a small hue (C 0.012–0.035), never pure grey or black. Ramps step about 0.04–0.05 in L (ground, surface, raised), in the spirit of Ramps and Huetone.
- **Contrast:** APCA 0.0.98G-4g (apcaw3.myndex.com), computed live in `color.ts`. Targets:
  - body text Lc ≥ 75;
  - secondary text and button labels Lc ≥ 60;
  - display-size accent verbs Lc ≥ 45.
  
  All 42 scored pairs pass.
- **Opaque only:** every token is an opaque `oklch()`. There is no alpha anywhere.
- **Fluid type:** a Utopia-style `clamp()` helper (`fl(min, max)` in `main.tsx`) hits exactly `min` px at 390 and `max` px at 1440, so sizes are whole pixels at both breakpoints.

## Reference sites (what I could verify)
- **Silver Pinewood Residences** (Awwwards page): the listed palette is #282828 charcoal plus #998170 warm taupe. That's a warm, low-chroma accent on a tinted near-black. It went into Walnut and Brass and Dubai Dusk.
- **Terminal Industries** (live page source):
  - fonts: Suisse Intl (retail) and Geist Mono;
  - colours: the most-used is deep teal #052424, with warm greys #1F1F1F and #A2A2A2.
  
  This led to Dubai Dusk's sea-blue ground and the Terminal Grotesk pairing (Archivo and Geist stand in for Suisse).
- **TitanGate Equity** (Awwwards page): the listed palette is only #000000 and #ffffff. We deliberately tint instead, because pure black and white is what feels "digital".
- **Cartier Watches and Wonders and Designex:** I couldn't read a palette. The Awwwards section didn't load and the Designex page returned 404. Not used.

## Palettes
| # | Name | Real source | Action | Accent |
|---|---|---|---|---|
| 1 | Printed UN Blue | UN documents and flag, printed | UN blue at lower chroma, oklch(75.5% 0.100 237) | Ochre |
| 2 | Assembly Rostrum | GA hall: slate walls, gilt emblem, green marble | Gilt | Marble green (rules only) |
| 3 | Walnut and Brass | Desks and nameplates | Brushed brass | Copper |
| 4 | Diplomatic Passport | Maroon cover, foil emblem, cream pages | Cream | Foil gold-ochre |
| 5 | Dubai Dusk | The Gulf after sunset, sand, limestone | Sand | Terracotta |
| 6 | Resolution Paper (light) | A printed resolution | Deep emblem blue | Red-brown stamp |

IHS maroon, gold and cream are re-tuned per palette:
- maroon L 0.36–0.42, so it reads on dark grounds;
- gold at C 0.12–0.13, not the screen #FFB606;
- cream L 0.85–0.86.

Gold stays awards-only. In the preview it appears only as the 14 px rule on the host strip.

**Note:** palettes 2–5 use a warm, non-blue action colour. That breaks today's SYSTEM.md rule that UN blue is the only action colour. Palette 1 or 6 keeps the rule. This is the owner's call.

## Fonts
Six pairings, all OFL via Fontsource npm packages:
1. Official Record: Source Serif 4 + Public Sans + IBM Plex Mono + Noto Naskh Arabic.
2. Broadsheet: Newsreader + Inter Tight + JetBrains Mono + Noto Naskh Arabic.
3. Plex Institutional: IBM Plex Sans (Condensed) + IBM Plex Sans + IBM Plex Mono + IBM Plex Sans Arabic.
4. Terminal Grotesk: Archivo Condensed + Geist + Geist Mono + Noto Kufi Arabic.
5. Gallery Serif: Instrument Serif + Instrument Sans + Geist Mono + Noto Naskh Arabic.
6. Engraved Plate: Fraunces (SOFT 0, WONK 0) + Manrope + JetBrains Mono + Noto Kufi Arabic.

Arabic is used for one word only, "دبي" (Dubai), as a companion. Use it sparingly.

Library sources looked at and not shipped:
- **Klim** (retail) is used only as a reference. Tiempos maps to Source Serif 4 and Newsreader; Söhne maps to Inter Tight and Geist; Domaine Display maps to Fraunces with SOFT 0.
- **Fontshare** (ITF Free Font License): Zodiak, Sentient and Gambetta are good serif candidates, and Satoshi and General Sans are good sans candidates. They aren't on npm, and I couldn't read the licence page, so check the licence text before self-hosting.
- **Velvetyne:** experimental display faces, too playful for this tone.
- **Departure Mono:** a pixel mono, too playful.
- **Typefree:** a browsing index only.

## Board controls
The mix pickers are native radio `fieldset`s. The coss ui segmented control was skipped on this board only, because its soft shadows and alpha text (`/72`) break the clarity rules below.

## Clarity checklist (apply to the redesigns and dashboards)
- **Colour:** every token is opaque. No `rgba()` or `/alpha` ink, and no translucent washes over text. Hover states change to another opaque token.
- **Edges:** 1 px solid hairlines (0.5 px only where `devicePixelRatio >= 2` and needed). Solid fills. No `box-shadow` blur, glow, `filter: blur`, `backdrop-filter`, noise or grain overlays.
- **Text rendering:**
  - `-webkit-font-smoothing: antialiased` on dark grounds; auto on light ones;
  - `text-rendering: optimizeLegibility`;
  - `font-optical-sizing: auto`;
  - `font-synthesis: none`, so there's no faux bold or italic. Only use weights a font really has; for example, Instrument Serif is 400 only.
- **Sizes:** whole-pixel font sizes at 390 and 1440 (Utopia clamp endpoints). Tight tracking (-0.01 to -0.025em) only at display sizes. Avoid `transform: scale()` on text at rest.
- **WebGL and canvas:**
  - R3F `<Canvas dpr={[1, 2]}>`;
  - cobe and raw canvas: backing store = CSS size × `Math.min(devicePixelRatio, 2)`;
  - Paper Shaders: render at device pixels, not a downscaled buffer;
  - never stretch a canvas with CSS beyond its backing size.
- **Images:** use SVG where possible. Raster images need `srcset` with 1x/2x (3x for small icons), and must never render above native pixels ÷ 2 on retina.
  - `images/hero-photo.jpg` is **2000 × 1333**. It's sharp on retina only up to about **1000 CSS px** wide, so it's **too small for a full-bleed 1440 hero on a 2x screen** (that needs 2880 px). Use it at ≤1000 px wide, or get a larger original.
- **Screenshots:** puppeteer at `deviceScaleFactor: 2` with `--force-color-profile=srgb`.
