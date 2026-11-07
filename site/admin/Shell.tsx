// The secretariat frame: a coss ui Sidebar on desktop with the seven places, and on phones a bottom bar
// with four places plus "More" (a coss ui Sheet). A place with two pages shows them as tabs (coss Segmented
// Control, rendered as links) under the top bar.
import type { ComponentType, ReactNode } from 'react';
import {
  Armchair, CalendarDays, Ellipsis, KeyRound, Landmark, LogOut, Megaphone, MonitorDot, ScanLine, type LucideProps,
} from 'lucide-react';
import { NO_LOGIN, type Me, type Phase } from '@/platform/v2';
import { cn } from '../portal/ui/coss/utils';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider,
} from '../portal/ui/coss/sidebar';
import { SegmentedControl, SegmentedControlItem } from '../portal/ui/coss/segmented-control';
import { Sheet, SheetPopup, SheetHeader, SheetTitle, SheetPanel, SheetTrigger, SheetClose } from '../portal/ui/coss/sheet';
import { Button } from '../portal/ui/coss/button';
import { PLACES, href, placeOf, useRoute, type PlaceId } from './lib/route';
import { useAdmin, useLoad } from './lib/data';
import { HostMark, Tag, Wordmark, type Tone } from './ui/kit';
import { Ambient, ambientOn } from '../portal/ui/Ambient';

/** Dashboard ambient (preview with ?calm=1 until it goes live). Read once per page load. */
const calm = ambientOn();

const ICON: Record<PlaceId, ComponentType<LucideProps>> = {
  live: MonitorDot, delegates: Armchair, committees: Landmark, programme: CalendarDays, notices: Megaphone, checkin: ScanLine, team: KeyRound,
};
const PHONE: PlaceId[] = ['live', 'delegates', 'checkin', 'notices'];

/** Team access is for core secretariat only. */
export const placesFor = (me: Me) => PLACES.filter((p) => p.id !== 'team' || me.isCore);

const PHASE_TAG: Record<Phase, { tone: Tone; word: string }> = {
  before: { tone: 'waiting', word: 'Before the conference' },
  live: { tone: 'live', word: 'Conference live' },
  after: { tone: 'locked', word: 'After the conference' },
};

export function PhaseTag() {
  const phase = useLoad((a) => a.phase(), [], ['phase']);
  if (!phase.data) return null;
  const t = PHASE_TAG[phase.data];
  return <Tag tone={t.tone}>{t.word}</Tag>;
}

const level = (m: Me) => (m.isCore ? 'Core secretariat' : 'Secretariat');

