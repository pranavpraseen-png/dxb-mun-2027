// NAME: Roll call
// IDEA: A terminal for diplomats: one big command line above all 19 abbreviations set in large type; typing filters them live with the matched letters lit, arrow keys walk the floor, Enter calls the committee and prints its full name.
// WHY: Recall beats browsing for people who already know their committee (most delegates do), and live, letter-level feedback gives a sense of control; everyone else still sees all 19 at once with no scrolling.
// MORPH: Calling a committee (tap, or Enter) also grows its abbreviation into a detail panel (container transform,
// see morph.tsx); ← / → step through the committees inside the panel and closing shrinks it back into the current one.
// WILD: Voice roll call: say "present" and the committee you named answers back on screen, with its abbreviation struck through the way a chair marks attendance.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { committees, tba } from '@/data/conference';
import { register } from '../links';
import { MorphSheet } from './morph';
import './committees-c.css';

const pad2 = (n: number) => String(n).padStart(2, '0');
const N = committees.length;
// Lower-case only (and one apostrophe form), so indexes still line up with the original text for highlighting.
const norm = (s: string) => s.toLowerCase().replace(/’/g, "'");

/** Index of `q` in `name`, only where it starts a word; -1 if none. */
const wordAt = (name: string, q: string) => {
  const n = norm(name);
  let i = n.indexOf(q);
  while (i > 0 && /[a-z0-9]/.test(n[i - 1])) i = n.indexOf(q, i + 1);
  return i;
};

type Hit = { i: number; abbrAt: number; nameAt: number };

/** Light up the matched run of letters. */
function mark(text: string, at: number, len: number): ReactNode {
  if (at < 0 || !len) return text;
  return <>{text.slice(0, at)}<mark>{text.slice(at, at + len)}</mark>{text.slice(at + len)}</>;
}

