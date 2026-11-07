# Alt 4 · The Floor: library pieces

## Nav + sections (version A), by the sections agent
Files: `Nav.tsx` (`NavA`, alias `Nav`), `Sections.tsx` (`AboutA`, `CommitteesA`, `ScheduleA`, `RegisterA`, `WellnessA`, `ContactA` = resources + contact + footer, and `Sections`), `sections.css`, `sections-shots.mjs`. Everything used was already installed; no new packages.

| Piece | Source | How it's used |
|---|---|---|
| Base UI `Dialog` | `@base-ui/react/dialog` (catalogue: Base UI, the primitive under coss ui) | Phone menu: a full-screen opaque sheet. Focus trap, Esc, a close button, focus returns to Menu. `modal="trap-focus"` + a `container` portal in `demo` mode, so it opens inside a board frame. |
| Base UI `Tabs` (vertical) | `@base-ui/react/tabs` | Committees (wide): 19 abbreviations as a two-column index (column-major, so arrow keys run 01→19) beside a detail pane. `activateOnFocus`, so arrows browse. |
| Base UI `Tabs` + `Tabs.Indicator` | `@base-ui/react/tabs` | Schedule day tabs; the indicator is a 2px ink rule that slides under the active day. |
| Base UI `Accordion` | `@base-ui/react/accordion` | Committees (narrow): a compact 19-row list, one row expands (height via `--accordion-panel-height`). |
| Base UI `Field` | `@base-ui/react/field` | The "Your name" input and its label in Register. |
| Base UI `Checkbox` | `@base-ui/react/checkbox` | Wellness checklist rows (inside a `<label>`), wired to `useWellness()`. |
| GSAP ScrollTrigger `batch` | `gsap` | The only motion below the hero: each `[data-reveal]` block clips in from its top edge and rises 10px, once. No opacity, no blur. Off under `?still` / reduced motion. |
| Archivo Variable (wdth) / JetBrains Mono Variable | Fontsource (imported in `main.tsx`) | Titles 650 / wdth 100, max 56px. Placard name 720 / wdth 84. Labels in mono 11px, uppercase, 0.14em. |
| CSS container queries | platform | Each section and the nav lay out from their own width, so a block also works alone on a design board. Committees switches Tabs → Accordion from its own width (ResizeObserver), not the window's. |

**Considered and rejected:**
- coss ui / shadcn components copied in: they need Tailwind class styling, and this page is plain CSS with `f-` prefixes. Base UI is the same primitive layer with no styling to strip out.
- NumberFlow for the stats: the stats are plain typographic facts. Counters were ruled out ("no stat counters").
- Lenis anchors for nav jumps: `scrollToSection(id, NAV_H)` is used instead, so the offset is the same with or without Lenis.
- A marquee or carousel for committees (combo-1): it moves under the reader and hides 18 of 19 items. An index shows them all.
