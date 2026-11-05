import type { ReactNode } from 'react';
import clsx from 'clsx';
import type { usePortal } from '@/shared/hooks';
import type { ChitStatus } from '@/data/portal-mock';

export type Portal = ReturnType<typeof usePortal>;

export function PortalShell({ kind, title, ident, children, aside }: { kind: string; title: string; ident: { k: string; v: string }[]; children: ReactNode; aside?: ReactNode }) {
  return (
    <main id="main" className="pt">
      <div className="pt-wrap">
        <header className="pt-head">
          <div>
            <p className="pt-kind">
              {kind}
              <span className="pt-preview">Preview · sample data</span>
            </p>
            <h1 className="pt-h1">{title}</h1>
          </div>
          <dl className="pt-ident">
            {ident.map((i) => (
              <div key={i.k}>
                <dt>{i.k}</dt>
                <dd>{i.v}</dd>
              </div>
            ))}
          </dl>
        </header>
        {aside}
        {children}
      </div>
    </main>
  );
}

export function Panel({ id, title, count, tools, children, className }: { id: string; title: string; count?: ReactNode; tools?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx('pn', className)} aria-labelledby={id}>
      <div className="pn-head">
        <h2 id={id} className="pn-h">
          {title}
          {count}
        </h2>
        {tools}
      </div>
      {children}
    </section>
  );
}

export function Pill({ status, label }: { status: ChitStatus; label: string }) {
  return <span className={clsx('pill', 'pill--' + status)}>{label}</span>;
}

export function Count({ n, tone = 'plain' }: { n: number; tone?: 'plain' | 'hot' }) {
  return <span className={clsx('pn-count', n === 0 && 'is-zero', tone === 'hot' && n > 0 && 'is-hot')}>{n}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="pn-empty">{children}</p>;
}
