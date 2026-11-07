// Alt 4 · pick each part. Every part of Alt 4 in versions A, B and C, live, with the lead's pick (★), the reason
// each one works, and wild ideas. Tick one per part; "Open my combination" opens Alt 4 built from your ticks.
import { createRoot } from 'react-dom/client';
import { useEffect, useMemo, useState } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/jetbrains-mono';
import '../alt-4/floor.css';
import '../alt-4/sections.css';
import './board.css';
import { PARTS, PICK, comboQuery, type Letter, type Part, type PartId } from '../alt-4/parts/registry';

const KEY = 'alt4.board.likes';
const ALT4 = '../alt-4/';
type Likes = Partial<Record<PartId, Letter>>;

const load = (): Likes => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };

/** The URL that shows one option of the opening or hero on its own, full page. */
const frameUrl = (part: PartId, l: Letter) =>
  part === 'opening' ? `${ALT4}?opening=${l}&hero=a` : `${ALT4}?opening=none&hero=${l}`;

function Preview({ part, letter }: { part: Part; letter: Letter }) {
  const [n, setN] = useState(0);
  const opt = part.options.find((o) => o.letter === letter)!;
  if (part.id === 'opening' || part.id === 'hero') {
    const url = frameUrl(part.id, letter);
    return (
      <div className="b-frame">
        <div className="b-frame-bar mono">
          <span>{part.id === 'opening' ? 'Runs full page, with sound after you tap' : 'Full page hero'}</span>
          <span className="b-frame-act">
            <button type="button" onClick={() => setN((x) => x + 1)}>Replay</button>
            <a href={url} target="_blank" rel="noopener">Open full screen ↗</a>
          </span>
        </div>
        <iframe key={url + n} src={url} title={`${part.label} ${letter.toUpperCase()}`} loading="lazy" allow="autoplay" />
      </div>
    );
  }
  const C = opt.Component;
  if (!C) return <p className="b-missing mono">Still being built</p>;
  if (part.id === 'nav') return <div className="b-navbox"><C visible demo /></div>;
  return <div className="b-sec"><C id={`${part.id}-${letter}-demo`} /></div>;
}

function PartBlock({ part, liked, onLike }: { part: Part; liked?: Letter; onLike: (l: Letter) => void }) {
  const [tab, setTab] = useState<Letter>(liked ?? PICK[part.id]);
  const opt = part.options.find((o) => o.letter === tab) ?? part.options[0];
  return (
    <section className="b-part" id={`part-${part.id}`} aria-labelledby={`h-${part.id}`}>
      <header className="b-part-head">
        <p className="mono b-num"><span>{part.number}</span> / {String(PARTS.length).padStart(2, '0')}</p>
        <h2 id={`h-${part.id}`}>{part.label}</h2>
        <div className="b-tabs" role="tablist" aria-label={`${part.label} versions`}>
          {(['a', 'b', 'c'] as const).map((l) => {
            const o = part.options.find((x) => x.letter === l);
            return (
              <button key={l} type="button" role="tab" aria-selected={tab === l} disabled={!o} onClick={() => setTab(l)} className="b-tab">
                <b>{l.toUpperCase()}</b>
                <span>{o ? o.name : 'building…'}</span>
                {PICK[part.id] === l && <i className="b-star mono" title="Claude's pick">★ pick</i>}
                {liked === l && <i className="b-liked mono">your pick</i>}
              </button>
            );
          })}
        </div>
      </header>
      <div className="b-info">
        <dl>
          <div><dt className="mono">Idea</dt><dd>{opt.idea}</dd></div>
          <div><dt className="mono">Why it works</dt><dd>{opt.why}</dd></div>
          {opt.wild && <div><dt className="mono">Even wilder</dt><dd>{opt.wild}</dd></div>}
        </dl>
        <button type="button" className={'b-like' + (liked === tab ? ' is-on' : '')} onClick={() => onLike(tab)} aria-pressed={liked === tab}>
          {liked === tab ? `✓ ${tab.toUpperCase()} is your pick` : `I like ${tab.toUpperCase()} best`}
        </button>
      </div>
      <Preview part={part} letter={opt.letter} />
      <details className="b-wild">
        <summary className="mono">More wild ideas for {part.label.toLowerCase()} ({part.wild.length})</summary>
        <ul>{part.wild.map((w) => <li key={w}>{w}</li>)}</ul>
      </details>
    </section>
  );
}

function Board() {
  const [likes, setLikes] = useState<Likes>(load);
  const [copied, setCopied] = useState(false);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(likes)); } catch { /* storage blocked */ } }, [likes]);
  const mine = useMemo(() => Object.fromEntries(PARTS.map((p) => [p.id, likes[p.id] ?? PICK[p.id]])) as Record<PartId, Letter>, [likes]);
  const text = 'Alt 4 picks: ' + PARTS.map((p) => `${p.label} ${(likes[p.id] ?? '-').toUpperCase()}`).join(', ');
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
  };
  const count = Object.keys(likes).length;
  return (
    <>
      <header className="b-top">
        <p className="mono">DXB MUN 2027 <span>/</span> Alt 4 · The Floor</p>
        <h1>Pick each part.</h1>
        <p className="b-lede">Every part of the page in three versions. ★ marks my pick. Tick the one you like best in each part, then open your combination.</p>
        <nav className="b-index mono" aria-label="Parts">
          {PARTS.map((p) => (
            <a key={p.id} href={`#part-${p.id}`}>{p.number} {p.label} <b>{(likes[p.id] ?? '·').toUpperCase()}</b></a>
          ))}
        </nav>
      </header>
      <main>
        {PARTS.map((p) => (
          <PartBlock key={p.id} part={p} liked={likes[p.id]} onLike={(l) => setLikes((x) => ({ ...x, [p.id]: l }))} />
        ))}
      </main>
      <footer className="b-bar">
        <p className="mono b-bar-picks">
          {PARTS.map((p) => <span key={p.id}>{p.label} <b className={likes[p.id] ? 'is-mine' : ''}>{mine[p.id].toUpperCase()}</b></span>)}
        </p>
        <div className="b-bar-act">
          <span className="mono b-count">{count} / {PARTS.length} picked</span>
          <button type="button" className="b-btn-ghost" onClick={copy}>{copied ? 'Copied' : 'Copy my picks'}</button>
          <a className="b-btn-ghost" href={`${ALT4}?${comboQuery(PICK)}`} target="_blank" rel="noopener">Open Claude’s pick</a>
          <a className="b-btn" href={`${ALT4}?${comboQuery(mine)}`} target="_blank" rel="noopener">Open my combination ↗</a>
        </div>
      </footer>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Board />);
