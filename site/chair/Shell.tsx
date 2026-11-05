// The dais frame. Desktop first (a laptop on the dais): a coss ui Sidebar with the seven places and, when the
// chair runs more than one committee, a committee switcher. Phones: a bottom bar with four places plus "More"
// (a coss ui Sheet). The same pattern as the delegate and secretariat dashboards.
import type { ComponentType, ReactNode } from 'react';
import {
  Ellipsis, FileText, Files, Gavel, LogOut, Medal, MessageSquareText, RotateCcw, ScrollText, Timer, Vote, type LucideProps,
} from 'lucide-react';
import { resetDemoData, type ChairRole } from '@/platform/v2';
import { Confirm } from './ui/confirm';
import { cn } from '../portal/ui/coss/utils';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider,
} from '../portal/ui/coss/sidebar';
import { SegmentedControl, SegmentedControlItem } from '../portal/ui/coss/segmented-control';
import { Sheet, SheetPopup, SheetHeader, SheetTitle, SheetPanel, SheetTrigger, SheetClose } from '../portal/ui/coss/sheet';
import { Badge } from '../portal/ui/coss/badge';
import { Button } from '../portal/ui/coss/button';
import { href, useRoute, type Page } from './lib/route';
import { useChair } from './lib/data';
import { HostMark, Pick, Wordmark } from './ui/kit';

type Place = { id: Page; label: string; short?: string; icon: ComponentType<LucideProps> };
const PLACES: Place[] = [
  { id: 'run', label: 'Run session', short: 'Run', icon: Timer },
  { id: 'floor', label: 'Roll call and votes', short: 'Roll, vote', icon: Vote },
  { id: 'papers', label: 'Position papers', short: 'Papers', icon: FileText },
  { id: 'resolutions', label: 'Resolutions', short: 'Resos', icon: ScrollText },
  { id: 'chits', label: 'Chits', icon: MessageSquareText },
  { id: 'awards', label: 'Awards rubric', short: 'Awards', icon: Medal },
  { id: 'docs', label: 'Docs and notices', short: 'Docs', icon: Files },
];
const PHONE: Page[] = ['run', 'floor', 'resolutions', 'chits'];

const ROLE_WORD: Record<ChairRole, string> = { chair: 'Chair', vice_chair: 'Vice chair', rapporteur: 'Rapporteur' };

function CommitteeSwitch({ className }: { className?: string }) {
  const { committees, committee, setCommittee } = useChair();
  if (committees.length < 2) {
    return (
      <p className={cn('min-w-0 truncate font-label text-lg font-semibold', className)}>
        {committee.abbr} <span className="font-semibold text-muted-foreground">· {ROLE_WORD[committee.myRole]}</span>
      </p>
    );
  }
  return (
    <div className={cn('min-w-0', className)}>
      <Pick
        label="Committee"
        value={committee.id}
        onChange={(v) => v && setCommittee(v)}
        placeholder="Choose a committee"
        options={committees.map((c) => ({ value: c.id, label: `${c.abbr} · ${ROLE_WORD[c.myRole]}` }))}
      />
    </div>
  );
}

