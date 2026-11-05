// The calm page: reduced motion, `?still`, or no WebGL. Every section, every fact, a plain top nav, no motion.
import { CLAUSES, DUBAI, DUBAI_LABEL, FACT_ROWS, SCENES, committees, conference, pad2, schedule, stats } from './content';
import { register as registerUrl, signIn } from './links';

/** A line-drawn globe (orthographic), the same idea as the stage's hero, as one static SVG. */
function GlobeSvg() {
  const S = 320, r = 150, c = S / 2;
  const lat0 = 18 * (Math.PI / 180), lon0 = (DUBAI.lon - 18) * (Math.PI / 180);
  const proj = (lat: number, lon: number) => {
    const la = lat * (Math.PI / 180), dl = lon * (Math.PI / 180) - lon0;
    const x = Math.cos(la) * Math.sin(dl);
    const y = Math.cos(lat0) * Math.sin(la) - Math.sin(lat0) * Math.cos(la) * Math.cos(dl);
    const z = Math.sin(lat0) * Math.sin(la) + Math.cos(lat0) * Math.cos(la) * Math.cos(dl);
    return { x: c + r * x, y: c - r * y, z };
  };
  const line = (pts: { x: number; y: number; z: number }[]) => {
    let d = '', pen = false;
    pts.forEach((p) => {
      if (p.z < 0) { pen = false; return; }
      d += (pen ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
      pen = true;
    });
    return d;
  };
  const paths: string[] = [];
  for (let lon = -180; lon < 180; lon += 20) paths.push(line(Array.from({ length: 37 }, (_, i) => proj(-90 + i * 5, lon))));
  for (let lat = -60; lat <= 60; lat += 20) paths.push(line(Array.from({ length: 73 }, (_, i) => proj(lat, -180 + i * 5))));
  const d = proj(DUBAI.lat, DUBAI.lon);
  return (
    <svg className="st-globe" viewBox={`0 0 ${S} ${S}`} role="img" aria-label="A line-drawn globe with Dubai marked">
      {paths.map((p, i) => <path key={i} d={p} />)}
      <circle className="st-limb" cx={c} cy={c} r={r} />
      <circle className="st-dxb" cx={d.x} cy={d.y} r={9} />
      <rect className="st-dxb-dot" x={d.x - 3} y={d.y - 3} width={6} height={6} />
    </svg>
  );
}

export function Static() {
  return (
    <div className="st">
      <a className="skip" href="#main">Skip to content</a>
      <header className="st-bar">
        <a className="logo" href="#globe"><span className="logo-mark" aria-hidden="true"><i /></span><span className="logo-word">DXB MUN <b>2027</b></span></a>
        <nav aria-label="Sections">
          <ol className="st-nav">
            {SCENES.map((s, i) => <li key={s.id}><a href={'#' + s.id}><span className="mono">{pad2(i + 1)}</span> {s.name}</a></li>)}
          </ol>
        </nav>
        <a className="btn btn--accent" href={registerUrl}>Register <span aria-hidden="true">→</span></a>
      </header>

      <main id="main" tabIndex={-1}>
        <section id="globe" className="st-sec st-hero">
          <div>
            <p className="mono cap-k"><span className="cap-n">01</span> // {conference.kind} · {conference.city} · {conference.year}</p>
            <h1 className="hero-h">{conference.edition}</h1>
            <p className="hero-line"><em>Diplomacy</em> around us.</p>
            <p className="mono st-host"><span className="host-mark" aria-hidden="true" /> Hosted by {conference.host}</p>
          </div>
          <GlobeSvg />
        </section>

        <section id="dubai" className="st-sec">
          <p className="mono cap-k"><span className="cap-n">02</span> // The city · {DUBAI_LABEL}</p>
          <h2 className="cap-h">Hosted in <em>{conference.city}</em>.</h2>
          <dl className="rows">{FACT_ROWS.dubai.map(([k, v]) => <div className="row" key={k}><dt className="mono">{k}</dt><dd className={v === 'To be announced' ? 'is-tba' : ''}>{v}</dd></div>)}</dl>
        </section>

        <section id="resolution" className="st-sec">
          <p className="mono cap-k"><span className="cap-n">03</span> // Draft resolution · {conference.edition}</p>
          <h2 className="cap-h">The <em>resolution</em>.</h2>
          <p className="cap-p">A {conference.kind} in {conference.city}.</p>
          <ol className="st-clauses">
            {CLAUSES.map((c, i) => (
              <li key={c.verb} className={c.host ? 'is-host' : ''}>
                <span className="mono clause-k">{pad2(i + 1)} · {c.verb}</span>
                <span className="clause-f">{c.fact}</span>
              </li>
            ))}
          </ol>
        </section>

        <section id="committees" className="st-sec">
          <p className="mono cap-k"><span className="cap-n">04</span> // Committees</p>
          <h2 className="cap-h">{stats[0].value} <em>committees</em>.</h2>
          <ol className="st-cmt">
            {committees.map((c, i) => (
              <li key={c.abbr}><span className="mono">{pad2(i + 1)}</span><b>{c.abbr}</b><span>{c.name}</span></li>
            ))}
          </ol>
        </section>

        <section id="schedule" className="st-sec">
          <p className="mono cap-k"><span className="cap-n">05</span> // Schedule</p>
          <h2 className="cap-h">{stats[1].value} <em>days</em>.</h2>
          <p className="mono cap-meta">{stats[2].value} committee sessions · dates to be announced</p>
          <div className="st-days">
            {schedule.map((d) => (
              <div key={d.day}>
                <h3 className="mono st-day">{d.label}</h3>
                <ol className="slots">
                  {d.slots.map((s, j) => (
                    <li key={j} className={'slot' + (s.name.startsWith('Committee Session') ? ' is-session' : '')}>
                      <span className="mono slot-n">{pad2(j + 1)}</span>
                      <span className="mono slot-t">{s.time}</span>
                      <span className="slot-name">{s.name}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        <section id="register" className="st-sec">
          <p className="mono cap-k"><span className="cap-n">06</span> // Register</p>
          <h2 className="cap-h">Register as a <em>delegate</em>.</h2>
          <dl className="rows">{FACT_ROWS.register.map(([k, v]) => <div className="row" key={k}><dt className="mono">{k}</dt><dd className={v === 'To be announced' ? 'is-tba' : ''}>{v}</dd></div>)}</dl>
          <div className="cap-cta">
            <a className="btn btn--accent" href={registerUrl}>Register <span aria-hidden="true">→</span></a>
            <a className="btn" href={signIn}>Sign in</a>
          </div>
        </section>
      </main>

      <footer className="st-foot">
        <p className="host"><span className="host-mark" aria-hidden="true" /><span className="mono">{conference.edition} · Hosted by {conference.host} · {conference.city}</span></p>
      </footer>
    </div>
  );
}
