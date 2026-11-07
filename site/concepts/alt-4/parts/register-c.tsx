// NAME: Sign the charter
// IDEA: A short "Resolution of attendance" you sign with your finger or mouse; an orange seal stamps on with a gavel knock and Register unlocks.
// WHY: Commitment and consistency: a small, physical act of signing makes the next step (registering) feel like keeping a promise, the page's strong end.
// WILD: Every signature (kept only on the device) becomes one stroke in a live "wall of signatories" drawn into the hero floor on the next visit.
import { useCallback, useEffect, useRef, useState } from 'react';
import { conference, committees, stats, tba } from '@/data/conference';
import { isStill } from '@/shared/hooks';
import { emit } from '../bus';
import { register, signIn } from '../links';
import './register-c.css';

const still = isStill();
const NEED = 220; // CSS px of ink before a signature counts
const days = stats.find((s) => s.label === 'Days')?.value;

/** Canvas signature: pointer events, a hard 2px ink line, DPR-aware. Never leaves the page. */
function usePad(onSigned: () => void) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const ink = useRef(0);
  const [inked, setInked] = useState(0);
  const signedRef = useRef(false);

  const size = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (c.width === w && c.height === h) return;
    // Keep what is drawn when the box resizes.
    const old = c.width && c.height ? c.getContext('2d')!.getImageData(0, 0, c.width, c.height) : null;
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#F2F5F9';
    if (old) ctx.putImageData(old, 0, 0);
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    size();
    const ro = new ResizeObserver(size);
    ro.observe(c);
    let last: { x: number; y: number } | null = null;
    const pt = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      last = pt(e);
      const ctx = c.getContext('2d')!;
      ctx.beginPath(); ctx.arc(last.x, last.y, 1, 0, Math.PI * 2); ctx.fillStyle = '#F2F5F9'; ctx.fill();
    };
    const move = (e: PointerEvent) => {
      if (!last) return;
      const ctx = c.getContext('2d')!;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      ctx.beginPath(); ctx.moveTo(last.x, last.y);
      for (const ev of evs.length ? evs : [e]) {
        const p = pt(ev);
        ink.current += Math.hypot(p.x - last.x, p.y - last.y);
        ctx.lineTo(p.x, p.y);
        last = p;
      }
      ctx.stroke();
      setInked(Math.min(1, ink.current / NEED));
    };
    const up = () => {
      if (!last) return;
      last = null;
      if (!signedRef.current && ink.current >= NEED) { signedRef.current = true; onSigned(); }
    };
    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    return () => {
      ro.disconnect();
      c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move);
      c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up);
    };
  }, [size, onSigned]);

  const clear = () => {
    const c = canvas.current;
    if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    ink.current = 0; signedRef.current = false; setInked(0);
  };
  return { canvas, inked, clear };
}

/** The seal: an orange ring with its legend set on a circle and a gavel in the middle. */
function Seal() {
  return (
    <svg className="regc-seal-svg" viewBox="0 0 120 120" aria-hidden="true">
      <defs><path id="regc-ring" d="M60 60m-43 0a43 43 0 1 1 86 0a43 43 0 1 1-86 0" /></defs>
      <circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="60" cy="60" r="31" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text fontFamily="JetBrains Mono Variable, monospace" fontSize="9.6" fontWeight="700" letterSpacing="2.4" fill="currentColor">
        <textPath href="#regc-ring">ADOPTED · DXB MUN 2027 · DUBAI ·</textPath>
      </text>
      {/* gavel: head + handle, then the block */}
      <g fill="currentColor">
        <g transform="rotate(-40 60 56)">
          <rect x="47" y="42" width="26" height="12" />
          <rect x="45" y="44" width="2" height="8" />
          <rect x="73" y="44" width="2" height="8" />
          <rect x="58" y="54" width="4" height="22" />
        </g>
        <rect x="42" y="78" width="28" height="5" />
      </g>
    </svg>
  );
}

