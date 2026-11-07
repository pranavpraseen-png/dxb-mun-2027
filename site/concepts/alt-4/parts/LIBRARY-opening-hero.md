# Library: opening B/C and hero B/C (Alt 4 · The Floor)

What each option is built from. Everything below is already installed in `site/package.json`; no new packages.

| Piece | Source | Where | How it is used |
|---|---|---|---|
| Canvas 2D | the browser | opening B, opening C, hero B | Every frame is drawn by a pure `draw(t)` function, so the same time always gives the same frame (used by `?still`, by the screenshot hooks, and by Skip). |
| Web Audio voices `Sound`, `gavel` | `concepts/alt-4/stage/audio.ts` (the lead's) | opening B, opening C | `Sound` handles wake-on-gesture, the saved mute (`alt4.sound`) and the bus; `gavel()` is the impact. Each file adds one small voice of its own on the same bus: the flap click (B), the counter tick and the glass crack (C). Sound starts only after a pointer gesture; there is a visible Sound on/off button; never autoplay. |
| Archivo Variable (wdth 62–125) | `@fontsource-variable/archivo/wdth.css` (Fontsource, in the catalogue under fonts) | all four | Canvas uses `fontStretch` (`expanded`, `semi-expanded`, `semi-condensed`) to reach the width axis. |
| JetBrains Mono Variable | `@fontsource-variable/jetbrains-mono` | all four | Labels; the split-flap characters in opening B. |
| CSS 3D transforms + container query units | the browser | hero C | 20 two-faced cards (`backface-visibility: hidden`), springs written in JS (no library), `cqh`/`cqw` size the committee abbreviation to each card. |
| Bus `emit('tap')` | `concepts/alt-4/bus.ts` | hero B, hero C | The Register CTA asks the stage for the small gavel knock. |

## Techniques written for these parts (no library)
- **Split-flap rendering (opening B):** a glyph atlas per style (with a 3 px gutter of the face colour, so sub-pixel kicks never bleed), each cell drawn as static top + static bottom + one folding leaf (`cos(pπ)` height). 193 ISO 3166-1 alpha-3 codes arrive on `idx(u) = 193 (0.06u + 0.94u³)`.
- **Shatter (opening C):** radial rays × jittered rings around the stamp's centre make ~100 polygon shards; the frame at the moment of release is snapshotted to an offscreen canvas and every shard draws only its own bounding box of it through a clip path, with a solid edge underneath so pieces read as slabs.
- **Real-time hard shadows (hero B):** each glyph's outline is traced once with oriented marching squares and simplified (Douglas–Peucker, 0.6 px). Per frame the shadow is the Minkowski sum of the outline and the light vector: one quad per edge (all wound the same way, filled `nonzero`) plus the glyph moved to the far end. About 1,000 quads per frame, so it stays cheap at 2x DPR and the edges stay vector-crisp.
- **Card-stunt mosaic (hero C):** the wordmark is drawn once to a canvas at device resolution; each card's back uses it as a background positioned at minus the card's own offset. Each line of the word sits inside one row of cards, so seams only ever cut letters vertically.

## Considered and rejected
- **three / @react-three/fiber** for hero B's shadows: a ray-marched shadow shader would soften or band at long lengths and costs far more GPU than 1,000 quads; it also needs a no-WebGL fallback. Canvas 2D needs none.
- **WebGL for opening C's shatter:** the crisp polygon look is a clip path; a mesh would add a renderer for ~100 triangles.
- **@paper-design/shaders-react:** its shaders are soft fields (gradients, noise, blur-like looks), which the crisp rule forbids.
- **GSAP timelines:** the openings need seekable, frame-exact time for the screenshot and video hooks; a single `draw(t)` is simpler to seek than a timeline driving a canvas. Hero C needs per-card springs that react to the pointer mid-flight, which springs do better than tweens.
- **motion (Framer Motion) springs for hero C:** 20 cards × 5 springs each re-rendering React would be heavier than writing transforms directly in one rAF loop.
- **lenis:** not needed inside these parts; hero C reads the section's position, so it works with or without the page's smooth scroll.
- **Drawing the mosaic as 20 DOM text copies (hero C, first version):** the line positions depended on font metrics, so a letter top was cut by a thin sliver at a seam. The canvas image places each line exactly inside a row.
