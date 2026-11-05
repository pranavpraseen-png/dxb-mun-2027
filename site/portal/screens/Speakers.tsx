// Speakers' list: my place in the queue, one button to add or remove myself, and the full list.
import { Mic, MicOff } from 'lucide-react';
import { useAction, useLoad } from '../lib/data';
import { useConf } from '../lib/conf';
import { ordinal } from '../lib/format';
import { Empty, ErrorBox, Hint, Locked, PageHead, Panel, Plain, Row, Rows, SampleTag, ScreenSkeleton, You } from '../ui/kit';
import { Button } from '../ui/coss/button';
import { Card } from '../ui/coss/card';
import { cn } from '../ui/coss/utils';
import { SPEAKER, Status } from '../ui/status';
import { SlimTimer } from '../ui/timer';

export function SpeakersScreen() {
  const { phase, readOnly, demo } = useConf();
  const q = useLoad(async (a) => (phase === 'before' ? null : Promise.all([a.speakers(), a.live()])), ['speakers', 'live'], [phase]);
  const { run, pending } = useAction();

  if (phase === 'before') {
    return (
      <>
        <PageHead title="Speakers" line="The order delegates speak in." />
        <Card className="rounded-sm p-5 shadow-none before:hidden"><Locked title="Opens on conference day" line="Add yourself once the session starts." /></Card>
      </>
    );
  }
  if (!q.data) {
    return (
      <>
        <PageHead title="Speakers" />
        {q.error ? <ErrorBox error={q.error} onRetry={q.reload} what="the speakers' list" /> : <ScreenSkeleton panels={2} />}
      </>
    );
  }
  const [speakers, live] = q.data;
  const queue = speakers.filter((s) => s.status !== 'done');
  const me = queue.find((s) => s.isMe);
  const place = me ? queue.indexOf(me) + 1 : 0;
  const ahead = me ? queue.filter((s) => s.position < me.position).length : 0;
  const speaking = speakers.find((s) => s.status === 'speaking');

  const action = me
    ? me.status === 'speaking'
      ? null
      : <Button size="xl" variant="outline" loading={pending} disabled={readOnly} onClick={() => void run((a) => a.leaveSpeakers(), "Removed from the speakers' list")}><MicOff aria-hidden="true" /> Remove me</Button>
    : <Button size="xl" loading={pending} disabled={readOnly} onClick={() => void run((a) => a.joinSpeakers(), "Added to the speakers' list")}><Mic aria-hidden="true" /> Add me to the list</Button>;

  return (
    <>
      <PageHead title="Speakers" line="The order delegates speak in." aside={action} />
      <Card className={cn('flex flex-col gap-2 rounded-sm p-5 shadow-none before:hidden max-md:p-4', me && 'border-l-4 border-l-primary')}>
        {me?.status === 'speaking' ? (
          <p className="font-heading text-[48px] font-semibold leading-[1.1] text-primary max-md:text-[38px] tracking-[-0.02em]">You're speaking</p>
        ) : me ? (
          <>
            <p className="font-heading text-[48px] font-semibold leading-[1.1] max-md:text-[38px] tracking-[-0.02em]">You're {ordinal(place)} in line</p>
            <Plain muted>{ahead === 0 ? "You're up next. Get ready." : `${ahead} ahead of you.`}</Plain>
          </>
        ) : (
          <p className="font-heading text-[36px] font-semibold leading-[1.1] text-muted-foreground max-md:text-[30px] tracking-[-0.02em]">Not on the list</p>
        )}
        {live && speaking && (
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <span className="font-label text-sm font-semibold uppercase text-muted-foreground tracking-[0.06em]">Speaking now</span>
            <SlimTimer timer={live.timer} />
          </div>
        )}
      </Card>
      <Panel title="The list" icon={Mic} aside={demo && speakers.length ? <SampleTag /> : undefined}>
        {speakers.length === 0 ? (
          <Empty>No one on the list yet.</Empty>
        ) : (
          <Rows label="Speakers' list">
            {speakers.map((s) => (
              <Row key={s.id} mine={s.isMe} className="items-center gap-3 px-2 py-2.5 first:pt-2.5 last:pb-2.5">
                <span className="w-8 shrink-0 text-right font-mono text-[16px] text-muted-foreground">{s.position}</span>
                <span className={cn('min-w-0 flex-1 text-lg font-semibold', s.status === 'speaking' && 'text-primary', s.status === 'done' && 'text-muted-foreground')}>
                  {s.seat.label}{s.isMe && <You />}
                </span>
                <Status s={SPEAKER[s.status]} />
              </Row>
            ))}
          </Rows>
        )}
        <Hint>The chair calls the next speaker and starts the timer.</Hint>
      </Panel>
    </>
  );
}
