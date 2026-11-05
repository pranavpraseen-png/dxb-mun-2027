# Option C (IHS Maroon): where each component comes from

This option is a copy of Merged (`concepts/merged/`), so the component sweep and the sources are the same as Merged's `LIBRARY.md`. This file lists only what changed.

- **coss ui.** These are read-only imports from `portal/ui/coss/`: Button, Badge, Card, Checkbox, Menu, Sheet, Tabs and Label. The coss files in `ui/` (Toggle, Toggle Group, Number Field) are copied unchanged from Merged. Licence: AGPL-3.0 (cosscom/coss). The MIT fallback is Base CN.
- **No new hand-built controls.** Every new block reuses coss components or is layout glue.

## What changed from Merged

| Piece | File | Change |
|---|---|---|
| Theme | `maroon.css` | The same coss variable contract, filled with maroon, cream, gold and UN-blue tokens. `--font-heading` (coss Buttons) is now Archivo caps. `--font-display` (Playfair) is new for headings |
| Cream bands | `maroon.css` `.band--cream` | The coss Buttons, Checkbox, Badge and Card on the cream bands are the same library components. Their tokens (`--background`, `--foreground`, `--primary` = `#0069A6`, `--border` and the rest) are re-pointed inside the band scope; nothing is hand-built |
| Section bands and numerals | `Home.tsx` | Committees, Schedule and Wellness+Resources are wrapped in full-bleed `<section class="band">` elements. The numerals I to V are a decorative `<span aria-hidden>` beside each title (layout glue) |
| Portal menu: "Chair" | `TopBar.tsx` | A coss `MenuLinkItem` to `links.chair` (`../../chair/`), with the sub-line "Chair dashboard" |
| Host strip: "Chair sign-in" | `Home.tsx` | A plain low-key link next to "Secretariat sign-in", the same element as that link |
| Tags (teaser, corner tag, "Link to be announced") | `Opening.tsx`, `Home.tsx` | Still the coss Badge (outline). Archivo caps, with a cream or maroon hairline instead of the orange border |
| Floor-timer promo hover | `Home.tsx` | Still the coss Card. The hover border is now `foreground` instead of orange |
| Timer number fields | `TimerView.tsx` | `bg-navy` is replaced by `bg-background`. Otherwise unchanged |
| Globe colours | `Globe.tsx` | cobe gets cream-tinted dots on a dark maroon sphere, a gold Dubai marker, and a glow matching the ground. The SVG fallback matches in `maroon.css` |
| Portals, Toast | (not copied) | Dead code in Merged. Their CSS is dropped too |

The kept signature pieces (opening wipes, ticker, keyed headings, placard deck, floor of nameplates, globe, resolution clauses, seven-segment clock) are restyled only, as in Merged.

## Motion personality (`motion.ts`)

No library component: scroll motion is GSAP + ScrollTrigger (already in package.json) on top of the shared Lenis scroll, as in Merged. See NOTES.md for the techniques and references.
