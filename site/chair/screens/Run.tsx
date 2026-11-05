// Run session: the shared timer (editable length, kind, label, speaker), the session itself, the agenda item
// and motion, and the speakers' list beside it. Space starts or pauses; N calls the next speaker.
import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import {
  ArrowDown, ArrowUp, Check, GripVertical, Keyboard, Mic, Minus, Pause, Play, Plus, RotateCcw, SkipForward, Square, Timer as TimerIcon, X,
} from 'lucide-react';
import type { CommitteeLive, DaisSeat, Speaker, Timer } from '@/platform/v2';
import { cn } from '../../portal/ui/coss/utils';
import { Button } from '../../portal/ui/coss/button';
import { Input } from '../../portal/ui/coss/input';
import { Label } from '../../portal/ui/coss/label';
import { useAction, useChair, useLoad, useNow } from '../lib/data';
import { Choices, Empty, Loaded, PageHead, Panel, Pick, Tag, clock, parseLength, timeOnly, typing, TBA } from '../ui/kit';
import { Confirm } from '../ui/confirm';

const PRESETS = [30, 45, 60, 90, 120, 300, 600];
const KINDS: { value: Timer['kind']; label: string }[] = [
  { value: 'speech', label: 'Speech' }, { value: 'caucus', label: 'Caucus' }, { value: 'session', label: 'Session' }, { value: 'other', label: 'Other' },
];
const MIN_S = 5;
const MAX_S = 3 * 3600;
const presetWord = (s: number) => (s < 120 ? `${s}s` : `${s / 60}m`);

function remainingOf(t: Timer, now: number): number {
  return t.running && t.endsAt ? Math.max(0, (Date.parse(t.endsAt) - now) / 1000) : t.remainingSeconds;
}

