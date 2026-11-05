# Merged (public website): where each component comes from

Owner rule (DELEGATE.md, "build from the library"): every generic control comes from the library and is themed with our tokens.
Hand-written CSS in `merged.css` is only tokens, layout glue and the signature pieces.

- **coss ui imports.** Read-only imports from the dashboard's copy in `portal/ui/coss/`; nothing there is duplicated or edited.
- **coss ui files in `concepts/merged/ui/`.** Three coss components were not in that copy yet: Toggle, Toggle Group and Number Field. They were fetched from the coss registry on 2026-11-05 and copied into `concepts/merged/ui/`. Only the import paths changed, and each file names its source URL in line 1.
- **How the theme is wired.** `merged.css` loads Tailwind theme and utilities only, with no preflight. It sources just the coss files listed in its `@source` lines, maps the coss variables (`--primary`, `--border` and the rest) to our tokens, and keeps radii at 1 to 2px. `index.html` sets `class="dark"`.
- **Licence warning (same as the dashboard).** coss ui comes from the `cosscom/coss` repository, whose LICENSE is **AGPL-3.0**. If that is not acceptable, the MIT fallback is Base CN (basecn.dev): the same Base UI primitives with the same shape of API.

## Sweep: every component and section, and the verdict

| # | Component / section | File | Looked AI-made? | Verdict |
|---|---|---|---|---|
| 1 | Top bar wordmark | `ui.tsx` | No: the logo slot until the real logo arrives | Kept |
| 2 | Top bar section links + scroll-spy + progress line | `TopBar.tsx` | No: plain text links in the broadcast style | Kept. Hover underline is now burnt orange; the current section stays UN blue |
| 3 | Top bar "Timer" button | `TopBar.tsx` | Yes: hand-rolled button | **Replaced**: coss Button (outline, rendered as a link) |
| 4 | "Portal" dropdown | `TopBar.tsx` | Half: Base UI Menu with hand-written popup styling | **Replaced**: coss Menu (MenuTrigger + MenuPopup + MenuLinkItem); trigger is a coss Button |
| 5 | Phone burger + full-screen menu | `TopBar.tsx` | Half: Base UI Dialog with hand-rolled sheet, backdrop and slide | **Replaced**: coss Sheet (full width); burger, Close and the three tool links are coss Buttons |
| 6 | Opening (Live title card, wipes, lower-third, cut) | `Opening.tsx` | No: signature | Kept (signature). Restyled only |
| 7 | "Explore committees" CTA | `Opening.tsx` | Yes: hand-rolled white button | **Replaced**: coss Button, default (primary = UN blue, the action colour) |
| 8 | Teaser tag and corner tag ("19 committees, 3 days", "DXB MUN 2027") | `Opening.tsx` | Yes: hand-rolled pills | **Replaced**: coss Badge (outline), mono 16px, burnt-orange border |
| 9 | Ticker | `ui.tsx` | No: part of the Live opening | Kept (signature). Separators are now short burnt-orange rules |
| 10 | Orbit globe zoom to Dubai, HUD, Dubai tag | `Globe.tsx`, `Opening.tsx` | No: signature | Kept unchanged |
| 11 | Facts as resolution clauses | `Opening.tsx` | No: signature, already skimmable | Kept. Clause numbers and the reading rule are burnt orange |
| 12 | Keyed headings (UN-blue bar wipes once) | `ui.tsx` | No: the one reveal motif, not a uniform fade-up | Kept |
| 13 | Section head rule | `merged.css` | No | Kept. A 72px burnt-orange segment marks the start of the rule |
| 14 | Placard deck (drag, throw, NumberFlow counter) | `Deck.tsx` | Partly: the soft blurred drop shadow | Kept (signature). The soft shadow is replaced by a mid-brown edge and a hard deep-brown drop; the fold rule is brown |
| 15 | Deck controls (prev / next / Shuffle) | `Deck.tsx` | Yes: hand-rolled square buttons | **Replaced**: coss Button (outline, icon-lg and lg) |
| 16 | Floor of 19 nameplates | `Floor.tsx` | No: signature | Kept. Desk tops under each row are deep brown with a mid-brown edge, and plates get a 1px brown inner edge |
| 17 | Schedule day tabs | `Home.tsx` | Yes: hand-rolled tablist with its own key handling | **Replaced**: coss Tabs (underline variant). Vertical on desktop, horizontal on phones; the sliding UN-blue indicator and the arrow keys come from Base UI (`activateOnFocus` keeps the old "arrow selects the day" behaviour) |
| 18 | Schedule list + colour key | `Home.tsx` | No: an editorial timetable | Kept (layout glue) |
| 19 | Wellness, Resources and Contact as three equal columns | `Home.tsx` | Yes: symmetric 3-up row | **Re-laid out.** Wellness and Resources share an asymmetric 5:8 row. Contact moved into a full-bleed deep-brown band above the maroon host strip, like a newspaper colophon |
| 20 | Wellness toggles | `Home.tsx` | Yes: hand-rolled `aria-pressed` buttons with a drawn box | **Replaced**: coss Checkbox inside a label row (the whole row is the target) |
| 21 | Wellness count pill (0/3) | `Home.tsx` | Yes: hand-rolled pill | **Replaced**: coss Badge (outline, then default when done) |
| 22 | Resource "Open" button / "Link to be announced" tag | `Home.tsx` | Yes: hand-rolled | **Replaced**: coss Button (outline, sm) and coss Badge (outline, orange border) |
| 23 | Floor-timer promo | `Home.tsx` | Half: hand-rolled bordered link box | **Replaced**: coss Card rendered as a link. Hover border is burnt orange |
| 24 | Register / Sign in | `Home.tsx` | Yes: hand-rolled | **Replaced**: coss Button (default + outline) |
| 25 | Contact roll (definition list) | `Home.tsx` | No | Kept (layout glue), now inside the brown band. The "To be announced" marker is a small orange-bordered square |
| 26 | Host strip (IHS maroon) | `Home.tsx` | No: host branding | Kept unchanged |
| 27 | Footer "Back to top" | `Home.tsx` | Yes: hand-rolled | **Replaced**: coss Button (outline) |
| 28 | Timer: Start / Reset / Full screen | `TimerView.tsx` | Yes: hand-rolled | **Replaced**: coss Button (xl / lg). The red "Time is up" state re-themes them through `data-slot` |
| 29 | Timer: preset times | `TimerView.tsx` | Yes: hand-rolled `aria-pressed` buttons | **Replaced**: coss Toggle Group (outline) |
| 30 | Timer: minutes / seconds steppers | `TimerView.tsx` | Yes: hand-rolled input with − / + | **Replaced**: coss Number Field (0–59, two-digit format), with coss Label |
| 31 | Timer: seven-segment digits, 40-cell bar | `ui.tsx`, `TimerView.tsx` | No: Live's shot clock | Kept (signature of the Live direction, projector-readable) |
| 32 | Skip link, Dubai clock | `main.tsx`, `ui.tsx` | No | Kept (layout glue) |
| 33 | `Portals.tsx`, `Toast.tsx` | (not imported) | n/a | **Dead code.** `#/portal` and `#/chair` redirect to the real dashboard, so neither file is rendered or bundled. Left in place for the lead to delete |

