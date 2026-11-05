# What the 7 rejected sites have in common

**Rejected (7):** montfort, cartier-waw-2025, floema, auriga-space, david-whyte, immersive-garden, age-of-union.
**Liked (11):** getty-tracing-art, anime-js, dropbox-brand, terminal-industries, gq-ap-extraordinary-lab, era-residence, lando-norris, oryzo-ai, igloo-inc, siena-film, outfit-hellohello.

Written 2026-11-05 by batch D.

## Sources
- **Rejected sites:** our own captures and `measure.json` per site (`scripts/batch-d.mjs`).
- **Liked sites:**
  - the other agents' dossiers in this folder (era, getty, gq, igloo, lando, oryzo, outfit, anime-js, dropbox, terminal; siena had no dossier when this was written);
  - the board captures `concepts/refs/shots/<slug>-{0,1,2}.jpg`.
- **Pixel statistics** for all 18 sites come from `scripts/batch-d-stats.mjs`, saved to `shots/batch-d-image-stats.json`.
  - The rejected sites use the batch-D frames: first screen plus 12 scroll steps.
  - The liked sites use the 3 board frames each. The board's immersive-garden frames are blank, so that site uses batch-D frames only.

## The rule used
A trait counts as a likely reason only if it's common in the rejected set **and** rare in the liked set. If the liked sites have it too, it can't be the reason.

## Caveats
- This is a correlation over 7 vs 11 sites. The owner never said *why* he rejected each one. Treat this as a hypothesis to confirm with him, not a finding.
- The rejected and liked frames weren't captured at identical moments: the board shots are about 3.5 s or more after load, and ours are about 8–14 s after load. The pixel numbers are comparable in kind, not to the decimal.

## Ranked table (by how many of the 7 rejected sites show the trait)

