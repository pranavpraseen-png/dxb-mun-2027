import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import NumberFlow from '@number-flow/react';
import { Check, CornerUpLeft, Search, Send, X } from 'lucide-react';
import clsx from 'clsx';
import type { Chit, ChitStatus } from '@/data/portal-mock';
import { usePortal, useStill } from '@/shared/hooks';

type P = ReturnType<typeof usePortal>;

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

function PreviewTag() {
  return <p className="preview-tag"><span aria-hidden="true" className="preview-dot" />Preview with sample data</p>;
}

function Status({ s, label }: { s: ChitStatus; label: string }) {
  return <span className={clsx('pill', `pill--${s}`)}><span className="pill-led" aria-hidden="true" />{label}</span>;
}

function Panel({ id, title, count, tone, actions, children, className }: {
  id: string; title: string; count?: number; tone?: 'un' | 'amber' | 'red'; actions?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  const still = useStill();
  return (
    <section className={clsx('mon', className)} aria-labelledby={id}>
      <header className="mon-head">
        <h2 id={id}>{title}</h2>
        {count !== undefined && (
          <span className={clsx('tally', tone && `tally--${tone}`, count === 0 && 'is-zero')}>
            <NumberFlow value={count} animated={!still} />
          </span>
        )}
        {actions && <div className="mon-actions">{actions}</div>}
      </header>
      <div className="mon-body">{children}</div>
    </section>
  );
}

/* ================================================================ delegate */
export function DelegateView({ p }: { p: P }) {
  const left = p.maxLength - p.text.length;
  return (
    <main id="main" tabIndex={-1} className="desk">
      <div className="desk-head">
        <div>
          <PreviewTag />
          <h1 className="desk-title">Delegate portal</h1>
        </div>
        <dl className="desk-status">
          <div><dt>Committee</dt><dd>{p.committee.id}</dd></div>
          <div><dt>Delegation</dt><dd>{p.me.delegation}</dd></div>
          <div><dt>Unread</dt><dd className={clsx(p.unread > 0 && 'is-un')}>{p.unread}</dd></div>
        </dl>
      </div>

      <div className="desk-grid desk-grid--delegate">
        <Panel id="compose-title" title="Send a chit" className="mon--compose">
          <p className="mon-note">Chits to other delegations go to your chair first. Once the chair approves, the other delegation receives it.</p>

          <div className="step">
            <label className="step-label" htmlFor="who">Choose a delegation</label>
            <div className="search">
              <Search size={18} aria-hidden="true" />
              <input id="who" type="search" placeholder="Search delegations" value={p.filter} onChange={(e) => p.setFilter(e.target.value)} autoComplete="off" />
            </div>
            <div className="chips" role="group" aria-label="Delegations">
              {p.choices.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={clsx('chip', c.chair && 'chip--chair', p.picked?.id === c.id && 'is-on')}
                  aria-pressed={p.picked?.id === c.id}
                  onClick={() => p.setPicked(c)}
                >
                  {c.label}
                </button>
              ))}
              {p.choices.length === 0 && <p className="empty">No delegation matches “{p.filter}”. Clear the search to see all.</p>}
            </div>
          </div>

          <p className={clsx('to-line', p.picked && 'is-set')} aria-live="polite">
            <span className="to-k" aria-hidden="true">To</span>
            <span>{p.toLine}</span>
          </p>

          {p.replyTo && (
            <p className="reply-bar">
              <CornerUpLeft size={18} aria-hidden="true" />
              <span>Replying to {p.replyTo.from}: “{p.replyTo.text.slice(0, 60)}{p.replyTo.text.length > 60 ? '…' : ''}”</span>
              <button type="button" className="btn btn--sm btn--ghost" onClick={p.cancelReply}>Cancel reply</button>
            </p>
          )}

          <div className="step">
            <label className="step-label" htmlFor="msg">Write your message</label>
            <textarea
              id="msg"
              rows={5}
              maxLength={p.maxLength}
              value={p.text}
              onChange={(e) => p.setText(e.target.value)}
              onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); p.send(); } }}
              placeholder="Keep it to committee business."
              aria-describedby="msg-count msg-hint"
            />
            <div className="msg-meta">
              <span id="msg-hint">{isMac ? '⌘' : 'Ctrl'} + Enter sends</span>
              <span id="msg-count" className={clsx('count', left < 50 && 'is-low')}>{p.text.length} / {p.maxLength}</span>
            </div>
          </div>
          <button type="button" className="btn btn--un btn--block" disabled={!p.canSend} onClick={p.send}>
            <Send size={20} aria-hidden="true" /> Send chit
          </button>
        </Panel>

        <Panel
          id="inbox-title"
          title="Inbox"
          count={p.unread}
          tone="un"
          actions={<button type="button" className="btn btn--sm btn--ghost" onClick={p.markAllRead} disabled={p.unread === 0}>Mark all read</button>}
        >
          <ul className="feed">
            {p.inbox.map((c) => (
              <li key={c.id} className={clsx('chit', p.isNew(c) && 'is-new')}>
                <div className="chit-top">
                  {p.isNew(c) && <span className="new-led"><span className="sr-only">Unread. </span>New</span>}
                  <span className="chit-from">{c.from}</span>
                  <span className="chit-ago">{p.ago(c.createdAt)}</span>
                </div>
                <p className="chit-text">{c.text}</p>
                <div className="chit-actions">
                  <button type="button" className="btn btn--sm" onClick={() => p.reply(c)}><CornerUpLeft size={16} aria-hidden="true" />Reply</button>
                  {p.isNew(c) && <button type="button" className="btn btn--sm btn--ghost" onClick={() => p.markRead(c)}>Mark read</button>}
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel id="sent-title" title="Sent chits" count={p.sent.length}>
          <ul className="feed">
            {p.sent.map((c) => (
              <li key={c.id} className="chit">
                <div className="chit-top">
                  <span className="chit-from">To {c.to}</span>
                  <span className="chit-ago">{p.ago(c.createdAt)}</span>
                </div>
                <p className="chit-text">{c.text}</p>
                <Status s={c.status} label={p.STATUS_LABEL[c.status]} />
                {c.note && <p className="chit-note"><span>Chair’s note</span>{c.note}</p>}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </main>
  );
}

/* ================================================================ chair */
export function ChairView({ p }: { p: P }) {
  const still = useStill();
  const cells = [
    { k: 'Delegations', v: p.stats.delegations, tone: 'white' },
    { k: 'Waiting', v: p.stats.waiting, tone: 'amber' },
    { k: 'Approved', v: p.stats.approved, tone: 'green' },
    { k: 'Rejected', v: p.stats.rejected, tone: 'red' },
  ];
  return (
    <main id="main" tabIndex={-1} className="desk desk--chair">
      <div className="desk-head">
        <div>
          <PreviewTag />
          <h1 className="desk-title">Chair portal</h1>
        </div>
        <dl className="desk-status">
          <div><dt>Committee</dt><dd>{p.committee.id}</dd></div>
          <div><dt>Chair</dt><dd>{p.roster.chair.name}</dd></div>
        </dl>
      </div>

      <dl className="score">
        {cells.map((c) => (
          <div key={c.k} className={clsx('score-cell', `tone-${c.tone}`)}>
            <dt>{c.k}</dt>
            <dd><NumberFlow value={c.v} animated={!still} /></dd>
          </div>
        ))}
      </dl>

      <div className="desk-grid desk-grid--chair">
        <Panel id="queue-title" title="Approval queue" count={p.queue.length} tone="amber" className="mon--queue">
          <p className="mon-note">Oldest at the bottom. Approve to deliver the chit, or reject it with an optional note for the sender.</p>
          {p.queue.length === 0 ? (
            <p className="empty">Queue clear. New chits from delegates land here.</p>
          ) : (
            <ul className="feed">
              <AnimatePresence initial={false}>
                {p.queue.map((c) => <QueueItem key={c.id} c={c} p={p} />)}
              </AnimatePresence>
            </ul>
          )}
        </Panel>

        <div className="desk-side">
          <Panel id="tochair-title" title="To the Chair" count={p.chairInbox.length}>
            <ul className="feed">
              {p.chairInbox.map((c) => (
                <li key={c.id} className="chit">
                  <div className="chit-top">
                    <span className="chit-from">{c.from}</span>
                    <span className="chit-ago">{p.ago(c.createdAt)}</span>
                  </div>
                  <p className="chit-text">{c.text}</p>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel id="roster-title" title="Delegations" count={p.roster.delegations.length}>
            <ul className="roster">
              {p.roster.delegations.map((d) => <li key={d.id}>{d.delegation}</li>)}
            </ul>
          </Panel>
        </div>

        <Panel id="log-title" title="Decision log" count={p.log.length} className="mon--log">
          <ol className="log">
            {p.log.map((c) => (
              <li key={c.id + c.status} className="log-row">
                <Status s={c.status} label={p.STATUS_LABEL[c.status]} />
                <span className="log-route">{c.from} <span aria-hidden="true">›</span><span className="sr-only">to</span> {c.to}</span>
                <span className="log-text">{c.text}{c.note && <em> Note: {c.note}</em>}</span>
                <span className="chit-ago">{p.ago(c.createdAt)}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </main>
  );
}

function QueueItem({ c, p }: { c: Chit; p: P }) {
  const still = useStill();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  return (
    <motion.li
      className="chit chit--queue"
      layout={!still}
      exit={still ? undefined : { opacity: 0, x: 40, transition: { duration: 0.2 } }}
    >
      <div className="chit-top">
        <span className="chit-from">{c.from} <span className="route" aria-hidden="true">›</span><span className="sr-only">to</span> {c.to}</span>
        <span className="chit-ago">{p.ago(c.createdAt)}</span>
      </div>
      <p className="chit-text chit-text--lg">{c.text}</p>
      {!rejecting ? (
        <div className="chit-actions">
          <button type="button" className="btn btn--un" onClick={() => p.decide(c, 'approve')}><Check size={20} aria-hidden="true" />Approve &amp; deliver</button>
          <button type="button" className="btn btn--red" onClick={() => setRejecting(true)}><X size={20} aria-hidden="true" />Reject</button>
        </div>
      ) : (
        <div className="reject">
          <label htmlFor={'note-' + c.id}>Note for {c.from} (optional)</label>
          <input id={'note-' + c.id} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why it was not approved" autoFocus />
          <div className="chit-actions">
            <button type="button" className="btn btn--red-solid" onClick={() => p.decide(c, 'reject', note.trim())}>Reject chit</button>
            <button type="button" className="btn btn--ghost" onClick={() => { setRejecting(false); setNote(''); }}>Cancel</button>
          </div>
        </div>
      )}
    </motion.li>
  );
}