No emoji, gradients, glassmorphism, gradient text, generic stat counters or lucide-icons-in-circles were found on the site before or after.

## Replacements (one row per component)

| Replaced | Library | Component | URL | Licence |
|---|---|---|---|---|
| Hand-rolled buttons (Timer, CTA, deck controls, Shuffle, Open, Register, Sign in, Back to top, sheet links, timer controls) | coss ui | Button | https://coss.com/ui/r/button.json | AGPL-3.0 |
| Portal dropdown popup and items | coss ui | Menu (MenuTrigger, MenuPopup, MenuLinkItem) | https://coss.com/ui/r/menu.json | AGPL-3.0 |
| Phone full-screen menu (Dialog + hand-rolled sheet) | coss ui | Sheet (SheetPopup, SheetTitle, SheetClose) | https://coss.com/ui/r/sheet.json | AGPL-3.0 |
| Pills and tags (teaser, corner tag, wellness count, "Link to be announced") | coss ui | Badge | https://coss.com/ui/r/badge.json | AGPL-3.0 |
| Schedule day tabs | coss ui | Tabs (underline) | https://coss.com/ui/r/tabs.json | AGPL-3.0 |
| Wellness toggles | coss ui | Checkbox | https://coss.com/ui/r/checkbox.json | AGPL-3.0 |
| Floor-timer promo box | coss ui | Card | https://coss.com/ui/r/card.json | AGPL-3.0 |
| Timer preset buttons | coss ui | Toggle Group + Toggle (copied to `ui/`) | https://coss.com/ui/r/toggle-group.json, https://coss.com/ui/r/toggle.json | AGPL-3.0 |
| Timer minutes/seconds steppers | coss ui | Number Field (copied to `ui/`) + Label | https://coss.com/ui/r/number-field.json, https://coss.com/ui/r/label.json | AGPL-3.0 |

## Kept without a library equivalent (no hand-written replacement was made)

| Piece | Why |
|---|---|
| Ticker (marquee) | Part of the Live opening the owner chose. Motion Primitives' Infinite Slider is the closest match, but it needs `react-use-measure`, which is not installed. The CSS marquee already pauses on hover and focus and stops in still and reduced-motion modes |
| Keyed heading reveal | The site's one reveal motif, built to the Live direction. The library's text-reveal components (Motion Primitives Text Effect, Animate UI) are per-word fade-ups, the "uniform fade-up" the brief rejects |
| Placard deck, floor of nameplates, Orbit globe, resolution clauses, opening wipes, seven-segment clock | The owner's signature pieces: restyled, not replaced |
| Top-bar section links | No library has a top-nav component for plain in-page links (Base UI Navigation Menu is for dropdown panels). They are plain anchors with scroll-spy |
| Schedule list, contact roll, colour key | Editorial lists and tables of facts: layout glue, not controls |

## Layout references

The catalogue's inspiration galleries for restrained, institutional layouts are SiteInspire and Minimal Gallery (`by-category/inspiration-galleries.md`). They were **not browsed** in this pass. The two layout moves come from the brief's "serious, institutional" rule and from news and parliamentary page patterns:
- the asymmetric desk row;
- Contact as a colophon band at the foot of the page.
