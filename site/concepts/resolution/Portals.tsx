import { useState } from 'react';
import NumberFlow from '@number-flow/react';
import { conference } from '@/data/conference';
import { usePortal, useStill } from '@/shared/hooks';
import type { Chit, ChitStatus } from '@/data/portal-mock';

type P = ReturnType<typeof usePortal>;

function Pill({ status, label }: { status: ChitStatus; label: string }) {
  return <span className={`pill pill-${status}`}>{label}</span>;
}

function ToolHead({ id, title, meta }: { id: string; title: string; meta: { k: string; v: string }[] }) {
  return (
    <>
      <div className="tool-head">
        <div>
          <p className="tool-kicker mono">
            <span>{conference.edition}</span>
            <span className="preview-tag">Preview · sample data</span>
          </p>
          <h1 className="tool-h1" id={id}>{title}</h1>
        </div>
        <dl className="tool-meta">
          {meta.map((m) => (
            <div key={m.k}><dt className="mono">{m.k}</dt><dd>{m.v}</dd></div>
          ))}
        </dl>
      </div>
      <div className="rule-double" aria-hidden="true" />
    </>
  );
}

function MemoHead({ c, ago }: { c: Chit; ago: string }) {
  return (
    <dl className="memo-head">
      <dt>From</dt><dd>{c.from}</dd>
      <dt>To</dt><dd>{c.to}</dd>
      <span className="when">{ago}</span>
    </dl>
  );
}

