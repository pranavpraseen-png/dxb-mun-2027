// The secretariat's second step: an authenticator-app code after the email code / Google / Microsoft sign-in.
// Owner, 2026-11-07, picked the recommended setup: secretariat = invite-only + authenticator app + idle lock.
// The database enforces it (supabase/migrations/0005_secretariat_mfa.sql): an admin counts as an admin only in a
// session that passed this step (aal2). This screen is the way to get there; skipping it in the browser gains nothing.
//
//   SecretariatCheck: wraps a dashboard. Non-admins pass straight through. Admins link an app once (QR), then enter
//     a code each sign-in. After that, IdleLock asks for a code again after 30 minutes without activity.
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Lock, LogOut, ShieldCheck } from 'lucide-react';
import { NO_LOGIN, type AuthApi, type Me, type MfaEnrollment, type MfaState } from '@/platform/v2';
import { errorText } from '../lib/data';
import { ErrorBox, FieldError, HostMark, ScreenSkeleton, Wordmark } from '../ui/kit';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '../ui/coss/card';
import { Field, FieldLabel } from '../ui/coss/field';
import { Input } from '../ui/coss/input';
import { Button } from '../ui/coss/button';

const IDLE_MINUTES = 30;
const LAST_ACTIVE_KEY = 'dxbmun-last-active';

export function SecretariatCheck({ api, children }: { api: AuthApi; children: ReactNode }) {
  const [st, setSt] = useState<{ me?: Me; mfa?: MfaState; error?: unknown; n: number }>({ n: 0 });
  const reload = useCallback(() => setSt((s) => ({ n: s.n + 1 })), []);

  useEffect(() => {
    if (NO_LOGIN) return;
    let alive = true;
    (async () => {
      const me = await api.me();
      const mfa = me.role === 'admin' ? await api.mfa.state() : undefined;
      if (alive) setSt((s) => ({ ...s, me, mfa, error: undefined }));
    })().catch((error) => { if (alive) setSt((s) => ({ ...s, error })); });
    return () => { alive = false; };
  }, [api, st.n]);

  if (NO_LOGIN) return <>{children}</>;
  if (st.error) return <Frame><ErrorBox error={st.error} onRetry={reload} what="your account" /></Frame>;
  if (!st.me) return <Frame><ScreenSkeleton panels={1} /></Frame>;
  if (st.me.role !== 'admin') return <>{children}</>;
  if (st.mfa?.level === 'aal2') return <>{children}<IdleLock api={api} /></>;
  return (
    <Frame>
      {st.mfa?.enrolled
        ? <CodeCard api={api} email={st.me.email} onDone={() => { touch(); reload(); }} />
        : <EnrollCard api={api} email={st.me.email} onDone={() => { touch(); reload(); }} />}
    </Frame>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-15 items-center gap-3 border-b px-7 max-md:px-4"><Wordmark /></header>
      <main id="main" tabIndex={-1} className="grid flex-1 place-items-center px-4 py-10 outline-none max-md:place-items-start max-md:py-5">
        <div className="w-full max-w-[520px]">{children}</div>
      </main>
    </div>
  );
}

const card = 'w-full rounded-sm shadow-none before:hidden';
const eyebrow = 'font-mono text-[14px] font-medium uppercase text-muted-foreground tracking-[0.08em]';
const heading = 'font-heading font-wide text-[44px] font-extrabold leading-[1.05] max-md:text-[38px] tracking-[-0.02em]';

/** First time: link an authenticator app by QR (or the typed key), then confirm with one code. */
function EnrollCard({ api, email, onDone }: { api: AuthApi; email: string; onDone: () => void }) {
  const [e, setE] = useState<{ data?: MfaEnrollment; error?: unknown; n: number }>({ n: 0 });
  useEffect(() => {
    let alive = true;
    api.mfa.enroll().then((data) => { if (alive) setE((s) => ({ ...s, data, error: undefined })); }, (error) => { if (alive) setE((s) => ({ ...s, error })); });
    return () => { alive = false; };
  }, [api, e.n]);

  return (
    <Card className={card}>
      <CardHeader className="gap-2 p-7 pb-0 max-md:p-5 max-md:pb-0">
        <p className={eyebrow}>Secretariat · one-time setup</p>
        <CardTitle render={<h1 />} className={heading}>Link an authenticator app</CardTitle>
        <CardDescription className="text-lg text-muted-foreground">
          Secretariat accounts need a second step, so a stolen email alone can't get in. Signed in as <strong className="text-foreground [overflow-wrap:anywhere]">{email}</strong>.
        </CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-5 p-7 pt-5 max-md:p-5 max-md:pt-4">
        <ol className="flex flex-col gap-4 text-[17px]">
          <li><strong>1.</strong> On your phone, open an authenticator app: Google Authenticator, Microsoft Authenticator, or your phone's password app.</li>
          <li className="flex flex-col gap-3">
            <span><strong>2.</strong> Scan this code with it.</span>
            {e.error ? <ErrorBox error={e.error} onRetry={() => setE((s) => ({ n: s.n + 1 }))} what="the code to scan" />
              : e.data ? (
                <>
                  <img src={e.data.qr} alt="QR code to scan with your authenticator app" width={200} height={200} className="size-[200px] self-start rounded-sm bg-white p-2.5" />
                  <span className="text-[15px] text-muted-foreground">
                    Can't scan? Type this key instead:{' '}
                    <code className="font-mono text-foreground break-all select-all">{e.data.secret.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim()}</code>
                  </span>
                </>
              ) : <ScreenSkeleton panels={1} />}
          </li>
          <li><strong>3.</strong> Type the 6-digit code the app shows.</li>
        </ol>
        <CodeForm api={api} factorId={e.data?.factorId} disabled={!e.data} onDone={onDone} label="Code from the app" submit="Finish setup" />
      </CardPanel>
    </Card>
  );
}

