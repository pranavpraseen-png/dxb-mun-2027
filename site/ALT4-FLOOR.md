# Alt 4 · The Floor (2026-11-06)

**The owner's words:** "now create a alt 4 completely a different level looks like it was made by a group of top tier engineers n physcologists n engineers n omg it shud make ppl jump of their seats make it as a video as well like it shud be better than award winning no.1 websites"

**Status:**
- The old Alt 4 (Assembly, which the owner disliked) has moved to `concepts/alt-4-assembly/`.
- The new Alt 4 lives in `concepts/alt-4/`.
- It is a **preview only**: never deploy it.

## The idea in one line
The visitor takes the floor.
- You press and hold to "request the floor": the room's tension builds and the counter climbs to 193 voices.
- When the hold is full, the screen cuts to black for a breath, then a gavel strikes. The whole floor, a field of about 12,000 lit bars, takes the shockwave and rises into the words **DXB MUN**.
- Letters erupt behind the wave front: each bar inside the wordmark springs up (hard overshoot) the moment the shockwave reaches it, so DXB MUN tears out of the floor from the centre outward.
- After that one peak, everything below is calm.

## Psychology (what each piece is for)
| Principle | Where it is used |
|---|---|
| Agency + anticipation | Hold-to-open: the visitor controls when the peak comes. Holding builds a rising drone and a quickening heartbeat. |
| Loss aversion | Letting go early drains the ring back, so people keep holding. |
| Startle / orienting reflex | The gavel: a sound transient, a 2-frame impact, camera kick and shockwave, all on the same frame. |
| Multisensory binding | Sound and picture land within one frame, which makes the hit feel physical. |
| Expectancy violation (the cut) | Right before the gavel the screen cuts to pure black and the sound to silence for 0.17 s. The brain expects the next frame; the hit lands into the void. |
| Agency after the peak | On the open floor, press and hold anywhere to charge (the hill under you swells), release to fire your own orange shockwave with a low thump. Clicks are small knocks. |
| Peak–end rule | One peak (the gavel) and one strong end (Register, with a small gavel of its own). The middle stays quiet. |
| Self-reference effect | The copy says "you". Register shows *your* nameplate as you type your name. |
| Von Restorff (isolation) | One orange thing per screen. UN blue is only for actions. |
| Cognitive load / chunking | One idea per section, short lines, committees in a browsable index, never a tall stack. |
| Fitts's law | Big targets, and the nav is always one click away. |

## Visual rules
- **Palette:**
  - ground #03060C (navy-black)
  - surface #08111E
  - line #16243A
  - ink #F2F5F9
  - muted #8C99AD
  - UN blue #009EDB (actions only)
  - signal orange #E5591C (one accent per screen)
  - warm brown #2A1A12 (one surface at most)
  - IHS maroon #600E0E (host mark)
  - gold #FFB606 (honours only)
- **Type:**
  - Archivo variable (`@fontsource-variable/archivo/wdth.css`: wdth 62–125, wght 100–900) for display and text.
  - JetBrains Mono (`@fontsource-variable/jetbrains-mono`) for labels.
  - Both are unused by the other designs.
