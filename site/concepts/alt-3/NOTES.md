# Alt 3 · One Stage

**The idea in one line:** the whole homepage is one fixed wireframe world, and one camera flies through six scenes (Globe, Dubai, Resolution, Committees, Schedule, Register) as you scroll, swipe, press keys or pick from the index.

Built 2026-11-05 while the owner was asleep ("no questions, no stopping"). Every decision below was made by me and is written down so it can be reversed.

**Preview:** http://127.0.0.1:5320/concepts/alt-3/ · calm version: `?still` · deep links: `#dubai`, `#committees` …
**Screenshots:** `site/shots/v2/alt-3/` (DPR 2), made by `node scripts/heavy.mjs "node concepts/alt-3/shots.mjs"`.

## Theme (unchanged picks)
- **C1 Night Lab:** ground #100904, surface #1C130C, ink #FAF7EF, lines #382416, one accent #DC5000; IHS maroon #600E0E and gold #FFB606 as host accents (logo mark, host clause, the pass's strip and rule, the host line).
- **T1:** Mona Sans (display and text, `wdth` axis used at 106–112 %), Geist Mono (all labels), Instrument Serif italic for exactly **one accent word per scene** ("Diplomacy", "Dubai", "resolution", "committees", "days", "delegate").

### Two derived tones (my decision)
The wireframe needs a back-row tone and the labels need a secondary text tone; #382416 alone is too dark for text (1.4:1). I added two **opaque** mixes of the existing tokens, no new hues:
- `--dim #7C6E62` = 35 % cream over the line brown (graticule, panel frames, inactive rulers);
- `--mute #ACA398` = 60 % cream over the line brown (secondary text, 8.6:1 on the ground).

## References and the exact technique taken from each
| Reference | Technique used here |
|---|---|
| **Igloo Inc** | One pinned canvas, the wheel drives a camera (no page scroll; `scrollY` stays 0). Mono text in the 4 corners. Loader: an ASCII bar shuffles, then a **numbered point web** draws, then the wireframe, then the hero. Text **decodes by scramble**. Numbered points with hairlines stay in the hero. A small cursor tilt of the camera. `//` and `//////` ASCII marks. |
| **GQ × AP Extraordinary Lab** | The world is drawn **only in hairlines** (no realistic 3D at all); archive-like documents float as line-drawn panels (the resolution clauses); black-and-white plus one accent. |
| **Oryzo (Lusion)** | The loader drawing becomes the object (the web forms round the globe, then the globe draws itself and stays). Dotted-outline "• MENU" pill and a solid "• CLOSE" pill. The Night Lab colours themselves. |
| **Lando Norris** (from BLUEPRINT) | The one easing curve `cubic-bezier(0.65,0.05,0,1)`; the current menu item is struck through in the accent. |
| **Terminal Industries** (from BLUEPRINT) | Mono call-outs on hairline leaders round Dubai. |
| **Anime.js** (from BLUEPRINT) | The schedule is a numbered ruler with a sweeping playhead. |
| **Siena** (from BLUEPRINT) | The register scene is a delegate pass with notches and a perforation. |

Avoided, per `NOT-LIKED-COMMON.md`: no realistic 3D without lines (there is no realistic 3D at all), no pale screens (ground is near-black), no blur, dissolve or glow anywhere.

