# Combo 2: Night Lab + Alt 6's dither lens + Alt 5's kinetic type

The owner's words: "combine Night Lab with a mixture of alt 5 and alt 6".
This page is a preview, to be deployed later as its own Vercel app. The live site stays Night Lab.

- **Page:** http://127.0.0.1:5320/concepts/combo-2/
- **Calm version:** add `?still` (the same as reduced motion).
- **Screenshots:** `site/shots/r3/combo-2/`, made by `node scripts/heavy.mjs "node concepts/combo-2/shots.mjs"`.

## The base: Night Lab, copied whole
`concepts/night-lab/` was copied in on 2026-11-06. Nothing here imports from `../night-lab`, `../alt-5` or `../alt-6`.
Night Lab keeps its:
- palette (C1: ground #100904, ink #faf7ef, orange #dc5000, IHS maroon and gold as host marks);
- type (Mona Sans with its wdth + wght axes, Geist Mono, Instrument Serif italic);
- nav, phone menu, ticket stub and sections (Clauses, Committees nameplates, Schedule ruler, Pass, Desk, Footer);
- typed DXBMUN27 loader (approved by the owner);
- Alt 3 opening (point web, wireframe globe, Dubai patch) and the scroll flight into Dubai with its three call-outs;
- live Dubai clock and the keep-out rules for 3D labels.

## What is mixed in, and where it comes from

| # | Piece | From | How it is used here |
|---|---|---|---|
| 1 | **1-bit Bayer dither** | Alt 6 `gl/shader.ts` (Paper Shaders' Bayer 8×8 pattern) | The whole opening scene is first drawn into a small render target, one texel per 2 CSS px block. A second pass turns each texel into exactly ground or ink with the 8×8 Bayer threshold. A third pass blows the blocks up to the screen with `texelFetch`, so every block is a whole number of device pixels. There is no filtering, so no blur and no alpha. Night Lab's tones become dot densities: ink lines stay solid, mid-tone graticule lines become dotted, and brown hairlines become sparse dots. The orange Dubai mark is the one exception: it stays solid orange. |
| 2 | **Noise-flow field** | Alt 6 `gl/shader.ts` (domain-warped fBm + 1-texel isolines, Lando's contour lines) | Only where the 3D scene drew nothing, behind the web and the globe. It is much quieter than Alt 6: sparse crest dots and dotted contours on the dark ground. It resolves top to bottom while the globe builds, and dissolves by threshold as the flight starts. |
| 3 | **Reveal lens** | Alt 6 `gl/field.ts` + shader (14-point spring trail, metaball sum, hard `step`, 1-texel ring, idle Lissajous wander, touch follows the finger) | The cursor or finger carves a hard-edged lens. Inside it the world is printed in negative (cream ground, dark lines) and a second layer shows through in solid ground colour: "DIPLOMACY / around us." and "25.2048° N 55.2708° E · DUBAI" in Alt 6's 5×7 dot font. The lens opens in 6 steps when the hero arrives and closes in steps as the flight starts. |
| 4 | **Kinetic variable type** | Alt 5 `kinetic.ts` + `KLine.tsx` (Mat Voyce technique: per-letter wdth/wght from cursor distance and scroll speed, then one base width solved so the line keeps its length) | The hero title "DXB MUN 2027" in Mona Sans (wdth 75–125, wght 200–900). Letters near the cursor swell wider and heavier while the rest squeeze, so the title keeps the same total width. Fast scroll sends a ripple through the axes. It stretches in from condensed when the hero arrives, echoing the loader's bold-and-expand. |
| 5 | **Gentle kinetic section words** | Alt 5 `kinetic.ts` (`hoverOnly`, lowered cursor response, no scroll ripple) | "Committees" in the wall's head cell, and the footer's "DXB MUN 2027". They move only while the pointer is over them. Everywhere else the sections stay as calm as Night Lab. |
| 6 | **Vote tally as the progress line** | Alt 5 `Tally.tsx` / `floor.ts` (For / Against / Abstain) | Night Lab's 2px progress hairline under the nav becomes seven cells, one per nav section. A cell fills orange as you read that section (For). A cell you jumped past without stopping turns cream (Abstain). The brown track still ahead reads as Against. It stays a 2px line, so it adds no layout, and it is labelled for screen readers. The full docked tally board was not taken, because it would cover the sections' bottom edge. |

## Not taken, on purpose (the owner: Alt 5 becomes "too much" after scrolling)
- full-screen colour-block wipes between sections;
- stepped block transitions;
- edge-to-edge kinetic titles on every section;
- mixed ultra-wide and ultra-condensed type in the sections;
- Alt 5's "ORDER, ORDER" loader: Night Lab's typed loader is the approved one and stays;
- Alt 6's teleprinter loader, cable sections and redaction bars;
- anything from Alt 4.

## Rules applied
- **Crisp:**
  - The dither renders at block resolution with nearest sampling.
  - Every output pixel is ground, ink or the orange mark.
  - The render targets have no MSAA and the canvas has no antialias.
  - There is no blur, glow or alpha anywhere: the render target's alpha channel is used only to tell "scene" from "empty", and is never shown.
- **Motion:**
  - The three passes are small: 720×450 texels at 1440×900, and the final blit is one `texelFetch`.
  - Rendering pauses when the opening leaves the screen.
  - The kinetic engine reads layout at the start of each frame and writes after, so there is no layout thrash.
- **Reduced motion and `?still`:** Night Lab's calm still stage, unchanged. The kinetic words rest at their default axes.
- **No WebGL:** Night Lab's still stage, as before.
- **Facts:** only from `src/data/conference.ts`. Unknowns go through `tba()`. The Dubai coordinates are public geography, as on Night Lab.

## Changes to the copied Night Lab pieces (and why)
- **The hero title** rests at wdth 106 / wght 760 instead of 112 / 800, so the letters under the cursor have room to swell to 125 / 900.
- **The phone Dubai frame** sits higher (`space.ts`: sy 0.06, was −0.12). Night Lab's frame left the top 40% of a phone screen empty.
- **Points and lines** are sized in dither texels. A 1px line is one 2px block, and points are whole blocks.
- **The footer word** is a kinetic line in fill mode instead of Night Lab's fitted word. It still runs edge to edge at rest.
