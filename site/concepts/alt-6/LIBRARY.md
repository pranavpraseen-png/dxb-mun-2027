# Alt 6 · library and credits

Installed for this build (both from `site/`, through the lock): `npm install @fontsource-variable/sofia-sans-extra-condensed @fontsource/courier-prime`. Everything else was already in `site/node_modules`.

| Piece | From | Where it is used |
|---|---|---|
| **Sofia Sans Extra Condensed Variable** (`@fontsource-variable/sofia-sans-extra-condensed`, `wght.css`) | Fontsource (design-resources, fonts), Lettersoup, OFL 1.1. **New.** | every headline (800–900, uppercase), the hero title, the motto drawn into the shader's second layer |
| **Courier Prime** 400/700 (`@fontsource/courier-prime`) | Fontsource, Quote-Unquote Apps, OFL 1.1. **New.** | all cable text, labels, nav, buttons: a typewriter face, as on real cables; plain zero |
| GSAP 3 + ScrollTrigger (`gsap`) | motion category; already installed | the opening timeline (print / flood / resolve / lens), redaction bars sliding off on view, the field drifting with scroll, `registerEase` for the one curve |
| Lenis via `src/shared/scroll.ts` (`useSmoothScroll`, `scrollToSection`, `getLenis`) | shared, already installed | weighted scroll, nav jumps, scroll lock while the phone menu is open |
| `isStill()`, `useWellness()` | `src/shared/hooks.ts` | `?still` / reduced motion → calm page; the wellness checklist (same storage key as the live site) |
| `links.ts` | copied from `concepts/alt-3/links.ts` (path comment updated) | Register / Sign in → `portal + '#/now'`; low-key Chair and Secretariat links in the footer |
| WebGL2 (browser API) | — | one full-screen triangle, one fragment shader, two `NEAREST` textures |

## Written here (techniques credited, code my own)
- **The dither field** (`gl/shader.ts`, `gl/field.ts`): rendered at block resolution and scaled up with `image-rendering: pixelated`, so it is pixel-snapped by construction; 8×8 Bayer threshold to exactly two colours. The pixelised-UV + Bayer-matrix lookup follows **Paper Shaders**' `dithering` shader (design-resources, 3D/WebGL). Simplex noise is the Ashima Arts / Stefan Gustavson GLSL (MIT), typed in, not imported.
- **The lens** (`gl/field.ts` trail + shader metaballs): Lando Norris's cursor reveal, rebuilt as a 14-point spring chain summed as metaballs and cut with a hard `step`; wanders on its own when idle (and on phones until touched).
- **5×7 dot-matrix font** (`gl/font5x7.ts`): drawn by hand for this build; used for the teleprinter opening (inside the shader, with a per-dot print order) and the Dubai coordinates in the second layer.
- **Teletype print** (`ui.tsx` `Type`): characters print with a block cursor; the unprinted rest holds its space with `visibility: hidden` (not transparency); screen readers get the full text.
- **Redaction bars** (`ui.tsx` `Bar`, `Redact`): opaque bars that slide off (xPercent) once on view; unknown facts stay as a solid bar reading "To be announced".
- **Tractor-feed paper**: sprocket holes as an inline SVG with `shape-rendering: crispEdges`, dashed perforations as plain borders.
- **Bayer tile** (`main.tsx`): an 8×8 canvas drawn pixel by pixel (no anti-aliasing), used for the pass swatch and the no-WebGL hero.

## Considered and rejected
- **Paper Shaders `ShaderMount` / `<Dithering>`** (installed): its mount renders at `minPixelRatio` 2 even on 1× screens and lets the browser scale the result, which softens block edges at fractional ratios; its dithering shapes have no second layer, lens or loader state. Borrowed the Bayer technique only.
- **three.js / React Three Fiber** (installed): a single full-screen fragment shader needs neither a scene graph nor a camera; raw WebGL2 is ~200 lines and starts faster.
- **coss ui / shadcn / Base UI components**: the page needs only buttons, links, one tab row and a checklist, all styled as hard-edged typewriter controls; component kits bring rounded corners, soft shadows and alpha states that break the crisp rule. Base UI's Dialog was considered for the phone menu; a plain `role="dialog"` with Escape and scroll lock was enough.
- **NumberFlow** (installed): the stats are plain fields that a bar slides off; a rolling counter would read as "stat counters", which the brief avoids.
- **IBM Plex Mono, JetBrains Mono, Geist Mono** (installed): Plex Mono is Alt 2's mono and Geist Mono is Night Lab's; a code mono reads "terminal", not "cable". Courier Prime is a typewriter.
- **Archivo (wdth), Oswald, Barlow Condensed, Anton** (installed): Archivo is Alt 2's display face; Barlow Condensed is used by several earlier concepts; Oswald and Anton are heavier-looking poster faces. Sofia Sans Extra Condensed is narrower and more institutional, and no other build uses it.
- **Departure Mono** (design-resources, pixel mono): considered for the dot-matrix lines; a hand-drawn 5×7 bitmap renders inside the shader with exact dots and needs no font file.
