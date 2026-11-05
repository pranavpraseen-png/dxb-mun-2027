# Redesign 2: "The Resolution" (`concepts/redesign-2`)

**Idea in one line:** the homepage is typeset as a resolution in a luxury print magazine. The clauses are the display type, and they build letter by letter as you scroll.

## Page structure (new, not the Merged layout)
1. **Masthead nav:** a thin editorial masthead. The wordmark sits on the left, a numbered index (I–VI plus Timer, 7 places) in the centre, and Sign in / Register on the right. On phones it becomes an "Index" button that opens a full-screen table of contents (coss Sheet).
2. **Title sequence (`#home`, pinned):** a film opening. Hairlines draw a frame, a credit card ("Indian High School presents") fades up, then DXB MUN rises letter by letter, and the hero photo appears in a thin horizontal slit between the title lines. Scrolling opens the slit to full bleed (a mask reveal), the title lines leave, and a plate caption plus the line "A Model United Nations in Dubai." set themselves.
3. **The Resolution (`#about`):** a magazine spread. A framed "plate" (Fig. 1) sticks on the left: a sparse SVG dot globe on a paper-texture ground, which turns and zooms to Dubai as the clauses scroll past on the right. Its coordinates are set as a caption. Each clause is an italic verb plus one huge fact, built char by char on scroll. On phones the plate comes first, then the clauses.
4. **Nameplate wall (`#committees`):** 19 cream UN placards in a typographic wall. They stand up from the desk (rotateX) row by row with scroll, and their abbreviations roll in. The section panel grows from an inset frame to full bleed as it enters.
5. **Order of proceedings (`#schedule`):** the printed programme. It has three day columns on desktop and coss Tabs on phones.
6. **Annex (`#wellness`, `#resources`):** an asymmetric two-column spread. Quick reset uses coss Checkboxes, and Resources has the floor-timer link.
7. **Colophon (`#contact`, footer):** a maroon panel that grows in like Contact, then the host line with one gold hairline, the Dubai clock and the secretariat link.

## References and the exact technique taken from each
- **Mat Voyce (portfolio, kinetic type).** Studio Uncommon's build notes (hontran.dev case study), read on 2026-11-05: GSAP SplitText per char, chars rising from about 120% below a mask, a random tilt of ±12°, `back.out(1.7)` and a 0.025s stagger. That is used for the DXB MUN title in the title sequence. The scroll-scrubbed per-char build of every clause comes from the same kinetic idea, done with React Bits ScrollFloat.
- **Cartier Watches & Wonders 2025 (luxury, Immersive Garden).** The site couldn't be opened; I worked from the library notes and search results. Taken: slow, precise mask reveals and an unhurried pace. The hero photo opens from a slit (`clip-path: inset()`) while it de-zooms from 1.28× to 1×, and the globe plate is revealed by a vertical mask when it enters.
- **Designex, Studio in Dubai (events).** Not opened; from the notes, "editorial layout". Taken: asymmetric grids (a 5/7 plate-and-text spread, a 7/5 annex), index numerals in the margin, and the Dubai coordinates set as a figure caption.
- **Silver Pinewood Residences (real estate).** Not opened; from the notes, "calm premium pacing". Taken: generous margins, one idea per band, hairline rules and nothing crowded. The page stays short, at about 5 to 6 screens.
- **DG Velvet Collection (luxury, MONOGRID).** Not opened; from the notes. Taken: rich section transitions. The Committees and Contact panels grow from an inset frame to full bleed (a scrubbed clip-path), so each section feels like a new spread.
- **David Anthony Chenault (portfolio).** Opened. Taken: large stacked display headlines with short broken lines over dark, moody imagery, small text set beside the heads, and a restrained palette with a few deep accents.

## Palette and type
- **Ground:** deep ink navy `#070B13`, with panels at `#0C1424`. Text is bone `#EFE7DC`; the secondary text is cream `#DCBDAB` (IHS).
- **Accents:** UN blue `#009EDB` is the only action colour (buttons and links). IHS maroon `#600E0E` is the colophon surface and the placard index numerals. Burnt orange `#C8642A` marks the clause numerals and rules. Gold `#FFB606` appears as one hairline in the host mark only.
- **Type:** Fraunces Variable (editorial serif, opsz axis, roman plus italic) for display and clauses, Geist Variable (precise grotesk) for text and UI, and Geist Mono for captions and coordinates.

## Still and reduced motion
`?still` or `prefers-reduced-motion` shows no intro and no pins. The title shows its end frame with the photo open, the plate is landed on Dubai, every clause is fully set, and every placard stands.

## Measured (shots.mjs, 2026-11-05)
- **Page height with motion:** 7978px at 1440 (8.9 screens) and 8314px at 390 (9.9 screens). With `?still`: 6988px and 7575px. That is longer than Merged (5.1 and 6.5 screens). Most of the extra comes from the scroll-driven title track (210svh, or 200svh on phones) and the sticky Fig. 1 spread.
- **No horizontal overflow** at any stop, and **no console errors** at either width.
- **Masthead jump to `#contact`:** it lands at 64px, flush under the bar.

## Known gaps
- At full zoom (×4.4), Fig. 1 reads as an even field of dots with the Dubai reticle; the Gulf coastline is not legible. That is deliberate (a sparse lattice), but it is less "map" than Merged's cobe globe.
- The PaperTexture ground is very subtle on screen; it shows mostly as faint fibre in the plate.
- The phone plate sticks to the top 44svh while the clauses scroll under it. It works at 390, but the "Dubai" label can overlap a dot.
- **Untested:** real touch devices, Safari, and 820px tablet widths. The title's slit geometry is measured in JS, so a very short landscape phone may give a very thin slit.
