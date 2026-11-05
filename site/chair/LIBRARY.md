# Chair (dais) dashboard: library components

Shared pieces are imported from `portal/`, not copied:
- the sign-in screen (`portal/screens/SignIn.tsx`, which takes an `AuthApi`)
- the theme tokens (`portal/theme.css`, imported by `chair/chair.css`) and `portal/portal.css` (wordmark, host mark and skip-link classes)
- the toast provider (`portal/lib/toast.tsx`)
- the coss ui files in `portal/ui/coss/`

New in `chair/`:

| Component | Library | Source | Licence | Used for |
|---|---|---|---|---|
| Table | coss ui | https://coss.com/ui/r/table.json | MIT | Papers table, rubric score grid, ranking (`chair/ui/coss/table.tsx`) |
| Dialog | coss ui | https://coss.com/ui/r/dialog.json | MIT | Approve and number, Return with comment, Open vote on a resolution, Add file (`chair/ui/coss/dialog.tsx`, wrapped by `chair/ui/form-dialog.tsx`) |
| Alert Dialog | coss ui | https://coss.com/ui/r/alert-dialog.json | MIT | Confirm: end session, close roll call, remove file, reset sample data (`chair/ui/coss/alert-dialog.tsx`, wrapped by `chair/ui/confirm.tsx`) |

The three files are copied from `admin/ui/coss/`, unchanged apart from the comment line. `confirm.tsx` follows the same pattern as `admin/ui/confirm.tsx`.

Reused from `portal/ui/coss/`:

| Component | Where |
|---|---|
| Sidebar | The desktop left rail with seven places |
| Segmented Control | The phone bottom bar; every row of pressable choices (`Choices` in `chair/ui/kit.tsx`): timer kind, vote target, majority, filters, file or link |
| Sheet | "More" on phones |
| Tabs | Roll call / Voting; Score / Ranking / Nominations / Criteria |
| Menu (radio items) | Marking a seat in the roll-call grid |
| Select | The committee switcher, seat pickers, session picker, file kind (`Pick` in `chair/ui/kit.tsx`) |
| Input, Textarea, Label, Checkbox | Every form |
| Button | Every action |
| Badge | Status tags: colour, icon and word (`Tag` in `chair/ui/kit.tsx`) |
| Card | Panels (`Panel` in `chair/ui/kit.tsx`) |
| Empty | Empty states |
| Alert | Load errors with retry |
| Skeleton | Loading states |
| Toast | Action confirmations and errors |

Icons come from lucide-react, which the repo already uses.

Hand-written, layout glue only:
- `chair/chair.css`: page width, the Run and two-column grids, the timer digit size (tabular mono), the roll-call seat grid, the drag-over line and the sticky first rubric column. Colours come from tokens only.
- Native HTML drag and drop on the speakers' list, with up and down buttons as the keyboard path.
- Plain `<input type=number>` cells in the rubric grid. They are dense, 1–10 quick entry, and Enter or the arrow keys move down a column.

No new npm dependency.
