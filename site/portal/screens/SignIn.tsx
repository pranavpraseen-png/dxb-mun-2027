// Sign in: email, then the emailed code. Built from the coss ui auth card (particle p-card-2: Card + Field +
// Input + Button), beside an IHS maroon host panel. The code field is one coss Input that takes 6–10 digits,
// because Supabase's code length is a project setting (6 by default, up to 10). Pasting a full code submits.
// 2026-11-07 (owner picked the recommended setup): Google / Microsoft buttons (VITE_AUTH_PROVIDERS), "Remember me",
// and the Turnstile bot check on "Email me a code" (VITE_TURNSTILE_SITE_KEY). See site/AUTH-SETUP.md.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Mail, RotateCw } from 'lucide-react';
import type { AuthApi, AuthProvider } from '@/platform/v2';
import { useCaptcha } from '../lib/captcha';
import { Checkbox } from '../ui/coss/checkbox';
import { Backdrop, pickBackdrop } from '../ui/Backdrop';
import { conference } from '@/data/conference';
import { errorText } from '../lib/data';
import { FieldError, HostMark, Wordmark } from '../ui/kit';
import { Card, CardDescription, CardFooter, CardHeader, CardPanel, CardTitle } from '../ui/coss/card';
import { Field, FieldLabel } from '../ui/coss/field';
import { Input } from '../ui/coss/input';
import { Button } from '../ui/coss/button';

const MIN = 6;
const MAX = 10;
const WAIT = 30;

const isProvider = (v: string): v is AuthProvider => v === 'google' || v === 'microsoft';
/** Live: only the providers switched on in Supabase (VITE_AUTH_PROVIDERS). Demo: both, to preview them. */
const LIVE_PROVIDERS = (import.meta.env.VITE_AUTH_PROVIDERS ?? '').split(',').map((v) => v.trim().toLowerCase()).filter(isProvider);

export type SignInProps = {
  /** Any v2 API works here (delegate, chair or secretariat): sign-in only needs AuthApi. */
  api: AuthApi;
  /** The product name in the card's eyebrow. Default "Delegate dashboard"; the admin uses "Secretariat dashboard". */
  title?: string;
  /** The line under the motto on the host panel. Default is the delegate one. */
  tagline?: string;
};