| # | Trait | Rejected (of 7) | Liked (of 11) | Can it be the reason? |
|---|---|---|---|---|
| 1 | Image-led: photos, renders, footage or illustration carry the page | **7**: all | **8**: terminal, siena, lando, oryzo, era, getty, igloo, outfit | **No.** The liked sites are just as image-led. |
| 2 | Smooth or hijacked scroll | **7**: Lenis on montfort, floema, auriga, david-whyte, age-of-union; virtual scroll on cartier and immersive-garden | **≥5** with Lenis: getty, era, lando, gq, oryzo (per their dossiers) | **No.** |
| 3 | No loader or hero *drawn in lines* (nothing is constructed in front of you) | **7**: blank waits, a quote, a signature, a progress hairline, a wordmark slab | **6** draw one: anime (the tick-mark dial draws itself), dropbox (hairlines draw in), terminal (lane outlines sweep in), igloo (hairline plexus), oryzo (CAD drawing becomes the product), gq (wireframe lab) | **Probably part of it.** It's the cleanest split in loader style. |
| 4 | Nature or atmosphere as the subject (peaks and cloud, landscapes, flowers and birds, parks, rainforest, sky) | **6**: montfort, david-whyte, immersive-garden, floema, age-of-union, auriga (sky footage) | **about 3**: igloo (snow), terminal (sunset road), era (pool, bougainvillea) | **Maybe.** It's weaker than the visual traits below, and the liked sites use landscape too, but framed technically. |
| 5 | Light display weight (DOM display ≤ 400 or thinner) | **5 measured**: montfort (Josefin 300 and Century Gothic 400, wide-tracked), floema (Zimula 400 only), auriga (Univers 400 in the DOM), david-whyte (Canela **100**), immersive-garden (PSTimes 400). Cartier also looks light, but it's canvas text and couldn't be measured. Age of Union is 500. | **about 4**: getty (Bradford 400), era (Ambroise 400), gq (thin title), terminal (Suisse; weights up to 600 loaded). Medium-or-heavier display (≥ 500): dropbox (rendered wght 520, per its dossier), outfit (CSS 700 on the Neue Haas Medium file), and, read from the screenshots only, anime, lando, oryzo, siena and the igloo wordmark | **Contributor.** The liked sites lean heavier. Not absolute: getty and era are liked and set at 400, and age-of-union (rejected) is 500. |
| 6 | **Pale and low-contrast first screen** (mean luma > 150 and luma std < 26) | **5**: montfort 222/20.5, cartier 159/11.6, floema 233/25.9, david-whyte 223/21.1, immersive-garden 189/9.3 | **1**: dropbox 252/17.2, which is mostly empty white but with saturated blue ink. getty is 241/45.7, lando 211/71.9, outfit 164/83.5. | **Yes, the strongest measured split.** |
| 7 | Washed-out colour on the first screen (mean saturation < 10 %) | **5**: floema 3.8, auriga 4.6, david-whyte 2.3, immersive-garden 0.0, montfort 6.8 (age-of-union is 9.1) | **3** by site average: getty 4.0, anime 8.5, gq 8.7 | **Contributor.** It overlaps trait 6, but the liked low-saturation sites are dark (anime, gq) or crisp black-on-white (getty). None of them is pale grey and low saturation. |
| 8 | Softness: mist, haze, watercolour, plaster, faded depth tiles, glowing faded type | **5**: montfort (cloud sea), cartier (soft-lit beige haze, faded glowing names), david-whyte (watercolour plus **blurred text**), immersive-garden (white plaster relief, **text dissolving**), floema (far tiles faded) | **about 2–3**: igloo (snow haze), getty (faded placeholder tiles), lando (soft blobs behind the portrait) | **Likely.** In the liked sites the softness sits *behind* crisp type. In david-whyte and immersive-garden it eats the type itself. |
| 9 | Realistic or painterly 3D with **no line or diagram layer** on top | **4**: montfort (photo-real peaks and ship), cartier (photo-real rooms and gold), immersive-garden (photo-real plaster), david-whyte (painterly shader) | **0**. Every liked realistic scene adds technical lines: igloo (numbered plexus points), oryzo (dashed measuring lines and CAD handles), lando (contour lines), terminal (computer-vision wireframes) | **Yes, a strong split.** Realism alone is fine. Realism *without* a drawn, measured, technical layer was rejected every time. |
| 10 | Made by Immersive Garden | **4**: montfort, cartier (with 60fps), david-whyte, immersive-garden (Awwwards credits) | **1**: gq-ap-extraordinary-lab, the wireframe one | **It's a fingerprint, not a reason.** The owner liked the one IG site that is black, line-drawn and high-contrast. |
| 11 | Text that enters by blur, dissolve or low-opacity glow | **4**: david-whyte (blur), immersive-garden (dissolve into the relief), cartier (faded white-on-beige names), montfort (lower lines pale while the upper ones are full) | **2**: getty (sentences pass through grey opacity), era (letters fade in by char) | **Partly.** Blur and dissolve appear only in the rejected sites. An opacity fade alone is in the liked ones too. |
| 12 | Nav hidden, absent or gone once you scroll | **4**: montfort (header gone from step 1), cartier (no nav), david-whyte (header off-screen at −101 px on desktop), age-of-union (header hidden going down) | **4**: igloo (no nav), gq (no nav), dropbox (the home is the nav), anime (static header scrolls away) | **No**, not on its own. It's still against the owner's standing "nav over scroll" rule (memory). |
| 13 | Small first-screen headline (largest DOM text ≤ 62 px) | **6**: montfort 62, floema 57.2, age-of-union 40, david-whyte about 32, immersive-garden 28, auriga 24 (SVG wordmarks excluded) | **about 6**: anime, dropbox, igloo, terminal, outfit and siena have no DOM headline above about 62 px at the top. Above 62: era 172.8, oryzo 123, lando 110, gq about 100, getty 72 | **No**, roughly even. |
| 14 | Click gate before the experience | **2**: cartier, immersive-garden | **1**: gq | **No.** |
| 15 | Dense, newspaper-like page | **1**: age-of-union (highest edge density of all 18: gradient 37.2, 24 % hard-edge pixels) | **0–1**: siena is the busiest liked site (23.4 / 14 %) | **No** as a common trait, but probably *the* reason for age-of-union specifically. |

## The traits asked about, one by one

### Colour temperature
**Not the reason.**
- Image warmth (mean R−B) of the rejected sites runs from **−20** (montfort, cold blue-grey) to **+28** (cartier, beige-gold). The liked sites run from **−26** (dropbox) to **+40** (oryzo).
- The medians are 4 (rejected) and 10 (liked).
- Both warm and cold were rejected, and both were liked.
- Note: montfort is the closest to "UN blue" (`#2D628C` on pale mist) and was rejected. Blue alone doesn't win; *pale* blue on mist lost.

### Photo or illustration dependence
**Not the reason.** It's 7/7 rejected and 8/11 liked.

