# DXB MUN theme: Dubai Dusk + Official Record

**This is the owner's explicit pick, 2026-11-05, word for word: "Dusk + Official Record".**
Every homepage redesign uses it now, and later the dashboards. It replaces all earlier colours and fonts.

Source of truth: `concepts/board/palettes.ts` (id `dusk`) and `concepts/board/fonts.ts` (id `record`). The board's `NOTES.md` has the method and the full clarity checklist.

## Colours: Dubai Dusk
The Gulf after sunset: deep sea-blue sky, a terracotta last light, desert sand and limestone. All tokens are opaque; never add alpha.

| Token | OKLCH | Hex | Use |
|---|---|---|---|
| ground | oklch(19% 0.028 225) | #05161d | page background |
| surface | oklch(23% 0.030 224) | #0b2027 | panels, nav bar (opaque) |
| raised | oklch(28% 0.032 222) | #162c34 | cards, inputs |
| ink | oklch(95% 0.016 80) | #f4eee3 | body text |
| muted | oklch(79.5% 0.030 70) | #c9b9a8 | secondary text |
| line | oklch(36% 0.035 224) | #28414b | 1px hairlines |
| action | oklch(86% 0.055 78) | #e5cda9 | buttons: the ONE action colour (sand) |
| actionInk | oklch(19% 0.028 225) | #05161d | text on buttons |
| accent | oklch(71% 0.115 44) | #dd8964 | terracotta: clause verbs, rules, focus |
| maroon | oklch(38% 0.100 25) | #6e2826 | IHS host strip |
| gold | oklch(80% 0.130 80) | #e9b452 | awards and small host rule only |
| cream | oklch(85% 0.040 62) | #e2c9b4 | nameplates, host text on maroon |

**Rules for using the colours:**
- **Buttons are sand.** The owner picked Dusk knowing its button is sand, not UN blue, so the old "UN blue is the only action colour" rule no longer applies.
- **UN blue (#009EDB) is no longer used** as a page colour. Use it only if a real UN emblem or flag image needs it.
- **Nameplates** use a sand fill (action) with actionInk text.
- **Hover states** change to another opaque token, for example action → cream. Never fade the opacity.
- **Contrast** (APCA Lc): body 96.1, secondary 65.3, button 77.9, accent verb 49.3, nameplate 77.9. Keep each pairing as given; don't put muted text on raised surfaces at small sizes.

## Fonts: Official Record
All fonts are SIL OFL 1.1 and already installed from @fontsource.

**Imports:**
```ts
import '@fontsource-variable/source-serif-4/opsz.css';
import '@fontsource-variable/source-serif-4/opsz-italic.css';
import '@fontsource-variable/public-sans';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource-variable/noto-naskh-arabic'; // only for the one word دبي, used sparingly
```

**Families:**
- **Display and headlines:** `'Source Serif 4 Variable', Georgia, serif`. Weight 600 for headlines, tracking -0.02em at display sizes, `font-optical-sizing: auto`. The italic is for the motto and clause verbs ("*Convenes*").
- **Text, UI and nav:** `'Public Sans Variable', system-ui, sans-serif`. Weight 400 for text, 500–600 for labels.
- **Mono** (committee codes, timers, data): `'IBM Plex Mono', ui-monospace, monospace`, weights 400 and 500.
- **Remove every other font** from the redesign: Fraunces, Instrument, Geist, Playfair, Anton, Oswald, Barlow and the rest.

## Clarity: the owner wants it "irl resolution… that clearness u see in good websites"
This list is in `concepts/board/NOTES.md`, under "Clarity checklist". It is mandatory.
- **No blur or haze:** no `backdrop-filter`, `filter: blur`, glow, soft `box-shadow`, noise, grain or bloom, and no rgba washes over text. Nav bars are opaque `surface` with a 1px `line` bottom border.
- **Text:** `-webkit-font-smoothing: antialiased` on dark, `text-rendering: optimizeLegibility` and `font-synthesis: none`. Font sizes land on whole pixels at 390 and 1440.
- **WebGL and canvas:**
  - R3F: `dpr={[1, 2]}` on every device, so no 1.5 or 1.75 cap. If the phone needs to be lighter, cut geometry or effects, not resolution.
  - Raw three, cobe and canvas: pixel ratio `Math.min(devicePixelRatio, 2)`.
  - Never stretch a canvas past its backing size.
- **Images:** `images/hero-photo.jpg` is only 2000×1333, so keep it at ≤1000 CSS px wide, or crop and frame it. Never show it full-bleed at 1440. Raster images need `srcset`; prefer SVG.
- **Motion stays:** the owner wants top-tier motion. Animate with transform, opacity and clip-path, but no motion blur and no blur-in text effects. Replace "blur to sharp" reveals with clip or translate reveals.

## What does NOT change
Each redesign keeps its own layout, structure, motion idea and content. This pass changes only colours, fonts and clarity. Facts stay as they are; no new claims.