export function CommitteesC({ id }: { id?: string }) {
  const sid = id ?? 'committees';
  const [q, setQ] = useState('');
  const [cur, setCur] = useState(0); // committee index under the cursor
  const [log, setLog] = useState<number[]>([]); // committees called, newest first
  const input = useRef<HTMLInputElement>(null);
  const wrap = useRef<HTMLUListElement>(null);
  const [sheet, setSheet] = useState<number | null>(null); // committee open in the morph panel
  const [shown, setShown] = useState(0); // what the panel shows (kept while it shrinks away)
  const itemEl = (i: number) => wrap.current?.querySelector<HTMLElement>(`[data-i="${i}"]`) ?? null;

  const query = norm(q.trim());
  const hits = useMemo<Hit[]>(() => committees.map((c, i) => ({
    i,
    abbrAt: query ? norm(c.abbr).indexOf(query) : -1,
    // Names match only at the start of a word, and only from 3 letters ("un" must not catch "Co-un-cil").
    nameAt: query.length >= 3 ? wordAt(c.name, query) : -1,
  })), [query]);
  const matched = hits.filter((h) => !query || h.abbrAt >= 0 || h.nameAt >= 0).map((h) => h.i);
  // Abbreviation matches first, then name matches, so "un" lands on a UN body and "health" still finds WHO.
  const order = query ? [...matched].sort((a, b) => (hits[a].abbrAt >= 0 ? 0 : 1) - (hits[b].abbrAt >= 0 ? 0 : 1) || a - b) : matched;

  // A new query puts the cursor on its best match; clearing the query leaves the cursor where it was.
  const best = order[0];
  useEffect(() => { if (query && best !== undefined) setCur(best); }, [query, best]);

  const call = (i: number) => setLog((l) => [i, ...l.filter((x) => x !== i)].slice(0, 3));
  /** Call a committee and grow it into its panel. */
  const openSheet = (i: number) => { setCur(i); call(i); setShown(i); setSheet(i); };

  // Inside the panel, ← / → walk the committees still answering the query (or all of them).
  const ring = matched.length ? matched : committees.map((_, i) => i);
  const step = (dir: 1 | -1) => {
    if (sheet === null) return;
    const at = Math.max(0, ring.indexOf(sheet));
    openSheet(ring[(at + dir + ring.length) % ring.length]);
  };
  useEffect(() => {
    if (sheet === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  /** Up / down: the nearest match on the row above or below, measured from the real layout. */
  const vertical = (dir: 1 | -1) => {
    const ul = wrap.current; if (!ul) return cur;
    const el = (i: number) => ul.querySelector<HTMLElement>(`[data-i="${i}"]`)!;
    const me = el(cur).getBoundingClientRect();
    const cx = me.left + me.width / 2;
    let best = cur, bd = Infinity;
    for (const i of matched) {
      const r = el(i).getBoundingClientRect();
      const dy = (r.top - me.top) * dir;
      if (dy < 8) continue;
      const d = dy * 4 + Math.abs(r.left + r.width / 2 - cx);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!matched.length) return;
    const at = matched.indexOf(cur);
    const atEnd = (e.currentTarget.selectionStart ?? 0) === q.length;
    if (e.key === 'ArrowRight' && (atEnd || !q)) { e.preventDefault(); setCur(matched[(at + 1) % matched.length]); }
    else if (e.key === 'ArrowLeft' && (atEnd || !q)) { e.preventDefault(); setCur(matched[(at - 1 + matched.length) % matched.length]); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setCur(vertical(1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCur(vertical(-1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (matched.includes(cur)) openSheet(cur); }
    else if (e.key === 'Escape') { setQ(''); }
  };

  const c = committees[cur];
  const h = hits[cur];
  const [latest, ...older] = log;
  const ringAt = Math.max(0, ring.indexOf(shown));
  const prevA = committees[ring[(ringAt - 1 + ring.length) % ring.length]].abbr;
  const nextA = committees[ring[(ringAt + 1) % ring.length]].abbr;
  return (
    <section id={sid} className="committeesc" aria-labelledby={sid + '-h'}>
      <div className="committeesc-wrap">
        <p className="committeesc-label"><span>02</span>Committees</p>
        <div className="committeesc-head">
          <h2 className="committeesc-h" id={sid + '-h'}>Roll call.</h2>
          <p className="committeesc-sub">Type a committee, or tap one. Arrow keys move, Enter opens it.</p>
        </div>

        <div className="committeesc-term" onClick={(e) => { if (e.target === e.currentTarget) input.current?.focus(); }}>
          <div className="committeesc-bar" aria-hidden="true">
            <span>Roll call<span className="committeesc-bar-x"> · {N} on the floor</span></span>
            <span><b>{pad2(matched.length)}</b> / {N} answering</span>
          </div>

          <label className="committeesc-line">
            <span className="committeesc-prompt" aria-hidden="true">&gt;</span>
            <span className="committeesc-sr">Find a committee</span>
            <input ref={input} className="committeesc-input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
              placeholder="type a committee" spellCheck={false} autoComplete="off" autoCapitalize="off" enterKeyHint="go"
              role="combobox" aria-expanded="true" aria-controls={sid + '-roll'} aria-activedescendant={matched.includes(cur) ? `${sid}-c-${cur}` : undefined}
              aria-autocomplete="list" />
          </label>
          <p className="committeesc-hint" aria-hidden="true">
            {matched.length ? (
              <><span className="committeesc-hint-k">{pad2(cur + 1)} · {c.abbr}</span><span>{mark(c.name, h.nameAt, query.length)}</span></>
            ) : (
              <>No committee answers to “{q.trim()}”. <kbd>Esc</kbd> clears.</>
            )}
          </p>

          <ul ref={wrap} id={sid + '-roll'} className="committeesc-roll" role="listbox" aria-label="The 19 committees">
            {committees.map((cm, i) => {
              const ok = matched.includes(i);
              return (
                <li key={cm.abbr} id={`${sid}-c-${i}`} data-i={i} role="option" aria-selected={i === cur} aria-disabled={!ok}
                  aria-label={`${cm.abbr}, ${cm.name}`}
                  className={'committeesc-item' + (ok ? '' : ' is-out') + (i === cur && ok ? ' is-cur' : '') + (log[0] === i ? ' is-called' : '')}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { if (!ok) return; openSheet(i); }}>
                  {mark(cm.abbr, hits[i].abbrAt, query.length)}
                </li>
              );
            })}
          </ul>

          <div className="committeesc-out" aria-live="polite">
            {older.slice().reverse().map((i) => (
              <p key={'o' + i} className="committeesc-old"><span>&gt; call {committees[i].abbr.toLowerCase()}</span> {committees[i].name}</p>
            ))}
            {latest === undefined ? (
              <p className="committeesc-old committeesc-idle"><span>&gt;</span> Nothing called yet. Pick one above.</p>
            ) : (
              <div className="committeesc-res" key={'r' + latest}>
                <p className="committeesc-cmd"><span>&gt; call {committees[latest].abbr.toLowerCase()}</span><span>{pad2(latest + 1)} / {N}</span></p>
                <h3 className="committeesc-name">{committees[latest].name}</h3>
                <dl className="committeesc-dl">
                  <div><dt>Abbreviation</dt><dd>{committees[latest].abbr}</dd></div>
                  <div><dt>Agenda</dt><dd>{tba(null)}</dd></div>
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>

      <MorphSheet open={sheet !== null} onClose={() => setSheet(null)} from={itemEl(sheet ?? shown)} returnFocus={input.current}
        labelledBy={sid + '-sheet-h'} size="narrow" className="committeesc-sheet"
        kicker={<><b>Roll call</b> · {pad2(shown + 1)} / {N}</>}
        footer={<>
          <div className="committeesc-step">
            <button type="button" onClick={() => step(-1)} aria-label={`Previous committee, ${prevA}`}>
              <span aria-hidden="true">←</span> {prevA}
            </button>
            <button type="button" onClick={() => step(1)} aria-label={`Next committee, ${nextA}`}>
              {nextA} <span aria-hidden="true">→</span>
            </button>
          </div>
          <a className="mph-act" href={register}>Register <span aria-hidden="true">→</span></a>
        </>}>
        <div className="committeesc-sheet-c" key={shown}>
          <p className="committeesc-sheet-a" aria-hidden="true">{committees[shown].abbr}</p>
          <h3 className="committeesc-sheet-h" id={sid + '-sheet-h'}>{committees[shown].name}</h3>
          <dl className="committeesc-sheet-dl">
            <div><dt>Abbreviation</dt><dd>{committees[shown].abbr}</dd></div>
            <div><dt>Agenda</dt><dd>{tba(null)}</dd></div>
            <div><dt>Roll call</dt><dd>{pad2(shown + 1)} of {N}</dd></div>
          </dl>
        </div>
      </MorphSheet>
    </section>
  );
}
