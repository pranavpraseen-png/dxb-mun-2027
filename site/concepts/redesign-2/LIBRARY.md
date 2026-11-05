# Redesign 2: where each component comes from

Every generic control is a library component, themed only through the coss variables in `redesign2.css`. Hand-written CSS covers tokens, layout glue and the three signature pieces: the title sequence, the Fig. 1 plate and the nameplate wall.

## Copied into `lib/` (source fetched on 2026-11-05)
| File | Library | Source | Licence | Changes | Used for |
|---|---|---|---|---|---|
| `lib/ScrollFloat.tsx` | **React Bits** (text animations) | `DavidHDev/react-bits`, `src/ts-tailwind/TextAnimations/ScrollFloat/ScrollFloat.tsx` | MIT + Commons Clause | A header comment, one optional `tag` prop (React Bits hard-codes `h2`); clarity pass: the `blur` effect is replaced by a `clip` (clip-path) effect and chars no longer keep a pinned `will-change` | The resolution clauses. Each fact builds char by char, scrubbed by scroll (Mat Voyce-style kinetic type) |
| `lib/text-effect.tsx` | **Motion Primitives** (TextEffect) | `ibelick/motion-primitives`, `components/core/text-effect.tsx` | MIT | `cn` import path; clarity pass: the `blur` and `fade-in-blur` presets became `clip` and `rise-clip` (clip-path) | `Dek` in `ui.tsx`: the one-line section deks (Schedule, Quick reset, Contact) set word by word when they scroll into view |
| `lib/in-view.tsx` | **Motion Primitives** (InView) | `ibelick/motion-primitives`, `components/core/in-view.tsx` | MIT | A `className` passthrough | `Reveal` in `ui.tsx`: the schedule rows rise in a stagger |
| `lib/rolling-text.tsx` | **Animate UI** (Rolling Text primitive) | `https://animate-ui.com/r/primitives-texts-rolling.json` | MIT | Hook import path; clarity pass: renders plain text once the roll settles (no 3D context at rest) | The nameplate abbreviations roll in, letter by letter, the first time they are seen |
| `lib/use-is-in-view.tsx` | **Animate UI** (hook) | `https://animate-ui.com/r/hooks-use-is-in-view.json` | MIT | None | Used by Rolling Text |

## Imported read-only from the dashboard's coss ui copy (`portal/ui/coss/`)
| Component | Where |
|---|---|
| **Button** | Masthead (Sign in, Register, Index, Close), title CTAs, Annex sign-in, footer "Back to top", every timer control |
| **Sheet** (Sheet, SheetTrigger, SheetPopup, SheetTitle, SheetClose) | The phone and tablet "Index" table of contents |
| **Tabs** (underline variant) | The schedule's day tabs below 1024px |
| **Checkbox** | Quick reset |
| **Badge** (outline) | "Link to be announced" |
| **Card** (rendered as a link) | The floor-timer card in Resources |

The coss licence is AGPL-3.0 (from the `cosscom/coss` repository), the same as for the dashboard. If that is not acceptable, the MIT fallback is Base CN.

## Packages
- **GSAP 3.15.1:** ScrollTrigger and **SplitText**, which is bundled from 3.13 on. SplitText splits the film title and the statement. ScrollTrigger drives the scrubbed title sequence, the plate mask, the panel clip-path transitions and the placards standing up. `@gsap/react` provides `useGSAP`.
- **Lenis:** through the shared `@/shared/scroll` (the `useSmoothScroll` and `scrollToSection` helpers).
- **@paper-design/shaders-react:** no longer used. `PaperTexture` (fibre and crumple noise) was the Fig. 1 ground; it was removed in the Dusk clarity pass (2026-11-05) because grain and noise break the clarity rules. Fig. 1 is now pure SVG on the flat `surface` token.
- **motion:** used by InView and Rolling Text.
- **lucide-react:** the icons in the timer and the footer.
- **Fonts (fontsource, already installed): Official Record** (site/THEME.md). Source Serif 4 Variable (opsz, roman and italic), Public Sans Variable, IBM Plex Mono 400 and 500. Fraunces and Geist were removed.

## Copied from other concepts (own code, not a library)
- `geo.ts` and `landmask.ts` come from `concepts/merged`: the orthographic projection, the land lattice and the graticule. There are two edits: a sparser lattice, and finer dots.
- `clock.ts` comes from `concepts/merged`, and `links.ts` from `concepts/final`.

## Not used (honest list)
- The globe uses no cobe and no three.js. Fig. 1 is drawn in SVG on purpose, to read as a printed line plate.
