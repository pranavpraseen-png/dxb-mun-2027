# Alt 1 · Terminal Paper: where each piece comes from

Nothing was installed; everything below was already in `site/package.json`. Library entries are from the design-resources catalogue (`by-category/*.md`).

| Piece | Library (catalogue category) | How it's used |
|---|---|---|
| Scroll | **Lenis** via `src/shared/scroll.ts` (motion) | The calm shared scroll feel; it stops during the opening and restarts at the split |
| Scroll scrubbing | **GSAP ScrollTrigger** (motion: GSAP) | `useProgress` in `fx.tsx` drives the clause fill, the committee grid move and the schedule playhead. Pins are CSS `position: sticky`, so nothing is re-parented |
| Opening timeline | **GSAP** timeline (motion) | The counter, line draw, globe build, bar split and wordmark FLIP all run on one timeline |
| Wordmark scramble | **GSAP ScrambleTextPlugin** (in the installed gsap) | "DXB MUN 2027" resolves from caps and digits |
| Counting figures | **NumberFlow** `@number-flow/react` (motion) | 19 committees, 3 days, 6 sessions and `CLAUSE 0X / 05` |
| Phone menu | **Base UI Dialog** `@base-ui/react/dialog` (UI components; the primitive coss ui is built on) | The full-screen solid sheet. coss ui's own Sheet was **not** used because it ships `backdrop-blur-sm` and a 32% black backdrop, which break the clarity checklist (no blur, no alpha) |
| Wellness check-in | **Base UI Checkbox** `@base-ui/react/checkbox` | Water / Stretch / Breathe, stored by the shared `useWellness` hook (same key as the live site) |
| Globe land points | **cobe** land texture (3D/WebGL), via `concepts/merged/landmask.ts` | Copied into this folder as `landmask.ts`. The globe itself is our own 2D-canvas wireframe (no WebGL), because the brief wants ink lines on paper, and cobe draws filled glowing dots on a sphere |
| Fonts | **Fontsource** packages: Inter Tight Variable, Geist Mono Variable, Newsreader Variable (italic axis) | T3 from BLUEPRINT §6, all OFL |

## Hand-written (signature pieces only)
- The wireframe globe drawing and the flight pose maths (`geo.ts`, `Stage.tsx`).
- The ticket-stub masks, the nameplate flood clip-paths, the ruler and the clause letter fill (`alt1.css`, `sections.tsx`).

## Considered and not used
- **coss ui Button / Badge / Sheet:**
  - they bring soft shadows, alpha text and blur;
  - the only buttons here are the blue stub and the pass CTA, which are plain links styled with opaque tokens.
- **React Bits "Scramble/Shuffle text":** GSAP's own plugin was already installed, so nothing new was needed.
- **Paper Shaders / three.js:**
  - the light, crisp brief has no use for a shader;
  - a canvas wireframe at DPR ≤ 2 is lighter on this machine's RAM.
