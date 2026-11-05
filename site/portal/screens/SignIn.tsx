// Sign in: email, then the emailed code. Built from the coss ui auth card (particle p-card-2: Card + Field +
// Input + Button), beside an IHS maroon host panel. The code field is one coss Input that takes 6–10 digits,
// because Supabase's code length is a project setting (6 by default, up to 10). Pasting a full code submits.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Mail, RotateCw } from 'lucide-react';
import type { AuthApi } from '@/platform/v2';
import { conference } from '@/data/conference';
import { errorText } from '../lib/data';
import { DemoControls } from '../ui/DemoControls';
import { FieldError, HostMark, Wordmark } from '../ui/kit';
import { Card, CardDescription, CardFooter, CardHeader, CardPanel, CardTitle } from '../ui/coss/card';
import { Field, FieldLabel } from '../ui/coss/field';
import { Input } from '../ui/coss/input';
import { Button } from '../ui/coss/button';

const MIN = 6;
const MAX = 10;
const WAIT = 30;

export type SignInProps = {
  /** Any v2 API works here (delegate, chair or secretariat): sign-in only needs AuthApi. */
  api: AuthApi;
  /** The product name in the card's eyebrow. Default "Delegate dashboard"; the admin uses "Secretariat dashboard". */
  title?: string;
  /** Show the demo scenario menu (demo mode only). Default true. The "Sample data" marker stays either way. */
  showScenarios?: boolean;
  /** The line under the motto on the host panel. Default is the delegate one. */
  tagline?: string;
};

export function SignIn({
  api, title = 'Delegate dashboard', showScenarios = true,
  tagline = 'Your seat, the timer, your votes and your notes, in one place.',
}: SignInProps) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [left, setLeft] = useState(0);

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
      await api.sendCode(v);
      setStep('code');
      setLeft(WAIT);
    } catch (e2) { setErr(errorText(e2)); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-svh flex-col md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <HostPanel tagline={tagline} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-15 items-center gap-3 border-b px-8 max-md:min-h-14 max-md:px-4">
          <span className="md:hidden"><Wordmark /></span>
          <DemoControls api={api} menu={showScenarios} />
        </header>
        <main id="main" tabIndex={-1} className="grid flex-1 place-items-center px-4 pt-8 pb-12 outline-none max-md:place-items-start max-md:pt-5">
          <Card className="w-full max-w-[460px] rounded-sm shadow-none before:hidden">
            <CardHeader className="gap-2 p-7 pb-0 max-md:p-5 max-md:pb-0">
              <p className="font-label text-[15px] font-semibold uppercase text-primary tracking-[0.06em]">{conference.edition} · {title}</p>
              <CardTitle render={<h1 />} className="font-heading text-[56px] font-semibold leading-[1.05] max-md:text-[46px] tracking-[-0.02em]">Sign in</CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                {step === 'email'
                  ? "We'll email you a sign-in code. No password needed."
                  : <>We sent a code to <strong className="block break-words text-foreground">{email}</strong></>}
              </CardDescription>
            </CardHeader>
            {step === 'email' ? (
              <form onSubmit={send} noValidate>
                <CardPanel className="flex flex-col gap-3 p-7 pt-5 max-md:p-5 max-md:pt-4">
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
                onResend={async () => { setErr(null); try { await api.sendCode(email.trim()); setLeft(WAIT); } catch (e) { setErr(errorText(e)); } }}
                onBack={() => { setStep('email'); setErr(null); }}
                outerErr={err}
              />
            )}
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
        <p className="font-label text-[15px] font-semibold uppercase text-cream tracking-[0.06em]">{conference.edition} · {conference.city}</p>
        <p className="mt-3 font-heading text-[64px] font-semibold italic leading-[1.05] lg:text-[80px] tracking-[-0.02em]">{conference.motto}</p>
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
