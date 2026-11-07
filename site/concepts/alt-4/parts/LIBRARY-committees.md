# Library: Committees · B and C

| Piece | Source | How it is used | Considered and rejected |
|---|---|---|---|
| GSAP tween on `scrollLeft` | gsap (installed) | B: glides the rail to a plate (buttons, keys, click) and lands a mouse "throw": release velocity is projected forward (`v * 260 ms`) and the nearest plate is the target; CSS snapping is paused while gsap moves the rail. | GSAP Draggable + InertiaPlugin: heavier, and the browser already gives touch/trackpad momentum. |
| Native scroll snap | CSS `scroll-snap-type:x mandatory` | B: touch and trackpad keep the browser's own momentum and snap to a plate. | |
| CSS 3D `rotateX` | CSS | B: plates lie back at 62°, neighbours at 48°, the centre plate stands at 0°. Hard edges, no shadows. | |
| Listbox / combobox ARIA pattern | Own code, WAI-ARIA APG | B: the rail is a listbox with `aria-activedescendant`, arrow/Home/End keys. C: the input is a combobox over an always-open listbox; Up/Down use real layout to find the nearest item on the row above/below. | Base UI Autocomplete/Combobox (installed): its list is a linear popup; the idea needs an always-open 2-D wrap of large type with row-aware arrow keys. |
| Archivo Variable / JetBrains Mono Variable | Fontsource | C: the command line is set in JetBrains Mono at up to 52px; the abbreviations in Archivo at `font-stretch:70%`, 800. | |

Readability: B's caption (the full name) changes only 120 ms after the rail comes to rest, so fast flicks never flash names. C does not depend on scroll at all.
