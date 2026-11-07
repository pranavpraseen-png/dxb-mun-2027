# Library: nav B and nav C

Catalogue: `C:\Users\praseen\.claude\skills\design-resources\by-category\ui-component-libraries.md` (Base UI, coss ui) and `motion-animation-libraries.md`. Everything used is already installed in `site/package.json`.

| Piece | Source | Used in | How |
|---|---|---|---|
| Dialog | Base UI (`@base-ui/react/dialog`) | nav-b, nav-c | B: the full-screen numbered phone menu. C: the palette shell (focus trap, Esc, scroll lock, `onOpenChangeComplete` so the jump happens after it closes). With `demo` both portal into the nav's parent box and use `modal="trap-focus"`. |
| Autocomplete (inline, grouped) | Base UI (`@base-ui/react/autocomplete`), its "Command palette" recipe | nav-c | `open inline` list with groups (Sections, Committees, Open), `autoHighlight="always"`, `keepHighlight`, arrow keys + Enter from the primitive. Ranking is ours: `filter={null}` + `filteredItems` from a small scorer (exact, prefix, word start, substring, then tight subsequence; abbreviation hits edge out name hits). |
| Lenis hooks | `@/shared/scroll` (`scrollToSection`, `getLenis`) | both | Section jumps use the nav offset (`NAV_H`); Lenis is stopped while a full-screen menu is open. |

Considered and rejected:
- **coss ui Command / cmdk**: coss ui is Tailwind source to copy; cmdk is not installed. Base UI's Autocomplete is the same primitive coss builds on and is already here.
- **Base UI Drawer** for the phone sheet: the palette is one component in two layouts (top panel / bottom sheet), so one Dialog with a class switch kept the code small.
- **Motion / GSAP** for the bars: CSS transitions on transform are enough (slide in, progress rule `scaleX`).
- **A dimmed backdrop** behind the palette: the crisp rule bans see-through layers, so the backdrop is an invisible click target and the palette has a hard ink edge.
