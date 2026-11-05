// Demo marker plus a compact scenario switcher (coss ui Menu, radio group). Visually secondary: it is for
// the owner. `menu={false}` keeps the "Sample data" marker but hides the menu. Live mode renders nothing.
import { ChevronDown, RotateCcw } from 'lucide-react';
import { currentDemoScenario, resetDemoData, type AuthApi } from '@/platform/v2';
import { Badge } from './coss/badge';
import { Menu, MenuItem, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger } from './coss/menu';

export const SCENARIOS = [
  { id: 'new', label: 'New', line: 'Signed in, not signed up' },
  { id: 'applied', label: 'Applied', line: 'Waiting for a seat' },
  { id: 'seated', label: 'Seated', line: 'Seat given, before the day' },
  { id: 'live', label: 'Live', line: 'Conference day, in session' },
  { id: 'after', label: 'After', line: 'Conference has ended' },
] as const;

export function switchScenario(id: string) {
  const u = new URL(location.href);
  u.searchParams.set('demo', id);
  u.hash = '#/now';
  location.assign(u.toString());
}

export function DemoControls({ api, menu = true, className }: { api: Pick<AuthApi, 'mode'>; menu?: boolean; className?: string }) {
  if (api.mode !== 'demo') return null;
  const now = currentDemoScenario();
  return (
    <div className={className ?? 'ms-auto flex min-w-0 items-center'}>
      <Badge variant="outline" className="h-11 gap-2 rounded-none border-dashed border-e-0 bg-transparent px-3 text-sm font-medium text-muted-foreground dark:bg-transparent sm:h-11 sm:text-sm max-md:hidden">
        <span className="size-2 bg-warning" aria-hidden="true" />
        Sample data
      </Badge>
      {menu ? (
        <Menu>
          <MenuTrigger
            className="inline-flex h-11 items-center gap-1.5 border border-input px-3 text-sm text-muted-foreground hover:text-foreground data-popup-open:text-foreground max-md:border-dashed max-md:px-2"
            aria-label={`Sample data. Demo scenario: ${now}. Change scenario`}
          >
            <span className="size-2 bg-warning md:hidden" aria-hidden="true" />
            <span className="max-md:hidden">Scenario</span>
            <span className="font-semibold capitalize text-foreground">{now}</span>
            <ChevronDown size={16} aria-hidden="true" />
          </MenuTrigger>
          <MenuPopup align="end" sideOffset={6} className="min-w-64 rounded-sm">
            <MenuRadioGroup value={now} onValueChange={(v) => switchScenario(String(v))}>
              {SCENARIOS.map((s) => (
                <MenuRadioItem key={s.id} value={s.id} closeOnClick className="min-h-12 py-1.5 sm:min-h-12">
                  <span className="flex flex-col">
                    <span className="font-label text-xl font-semibold leading-tight">{s.label}</span>
                    <span className="text-sm text-muted-foreground">{s.line}</span>
                  </span>
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
            <MenuSeparator />
            <MenuItem className="min-h-12 gap-2 sm:min-h-12" onClick={() => { resetDemoData(); location.reload(); }}>
              <RotateCcw size={16} aria-hidden="true" /> Reset sample data
            </MenuItem>
          </MenuPopup>
        </Menu>
      ) : (
        <Badge variant="outline" className="h-11 rounded-none border-dashed bg-transparent px-2 text-sm text-muted-foreground dark:bg-transparent md:hidden">
          <span className="size-2 bg-warning" aria-hidden="true" /> Sample
        </Badge>
      )}
    </div>
  );
}
