// Check-in (DASHBOARD-PLAN.md §3.8): choose day 1/2/3, then scan the delegate's QR code or type their code,
// and see a clear result card. The camera uses the browser's built-in BarcodeDetector where it exists (Chrome,
// Android), with no new dependency; elsewhere the code is typed.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, CameraOff, CheckCircle2, Hourglass, ScanLine } from 'lucide-react';
import type { CheckinResult } from '@/platform/v2';
import { Button } from '../../portal/ui/coss/button';
import { Input } from '../../portal/ui/coss/input';
import { SegmentedControl, SegmentedControlItem } from '../../portal/ui/coss/segmented-control';
import { cn } from '../../portal/ui/coss/utils';
import { errorText, useAdmin } from '../lib/data';
import { setParam, useRoute } from '../lib/route';
import { Head, Panel, labelCls } from '../ui/kit';

type Detector = { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> };
type DetectorCtor = new (o: { formats: string[] }) => Detector;
const BD = (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;

type Outcome = { kind: 'ok' | 'again'; r: CheckinResult; code: string } | { kind: 'error'; text: string; code: string };

export function CheckinScreen() {
  const { api } = useAdmin();
  const { params } = useRoute();
  const day = (['1', '2', '3'].includes(params.get('day') ?? '') ? Number(params.get('day')) : 1) as 1 | 2 | 3;
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Outcome | null>(null);
  const [count, setCount] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const submit = useCallback(async (raw: string) => {
    const c = raw.trim();
    if (!c || busy) return;
    setBusy(true);
    try {
      const r = await api.checkin(c, day);
      setOut({ kind: r.first ? 'ok' : 'again', r, code: c });
      if (r.first) setCount((n) => n + 1);
    } catch (e) {
      setOut({ kind: 'error', text: errorText(e), code: c });
    } finally {
      setBusy(false);
      setCode('');
      input.current?.focus();
    }
  }, [api, day, busy]);

  const setDay = (d: number) => { setParam('day', String(d)); setOut(null); input.current?.focus(); };

  return (
    <>
      <Head title="Check-in" line="Pick the day. Scan the badge, or type the code." />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Panel title={`Day ${day} desk`} icon={ScanLine} aside={count ? <span className="font-mono text-sm text-muted-foreground">{count} checked in here</span> : undefined}>
          <SegmentedControl aria-label="Conference day" className="grid w-full grid-cols-3 rounded-none">
            {[1, 2, 3].map((d) => (
              <SegmentedControlItem key={d} render={<button type="button" aria-pressed={day === d} onClick={() => setDay(d)} />}
                className={cn('h-12 font-label text-xl font-semibold sm:h-12 sm:text-xl', day === d && 'bg-primary! text-primary-foreground! hover:text-primary-foreground')}>
                Day {d}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
          <form className="flex w-full flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void submit(code); }}>
            <label htmlFor="checkin-code" className={labelCls}>Check-in code</label>
            <Input
              ref={input} id="checkin-code" autoFocus autoComplete="off" autoCapitalize="characters" spellCheck={false} enterKeyHint="go"
              value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" className="code-input"
            />
            <Button type="submit" size="xl" className="w-full" loading={busy} disabled={!code.trim()}>Check in</Button>
          </form>
          {BD ? <CameraScan onCode={(c) => void submit(c)} paused={busy} /> : <p className="text-sm text-muted-foreground">This browser can't scan with the camera. Type the code, or use Chrome on Android.</p>}
        </Panel>
        <div aria-live="assertive" aria-atomic="true" className="min-w-0">
          {out ? <Result out={out} day={day} /> : (
            <div className="flex min-h-48 items-center justify-center border border-dashed p-6 text-center text-lg text-muted-foreground">The result shows here.</div>
          )}
        </div>
      </div>
    </>
  );
}

function Result({ out, day }: { out: Outcome; day: number }) {
  if (out.kind === 'error') {
    return (
      <section className="flex flex-col gap-2 border-2 border-destructive bg-destructive-soft p-6 max-md:p-4">
        <p className="flex items-center gap-3 font-heading text-[44px] font-semibold leading-[1.1] text-destructive max-md:text-[32px] tracking-[-0.02em]"><AlertTriangle size={40} aria-hidden="true" /> Not checked in</p>
        <p className="text-xl">{out.text}</p>
        <p className="font-mono text-sm text-muted-foreground">Code: {out.code}</p>
      </section>
    );
  }
  const r = out.r;
  const ok = out.kind === 'ok';
  return (
    <section className={cn('flex flex-col gap-3 border-2 p-6 max-md:p-4', ok ? 'border-success bg-success-soft' : 'border-warning bg-warning-soft')}>
      <p className={cn('flex items-center gap-3 font-heading text-[46px] font-semibold leading-[1.1] max-md:text-[32px] tracking-[-0.02em]', ok ? 'text-success' : 'text-warning')}>
        {ok ? <CheckCircle2 size={44} aria-hidden="true" /> : <Hourglass size={44} aria-hidden="true" />}
        {ok ? 'Checked in' : 'Already checked in'}
      </p>
      <p className="font-heading text-[56px] font-semibold leading-[1.05] break-words max-md:text-[38px] tracking-[-0.02em]">{r.fullName}</p>
      <p className="font-heading text-[30px] font-semibold leading-[1.1] max-md:text-[24px] tracking-[-0.01em]">
        {r.committee && r.seat ? `${r.seat.label} · ${r.committee.abbr}` : r.committee ? r.committee.abbr : 'No seat yet'}
      </p>
      <p className="text-base text-muted-foreground">Day {day}{ok ? '' : ' · this badge was already scanned today'}</p>
    </section>
  );
}

/** The camera: BarcodeDetector reads QR codes from the video a few times a second. */
function CameraScan({ onCode, paused }: { onCode: (c: string) => void; paused: boolean }) {
  const [on, setOn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const last = useRef<{ v: string; t: number }>({ v: '', t: 0 });
  const cb = useRef(onCode); cb.current = onCode;
  const pausedRef = useRef(paused); pausedRef.current = paused;

  useEffect(() => {
    if (!on || !BD) return;
    let stream: MediaStream | null = null;
    let timer = 0;
    let alive = true;
    const det = new BD({ formats: ['qr_code'] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (!alive || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const tick = async () => {
          if (!alive || !video.current) return;
          if (!pausedRef.current && video.current.readyState >= 2) {
            const found = await det.detect(video.current).catch(() => []);
            const v = found[0]?.rawValue?.trim();
            // The same badge held in front of the camera is read once every 3 seconds at most.
            if (v && (v !== last.current.v || Date.now() - last.current.t > 3000)) { last.current = { v, t: Date.now() }; cb.current(v); }
          }
          timer = window.setTimeout(() => void tick(), 300);
        };
        void tick();
      } catch {
        setErr("Couldn't open the camera. Allow camera access, or type the code.");
        setOn(false);
      }
    })();
    return () => { alive = false; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [on]);

  return (
    <div className="flex w-full flex-col gap-2">
      <Button variant="outline" onClick={() => { setErr(null); setOn((v) => !v); }}>
        {on ? <><CameraOff aria-hidden="true" /> Stop camera</> : <><Camera aria-hidden="true" /> Scan with camera</>}
      </Button>
      {on && <video ref={video} muted playsInline className="aspect-[4/3] w-full bg-background object-cover" aria-label="Camera preview" />}
      {err && <p role="alert" className="text-base font-semibold text-destructive">{err}</p>}
    </div>
  );
}
