// Schedule: every day's sessions, the current one highlighted. Unknown times and places say "To be announced".
import { CalendarDays, CircleCheck, MapPin, Radio } from 'lucide-react';
import type { ScheduleItem } from '@/platform/v2';
import { useLoad } from '../lib/data';
import { useConf } from '../lib/conf';
import { useNow } from '../lib/clock';
import { dayOf, timeOf, TBA } from '../lib/format';
import { Empty, ErrorBox, PageHead, Panel, Row, Rows, ScreenSkeleton } from '../ui/kit';
import { cn } from '../ui/coss/utils';
import { Status } from '../ui/status';

export function ScheduleScreen() {
  const { seat } = useConf();
  const q = useLoad((a) => a.schedule(), ['schedule']);
  const now = useNow();
  if (!q.data) {
    return (
      <>
        <PageHead title="Schedule" />
        {q.error ? <ErrorBox error={q.error} onRetry={q.reload} what="the schedule" /> : <ScreenSkeleton panels={3} />}
      </>
    );
  }
  const items = q.data.filter((i) => !i.committeeId || i.committeeId === seat.committee.id);
  const days = [...new Set(items.map((i) => i.day))].sort((a, b) => a - b);
  const isNow = (i: ScheduleItem) => !!i.startsAt && !!i.endsAt && Date.parse(i.startsAt) <= now && now < Date.parse(i.endsAt);
  const isPast = (i: ScheduleItem) => !!i.endsAt && Date.parse(i.endsAt) <= now;
  return (
    <>
      <PageHead title="Schedule" line="Dubai time. The current session is highlighted." />
      {days.length === 0 && <Panel title="Schedule" icon={CalendarDays}><Empty>The schedule is to be announced.</Empty></Panel>}
      {days.map((d) => {
        const list = items.filter((i) => i.day === d);
        const date = list.find((i) => i.startsAt)?.startsAt ?? null;
        return (
          <Panel key={d} title={`Day ${d}`} icon={CalendarDays} aside={<span className="text-[17px] text-muted-foreground">{date ? dayOf(date) : 'Date to be announced'}</span>}>
            <Rows label={`Day ${d}`}>
              {list.map((i) => {
                const on = isNow(i);
                return (
                  <Row key={i.id} mine={on} className="items-start gap-4 py-3">
                    <span className={cn('w-30 shrink-0 font-mono text-[17px] max-md:w-22', !i.startsAt && 'text-muted-foreground', isPast(i) && 'text-muted-foreground')}>
                      {i.startsAt ? `${timeOf(i.startsAt)}${i.endsAt ? `–${timeOf(i.endsAt)}` : ''}` : 'Time TBA'}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={cn('text-lg font-semibold', isPast(i) && !on && 'text-muted-foreground')}>{i.title}</span>
                      <span className="flex items-center gap-1.5 text-[15px] text-muted-foreground"><MapPin size={15} aria-hidden="true" /> {i.location ?? TBA}</span>
                    </span>
                    {on && <Status s={{ tone: 'action', icon: Radio, word: 'Now' }} />}
                    {!on && isPast(i) && <Status s={{ tone: 'muted', icon: CircleCheck, word: 'Done' }} className="max-md:hidden" />}
                  </Row>
                );
              })}
            </Rows>
          </Panel>
        );
      })}
    </>
  );
}
