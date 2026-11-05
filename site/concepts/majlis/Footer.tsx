import { conference, tba } from '@/data/conference';
import { Screen, Star } from './ornament';
import { SectionLink } from './scroll';

export function Footer() {
  const rows = [
    { k: 'Email', v: conference.email, href: conference.email ? 'mailto:' + conference.email : null },
    { k: 'Instagram', v: conference.instagram, href: conference.instagram },
    { k: 'Registration', v: conference.registerUrl ? 'Register' : null, href: conference.registerUrl },
  ];
  return (
    <footer id="contact" className="ftr" aria-labelledby="ftr-h">
      <div className="ftr-band" aria-hidden="true"><Screen cols={24} rows={1} anchor="xMidYMid" className="ftr-scr" open="all" /></div>
      <div className="wrap ftr-grid">
        <div className="ftr-id">
          <p className="ftr-ar" lang="ar" dir="rtl">نموذج الأمم المتحدة</p>
          <p className="ftr-word">DXB MUN</p>
          <p className="ftr-motto">{conference.motto}</p>
        </div>
        <div className="ftr-contact">
          <h2 id="ftr-h" className="h2 on-dark">Contact</h2>
          <dl className="ftr-list">
            {rows.map((r) => (
              <div key={r.k} className="ftr-row">
                <dt>{r.k}</dt>
                <dd>{r.href ? <a href={r.href}>{r.v}</a> : <span className="is-tba">{tba(r.v)}</span>}</dd>
              </div>
            ))}
          </dl>
          <p className="ftr-small">Details are published here as soon as they are confirmed.</p>
        </div>
      </div>
      <div className="wrap ftr-base">
        <p>
          © {conference.year} {conference.name}
          <Star size={10} className="orn" />
          {conference.host}
          <Star size={10} className="orn" />
          <span lang="ar" dir="rtl">دبي</span>
        </p>
        <SectionLink to="home" className="ftr-top">Back to top</SectionLink>
      </div>
    </footer>
  );
}
