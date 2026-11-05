# Option A, "UN Paper": where each component comes from

Structure and sources are the same as Merged (`concepts/merged/LIBRARY.md`, sweep rows 1–32). This file lists only what changed.

- **coss ui, read-only imports** from `portal/ui/coss/`: Button, Badge, Card, Checkbox, Menu (MenuTrigger, MenuPopup, MenuLinkItem), Sheet, Tabs (underline), Label.
- **coss ui copies** in `ui/`, unchanged from Merged: Toggle, Toggle Group, Number Field (timer only).
- **Theme:** `paper.css` maps the coss variables to the paper tokens (light: `index.html` has no `dark` class). `--primary` is the deep UN blue, `--radius` is 0, and one unlayered rule zeroes the library's soft drop shadows (`--tw-shadow`, `--tw-inset-shadow`) so nothing floats on paper; focus rings are kept. `--font-heading` is Instrument Sans (so library Buttons are small tracked capitals); `font-display` is Fraunces.
- **Licence:** coss ui is AGPL-3.0 (same warning as Merged). The MIT fallback is Base CN.

## Changes from Merged

| Piece | File | Change |
|---|---|---|
| Portal menu | `TopBar.tsx` | Added a third coss MenuLinkItem: "Chair" ("Chair dashboard"), linking to `chair/` (built in `links.ts` like the others) |
| Host strip | `Home.tsx` | Added a low-key "Chair sign-in" link next to "Secretariat sign-in" (plain anchors, as before) |
| Tags (teaser, corner tag, "Link to be announced") | `Opening.tsx`, `Home.tsx` | Still coss Badge (outline): mono 14px with a maroon edge instead of orange |
| Wellness checkboxes | `Home.tsx` | Still coss Checkbox, square, with an ink border |
| Floor-timer promo | `Home.tsx` | Still a coss Card; the hover border is ink, not orange |
| Keyed headings | `paper.css` | The UN-blue wipe is gone; a static 56px maroon rule sits under each heading (no motion) |
| Section frame | `paper.css` | Every section opens on a navy double rule (like a UN document header); titles are Fraunces sentence case; deks are italic |
| Placards, nameplates | `paper.css` | White sheets with an ink header bar and a flat offset "sheet behind" instead of a shadow; desks are single ink rules; the current plate is ink with a gold edge |
| Wellness + Resources | `paper.css` | Two columns divided by a vertical ink rule, like a two-column document page |
| Contact | `paper.css` | A colophon on a paper shade instead of the brown band |
| Globe | `Globe.tsx` | cobe in light mode (`dark: 0`): paper sphere, ink dots, maroon Dubai marker; the SVG fallback uses the same inks. Behaviour unchanged |
| Portals / Toast | (not copied) | Dead code in Merged; their CSS was dropped as well |

No gradients, glows, pill counters or icon cards were added; no new components were needed.

## Motion personality (`motion.ts`)

No library component: scroll motion is GSAP + ScrollTrigger (already in package.json) on top of the shared Lenis scroll, as in Merged. See NOTES.md for the techniques and references.
