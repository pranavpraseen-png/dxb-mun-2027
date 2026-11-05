// The frame around every screen.
//   Desktop: a coss ui Sidebar with the seven places, and a top bar with my seat, the agenda item, the slim
//   live timer, the announcements bell and the demo marker.
//   Phones: the same top bar (two rows while live) and a bottom bar with five places, the fifth being
//   "More" (a coss ui Sheet with Paper, Files, Schedule, Announcements, My seat and Sign out).
import { useState, type ReactNode } from 'react';
import {
  CalendarDays, CircleAlert, Ellipsis, FileText, FolderOpen, LogOut, Mic, NotebookPen, QrCode, ScrollText, Timer as TimerIcon,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { DelegateApi } from '@/platform/v2';
import { useConf } from './lib/conf';
import { useLoad } from './lib/data';
import { href, useRoute, type Place } from './lib/route';
import { HostMark, Wordmark } from './ui/kit';
import { cn } from './ui/coss/utils';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider,
} from './ui/coss/sidebar';
import { SegmentedControl, SegmentedControlItem } from './ui/coss/segmented-control';
import { Sheet, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from './ui/coss/sheet';
import { Button } from './ui/coss/button';
import { Alert, AlertDescription, AlertTitle } from './ui/coss/alert';
import { DemoControls } from './ui/DemoControls';
import { AnnouncementsBell } from './ui/announcements';
import { SlimTimer } from './ui/timer';
import { CheckinQr, SeatFacts, SeatPlate, TBA } from './ui/seat';

type PlaceDef = { id: Place; label: string; icon: ComponentType<LucideProps> };
export const PLACES: PlaceDef[] = [
  { id: 'now', label: 'Now', icon: TimerIcon },
  { id: 'speakers', label: 'Speakers', icon: Mic },
  { id: 'resolutions', label: 'Resolutions', icon: ScrollText },
  { id: 'paper', label: 'Paper', icon: FileText },
  { id: 'notes', label: 'Notes', icon: NotebookPen },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
];
const PHONE_BAR: Place[] = ['now', 'speakers', 'resolutions', 'notes'];
const place = (id: Place) => PLACES.find((p) => p.id === id)!;

function PlaceLabel({ p, badge, on, compact }: { p: PlaceDef; badge?: string; on: boolean; compact?: boolean }) {
  const Icon = p.icon;
  return (
    <>
      <span className="relative inline-flex">
        <Icon size={24} aria-hidden="true" strokeWidth={on ? 2.4 : 2} className={cn(on && 'text-primary')} />
        {badge && <span className="absolute -top-0.75 -right-1.25 size-2.75 rounded-full bg-primary ring-2 ring-background" aria-hidden="true" />}
      </span>
      <span className={cn(compact ? 'text-[13px]' : 'text-[21px]')}>{p.label}</span>
      {badge && <span className="sr-only">({badge})</span>}
    </>
  );
}

export function Shell({ api, badges, children }: { api: DelegateApi; badges: Partial<Record<Place, string>>; children: ReactNode }) {
  const route = useRoute();
  const { seat, phase, readOnly } = useConf();
  const live = useLoad((a) => (phase === 'live' ? a.live() : Promise.resolve(null)), ['live'], [phase]);
  const L = live.data ?? null;
  const [bell, setBell] = useState(false);
  const [seatOpen, setSeatOpen] = useState(false);
  const [more, setMore] = useState(false);
  const here = route.page;
  const room = L?.room ?? seat.room;
  const agenda = L ? [L.agendaItem, L.currentMotion].filter(Boolean).join(' · ') || null : null;
  const signOut = () => { void api.signOut(); };

  return (
    <SidebarProvider className="app">
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to content
      </a>

      {/* Desktop: coss ui Sidebar, always expanded. */}
      <div className="sticky top-0 hidden h-svh w-58 shrink-0 md:block max-[1100px]:w-52">
        <Sidebar collapsible="none" className="h-svh w-full border-e">
          <SidebarHeader className="h-15 flex-row items-center border-b px-4.5 py-0">
            <a className="flex min-h-11 items-center gap-2.5 no-underline" href={href('now')} aria-label="DXB MUN delegate dashboard, Now">
              <Wordmark />
              <span className="font-label text-[13px] font-semibold uppercase text-muted-foreground max-[1100px]:hidden tracking-[0.06em]">Delegate</span>
            </a>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup className="px-3 py-2">
              <nav aria-label="Main" data-nav="sidebar">
                <SidebarMenu>
                  {PLACES.map((p) => {
                    const on = p.id === here;
                    return (
                      <SidebarMenuItem key={p.id}>
                        <SidebarMenuButton
                          isActive={on}
                          render={<a href={href(p.id)} aria-current={on ? 'page' : undefined} />}
                          className="h-13 gap-3.5 rounded-none border-s-4 border-transparent px-3.5 font-label font-semibold text-sidebar-foreground data-[active=true]:border-primary data-[active=true]:font-bold data-[active=true]:text-foreground [&>span:last-child]:overflow-visible"
                        >
                          <PlaceLabel p={p} badge={badges[p.id]} on={on} />
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </nav>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="gap-2 p-3">
            <Button variant="outline" className="w-full justify-start" onClick={() => setSeatOpen(true)}>
              <QrCode aria-hidden="true" /> My seat and QR
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
              <LogOut aria-hidden="true" /> Sign out
            </Button>
            <HostMark className="w-full" />
          </SidebarFooter>
        </Sidebar>
      </div>

      <div className="app-body flex min-w-0 flex-1 flex-col">
        <HostMark className="w-full flex-row items-baseline justify-center gap-2 border-l-0 border-t-2 border-t-gold py-1.5 md:hidden" />
        <header className="sticky top-0 z-30 border-b bg-background">
          <div className="flex h-15 items-center gap-3 px-6 max-[1100px]:px-5 max-md:h-14 max-md:gap-2 max-md:px-4">
            <button
              type="button"
              onClick={() => setSeatOpen(true)}
              className="flex min-h-11 min-w-0 shrink items-baseline gap-2 text-left hover:text-primary"
              aria-label={`My seat: ${seat.seat.label}, ${seat.committee.abbr}, room ${room ?? TBA}. Show seat and check-in QR`}
            >
              <span className="truncate font-heading text-[24px] font-semibold leading-[1.1] max-md:text-[20px] tracking-[-0.01em]">{seat.seat.label}</span>
              <span className="shrink-0 font-mono text-lg font-medium text-primary max-md:text-base">{seat.committee.abbr}</span>
              <span className="truncate text-[15px] text-muted-foreground max-md:hidden">{room ? `Room ${room}` : 'Room to be announced'}</span>
            </button>
            {agenda && <span className="min-w-0 flex-1 truncate border-s ps-3 text-[16px] max-lg:hidden" title={agenda}>{agenda}</span>}
            <span className="ms-auto flex shrink-0 items-center gap-2">
              {L && <SlimTimer timer={L.timer} className="max-w-72 max-md:hidden" />}
              <AnnouncementsBell open={bell} onOpenChange={setBell} />
              <DemoControls api={api} className="flex min-w-0 items-center" />
            </span>
          </div>
          {L && (
            <div className="flex flex-col gap-1 border-t px-4 py-1.5 md:hidden lg:hidden">
              <SlimTimer timer={L.timer} className="w-full" />
              {agenda && <p className="truncate text-[15px] text-muted-foreground">{agenda}</p>}
            </div>
          )}
          {L && agenda && <p className="hidden truncate border-t px-6 py-1.5 text-[15px] md:block lg:hidden">{agenda}</p>}
        </header>
        <main id="main" className="main" tabIndex={-1}>
          {readOnly && (
            <Alert variant="warning" className="rounded-sm">
              <CircleAlert aria-hidden="true" />
              <AlertTitle className="font-heading text-xl font-semibold">Conference has ended</AlertTitle>
              <AlertDescription className="text-base">Everything is read-only. You can still open your papers, resolutions and notes.</AlertDescription>
            </Alert>
          )}
          {children}
        </main>
      </div>

      {/* Phones: bottom bar, four places plus More (coss ui Segmented Control items as links). */}
      <SegmentedControl
        render={<nav aria-label="Main" data-nav="tabs" />}
        className="fixed inset-x-0 bottom-0 z-40 grid w-full grid-cols-5 gap-0 rounded-none border-t bg-background p-0 pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      >
        {PHONE_BAR.map((id) => {
          const p = place(id);
          const on = id === here;
          return (
            <SegmentedControlItem
              key={id}
              render={<a href={href(id)} aria-current={on ? 'page' : undefined} />}
              className={TAB}
            >
              <PlaceLabel p={p} badge={badges[id]} on={on} compact />
            </SegmentedControlItem>
          );
        })}
        <SegmentedControlItem
          render={<button type="button" aria-haspopup="dialog" aria-current={!PHONE_BAR.includes(here) ? 'page' : undefined} onClick={() => setMore(true)} />}
          className={TAB}
        >
          <PlaceLabel
            p={{ id: here, label: PHONE_BAR.includes(here) ? 'More' : place(here).label, icon: PHONE_BAR.includes(here) ? Ellipsis : place(here).icon }}
            on={!PHONE_BAR.includes(here)}
            badge={(['paper', 'files', 'schedule'] as Place[]).map((id) => badges[id]).find(Boolean)}
            compact
          />
        </SegmentedControlItem>
      </SegmentedControl>

      <Sheet open={more} onOpenChange={setMore}>
        <SheetPopup side="bottom">
          <SheetHeader className="pe-14"><SheetTitle className="font-heading text-[28px] font-semibold tracking-[-0.01em]">More</SheetTitle></SheetHeader>
          <SheetPanel className="pt-0!">
            <nav aria-label="More places" className="flex flex-col divide-y border-y">
              {PLACES.filter((p) => !PHONE_BAR.includes(p.id)).map((p) => {
                const Icon = p.icon;
                return (
                  <a
                    key={p.id} href={href(p.id)} onClick={() => setMore(false)} aria-current={p.id === here ? 'page' : undefined}
                    className="flex min-h-14 items-center gap-3.5 font-label text-xl font-semibold no-underline aria-[current=page]:text-primary"
                  >
                    <Icon aria-hidden="true" className="size-6 text-primary" /> {p.label}
                    {badges[p.id] && <span className="ms-auto text-base font-semibold normal-case text-primary">{badges[p.id]}</span>}
                  </a>
                );
              })}
              <button type="button" className={MORE_BTN} onClick={() => { setMore(false); setSeatOpen(true); }}>
                <QrCode aria-hidden="true" className="size-6 text-primary" /> My seat and QR
              </button>
              <button type="button" className={MORE_BTN} onClick={signOut}>
                <LogOut aria-hidden="true" className="size-6 text-muted-foreground" /> Sign out
              </button>
            </nav>
          </SheetPanel>
        </SheetPopup>
      </Sheet>

      <Sheet open={seatOpen} onOpenChange={setSeatOpen}>
        <SheetPopup side="right" className="max-w-lg">
          <SheetHeader className="pe-14"><SheetTitle className="font-heading text-[30px] font-semibold tracking-[-0.01em]">My seat</SheetTitle></SheetHeader>
          <SheetPanel className="flex flex-col gap-5 pt-1!">
            <SeatPlate seat={seat} />
            <SeatFacts seat={seat} />
            <CheckinQr seat={seat} />
          </SheetPanel>
        </SheetPopup>
      </Sheet>
    </SidebarProvider>
  );
}

const TAB = 'h-18 min-w-0 flex-col gap-0.75 rounded-none border-0 border-t-3 border-t-transparent px-0 pt-1.5 pb-1 font-label font-semibold text-muted-foreground hover:text-foreground aria-[current=page]:border-t-primary aria-[current=page]:bg-card aria-[current=page]:text-foreground aria-[current=page]:shadow-none sm:h-18 dark:aria-[current=page]:bg-card';
const MORE_BTN = 'flex min-h-14 items-center gap-3.5 text-left font-label text-xl font-semibold';
