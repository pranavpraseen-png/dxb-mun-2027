# Alt 6 · Dispatch

**The idea in one line:** the conference arrives as a diplomatic cable. A teleprinter prints the header in dot-matrix, a 1-bit dither field floods the screen and settles into the hero, your cursor (or finger) carves a hard-edged lens that declassifies the layer underneath, and the rest of the page feeds out of the printer as one strip of tractor-feed paper: seven numbered cables whose facts sit under redaction bars until you scroll to them.

**Preview:** http://127.0.0.1:5320/concepts/alt-6/ · calm version: `?still` (also used for `prefers-reduced-motion`) · no WebGL: CSS fallback hero.
**Screenshots:** `site/shots/r3/alt-6/`, made by `node scripts/heavy.mjs "node concepts/alt-6/shots.mjs"`.

## How it differs from what exists
| Existing | Its signature | Dispatch instead |
|---|---|---|
| Night Lab | warm near-black, wireframe globe flies into Dubai, typed loader in a DOM font | ink + paper, no 3D at all; the loader is a **dot-matrix bitmap printed inside the shader**, and the same canvas becomes the hero |
| Alt 1 Terminal Paper | light paper, ink, one blue | the paper is *tractor-feed printout* (sprocket holes, perforations) below a dark dithered hero; no blue; the accent is a stamp red |
| Alt 2 Poster | cream / black / maroon, huge Archivo type, IBM Plex Mono | Sofia Sans Extra Condensed + Courier Prime (a typewriter, not a code mono); redaction bars, not poster blocks |
| Alt 3 One Stage | one 3D camera, point web, scramble decode | a flat 2D fragment shader, ordered (Bayer) dither, a cursor lens; text enters by teletype print and by redaction bars sliding off, never by scramble |

## References and the exact technique taken from each
| Reference | What I borrow (technique only) |
|---|---|
| **Lando Norris** (liked) | The cursor-reactive hero: the pointer reveals a second image under the first. Lando does it with a soft blob; here the mask is a **metaball chain of 14 spring-followed points** (a fluid trail) thresholded with `step`, so the edge is stair-stepped 1-bit blocks. A drifting **contour-line field** behind the hero (Lando's topographic lines), here as 1-texel isolines of the noise field. Phone: no hover, so the lens follows the finger and wanders on its own when idle (Lando's phone swaps hover for touch). The one easing curve `cubic-bezier(0.65,0.05,0,1)` for UI motion. |
| **Getty · Tracing Art** (liked) | **The loader becomes the hero**: Getty's wordmark and thumbnail ribbon turn into the header and the artwork field; here the printed cable header is drawn by the same shader that then floods and resolves into the hero field, so nothing is swapped. One serious sentence per screen, crisp black-on-light type, Lenis scroll with scrubbed ScrollTrigger (the field drifts with scroll). |
| **Floema** (rejected; read for what to avoid) | Floema's "image cloud round one centred line" was rejected for being pale, soft and catalogue-like with pill buttons. Avoided: no pale grey ground (the hero is ink with cream dither; the paper has full-black ink), no faded depth tiles, no pills, no photo-with-overlay sections. |
| **NOT-LIKED-COMMON.md** | The liked loaders *build* something in lines; rejected ones wait or fade. The loader here prints a message (it carries facts: sender, priority, host, dates TBA) and draws contour lines. No blur, dissolve or glow anywhere: every transition is either an ordered-dither threshold sweep (binary per block), a hard-edged bar sliding off, or characters printing. Heavy display weight (Sofia Sans Extra Condensed 800–900). |
| **Paper Shaders** (design-resources, 3D/WebGL) | The pixelised-UV + Bayer-matrix lookup pattern from its `dithering` shader. Its `ShaderMount` is not used (see LIBRARY.md). |
| **Teleprinter conventions** | `ZCZC` start-of-message and `NNNN` end-of-message marks, FROM / TO / PRIORITY / SUBJ header fields, 5×7 dot glyphs, continuous tractor-feed paper with sprocket holes. |

