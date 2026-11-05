# Delegate dashboard (v2): where each component comes from

Rule (SYSTEM.md): every visible building block comes from a library, then gets our semantic tokens
(`portal/theme.css`, owned by the lead). Hand-written CSS (`portal/portal.css`) is only layout glue, the brand
marks and the DXB MUN nameplate, and uses theme tokens only (no hex values).

## Licence warning: coss ui is AGPL-3.0

The coss ui components are copied from the `cosscom/coss` repository. Its root `LICENSE` is **AGPL-3.0**, and
`packages/ui` has no licence file of its own, so the AGPL applies to the copied files. If the owner cannot accept
AGPL obligations, the MIT alternative is **Base CN** (basecn.dev, Base UI + Tailwind, the same shape of API).
Each copied file names its source URL in its first line.

## Components

| Piece in the dashboard | Library | Component | URL | Licence |
|---|---|---|---|---|
| Sign-in card (email step and code step); sign-up and waiting cards | coss ui | Card, auth card particle p-card-2 | https://coss.com/ui/r/card.json | AGPL-3.0 |
| 6–10 digit code box (one input, paste auto-submits) | coss ui | Input | https://coss.com/ui/r/input.json | AGPL-3.0 |
| Buttons, the big **+**, vote placards, roll-call buttons, tag chips (POI / Doubt / Speech point / General), Write/Upload and File/Link toggles (`aria-pressed`) | coss ui | Button | https://coss.com/ui/r/button.json | AGPL-3.0 |
| Loading spinner inside buttons | coss ui | Spinner | https://coss.com/ui/r/spinner.json | AGPL-3.0 |
| Every panel, the vote and roll-call takeover cards | coss ui | Card | https://coss.com/ui/r/card.json | AGPL-3.0 |
| Status (colour + icon + word): paper, resolution, chit, speaker, roll call, timer state, urgent | coss ui | Badge (outline), see `ui/status.tsx` | https://coss.com/ui/r/badge.json | AGPL-3.0 |
| Form fields, labels, hints | coss ui | Field, Label, Fieldset | https://coss.com/ui/r/field.json | AGPL-3.0 |
| Text inputs, quick-note box, seat filter | coss ui | Input | https://coss.com/ui/r/input.json | AGPL-3.0 |
| Working paper text, chit message | coss ui | Textarea | https://coss.com/ui/r/textarea.json | AGPL-3.0 |
| Committee choices, chit recipient, file kind | coss ui | Select | https://coss.com/ui/r/select.json | AGPL-3.0 |
| Sponsors, signatories, file sharing (`ui/SeatPicker.tsx`); "done" tick on my notes | coss ui | Checkbox (+ Input filter, Badge chips) | https://coss.com/ui/r/checkbox.json | AGPL-3.0 |
| Notes tabs (Chits / My notes), Inbox / Sent | coss ui | Tabs (underline) | https://coss.com/ui/r/tabs.json | AGPL-3.0 |
| Toasts (actions, new chit, vote or roll call open, urgent announcement) | coss ui (Base UI Toast) | Toast | https://coss.com/ui/r/toast.json | AGPL-3.0 |
| Announcements (bell), My seat and QR, the phone "More" sheet, Add file or link, Share | coss ui | Sheet | https://coss.com/ui/r/sheet.json | AGPL-3.0 |
| Loading placeholders | coss ui | Skeleton | https://coss.com/ui/r/skeleton.json | AGPL-3.0 |
| Empty and locked states | coss ui | Empty, particle p-empty-1 | https://coss.com/ui/r/empty.json | AGPL-3.0 |
| Load errors, "Conference has ended" banner, returned-with-comment | coss ui | Alert | https://coss.com/ui/r/alert.json | AGPL-3.0 |
| Desktop navigation (7 places) | coss ui | Sidebar (`collapsible="none"`), with Scroll Area, Separator, Sheet, Tooltip as its dependencies | https://coss.com/ui/r/sidebar.json | AGPL-3.0 |
| Phone bottom bar (4 places + More) | coss ui | Segmented Control, items rendered as links (the coss navigation particle pattern) | https://coss.com/ui/r/segmented-control.json | AGPL-3.0 |
| Demo scenario switcher, "Reset sample data" | coss ui | Menu (radio group + item) | https://coss.com/ui/r/menu.json | AGPL-3.0 |
| `cn()` helper, media-query hook | coss ui | utils, use-media-query | https://coss.com/ui/r/utils.json | AGPL-3.0 |
| Speakers, resolutions, chits, notes, files, schedule, announcements rows | Base CN | Item, Item Group | https://basecn.dev/r/item.json | MIT |
| Primitives under all of the above | Base UI | (dependency) | https://base-ui.com | MIT |
| Icons | Lucide | lucide-react | https://lucide.dev | ISC |
| Check-in QR | qrcode.react | QRCodeSVG | https://github.com/zpao/qrcode.react | ISC |

Copied earlier and not used by the v2 delegate dashboard (left in `ui/coss/` for the other dashboards):
Radio Group, Form, Checkbox Group, OTP Field.

## Where no library has the component

| Piece | What we did |
|---|---|
| **Timer digits** (`ui/timer.tsx`) | Typography only: Geist Mono, sized to the container (`cqi`), warning colour under 10 s and destructive at 0, each with an icon and a word (coss Badge). |
| **Drop zone** (`ui/DropZone.tsx`) | No coss/shadcn/Base CN drop zone fits. A dashed box (layout glue) around a coss Button that opens a hidden native file input; drag-and-drop on the box. |
| **Seat nameplate** | The DXB MUN signature element, hand-built in `portal.css` (`.plate`). Its fold band is IHS maroon. |
| **Phone bottom bar** | No library ships one. coss Segmented Control with link items, fixed to the bottom. |
| **"Hosted by Indian High School" mark, wordmark** | Brand marks in `portal.css` (`.host`, `.wm`). |
| **Description lists (Facts), page heading** | Plain HTML with Tailwind utilities. |

## For the chair and admin dashboards

The sign-in screen is `portal/screens/SignIn.tsx` and now takes any v2 `AuthApi`:
`<SignIn api={getChairApi()} title="Chair dashboard" showScenarios={false} tagline="…" />`. The props are unchanged.
The demo marker/scenario menu moved to `portal/ui/DemoControls.tsx`. Status badges: `portal/ui/status.tsx`.
Timer: `portal/ui/timer.tsx` (`BigTimer`, `SlimTimer`) and `portal/lib/clock.ts` (`remainingOf`, `clockText`).
