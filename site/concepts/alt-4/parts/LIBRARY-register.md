# Library: register B and register C

Catalogue: `C:\Users\praseen\.claude\skills\design-resources\by-category\ui-component-libraries.md` (Base UI). Everything used is already installed in `site/package.json`.

| Piece | Source | Used in | How |
|---|---|---|---|
| Field (Root, Label, Control) | Base UI (`@base-ui/react/field`) | register-b | The "Name on the pass" input, labelled. |
| QRCodeSVG | `qrcode.react` (installed) | register-b | The code on the pass, encoding `links.register` resolved to an absolute URL so a phone camera can open it. Hard black on paper, `marginSize={0}`, level M. |
| Bus `emit('tap')` | `concepts/alt-4/bus.ts` | both | The small gavel: on the Register CTA (B and C), and in C also when the seal stamps on. |
| Canvas 2D + Pointer Events | platform | register-c | The signature pad: pointer capture, coalesced events, DPR-aware, a hard 2px line. It is never sent or stored. |
| Web Animations API | platform | register-c | The two-frame impact on the document when the seal lands (`steps(4)`), the same frame as the knock. |

Hand-written instead of a library:
- **Tilt (B)**: one rAF loop, `rotateX/rotateY` from the pointer plus a damped `rotateZ` swing kicked by each key; idle when settled; off under `?still` / reduced motion and on touch. No glare layer, no shadow (crisp rule).
- **Seal (C)**: an SVG ring with its legend on a `textPath` and a gavel, stamped with a CSS keyframe (scale 1.9 → 1, rotate -26° → -12°).

Considered and rejected:
- **signature_pad / react-signature-canvas**: not installed, and 60 lines of pointer code do the job with a harder, crisper line.
- **vanilla-tilt / react-parallax-tilt**: they add glare gradients by default, which the crisp rule bans.