## Structure
- **The stage** (`Stage.tsx`, `World.tsx`, `layout.ts`): one R3F canvas, `dpr={[1, 2]}`, `flat` (no tone mapping, so the hex colours land exactly), `frameloop="never"` while the tab is hidden. Lines are three's `LineSegments2` (1 CSS px at any DPR), points are square `Points`. The only filled mesh is the globe's occluder in the ground colour, so back-side lines are hidden crisply.
- **Scenes, in camera order:** globe at the origin → Dubai on the globe's surface (reticle, a line-drawn block patch, 3 call-outs) → 6 clause panels → 19 nameplates on one floor circle → 3 day rulers → the delegate pass. Scenes are far apart in one world; the camera follows one Catmull-Rom path through six stations, so a jump from 06 to 02 really flies past the panels (see `1440-20-flight-mid.png`).
- **Framing:** each station's distance is computed from the object's half-size and the space left by the caption (desktop: object on the right 56 %; portrait: object in the upper half). The object is shifted with `camera.setViewOffset`, so perspective stays centred on the object.
- **Labels pinned to 3D** (`labels.ts`): real HTML, projected once per frame by the rig and written as **whole-pixel** translates (no subpixel blur, no scaling). Labels hide when the globe stands in front of their point, and are clamped inside the frame on narrow screens.
- **Flights:** one tween with the one curve, 1.1 s for one scene, up to 1.9 s for long jumps. Wheel: one gesture (trackpad inertia included) = one scene. Keys: arrows, PageUp/Down, Space, Home/End, 1–6. Touch: vertical swipe > 45 px. The URL hash follows the scene and a hash on load lands there after the intro.
- **Corners:** top-left logo + "// Hosted by Indian High School"; top-right "////// Index" with all 6 scenes plus Register (on phones: Register pill + Menu pill); bottom-left Dubai coordinates + live camera coordinates; bottom-right `03 / 06` + name + 6 progress ticks + ↑ ↓ buttons.
- **Captions:** one per scene, mono kicker, Mona Sans heading with one serif word, then the facts (rows, committee picker, day tabs + slot list, register buttons). They scramble in when the camera is ~60 % of the way there.
- **Loader** (about 3.7 s, any key, tap, wheel or the "Skip intro" button skips): ASCII shuffle with a 000→100 counter (0–1.2 s) → numbered point web draws while the camera swoops down (1.2–2.4 s) → graticule, land dots, limb and Dubai draw (2.2–3.3 s) → hero text and corners decode (3.2 s+). Its clock only starts once the fonts are loaded and the canvas has drawn two frames.
- **Phone:** swipe between scenes, a full-screen opaque menu (clip-path wipe with the one curve, current item struck through in the accent, Register, Sign in, host line, "Text-only version").
- **Calm page** (`Static.tsx`): used for `prefers-reduced-motion`, `?still`, no WebGL (checked up front) and any WebGL crash (error boundary). Sticky solid nav to all 6 sections, every fact, all 19 committees with full names, all 3 days, a static SVG line globe. No motion.

## Content decisions
- Facts come only from `src/data/conference.ts`; unknown values (dates, venue, email, Instagram) read "To be announced".
- The clause wording follows the Merged page's draft resolution (Hosted by / Guided by / Convenes / Meets for / Dates / Venue).
- The Dubai "block patch" is abstract line-drawn blocks round the reticle; it does not depict any real building, so it claims nothing.
- Committees show the abbreviation on every plate; the full name shows in the caption for the plate you point at, focus or tap (or step with ← →). The caption always shows one full name, IPMC first.
- Register and Sign in both go to `portal + '#/now'` (copied `links.ts`).

## Other decisions
- No Tailwind classes: one plain CSS file with tokens; nothing here needed utilities.
- **Nothing is ever drawn behind text** (coordinator fix, 2026-11-05): every line of every caption and corner sits on the ground colour, widened 12 px by a zero-blur `box-shadow` spread, so the web, leaders and wireframe stop cleanly round the text. Captions and corners are also keep-out zones in `labels.ts`: any 3D label whose box comes within 10 px of one is hidden for that frame.
- Text over the wireframe gets a crisp knock-out: 8 zero-blur `text-shadow` copies in the ground colour. Opaque, no blur.
- The plexus number labels show only on the globe scene; each scene's own objects show only while the camera is near them, so a resting scene is never cluttered by the next one.
- A visually hidden "Skip to the text-only version" link is the first tab stop.

## Honest list of what is untested or weak
- **Only tested in headless Chrome with SwiftShader** (software WebGL). Not on a real GPU, Safari, Firefox or a real phone. Real frame rate is unknown; SwiftShader at DPR 2 is slow, so the loader screenshots land a little later than their nominal moments.
- **Trackpad inertia** handling (one gesture = one scene) is reasoned, not tested with a real trackpad; only a single wheel event was tested.
- **Pause when hidden** is wired (`visibilitychange` → `frameloop="never"`) but not verified in a test.
- **Landscape phones** (wide but short, e.g. 844 × 390) use the desktop framing with phone corners; the schedule caption may be too tall there. Not checked. Tablets in portrait use the phone layout (not checked).
- **Screen readers:** captions and labels are real text with `sr` copies, the scene counter is `aria-live`, and the menu is a modal dialog with Escape; not tested with an actual screen reader. Focus is not trapped inside the menu.
- The `?still` / reduced-motion page is checked by screenshot only; `prefers-reduced-motion` itself was not emulated (it uses the shared `isStill()` that reads it).
- The no-WebGL path was tested with `--disable-webgl --disable-3d-apis`; a WebGL context lost mid-session is only prevented from erroring, not recovered.
- Many Mona Sans widths/weights are synthesized by the variable font, not separate files; `font-synthesis: none` is on.