export function RunScreen() {
  const live = useLoad((a, c) => a.live(c), ['live']);
  const speakers = useLoad((a, c) => a.speakers(c), ['speakers']);
  const seats = useLoad((a, c) => a.seats(c), ['seat', 'roll']);
  const { committee } = useChair();

  return (
    <>
      <PageHead
        title="Run session"
        line={live.data?.agendaItem ? <>Agenda: <strong className="text-foreground">{live.data.agendaItem}</strong></> : `${committee.abbr}: agenda ${TBA.toLowerCase()}`}
        aside={live.data && <SessionControls live={live.data} />}
      />
      <div className="run-grid">
        <div className="col">
          <Loaded load={live} what="the session" lines={6}>
            {(l) => <TimerPanel live={l} speakers={speakers.data ?? []} />}
          </Loaded>
          <Loaded load={live} what="the agenda" lines={2}>
            {(l) => <AgendaPanel live={l} />}
          </Loaded>
        </div>
        <div className="col">
          <Loaded load={speakers} what="the speakers' list" lines={5}>
            {(s) => <SpeakersPanel speakers={s} seats={seats.data ?? []} timer={live.data?.timer ?? null} />}
          </Loaded>
          <ShortcutHint />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ session start / end */
function SessionControls({ live }: { live: CommitteeLive }) {
  const { run, pending } = useAction();
  const s = live.session;
  const isLive = s?.status === 'live';
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="flex flex-col items-start gap-1">
        <span className="font-label text-xl font-semibold leading-none">{s ? `Session ${s.number}` : 'No session yet'}</span>
        {s ? (
          isLive ? <Tag tone="live">Live since {timeOnly(s.startedAt)}</Tag>
            : s.status === 'closed' ? <Tag tone="ok">Ended</Tag> : <Tag tone="off">Not started</Tag>
        ) : <Tag tone="off">Not started</Tag>}
      </div>
      {isLive ? (
        <Confirm
          title={`End session ${s?.number}?`}
          line="Delegates see the session as ended. You can start the next one at any time."
          confirm="End session"
          danger
          onConfirm={() => run((a, c) => a.endSession(c), 'Session ended')}
          trigger={<Button variant="destructive-outline" size="lg" disabled={pending}><Square aria-hidden="true" /> End session</Button>}
        />
      ) : (
        <Button size="lg" loading={pending} onClick={() => void run((a, c) => a.startSession(c), 'Session started')}>
          <Play aria-hidden="true" /> {s?.status === 'scheduled' ? `Start session ${s.number}` : 'Start next session'}
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ the shared timer */
function TimerPanel({ live, speakers }: { live: CommitteeLive; speakers: Speaker[] }) {
  const t = live.timer;
  const { run } = useAction();
  const now = useNow(t.running);
  const left = remainingOf(t, now);
  const over = t.running && left <= 0;
  const pct = t.durationSeconds > 0 ? Math.min(100, (left / t.durationSeconds) * 100) : 0;

  const [len, setLen] = useState(clock(t.durationSeconds));
  const [label, setLabel] = useState(t.label ?? '');
  const [err, setErr] = useState<string | null>(null);
  const lenRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (document.activeElement !== lenRef.current) setLen(clock(t.durationSeconds)); }, [t.durationSeconds]);
  useEffect(() => { if (document.activeElement !== labelRef.current) setLabel(t.label ?? ''); }, [t.label]);

  const load = (over2: { kind?: Timer['kind']; label?: string | null; seconds?: number }, msg?: string) => {
    const kind = over2.kind ?? t.kind;
    return run((a, c) => a.setTimer(c, {
      kind,
      label: over2.label !== undefined ? over2.label : t.label,
      durationSeconds: over2.seconds ?? t.durationSeconds,
      speakerSeatId: kind === 'speech' ? t.speaker?.id ?? null : null,
    }), msg);
  };
  const applyTyped = () => {
    const s = parseLength(len);
    if (s === null) { setErr('Type a length like 45, 0:45, 1:30 or 2m.'); return; }
    if (s < MIN_S || s > MAX_S) { setErr('Between 5 seconds and 3 hours.'); return; }
    setErr(null);
    const nextLabel = label.trim() || null;
    void load({ seconds: s, label: nextLabel }, `Timer set to ${clock(s)}`);
  };
  const onEnter = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); applyTyped(); } };
  const toggle = () => void run((a, c) => (t.running ? a.pauseTimer(c) : a.startTimer(c)));
  const speaking = speakers.find((s) => s.status === 'speaking');

  return (
    <Panel
      title="Shared timer"
      icon={TimerIcon}
      aside={t.running ? (over ? <Tag tone="bad">Time is up</Tag> : <Tag tone="live" icon={Play}>Running</Tag>) : <Tag tone="wait" icon={Pause}>{left < t.durationSeconds && left > 0 ? 'Paused' : 'Stopped'}</Tag>}
      bodyClass="gap-5"
    >
      <div className="flex flex-col gap-1">
        <p className="font-label text-[15px] font-semibold uppercase text-muted-foreground tracking-[0.06em]">
          {KINDS.find((k) => k.value === t.kind)?.label}{t.label ? ` · ${t.label}` : ''}
        </p>
        <p className={cn('timer-digits', over && 'text-destructive')} aria-live="off" data-testid="timer-digits">
          {clock(left)}
        </p>
        <div className="h-2 w-full bg-muted" role="progressbar" aria-label="Time left" aria-valuemin={0} aria-valuemax={t.durationSeconds} aria-valuenow={Math.round(left)}>
          <div className={cn('h-full', over ? 'bg-destructive' : 'bg-primary')} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-lg">
          <Mic size={18} aria-hidden="true" className="text-primary" />
          <span className="text-muted-foreground">Speaker:</span>
          <strong>{t.speaker?.label ?? speaking?.seat.label ?? 'No one'}</strong>
          <span className="text-muted-foreground">· of {clock(t.durationSeconds)}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Button size="xl" onClick={toggle} className="min-w-44" aria-keyshortcuts="Space" data-testid="timer-toggle">
          {t.running ? <><Pause aria-hidden="true" /> Pause</> : <><Play aria-hidden="true" /> Start</>}
        </Button>
        <Button size="xl" variant="outline" onClick={() => void run((a, c) => a.resetTimer(c))}><RotateCcw aria-hidden="true" /> Reset</Button>
        <Button size="xl" variant="outline" onClick={() => void run((a, c) => a.addTime(c, -15))} aria-label="Take away 15 seconds"><Minus aria-hidden="true" /> 15s</Button>
        <Button size="xl" variant="outline" onClick={() => void run((a, c) => a.addTime(c, 15))} aria-label="Add 15 seconds"><Plus aria-hidden="true" /> 15s</Button>
      </div>

      <div className="flex flex-col gap-2 border-t pt-4">
        <p className="font-label text-lg font-semibold">Length</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick lengths">
          {PRESETS.map((s) => (
            <Button key={s} variant={t.durationSeconds === s ? 'secondary' : 'outline'} aria-pressed={t.durationSeconds === s}
              className={cn('min-w-16', t.durationSeconds === s && 'border-primary')}
              onClick={() => void load({ seconds: s }, `Timer set to ${clock(s)}`)}>
              {presetWord(s)}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="flex w-36 flex-col gap-1">
            <Label htmlFor="t-len" className="text-base">Any length (m:ss)</Label>
            <Input id="t-len" ref={lenRef} inputMode="numeric" value={len} onChange={(e) => { setLen(e.target.value); setErr(null); }} onKeyDown={onEnter} onFocus={(e) => e.target.select()}
              aria-invalid={!!err || undefined} aria-describedby={err ? 't-len-err' : 't-len-help'} className="*:data-[slot=input]:font-mono *:data-[slot=input]:text-xl" />
          </div>
          <div className="flex min-w-48 flex-1 flex-col gap-1">
            <Label htmlFor="t-label" className="text-base">Label (optional)</Label>
            <Input id="t-label" ref={labelRef} value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={onEnter} placeholder="Moderated caucus: water security" maxLength={80} />
          </div>
          <Button variant="outline" onClick={applyTyped}><Check aria-hidden="true" /> Set timer</Button>
        </div>
        {err ? <p id="t-len-err" role="alert" className="text-base text-destructive-foreground">{err}</p>
          : <p id="t-len-help" className="text-[15px] text-muted-foreground">Setting a length stops the timer and loads it.</p>}
      </div>

      <div className="flex flex-col gap-2 border-t pt-4">
        <p className="font-label text-lg font-semibold">Kind</p>
        <Choices label="Timer kind" value={t.kind} options={KINDS} onChange={(k) => void load({ kind: k })} />
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ agenda + motion */
function AgendaPanel({ live }: { live: CommitteeLive }) {
  const { run, pending } = useAction();
  const [agenda, setAgenda] = useState(live.agendaItem ?? '');
  const [motion, setMotion] = useState(live.currentMotion ?? '');
  useEffect(() => { setAgenda(live.agendaItem ?? ''); }, [live.agendaItem]);
  useEffect(() => { setMotion(live.currentMotion ?? ''); }, [live.currentMotion]);
  const changed = agenda.trim() !== (live.agendaItem ?? '') || motion.trim() !== (live.currentMotion ?? '');
  const save = () => void run((a, c) => a.setAgenda(c, { agendaItem: agenda.trim() || null, currentMotion: motion.trim() || null }), 'Agenda saved');
  return (
    <Panel className="run-agenda" title="Agenda and motion" aside={changed ? <Tag tone="wait">Not saved</Tag> : <Tag tone="ok">Saved</Tag>}>
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="flex flex-col gap-1">
          <Label htmlFor="ag" className="text-base">Agenda item</Label>
          <Input id="ag" value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder={TBA} maxLength={160} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="mo" className="text-base">Current motion</Label>
          <Input id="mo" value={motion} onChange={(e) => setMotion(e.target.value)} placeholder="Moderated caucus, 10 min total, 1 min speeches" maxLength={160} />
        </div>
        <Button type="submit" variant="outline" className="self-start" disabled={!changed} loading={pending}><Check aria-hidden="true" /> Save agenda</Button>
      </form>
    </Panel>
  );
}

/* ------------------------------------------------------------------ speakers' list */
function SpeakersPanel({ speakers, seats, timer }: { speakers: Speaker[]; seats: DaisSeat[]; timer: Timer | null }) {
  const { run, pending } = useAction();
  const [pick, setPick] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [speech, setSpeech] = useState(60);
  const [speechText, setSpeechText] = useState('1:00');
  useEffect(() => {
    if (timer?.kind === 'speech' && timer.durationSeconds >= MIN_S) { setSpeech(timer.durationSeconds); setSpeechText(clock(timer.durationSeconds)); }
  }, [timer?.kind, timer?.durationSeconds]);

  const speaking = speakers.find((s) => s.status === 'speaking');
  const waiting = speakers.filter((s) => s.status === 'waiting').sort((a, b) => a.position - b.position);
  const done = speakers.filter((s) => s.status === 'done');
  const queued = new Set(waiting.map((s) => s.seat.id));
  const options = seats.filter((s) => !queued.has(s.seat.id)).map((s) => ({ value: s.seat.id, label: s.seat.label }));

  const next = () => void run((a, c) => a.nextSpeaker(c, speech), waiting[0] ? `${waiting[0].seat.label} has the floor` : undefined);
  const move = (id: string, toPosition: number) => void run((a) => a.moveSpeaker(id, toPosition));

  // Keyboard: Space = start or pause the timer, N = next speaker.
  const nextRef = useRef(next);
  nextRef.current = next;
  useShortcuts(timer, () => { if (waiting.length) nextRef.current(); });

  const onDrop = (e: DragEvent, target: Speaker) => {
    e.preventDefault();
    if (dragId && dragId !== target.id) move(dragId, target.position);
    setDragId(null); setOverId(null);
  };
  const commitSpeech = () => {
    const s = parseLength(speechText);
    if (s !== null && s >= MIN_S && s <= MAX_S) { setSpeech(s); setSpeechText(clock(s)); } else setSpeechText(clock(speech));
  };

  return (
    <Panel title="Speakers' list" icon={Mic} aside={<Tag tone={waiting.length ? 'live' : 'off'}>{waiting.length} waiting</Tag>}>
      <div className="flex flex-col gap-2">
        <Button size="xl" className="w-full" onClick={next} disabled={!waiting.length || pending} aria-keyshortcuts="N">
          <SkipForward aria-hidden="true" /> Next speaker · {clock(speech)}
        </Button>
        <div className="flex items-center gap-2">
          <Label htmlFor="sp-len" className="text-base text-muted-foreground">Speech length</Label>
          <Input id="sp-len" className="w-24 *:data-[slot=input]:h-10 *:data-[slot=input]:font-mono" value={speechText} inputMode="numeric"
            onChange={(e) => setSpeechText(e.target.value)} onBlur={commitSpeech} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitSpeech(); } }} />
        </div>
      </div>

      {speaking && (
        <div className="flex items-center gap-3 border-s-4 border-primary bg-muted px-3 py-2.5">
          <Mic size={20} aria-hidden="true" className="text-primary" />
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Now speaking</p>
            <p className="truncate font-heading text-2xl font-semibold leading-tight tracking-[-0.01em]">{speaking.seat.label}</p>
          </div>
        </div>
      )}

      {waiting.length ? (
        <ol className="flex flex-col border-y" aria-label="Waiting to speak">
          {waiting.map((s, i) => (
            <li
              key={s.id}
              draggable
              onDragStart={(e) => { setDragId(s.id); e.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={(e) => { e.preventDefault(); setOverId(s.id); }}
              onDragLeave={() => setOverId((o) => (o === s.id ? null : o))}
              onDrop={(e) => onDrop(e, s)}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              className={cn('flex min-h-13 items-center gap-2 border-b bg-card px-1 last:border-b-0', dragId === s.id && 'bg-raised text-muted-foreground', overId === s.id && dragId !== s.id && 'drag-over')}
            >
              <GripVertical size={18} aria-hidden="true" className="shrink-0 cursor-grab text-muted-foreground" />
              <span className="w-7 shrink-0 text-right font-mono text-lg text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-lg font-semibold">{s.seat.label}</span>
              <Button size="icon-sm" variant="ghost" aria-label={`Move ${s.seat.label} up`} disabled={i === 0} onClick={() => move(s.id, waiting[i - 1].position)}><ArrowUp aria-hidden="true" /></Button>
              <Button size="icon-sm" variant="ghost" aria-label={`Move ${s.seat.label} down`} disabled={i === waiting.length - 1} onClick={() => move(s.id, waiting[i + 1].position)}><ArrowDown aria-hidden="true" /></Button>
              <Button size="icon-sm" variant="ghost" aria-label={`Remove ${s.seat.label}`} onClick={() => void run((a) => a.removeSpeaker(s.id), `${s.seat.label} removed`)}><X aria-hidden="true" /></Button>
            </li>
          ))}
        </ol>
      ) : <Empty title="No one waiting" line="Add a seat below, or delegates add themselves." icon={Mic} />}

      <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (pick) void run((a, c) => a.addSpeaker(c, pick), 'Added to the list').then((ok) => ok && setPick('')); }}>
        <div className="flex min-w-44 flex-1 flex-col gap-1">
          <Label className="text-base">Add a seat</Label>
          <Pick label="Seat to add" value={pick} onChange={setPick} placeholder="Choose a seat" options={options} />
        </div>
        <Button type="submit" variant="outline" disabled={!pick}><Plus aria-hidden="true" /> Add</Button>
      </form>

      {done.length > 0 && <p className="text-base text-muted-foreground">{done.length} {done.length === 1 ? 'has' : 'have'} spoken: {done.map((d) => d.seat.label).join(', ')}</p>}
    </Panel>
  );
}

/** Space starts or pauses the timer, N calls the next speaker. Ignored while typing. */
function useShortcuts(timer: Timer | null, onNext: () => void) {
  const { api, committee } = useChair();
  const { run } = useAction();
  const ref = useRef({ timer, onNext, run });
  ref.current = { timer, onNext, run };
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      const el = e.target as HTMLElement | null;
      if (e.key === ' ' || e.code === 'Space') {
        if (el && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button')) return;   // native press
        const t = ref.current.timer;
        if (!t) return;
        e.preventDefault();
        void ref.current.run(() => (t.running ? api.pauseTimer(committee.id) : api.startTimer(committee.id)));
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        ref.current.onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [api, committee.id]);
}

function ShortcutHint() {
  return (
    <p className="flex flex-wrap items-center gap-2 text-[15px] text-muted-foreground max-md:hidden">
      <Keyboard size={16} aria-hidden="true" className="text-primary" />
      Keys:
      <kbd className="border border-input bg-muted px-1.5 font-mono text-sm text-foreground">Space</kbd> start or pause
      <span aria-hidden="true">·</span>
      <kbd className="border border-input bg-muted px-1.5 font-mono text-sm text-foreground">N</kbd> next speaker
    </p>
  );
}
