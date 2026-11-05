# DXB MUN: complete homepage redesign brief (shared by redesign agents; RE-READ before each major step)

**The owner's words:** "completely redesign everything", "keep the things I told I like and remodel everything else", "insane animation like top tier", "using the design library and the reference websites", "take from other sectors as well", and "give multiple options on the side".

**The problem with the previous attempt:** options A, B and C (and `final`) kept the Merged page's layout and only changed colours, fonts and motion. That is NOT a redesign. Each redesign here needs a new page structure, new section designs, new components, a new nav treatment and a new hero composition.

## Keep (the only things carried over)
1. **The globe that zooms in to Dubai.** The idea stays, but you may rebuild it entirely: a new globe, 3D or a different render. See `concepts/merged/Globe.tsx` for how it works today.
2. **Committees shown as UN nameplates or placards.** The concept stays; redesign how they are shown.
3. **A broadcast-style opening.**
4. **Every fact written as a short resolution clause.** The owner is "too lazy to read", so the big text alone tells the story: short clauses, no paragraphs.
5. **A full top nav to every section, and a short homepage.**
6. **IHS host colours somewhere:** maroon #600E0E, gold #FFB606, cream #DCBDAB. The tone is serious and UN-like, never playful or neon.

## Content: the exact facts, no hallucination
- Use ONLY the facts and text in `site/src/data/` (for example `conference.ts`) and the Merged page (`concepts/merged/*`).
- No new dates, numbers, names or claims. Unknown values say "To be announced".
- Links to the dashboards: copy `concepts/final/links.ts` (portal, chair, admin). Register and sign-in go to `portal + '#/now'`.

## Use the design library and the reference sites (mandatory)
- **Design library:** `C:\Users\praseen\.claude\skills\design-resources\`.
  - Read `SKILL.md`, then the category files in `by-category/`, especially `award-winning-sites.md`, `ui-component-libraries.md`, `motion-animation-libraries.md` and `3d-webgl.md`.
  - **Take components from several categories,** as the library spreads them (UI components, motion, 3D/WebGL, type, icons). Don't build blocks from scratch.
  - Copy source code from the libraries' sites when you can fetch it: React Bits, Motion Primitives, Animate UI, Magic UI, Cult UI, Smooth UI, coss ui, shadcn and Paper Shaders. Credit every component in your folder's `LIBRARY.md`.
  - **No AI look:** no generic 3-up icon cards, no purple gradients, no glowing blobs, no pill-badge soup.
- **Reference sites:** `by-category/award-winning-sites.md`. Each redesign has an assigned mix that spans sectors. Borrow techniques only, never brand assets, copy or 1:1 layouts.
  - If you can open a reference (WebFetch or the web), look at it first; otherwise work from the notes.
  - Before coding, write `NOTES.md`: which references, and which exact technique from each.

## Motion: "insane", top-tier
- Libraries already installed: GSAP + ScrollTrigger (+ SplitText if the installed GSAP includes it), Lenis, motion, cobe, and @number-flow/react.
- **You may install,** ONLY through the lock and ONLY these: `three`, `@react-three/fiber`, `@react-three/drei` and `@paper-design/shaders-react`. Run `node scripts/heavy.mjs "npm install <pkgs>"`, and say in your report what you installed.
- **Performance:**
  - 60fps: animate transform, opacity, clip-path and shaders only.
  - Pause WebGL when it's off screen.
  - Respect `prefers-reduced-motion`, which gives a calm static version.
  - The phone version (390 px) must feel great too: touch-first, with lighter effects where needed.
  - No horizontal scroll and no console errors.

## RAM and the shared machine (very little free memory)
- **Never start your own dev server.** The shared one is at http://127.0.0.1:5320. Your page is http://127.0.0.1:5320/concepts/redesign-N/.
- **Every heavy command goes through the lock:** `node scripts/heavy.mjs "<cmd>"`, from `site/`. That covers tsc, puppeteer, npm install and vite build.
- **Typecheck:** `node scripts/heavy.mjs "npx tsc --noEmit --singleThreaded"`. Look only at errors in your own folder.
- **Never** deploy, commit or push, and never edit outside your folder. The only exception is `package.json`/`package-lock.json` through the allowed npm install.

## Each agent owns only `site/concepts/redesign-N/`
- It needs `index.html`, `main.tsx`, its components, a CSS file, `NOTES.md` and `LIBRARY.md`, plus a `shots.mjs` (puppeteer-core, modelled on `scripts/live-shots.mjs`).
- `concepts/redesign-N/tsconfig.json`, if needed, is modelled on `concepts/merged/tsconfig.json`.
- Shared images live in the repo's `images/` folder, one level above `site/`; see how Merged imports them.

## Done means
- Screenshots in `site/shots/v2/redesign-N/`:
  - at 1440: the first screen, 4–6 mid-scroll states proving the motion changes with scroll, and a full page with `?still`;
  - at 390: the first screen, 2 mid-scroll states and the full page.
- No console errors, no overflow, and the typecheck is clean in your folder.
- **The report** gives:
  - the idea in one line;
  - the references and techniques;
  - the library components used;
  - what you installed;
  - what is untested or janky. Be honest.
