# Night Lab: notes

The approved homepage build. Structure: `site/BLUEPRINT.md` (sections 0–8, nav, motion rules). Colours: C1 Night Lab. Type: T1 (Mona Sans, Geist Mono, Instrument Serif italic).

- **Page:** http://127.0.0.1:5320/concepts/night-lab/
- **Calm version:** add `?still` (the same as reduced motion).
- **Force the loader again:** add `?boot` (it otherwise runs once per visit, using `sessionStorage`).

## Every move and where it came from
Evidence for each is in `concepts/refs/dissect/<slug>.md`.

| # | Section / piece | Move | Reference |
|---|---|---|---|
| 0 | Loader | A mono counter, `000 → 100`, in the bottom-left | Outfit (counter loader) |
| 0 | Loader | Hairlines draw in from the edges and stay as the hero's page grid | Dropbox (lines become the grid) |
| 0 | Loader | A CAD circle draws first, with orange tangent handles (round ends, square mid-point) and dashed construction lines | Oryzo (the CAD loader becomes the object) |
| 0 | Loader | A field of numbered points flies in and converges on the sphere. Plexus hairlines link neighbours, then sink into the globe as the graticule and coastlines draw on | Igloo (numbered plexus becomes the object) |
| 0 | Loader | "DXB MUN 2027" resolves by character scramble | Igloo (scramble) |
| 0 | Loader | At 100 the screen splits into top and bottom bars. The globe stays, because the bars sit under the canvas | Lando (split loader) |
| 0 | Loader | The scrambled wordmark flies to the top-left and becomes the nav logo | Getty (wordmark becomes the logo) |
| 0 | Loader | Mono corner labels, and "press any key / tap to skip" | Igloo (corner labels) |
| 1 | Hero | One centred object: a wireframe globe drawn only in lines and numbered points, with the near side only (an opaque ground-coloured core). It faces the Middle East from the first frame of the loader, with Dubai a little off centre, and only sways a few degrees. The CAD handles stay on its silhouette | GQ (wireframe-only 3D), Oryzo, Igloo |
| 1 | Hero | The orange Dubai marker carries one mono call-out (city and coordinates) on a 1px leader and a solid plate. It hides as the flight begins | Terminal (mono call-outs) |
| 1 | Hero | "DXB MUN" set edge to edge, at −0.05em; the letters rise from behind a baseline mask | Outfit (edge-to-edge word, letters rising behind a mask) |
| 1 | Hero | "Diplomacy around us." in Instrument Serif italic against the heavy grotesk | Lando (type contrast) |
| 1 | Hero | Mono corners: logo top-left, Register top-right, coordinates bottom-left, Scroll bottom-right | Igloo (corner labels) |
| 2 | Flight | A pinned, scrubbed stage. Dubai is already in view, so the globe settles the last few degrees and dives to it (25.20° N 55.27° E); rings draw round the city; a live "Centre" coordinate readout counts toward Dubai | Anime.js / Igloo (one object carries the stage) |
| 2 | Flight | At lock: an orange reticle and three mono call-outs on 1px leaders (city, host, conference). Each leader draws, then its label decodes | Terminal (mono call-outs, hairline wireframe labels), Igloo (scramble) |
| 3 | Clauses | One resolution clause per screen. The operative verb is in serif italic and orange | Getty (one sentence per screen) |
| 3 | Clauses | Letters fill from grey to ink as you scroll. Built as a clip-path staircase snapped to each letter's right edge, so only clip-path moves | Terminal (letter colour-fill) |
| 3 | Clauses | `CLAUSE 02 / 05` (NumberFlow) on a hairline progress rail | Getty (hairline counter) |
| 4 | Committees | Hairline grid lines slide from a tall-centre-cell layout into a 5 × 4 grid; cells flood from their edges in a scattered order and lock into a wall | Dropbox (grid lines become tiles) |
| 4 | Committees | Every nameplate is exactly two tones: a fill and its own dark ink (cream / ground, sand / brown) in a fixed checkerboard. **Orange rule:** no plate is orange at rest; orange appears only on the plate under the pointer or keyboard focus | Dropbox (tile colour pairs) |
| 4 | Committees | Hover or focus wipes the plate to orange with a clip-path; the cursor dot grows into a ground-coloured "VIEW" disc | Outfit (cursor disc, clip wipe) |
| 4 | Committees | Opening a plate shows it full screen as a nameplate, stepping with ← → | (new; Base UI Dialog) |
| 5 | Schedule | A horizontal mono ruler with numbered hour ticks slides under a fixed orange playhead as you scroll (transform only). The slot under the playhead is read out large: its day, name and time only. `conference.ts` has no event types, so there is no kind label. The block colours on the ruler are a visual key derived from the event name (sessions orange), not a label | Anime.js (scrub ruler with playhead) |
| 6 | Pass | The delegate pass: a perforated ticket with punch notches and a stub with a Register call to action. It prints in with a clip-path; the stub tears a little on hover | Siena (ticket stub) |
| Nav | Desktop | A solid top bar with every section numbered in mono caps, and a per-label roll on hover | Lando / Oryzo (flip/roll labels) |
| Nav | Desktop | The ticket-stub Register top-right; its left half shows the section in view and rolls when it changes | Siena (stub updates live) |
| Nav | Phone | A MENU pill opens a full-screen solid overlay with big caps items. The current item is greyed and struck through in orange | Lando (phone menu), Oryzo (MENU pill) |
| 7 | Desk | Wellness, Resources and Contact as index rows in a hairline table, numbered 05–07 to match the nav. Hover inverts a row, and each row opens in place | Blueprint §3.7 (Getty/Terminal hairline language) |
| 8 | Footer | "DXB MUN 2027" edge to edge, the host line, and the IHS maroon strip with its gold rule | Outfit (edge-to-edge word); IHS host colours |