/** Every sign-in after the first: one code from the linked app. */
function CodeCard({ api, email, onDone }: { api: AuthApi; email: string; onDone: () => void }) {
  return (
    <Card className={card}>
      <CardHeader className="gap-2 p-7 pb-0 max-md:p-5 max-md:pb-0">
        <p className={eyebrow}>Secretariat · second step</p>
        <CardTitle render={<h1 />} className={heading}>Enter your app code</CardTitle>
        <CardDescription className="text-lg text-muted-foreground">
          Open your authenticator app and type the 6-digit DXB MUN code. Signed in as <strong className="text-foreground [overflow-wrap:anywhere]">{email}</strong>.
        </CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-4 p-7 pt-5 max-md:p-5 max-md:pt-4">
        <CodeForm api={api} onDone={onDone} label="Code from the app" submit="Continue" />
        <p className="text-[15px] text-muted-foreground">Lost your phone? Ask the conference lead to reset your authenticator.</p>
      </CardPanel>
    </Card>
  );
}

function CodeForm({ api, factorId, disabled, onDone, label, submit, autoFocus = true }: {
  api: AuthApi; factorId?: string; disabled?: boolean; onDone: () => void; label: string; submit: string; autoFocus?: boolean;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const go = async (value: string, ev?: FormEvent) => {
    ev?.preventDefault();
    if (value.length !== 6) { setErr('Enter the 6-digit code from the app.'); return; }
    setBusy(true); setErr(null);
    try { await api.mfa.verify(value, factorId); onDone(); }
    catch (e) { setErr(errorText(e)); setCode(''); setTimeout(() => input.current?.focus(), 0); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={(ev) => void go(code, ev)} noValidate className="flex flex-col gap-3">
      <Field invalid={!!err} className="gap-1.5">
        <FieldLabel htmlFor="mfa-code" className="text-[17px] font-semibold sm:text-[17px]">{label}</FieldLabel>
        <Input
          id="mfa-code" ref={input} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
          autoFocus={autoFocus} disabled={busy || disabled}
          className="*:data-[slot=input]:h-16 *:data-[slot=input]:leading-16 *:data-[slot=input]:font-mono *:data-[slot=input]:text-[30px] *:data-[slot=input]:font-semibold *:data-[slot=input]:tracking-[0.3em]"
          value={code}
          onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setCode(v); setErr(null); if (v.length === 6) void go(v); }}
          aria-invalid={!!err || undefined} aria-describedby={err ? 'mfa-err' : undefined} placeholder="000000"
        />
      </Field>
      {err && <FieldError id="mfa-err" alert>{err}</FieldError>}
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" size="lg" className="flex-1" loading={busy} disabled={disabled || code.length !== 6}>
          {busy ? 'Checking…' : submit} <ArrowRight aria-hidden="true" />
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => void api.signOut()}><LogOut aria-hidden="true" /> Sign out</Button>
      </div>
    </form>
  );
}

// ───────────────────────── Idle lock ─────────────────────────
// Last activity is kept on the device (all tabs share it), so a reload or a reopened browser can't skip the lock.
function lastActive(): number {
  try { return Number(localStorage.getItem(LAST_ACTIVE_KEY)) || 0; } catch { return 0; }
}
function touch() {
  try { localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now())); } catch { /* this tab's timer still runs */ }
}

/** After 30 minutes without a click, key or scroll, the dashboard locks until an app code is entered. */
export function IdleLock({ api, minutes = IDLE_MINUTES }: { api: AuthApi; minutes?: number }) {
  const limit = minutes * 60_000;
  const idle = () => lastActive() > 0 && Date.now() - lastActive() > limit;
  const [locked, setLocked] = useState(() => { if (!lastActive()) touch(); return idle(); });
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let last = 0;
    const onActivity = () => {
      if (dialog.current?.open) return;
      const now = Date.now();
      if (now - last > 15_000) { last = now; touch(); }
    };
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const check = () => setLocked(idle());
    const t = setInterval(check, 15_000);
    document.addEventListener('visibilitychange', check);
    return () => { events.forEach((e) => window.removeEventListener(e, onActivity)); clearInterval(t); document.removeEventListener('visibilitychange', check); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (locked && !d.open) d.showModal();
    if (!locked && d.open) d.close();
  }, [locked]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="lock-t"
      onCancel={(e) => e.preventDefault()}
      className="m-0 h-svh max-h-none w-screen max-w-none bg-background p-0 text-foreground backdrop:bg-background"
    >
      {locked && (
        <Frame>
          <Card className={card}>
            <CardHeader className="gap-2 p-7 pb-0 max-md:p-5 max-md:pb-0">
              <Lock size={32} aria-hidden="true" className="text-muted-foreground" />
              <CardTitle render={<h1 id="lock-t" />} className={heading}>Locked</CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                No activity for {minutes} minutes, so the secretariat dashboard locked itself. Enter the code from your authenticator app to carry on.
              </CardDescription>
            </CardHeader>
            <CardPanel className="flex flex-col gap-4 p-7 pt-5 max-md:p-5 max-md:pt-4">
              <CodeForm api={api} onDone={() => { touch(); setLocked(false); }} label="Code from the app" submit="Unlock" />
              <p className="flex items-center gap-2 text-[15px] text-muted-foreground"><ShieldCheck size={16} aria-hidden="true" /> Your work is still here.</p>
            </CardPanel>
          </Card>
          <HostMark className="mt-4" />
        </Frame>
      )}
    </dialog>
  );
}