### Softness (blur, mist, watercolour)
**Likely a reason.** It's 5/7 rejected and about 2–3/11 liked, and the difference is *where* the softness sits:
- **Rejected:** the softness reaches the type, as blur in david-whyte, dissolve in immersive-garden and faded glow in cartier.
- **Liked:** the type stays crisp over any haze (igloo's mono corner text over snow fog).

### Serif vs grotesk
**Not the reason.**
- **Rejected:** 2 serif-led (david-whyte, immersive-garden) and 5 sans-led.
- **Liked:** 2 serif-led (getty, era) and 9 sans-led.

### Weight (related)
**A contributor.** The rejected display type is light: Canela 100, Josefin 300, and 400 across the rest. The liked sites lean medium-to-bold (dropbox 520 and outfit's Medium file are measured; the rest are judged by eye), with exceptions (getty and era at 400, gq thin).

### Pace
**Not established.**
- Every rejected WebGL site is slow and eased (cinematic camera walks, slow fades).
- Getty (liked) is also slow: 90 screens of scrub.
- We didn't measure scroll response for the rejected sites in this lighter pass, so we can't rank pace.

### Loader style
**A real difference, in kind.**
- **Rejected loaders:**
  - montfort: a blank white wait (3.5 s);
  - cartier: blank, then a quote and progress line, then a click;
  - david-whyte: a signature, then a "Loading" circle;
  - age-of-union: a coral wordmark slab, then a hard cut;
  - immersive-garden: one line with a progress bar (this one *does* become the hero);
  - auriga: type-on in place;
  - floema: not observed.
- **Liked loaders:** 6/11 *draw* something in lines that then becomes the hero (dial, grid, lanes, plexus, CAD drawing, wireframe). Several more carry the logo into the hero (era, getty).
- **In short:** liked loaders *build*; rejected loaders *wait* or *fade*.

### Density
**Not common** (1/7). Most rejected sites are as sparse as the liked ones. Age of Union is rejected *for* density, which is the opposite failure.

### 3D style (realistic vs line or wireframe)
**A clear split.**
- **Rejected:** 4/7 use realistic or painterly 3D *with no line layer*.
- **Liked:** 0/11 do that. The liked 3D is either line or wireframe (gq), or realistic with numbered, measured or contoured hairlines over it (igloo, oryzo, lando, terminal).

### Nav style
**Not the reason.**
- Bars, corners and none appear in both groups.
- 4/7 rejected sites hide or drop the nav, and so do 4/11 liked ones.

### How much text
**Not established.**
- **Words in the DOM at load:**
  - montfort 927;
  - cartier 0 (canvas);
  - floema about 350;
  - auriga 676 on the phone and 2,307 on desktop (desktop probably counts the hidden mega-menu);
  - david-whyte 538;
  - immersive-garden about 330;
  - age-of-union 617.
- We have no comparable word counts for the liked sites, so this isn't ranked.

## Summary: the profile the owner rejected
The strongest, best-evidenced pattern is a **pale, low-contrast, low-saturation, soft-focus look**. It's mist, beige or grey grounds, with thin or light type and realistic or painterly imagery that has **no technical line layer**. Sometimes the softness reaches the text itself (blur, dissolve).
- **Who has it:** five of the 7 rejected sites (montfort, cartier, floema, david-whyte, immersive-garden). Only one liked site comes near it on the numbers (dropbox, and its ink is saturated blue on a hairline grid).
- **The other two rejected sites fail differently:**
  - **auriga-space** is dark and technical like the liked set, but its DOM type is tiny (24 px), it has no 3D or drawn object, and below the fold it turns into generic corporate Webflow sections (a logo strip, a news ticker, two-column text).
  - **age-of-union** is the densest page of all 18 (a newspaper grid, many photos).
- **What the liked set has instead** (the inverse, for the theme):
  - high contrast (dark grounds or crisp ink on white);
  - at least one saturated accent;
  - heavier display weights;
  - a **drawn, technical line layer** (hairlines, wireframes, plexus, CAD, contours, a grid) that builds itself in the loader and stays in the hero.

## Evidence index
- **Per-site dossiers:** `montfort.md`, `cartier-waw-2025.md`, `floema.md`, `auriga-space.md`, `david-whyte.md`, `immersive-garden.md`, `age-of-union.md`.
- **Captures:** `shots/<slug>/`. Each has `sheet-loading.jpg`, `sheet-scroll.jpg` and `sheet-phone.jpg` contact sheets.
- **Pixel statistics:** `shots/batch-d-image-stats.json`.
  - Method: each JPEG is drawn at 360×225.
  - warmth = mean(R−B);
  - light = mean Rec.709 luma;
  - sat = mean HSV saturation;
  - lumaStd = luma standard deviation;
  - edge = mean |∇L|;
  - hardEdgePct = % of pixels with a gradient > 40.
- **Awwwards pages** (read 2026-11-05) for the credits, colours and tech:
  - montfort, cartier-watches-wonders-2025, floema, auriga-space, david-whyte-experience, immersive-garden-website, age-of-union;
  - gq-ap-the-extraordinary-lab, to confirm the Immersive Garden credit.