function DemoMarker() {
  const { bump } = useChair();
  return (
    <div className="flex items-center">
      <Badge variant="outline" className="h-11 shrink-0 gap-2 rounded-none border-dashed border-e-0 bg-transparent px-3 text-sm font-medium text-muted-foreground dark:bg-transparent sm:h-11 sm:text-sm max-md:px-2">
        <span className="size-2 bg-warning" aria-hidden="true" />
        <span className="max-md:hidden">Sample data · demo</span><span className="md:hidden">Demo</span>
      </Badge>
      <Confirm
        title="Reset the sample data?"
        line="Every demo tab goes back to the starting samples."
        confirm="Reset"
        danger
        onConfirm={() => { resetDemoData(); bump('all'); }}
        trigger={<Button variant="outline" size="sm" className="rounded-none" aria-label="Reset sample data"><RotateCcw aria-hidden="true" /><span className="max-lg:hidden">Reset</span></Button>}
      />
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { api, me, committee } = useChair();
  const { page } = useRoute();
  const phone = PLACES.filter((p) => PHONE.includes(p.id));
  const more = PLACES.filter((p) => !PHONE.includes(p.id));
  const signOut = () => void api.signOut();

  return (
    <SidebarProvider className="app">
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>

      <div className="sticky top-0 hidden h-svh w-60 shrink-0 md:block max-[1100px]:w-52">
        <Sidebar collapsible="none" className="h-svh w-full border-e">
          <SidebarHeader className="h-15 flex-row items-center border-b px-4 py-0">
            <a className="flex min-h-11 items-center gap-2.5 no-underline" href={href('run')} aria-label="DXB MUN dais, run session">
              <Wordmark />
              <span className="font-label text-[15px] font-semibold uppercase text-muted-foreground tracking-[0.06em]">Dais</span>
            </a>
          </SidebarHeader>
          <SidebarContent>
            <div className="border-b px-3 py-3">
              <p className="mb-1 px-1 text-sm text-muted-foreground">Committee</p>
              <CommitteeSwitch className="px-1" />
            </div>
            <SidebarGroup className="px-2.5 py-2">
              <nav aria-label="Main" data-nav="sidebar">
                <SidebarMenu>
                  {PLACES.map((p) => {
                    const on = p.id === page;
                    const Icon = p.icon;
                    return (
                      <SidebarMenuItem key={p.id}>
                        <SidebarMenuButton
                          isActive={on}
                          render={<a href={href(p.id)} aria-current={on ? 'page' : undefined} />}
                          className="h-11 gap-3 rounded-none border-s-4 border-transparent px-3 font-label text-[18px] font-semibold text-sidebar-foreground data-[active=true]:border-primary data-[active=true]:font-bold data-[active=true]:text-foreground"
                        >
                          <Icon size={20} aria-hidden="true" className={cn(on && 'text-primary')} />
                          <span className="truncate">{p.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </nav>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="gap-2 p-3">
            <div className="min-w-0 px-1 text-sm">
              <p className="truncate font-semibold text-foreground">{me.fullName ?? me.email}</p>
              <p className="text-muted-foreground">{ROLE_WORD[committee.myRole]}, {committee.abbr}</p>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={signOut}><LogOut aria-hidden="true" /> Sign out</Button>
            <HostMark className="w-full" />
          </SidebarFooter>
        </Sidebar>
      </div>

      <div className="chair-body flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-15 items-center gap-4 border-b bg-background px-7 max-md:h-14 max-md:gap-2.5 max-md:px-4">
          <a className="inline-flex min-h-11 shrink-0 items-center md:hidden" href={href('run')} aria-label="DXB MUN dais, run session"><Wordmark /></a>
          <p className="flex min-w-0 items-center gap-2 font-label text-[15px] font-semibold uppercase max-md:hidden tracking-[0.06em]">
            <Gavel size={18} aria-hidden="true" className="text-primary" />
            <span className="truncate">{committee.name}</span>
            <span className="text-muted-foreground">· {committee.room ? `Room ${committee.room}` : 'Room: To be announced'}</span>
          </p>
          <CommitteeSwitch className="min-w-0 flex-1 md:hidden" />
          <div className="ms-auto flex shrink-0 items-center">{api.mode === 'demo' && <DemoMarker />}</div>
        </header>
        <main id="main" className="chair-main" tabIndex={-1}>{children}</main>
      </div>

      <SegmentedControl
        render={<nav aria-label="Main" data-nav="tabs" />}
        className="fixed inset-x-0 bottom-0 z-60 grid w-full grid-cols-5 gap-0 rounded-none border-t bg-background p-0 pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      >
        {phone.map((p) => {
          const on = p.id === page;
          const Icon = p.icon;
          return (
            <SegmentedControlItem key={p.id} render={<a href={href(p.id)} aria-current={on ? 'page' : undefined} />} className={tabCls}>
              <Icon size={22} aria-hidden="true" className={cn(on && 'text-primary')} />
              <span className="text-[14px]">{p.short ?? p.label}</span>
            </SegmentedControlItem>
          );
        })}
        <Sheet>
          <SheetTrigger
            render={<button type="button" aria-current={more.some((p) => p.id === page) ? 'page' : undefined} />}
            className={cn(tabCls, 'inline-flex items-center justify-center')}
          >
            <Ellipsis size={22} aria-hidden="true" />
            <span className="text-[14px]">More</span>
          </SheetTrigger>
          <SheetPopup side="bottom" className="rounded-none">
            <SheetHeader className="pb-2"><SheetTitle className="font-heading text-2xl font-semibold tracking-[-0.01em]">More</SheetTitle></SheetHeader>
            <SheetPanel className="flex flex-col gap-1 pb-6">
              {more.map((p) => {
                const Icon = p.icon;
                return (
                  <SheetClose key={p.id} render={<a href={href(p.id)} aria-current={p.id === page ? 'page' : undefined} />}
                    className="flex min-h-12 items-center gap-3 border-s-4 border-transparent px-3 font-label text-xl font-semibold no-underline aria-[current=page]:border-primary">
                    <Icon size={20} aria-hidden="true" className="text-primary" /> {p.label}
                  </SheetClose>
                );
              })}
              <p className="mt-3 px-3 text-sm text-muted-foreground">{me.fullName ?? me.email} · {ROLE_WORD[committee.myRole]}, {committee.abbr}</p>
              <Button variant="outline" className="mt-1" onClick={signOut}><LogOut aria-hidden="true" /> Sign out</Button>
            </SheetPanel>
          </SheetPopup>
        </Sheet>
      </SegmentedControl>
    </SidebarProvider>
  );
}

const tabCls = 'h-18 min-w-0 flex-col gap-0.75 rounded-none border-0 border-t-3 border-t-transparent px-0 pt-1.5 pb-1 font-label font-semibold text-muted-foreground hover:text-foreground aria-[current=page]:border-t-primary aria-[current=page]:bg-card aria-[current=page]:text-foreground aria-[current=page]:shadow-none sm:h-18 dark:aria-[current=page]:bg-card';
