# Redesign 1: library components and their sources

Every visible block comes from a library. Hand-written code is only the 3D scene, the scroll-to-camera mapping, tokens and layout glue.

## Copied into `ui/` (source fetched from each project's GitHub on 2026-11-05)
| Component | Library (category) | Source | Licence | Changes | Used for |
|---|---|---|---|---|---|
| `SplitFlapText` | React Bits (UI components) | `DavidHDev/react-bits` `src/ts-tailwind/TextAnimations/SplitFlapText/SplitFlapText.tsx` | MIT | none (header only); themed by props | the on-air slate's "DXB MUN 2027" board (the `h1`) |
| `TextEffect` | Motion Primitives (motion) | `ibelick/motion-primitives` `components/core/text-effect.tsx` | MIT | `cn` import path; the unused-rest destructure rewritten for `noUnusedLocals` | every clause fact keys on word by word (`preset="slide"`: opacity + transform only) when its camera stop arrives |
| `Magnetic` | Motion Primitives (motion) | `components/core/magnetic.tsx` | MIT | none | the two main CTAs (Explore committees, Register) lean toward the cursor |
| `RollingText` | Animate UI (motion) | `imskyleen/animate-ui` `apps/v1/apps/www/registry/primitives/texts/rolling/index.tsx` | MIT | its in-view hook replaced by a `play` prop | the HUD camera label ("CAM 04 · FLOOR") rolls over at every stop |
| `Marquee` | Magic UI (UI components) | `magicuidesign/magicui` `apps/www/registry/magicui/marquee.tsx` | MIT | `cn` import path; the `animate-marquee` keyframes live in `assembly.css` | the broadcast ticker along the bottom |

## Imported read-only from the dashboard's copy of coss ui (`portal/ui/coss/`, AGPL-3.0, see `portal/LIBRARY.md`)
| Component | Used for |
|---|---|
| `Button` | every action: CTAs, prev/next committee, timer Start/Pause/Reset and presets, Back to the opening |
| `Menu`, `MenuLinkItem` | the Portal menu in the top bar (Sign in, Register) |
| `Sheet` | the full menu on tablets and phones |
| `Tabs` | the schedule's Day 1 / Day 2 / Day 3 (the picked day also redraws the 3D rostrum screen) |
| `Checkbox` | the Quick reset check-in |
| `Badge` | "Link to be announced" on the resource row |

## Packages
| Package | Category | Used for |
|---|---|---|
| `three` 0.187 (installed for this redesign) | 3D & WebGL | the scene (no post-processing) |
| `@react-three/fiber` 9.8 (installed) | 3D & WebGL | React renderer, `useFrame`, pointer events on the nameplates |
| `@react-three/drei` 10.7 (installed) | 3D & WebGL | `Stars`, `useCursor` |
| `gsap` + `ScrollTrigger` + `@gsap/react` | motion | stop measuring on refresh, the scrubbed slate exit |
| `lenis` (via `@/shared/scroll`) | motion | the weighted scroll; nav jumps fly the camera through Lenis |
| `motion` | motion | the sliding nav underline (`layoutId`), and the copied components above |
| `@number-flow/react` (NumberFlow) | motion | the "03 / 19" committee counter |
| `lucide-react` (Lucide) | icons | chevrons, menu, arrow |
| `@fontsource-variable/source-serif-4` (opsz, opsz-italic), `@fontsource-variable/public-sans`, `@fontsource/ibm-plex-mono` (400, 500) | fonts (Official Record, site/THEME.md) | display and clause verbs, text and UI, codes and numbers |

## Data
Facts only from `src/data/conference.ts`; behaviour from `src/shared/hooks.ts` (`useFloorTimer`, `useWellness`, `isStill`) and `src/shared/scroll.ts`. The land mask (`landmask.ts`) is copied from `concepts/merged/landmask.ts` (extracted from cobe, MIT).
