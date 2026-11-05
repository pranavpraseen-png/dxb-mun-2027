# DXB MUN 2027: design brief for the concept round

**The job.** DXB MUN is a Model United Nations conference run by Indian High School for students across all of Dubai. Thousands of students will open the site, most of them on phones. Some will open it on a projector in a committee room. The current site (`../index.html`, `../timer.html`, `../dashboard.html`, `../chair.html`, `../admin.html`) is a plain HTML/CSS build. We are rebuilding it in React + Vite and making it world-class.

This round produces **one flagship plus five alternatives**. Each one must be *completely different*: typefaces, layout, art direction, scroll mechanics and interaction. The owner will pick one or combine them, so every concept has to be a believable, finished-looking direction, not a sketch.

The owner's verdicts on past sites were "omg its so bad it looks so ai", "corny" and "u didnt use my resources properly". The bar is a site that could win an award, not a template.

## Owner feedback, round 1 (2026-11-04): this overrides the palettes in the table below

> "i dont like the colours, more UN themed and darker in preference and more serious preferably"

Every concept needs all of these:
- a **dark** ground: deep navy (about `#07111F`–`#0B1F3A`) or near-black;
- **UN blue `#009EDB`** as the primary colour, with a deeper navy/blue scale for surfaces and lines;
- white or off-white text;
- at most ONE restrained secondary colour (for example a muted brass/gold for a laurel-like highlight), used rarely;
- semantic green, amber and red only for status in the portals and timer.

The tone is **serious and institutional**: no stickers, no candy colours, no jokey copy, and measured motion. Concepts still differ in layout, typography, structure and signature motion, but not in seriousness.

### Owner feedback 2: navigation over scrolling

> "on the top nav more navigation, i don't want to scroll a lot, i will scroll but not too much"

- **Top nav:**
  - On desktop, the top nav shows a link to EVERY homepage section (About, Committees, Schedule, Wellness, Resources, Contact) plus Timer and Portal (Delegate / Chair), all visible without opening a menu.
  - It highlights the section you're in (scroll-spy) and jumps there smoothly. The jump is instant in still mode.
  - On phones, the burger opens a full-screen menu with the same links, at 44 px or more each.
- **A short homepage:** target at most ~5 viewport heights at 1440 and ~8 at 390.
  - Compress sections. The 19 committees go in ONE compact browsable component (rail, deck, index or picker), never a tall list.
  - Schedule days are tabs.
  - Cut decorative spacer sections.
  - The signature scroll moment must not add more than about one extra screen of scroll.

### Owner feedback 3: scroll speed, first impression, and nothing hidden or broken

> "scrolling is too fast. i like most of it, i love it tbh, but check all the technical stuff and the psychology of opening and wanting to stay, how everything is viewed, any overlay or unseen things or functional problems"