- **Crisp:** no blur, glow, gradients or see-through layers. Hard edges. WebGL at up to 2x DPR.
- **Avoid the AI look:** no 3-up icon cards, pill badges, stat counters in boxes or floating blobs.
- **Below the hero (owner feedback, round 3):**
  - one ground (#03060C);
  - small section titles (clamp to about 56px max);
  - one type setting;
  - orange as an accent only;
  - no full-screen colour changes and no wipes.

## Structure
- Nav height is 64px (`NAV_H` in `layout.ts`).
- Section ids, in order: `home` (hero), `about`, `committees`, `schedule`, `register`, `wellness`, `resources`, `contact`.
- **Top nav:** every section plus Portal, with the active one highlighted. Phones get a full-screen menu.
- **Committees:** all 19, as a browsable index (a list plus a detail pane), not a tall stack.
- **Register:** "Take the floor". It has a live nameplate preview where you type your name, and a CTA to `links.register`. The CTA fires `emit('tap')` from `bus.ts` for the small gavel.
- Every fact comes from `@/data/conference`. Unknowns show "To be announced" through `tba()`.

## Files
| File | Owner | What |
|---|---|---|
| `main.tsx`, `layout.ts`, `bus.ts`, `floor.css` | lead | entry, tokens, gate + hero overlay |
| `stage/*` | lead | WebGL field, text heightmap, audio, director, capture hooks |
| `Nav.tsx`, `Sections.tsx`, `sections.css` | sections agent | nav + phone menu, every section below the hero |
| `shots.mjs`, `video.mjs` | lead | screenshots, the video |

## Modes
- `?still` or reduced motion: no gate and no motion. The field renders once, settled, with the letters up. There is no audio.
- `?capture`: virtual time, used by `video.mjs`. Lenis is off and live audio is off.
- **No WebGL:** a static typographic hero.

## Options per part (added 2026-11-06, the owner's follow-up)
The owner's words: "gimme multiple options segregate each n every part into multiple what do u like best sections n choose the best n combination n insane ideas as for that section".

So every part of Alt 4 comes in **three versions, A, B and C**.
- The lead marks one as "my pick".
- Every part also lists 2–3 "wild ideas" (text only).
- A board page (`concepts/alt-4-board/`) shows each part's A, B and C live, lets the owner tick a favourite, and opens the combination.
- The combination is just a URL, for example `concepts/alt-4/?opening=a&hero=a&nav=b&about=c&committees=a&schedule=b&register=c&wellness=a&contact=b`.

### Parts, contracts and files
Every option is a named export in its own file, `concepts/alt-4/parts/<part>-<letter>.tsx`, except the A versions, which live in `Sections.tsx`, `Nav.tsx` and `Stage.tsx`.

| Part | Export | Props | Renders |
|---|---|---|---|
| opening | `OpeningB`, `OpeningC` | `{ onDone: () => void }` | A full-screen fixed overlay (z-index 50). It must call onDone within about 5 s, or on interaction. It has a visible Skip. Under `isStill()` it calls onDone at once. |
| hero | `HeroB`, `HeroC` | `{ revealed: boolean }` | `<section id="home">` at 100svh. It starts its own entrance when revealed turns true. |
| nav | `NavB`, `NavC` | `{ visible: boolean; demo?: boolean }` | A 64px top bar. With demo it is position:absolute inside its parent box (for the board). |
| about | `AboutB`, `AboutC` | `{ id?: string }` | `<section id={id ?? 'about'}>` |
| committees | `CommitteesB`, `CommitteesC` | `{ id?: string }` | `<section id={id ?? 'committees'}>` |
| schedule | `ScheduleB`, `ScheduleC` | `{ id?: string }` | `<section id={id ?? 'schedule'}>` |
| register | `RegisterB`, `RegisterC` | `{ id?: string }` | `<section id={id ?? 'register'}>` |
| wellness | `WellnessB`, `WellnessC` | `{ id?: string }` | `<section id={id ?? 'wellness'}>` |
| contact | `ContactB`, `ContactC` | `{ id?: string }` | `<section id={id ?? 'contact'}>`: resources + contact + footer |

**Rules for every option:**
- Self-contained: no dependency on its siblings.
- Each option file imports its own CSS file, `parts/<part>-<letter>.css`, with classes prefixed `<part><letter>-` (for example `.aboutb-row`).
- The tokens are the CSS variables listed under the palette above (`--ground`, `--un`, `--signal` …).
- Same ground #03060C, same fonts (Archivo Variable + JetBrains Mono Variable), same data rules.
- The three versions of one part must be **really different ideas** (layout, interaction, motion), not recolours. At least one of B/C per part should be bold or experimental, an "insane idea" actually built. All of them must still be serious, crisp and readable.
- Each option file starts with a comment block: `// NAME: <2-4 words>`, `// IDEA: <one line>`, `// WHY: <the psychology / UX reason, one line>`, `// WILD: <one more wild idea for this part that you did not build>`. The registry reads these.

## Google-style motion (added 2026-11-06, the owner asked for "those google animations": Pixel pages, Doodles, Material)
- **Pixel product page → the reel** (`Reel.tsx`, after the hero, ~2.9 screens pinned): the camera orbits the 3D wordmark as you scroll (Stage reads `.fl-reel` progress; desktop lens-shifts the 3D to the right half with `Pose.shift`), and one line fills in word by word: "193 nations have a seat at the United Nations. For 3 days in Dubai, one of them is yours." Then the floor sinks under About.
- **Google Doodle → the nav logo** (`parts/doodle.tsx`): on load (1.2 s) and on hover/tap, the letters stand like delegates in a wave, a UN-blue placard rises from the U, and a gavel strikes the 27 twice. 1.6 s, then the plain logo.
- **Material container transform** (`parts/morph.tsx`): `MorphSheet` tweens the real box (position, size, radius, colours) from a trigger into a panel and back (380 ms open, 320 ms close, emphasized easing; content fades in during the last ~45%). Used by the hero's "19 committees" (grows into the full list) and by every committee in Committees C (grows into its detail panel, ←/→ steps, shrinks back into whichever one is showing).
- All three respect `still` / reduced motion.