## The shader (one full-screen WebGL2 canvas, hero only)
- **Rendered at block resolution:** the canvas has one texel per dither block (3 CSS px on desktop, 2 CSS px on phones, rounded to whole device pixels, DPR capped at 2) and is scaled up with `image-rendering: pixelated`, so every block is a hard square and the dither is pixel-snapped by construction. `antialias: false`, `alpha: false`.
- **Exactly two colours out:** every texel is ink `#0B0B0A` or paper `#E9E4D8`; tone → 8×8 Bayer threshold → one of the two.
- **Field:** domain-warped fBm simplex noise (two warp fBms feed a third), drifting with time and scroll; plus 1-texel isolines (`fwidth` at block resolution) as the line layer.
- **Lens:** metaball sum of 14 trail points, edge wobbled by noise, hard `step` at 1.0, plus a 1-texel outline ring further out. Inside: paper ground, ink dither of the field, and the second layer.
- **Second layer:** a texture drawn at block resolution with the motto "DIPLOMACY AROUND US" (Sofia Sans Extra Condensed 900, thresholded) and the Dubai coordinates in the 5×7 dot font.
- **Loader in the same shader:** a 5×7 dot-matrix bitmap texture (per-dot print order in G/B), revealed by a `print` uniform, with a block cursor; then `flood` (ordered dissolve to full paper outward from the text, text inverted as the flood passes) and `resolve` (the field emerges top to bottom).
- Paused when the hero is off-screen or the tab is hidden.

## Palette tokens
| Token | Hex | Use |
|---|---|---|
| `--ink` | #0B0B0A | page ground, nav, dither dark, ink on paper, redaction bars |
| `--paper` | #E9E4D8 | dither light, the tractor-feed paper, text on ink |
| `--signal` | #E8461E | stamps only (PRIORITY, ACTION, END) and the active-row marker |
| `--host` | #600E0E | IHS maroon: the host mark and host lines |
| `--rule-ink` | #8E8A80 | opaque mid tone for hairlines and secondary text on ink (about 5.7:1 on ink) |
| `--rule-paper` | #57544D | opaque secondary text on paper (about 5.9:1 on paper) |
Gold #FFB606 is not used (no honours on the homepage). No alpha anywhere; the two derived greys are opaque.

## Type
- **Headlines:** Sofia Sans Extra Condensed Variable (Fontsource, OFL), 800–900, uppercase, tight leading. Not used by any other build.
- **Cables, labels, body:** Courier Prime 400/700 (Fontsource, OFL): a typewriter face, as on real cables. Plain zero.
- **Dot-matrix:** my own 5×7 bitmap glyphs (A–Z, 0–9, punctuation), drawn only inside the shader.

## Sections (each one a numbered cable on the paper strip)
0. **Hero:** dither field + lens; cable header block (FROM / TO / PRIORITY stamp / HOST / DATES redacted); "DXB MUN 2027" in the condensed face; Register and "Read the cables".
1. **CABLE 01 · About:** "Diplomacy around us." Fields: event, kind, city, host, dates (redacted, TBA), venue (redacted, TBA); the stats as plain fields (19 committees, 3 days, 6 committee sessions).
2. **CABLE 02 · Committees:** a dossier index of 19 files; opening one prints its file by teletype (code, full name, agenda TBA). Arrow keys move between files.
3. **CABLE 03 · Schedule:** Day 1 / 2 / 3 keys; the day's log prints line by line. Dates redacted, TBA.
4. **CABLE 04 · Register:** "Request credentials." A delegate pass form with the host strip; Register and Sign in go to the portal.
5. **CABLE 05 · Wellness:** "Quick reset" as a typed checklist (shared `useWellness`).
6. **CABLE 06 · Resources:** Annex A, Rules of procedure (link TBA).
7. **CABLE 07 · Contact:** email, Instagram (both TBA), host, city; `NNNN` end of transmission.

Nav: fixed ink bar, all 7 sections, the active one inverted (paper block, ink text). Phones: a full-screen ink menu whose items print in.
