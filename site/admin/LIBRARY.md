# Secretariat dashboard: library components

Built from the design library (coss ui first). Data comes only from `@/platform/v2` (`getSecretariatApi()`).

## Copied into `admin/ui/coss/` (unchanged except import paths)

| Component | Library | Source | Used for |
|---|---|---|---|
| Table | coss ui | https://coss.com/ui/r/table.json | Live overview, Delegates, Seats, Committees, Team access, Awards ranking (desktop) |
| Dialog | coss ui | https://coss.com/ui/r/dialog.json | Assign seat, Add / edit committee, Add chair, Schedule item, Add document |
| Alert Dialog | coss ui | https://coss.com/ui/r/alert-dialog.json | Confirm steps: phase switch, remove schedule item, remove document, remove announcement (`admin/ui/confirm.tsx`) |
| Switch | coss ui | https://coss.com/ui/r/switch.json | Urgent toggle (Announcements), core level (Team access), lock as final (Awards) |

## Reused by import from `portal/ui/coss/` (never edited)

Sidebar (desktop nav), Segmented Control (phone bottom bar, place tabs, phase switch, day pickers, capacity, file / link), Sheet ("More" on phones), Menu (row actions), Select (through `Choice` in `admin/ui/kit.tsx`), Input, Textarea, Label, Field, Badge, Button, Card, Empty, Alert, Skeleton, Toast.

Also reused: the shared sign-in screen `portal/screens/SignIn.tsx`, and the tokens in `portal/theme.css`.

## Hand-written (layout glue and typography only)

- `admin/admin.css`: page width, the sticky-header table scroll box, the wordmark and the IHS host mark, the big check-in code field. Colours are theme tokens only.
- `admin/ui/kit.tsx`: thin compositions of the coss parts above: the status Tag (coss Badge: colour + icon + word), the page heading, Panel (coss Card), Empty (coss Empty), ErrorBox (coss Alert), Choice (coss Select), Field (coss Field), and Dubai-time helpers.
- `admin/lib/toast.tsx`: the coss Toast provider with one helper.

No new npm dependency. The check-in camera uses the browser's built-in `BarcodeDetector`.
