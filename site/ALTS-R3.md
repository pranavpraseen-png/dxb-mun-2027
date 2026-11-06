# Round 3 alternatives: three completely different homepages (2026-11-06)

The owner's words: "make like 3 completely different insane alts using the references n design library".
Night Lab is the live homepage (https://dxbmun-2027.vercel.app). These three are **previews only**. Never deploy, never touch
`site/deploy`, `vite.deploy.config.ts`, `scripts/deploy.mjs` or anything outside your own folder (except the one showcase
entry the lead adds afterwards).

"Completely different" means different from **each other** and from what already exists:
- Night Lab: warm near-black, wireframe globe flying into Dubai, typed loader.
- Alt 1 Terminal Paper: light paper, ink, one blue.
- Alt 2 Poster: cream, black, maroon, huge type.
- Alt 3 One Stage: one 3D camera through six scenes, point web.

Reuse no layout, loader, or signature piece from those. Each alt needs its own loader, hero, motion language, palette and type.

## Shared rules (every alt)

**Content:**
- Every fact comes from `src/data/conference.ts` (conference, stats, committees, schedule, wellness, resources, nav, tba).
- Unknown values show "To be announced" through `tba()`.
- Never invent dates, venues, prices, names or numbers.
- Short, skimmable lines. No paragraphs. Headline text alone must tell the story.

**Structure:**
- Short homepage. A full top nav reaches every section in one click: About, Committees, Schedule, Register/Pass, Wellness, Resources, Contact.
- The active section is highlighted.
- Phones get a full-screen menu.
- The 19 committees are a browsable component, not a tall stack.

**Tone:** serious, institutional, a city-wide diplomatic conference. No stickers, no candy colours, no jokey copy.
- **Host:** Indian High School. IHS maroon #600E0E and cream #DCBDAB may mark the host.
- **Gold #FFB606:** honours only.

**Crisp rule:**
- No blur, no glow, no see-through or alpha layers, no gradients-as-decoration, no soft shadows.
- WebGL renders at up to 2x DPR.

**Avoid the "AI look":**
- 3-up icon cards
- pill badges
- stat counters in glowing boxes
- floating blobs with blur
- pale low-contrast screens
- text that blurs or dissolves in
- loaders that only wait

**Motion is wanted:**
- GSAP + ScrollTrigger, and Lenis via `src/shared/scroll.ts`.
- Aim for 60fps.
- Respect `prefers-reduced-motion`: provide a calm static version, and also when `?still` is in the URL.
- Provide a no-WebGL fallback if you use WebGL.

**Library first:**
- Pick pieces from the design-resources catalogue at `C:\Users\praseen\.claude\skills\design-resources\by-category\*.md`.
- Order of preference: coss ui → shadcn/ui → Base CN; Animate UI / Motion Primitives / NumberFlow for motion; Fontsource for fonts.
- Check what is already installed in `site/package.json` first. Prefer what is installed.
- If you need a new package, it must be small, MIT/OFL, and installed with `npm install <pkg>` from `site/`. Name it in your report.
- Record every piece in your folder's `LIBRARY.md` (piece, source, how it's used, and what you considered and rejected).

**References:** award-winning sites; the bar is Awwwards Site of the Day.
- Dissections of the owner's liked references are in `site/concepts/refs/dissect/*.md`.
- What they rejected is in `NOT-LIKED-COMMON.md`. Read both.
- Before coding, write in `NOTES.md` which references you borrow from and the exact techniques. Borrow techniques, never brand assets or copy.

## Where and how

