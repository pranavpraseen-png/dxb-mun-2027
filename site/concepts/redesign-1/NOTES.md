# Redesign 1: "The Assembly"

**Idea in one line:** the whole homepage is one real-time 3D flight. An on-air slate opens the broadcast, then the camera leaves deep space, lands on the globe, dives into Dubai, comes out of the haze inside an abstract assembly hall, and visits the committee nameplates, the rostrum screen, the chair's dais and finally an aerial view, while short resolution clauses key on at each camera stop.

## Page structure (new, not the Merged layout)
One fixed WebGL stage under the page. The page itself is only seven empty "stop" spacers plus a short footer, so the scrollbar drives the camera:

| Stop | Nav | Camera | Overlay (resolution clauses) |
|---|---|---|---|
| 0 Slate | Home | far out in space, the globe small among the stars | on-air slate: split-flap "DXB MUN 2027", slate fields, CTA |
| 1 Globe | About | the globe turning toward Dubai | *Hosted by* INDIAN HIGH SCHOOL · *Guided by* DIPLOMACY AROUND US |
| 2 Dubai | (About) | close on Dubai, a gold beam rising | *Convenes in* DUBAI · dates and venue to be announced |
| 3 Hall | Committees | from the dais, 19 nameplates in three curved rows | *Convenes* 19 COMMITTEES · the picked plate's full name |
| 4 Rostrum | Schedule | facing the back screen, which shows the picked day | *Meets for* 3 DAYS · 6 SESSIONS · day tabs |
| 5 Dais | Timer, Wellness, Resources | close on the chair's desk clock | *Provides* THE FLOOR TIMER · a working timer, quick reset, resources |
| 6 Aerial | Contact | high above the open hall | *Invites you to* REGISTER · contact roll |

## References and the exact technique taken from each
- **Igloo Inc (Site of the Year 2024):** a 3D world navigated only by plain scrolling. Taken: scroll position maps to a camera parameter along keyframed stops (dwell, then travel), with a damped camera so a fast scroll still reads as a flight. Space, then the globe, then the hall, in one continuous scene.
- **Lusion v3 (Site of the Year 2023):** real-time 3D with physics-driven motion. Taken: every nameplate leans toward the cursor (spring), and the camera has a small pointer parallax. A flick gives a placard angular velocity that decays (inertia), then a spring brings it back to face the dais.
- **Active Theory (agency):** each section is a real-time environment, not a flat block. Taken: no section has its own flat background; every nav destination is a camera pose in the same lit scene (hall, rostrum screen, dais clock, aerial).
- **Slosh Seltzer (Active Theory, product):** direct manipulation of one 3D object. Taken: drag a nameplate to spin it like the can; a tap picks it, and it rises and its committee keys on in the overlay. The back screen and the dais clock are live textures driven by the UI (picked day, running timer).
- **Messenger (abeto, Site of the Year 2025):** calm, game-like transitions. Taken: the space-to-hall change is a fog dive (the camera flies down the Dubai beam into haze, the world swaps inside the haze, the hall clears out of it) instead of a cut; plus a game-style flight-path map on the right edge that shows where the camera is and jumps to any stop.
- **Broadcast opening (kept from the owner's favourite):** the first screen is an on-air slate (tally light, running timecode, slate fields, split-flap title). Scrolling snaps the slate shut to a line before the camera rolls.

## Techniques by library
- three + @react-three/fiber + @react-three/drei: the scene, drei `Stars` and `useCursor`. The Dubai tag is a plain DOM label projected from the 3D point each frame (drei `Html` raised a React unmount error).
- No post-processing anywhere. A desktop bloom pass (three's UnrealBloomPass) washed the lit hall out to grey-white at the Committees stop and cost several extra full-screen render targets, so it was removed.
- The scroll-to-stop driver (`driver.ts`) runs on the GSAP ticker, not inside the WebGL frame loop, so the clauses, nav, flight map and veil keep working if WebGL is slow, never starts, or dies.
- GSAP ScrollTrigger: measures the stop spacers on refresh and scrubs the slate exit. Lenis (shared `useSmoothScroll`) for the weighted scroll; nav jumps go through Lenis so the camera flies between stops.
- Text and UI from the design library (see LIBRARY.md): React Bits SplitFlapText, Motion Primitives TextEffect and Magnetic, Animate UI RollingText, Magic UI Marquee, coss ui Button, Menu, Sheet, Tabs, Checkbox and Badge.

## Phone (390 px)
- A lighter scene: fewer globe dots, lower sphere segments, fewer stars, smaller nameplate textures, device pixel ratio capped at 1.5, no antialias and no post-processing.
- Camera keys are re-framed for a tall screen (the 3D sits in the top half, the clauses in the bottom half).
- The canvas uses `touch-action: pan-y`: vertical swipes scroll the page (and fly the camera), horizontal swipes on a nameplate spin it.

## When WebGL dies
`webglcontextlost` is caught (default prevented, frame loop stopped) and the page switches to a flat CSS backdrop (stars and a faint globe) under the same overlays; `webglcontextrestored` remounts the scene. An error boundary does the same if the scene throws. The canvas also stops rendering when the page is scrolled past or the tab is hidden. Not tested by actually forcing a context loss.

## Still / reduced motion
`?still` or `prefers-reduced-motion`: no Lenis and no scroll camera. One renderer draws a poster of every stop once, then is released; each section becomes a normal block with its poster behind its clauses.

## Facts
Only `src/data/conference.ts`. Unknown values (dates, venue, email, Instagram) read "To be announced". Links come from `links.ts` (copied from `concepts/final/links.ts`).

## Dubai Dusk + Official Record pass (2026-11-05)
- Colours: the Dusk tokens live once in `assembly.css` (`:root`) and once in `theme.ts` (`DUSK`, `SCENE`) for three.js and the canvas textures. UN blue is gone; buttons are sand; terracotta for verbs, rules and focus; maroon, gold and cream for the host.
- Clarity: dpr `[1, 2]` everywhere; no backdrop blur, glow, soft shadows or alpha washes. The translucent text scrims are now opaque ground rails with a 1px line; the globe's additive atmosphere halo is removed; drei `<Stars>` (soft sprites) is replaced with hard-edged points; land dots have a 1-device-pixel edge; the Dubai beam is a solid line with a sharp sand dash.
- Text effect: the blur presets are deleted from `ui/text-effect.tsx`; clauses use `slide`. The split-flap board is flat (no gradients, shadows or brightness filters).