**Scroll feel (same for every concept)**
- **Smooth scroll:** use `useSmoothScroll(true, <navHeight>)` from `@/shared/scroll` on the homepage. Remove your own Lenis setup and any `scroll-behavior: smooth`.
- **Nav jumps:** go through `scrollToSection(id, navHeight)`.
- **Scrubbed animations:** use `scrub: SCROLL_FEEL.scrub` (1.2) or more. No scroll-linked animation may complete in less than about 60% of a viewport of scroll.
- **Pinned carousels** (Chamber's rail and similar): snap to each item (`snap: { snapTo: 1 / (n - 1), duration: { min: 0.3, max: 0.8 }, ease: 'power2.inOut' }`), so one wheel flick moves one item, never five.

**The first 5 seconds (both desktop and phone, before any scrolling)**
- **The first screen answers four questions:**
  - What is this? (DXB MUN 2027, a Model United Nations conference)
  - Who is it for and who runs it? (Hosted by Indian High School, in Dubai)
  - When and where? ("To be announced" is fine; say it plainly)
  - What do I do now? (ONE primary button, normally "Explore committees")
- **The name and the primary button are visible without scrolling** at 390×844, 820×1180 and 1440×900. A full-screen "gate" that only says "Scroll to open" fails this.
- **A hook to keep going:** a visible teaser of what's below (for example the committee count or the first committee) and a scroll cue.
- **A thin UN-blue scroll-progress line** at the bottom edge of the nav, so visitors always know how much is left. It reduces "how long is this page" anxiety and pairs with the full nav.
- **Calm:** decorative patterns and lines stay quiet. Low contrast, thin strokes, and full brightness only on what matters. Nothing flashes or moves on its own except one gentle ticker or clock.
- **Remove anything invented-looking**, such as made-up document codes.

**Nothing hidden, nothing broken**
- Run `node scripts/audit.mjs <id>`. It checks covered buttons, text stuck invisible after scrolling, clipped text, things sticking out past the screen edge, nav jumps landing under the header, the phone menu, contrast, text size, and the timer/delegate/chair functions. Fix every `[high]` and `[med]`.
- Also look at 820 px (tablet) and around 1100 px, where nav bars usually overflow. The audit includes 820.

## Hard rules (every concept)

1. **Facts only come from `src/data/conference.ts`.** Never invent dates, venues, numbers, names, quotes, testimonials, sponsors, past winners or "1000+ delegates" style stats. Unknown values (dates, venue, email, Instagram, register link) render through `tba()` as "To be announced". Short UI microcopy ("Explore committees", "Start", "Send chit") is fine. Use the real 19 committees, the real 3-day schedule, the real wellness items and the motto "Diplomacy around us".
2. **Logo.** The real logo is coming later. Render it through `brand.logoSrc` from `src/shared/brand.ts`: if it's null, show your own type-only wordmark "DXB MUN". Don't draw a fake crest or emblem.
3. **Photos.** The only real photo is `heroPhoto` (delegates carrying flags on stage). Don't use stock photos, AI images or hotlinked images. Typography, colour, layout, motion and drawn graphics (SVG) carry the design.
4. **Stay in your folder.** Write only inside `concepts/<your-id>/`. Don't edit `src/`, `package.json`, `vite.config.ts`, other concepts, or anything outside `site/`. Don't run `npm install`. Use only what is installed (below). Import shared code with `@/…` (for example `import { committees } from '@/data/conference'`).
5. **Four views, one page.** Use `useView()` from `@/shared/hooks`: `#/` home, `#/timer` floor timer, `#/portal` delegate portal, `#/chair` chair portal. In-page section anchors use `#about` and similar, with no slash. The nav must reach Timer and the portals (a "Portal" entry or menu that offers Delegate and Chair).
6. **Use the shared behaviour hooks; design them, don't re-invent them.** These are `useWellness`, `useFloorTimer`, `usePortal`, `useStill` and `useView`. They mirror the live site's logic. You may add view-only state.
7. **Quality bar** (checked by `scripts/shots.mjs` and by the lead):
   - `?still` in the URL, or OS reduced motion: everything renders in its final state, with no scroll-jacking and no autoplay motion. Use `useStill()`.
   - At 390 px wide: no horizontal overflow and nothing cut off. Tap targets are at least 44×44 px. Body text is at least 16 px.
   - WCAG AA contrast for text. Focus is always visible. Headings are semantic, with one `h1` per view. Every image has `alt`. Animate transform and opacity only. 60 fps on a mid-range phone.
   - No external network requests: fonts come from the installed `@fontsource` packages, and there are no CDNs.
   - Every non-hero image gets `loading="lazy"`. Lazy-load heavy things (WebGL) with `import()`.
8. **The "looks AI" checklist. Fail any one of these and the concept is rejected:**
   - purple/blue gradient washes or glowing blur "blobs";
   - generic glassmorphism cards in a 3×N grid;
   - emoji used as icons;
   - every section the same centred heading + subtitle + card grid;
   - Inter-only typography;
   - "Lorem ipsum" or made-up stats;
   - a hero saying "Welcome to the future of…";
   - identical rounded-2xl shadows everywhere;
   - a stock gradient button with a sparkle icon;
   - a uniform fade-up on every element.

   The owner explicitly said "no gradients" on their other projects. Use flat, confident colour.
9. **The signature scroll effect.** Each concept has ONE memorable, scroll-scrubbed signature moment on the homepage, described below, plus considered micro-interactions. The motion is noticeable but never blocks reading. Section reveals run at about 600–750 ms; micro-interactions are quick. Keep the page short: about 6–7 sections, each roughly one screen ("I wouldn't scroll so much").
10. **Projector-ready timer.** The timer view must be readable from the back of a hall. Huge numerals, a clear running, paused and "Time is up" state. Space starts and pauses, R resets, and the state is announced with `aria-live`.
11. **Portals are previews.** Show a small, honest "Preview · sample data" label. The delegate view has these steps:
    - pick a delegation (search plus chips, the Chair first);
    - see the "To:" line;
    - write the chit, with a 500 character count;
    - send it (Ctrl/Cmd+Enter works);
    - the inbox: unread count, mark read, mark all read, reply;
    - the sent list with status pills (waiting, delivered, not approved, plus the chair's note).

    The chair view has these:
    - stats (delegations, waiting, approved, rejected);
    - an approval queue with Approve & deliver, and Reject plus an optional note;
    - messages to the chair;
    - the decision log.

    Show toasts from `portal.toast`. These are working tools: dense, calm, legible, in the same art direction as the home page but quieter.

## Installed toolkit (from the owner's design library, `~/.claude/skills/design-resources`)

- **Motion:**
  - `motion` (import from `motion/react`): Motion, formerly Framer Motion.
  - `gsap` + `gsap/ScrollTrigger` + `@gsap/react` (`useGSAP`).
  - `lenis` (smooth scroll). Disable it in still mode.
  - `@number-flow/react` (rolling numerals): NumberFlow.
- **UI:**
  - `@base-ui/react`: headless, accessible primitives (Tabs, Dialog, Menu, Popover, Toggle, Tooltip and others; see `node_modules/@base-ui/react`).
  - `lucide-react` icons.
  - `clsx`.
- **Styling:** Tailwind v4 (`@import "tailwindcss";` in your CSS, with the Vite plugin already wired) or plain CSS / CSS modules. Your choice.
- **3D/graphics:** `cobe` (a dotted WebGL globe, about 5 kB).
- **Fonts** (self-hosted; import them in your `main.tsx`, for example `import '@fontsource-variable/fraunces';`):
  - **variable:** `inter-tight`, `fraunces`, `bricolage-grotesque`, `unbounded`, `space-grotesk`, `archivo` (has wdth), `geist`, `geist-mono`, `jetbrains-mono`, `playfair-display`, `noto-kufi-arabic`, `oswald`, `dm-sans`, `manrope`, `instrument-sans`;
  - **static** (`@fontsource/…`): `instrument-serif`, `anton`, `barlow-condensed` (import weights such as `@fontsource/barlow-condensed/600.css`), `ibm-plex-sans-arabic`.

## The six directions

| id | Name | Art direction | Type | Signature scroll moment |
|---|---|---|---|---|
| `chamber` | **Chamber (FLAGSHIP)** | Cinematic Apple-keynote storytelling on near-black. It evolves the current identity: deep maroon `#7A1425`, warm gold `#F2B705` used sparingly, cream. Big confident type, real depth from light and scale, never gradients. A floating nav. It feels like the moment before a General Assembly opens. | Bricolage Grotesque (display, use its width/opsz axes) + Inter Tight | The hero photo starts full-bleed and, scrubbed by scroll, pulls back into a framed placard. Then the 19 committees run as a pinned horizontal rail of placards with a NumberFlow `07 / 19` counter. |
| `resolution` | **Resolution** | Swiss editorial print on warm paper `#F3EFE6` with black ink and one signal colour (vermilion or UN blue). A strict 12-column grid, hairline rules, generous margins. The site is written in the *format* of a UN draft resolution: preambulatory and operative clauses ("Recalling that…", "1. Decides…") frame the real facts. Don't invent facts inside the clauses. | Instrument Serif (display) + Inter Tight + JetBrains Mono (clause numbers) | Clauses "ink in" word by word, scrubbed by scroll. The committees are an index table: hovering or focusing a row reveals a large placard preview. |
| `placard` | **Placard** | Loud, joyful pop for students. Flat saturated colour blocks: UN blue `#009EDB`, sunflower, coral, mint and ink. Chunky outlines, sticker energy, country-placard motifs, playful but legible. No gradients. | Unbounded + Space Grotesk | A deck of committee placards you can drag, flick and throw (Motion drag with inertia). Scrolling "raises" placards like a vote. |
| `orbit` | **Orbit** | Precise data/diplomacy on deep navy-black, like Linear or Vercel engineering polish. A dotted globe (cobe) centred on Dubai (25.2048 N, 55.2708 E), a live Dubai clock (`Asia/Dubai`), mono labels and fine grids. | Geist + Geist Mono | Scroll spins and zooms the globe toward Dubai. The committees are laid out as a constellation/orbit index you can browse. |
| `majlis` | **Majlis** | Dubai-rooted luxury: ivory and sand, deep emerald/teal, a brass accent. Geometric mashrabiya lattice patterns drawn in SVG. Slow, graceful motion. Bilingual accents use ONLY these verified phrases: نموذج الأمم المتحدة (Model United Nations) and دبي (Dubai). | Fraunces or Playfair Display + Manrope + Noto Kufi Arabic | A mashrabiya lattice screen that opens, scrubbed by scroll, to reveal the hero photo. Committees sit in arched niches. |
| `broadcast` | **Live** | Broadcast and sports event graphics: black with one electric accent (lime `#C6FF00` or broadcast red), tickers, lower-thirds, LIVE bugs, a scoreboard-style stats board. Energetic but disciplined. | Barlow Condensed / Oswald + Geist Mono | A broadcast-intro wipe sequence scrubbed by scroll. The committees are "channels" you surf (channel-switch transition). The schedule is a TV-guide grid. The timer is a shot clock. |

## Files you create

```
concepts/<id>/index.html   (already stubbed: keep the <div id="root"> and the module script tag)
concepts/<id>/main.tsx     (already stubbed: replace its contents)
concepts/<id>/…            (any components, CSS, SVGs you need)
concepts/<id>/NOTES.md     (2–10 lines: the idea, the libraries used, the signature effect, known gaps)
```

## How to check your work (do all of it before reporting)

Run these from `C:\Users\praseen\Desktop\IHS-MUN-HUB\site` using the Bash tool:

1. `npx tsc --noEmit -p concepts/<id>/tsconfig.json` must pass with zero errors.
2. `CONCEPT=<id> npx vite build` must succeed.
3. The dev server is already running at http://127.0.0.1:5320. Don't start or stop it.
4. `node scripts/shots.mjs <id>` saves full-page screenshots (1440 and 390 px; home, timer, portal and chair) to `shots/<id>/` and prints an audit. Fix every PROBLEM it lists.
5. `node scripts/shots.mjs <id> --motion` saves viewport shots of the homepage at 11 scroll positions, with motion on, at 1440 and 390. Use them to check that the signature scroll moment actually reads, and that nothing is stuck invisible.
6. Open your screenshots with the Read tool and look at them critically against this brief and the "looks AI" checklist. Iterate at least twice on what you see.
7. In the final report: what you built, the signature effect, the libraries used, the audit output, and anything unfinished. Be honest.
