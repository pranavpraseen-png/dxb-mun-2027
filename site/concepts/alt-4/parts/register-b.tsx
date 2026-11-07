// NAME: Delegate credential
// IDEA: Typing your name prints your own lanyard pass, with a QR to registration, which tilts under your pointer and swings a little with each key.
// WHY: Self-reference and the endowment effect: once a pass carries your name it already feels like yours, so claiming it is the natural next step.
// WILD: Add to Wallet: the same pass exported as a real Apple / Google Wallet card that updates when dates and venue are announced.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Field } from '@base-ui/react/field';
import { QRCodeSVG } from 'qrcode.react';
import { conference, tba } from '@/data/conference';
import { isStill } from '@/shared/hooks';
import { emit } from '../bus';
import { register, signIn } from '../links';
import './register-b.css';

const still = isStill();
const MAX_TILT = 9; // degrees

/** Pointer tilt (rotateX/Y) plus a damped swing (rotateZ) that each keystroke kicks. One rAF loop, idle when settled. */
function useBadgeMotion() {
  const stage = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const kick = useRef<() => void>(() => {});
  useEffect(() => {
    const st = stage.current, el = card.current;
    if (still || !st || !el) return;
    const fine = matchMedia('(pointer: fine)').matches;
    const s = { rx: 0, ry: 0, tx: 0, ty: 0, z: 0, vz: 0 };
    let raf = 0;
    const tick = () => {
      raf = 0;
      s.rx += (s.tx - s.rx) * 0.14;
      s.ry += (s.ty - s.ry) * 0.14;
      s.vz += -s.z * 0.09; s.vz *= 0.86; s.z += s.vz; // spring back to 0
      el.style.transform = `rotateX(${s.rx.toFixed(2)}deg) rotateY(${s.ry.toFixed(2)}deg) rotateZ(${s.z.toFixed(2)}deg)`;
      const moving = Math.abs(s.tx - s.rx) + Math.abs(s.ty - s.ry) + Math.abs(s.z) + Math.abs(s.vz) > 0.01;
      if (moving) raf = requestAnimationFrame(tick);
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const r = el.getBoundingClientRect();
      const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.9)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 0.9)));
      s.ty = nx * MAX_TILT; s.tx = -ny * MAX_TILT; wake();
    };
    const leave = () => { s.tx = 0; s.ty = 0; wake(); };
    kick.current = () => { s.vz += (Math.random() < 0.5 ? -1 : 1) * 0.55; wake(); };
    if (fine) { st.addEventListener('pointermove', move); st.addEventListener('pointerleave', leave); }
    return () => { cancelAnimationFrame(raf); st.removeEventListener('pointermove', move); st.removeEventListener('pointerleave', leave); };
  }, []);
  return { stage, card, kick };
}

/** Fit one line of text to its box: measured at 64px, then scaled to the width (20–64px). */
function useFit(text: string) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el?.parentElement) return;
    const fit = () => {
      el.style.whiteSpace = 'nowrap';
      el.style.fontSize = '64px';
      const avail = el.parentElement!.clientWidth;
      const w = el.scrollWidth || 1;
      const size = Math.floor((64 * avail) / w);
      // Long names: two lines at a readable size instead of one tiny line.
      if (size < 30) { el.style.whiteSpace = 'normal'; el.style.fontSize = '30px'; }
      else { el.style.whiteSpace = 'nowrap'; el.style.fontSize = Math.min(64, size) + 'px'; }
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [text]);
  return ref;
}

export function RegisterB({ id = 'register' }: { id?: string }) {
  const [name, setName] = useState('');
  const shown = name.trim();
  const fit = useFit(shown || 'Your name');
  const { stage, card, kick } = useBadgeMotion();
  const qr = useMemo(() => (typeof location !== 'undefined' ? new URL(register, location.href).href : register), []);

  return (
    <section id={id} className="regb" aria-labelledby={id + '-h'}>
      <div className="regb-wrap">
        <div className="regb-copy">
          <p className="regb-label"><span>04</span>Register</p>
          <h2 className="regb-h" id={id + '-h'}>Your credential.</h2>
          <p className="regb-sub">Type your name. Your pass prints as you type.</p>

          <Field.Root className="regb-field">
            <Field.Label className="regb-flabel">Name on the pass</Field.Label>
            <Field.Control className="regb-input" value={name} maxLength={40} autoComplete="name" spellCheck={false}
              placeholder="Your name" onChange={(e) => { setName(e.target.value); kick.current(); }} />
          </Field.Root>

          <div className="regb-ctas">
            <a className="regb-btn regb-btn--un" href={register} onClick={() => emit('tap')}>
              Register
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12 12 4M6 4h6v6" /></svg>
            </a>
            <a className="regb-btn regb-btn--line" href={signIn}>Sign in</a>
          </div>
          <p className="regb-note">The code on the pass opens registration. Nothing you type here leaves this page.</p>
        </div>

        <div className="regb-stage" ref={stage}>
          <div className="regb-strap" aria-hidden="true"><span>{conference.edition} · {conference.edition} · {conference.edition}</span></div>
          <figure className="regb-card" ref={card} aria-label="Your delegate pass, a preview">
            <span className="regb-slot" aria-hidden="true" />
            <div className="regb-top">
              <div>
                <b className="regb-ed">{conference.edition}</b>
                <span className="regb-kind">{conference.kind} · {conference.city}</span>
              </div>
              <span className="regb-seal" title={'Hosted by ' + conference.host}>IHS</span>
            </div>
            <div className="regb-band">Delegate</div>
            <div className="regb-namebox" aria-live="polite">
              <span ref={fit} className={'regb-name' + (shown ? '' : ' is-empty')}>{shown || 'Your name'}</span>
            </div>
            <p className="regb-role">Hosted by {conference.host}</p>
            <div className="regb-bottom">
              <dl className="regb-facts">
                <div><dt>Dates</dt><dd>{tba(conference.dates)}</dd></div>
                <div><dt>Venue</dt><dd>{tba(conference.venue)}</dd></div>
                <div><dt>City</dt><dd>{conference.city}</dd></div>
              </dl>
              <div className="regb-qr">
                <QRCodeSVG value={qr} size={96} level="M" bgColor="#F2F5F9" fgColor="#03060C" marginSize={0} title="Opens registration" />
              </div>
            </div>
            <figcaption className="regb-preview">Preview · not a pass until you register</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
