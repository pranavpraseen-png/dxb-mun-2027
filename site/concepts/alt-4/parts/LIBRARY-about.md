# Library: About · B and C

| Piece | Source | How it is used | Considered and rejected |
|---|---|---|---|
| GSAP ScrollTrigger | gsap (installed; catalogue: motion-animation-libraries.md) | B: one trigger per clause at `top 62%` (the reading line) toggles `.is-read` (muted to ink, hairline draws). C: one trigger starts the flip on enter and resets it on leave-back. Nothing is scrubbed to scroll position. | Scrubbed reveals: rejected by the readability rule (no big text tied to scroll). |
| Archivo Variable, width axis + italic | Fontsource `@fontsource-variable/archivo/wdth.css`, `wdth-italic.css` | B imports the italic face itself so the clause verbs are true italics, not slanted romans. C sets the flap digits at `font-stretch:70%`, weight 800. | |
| JetBrains Mono Variable | Fontsource | Labels, the clause counter, captions. | |
| Split-flap tile | Own code (about-c.tsx `Flap`) | Two static halves + a falling upper flap and a landing lower flap, CSS keyframes with hard `rotateX`, no shading. Digits run in drum order (blank, 0–9) like a real board; letters take 2–4 flaps. Settles in about 1 s. | NumberFlow (`@number-flow/react`, installed): rolling digits, not flaps, and its default edge mask fades (against the crisp rule). Kept for other parts. |
| Container query units | CSS (`container-type:inline-size`, `cqw`) | C sizes every tile from the board width so the 10 tiles always fill the 12-column grid exactly. | Fixed px tiles: break at in-between widths. |
| `isStill()` | `@/shared/hooks` | `?still` / reduced motion: B renders every clause read; C renders the final board with no flaps. | |
