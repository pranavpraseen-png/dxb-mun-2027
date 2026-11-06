# Combo 2: libraries and sources

No new package was installed. Everything below was already in `site/package.json`.

## From the library (as on Night Lab)

| Source | Where it's from | Used for | Licence |
|---|---|---|---|
| **three.js** 0.187: `WebGLRenderTarget`, `RawShaderMaterial` (GLSL3), `DataTexture`, `LineSegments2` / `LineMaterial` | threejs.org | The opening's lines and points, and the three dither passes: scene → block target, Bayer pass, blit | MIT |
| **@react-three/fiber** 9 | pmndrs (design library: 3D/WebGL) | The canvas and the frame loop. A `useFrame` at priority 1 takes over rendering for the dither passes | MIT |
| **GSAP** 3.15: core, ScrollTrigger, CustomEase, ScrambleTextPlugin, SplitText | gsap.com (design library: motion) | Night Lab's loader, pins and scrubs. The kinetic engine runs on `gsap.ticker`, and the stretch-in is a GSAP tween | GSAP standard licence |
| **Lenis**, through `src/shared/scroll.ts` | darkroom.engineering | Smooth scroll | MIT |
| **@number-flow/react** | number-flow.barvian.me (design library: motion) | Night Lab's counting figures | MIT |
| **Base UI** 1.9: Dialog, Accordion, Checkbox | base-ui.com (design library: UI components) | The phone menu, the nameplate view and the desk rows | MIT |
| **Fontsource**: Mona Sans Variable (wdth 75–125, wght 200–900), Geist Mono Variable, Instrument Serif italic | fontsource.org | Night Lab's T1 type. Mona Sans' two axes drive the kinetic lines | OFL 1.1 |

## Copied from sibling builds (copied, never imported)

| Piece | Copied from | Changes here |
|---|---|---|
| The whole page (sections, nav, loader, opening, data, links, styles) | `concepts/night-lab/` | `combo.css` adds the kinetic and tally styles. Points and lines are sized in dither texels. The scene has no background colour. The phone Dubai frame sits higher. |
| Bayer 8×8 matrix, simplex noise and fBm flow field, isolines, metaball lens with its ring | `concepts/alt-6/gl/shader.ts` (its Bayer table is from **Paper Shaders**' dithering shader; the noise is Ashima Arts / Stefan Gustavson, MIT) | Rebuilt as a post-process on the R3F scene (`opening/bayer.ts`). The field is much quieter, and the lens ring is dotted. The scene is quantised by tone, and the orange Dubai mark is kept. |
| Lens trail: 14 spring-chained points, idle Lissajous wander, touch follow | `concepts/alt-6/gl/field.ts` | Frame-rate independent. The lens rests on the globe, opens in 6 steps when the hero arrives, and closes as the flight begins (`opening/Dither.tsx`). |
| 5×7 dot font | `concepts/alt-6/gl/font5x7.ts` | Unchanged. It is used for the coordinates in the lens layer. |
| Kinetic type engine and line component | `concepts/alt-5/kinetic.ts`, `KLine.tsx` | Retuned for Mona Sans: axis table, axis offsets halved. Adds a `natural` mode, where a line keeps its own resting length instead of filling a column, a `GENTLE` preset, and `overflow-x: clip` on lines. |
| For / Against / Abstain tally | `concepts/alt-5/Tally.tsx`, `floor.ts` (logic only) | Reduced to Night Lab's 2px progress line, cut into seven cells (`Progress.tsx`). |

## Considered and rejected
- **@react-three/postprocessing / postprocessing.** It is not installed. Its effect composer uses float buffers and blends by default, so a hand-written three-pass chain is smaller and guarantees exactly two colours plus orange.
- **Paper Shaders' `ShaderMount`.** It runs its own canvas, but the dither has to sit on the existing R3F scene. Only its Bayer pattern is used, via Alt 6.
- **coss ui / shadcn.** No new controls were needed. Night Lab's Base UI pieces stay, styled with opaque tokens (see Night Lab's LIBRARY.md for why coss's alpha tokens were skipped).
- **Alt 5's docked vote board.** It would sit over the bottom edge of every section, so only its tally logic was kept, inside the 2px line.
