// NAME: Secretariat dispatch
// IDEA: Resources and contact as one diplomatic dispatch: To / From / Email / Instagram fields, documents as numbered annex lines, and a closing signature line as the footer.
// WHY: One familiar form, read top to bottom, holds everything a delegate needs at the end of the page; the institutional format signals a serious, real conference.
// WILD: Write the dispatch: the Subject line is a live field, and pressing Send folds the sheet into a paper plane that lands in the secretariat's portal inbox.
import type { ReactNode } from 'react';
import { conference, resources, tba } from '@/data/conference';
import { admin, chair, portal } from '../links';
import './contact-b.css';

const pad2 = (n: number) => String(n).padStart(2, '0');
const Arrow = () => (
  <svg className="conb-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12 12 4M6 4h6v6" /></svg>
);

export function ContactB({ id = 'contact' }: { id?: string }) {
  const resId = id === 'contact' ? 'resources' : id + '-resources';
  const fields: [string, ReactNode, boolean?][] = [
    ['To', 'The Secretariat, ' + conference.edition],
    ['From', 'You'],
    ['Email', tba(conference.email), !conference.email],
    ['Instagram', tba(conference.instagram), !conference.instagram],
    ['Host', <><span className="conb-seal" aria-hidden="true">IHS</span>{conference.host}, {conference.city}</>],
  ];

  return (
    <section id={id} className="conb" aria-labelledby={id + '-h'}>
      <div className="conb-wrap">
        <div className="conb-side">
          <p className="conb-label"><span>06–07</span>Resources · Contact</p>
          <h2 className="conb-h" id={id + '-h'}>Write to the secretariat.</h2>
        </div>

        <article className="conb-sheet" aria-label="Dispatch to the secretariat">
          <header className="conb-sheet-top">
            <b>Dispatch</b>
            <span>{conference.edition} · {conference.city}</span>
          </header>

          <dl className="conb-fields">
            {fields.map(([k, v, pending]) => (
              <div key={k} className="conb-row">
                <dt>{k}</dt>
                <dd className={pending ? 'is-pending' : undefined}>
                  {k === 'Email' && conference.email ? <a href={'mailto:' + conference.email}>{conference.email}</a>
                    : k === 'Instagram' && conference.instagram ? <a href={'https://instagram.com/' + conference.instagram.replace(/^@/, '')}>{conference.instagram}</a>
                    : v}
                </dd>
              </div>
            ))}
          </dl>

          <div className="conb-annex" id={resId} aria-labelledby={resId + '-h'}>
            <h3 className="conb-annex-h" id={resId + '-h'}><span>Annex</span>Resources for delegates</h3>
            <ol className="conb-annex-list">
              {resources.map((r, i) => (
                <li key={r.title}>
                  <span className="conb-an">A.{pad2(i + 1)}</span>
                  <span className="conb-at"><b>{r.title}</b><span>{r.blurb}</span></span>
                  <span className="conb-as">
                    {r.href ? <a href={r.href}>Open <Arrow /></a> : tba(r.href)}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <footer className="conb-close">
            <p className="conb-motto">{conference.motto}.</p>
            <div className="conb-signline">
              <span className="conb-sig" aria-hidden="true" />
              <span className="conb-sigt">For the Secretariat · {conference.edition}</span>
            </div>
          </footer>
        </article>
      </div>

      <footer className="conb-foot">
        <div className="conb-foot-in">
          <span>© {conference.edition} · {conference.kind} · {conference.city}</span>
          <nav aria-label="Staff">
            <a href={portal}>Portal</a>
            <a href={chair}>Chair</a>
            <a href={admin}>Admin</a>
          </nav>
        </div>
      </footer>
    </section>
  );
}
