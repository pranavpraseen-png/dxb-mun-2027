# Motion moves: notes

Page: http://127.0.0.1:5320/concepts/moves/ · Picker group "Motion moves (tick what you like)", id `moves`.
Files: `moves.ts` (catalogue data), `kit.tsx` (likes store, Like toggle, demo frame), one file per demo, `moves.css`, `main.tsx`, `shots.mjs`.
Likes are stored in localStorage `moves.likes` as an ordered array of ids. The fixed "Your picks" bar numbers them; "Copy list" copies them as text.

## Brief
The owner wants "insane clean" motion: restraint plus a few world-class moves. It must stay serious and UN-like, with no AI look (no glow blobs, purple gradients or particle soup) and no blur, glow or grain (see the clarity checklist in `concepts/board/NOTES.md`). The theme is Dubai Dusk + Official Record (`site/THEME.md`). Reference websites are another agent's job (`concepts/refs/`); this page covers libraries, effects and demos only.

## Sources looked at
- **Design library** (`design-resources/by-category/`):
  - `motion-animation-libraries.md`: GSAP, Motion, NumberFlow, Theatre.js, Rive and Lottie;
  - `3d-webgl.md`: three, R3F, drei, Paper Shaders, Spline, Book of Shaders and Shaderfrog;
  - `ui-component-libraries.md`: React Bits, Motion Primitives, Animate UI, Magic UI, Cult UI, Smooth UI and Aceternity;
  - `finds.md`: mostly X posts. Only the "restraint" and "text shrinks on scroll" items are relevant, and as ideas only.
- **GSAP:**
  - Plugin docs: SplitText, Flip, DrawSVG, MorphSVG, ScrollSmoother, ScrambleText, Inertia, Observer and ScrollTrigger.
  - Showcase and licensing pages: GSAP has been under the Standard "no charge" licence since 30 Apr 2025. All plugins are free for commercial use; the only bar is no-code builders that compete with Webflow.
- **Codrops**, opened in a browser because the site returns 403 to curl and WebFetch:
  - 2025/05/14: 5 demos using free GSAP plugins, including the SplitText line mask;
  - 2025/06/05: WebGL text;
  - 2026/03/02: Sticky Grid;
  - 2026/03/11: SVG mask transitions;
  - 2026/05/21: scroll-driven SVG map;
  - 2026/07/30: Flip gallery;
  - 2026/10/08: parallel page transitions;
  - 2019/10/21: image distortion hovers.
- **Other libraries:**
  - Lenis (MIT, pushed 2026-10-29);
  - OGL examples (Mouse Flowmap, Post Fluid Distortion; Unlicense; not installed);
  - Theatre.js (core Apache-2.0, studio AGPL-3.0, npm 0.7.2);
  - view-transitions.chrome.dev and the Chrome docs (same-document View Transitions are Baseline since Firefox 144, Oct 2025);
  - scroll-driven-animations.style.
- **Paid tools:**
  - Rive: runtimes MIT; free exports play a splash; Cadet is $9 per seat per month.
  - Spline: the free plan watermarks exports; Hobby is $15 per month.
  - Unicorn Studio: free is non-commercial with branding; Legend is $20 per month. This came from a search snippet of its pricing page, because the page itself did not render.
- **Licences checked:**
  - from GitHub, npm or package.json: Motion Primitives MIT, Magic UI MIT, Cult UI MIT, Smooth UI MIT, motion MIT, cobe MIT, NumberFlow MIT, drei MIT;
  - React Bits and Animate UI: MIT + Commons Clause;
  - Paper Shaders: Apache-2.0.

## The 8 live demos (installed packages only)
1. **Broadcast slate:** GSAP ScrambleTextPlugin decodes the committee codes, and each name rises out of a clip. The slate auto-advances only while it's on screen.
2. **Globe to Dubai:** cobe plus a ScrollTrigger scrub inside a sticky track.
   - cobe has no render loop, so it draws only when the timeline updates.
   - glowColor is set to the ground colour, so there's no rim glow.
3. **Clauses and counter:**
   - SplitText `mask: 'lines'` and `autoSplit` give hard clips that re-split on resize and font load.
   - NumberFlow counters are scrubbed by scroll. `--number-flow-mask-*` is set to 0, so the digits use a hard clip instead of a soft fade.
4. **Nameplate Flip:** 19 plates move from a stack to the grid in one `Flip.from`.
   - The grid height is reserved, so nothing below jumps.
   - It plays once on enter; a button replays it.
5. **Dusk sky:**
   - one fragment shader on a screen quad in R3F, with `dpr={[1, 2]}`, `frameloop="demand"` and `flat linear`;
   - the sun edge uses an fwidth antialias;
   - the sun's reflection is drawn as crisp rules;
   - a vector skyline sits on top.
6. **Photo stretch:** pointer velocity smears the texture locally, then decays.
   - At rest the shader is the identity, so the 2000 px photo is shown at ≤1000 CSS px and 1:1 texels at dpr 2.
   - It renders on demand only.
7. **View-Transition nav:** `document.startViewTransition` slides the ink (`mv-ink`) and wipes the panel in with clip-path (`mv-panel`).
   - The root cross-fade is disabled.
   - Without the API, or with reduced motion, the tab switches instantly.
8. **Magnetic Register:** motion springs move the button and its label as two layers, and the label rolls on hover.
   - It only runs for fine pointers, so it's off on touch.
   - The hover changes the fill from action to cream, both opaque.

Lenis runs on the whole page on GSAP's ticker. It's off for reduced motion, `?still` and `?nolenis`.

## Performance and access
- Every move animates only transform, opacity, clip-path or a shader uniform.
- Off screen:
  - the WebGL demos draw nothing (they use demand frameloops, or cobe, which draws only on update);
  - the slate interval stops.
- With reduced motion or `?still`:
  - the tracks collapse and every demo shows its final state;
  - Lenis is off;
  - the magnet and View Transitions are skipped.

## Clarity
- There is no box-shadow, filter, backdrop-filter, grain or rgba anywhere in `moves.css`.
- All colours are the THEME tokens.
- Fluid type uses whole-pixel clamp endpoints at 390 and 1440.