export function RegisterC({ id = 'register' }: { id?: string }) {
  const [signed, setSigned] = useState(false);
  const [stampKey, setStampKey] = useState(0);
  const doc = useRef<HTMLDivElement>(null);

  const onSigned = useCallback(() => {
    setSigned(true);
    setStampKey((k) => k + 1);
    emit('tap');
    // a two-frame impact on the document, the same frame as the knock
    if (!still && doc.current) doc.current.animate(
      [{ transform: 'translate(0,0)' }, { transform: 'translate(0,3px)' }, { transform: 'translate(0,-1px)' }, { transform: 'translate(0,0)' }],
      { duration: 160, easing: 'steps(4, end)' },
    );
  }, []);
  const { canvas, inked, clear } = usePad(onSigned);
  const reset = () => { clear(); setSigned(false); };

  const today = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dubai' }).format(new Date());

  return (
    <section id={id} className={'regc' + (signed ? ' is-signed' : '') + (still ? ' is-still' : '')} aria-labelledby={id + '-h'}>
      <div className="regc-wrap">
        <header className="regc-head">
          <p className="regc-label"><span>04</span>Register</p>
          <h2 className="regc-h" id={id + '-h'}>Sign the charter.</h2>
          <p className="regc-sub">One signature. Then your seat is one click away.</p>
        </header>

        <div className="regc-doc" ref={doc}>
          <div className="regc-doc-top">
            <span>{conference.edition}</span>
            <span>Draft resolution · Attendance</span>
          </div>
          <h3 className="regc-title">Resolution of attendance</h3>
          <p className="regc-pre"><i>The delegate,</i></p>
          <p className="regc-pre"><i>Recognising</i> the conference's motto, “{conference.motto}”,</p>
          <ol className="regc-ops">
            <li><i>Resolves</i> to take the floor at {conference.edition}, {conference.city}, hosted by {conference.host};</li>
            <li><i>Undertakes</i> to represent one of {committees.length} committees{days ? ` across ${days} days` : ''};</li>
            <li><i>Notes</i> the dates, {tba(conference.dates, 'to be announced')}, and the venue, {tba(conference.venue, 'to be announced')}.</li>
          </ol>

          <div className="regc-sign">
            <div className="regc-pad">
              <canvas ref={canvas} className="regc-canvas" aria-label="Signature pad. Draw your signature with a mouse, pen or finger." role="img" />
              {inked === 0 && !signed && <span className="regc-hint" aria-hidden="true">Sign here</span>}
              <span className="regc-x" aria-hidden="true">×</span>
              <div className={'regc-seal' + (signed ? ' is-on' : '')} key={stampKey} aria-hidden={!signed}>
                {signed && <Seal />}
              </div>
            </div>
            <div className="regc-line">
              <span>Signature of the delegate</span>
              <span>{today}, Dubai</span>
            </div>
            <div className="regc-meter" aria-hidden="true"><span style={{ transform: `scaleX(${signed ? 1 : inked})` }} /></div>
          </div>

          <div className="regc-tools">
            <button type="button" className="regc-tool" onClick={reset} disabled={!inked && !signed}>Clear</button>
            {!signed && <button type="button" className="regc-tool" onClick={onSigned}>Sign without drawing</button>}
            <p className="regc-private">Your signature stays on this screen. It is never sent.</p>
          </div>
        </div>

        <div className="regc-act" aria-live="polite">
          <p className="regc-state">
            <b>{signed ? 'Adopted.' : 'Awaiting signature.'}</b>
            <span>{signed ? 'Take your seat.' : 'Register unlocks when you sign.'}</span>
          </p>
          <div className="regc-ctas">
            {signed
              ? <a className="regc-btn regc-btn--un" href={register} onClick={() => emit('tap')}>Register <Arr /></a>
              : <span className="regc-btn regc-btn--locked" role="link" aria-disabled="true">Register <Lock /></span>}
            <a className="regc-btn regc-btn--line" href={signIn}>Sign in</a>
          </div>
          {!signed && <a className="regc-skip" href={register} onClick={() => emit('tap')}>Skip the ceremony, register now</a>}
        </div>
      </div>
    </section>
  );
}

const Arr = () => <svg className="regc-i" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12 12 4M6 4h6v6" /></svg>;
const Lock = () => <svg className="regc-i" viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="7" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>;