/* ------------------------------------------------------------------ delegate */
export function DelegatePortal({ p }: { p: P }) {
  const left = p.maxLength - p.text.length;
  return (
    <section className="tool" aria-labelledby="pt-h">
      <div className="wrap">
        <ToolHead
          id="pt-h"
          title="Delegate portal"
          meta={[
            { k: 'Delegation', v: p.me.delegation },
            { k: 'Committee', v: p.committee.id },
            { k: 'Signed in as', v: p.me.name },
          ]}
        />

        <div className="grid12 pt-grid">
          <div className="pt-main">
            <div className="pt-h2">
              <h2>Write a chit</h2>
              <p>Chits go to your chair first. Once the chair approves, the other delegation receives it.</p>
            </div>

            <div className="step">
              <span className="step-no">1.</span>
              <div>
                <label className="step-label" htmlFor="dl-search">Choose a delegation</label>
                <input
                  id="dl-search"
                  className="search"
                  type="search"
                  placeholder="Search delegations"
                  value={p.filter}
                  onChange={(e) => p.setFilter(e.target.value)}
                  autoComplete="off"
                />
                <div className="chips" role="group" aria-label="Delegations">
                  {p.choices.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={'chip' + (c.chair ? ' is-chair' : '')}
                      aria-pressed={p.picked?.id === c.id}
                      onClick={() => p.setPicked(p.picked?.id === c.id ? null : c)}
                    >
                      {c.label}
                    </button>
                  ))}
                  {p.choices.length === 0 && <p className="chips-empty">No delegation matches “{p.filter}”. Clear the search to see all.</p>}
                </div>
              </div>
            </div>

            <div className="step">
              <span className="step-no">2.</span>
              <div>
                <label className="step-label" htmlFor="memo">Write your message</label>
                <div className="memo">
                  <p className={'to-line' + (p.picked ? '' : ' is-empty')} aria-live="polite">{p.toLine}</p>
                  {p.replyTo && (
                    <div className="reply-bar">
                      <span>Replying to {p.replyTo.from}</span>
                      <button type="button" className="linkbtn" onClick={p.cancelReply}>Cancel reply</button>
                    </div>
                  )}
                  <textarea
                    id="memo"
                    className="memo-input"
                    maxLength={p.maxLength}
                    value={p.text}
                    placeholder="Type your chit here."
                    onChange={(e) => p.setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); p.send(); }
                    }}
                    aria-describedby="memo-count"
                  />
                  <div className="memo-foot">
                    <span className="mono" style={{ color: 'var(--ink-3)' }}>{p.picked && !p.picked.chair ? 'Approved by the chair before delivery.' : 'Plain text only.'}</span>
                    <span id="memo-count" className={'count' + (left < 50 ? ' is-near' : '')}>{p.text.length} / {p.maxLength}</span>
                  </div>
                </div>
                <div className="send-row">
                  <button type="button" className="btn btn-ink" disabled={!p.canSend} onClick={p.send}>Send chit</button>
                  <span className="hint mono"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> sends</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-side">
            <div className="pt-h2">
              <h2>Inbox <span className="count">{p.unread} unread</span></h2>
              <button type="button" className="linkbtn" onClick={p.markAllRead} disabled={p.unread === 0}>Mark all read</button>
            </div>
            <ul className="memos">
              {p.inbox.map((c) => {
                const isNew = p.isNew(c);
                return (
                  <li key={c.id} className={'memo' + (isNew ? ' is-new' : '')}>
                    <MemoHead c={c} ago={p.ago(c.createdAt)} />
                    <p className="memo-text">{c.text}</p>
                    <div className="memo-actions">
                      {isNew && <button type="button" className="linkbtn" onClick={() => p.markRead(c)}>Mark read</button>}
                      <button
                        type="button"
                        className="linkbtn"
                        onClick={() => { p.reply(c); document.getElementById('memo')?.focus(); }}
                      >
                        Reply
                      </button>
                      {isNew && <span className="newtag" style={{ marginLeft: 'auto', alignSelf: 'center', paddingRight: 10 }}>New</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="pt-full">
            <div className="pt-h2">
              <h2>Sent chits <span className="count">{p.sent.length}</span></h2>
            </div>
            <table className="sent-table">
              <thead>
                <tr><th scope="col">To</th><th scope="col">Message</th><th scope="col">Status</th><th scope="col">Sent</th></tr>
              </thead>
              <tbody>
                {p.sent.map((c) => (
                  <tr key={c.id}>
                    <td className="to">{c.to}</td>
                    <td className="msg">
                      {c.text}
                      {c.note && <span className="chair-note">Chair’s note: {c.note}</span>}
                    </td>
                    <td><Pill status={c.status} label={p.STATUS_LABEL[c.status]} /></td>
                    <td className="when">{p.ago(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ chair */
function QueueItem({ c, p }: { c: Chit; p: P }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  return (
    <li className="memo">
      <MemoHead c={c} ago={p.ago(c.createdAt)} />
      <p className="memo-text">{c.text}</p>
      {!rejecting ? (
        <div className="decide">
          <button type="button" className="btn btn-ink btn-sm" onClick={() => p.decide(c, 'approve')}>Approve &amp; deliver</button>
          <button type="button" className="btn btn-line btn-sm" onClick={() => setRejecting(true)}>Reject</button>
        </div>
      ) : (
        <div className="note-row">
          <label className="sr-only" htmlFor={'note-' + c.id}>Note for {c.from} (optional)</label>
          <input
            id={'note-' + c.id}
            className="note-input"
            placeholder="Optional note for the sender"
            value={note}
            autoFocus
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') p.decide(c, 'reject', note.trim()); if (e.key === 'Escape') setRejecting(false); }}
          />
          <button type="button" className="btn btn-ink btn-sm" onClick={() => p.decide(c, 'reject', note.trim())}>Reject chit</button>
          <button type="button" className="linkbtn" onClick={() => setRejecting(false)}>Cancel</button>
        </div>
      )}
    </li>
  );
}

export function ChairPortal({ p }: { p: P }) {
  const still = useStill();
  const stats = [
    { k: 'Delegations', v: p.stats.delegations },
    { k: 'Waiting', v: p.stats.waiting, signal: p.stats.waiting > 0 },
    { k: 'Approved', v: p.stats.approved },
    { k: 'Not approved', v: p.stats.rejected },
  ];
  return (
    <section className="tool" aria-labelledby="ch-h">
      <div className="wrap">
        <ToolHead id="ch-h" title="Chair portal" meta={[{ k: 'Committee', v: p.committee.id }, { k: 'Chair', v: p.roster.chair.name }]} />

        <dl className="stats">
          {stats.map((s) => (
            <div key={s.k} className={'stat' + (s.signal ? ' is-signal' : '')}>
              <dt className="mono">{s.k}</dt>
              <dd><NumberFlow value={s.v} animated={!still} /></dd>
            </div>
          ))}
        </dl>

        <div className="grid12 pt-grid">
          <div className="pt-main">
            <div className="pt-h2">
              <h2>Approval queue <span className="count">{p.queue.length} waiting</span></h2>
              <p>Approve to deliver the chit to its recipient, or reject it with an optional note for the sender.</p>
            </div>
            {p.queue.length ? (
              <ul className="memos">{p.queue.map((c) => <QueueItem key={c.id} c={c} p={p} />)}</ul>
            ) : (
              <p className="empty">The queue is clear. New chits will appear here.</p>
            )}
          </div>

          <div className="pt-side">
            <div className="pt-h2"><h2>To the Chair <span className="count">{p.chairInbox.length}</span></h2></div>
            <ul className="memos">
              {p.chairInbox.map((c) => (
                <li key={c.id} className="memo">
                  <MemoHead c={c} ago={p.ago(c.createdAt)} />
                  <p className="memo-text">{c.text}</p>
                </li>
              ))}
            </ul>

            <div className="pt-h2" style={{ marginTop: 40 }}><h2>Decision log <span className="count">{p.log.length}</span></h2></div>
            <ol className="log-list">
              {p.log.map((c) => (
                <li key={c.id + c.status}>
                  <span className="log-route">{c.from} to {c.to}</span>
                  <Pill status={c.status} label={p.STATUS_LABEL[c.status]} />
                  <p className="log-text">
                    {c.text}
                    {c.note && <span className="chair-note">Note: {c.note}</span>}
                  </p>
                  <span className="log-when">{p.ago(c.createdAt)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
