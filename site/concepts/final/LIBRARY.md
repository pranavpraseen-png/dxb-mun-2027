# Final homepage: where each component and pattern comes from

Base: Option B (`concepts/option-b/LIBRARY.md`), which follows Merged (`concepts/merged/LIBRARY.md`). This file lists what the final adds.

## Components (unchanged sources)

- **coss ui, read-only imports** from `portal/ui/coss/`: Button, Badge, Card, Checkbox, Menu (MenuTrigger, MenuPopup, MenuLinkItem), Sheet, Tabs (underline; the Schedule panels now use Base UI's `keepMounted` so the pinned sequence can switch days without remounting), Label.
- **coss ui copies** in `ui/`: Toggle, Toggle Group, Number Field (timer only).
- **Theme:** `final.css` maps the coss variables to the night tokens; `--primary` is now UN blue `#009EDB`, so default Buttons, the Tabs indicator and checked Checkboxes are UN blue. `--ring` stays gold.
- **Licence:** coss ui is AGPL-3.0 (same warning as Merged); the MIT fallback is Base CN.

## Motion patterns (design library: React Bits, Motion Primitives, Animate UI; built on local libraries only)

| Piece | Pattern it follows | Built with | File |
|---|---|---|---|
| Clause facts and section headings assembling by character | React Bits "Split Text" (per-character masked rise, staggered) | GSAP SplitText 3.15 (`mask: 'chars'`), scrubbed by ScrollTrigger in the opening; once on view for headings | `Opening.tsx`, `ui.tsx` |
| Placard spring tilt | React Bits "Tilted Card" / Animate UI tilt (spring rotateX/rotateY towards the cursor) | `motion` useSpring | `Deck.tsx` |
| Nameplate magnetic pull | Motion Primitives "Magnetic" (element leans towards the cursor on a spring) | `motion` useSpring | `Floor.tsx` |
| Hero spotlight reveal | React Bits "Spotlight" / Animate UI cursor reveal (a radial mask that follows the pointer) | CSS mask + `gsap.quickTo` on CSS variables | `fx.ts`, `final.css` |
| Rolling digits (Dubai clock, schedule counts, wellness count, deck counter) | Motion Primitives "Animated Number" / NumberFlow | `@number-flow/react` | `ui.tsx`, `Home.tsx`, `Deck.tsx` |
| Section arrivals, journey rail, pinned day sequence | ScrollTrigger scrub and pin recipes (GSAP docs) | GSAP + ScrollTrigger, Lenis | `fx.ts`, `Home.tsx` |
| Nav colour-block wipe | WEIMA-style page transition (no library equivalent; one fixed element, one scaleX) | GSAP timeline | `fx.ts` |

No new npm packages. `@paper-design/shaders-react` was offered but not installed (see NOTES.md).

## Changes from Option B

| Piece | File | Change |
|---|---|---|
| Palette | `final.css` | UN blue `--un` added as `--primary` and the link colour; the host strip is IHS maroon with cream text |
| Hero headline | `Opening.tsx`, `final.css` | Two stacked layers (gold outline under the white fill) for the spotlight; the outline copy is `aria-hidden` |
| Top-nav and clause links | `TopBar.tsx`, `Opening.tsx` | Jump through `wipeTo` (colour block) instead of the plain smooth scroll; still mode falls back to the plain jump |
| Section drift | `fx.ts` | Option B's `motion.ts` drift is replaced by the camera-stop arrival (adds scale) and the Cartier-style mask reveals |
| Schedule | `Home.tsx` | Pinned day sequence on desktop; the summary line is bound to the current day so its counts roll |
| Ticker, timer digits | (unchanged) | The ticker keeps its marquee; the timer view's seven-segment digits do not flip (not built) |
