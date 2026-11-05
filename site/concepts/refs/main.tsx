import { createRoot } from 'react-dom/client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import '@fontsource-variable/source-serif-4/opsz.css';
import '@fontsource-variable/source-serif-4/opsz-italic.css';
import '@fontsource-variable/public-sans';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './refs.css';
import { REFS, SECTORS, type Ref, type SectorId } from './refs';

// Captures saved by capture.mjs. Globbed so Vite serves (and would bundle) them.
const SHOTS = import.meta.glob('./shots/*.jpg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const shotsFor = (id: string) => [0, 1, 2].map((n) => SHOTS[`./shots/${id}-${n}.jpg`]).filter(Boolean);
const STATE = ['First screen', '~40% down', '~75% down'];

const KEY = 'refs.likes';
function loadLikes(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && REFS.some((r) => r.id === x)) : [];
  } catch {
    return [];
  }
}

type Box = { ref: Ref; n: number } | null;

function Heart({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}

function Card({ r, i, liked, pickNo, onLike, onOpen }: { r: Ref; i: number; liked: boolean; pickNo: number; onLike: () => void; onOpen: (n: number) => void }) {
  const shots = shotsFor(r.id);
  const sector = SECTORS.find((s) => s.id === r.sector)!;
  return (
    <article className={`card ${liked ? 'liked' : ''}`} style={{ '--i': i } as CSSProperties} id={`ref-${r.id}`}>
      <div className="strip">
        {shots.length ? (
          shots.map((src, n) => (
            <button key={src} type="button" onClick={() => onOpen(n)} aria-label={`Enlarge ${r.name}, ${STATE[n]}`}>
              <img src={src} alt={`${r.name}: ${STATE[n]} at 1440 px`} width={1440} height={900} loading={i < 6 ? 'eager' : 'lazy'} decoding="async" />
              <i>{n === 0 ? '1st screen' : n === 1 ? '40%' : '75%'}</i>
            </button>
          ))
        ) : (
          <div className="noshot">No capture: open the site</div>
        )}
      </div>
      <div className="body">
        <div className="meta">
          <span>{sector.label}</span>
          {r.top ? <span className="top5">Top 5 · #{r.top}</span> : null}
          <a className="award" href={r.awardUrl} target="_blank" rel="noopener noreferrer">{r.award}</a>
        </div>
        <div className="title-row">
          <h2 className="name">{r.name}</h2>
          <a className="visit" href={r.url} target="_blank" rel="noopener noreferrer">
            Open site ↗<span className="sr"> (new tab)</span>
          </a>
        </div>
        <dl className="lines">
          <div>
            <dt>Layout</dt>
            <dd>{r.layout}</dd>
          </div>
          <div className="move">
            <dt>Insane</dt>
            <dd>{r.move}</dd>
          </div>
          <div>
            <dt>For MUN</dt>
            <dd>{r.mun}</dd>
          </div>
        </dl>
        <p className="tech">{r.tech}</p>
        <button type="button" className="like" aria-pressed={liked} onClick={onLike}>
          <Heart on={liked} />
          {liked ? (
            <>
              Liked <b>#{pickNo}</b>
            </>
          ) : (
            'Like'
          )}
        </button>
      </div>
    </article>
  );
}

function App() {
  const [likes, setLikes] = useState<string[]>(loadLikes);
  const [sector, setSector] = useState<SectorId | 'all' | 'top'>('all');
  const [box, setBox] = useState<Box>(null);
  const [copied, setCopied] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(likes));
    } catch {
      /* private mode: likes live only in memory */
    }
  }, [likes]);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (box && !d.open) d.showModal();
    if (!box && d.open) d.close();
  }, [box]);

  const shown = useMemo(
    () => (sector === 'all' ? REFS : sector === 'top' ? REFS.filter((r) => r.top).sort((a, b) => a.top! - b.top!) : REFS.filter((r) => r.sector === sector)),
    [sector],
  );
  const toggle = (id: string) => setLikes((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const picked = likes.map((id) => REFS.find((r) => r.id === id)!).filter(Boolean);
  const summary = picked.map((r, n) => `${n + 1}. ${r.name} (${r.move})`).join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`My picks:\n${summary}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const step = (d: number) => {
    if (!box) return;
    const shots = shotsFor(box.ref.id);
    setBox({ ref: box.ref, n: (box.n + d + shots.length) % shots.length });
  };

  const boxShots = box ? shotsFor(box.ref.id) : [];

  return (
    <>
      <div className="host">
        <div className="wrap">
          <span className="host-rule" aria-hidden />
          DXB MUN 2027 · hosted by Indian High School
        </div>
      </div>
      <header className="top">
        <div className="wrap top-in">
          <span className="mark">
            Reference <em>board</em>
          </span>
          <span className="top-count">{REFS.length} sites · 9 sectors</span>
        </div>
      </header>

      <section className="hero wrap" aria-labelledby="h1">
        <p className="eyebrow">Award sites, every sector</p>
        <h1 className="h1" id="h1">
          Clean first. <em>One</em> insane move.
        </h1>
        <p className="lede">Look at the pictures. Tap Like on the ones you want. Read your picks back to us.</p>
      </section>

      <div className="picks" role="region" aria-label="Your picks">
        <div className="wrap picks-in">
          <span className="picks-label">
            Your picks <b>{picked.length}</b>
          </span>
          <ol className="picks-list" aria-live="polite">
            {picked.length ? (
              picked.map((r, n) => (
                <li key={r.id}>
                  <button type="button" className="pick-chip" onClick={() => document.getElementById(`ref-${r.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                    <i>{n + 1}</i>
                    {r.name}
                  </button>
                </li>
              ))
            ) : (
              <li className="picks-empty">None yet. Tap Like on a card.</li>
            )}
          </ol>
          <div className="picks-actions">
            <button type="button" className="btn btn-action" onClick={copy} disabled={!picked.length}>
              {copied ? 'Copied' : 'Copy list'}
            </button>
            <button type="button" className="btn" onClick={() => setLikes([])} disabled={!picked.length}>
              Clear
            </button>
          </div>
        </div>
      </div>

      <nav className="filters wrap" aria-label="Filter by sector">
        <div className="chips">
          <button type="button" className="chip" aria-pressed={sector === 'all'} onClick={() => setSector('all')}>
            All <span>{REFS.length}</span>
          </button>
          <button type="button" className="chip" aria-pressed={sector === 'top'} onClick={() => setSector('top')}>
            Top 5 for MUN <span>5</span>
          </button>
          {SECTORS.map((s) => {
            const c = REFS.filter((r) => r.sector === s.id).length;
            return c ? (
              <button key={s.id} type="button" className="chip" aria-pressed={sector === s.id} onClick={() => setSector(s.id)}>
                {s.label} <span>{c}</span>
              </button>
            ) : null;
          })}
        </div>
      </nav>

      <main className="wrap grid" key={sector}>
        {shown.map((r, i) => (
          <Card
            key={r.id}
            r={r}
            i={i}
            liked={likes.includes(r.id)}
            pickNo={likes.indexOf(r.id) + 1}
            onLike={() => toggle(r.id)}
            onOpen={(n) => setBox({ ref: r, n })}
          />
        ))}
      </main>

      <footer className="foot wrap">
        Captures: 1440 × 900, taken {`2026-11-05`}. Sites change; open the live link for the real motion. Techniques only, never their assets.
      </footer>

      <dialog
        ref={dlg}
        className="lb"
        aria-label={box ? `${box.ref.name}, ${STATE[box.n]}` : 'Capture'}
        onClose={() => setBox(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1);
          if (e.key === 'ArrowLeft') step(-1);
        }}
      >
        {box ? (
          <div className="lb-in">
            <div className="lb-head">
              <p className="lb-title">
                {box.ref.name}
                <span>
                  {box.n + 1}/{boxShots.length} · {STATE[box.n]}
                </span>
              </p>
              <button type="button" className="btn" onClick={() => setBox(null)} autoFocus>
                Close
              </button>
            </div>
            <div className="lb-img" onClick={() => setBox(null)}>
              <img src={boxShots[box.n]} alt={`${box.ref.name}: ${STATE[box.n]} at 1440 px`} width={1440} height={900} onClick={(e) => e.stopPropagation()} />
            </div>
            <div className="lb-foot">
              <p className="lb-cap">
                <b>Clean because</b> {box.ref.why}
              </p>
              <div className="lb-nav">
                <button type="button" className="btn" onClick={() => step(-1)} aria-label="Previous capture">
                  ←
                </button>
                <button type="button" className="btn" onClick={() => step(1)} aria-label="Next capture">
                  →
                </button>
                <button type="button" className={`btn ${likes.includes(box.ref.id) ? 'btn-action' : ''}`} aria-pressed={likes.includes(box.ref.id)} onClick={() => toggle(box.ref.id)}>
                  {likes.includes(box.ref.id) ? 'Liked' : 'Like'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