export function SignIn({
  api, title = 'Delegate dashboard',
  tagline = 'Your seat, the timer, your votes and your notes, in one place.',
}: SignInProps) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [remember, setRemember] = useState(() => api.remembered());
  const [leaving, setLeaving] = useState<AuthProvider | null>(null);
  const captcha = useCaptcha();
  const [backdrop] = useState(pickBackdrop);
  const providers = api.mode === 'demo' ? (['google', 'microsoft'] as const) : LIVE_PROVIDERS;

  const withProvider = async (p: AuthProvider) => {
    setErr(null); setLeaving(p);
    try { api.setRemember(remember); await api.signInWith(p); }
    catch (e) { setErr(errorText(e)); setLeaving(null); }
  };

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const v = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(v)) { setErr('Enter a full email address, like name@school.ae.'); return; }
    setBusy(true); setErr(null);
    try {
      api.setRemember(remember);
      await api.sendCode(v, await captcha.token());
      setStep('code');
      setLeft(WAIT);
    } catch (e2) { setErr(errorText(e2)); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-svh flex-col md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <HostPanel tagline={tagline} />
      <div className="relative isolate flex min-w-0 flex-1 flex-col overflow-hidden">
        {backdrop && <Backdrop kind={backdrop} />}
        <header className="flex min-h-15 items-center gap-3 border-b px-8 max-md:min-h-14 max-md:px-4">
          <span className="md:hidden"><Wordmark /></span>
        </header>
        <main id="main" tabIndex={-1} className="grid flex-1 place-items-center px-4 pt-8 pb-12 outline-none max-md:place-items-start max-md:pt-5">
          <Card className={`w-full max-w-[460px] rounded-sm shadow-none before:hidden ${backdrop ? 'bg-card/72' : ''}`}>
            <CardHeader className="gap-2 p-7 pb-0 max-md:p-5 max-md:pb-0">
              <p className="font-mono text-[14px] font-medium uppercase text-muted-foreground tracking-[0.08em]">{conference.edition} · {title}</p>
              <CardTitle render={<h1 />} className="font-heading font-wide text-[56px] font-extrabold leading-[1.05] max-md:text-[46px] tracking-[-0.02em]">Sign in</CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                {step === 'email'
                  ? "We'll email you a sign-in code. No password needed."
                  : <>We sent a code to <strong className="block break-words text-foreground">{email}</strong></>}
              </CardDescription>
            </CardHeader>
            {step === 'email' ? (
              <form onSubmit={send} noValidate>
                <CardPanel className="flex flex-col gap-3 p-7 pt-5 max-md:p-5 max-md:pt-4">
                  {providers.length > 0 && (
                    <>
                      <div className="flex flex-col gap-2.5">
                        {providers.map((p) => (
                          <Button key={p} type="button" variant="outline" size="lg" className="w-full" loading={leaving === p} disabled={!!leaving || busy} onClick={() => void withProvider(p)}>
                            {p === 'google' ? <GoogleMark /> : <MicrosoftMark />} Continue with {p === 'google' ? 'Google' : 'Microsoft'}
                          </Button>
                        ))}
                      </div>
                      <p className="flex items-center gap-3 font-mono text-[13px] uppercase tracking-[0.08em] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">or use your email</p>
                    </>
                  )}
                  <Field invalid={!!err} className="gap-1.5">
                    <FieldLabel htmlFor="email" className="text-[17px] font-semibold sm:text-[17px]">Your email</FieldLabel>
                    <div className="relative w-full">
                      <Mail size={20} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email" type="email" inputMode="email" autoComplete="email" autoFocus
                        className="*:data-[slot=input]:ps-11"
                        value={email} onChange={(e) => { setEmail(e.target.value); setErr(null); }}
                        aria-invalid={!!err || undefined} aria-describedby={err ? 'signin-err' : undefined}
                        placeholder="name@school.ae"
                      />
                    </div>
                    {err && <FieldError id="signin-err" alert>{err}</FieldError>}
                  </Field>
                  <label className="flex cursor-pointer items-start gap-3 py-1 text-[17px]">
                    <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} className="mt-1" aria-describedby="remember-hint" />
                    <span className="flex flex-col">
                      <span className="font-semibold">Remember me</span>
                      <span id="remember-hint" className="text-[15px] text-muted-foreground">Stay signed in on this device. Leave it off on a shared computer.</span>
                    </span>
                  </label>
                  <Button type="submit" size="lg" className="w-full" loading={busy}>
                    {busy ? 'Sending…' : 'Email me a code'} <ArrowRight aria-hidden="true" />
                  </Button>
                </CardPanel>
                {api.mode === 'demo' && (
                  <CardFooter className="border-t px-7 py-4 max-md:px-5">
                    <p className="text-[15px] text-muted-foreground">Demo: any email works. The code is 123456.</p>
                  </CardFooter>
                )}
              </form>
            ) : (
              <CodeStep
                api={api} email={email} left={left}
                onResend={async () => { setErr(null); try { await api.sendCode(email.trim(), await captcha.token()); setLeft(WAIT); } catch (e) { setErr(errorText(e)); } }}
                onBack={() => { setStep('email'); setErr(null); }}
                outerErr={err}
              />
            )}
            {captcha.on && <div ref={captcha.ref} className="flex justify-center px-7 pb-4 empty:hidden max-md:px-5" />}
          </Card>
        </main>
      </div>
    </div>
  );
}

