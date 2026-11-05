import { conference, resources, tba, wellness } from '@/data/conference';
import { useWellness } from '@/shared/hooks';
import { NAV } from './sections';

/*
  7 · Wellness, Resources, Contact (BLUEPRINT 3.7): short index rows in a hairline table.
  A row inverts on hover (ink ground, cream type). Rows carry their nav numbers (04–06) so the nav
  and the page count the same way.
*/
const num = (id: string) => NAV.find((s) => s.id === id)!.n;

export function IndexRows() {
  const w = useWellness();
  const res = resources[0];
  return (
    <section className="sec idx" aria-label="Wellness, resources and contact">
      <ol className="rows">
        <li id="wellness" className="row">
          <span className="k row-n">{num('wellness')}</span>
          <h2 className="row-h">Wellness</h2>
          <div className="row-body">
            <p><b>{wellness.title}.</b> {wellness.intro}</p>
            <div className="checks" role="group" aria-label={wellness.title}>
              {w.items.map((it) => {
                const on = w.checked.includes(it.id);
                return (
                  <button key={it.id} type="button" className="chk" aria-pressed={on} onClick={() => w.toggle(it.id)} data-cursor="link">
                    <i aria-hidden="true">{on ? '✓' : ''}</i>{it.label}
                  </button>
                );
              })}
            </div>
            <p className="k row-meta" aria-live="polite">{w.status} {w.note}</p>
          </div>
        </li>
        <li id="resources" className="row">
          <span className="k row-n">{num('resources')}</span>
          <h2 className="row-h">Resources</h2>
          <div className="row-body">
            <p><b>{res.title}.</b> {res.blurb}</p>
            <p className="k row-meta">{res.href ? <a href={res.href}>Open →</a> : 'Document: to be announced'}</p>
          </div>
        </li>
        <li id="contact" className="row">
          <span className="k row-n">{num('contact')}</span>
          <h2 className="row-h">Contact</h2>
          <div className="row-body">
            <dl className="row-dl">
              <div><dt className="k">Email</dt><dd>{tba(conference.email)}</dd></div>
              <div><dt className="k">Instagram</dt><dd>{tba(conference.instagram)}</dd></div>
              <div><dt className="k">Host</dt><dd>{conference.host}, {conference.city}</dd></div>
            </dl>
          </div>
        </li>
      </ol>
    </section>
  );
}
