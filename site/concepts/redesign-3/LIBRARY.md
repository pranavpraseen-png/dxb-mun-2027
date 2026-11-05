# Library components in redesign-3 ("On Air")

Every block is built from a library component or library primitive. Hand-written CSS in `onair.css` covers only tokens, layout glue and the broadcast graphics (the monitors, the nameplate faces, the HUD brackets).

| Component | Library (category in the design library) | Source | Where it is used | Changes |
|---|---|---|---|---|
| Marquee | Magic UI (UI component libraries) | github.com/magicuidesign/magicui `apps/www/registry/magicui/marquee.tsx` (MIT) → `lib/marquee.tsx` | the ticker under the control room | `cn` from the coss utils; keyframes in `onair.css`; `aria-hidden` on the repeated copies |
| NumberTicker | Magic UI | `apps/www/registry/magicui/number-ticker.tsx` (MIT) → `lib/number-ticker.tsx` | PVW 2 readouts (19 / 3 / 6) that count once the slate goes live; the multiview "19 channels" status tile | added a `start` gate, `useGrouping` and `still`; dropped its colour classes |
| DecryptedText | React Bits (UI component libraries) | github.com/DavidHDev/react-bits `src/ts-tailwind/TextAnimations/DecryptedText/DecryptedText.tsx` (MIT + Commons Clause) → `lib/decrypted-text.tsx` | the one scramble on the page: the full committee name on the multiview PGM lower-third | unchanged apart from a header comment |
| RollingText | Animate UI (UI component libraries) | github.com/imskyleen/animate-ui `apps/v1/apps/www/registry/primitives/texts/rolling/index.tsx` (MIT) → `lib/rolling-text.tsx` | the tracker's headline cards: each fact flips in letter by letter, like a split-flap board | `useIsInView` was replaced by a `play` prop, plus `still` |
| Magnetic | Animate UI | `apps/v1/apps/www/registry/primitives/effects/magnetic/index.tsx` (MIT) → `lib/magnetic.tsx` | the Register button in the AUX monitor (cursor-reactive, off on touch) | the `asChild`/Slot path was removed; added `disabled` |
| DirectionAwareTabs | Cult UI (UI component libraries) | github.com/nolly-studio/cult-ui `apps/www/registry/default/ui/direction-aware-tabs.tsx` (MIT) → `lib/direction-aware-tabs.tsx` | the Rundown's day tabs | ResizeObserver instead of `react-use-measure`; no blur filter (transform and opacity only); square; ARIA tabs and arrow keys; two-line labels |
| Button | coss ui (UI component libraries) | `portal/ui/coss/button.tsx` (read-only import; AGPL-3.0, see `portal/LIBRARY.md`) | Sign in, Register, timer controls, presets, prev/next, Back to top | themed by the Dusk tokens; `onair.css` removes its soft shadows, inset highlights and /alpha hovers (hover goes sand to cream) |
| Sheet | coss ui | `portal/ui/coss/sheet.tsx` | the "Rundown" menu below 1100px | themed; the translucent blurred backdrop and soft shadow are removed in `onair.css` (opaque panel, 1px line edge) |
| Checkbox | coss ui | `portal/ui/coss/checkbox.tsx` | Quick reset | size only |
| NumberFlow | @number-flow/react (Motion & animation libraries) | npm package | the slate countdown, the tracker step counter, the multiview "01 / 19", the desk timer digits, the wellness count | none |
| GSAP + ScrollTrigger | GSAP (Motion & animation libraries) | npm package | the cut from the slate, the monitors keying on, the lower-third wipes, the section-slate colour blocks, the WEIMA nav wipe, the multiview power-on, the tracker progress | none |
| Lenis | via `@/shared/scroll` | npm package | the shared, calm scroll feel | none |
| three | Three.js (3D & WebGL) | npm package (already in `package.json`; nothing installed by this agent) | `TrackerGlobe.ts`: land dots (on cobe's land mask), graticule, Dubai cross-hair lines, pip, pulse ring and limb | own scene; lazy-loaded; paused off screen |
| motion | Motion (Motion & animation libraries) | npm package | the sliding underline in the control bar (`layoutId`), the tab bubble, the Magic UI and Animate UI parts | none |
| lucide-react | Lucide (Icons) | npm package | arrows, play/pause, reset, maximise, menu | none |
| Official Record: Source Serif 4 Variable (opsz + italic), Public Sans Variable, IBM Plex Mono 400/500 | Fontsource (Fonts & type foundries), SIL OFL 1.1 | npm packages already installed | Source Serif 4 600 for display and headlines (italic for clause verbs and the motto), Public Sans for text, nav and buttons, Plex Mono for timecodes, committee codes and data labels (site/THEME.md) | none |

**Copied but not used:** none.

**Licences:** React Bits ships under MIT + Commons Clause, which forbids selling the component itself; using it on this site is fine. Every other copied file is MIT.
