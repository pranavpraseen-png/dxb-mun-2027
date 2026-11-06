# Combo 1 · library and credits

Nothing new was installed. Every package below was already in `site/package.json`. Code was copied into this folder
from Alt 5 and Alt 6 (no imports from `../alt-5` or `../alt-6`).

## Fonts (Fontsource, OFL-1.1)
| Package | Where |
|---|---|
| `@fontsource-variable/anybody` (wdth 50–150, wght 100–900) | the hero title, every motion title, all body text, the lens motto (canvas, condensed) |
| `@fontsource/courier-prime` 400 / 700 | every label: the CABLE 00 box, nav items, motion rules, tally, buttons in the hero |
| `@fontsource-variable/martian-mono` | the loader's four corner captions only, so the loader stays exactly as Alt 5 |

## Already installed, used here
| Piece | How it is used |
|---|---|
| **GSAP** | `gsap.ticker` runs the kinetic engine and the marquee; the loader is a timeline; the lens opens with `steps(6)` |
| **Lenis** via `src/shared/scroll.ts` | `useSmoothScroll`; nav and tally clicks scroll through `scrollToSection` |
| **NumberFlow** (`@number-flow/react`) | FOR / AGAINST / ABSTAIN on the vote board (mask height 0, so there is no fade) |
| **Base UI Dialog** (`@base-ui/react/dialog`) | the phone menu (focus, Escape, scroll lock, a hard clip-path open) |
| `isStill()`, `useWellness()` | `src/shared/hooks.ts`: calm mode and the wellness check-in |
| `@/data/conference` | every fact; unknowns show "To be announced" |

## Copied from Alt 5 · Motion
- `Loader.tsx` (unchanged apart from the header comment)
- `kinetic.ts`, `KLine.tsx`
- `floor.ts`, `Tally.tsx`, `Nav.tsx`
- `Sections.tsx`: the calmed motions 01–07; the Alt 5 hero was removed

## Copied from Alt 6 · Dispatch
- `gl/shader.ts`, `gl/font5x7.ts`, `gl/field.ts`
  - `field.ts` has two changes: a `held` mode (draws one frame, then waits for `release()`), and the lens motto set in Anybody.
- `Hero.tsx`, rebuilt from Alt 6's hero.
  - It drops the teleprinter opening.
  - The title is now a kinetic line.
- `ui.tsx` (Type, Stamp, a redaction stub), `content.ts` (the Dubai coordinates), `links.ts` (`VITE_DEPLOY`).
- The Bayer tile for the no-WebGL hero is in `main.tsx`.

## Considered and not used
- **Sofia Sans Extra Condensed** (Alt 6's headline face): replaced by Anybody.
  - The loader's last frame is the wordmark in Anybody, so the cut lands on the same face.
- **ScrollTrigger for the field drift**: the hero computes `scrollY / heroHeight` in its readout loop instead (one fewer dependency in this path).