## Rules applied
- **One easing.** `cubic-bezier(0.65,0.05,0,1)` is `--ease` in CSS and `CustomEase 'nl'` in GSAP (`motion.ts`, also set as the gsap default). Durations are 0.75 s (`--ui`) and 1.1 s (`--big`). Lenis's anchor jumps use the same curve, solved numerically in `ui.tsx`.
- **What moves.** Only transform, opacity, clip-path and the WebGL shaders. The one exception is the decorative leader legs, whose geometry is fixed once.
- **Line widths.** WebGL lines are Line2 at 1 CSS px. The canvas runs at `dpr [1, 2]`, flat (no tone mapping), and pauses (`frameloop="never"`) when the stage leaves the screen.
- **Clarity.** Every colour is opaque, there is no blur, glow, shadow or grain, and `font-synthesis: none` is set. Fluid sizes use Utopia clamps that land on whole pixels at 390 and 1440. The edge-to-edge words are measured and rounded down to a whole pixel.
- **Reduced motion and `?still`.** There is no loader and no pins. The hero globe and a "Dubai locked" globe render once as two still figures. All five clauses are listed fully inked, the wall is complete, the full schedule table is shown, and every desk row is open.

## Content
Every fact is from `src/data/conference.ts`. Unknown values say "To be announced".
- The coordinates 25.20° N 55.27° E are public geography, as the brief specifies.
- The numbers on the survey points are decorative indices, not data.
- The barcode on the pass stub is decorative.

## Decisions to flag
- **Nav blend.** The nav is solid ground with no difference blend. The page is dark everywhere, so the blend would add nothing; the blueprint allows it but does not require it.
- **Row numbers.** The desk rows use the nav's numbers (05–07) rather than the blueprint's 01–03, so a row and its nav link agree.
- **Timer.** The floor timer (`#/timer` on Merged) is not part of this page. It is not in the blueprint.
