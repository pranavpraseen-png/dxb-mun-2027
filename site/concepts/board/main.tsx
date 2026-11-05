import { createRoot } from 'react-dom/client';
import { useState, type CSSProperties } from 'react';
import './fonts';
import './board.css';
import { conference, committees, stats, nav } from '@/data/conference';
import { palettes, PAIRS, TOKEN_ROLE, type Palette, type TokenName } from './palettes';
import { pairings, type Pairing, type Face } from './fonts';
import { apca, css, hex, inGamut, token, vars } from './color';

// Facts only, all read from src/data/conference.ts.
const EDITION = conference.edition; // DXB MUN 2027
const MOTTO = `${conference.motto}.`; // Diplomacy around us.
const HOST = conference.host; // Indian High School
const UNSC = committees.find((c) => c.abbr === 'UNSC')!;
const COUNT = stats.find((s) => s.label === 'Committees')!.value; // 19
const NAV = nav.filter((n) => ['about', 'committees', 'schedule', 'contact'].includes(n.id)).map((n) => n.label);
const PLATES = committees.filter((c) => ['UNSC', 'DISEC', 'ECOSOC', 'WHO'].includes(c.abbr)).map((c) => c.abbr);

const face = (f: Face, size?: number): CSSProperties => ({
  fontFamily: f.family,
  fontWeight: f.weight,
  fontSize: size,
  letterSpacing: f.tracking ? `${f.tracking}em` : undefined,
  fontStretch: f.stretch,
  fontVariationSettings: f.variation,
  textTransform: f.upper ? 'uppercase' : undefined,
});

/** Utopia-style fluid size: exactly `min` px at a 390 px viewport and `max` px at 1440, whole pixels at both. */
const fl = (min: number, max: number) => `clamp(${min}px, calc(${min}px + ${max - min} * ((100vw - 390px) / 1050)), ${max}px)`;

function Preview({ p, f, big = false }: { p: Palette; f: Pairing; big?: boolean }) {
  const s = big
    ? { hero: fl(44, 104), motto: fl(22, 40), plateAbbr: fl(30, 44), clause: fl(20, 30), text: 16 }
    : { hero: 40, motto: 20, plateAbbr: 28, clause: 19, text: 14 };
  return (
    <div className={`pv ${p.dark ? 'is-dark' : 'is-light'} ${big ? 'pv-big' : ''}`} style={{ ...vars(p), fontFamily: f.text.family } as CSSProperties}>
      <div className="pv-host" style={{ fontFamily: f.text.family }}>
        <span className="pv-host-rule" aria-hidden />
        Hosted by {HOST}, {conference.city}
      </div>
      <nav className="pv-nav" aria-label="Sample navigation">
        <span className="pv-mark" style={face(f.display, big ? 20 : 16)}>{EDITION}</span>
        <span className="pv-links">
          {NAV.map((n) => (
            <span key={n}>{n}</span>
          ))}
        </span>
      </nav>
      <div className="pv-hero">
        <h3 className="pv-h" style={{ ...face(f.display), fontSize: s.hero }}>{EDITION}</h3>
        <p className="pv-motto" style={{ fontFamily: f.verb.family, fontWeight: f.verb.weight, fontVariationSettings: f.verb.variation, fontSize: s.motto }}>
          {MOTTO}
        </p>
        <div className="pv-row">
          <div className="pv-plate">
            <span className="pv-plate-abbr" style={{ ...face(f.display), fontSize: s.plateAbbr, textTransform: 'uppercase' }}>{UNSC.abbr}</span>
            <span className="pv-plate-name" style={{ fontFamily: f.text.family, fontSize: big ? 14 : 12 }}>{UNSC.name}</span>
          </div>
          <p className="pv-clause" style={{ fontFamily: f.text.family, fontSize: s.clause }}>
            <em style={{ fontFamily: f.verb.family, fontWeight: f.verb.weight, fontVariationSettings: f.verb.variation }}>Convenes</em> {COUNT} committees;
          </p>
        </div>
        <div className="pv-foot">
          <button type="button" className="pv-btn" style={{ fontFamily: f.text.family, fontSize: big ? 16 : 14 }}>Register</button>
          <span className="pv-data" style={{ fontFamily: f.mono.family, fontSize: big ? 13 : 12 }}>{PLATES.join(' · ')}</span>
        </div>
      </div>
    </div>
  );
}

function Score({ p, i }: { p: Palette; i: number }) {
  const q = PAIRS[i];
  const lc = apca(token(p, q.text), token(p, q.bg));
  const ok = Math.abs(lc) >= q.need;
  return (
    <tr>
      <td>{q.label}</td>
      <td className="num">{Math.abs(lc).toFixed(1)}</td>
      <td className="num">{q.need}</td>
      <td className={ok ? 'pass' : 'fail'}>{ok ? '✓ Pass' : '✕ Below'}</td>
    </tr>
  );
}

function PaletteCard({ p, n, f }: { p: Palette; n: number; f: Pairing }) {
  return (
    <article className="card" id={`palette-${p.id}`}>
      <header className="card-head">
        <span className="card-n">{n}</span>
        <div>
          <h3 className="card-title">{p.name}</h3>
          <p className="card-src">{p.source}</p>
        </div>
        <span className="card-tag">{p.dark ? 'Dark' : 'Light'}</span>
      </header>
      <Preview p={p} f={f} />
      <ul className="sw">
        {(Object.keys(p.t) as TokenName[]).map((k) => (
          <li key={k}>
            <span className="sw-chip" style={{ background: css(p.t[k]) }} />
            <span className="sw-name">{k}</span>
            <span className="sw-role">{TOKEN_ROLE[k]}</span>
            <code className="sw-val">{css(p.t[k])}</code>
            <code className="sw-hex">{hex(p.t[k])}{inGamut(p.t[k]) ? '' : ' (clipped)'}</code>
          </li>
        ))}
      </ul>
      <table className="apca">
        <thead>
          <tr><th>APCA pair</th><th className="num">Lc</th><th className="num">Need</th><th>Result</th></tr>
        </thead>
        <tbody>
          {PAIRS.map((_, i) => <Score key={i} p={p} i={i} />)}
        </tbody>
      </table>
    </article>
  );
}

