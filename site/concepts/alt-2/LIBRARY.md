# Alt 2 · Poster: where each piece comes from

No new npm packages. Everything below uses libraries already in `package.json`.

## Components and primitives
| Piece | Library source | File |
|---|---|---|
| Committee nameplate dialog, phone menu sheet | **Base UI Dialog** (`@base-ui/react/dialog`), the primitive under **coss ui**'s Sheet (`portal/ui/coss/sheet.tsx`). I used the same Root/Portal/Backdrop/Popup/Close/Title structure but restyled it: solid ink backdrop, clip-path open, and no `bg-black/32 backdrop-blur-sm` (that breaks the clarity checklist). | `Committees.tsx`, `Nav.tsx` |
| Rolling numbers (loader counter, clause numbers, committee count, clause counter, day numbers) | **NumberFlow** (`@number-flow/react`; design library: motion) | `Loader.tsx`, `Clauses.tsx`, `Committees.tsx`, `Schedule.tsx` |
| Wellness check-in logic | shared `useWellness` (`src/shared/hooks.ts`) | `IndexRows.tsx` |
| Smooth scroll | shared `useSmoothScroll` / `scrollToSection` (Lenis) | `main.tsx`, `Nav.tsx` |

## Motion patterns (design library: React Bits, Motion Primitives; built on GSAP, which is installed)
| Pattern | Follows | Built with | File |
|---|---|---|---|
| Heading line rises | React Bits "Split Text" (masked line rise, staggered) | GSAP **SplitText** (`mask: 'lines'`) + ScrollTrigger, once | `motion.ts` |
| Loader wordmark resolve | React Bits "Scramble Text" / "Decrypted Text" | GSAP **ScrambleTextPlugin** | `Loader.tsx` |
| Clause letter fill | React Bits "Scroll Reveal" / "Text Fill on scroll" (letters fill as you scroll) | ScrollTrigger progress, class toggles per letter | `Clauses.tsx` |
| Edge-to-edge word | React Bits "Fit Text" / "Text Pressure"-style measured fit | ResizeObserver + measured font size | `FitWord.tsx` |
| Cursor dot → VIEW disc | Magic UI / React Bits "Custom Cursor" / "Follow Cursor" | `gsap.quickTo` on x/y, CSS scale on one element | `Cursor.tsx` |
| Grid → nameplate build | Dropbox brand site (reference, no library equivalent) | GSAP timeline scrubbed by ScrollTrigger | `Committees.tsx` |
| Ruler + playhead | Anime.js site (reference) | ScrollTrigger progress | `Schedule.tsx` |
| One easing | Lando Norris `cubic-bezier(0.65,0.05,0,1)` | GSAP **CustomEase** `poster` + CSS `--ease` | `motion.ts`, `alt2.css` |

## Data and geometry
- **`landmask.ts`:** copied from `concepts/final/landmask.ts`, a 256×128 land mask extracted from **cobe** (MIT). It drives the dot lattice.
- **`globe.ts`:** orthographic projection, after the Merged/final `geo.ts` model, rewritten for a 2D canvas with build order, spokes, numbered points and a Dubai reticle.
- **`links.ts`:** copied from `concepts/final/links.ts`.

## Fonts
- **Archivo Variable** (`@fontsource-variable/archivo`, `wdth.css`, OFL) at `font-stretch: 125%`, standing in for **DINish Expanded** (not on npm via Fontsource; see NOTES.md).
- **IBM Plex Mono** (`@fontsource/ibm-plex-mono` 400 and 500, OFL).

## Licences
- coss ui is AGPL-3.0, but **no coss source file was copied or imported here**; only the Base UI primitive (MIT) is used directly.
- GSAP (incl. SplitText, ScrambleText, CustomEase): free standard licence.
- NumberFlow: MIT.
- cobe: MIT.