/** The host panel: IHS maroon. A full-height panel on desktop, a slim band on phones. */
function HostPanel({ tagline }: { tagline: string }) {
  return (
    <aside aria-label="Host school" className="bg-maroon text-foreground md:sticky md:top-0 md:flex md:h-svh md:flex-col md:justify-between md:p-10 max-md:order-first">
      <span className="max-md:hidden"><Wordmark /></span>
      <div className="max-md:hidden">
        <p className="font-mono text-[14px] font-medium uppercase text-cream tracking-[0.08em]">{conference.edition} · {conference.city}</p>
        <p className="mt-3 font-serif text-[64px] font-normal italic leading-[1.05] lg:text-[80px] tracking-[-0.01em]">{conference.motto}</p>
        <p className="mt-4 max-w-[34ch] text-lg text-cream">{tagline}</p>
      </div>
      <HostMark className="bg-transparent py-0 ps-3 max-md:flex max-md:w-full max-md:flex-row max-md:items-baseline max-md:gap-2 max-md:border-l-0 max-md:border-t-2 max-md:border-t-gold max-md:px-4 max-md:py-2" />
    </aside>
  );
}

function CodeStep({
  api, email, left, onResend, onBack, outerErr,
}: { api: AuthApi; email: string; left: number; onResend: () => void; onBack: () => void; outerErr: string | null }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => { first.current?.focus(); }, []);

  const submit = async (value: string) => {
    if (value.length < MIN || value.length > MAX) { setErr(`Enter the ${MIN}–${MAX} digit code from the email.`); return; }
    setBusy(true); setErr(null);
    try {
      await api.verifyCode(email.trim(), value);
      // onAuth takes it from here.
    } catch (e) {
      setErr(errorText(e) || 'That code did not work. Try again.');
      setCode('');
      setTimeout(() => first.current?.focus(), 0);
    } finally { setBusy(false); }
  };

  const shown = err ?? outerErr;
  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(code); }} noValidate>
      <CardPanel className="flex flex-col gap-3 p-7 pt-5 max-md:p-5 max-md:pt-4">
        <Field invalid={!!shown} className="gap-1.5">
          <FieldLabel htmlFor="otp" className="text-[17px] font-semibold sm:text-[17px]">Enter the code from the email</FieldLabel>
          <Input
            id="otp" ref={first} type="text" inputMode="numeric" autoComplete="one-time-code"
            maxLength={MAX} disabled={busy}
            className="*:data-[slot=input]:h-16 *:data-[slot=input]:leading-16 *:data-[slot=input]:font-mono *:data-[slot=input]:text-[30px] *:data-[slot=input]:font-semibold *:data-[slot=input]:tracking-[0.3em]"
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, MAX)); setErr(null); }}
            onPaste={(e) => {
              const v = e.clipboardData.getData('text').replace(/\D/g, '');
              if (v.length >= MIN && v.length <= MAX) { e.preventDefault(); setCode(v); void submit(v); }
            }}
            aria-invalid={!!shown || undefined} aria-describedby={shown ? 'otp-err' : undefined}
            placeholder="Code"
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={code.length < MIN}>
          {busy ? 'Checking…' : 'Sign in'} <ArrowRight aria-hidden="true" />
        </Button>
        {shown && <FieldError id="otp-err" alert>{shown}</FieldError>}
        <p className="min-h-[1.4em] text-base text-muted-foreground" aria-live="polite">{busy ? 'Checking your code…' : ''}</p>
        <div className="flex flex-wrap justify-between gap-2.5">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft aria-hidden="true" /> Change email
          </Button>
          <Button variant="outline" onClick={onResend} disabled={left > 0}>
            <RotateCw aria-hidden="true" />
            {left > 0 ? `Resend in ${left}s` : 'Resend code'}
          </Button>
        </div>
      </CardPanel>
      {api.mode === 'demo' && (
        <CardFooter className="border-t px-7 py-4 max-md:px-5">
          <p className="text-[15px] text-muted-foreground">Demo: the code is 123456.</p>
        </CardFooter>
      )}
    </form>
  );
}

/** Google's "G" mark, for the Continue with Google button. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-5">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

/** Microsoft's four squares, for the Continue with Microsoft button. */
function MicrosoftMark() {
  return (
    <svg viewBox="0 0 21 21" aria-hidden="true" className="size-5">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" /><rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" /><rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