function Specimen({ f, n }: { f: Pairing; n: number }) {
  return (
    <article className="card spec" id={`font-${f.id}`}>
      <header className="card-head">
        <span className="card-n">{n}</span>
        <div>
          <h3 className="card-title">{f.name}</h3>
          <p className="card-src">{f.why}</p>
        </div>
      </header>
      <div className="spec-body">
        <p className="spec-hero" style={face(f.display)}>{EDITION}</p>
        <p className="spec-motto" style={{ fontFamily: f.verb.family, fontWeight: f.verb.weight, fontVariationSettings: f.verb.variation }}>{MOTTO}</p>
        <div className="spec-row">
          <div className="spec-plate">
            <span style={{ ...face(f.display), textTransform: 'uppercase' }} className="spec-plate-abbr">{UNSC.abbr}</span>
            <span style={{ fontFamily: f.text.family }} className="spec-plate-name">{UNSC.name}</span>
          </div>
          <p className="spec-clause" style={{ fontFamily: f.text.family }}>
            <em style={{ fontFamily: f.verb.family, fontWeight: f.verb.weight, fontVariationSettings: f.verb.variation }}>Convenes</em> {COUNT} committees;
          </p>
        </div>
        <p className="spec-text" style={{ fontFamily: f.text.family, fontWeight: f.text.weight }}>
          Hosted by {HOST}, {conference.city}. {COUNT} committees, including the {UNSC.name}.
        </p>
        <p className="spec-mono" style={{ fontFamily: f.mono.family }}>{committees.slice(0, 6).map((c) => c.abbr).join('  ')}</p>
        <p className="spec-ar">
          <span lang="ar" dir="rtl" style={{ fontFamily: f.arabic.family, fontWeight: f.arabic.weight }}>دبي</span>
          <span className="spec-ar-label">Dubai, in {f.arabic.label} (use sparingly)</span>
        </p>
      </div>
      <dl className="spec-meta">
        <div><dt>Display</dt><dd>{f.display.label} <span>· {f.display.source}</span></dd></div>
        <div><dt>Text</dt><dd>{f.text.label} <span>· {f.text.source}</span></dd></div>
        <div><dt>Mono</dt><dd>{f.mono.label}</dd></div>
        <div><dt>Arabic</dt><dd>{f.arabic.label}</dd></div>
        <div><dt>Licence</dt><dd>{f.licence}</dd></div>
        <div><dt>npm</dt><dd><code>{f.packages.join(', ')}</code></dd></div>
      </dl>
    </article>
  );
}

function Picker<T extends { id: string; name: string }>({ legend, items, value, onChange }: { legend: string; items: T[]; value: number; onChange: (i: number) => void }) {
  return (
    <fieldset className="pick">
      <legend>{legend}</legend>
      <div className="pick-row">
        {items.map((it, i) => (
          <label key={it.id} className={i === value ? 'on' : ''}>
            <input type="radio" name={legend} checked={i === value} onChange={() => onChange(i)} />
            <span className="pick-n">{i + 1}</span>
            <span>{it.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Board() {
  const [pi, setPi] = useState(0);
  const [fi, setFi] = useState(0);
  const p = palettes[pi];
  const f = pairings[fi];
  return (
    <>
      <header className="top">
        <div className="wrap top-in">
          <p className="top-title">DXB MUN 2027 · Colour and type board</p>
          <nav className="top-nav" aria-label="Board sections">
            <a href="#mix">Mix</a>
            <a href="#colours">Colours</a>
            <a href="#fonts">Fonts</a>
          </nav>
        </div>
      </header>
      <main className="wrap">
        <section id="mix" className="sec">
          <h2 className="sec-h">Mix</h2>
          <p className="sec-sub">Pick one palette and one pairing to see them together.</p>
          <div className="mix-controls">
            <Picker legend="Palette" items={palettes} value={pi} onChange={setPi} />
            <Picker legend="Fonts" items={pairings} value={fi} onChange={setFi} />
          </div>
          <Preview p={p} f={f} big />
          <p className="mix-cap">
            Palette {pi + 1}, {p.name} · Fonts {fi + 1}, {f.name} ({f.display.label} with {f.text.label}) · body Lc {Math.abs(apca(p.t.ink, p.t.ground)).toFixed(1)}, button Lc {Math.abs(apca(p.t.actionInk, p.t.action)).toFixed(1)}
          </p>
        </section>

        <section id="colours" className="sec">
          <h2 className="sec-h">Colours</h2>
          <p className="sec-sub">Six palettes from real places and print. OKLCH, opaque, APCA-checked. Previews use the Official Record pairing.</p>
          <div className="grid">
            {palettes.map((pp, i) => <PaletteCard key={pp.id} p={pp} n={i + 1} f={pairings[0]} />)}
          </div>
        </section>

        <section id="fonts" className="sec">
          <h2 className="sec-h">Fonts</h2>
          <p className="sec-sub">Six pairings, all free for commercial web use and installed from npm.</p>
          <div className="grid">
            {pairings.map((ff, i) => <Specimen key={ff.id} f={ff} n={i + 1} />)}
          </div>
        </section>
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Board />);
