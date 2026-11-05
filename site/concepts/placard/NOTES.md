# Placard (round 2: dark and institutional)

**Idea.** The site is built from MUN's own object, the UN nameplate.
- **Colour:** deep navy (`#07111F` ground, `#0B1F3A` surfaces) with UN blue `#009EDB` as the only accent and off-white text. Nameplates are off-white cards with black capitals.
- **Status colours:** green, amber and red appear only for status in the portals. The timer's "Time is up" uses red.
- **Type:** Archivo only. The width axis does the work: expanded (wdth 125) for display, normal width for text.
- **Feedback addressed:** this round removes the sunflower, coral and mint, the stickers, the bright offset shadows and the jokey copy (owner feedback 1).

**Signature effect.** Committees is one compact component.
- *Left, the deck:* a pile of 19 nameplates you can drag, flick and throw (Motion `drag`). A hard throw flies off with its own velocity; a soft release springs back. Arrow keys, prev/next and Shuffle do the same with animation, and a `NumberFlow` counter shows `07 / 19`.
- *Right, the floor:* the same 19 committees as small nameplates on rows of desks. Scrolling raises each row's nameplates one after another, like a vote (per-plate `useScroll` → `y`, staggered by column). Each nameplate is a button that calls its committee to the top of the deck, and the current one shows in UN blue.

**Navigation and length** (owner feedback 2).
- *Desktop:* all six sections plus Timer and Portal are always in the top bar, with scrollspy highlighting the active section.
- *Phones:* a full-screen menu.
- *Page height:* 4,241px at 1440 (4.7 viewports), 5,978px at 820 (5.1) and 5,813px at 390 (6.9).

**Round 3: scroll feel, first impression and nothing hidden.**
- *Scroll:* the homepage uses the shared `useSmoothScroll(true, 72)`; my CSS `scroll-behavior` is gone. Nav links, hero buttons, the teaser and "Back to top" go through `scrollToSection`. CSS `scroll-margin-top` is kept for still mode only, because Lenis also honours it and was doubling the offset.
- *Floor:* each row of nameplates now needs about 70% of a viewport of scroll to rise fully.
- *Progress line:* a thin UN-blue scroll-progress line sits under the nav (Motion `useScroll`, `scaleX`).
- *Hero:* it now says "Dates and venue: To be announced" and has a teaser link: three mini nameplates and "19 committees, from IPMC to NATO" with a down arrow.
- *Phones:* the deck stage has `touch-action: none` while live, so a finger on a placard drags it instead of scrolling the page. Touch-action intersects with ancestors, which is how it overrides Motion's `pan-y`. Everywhere else stays native.

**Libraries.** `@/shared/scroll` (Lenis), `motion/react`, `@number-flow/react`, `@base-ui/react` (Tabs, Menu, Dialog), `lucide-react` and `@fontsource-variable/archivo` (`wdth.css`).

**Known gaps.**
- The JS bundle is about 600 kB (195 kB gzip) with no code splitting.
- Throwing needs a mouse or touch; keyboard users get the same result through the arrow keys and buttons.
- On phones the deck area (about 290px tall) doesn't scroll the page by design; people scroll past it above or below.