export function Shell({ children }: { children: ReactNode }) {
  const { api, me } = useAdmin();
  const { page } = useRoute();
  const here = placeOf(page);
  const places = placesFor(me);
  const phone = places.filter((p) => PHONE.includes(p.id));
  const more = places.filter((p) => !PHONE.includes(p.id));
  const signOut = () => void api.signOut();
  const first = (id: PlaceId) => href(PLACES.find((p) => p.id === id)!.pages[0].id);

  return (
    <SidebarProvider className="app">
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>

      <div className="sticky top-0 hidden h-svh w-60 shrink-0 md:block max-[1100px]:w-52">
        <Sidebar collapsible="none" className="h-svh w-full border-e">
          <SidebarHeader className="h-15 flex-row items-center border-b px-4 py-0">
            <a className="flex min-h-11 items-center gap-2.5 no-underline" href={first('live')} aria-label="DXB MUN secretariat, live overview">
              <Wordmark />
              <span className="min-w-0 truncate text-[14px] font-semibold text-muted-foreground">Secretariat</span>
            </a>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup className="px-2.5 py-2">
              <nav aria-label="Main" data-nav="sidebar">
                <SidebarMenu>
                  {places.map((p) => {
                    const on = p.id === here.id;
                    const Icon = ICON[p.id];
                    return (
                      <SidebarMenuItem key={p.id}>
                        <SidebarMenuButton
                          isActive={on}
                          render={<a href={first(p.id)} aria-current={on ? 'page' : undefined} />}
                          className="h-auto min-h-11 gap-3 rounded-none border-s-4 border-transparent px-3 py-2 font-label text-[18px] font-semibold leading-tight text-sidebar-foreground data-[active=true]:border-primary data-[active=true]:font-bold data-[active=true]:text-foreground [&>span:last-child]:overflow-visible [&>span:last-child]:whitespace-normal"
                        >
                          <Icon size={20} aria-hidden="true" className={cn('shrink-0', on && 'text-primary')} />
                          <span className="whitespace-normal">{p.label}</span>
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
              <p className="text-muted-foreground">{level(me)}</p>
            </div>
            {!NO_LOGIN && <Button variant="outline" size="sm" className="w-full" onClick={signOut}><LogOut aria-hidden="true" /> Sign out</Button>}
            <HostMark className="w-full" />
          </SidebarFooter>
        </Sidebar>
      </div>

      <div className="admin-body isolate flex min-w-0 flex-1 flex-col">
        {calm && <Ambient />}
        <header className="sticky top-0 z-30 flex min-h-15 items-center gap-3 border-b bg-background px-7 max-md:min-h-14 max-md:gap-2 max-md:px-4">
          <a className="inline-flex min-h-11 items-center md:hidden" href={first('live')} aria-label="DXB MUN secretariat, live overview"><Wordmark /></a>
          <span className="font-mono text-[14px] font-medium uppercase text-muted-foreground max-lg:hidden tracking-[0.08em]">Secretariat dashboard</span>
          <div className="ms-auto flex min-w-0 items-center gap-2">
            <PhaseTag />
          </div>
        </header>
        {here.pages.length > 1 && (
          <div className="border-b px-7 py-2 max-md:px-4">
            <SegmentedControl render={<nav aria-label={here.label} />} className="rounded-none">
              {here.pages.map((pg) => (
                <SegmentedControlItem
                  key={pg.id}
                  render={<a href={href(pg.id)} aria-current={pg.id === page ? 'page' : undefined} />}
                  className="h-10 px-4 font-label text-[17px] font-semibold sm:h-10 sm:text-[17px]"
                >
                  {pg.label}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>
        )}
        <main id="main" className="admin-main" tabIndex={-1}>{children}</main>
      </div>

      <SegmentedControl
        render={<nav aria-label="Main" data-nav="tabs" />}
        className="fixed inset-x-0 bottom-0 z-60 grid w-full grid-cols-5 gap-0 rounded-none border-t bg-background p-0 pb-[env(safe-area-inset-bottom,0px)] md:hidden dash:[&>[data-slot=segmented-control-indicator]]:bg-raised"
      >
        {phone.map((p) => {
          const on = p.id === here.id;
          const Icon = ICON[p.id];
          return (
            <SegmentedControlItem key={p.id} render={<a href={first(p.id)} aria-current={on ? 'page' : undefined} />} className={tabCls}>
              <Icon size={22} aria-hidden="true" className={cn(on && 'text-primary')} />
              <span className="text-[14px]">{p.short}</span>
            </SegmentedControlItem>
          );
        })}
        <Sheet>
          <SheetTrigger
            render={<button type="button" aria-current={more.some((p) => p.id === here.id) ? 'page' : undefined} />}
            className={cn(tabCls, 'inline-flex items-center justify-center')}
          >
            <Ellipsis size={22} aria-hidden="true" />
            <span className="text-[14px]">More</span>
          </SheetTrigger>
          <SheetPopup side="bottom" className="rounded-none">
            <SheetHeader className="pb-2"><SheetTitle className="font-heading text-2xl font-semibold tracking-[-0.01em]">More</SheetTitle></SheetHeader>
            <SheetPanel className="flex flex-col gap-1 pb-6">
              {more.map((p) => {
                const Icon = ICON[p.id];
                return (
                  <SheetClose key={p.id} render={<a href={first(p.id)} aria-current={p.id === here.id ? 'page' : undefined} />}
                    className="flex min-h-12 items-center gap-3 border-s-4 border-transparent px-3 font-label text-xl font-semibold no-underline aria-[current=page]:border-primary">
                    <Icon size={20} aria-hidden="true" className="text-primary" /> {p.label}
                  </SheetClose>
                );
              })}
              <p className="mt-3 px-3 text-sm text-muted-foreground">{me.fullName ?? me.email} · {level(me)}</p>
              {!NO_LOGIN && <Button variant="outline" className="mt-1" onClick={signOut}><LogOut aria-hidden="true" /> Sign out</Button>}
            </SheetPanel>
          </SheetPopup>
        </Sheet>
      </SegmentedControl>
    </SidebarProvider>
  );
}

const tabCls = 'h-18 min-w-0 flex-col gap-0.75 rounded-none border-0 border-t-3 border-t-transparent px-0 pt-1.5 pb-1 font-label font-semibold text-muted-foreground hover:text-foreground aria-[current=page]:border-t-primary aria-[current=page]:bg-card aria-[current=page]:text-foreground aria-[current=page]:shadow-none sm:h-18 dark:aria-[current=page]:bg-card';
