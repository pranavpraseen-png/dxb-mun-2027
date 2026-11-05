# Alt 3 · library and credits

Everything below was already installed in `site/node_modules`. Nothing new was installed for this build.

| Piece | From | Where it is used |
|---|---|---|
| React Three Fiber (`@react-three/fiber` 9) | 3D / WebGL category of the design-resources library | `Stage.tsx`: the one canvas, `useFrame`, `useThree`, `dpr={[1, 2]}`, `flat`, `frameloop` pause |
| three.js `LineSegments2`, `LineSegmentsGeometry`, `LineMaterial` (`three/examples/jsm/lines`) | three.js examples (MIT) | `lines.tsx`: every hairline, 1 CSS px wide at any DPR, opaque colour, drawn in by `instanceCount` |
| three.js `Points`, `PointsMaterial`, `CatmullRomCurve3` | three.js core (MIT) | `World.tsx` numbered points and land dots; `layout.ts` the single camera path |
| Land mask (256 × 128, 1 bit) | the world map bundled in **cobe** (MIT), extracted by the `final` build; copied (not imported) into `landmask.ts` | land dots on the globe |
| Mona Sans (`@fontsource-variable/mona-sans`, `wdth.css`) | GitHub, OFL | display and text |
| Geist Mono (`@fontsource-variable/geist-mono`) | Vercel, OFL | every label |
| Instrument Serif italic (`@fontsource/instrument-serif/400-italic.css`) | OFL | one accent word per scene |
| `isStill()` | `src/shared/hooks.ts` (shared, not another build) | `?still` and `prefers-reduced-motion` → calm page |
| `links.ts` | copied from `concepts/final/links.ts`, comment updated | Register / Sign in → `portal + '#/now'` |

## Written here (techniques credited to the reference sites, code my own)
- **Scramble decode** (`Scramble.tsx`): Igloo Inc's character decode, left to right, with an invisible ghost of the real text holding the space and an `sr` copy for screen readers.
- **Numbered point web loader** (`World.tsx` `Plexus`, `Chrome.tsx` `Loader`): Igloo's ASCII → plexus → wireframe sequence.
- **Projected HTML labels** (`labels.ts`): a small replacement for drei's `<Html>` that rounds to whole pixels, hides labels behind the globe and keeps them inside the frame.
- **Easing** (`store.ts` `ease`): the BLUEPRINT curve `cubic-bezier(0.65,0.05,0,1)` solved numerically, so JS flights and CSS transitions share the one curve.
- **Menu pills** (dotted "• MENU", solid "• CLOSE"): Oryzo; struck-through current item: Lando Norris.

No coss ui / shadcn component is used: the page has only buttons, links and one tab row, all styled as hairline mono controls to match the corners; pulling a component kit in for those would add soft shadows and alpha text that break the clarity checklist (the same reason the board skipped coss ui's segmented control).
