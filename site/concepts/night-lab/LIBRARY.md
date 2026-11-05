# Night Lab: libraries and sources

Every library was already installed except Mona Sans, which went in through the lock: `node scripts/heavy.mjs "npm install @fontsource-variable/mona-sans"`.

| Source | Where it's from | Used for | Licence |
|---|---|---|---|
| **three.js** 0.187: `LineSegments2`, `LineSegmentsGeometry`, `LineMaterial` (examples/jsm/lines) | threejs.org | Every globe line at 1 CSS px. The material's dash uniforms are reused, with per-line 0–1 distances, to draw each line on | MIT |
| **@react-three/fiber** 9 | pmndrs, r3f.docs.pmnd.rs (design library: 3D/WebGL) | The canvas, the frame loop (paused off screen) and `dpr [1, 2]` | MIT |
| **GSAP** 3.15: core, ScrollTrigger, CustomEase, ScrambleTextPlugin | gsap.com (design library: motion) | Pins and scrubs, the one easing, the loader timeline, and the scramble on the wordmark and call-outs | GSAP standard licence (free, including the plugins) |
| **Lenis** | darkroom.engineering, through the shared `src/shared/scroll.ts` | Smooth scroll synced with ScrollTrigger | MIT |
| **@number-flow/react** | number-flow.barvian.me (design library: motion) | Counting figures: the clause counter, "19 committees", the schedule's days and sessions, the day readout and the pass | MIT |
| **Base UI** 1.9 (`@base-ui/react`): Dialog, Accordion, Checkbox | base-ui.com (design library: UI components) | The phone menu and the nameplate view (focus trap, Esc, inert page), the desk rows, and the wellness check-in | MIT |
| **Fontsource**: Mona Sans Variable (`@fontsource-variable/mona-sans`, standard: wdth + wght), Geist Mono Variable, Instrument Serif 400 italic | fontsource.org; fonts by GitHub, Vercel and Instrument | T1 type | OFL 1.1 |
| **cobe's land mask** | Copied as `landmask.ts` from `concepts/merged/` (extracted from cobe's bundled texture) | The coastlines, traced here with marching squares and smoothed with Chaikin (`geo.ts`) | MIT |
| **Shared project hooks** | `src/shared/hooks.ts` (`isStill`, `useWellness`), `src/shared/scroll.ts` (`useSmoothScroll`, `getLenis`) | Still / reduced-motion detection, the wellness storage rules from the live site, and Lenis | project code |
| **Links** | `concepts/final/links.ts`, copied as `links.ts` | Register and sign in go to `portal + '#/now'`; the chair and secretariat links | project code |

## Why not coss ui here
The memory rule is "coss ui first". coss's Checkbox and Button carry `shadow-xs` and alpha tokens (`/64`, `/32`), which break the clarity checklist in `concepts/board/NOTES.md`; the board itself skipped coss for the same reason. So this page uses the **Base UI** primitives that coss is built on, styled with the page's own opaque tokens. Accessibility and behaviour come from the library; only the skin is ours.

## Hand-written (signature pieces, not generic controls)
- the globe scene;
- the clause clip-path fill;
- the grid-to-wall choreography;
- the ruler;
- the ticket stub and pass;
- the cursor disc;
- the edge-to-edge word fitter.

None of them has a library equivalent that keeps the reference's exact move.
