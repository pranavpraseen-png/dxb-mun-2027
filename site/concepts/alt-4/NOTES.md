# Alt 4 · Assembly

**The idea in one line:** the homepage is a real-time General Assembly hall. Seats are arranged in curved,
raked tiers round a podium. They are drawn as crisp instanced geometry with a hairline layer, and the camera moves
through the hall as you scroll the page.

**Preview:** http://127.0.0.1:5320/concepts/alt-4/ · calm version: `?still` (also used for reduced motion, no WebGL
and any WebGL crash).

## References and the exact techniques borrowed
| Reference | Technique used here | Not taken |
|---|---|---|
| **Igloo Inc** (dissect `igloo-inc.md`) | A full-bleed canvas carries the content, and the scroll drives one continuous camera flight between scenes, with no cuts. A small camera turn follows the cursor. Mono telemetry labels sit on hairlines ("ROW 04", angle ticks). The loader *builds* the object in lines first (a line plan), then fills it. | Fog, the snow scene, MSDF text, virtual scroll (a real page scroll is used here, so the nav and anchors work), the scramble decode (Alt 3 uses it) |
| **Lusion v3 / Oryzo** (dissect `oryzo-ai.md`) | The scene answers the cursor physically. Each seat near the pointer lifts on its own damped spring (stiffness 170, damping 15, so it settles with one small overshoot). CAD-style construction lines: a degree ruler round the outer tier and dimension ticks. | Orange Bézier handles, the dotted pill menu (Alt 3 took it), any soft light |
| **Iventions** (Three.js + GSAP event site) | Real page sections scroll over a fixed WebGL stage. Each section has its own camera station, and the page scroll is mapped onto a Catmull-Rom path through those stations, so the camera moves *while* you read. GSAP handles the menu and the hard-edged clip reveals. | Their content, assets and colours |
| **NOT-LIKED-COMMON.md** | The rejected profile is avoided. The ground is a deep navy (no pale screen). The 3D always has a line layer: every seat face is outlined in the fragment shader and the floor plan is drawn in hairlines. Display type is heavy (800). | Blur, dissolve, glow, alpha, gradients |

## What is new here (not reused from Night Lab or Alts 1–3)
- **Loader, "Seating the hall":**
  - the camera starts directly above the hall;
  - the floor plan draws itself in hairlines (tier arcs, aisles, the degree ruler, the block outlines);
  - the seats then rise tier by tier, front row first, each on a short overshoot;
  - the camera descends into the hall meanwhile and ends on the podium, where the gold emblem draws and the
    wordmark is wiped in with a hard clip.
  - The loader UI is a seven-tick tier gauge and a 000–100 count. It is not a typed loader, an ASCII shuffle or a
    point web.
- **Hero:** a poster-weight wordmark slab across the foot of the screen; the hall and podium fill the rest.
- **Sections are places in the hall:**
  - About: a low side view across the tiers.
  - Committees: a high view of the 19 seat blocks; hover or tap a block (or its key) and its seats light UN blue and lift.
  - Schedule: the dais clock, with the day's slots drawn as arcs on a 12-hour dial and a hand that springs to the
    chosen slot.
  - Register ("Take your seat"): the camera drops to one seat, which lights orange and lifts.
  - Wellness: a wide, slow side view.
  - Resources: the view from the rostrum out to the tiers.
  - Contact: the plan from directly above, the opening's frame again.

## Palette (tokens in `assembly.css`, mirrored in `layout.ts`)
| Token | Hex | Role |
|---|---|---|
| `--ground` | #050B16 | page and canvas ground (spec) |
| `--panel` | #0A1424 | opaque text panels |
| `--rule` | #1C3250 | hairlines, panel borders |
| `--seat` | #0F2340 | seat fill (top face; side faces are a flat 70 % of it) |
| `--seat-edge` | #3D6491 | seat outline drawn in the shader |
| `--wire` | #2A4A70 | floor-plan hairlines |
| `--mute` | #9FB2CB | secondary text, 8.5:1 on the ground |
| `--ink` | #FFFFFF | text (spec) |
| `--un` | #009EDB | the action colour: active nav, lit committee block, chosen slot, buttons (spec) |
| `--take` | #F2711C | one seat only: "take your seat" (spec says orange) |
| `--maroon` / `--cream` | #600E0E / #DCBDAB | the host mark only (IHS) |
| `--gold` | #FFB606 | the podium emblem only |

All flat and opaque. Text never sits on the 3D: every text block is an opaque panel, and 3D labels are hidden
when they would touch a panel.

## Type
- **Public Sans Variable** (`@fontsource-variable/public-sans`, OFL, already installed). It is a neutral, institutional
  grotesk (USWDS) and is not used by Night Lab or Alts 1–3. It sets the wordmark (800, tight), headings (700) and body (400).
  It also sets every figure, because its zero is plain.
- **JetBrains Mono Variable** (`@fontsource-variable/jetbrains-mono`, OFL, already installed) sets the labels,
  UPPERCASE, tracked +0.06em. Digits inside mono labels are switched to Public Sans figures (`.fig`), so no zero
  is ever slashed or dotted.
- Avoided: Mona Sans and Inter Tight (spec), Geist Mono (Night Lab), Bricolage (Chamber).

## Section list (top nav reaches each in one click)
0. Hero (`#home`)
1. About (`#about`)
2. Committees (`#committees`): 19-key seating chart plus the 3D blocks
3. Schedule (`#schedule`): day tabs, slot list and the dais clock
4. Register (`#register`): Take your seat, with Register and Sign in going to the portal
5. Wellness (`#wellness`): the shared `useWellness` check-in
6. Resources (`#resources`)
7. Contact (`#contact`) and the footer

## Honest list of what is untested or weak (2026-11-06)
- Tested only in headless Chrome with SwiftShader (software WebGL) at 1440×900 (DPR 1) and 390×844 (DPR 2).
  It was not tested on a real GPU, Safari, Firefox or a real phone, so the real frame rate is unknown.
- The cursor lift was checked numerically (`window.__a4.lift()` read 0.416 of a 0.42 maximum). It is barely
  visible in a still frame; motion is where it shows.
- Phone touch: a finger lifts seats only while it is down on an open canvas area. Real touch scrolling over the
  canvas (`touch-action: pan-y`) was not tested on a device.
- The phone loader frames the plan mid-screen, with an empty band above the gauge.
- Section heights are 100svh each (8 screens at 1440). The nav reaches every section in one click.
- `prefers-reduced-motion` itself was not emulated. It goes through the shared `isStill()`, and `?still` was
  screenshotted.

## Motion rules
- Lenis through `src/shared/scroll.ts`, and GSAP for the menu wipe and the hero reveal.
- Camera: the scroll gives a station position `s`, eased inside each gap with smootherstep, on a Catmull-Rom path
  through the 8 stations. It is then damped (critically, about 0.25 s) so it has weight.
- One cursor spring per seat. A drag/hover never moves text.
- `?still` / reduced motion / no WebGL give the calm page: the same sections with a static SVG floor plan and an
  SVG dial, and no motion.
