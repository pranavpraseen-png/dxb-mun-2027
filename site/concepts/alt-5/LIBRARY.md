# Alt 5 · library and credits

## Installed for this build
Both were installed with `npm install` from `site/`, through the lock. Both are OFL-1.1 and from Fontsource (the
design-resources catalogue's font source).

| Package | Axes, checked in its Fontsource `metadata.json` | Where |
|---|---|---|
| `@fontsource-variable/anybody` 5.3.0 | wdth 50–150, wght 100–900, ital 0–1 | every display line and all text (`wdth.css`, which carries both axes) |
| `@fontsource-variable/martian-mono` 5.3.0 | wdth 75–112.5, wght 100–800 | every label, time and tally caption |

## Already installed, used here
| Piece | From | How it is used |
|---|---|---|
| **GSAP** + **ScrollTrigger** | motion category (GSAP) | `gsap.ticker` drives the kinetic engine, the marquee and the floor tracker. The loader and the wipe are timelines. ScrollTrigger `scrub` rises the colour stairs. |
| **Lenis** via `src/shared/scroll.ts` | shared | `useSmoothScroll`; the wipe jumps with `lenis.scrollTo(…, { immediate, force })`. Its own anchor handling is kept out with `stopPropagation`. |
| **NumberFlow** (`@number-flow/react`) | type tools / motion (NumberFlow) | The FOR / AGAINST / ABSTAIN figures on the vote board. They are set in Anybody (plain zeros); the mask height is 0 so the digits roll with a hard edge, with no fade. `animated={false}` in still mode. |
| **Base UI Dialog** (`@base-ui/react/dialog`) | the primitive coss ui is built on | The phone menu: focus handling, Escape, scroll lock, `data-starting-style` / `data-ending-style` for the hard clip-path wipe |
| `isStill()`, `useWellness()` | `src/shared/hooks.ts` | calm mode; the wellness check-in, saved per device per day |
| `links.ts` | copied from `concepts/alt-3/links.ts` (comment updated) | Register / Sign in → `portal + '#/now'`; Secretariat and Chair links in the footer |

## Written here (techniques credited to the references, code my own)
- **`kinetic.ts`, the kinetic type engine** (Mat Voyce's cursor- and speed-reactive variable type):
  - per-letter wdth/wght from cursor distance, scroll speed and segment emphasis;
  - a bisection solve that keeps each line exactly its column width;
  - a read-back correction factor.
  - Measuring is one batched layout of 50 characters × 15 axis points.
- **`KLine.tsx`**: plain lines and segmented lines (the day tabs, the wellness toggles and the stats line are each one fitted line made of buttons or spans).
- **`Wipe.tsx`**: WEIMA's colour-block page transition, with three opaque full-screen blocks.
- **The stairs in `Sections.tsx`**: the scroll version of the same idea. Hard columns in the next motion's colour rise
  over the previous one's empty bottom padding (never over its text).
- **`Loader.tsx`**: the gavel count, a hard letter swap from "ORDER, ORDER" to "DXB MUN 2027", then a hard cut.
- **`Tally.tsx` + `floor.ts`**: the vote board. FOR = share read, AGAINST = share ahead, ABSTAIN = motions jumped past
  without stopping (kept for 650 ms or more counts as stopping).

## Considered and rejected
- **Bricolage Grotesque** (installed): its width axis is only 75–100, too little stretch for this idea.
- **Archivo** (installed, wdth 62–125): already the face of Alt 2.
- **Mona Sans**: excluded by the brief (Night Lab, Alt 3).
- **Big Shoulders**: no width axis.
- **Space Mono, JetBrains Mono, IBM Plex Mono**: JetBrains and Plex are the likely picks of the Dispatch alt (named in
  its brief), and Geist Mono is Night Lab's. Martian Mono keeps this alt's type unique, and it has a width axis too.
- **SplitText / textmotion / Torph / Scritto**: every effect here is per-letter axis changes on spans this build
  already owns, so a splitting or text-morph library would add weight for nothing.
- **coss ui / shadcn components**: the page has buttons, links, one toggle row and one dialog. The dialog comes from
  Base UI (coss ui's own primitive). Pulling in styled kits would bring soft shadows and rounded pills, which this
  hard-edged system rejects.
- **`mix-blend-mode` nav or cursor**: not opaque (crisp rule). The nav is solid black on every ground.
