// Sign-up (no fees, no consent): full name, school, grade, three ranked committee choices.
// After that: "Waiting for your seat" until the secretariat allocates one.
// coss ui Card + Field + Input + Select + Button, inside a slim frame with the wordmark and Sign out.
import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, CircleX, Hourglass, LogOut, UserRound } from 'lucide-react';
import type { Me, Registration } from '@/platform/v2';
import { useAction, useApi, useLoad } from '../lib/data';
import { Facts, Field, FieldError, HostMark, PageHead, Panel, Plain, Row, Rows, Skeleton, Stack, Wordmark, when } from '../ui/kit';
import { Choice, TextInput } from '../ui/controls';
import { Button } from '../ui/coss/button';
import { Status, type StatusDef } from '../ui/status';

function Frame({ children }: { children: ReactNode }) {
  const api = useApi();
  return (
    <div className="flex min-h-svh flex-col">
      <HostMark className="w-full flex-row items-baseline justify-center gap-2 border-l-0 border-t-2 border-t-gold py-1.5" />
      <header className="sticky top-0 z-30 flex h-15 items-center gap-3 border-b bg-background px-6 max-md:h-14 max-md:px-4">
        <Wordmark />
        <span className="font-mono text-[14px] font-medium uppercase text-muted-foreground max-md:hidden tracking-[0.08em]">Delegate</span>
        <span className="ms-auto flex items-center gap-2">
          <Button variant="ghost" onClick={() => void api.signOut()}><LogOut aria-hidden="true" /> <span className="max-md:sr-only">Sign out</span></Button>
        </span>
      </header>
      <main id="main" tabIndex={-1} className="main mx-auto max-w-3xl">{children}</main>
    </div>
  );
}

const RANK = ['1st choice', '2nd choice', '3rd choice'] as const;

export function SignUpScreen({ me }: { me: Me }) {
  const committees = useLoad((a) => a.committees());
  const [fullName, setFullName] = useState(me.fullName ?? '');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [choices, setChoices] = useState<string[]>(['', '', '']);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const { run, pending } = useAction();
  const list = committees.data ?? [];
  const need = Math.min(3, list.length);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.name = 'Enter your full name.';
    if (!school.trim()) next.school = 'Enter your school name.';
    if (!grade.trim()) next.grade = 'Enter your grade.';
    const picked = choices.slice(0, need);
    picked.forEach((c, i) => { if (!c) next[`c${i}`] = `Choose your ${RANK[i]}.`; });
    setErrs(next);
    if (Object.keys(next).length) return;
    await run((a) => a.signUp({ fullName: fullName.trim(), schoolName: school.trim(), grade: grade.trim(), committeeIds: picked }), 'Signed up');
  };

  return (
    <Frame>
      <PageHead title="Sign up" line="Four quick things. No fees." />
      <Panel title="Your details" icon={UserRound}>
        <form onSubmit={submit} noValidate className="w-full">
          <Stack>
            <Field label="Full name" error={errs.name}>
              {(id, by) => <TextInput id={id} aria-describedby={by} autoComplete="name" value={fullName} onChange={(e) => { setFullName(e.target.value); setErrs((x) => ({ ...x, name: '' })); }} aria-invalid={!!errs.name || undefined} />}
            </Field>
            <Field label="School name" error={errs.school}>
              {(id, by) => <TextInput id={id} aria-describedby={by} autoComplete="organization" value={school} onChange={(e) => { setSchool(e.target.value); setErrs((x) => ({ ...x, school: '' })); }} aria-invalid={!!errs.school || undefined} />}
            </Field>
            <Field label="Grade" hint="For example: Grade 11, or Year 12" error={errs.grade}>
              {(id, by) => <TextInput id={id} aria-describedby={by} className="max-w-60" value={grade} onChange={(e) => { setGrade(e.target.value); setErrs((x) => ({ ...x, grade: '' })); }} aria-invalid={!!errs.grade || undefined} />}
            </Field>
            {!committees.data ? (
              <Skeleton lines={3} />
            ) : (
              <fieldset className="flex w-full flex-col gap-3">
                <legend className="mb-2 font-heading text-[22px] font-semibold tracking-[-0.01em]">Committee choices, ranked</legend>
                {Array.from({ length: need }, (_, i) => (
                  <Field key={i} label={RANK[i]} error={errs[`c${i}`]}>
                    {(id, by) => (
                      <Choice
                        id={id} describedBy={by} label={`Committee, ${RANK[i]}`} invalid={!!errs[`c${i}`]}
                        value={choices[i]}
                        onChange={(v) => { setChoices((cs) => cs.map((c, k) => (k === i ? v : c))); setErrs((x) => ({ ...x, [`c${i}`]: '' })); }}
                        placeholder="Choose a committee"
                        options={list.map((c) => ({ value: c.id, label: `${c.abbr} · ${c.name}`, disabled: choices.some((o, k) => k !== i && o === c.id) }))}
                      />
                    )}
                  </Field>
                ))}
                {list.length === 0 && <Plain muted>Committees are to be announced.</Plain>}
              </fieldset>
            )}
            {Object.values(errs).some(Boolean) && <FieldError alert>Check the fields marked above.</FieldError>}
            <Button type="submit" size="xl" loading={pending} disabled={list.length === 0} className="max-md:w-full">
              Sign up <ArrowRight aria-hidden="true" />
            </Button>
          </Stack>
        </form>
      </Panel>
    </Frame>
  );
}

const REG: Record<Registration['status'], StatusDef> = {
  applied: { tone: 'warning', icon: Hourglass, word: 'Waiting for a seat' },
  allocated: { tone: 'warning', icon: Hourglass, word: 'Seat coming soon' },
  withdrawn: { tone: 'muted', icon: CircleX, word: 'Withdrawn' },
  rejected: { tone: 'danger', icon: CircleX, word: 'Not accepted' },
};

export function WaitingScreen({ registration: r }: { registration: Registration }) {
  const waiting = r.status === 'applied' || r.status === 'allocated';
  return (
    <Frame>
      <PageHead title={waiting ? 'Waiting for your seat' : 'Sign-up closed'} line={waiting ? 'The secretariat gives out seats. This page updates by itself.' : 'Contact the secretariat if this looks wrong.'} />
      <Panel title="Your sign-up" icon={UserRound} aside={<Status s={REG[r.status]} />}>
        <Facts items={[
          ['Name', r.fullName],
          ['School', r.schoolName],
          ['Grade', r.grade],
          ['Signed up', when(r.createdAt)],
        ]} />
        <Rows label="Your committee choices">
          {r.choices.map((c, i) => (
            <Row key={c.id} className="items-center py-2">
              <span className="inline-flex size-7.5 shrink-0 items-center justify-center bg-secondary font-mono text-[15px] font-medium">{i + 1}</span>
              <span><strong>{c.abbr}</strong> · {c.name}</span>
            </Row>
          ))}
        </Rows>
      </Panel>
    </Frame>
  );
}