- **Folder:** `site/concepts/<id>/` with `index.html`, `main.tsx`, and a `tsconfig.json` that extends `../../tsconfig.json` (copy alt-3's).
  - Vite picks the folder up automatically.
  - Import the shared data with `@/data/conference`.
- **Dev server:** it is already running at http://127.0.0.1:5320. Do NOT start another one, and do not stop it. Your page is `http://127.0.0.1:5320/concepts/<id>/`.
- **RAM is very tight.** Run every typecheck, build or puppeteer script through the lock, from `site/`:
  - `node scripts/heavy.mjs "npx tsc --noEmit --singleThreaded"`
  - `node scripts/heavy.mjs "node concepts/<id>/shots.mjs"`
  - Never run two heavy things at once yourself.
  - Never kill processes you did not start (python, other vite servers).
- **Screenshots:** write a `shots.mjs` (model on `concepts/alt-3/shots.mjs`, puppeteer-core with the local Chrome).
  - Sizes: 1440×900 and 390×844.
  - Capture the loader at 3 moments, the hero settled, every section, and the phone menu.
  - Check for horizontal overflow and console errors.
  - Output to `site/shots/r3/<id>/` (gitignored).
- **Headless tips** (learned the hard way):
  - WebGL runs in software, so animations take longer than in real Chrome. Wait generously, or seek your timelines.
  - Expose your loader timeline on `window` and pause it via `evaluateOnNewDocument` + a property setter if you need frames.
  - Never return a GSAP object from `page.evaluate` (Puppeteer hangs serialising it). Wrap calls in `{ ...; }`.
  - Use plain `setTimeout` polling loops instead of `waitForFunction` with rAF polling.
  - Pass `protocolTimeout: 60000`.
- **Look at your own screenshots** (Read the PNGs) and fix overlaps, clipped text, overflow and empty frames before you finish. Report only what you actually ran and saw.
- **Git:** do not commit or push. The lead does that.

## The three directions

### alt-4 · Assembly (real-time 3D chamber)
**Idea:** the General Assembly hall as a real-time WebGL world. 193 delegation seats are arranged in curved tiers around a podium, drawn as crisp instanced geometry with a line layer (never realistic shading alone).
- **Opening:** the camera starts from directly above and descends into the hall as seats fill tier by tier, ending on the podium with the wordmark.
- **Scroll:** the camera moves through the hall, Igloo-Inc style:
  - the committees light up as seat blocks (hover or tap one to read it);
  - the schedule is the dais clock;
  - Register is "take your seat", where one seat lights orange.
- **Cursor:** the seats near the pointer lift slightly (Lusion-style physical response) using a spring, with no glow.
- **Palette:** institutional UN. Deep navy ground #050B16, UN blue #009EDB as the action colour, white text, IHS maroon for the host mark, gold only on the podium emblem.
- **Type:** a serious grotesk plus a mono for labels. Pick from Fontsource; avoid Mona Sans and Inter Tight, which are used elsewhere.
- **References:** Igloo Inc (scroll-navigated 3D world), Lusion v3 (physics-driven response), Iventions (Three.js + GSAP event site).

### alt-5 · Motion (kinetic type, no 3D)
**Idea:** the whole site is typography in motion, like a debate in progress.
- **Type:** giant variable-axis type (weight and width axes) that stretches and compresses with scroll velocity and cursor distance, in the style of Mat Voyce.
- **Sections:** each section is a "motion on the floor" (Motion 01: About … Motion 07: Contact), with a live vote tally (For / Against / Abstain) as the scroll indicator. The tally is built with NumberFlow and uses plain digits, not slashed zeros.
- **Transitions:** between sections, full-screen solid colour blocks wipe across, in the style of WEIMA's animated colour-block page transitions. Use opaque, hard-edged blocks.
- **Committees:** a horizontal ticker or marquee of the 19 names. Hovering one stretches it full-width and shows its agenda line.
- **Loader:** the gavel count. The words "ORDER, ORDER" compress into the wordmark, with a hard cut to the hero.
- **Palette:** pure black #000, off-white #F2EFE8, one hot signal orange #FF4D00, and IHS maroon for the host.
- **Type:** one variable family with real width and weight axes that is not Mona Sans, from Fontsource (for example Big Shoulders, Bricolage Grotesque or Anybody; check that the axes exist). Pair it with one mono.
- **References:** Mat Voyce (kinetic typography), WEIMA (colour-block page transitions), Lando Norris (modular sections, cursor-reactive hero).

### alt-6 · Dispatch (1-bit dithered cursor reveal)
**Idea:** a classified-cable or diplomatic-dispatch aesthetic, rendered as a crisp 1-bit ordered-dither (Bayer) WebGL shader.
- **Hero:** a dithered noise-flow field. The cursor (or finger) carves a fluid reveal "lens" that shows a second layer underneath: the motto and Dubai coordinates. This is Lando Norris's cursor-reactive reveal done with hard 1-bit pixels instead of soft blobs. It must stay crisp: the dither is pixel-snapped, with no blur.
- **Sections** read like numbered dispatches: CABLE 01 … with redaction bars that slide off to reveal the facts on scroll. Unknown facts stay "redacted" and read "To be announced".
- **Committees:** a dossier index of 19 files. Opening one runs a fast teletype print.
- **Loader:** a dot-matrix teleprinter header ("FROM: DXB MUN SECRETARIAT / TO: ALL DELEGATIONS / PRIORITY: IMMEDIATE") prints line by line. The dither field then floods the screen and resolves into the hero.
- **Palette:** ink black #0B0B0A, paper cream #E9E4D8 as the dither's light colour, one signal red-orange #E8461E for stamps, and IHS maroon for the host.
- **Type:** a mono or typewriter face for the cables (for example IBM Plex Mono, already installed, or JetBrains Mono) plus a condensed grotesk for the headlines, from Fontsource, avoiding the families named above.
- **References:** Getty "Tracing Art" and Floema (see the dissect notes), and Lando Norris (the cursor reveal mechanic).
