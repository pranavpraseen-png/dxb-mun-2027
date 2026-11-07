# Alt 4 · library and credits

Everything below was already installed in `site/node_modules`. **No package was installed** for this build, and
`package.json` was not touched.

| Piece | From | How it is used |
|---|---|---|
| React Three Fiber (`@react-three/fiber` 9) | design-resources › 3D & WebGL | `Hall.tsx`: the one fixed canvas, `useFrame`, `useThree`, `dpr={[1, 2]}`, `flat` (exact hex colours), `frameloop="never"` while the tab is hidden, pointer events on the instanced seats (`instanceId` → committee block) |
| three.js `InstancedMesh` + `ShaderMaterial` | three.js core (MIT), design-resources › 3D & WebGL | 193 seats in one draw call, plus the dais furniture in a second one. A small flat shader shades faces by normal in three fixed steps and draws a 1.1-device-px outline on every face from `fwidth(uv)`, so the line layer moves with the springs and stays crisp at any DPR |
| three.js `LineSegments2` / `LineMaterial` (`three/examples/jsm/lines`) | three.js examples (MIT) | `lines.tsx`: the floor plan, block outlines, degree ruler, wall joints, speakers' board, gold emblem and dais clock. Widths are in CSS px, colours are opaque, and lines draw in via `instanceCount` |
| `mergeGeometries` (`three/examples/jsm/utils/BufferGeometryUtils`) | three.js examples (MIT) | one seat = desk block + chair back |
| `CatmullRomCurve3` (centripetal) | three.js core | the camera path through the 8 section stations |
| GSAP | design-resources › Motion | the phone menu's hard clip-path wipe and its item rise |
| Lenis via `useSmoothScroll` / `scrollToSection` | `src/shared/scroll.ts` (shared) | page scroll feel and nav jumps; it starts only after the opening |
| `isStill()`, `useWellness()` | `src/shared/hooks.ts` (shared) | calm page for `?still` and reduced motion; the wellness check-in |
| `brand` slot | `src/shared/brand.ts` (shared) | type-only wordmark until the new logo arrives |
| Public Sans Variable (`@fontsource-variable/public-sans/wght.css`) | Fontsource (OFL), USWDS | wordmark, headings, body and every figure (plain zero) |
| JetBrains Mono Variable (`@fontsource-variable/jetbrains-mono/wght.css`) | Fontsource (OFL) | labels, nav, pins |
| `links.ts` | copied from `concepts/alt-3/links.ts` (comment updated) | Register / Sign in go to `portal + '#/now'` |

## Written here (techniques credited to the references, code my own)
- **Seat springs** (`Hall.tsx` `Seats`): one damped spring per seat (k 170, c 15). The target is the cursor's
  distance on a plane at y 1, plus the chosen committee block and the register seat. This is the Lusion-style
  physical response.
- **Scroll → camera** (`Page.tsx` scroll listener, `Hall.tsx` `Rig`): the section offsets give a continuous station
  value, eased with smootherstep inside each gap and followed with an exponential damp. This is the Igloo /
  Iventions continuous flight, on a real page scroll.
- **Opening** (`store.ts` clock, `Hall.tsx`, `Page.tsx` `Loader`): the plan draws, then the seat footprints, then
  the seats rise row by row with a small overshoot while the camera descends from directly above. The dais rises,
  the emblem draws and the slab and wordmark wipe in with a hard clip. The gauge counts seats risen (000–100) and
  tiers filled. It is seekable through `window.__a4` for screenshots.
- **Projected labels** (`labels.ts`): whole-pixel HTML labels, gated to their station, hidden when they touch an
  opaque panel (`data-ko`).
- **Calm drawings** (`Plan.tsx`): the same `layout.ts` data as an SVG floor plan and an SVG dial.

## Considered and rejected
- **drei** `<Html>`, `<Edges>`, `<Instances>`: `<Html>` writes subpixel transforms (soft text) and `<Edges>` would add
  one line object per seat (193 extra draws). The shader outline does both jobs in one pass.
- **Postprocessing outline / SSAO**: soft, glow-like and heavy in software WebGL. It also breaks the crisp rule.
- **NumberFlow** for the gauge: the count changes every frame during the opening, and its digit roll would read
  as a slot machine. A plain text write is crisper.
- **coss ui / shadcn / Base UI** tabs and toggles: the page has only buttons, links, one tab row and three check
  rows, all styled as square hairline controls. A kit would bring rounded pills and soft focus rings that fight
  the institutional look.
- **Bricolage Grotesque** (used by Chamber and likely by Alt 5), **IBM Plex Mono** (likely Alt 6), **Geist Mono**
  (Night Lab; also has a slashed zero), **Mona Sans** and **Inter Tight** (spec).
