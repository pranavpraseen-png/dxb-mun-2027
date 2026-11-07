# Library: contact B and contact C

Catalogue: `C:\Users\praseen\.claude\skills\design-resources\by-category\motion-animation-libraries.md` (NumberFlow). Everything used is already installed in `site/package.json`.

| Piece | Source | Used in | How |
|---|---|---|---|
| NumberFlow | `@number-flow/react` | contact-c | The Dubai clock's hours, minutes and seconds roll on change. The fade masks are turned off (`--number-flow-mask-height/width: 0`) so digits roll with hard edges; `animated={false}` under `?still`. |
| Intl.DateTimeFormat | platform | contact-c | Dubai time from `timeZone: 'Asia/Dubai'` (h23), re-read on each second boundary. |
| Canvas `measureText` | platform | contact-c | The wordmark is fitted to the full width, then its cap tops are placed on the box's top edge and the page ends through the letters (74% of the cap height shows), from the font's real metrics. |

Both versions keep the contract: `<section id={id}>` holds contact + resources + footer; resources sit inside it with id `resources` (or `<id>-resources`).

Considered and rejected:
- **A drawn "signature" on the dispatch (B)**: a scribble would read as a real person's signature; it is a plain signature line instead.
- **A scramble or scroll-driven wordmark (C)**: the owner found big changing words unreadable when scrolling fast, so the wordmark is static and the only moving text is the small clock.
