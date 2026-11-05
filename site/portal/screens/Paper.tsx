// Position paper: the status (Not sent, Submitted, Late, Seen by chair), a countdown to the deadline (or
// "To be announced"), and one upload box that takes a dropped or picked PDF/DOCX.
import { CalendarClock, FileText } from 'lucide-react';
import { useLoad, useAction } from '../lib/data';
import { useConf } from '../lib/conf';
import { countdownText, useNow } from '../lib/clock';
import { dayTime } from '../lib/format';
import { ErrorBox, Facts, PageHead, Panel, Plain, ScreenSkeleton } from '../ui/kit';
import { cn } from '../ui/coss/utils';
import { DropZone } from '../ui/DropZone';
import { PAPER, Status } from '../ui/status';

const OK_TYPES = ['.pdf', '.docx'];

export function PaperScreen() {
  const { readOnly } = useConf();
  const q = useLoad(async (a) => Promise.all([a.positionPaper(), a.deadlines()]), ['papers']);
  const { run, pending } = useAction();
  const now = useNow();
  if (!q.data) {
    return (
      <>
        <PageHead title="Paper" />
        {q.error ? <ErrorBox error={q.error} onRetry={q.reload} what="your position paper" /> : <ScreenSkeleton panels={2} />}
      </>
    );
  }
  const [paper, deadlines] = q.data;
  const due = deadlines.find((d) => d.key === 'position_paper')?.dueAt ?? null;
  const left = countdownText(due, now);
  const sent = paper.status !== 'not_sent';

  return (
    <>
      <PageHead title="Paper" line="Your position paper: PDF or DOCX, up to 10 MB." aside={<Status s={PAPER[paper.status]} className="h-9 px-3 text-lg sm:h-9 sm:text-lg" />} />
      <div className="grid-2">
        <div className="col">
          <Panel title={sent ? 'Replace my paper' : 'Upload my paper'} icon={FileText}>
            {readOnly ? (
              <Plain muted>The conference has ended. Uploads are closed.</Plain>
            ) : (
              <DropZone
                accept={OK_TYPES.join(',')}
                busy={pending}
                label={sent ? 'Drop a new file to replace it' : 'Drop your paper here'}
                validate={(f) => {
                  if (!OK_TYPES.some((t) => f.name.toLowerCase().endsWith(t))) return 'Use a PDF or DOCX file.';
                  if (f.size > 10 * 1024 * 1024) return 'The file is over 10 MB.';
                  return null;
                }}
                onFile={(f) => void run((a) => a.uploadPositionPaper(f), 'Position paper sent')}
              />
            )}
          </Panel>
        </div>
        <div className="col">
          <Panel title="Deadline" icon={CalendarClock}>
            {due ? (
              <>
                <p className={cn('font-figures text-[44px] font-bold leading-none max-md:text-[36px]', left === 'Passed' ? 'text-muted-foreground' : 'text-foreground')}>
                  {left === 'Passed' ? 'Passed' : left}
                </p>
                <Plain muted>{left === 'Passed' ? 'Was due' : 'Due'} {dayTime(due)}</Plain>
              </>
            ) : (
              <p className="font-heading text-[34px] font-semibold leading-[1.1] text-muted-foreground tracking-[-0.02em]">To be announced</p>
            )}
          </Panel>
          <Panel title="What the chair has" icon={FileText}>
            <Facts items={[
              ['File', paper.fileName ?? 'Nothing sent yet', paper.fileName ? 'break-all font-semibold' : 'text-muted-foreground'],
              ['Sent', paper.submittedAt ? dayTime(paper.submittedAt) : '—'],
              ['Seen by chair', paper.seenAt ? dayTime(paper.seenAt) : sent ? 'Not yet' : '—'],
            ]} />
          </Panel>
        </div>
      </div>
    </>
  );
}
