import { ArrowUpRight } from 'lucide-react';
import { resources, tba } from '@/data/conference';
import { viewHref } from '@/shared/hooks';

const tools = [
  { title: 'Floor timer', blurb: 'A projector-ready speaking timer for the dais.', href: viewHref('timer') },
  { title: 'Delegate portal', blurb: 'Send chits to other delegations through your chair.', href: viewHref('portal') },
  { title: 'Chair portal', blurb: 'Approve or return chits and keep the decision log.', href: viewHref('chair') },
];

/** Tools for the day and reading material. Rows light up like house lights when you point at them. */
export function Resources() {
  return (
    <section id="resources" className="res" aria-labelledby="res-h">
      <div className="wrap res-grid">
        <div className="res-side">
          <h2 id="res-h" className="h2">On the day</h2>
          <p className="res-sub">The tools you will use in committee, and what to read before you arrive.</p>
        </div>
        <ul className="rows">
          {tools.map((t) => (
            <li key={t.title}>
              <a className="row" href={t.href}>
                <span className="row-t">{t.title}</span>
                <span className="row-b">{t.blurb}</span>
                <ArrowUpRight className="row-i" size={28} strokeWidth={1.5} aria-hidden="true" />
              </a>
            </li>
          ))}
          {resources.map((r) =>
            r.href ? (
              <li key={r.title}>
                <a className="row" href={r.href}>
                  <span className="row-t">{r.title}</span>
                  <span className="row-b">{r.blurb}</span>
                  <ArrowUpRight className="row-i" size={28} strokeWidth={1.5} aria-hidden="true" />
                </a>
              </li>
            ) : (
              <li key={r.title}>
                <div className="row is-soon">
                  <span className="row-t">{r.title}</span>
                  <span className="row-b">{r.blurb}</span>
                  <span className="row-tag">{tba(r.href)}</span>
                </div>
              </li>
            ),
          )}
        </ul>
      </div>
    </section>
  );
}
