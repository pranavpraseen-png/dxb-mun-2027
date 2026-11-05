# Reference board: clean layout, one insane move

Owner, 2026-11-05: "i dont like some layout n motion go through more insane clean but insane websites".
So every site here passes two tests: (1) clean: lots of space, sharp type, few elements; (2) one jaw-dropping
motion or interaction move. Judge layout and motion only; our colours and fonts are fixed (THEME.md: Dusk + Official Record).

Open: http://127.0.0.1:5320/concepts/refs/ (also the first group in /picker/).
The owner taps Like on cards; picks are saved in localStorage `refs.likes` and shown as a numbered bar ("Copy list" copies them).

## Method
1. Sources: the design library (`by-category/award-winning-sites.md`, `inspiration-galleries.md`; `finds.md` and
   `portfolios.md` were read for reference only: finds are X posts of UI snippets, portfolios are personal sites,
   neither gave a whole-homepage reference), the award-site-references skill, then the web:
   Awwwards Sites of the Month list (2024–2026), Awwwards category pages (fashion, social responsibility) and each
   site's awwwards.com/sites/ page for the award, date, studio and tech tags.
2. Every award in `refs.ts` links to its awwwards.com/sites/ page, checked 2026-11-05. No award was taken from memory.
3. Every site was opened headless by `capture.mjs` (Chrome, 1440×900, DPR 1, JPEG q80): first screen, ~40% and ~75%
   down, scrolled with real wheel events so scroll-driven motion fires. Cookie banners: a "Decline/Reject/Deny" button
   is clicked if one is found; nothing else is clicked, except a single centre click on sites that gate the intro behind
   "click anywhere" (sound stays muted). Never signed in, never submitted anything.
4. Each capture was looked at before a site was kept. "Layout" and "move" in `refs.ts` describe what the captures and the
   Awwwards element list show. Where the motion itself could not be seen in a still (cursor or long-press moves), the
   line says so or relies on the Awwwards element list.

## Files
- `refs.ts`: the data (one object per site: url, sector, award + proof link, layout, move, why clean, MUN idea, tech, top-5 rank).
- `main.tsx`, `refs.css`, `index.html`: the board, Dusk theme, fonts from THEME.md, opaque tokens, no blur.
- `capture.mjs`: the capture script. Run ONLY via `node scripts/heavy.mjs "node concepts/refs/capture.mjs [slugs…]"` from `site/`.
  3 sites per browser launch, then the browser is closed. 25 s navigation timeout; a site that fails is skipped.
  `shots/capture-log.json` records status, height, cookie button and errors per site.
- `board-shots.mjs`: screenshots of the board itself (DPR 2) into `site/shots/v2/refs/`, plus overflow / console / Like / lightbox checks.
- `shots/`: 3 captures per kept site (54). `shots/dropped/` holds the dropped sites' captures (not shown on the board).

## Shortlist (18)
| # | Site | Sector | Award | The one insane move |
|---|------|--------|-------|---------------------|
| 1 | Montfort | Finance & B2B | SOTM Jun 2025 | Camera flies from misty peaks out to a 3D Earth that turns to pin its offices |
| 2 | Getty Tracing Art | Culture | SOTM Jul 2025 | Artwork tiles drift and gather into a ring as you read, one sentence per screen |
| 3 | Anime.js | AI, tech & dev | SOTM May 2025 | One persistent dial re-tunes for each section, then an exploded line drawing |
| 4 | Dropbox Brand | Finance & B2B | SOTM Feb 2025 | Hairline-grid cells swell and re-flow into each section |
| 5 | Terminal Industries | Finance & B2B | SOTM Sep 2025 | Hairline wireframe computer-vision labels over aerial video |
| 6 | Cartier Watches & Wonders 2025 | Luxury | SOTM Aug 2025 | Walk through archways room to room |
| 7 | GQ × Audemars Piguet Extraordinary Lab | Luxury | SOTM Mar 2026 | Hairline 3D wireframe lab built around the title |
| 8 | ERA Residence | Architecture | SOTM Aug 2026 | A framed title card opens into full-bleed photos |
| 9 | Floema | Architecture | SOTM May 2026 | A cloud of photos and 3D swirls around the headline |
| 10 | Lando Norris | Mobility | SOTY 2025 | WebGL portrait reacts to the cursor |
| 11 | Auriga Space | Mobility | Honorable Mention Jan 2026 | Numbered steps ride a rail |
| 12 | Oryzo (Lusion) | Studio | SOTM Apr 2026 | A 3D object lifts off a photo into a spec model, then a carousel |
| 13 | David Whyte Experience | Culture | SOTM Dec 2024 | Watercolour landscapes paint themselves in |
| 14 | Igloo Inc | AI, tech & dev | SOTY 2024 | Igloo assembles with numbered hairline points |
| 15 | Siena Film Foundation | Culture | SOTM Mar 2025 | Sliced-title swap and a ticket-stub menu |
| 16 | Outfit by ++hellohello | Fashion | SOTD May 2026 | Staggered off-grid wall moves on scroll and hover |
| 17 | Immersive Garden | Studio | SOTM Jan 2025 | Loader line becomes the page |
| 18 | Age of Union | Gov & NGO | SOTD Oct 2022 | Hover a row: it inverts and its photo follows the cursor |

## Top 5 for a MUN homepage
1. **Montfort**: exactly our globe-to-Dubai idea; one continuous camera, one clause on top, nothing else on screen.
2. **Getty Tracing Art**: one sentence per screen while images gather into a ring (reads as the Assembly gathering). Calm, text-led, serious.
3. **Oryzo**: one 3D object (our nameplate or gavel) guides the whole page; everything else is plain type.
4. **Dropbox Brand**: a hairline grid whose cells swell into placards fits the Official Record look with no 3D at all; the cheapest to build.
5. **GQ × AP Extraordinary Lab**: a hairline wireframe "broadcast" opening; serious and technical, not playful.

## Dropped (captures in `shots/dropped/`)
- Son Daven: glitch and ASCII overlays; busy.
- Shopify Renaissance Edition: busy painted collage and dense lists. Its Roman-numeral index nav is still worth noting.
- Kriss.ai: its 3D scene rendered blank headless and the steps did not advance, so it could not be checked.
- The Line Studio: loud red cartoon art.
- Max Mara Jacket Circle: a pink sketch game; playful.
- Why Zero: a "draw a zero" gesture gate, grain; gimmicky.
- The Tie-break (Miu Miu × New Balance): a game, with blur and grain.

Kept but flagged on their cards: David Whyte (blur-in text breaks our clarity rule), Igloo (mid-scroll is glitchy),
Siena (busier; borrow the title swap and ticket menu only), Lando Norris (busier below the hero).

## Weak sectors
- Fashion: only Outfit. Clean fashion winners are rare; most are loud.
- Gov & NGO: only Age of Union, from 2022. There are no recent Awwwards gov or NGO winners that are clean.
- AI: Anime.js and Igloo. Oryzo's "AI" is a parody product.

## Not tested
- The live motion was judged from 3 stills per site plus the Awwwards element lists, not watched as video.
- Headless WebGL limits: Kriss (dropped), Immersive Garden's 3D bas-relief did not render, and GQ shows only its intro.
- Cursor and hover moves (Lando Norris, Age of Union, Outfit) were not seen in the captures.
- The Cartier URL is a dev subdomain (60fps.fr) that Awwwards links to; it may go away.
- Age of Union's award is from 2022, outside the 2024–2026 window.
- The reference sites' mobile versions were not captured.
- The board was not tested on a real phone or with touch.
