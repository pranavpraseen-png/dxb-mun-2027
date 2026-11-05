# Option B, "Night Assembly": where each component comes from

The structure and sources are the same as Merged (`concepts/merged/LIBRARY.md`, sweep rows 1–32). This file lists only what changed.

- **coss ui, read-only imports** from `portal/ui/coss/`: Button, Badge, Card, Checkbox, Menu (MenuTrigger, MenuPopup, MenuLinkItem), Sheet, Tabs (underline), Label.
- **coss ui copies** in `ui/`, unchanged from Merged: Toggle, Toggle Group, Number Field (timer only).
- **Theme:** `night.css` maps the coss variables to the night tokens:
  - `--primary` is white, so default Buttons, the Tabs indicator, checked Checkboxes and the done Badge are all white on charcoal;
  - `--ring` is gold.
  - One unlayered rule turns the library Buttons and Menu trigger into Geist sentence case (the dashboard copy defaults to bold condensed capitals).
- **Licence:** coss ui is AGPL-3.0 (the same warning as Merged). The MIT fallback is Base CN.

## Changes from Merged

| Piece | File | Change |
|---|---|---|
| Portal menu | `TopBar.tsx` | Added a third coss MenuLinkItem: "Chair", linking to `chair/` (built in `links.ts` like the others) |
| Host strip | `Home.tsx` | Added a low-key "Chair sign-in" link next to "Secretariat sign-in" (plain anchors, as before) |
| Section index column ("02 Committees") | `Home.tsx` (`Index`) | A plain list (layout glue, not a control). The labels and numbers come from `nav` in `conference.ts`, so there is no new text |
| Tags (teaser, corner tag, "Link to be announced") | `Opening.tsx`, `Home.tsx` | Still coss Badge (outline). Now mono, uppercase and small, with a hairline border instead of the orange one |
| Floor-timer promo | `Home.tsx` | Still a coss Card. The hover border is now grey, not orange |
| Keyed headings | `night.css` | The UN-blue wipe is now a quiet fade, plus one 40px gold hairline under each heading |
| Placards, nameplates | `night.css` | White plates with a charcoal header bar. The desk under each row is a hairline. The active plate gets a gold top edge. The brown edges are gone |
| Globe | `Globe.tsx` | cobe colours only: a grey base, a gold Dubai marker and a charcoal glow. Behaviour is unchanged |
| Portals / Toast | (not copied) | Dead code in Merged. Their CSS was dropped as well |

No gradients, glows, pill counters or icon cards were added.

## Motion personality (`motion.ts`)

No library component: scroll motion is GSAP + ScrollTrigger (already in package.json) on top of the shared Lenis scroll, as in Merged. See NOTES.md for the techniques and references.
