// Announcements: a bell in the top bar opens a coss ui Sheet with every notice, newest first.
// What this viewer has already seen is a per-browser convenience (localStorage), never shared state.
import { useCallback, useEffect, useState } from 'react';
import { Bell, Landmark, Megaphone } from 'lucide-react';
import type { Announcement } from '@/platform/v2';
import { useLoad } from '../lib/data';
import { Empty, Row, Rows, when } from './kit';
import { Button } from './coss/button';
import { Sheet, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from './coss/sheet';
import { Status, URGENT } from './status';
import { cn } from './coss/utils';

const KEY = 'dxbmun.v2.seenAnnouncements';
function readSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]); } catch { return new Set(); }
}
function writeSeen(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 200))); } catch { /* private mode: fine */ }
}

export function useAnnouncements() {
  const q = useLoad((a) => a.announcements(), ['announcements']);
  const [seen, setSeen] = useState<Set<string>>(readSeen);
  const list = q.data ?? [];
  const unread = list.filter((a) => !seen.has(a.id)).length;
  const markAll = useCallback(() => {
    const ids = list.map((a) => a.id);
    writeSeen(ids);
    setSeen(new Set(ids));
  }, [list]);
  return { list, unread, markAll, loading: !q.data };
}

export function AnnouncementRow({ a, compact }: { a: Announcement; compact?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        {a.urgent && <Status s={URGENT} />}
        <span className="inline-flex items-center gap-1.5 font-label text-sm font-semibold uppercase text-muted-foreground tracking-[0.06em]">
          {a.from === 'chair' ? <Landmark size={15} aria-hidden="true" /> : <Megaphone size={15} aria-hidden="true" />}
          {a.from === 'chair' ? 'Your chair' : 'Secretariat'} · {when(a.publishedAt, true)}
        </span>
      </div>
      <p className={cn('font-semibold', compact ? 'text-lg' : 'text-xl')}>{a.title}</p>
      {a.body && <p className="text-[17px] text-muted-foreground">{a.body}</p>}
    </div>
  );
}

export function AnnouncementsBell({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { list, unread, markAll } = useAnnouncements();
  useEffect(() => { if (open) markAll(); }, [open, markAll]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <Button
        variant="outline" size="icon" className="relative shrink-0"
        aria-label={unread ? `Announcements, ${unread} new` : 'Announcements'}
        onClick={() => onOpenChange(true)}
      >
        <Bell aria-hidden="true" className="size-5!" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-5 items-center justify-center bg-primary px-1 font-mono text-xs font-medium text-primary-foreground" aria-hidden="true">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>
      <SheetPopup side="right" className="max-w-lg">
        <SheetHeader className="border-b pe-14">
          <SheetTitle className="font-heading text-[30px] font-semibold tracking-[-0.01em]">Announcements</SheetTitle>
        </SheetHeader>
        <SheetPanel className="pt-4!">
          {list.length === 0 ? (
            <Empty>No announcements yet.</Empty>
          ) : (
            <Rows label="Announcements">
              {list.map((a) => <Row key={a.id} className="py-4 first:pt-0"><AnnouncementRow a={a} /></Row>)}
            </Rows>
          )}
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}
