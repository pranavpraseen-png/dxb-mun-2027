# Library: Schedule · B and C

| Piece | Source | How it is used | Considered and rejected |
|---|---|---|---|
| Base UI Tabs | `@base-ui/react/tabs` (installed; catalogue: ui-component-libraries.md, Base UI, the base under coss ui) | C: the day picker (`Tabs.Root/List/Tab`, `data-active`), with one shared, kept-mounted `Tabs.Panel` so the board stays mounted and flips from the old day to the new one. | Base UI ToggleGroup: tabs are the right semantics for "show this day". |
| GSAP ScrollTrigger | gsap (installed) | C: starts the first flip once, on enter. After that only a day pick changes the board. | |
| Split-flap cell | Own code (schedule-c.tsx `Cell`) | 41 cells per line (time 8, event 19, until 8, length 6). A changed char takes 1–3 flaps of 46 ms; rows stagger 70 ms, columns 9 ms; the whole board settles in about 1 s. Unchanged chars do not flip. A visually hidden `<table>` carries the real data for screen readers. | |
| Shared time axis | Own code (schedule-b.tsx) | Start times are parsed from the data's own `time` strings and lengths from its `duration` strings. Axis from the first hour to the last (9 AM to 8 PM). Phones turn the same chart upright (three columns, time running down). The cursor starts at the first moment when the most days are in session, worked out from the data. | A charting library (catalogue: charts-data-viz.md): a 3-row Gantt is lighter as plain absolutely positioned buttons, and fully keyboard-reachable. |
| Archivo Variable / JetBrains Mono Variable | Fontsource | Block names in Archivo at `font-stretch:84%`; times in mono. | |
