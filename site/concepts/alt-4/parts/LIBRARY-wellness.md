# Library: wellness B and wellness C

Catalogue: `C:\Users\praseen\.claude\skills\design-resources\by-category\ui-component-libraries.md` (Base UI). Everything used is already installed in `site/package.json`.

| Piece | Source | Used in | How |
|---|---|---|---|
| useWellness | `@/shared/hooks` | both | The three daily checks (same storage key and reset-per-day as the live site), the status and the note. |
| Toggle | Base UI (`@base-ui/react/toggle`) | wellness-b | The three check cells (pressed = ink fill). |
| Switch (Root, Thumb) | Base UI (`@base-ui/react/switch`) | wellness-c | The three hardware throws. The thumb's `data-checked` drives the snap (a 170 ms transform with overshoot, `cubic-bezier(.45, 1.9, .5, .78)`). Wrapped in a label so the whole unit flips it. |
| Web Audio | platform | wellness-c | A ~30 ms mechanical click (filtered noise burst + a low thump), made on first use; silent under `?still`. |
| Web Animations API | platform | wellness-c | A 2px press dip of the unit on each flip. |

Hand-written instead of a library:
- **Box breathing pacer (B)**: one rAF loop moves an SVG point around a 0–100 square (4 s per side, 4 rounds) and grows the current edge in ink. The phase word and the count change only when they change (once a second), never per frame, and swap instantly, so they stay readable. Under `?still` / reduced motion the point steps once a second. Finishing four rounds ticks "Breathe".

Considered and rejected:
- **Motion (`motion`) springs** for the switches: a CSS overshoot curve gives the same snap with no JS.
- **NumberFlow** for the pacer count: a rolling digit every second would be motion for its own sake next to a breathing guide.
