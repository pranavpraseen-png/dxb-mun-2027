import { useMemo, useState, type ReactNode } from 'react';
import NumberFlow from '@number-flow/react';
import { Check, CornerUpLeft, Inbox, MailCheck, Search, Send, X } from 'lucide-react';
import { usePortal, viewHref } from '@/shared/hooks';
import type { Chit } from '@/data/portal-mock';
import { conference } from '@/data/conference';
import { useStillCtx } from './ui';

type P = ReturnType<typeof usePortal>;

function Shell({ title, who, children, active }: { title: string; who: ReactNode; children: ReactNode; active: 'portal' | 'chair' }) {
  return (
    <main id="main" className="portal">
      <div className="wrap">
        <div className="portal__head">
          <div>
            <p className="portal__crumb">{conference.edition}</p>
            <h1 className="portal__title">{title}</h1>
            <p className="portal__who">{who}</p>
          </div>
          <div className="portal__side">
            <span className="preview-tag">Preview · sample data</span>
            <nav className="seg" aria-label="Switch portal">
              <a href={viewHref('portal')} aria-current={active === 'portal' ? 'page' : undefined}>Delegate</a>
              <a href={viewHref('chair')} aria-current={active === 'chair' ? 'page' : undefined}>Chair</a>
            </nav>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

const Pill = ({ c, label }: { c: Chit; label: string }) => <span className={`status status--${c.status}`}>{label}</span>;

/* ------------------------------------------------------------------ delegate */
export function DelegatePortal({ p }: { p: P }) {
  const isMac = useMemo(() => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform), []);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); p.send(); }
  };
  return (
    <Shell
      active="portal"
      title="Delegate portal"
      who={<>Delegation of <strong>{p.me.delegation}</strong>, {p.committee.name} ({p.committee.id})</>}
    >
      <div className="pgrid">
        <section className="card card--compose" aria-labelledby="compose-title">
          <h2 className="card__title" id="compose-title"><Send size={22} aria-hidden="true" /> Send a chit</h2>
          <p className="card__hint">Chits go to your chair first. Once the chair approves, the other delegation receives it.</p>

          <h3 className="step"><span className="step__n">1</span> Choose a delegation</h3>
          <div className="search">
            <Search size={20} aria-hidden="true" />
            <label className="sr-only" htmlFor="who">Search delegations</label>
            <input id="who" type="search" placeholder="Search delegations" value={p.filter} onChange={(e) => p.setFilter(e.target.value)} autoComplete="off" />
          </div>
          <div className="chips" role="group" aria-label="Delegations">
            {p.choices.map((c) => (
              <button
                key={c.id}
                type="button"
                className={'chip' + (c.chair ? ' chip--chair' : '')}
                aria-pressed={p.picked?.id === c.id}
                onClick={() => p.setPicked(p.picked?.id === c.id ? null : c)}
              >
                {c.label}
              </button>
            ))}
            {p.choices.length === 0 && <p className="empty">No delegation matches “{p.filter}”. Try another spelling.</p>}
          </div>

          <p className={'toline' + (p.picked ? ' is-set' : '')} aria-live="polite">{p.toLine}</p>
          {p.replyTo && (
            <p className="replying">
              <CornerUpLeft size={18} aria-hidden="true" /> Replying to {p.replyTo.from}: “{p.replyTo.text.slice(0, 60)}{p.replyTo.text.length > 60 ? '…' : ''}”
              <button type="button" className="text-btn" onClick={p.cancelReply}>Cancel reply</button>
            </p>
          )}

          <h3 className="step"><span className="step__n">2</span> Write your message</h3>
          <label className="sr-only" htmlFor="chit">Message</label>
          <textarea
            id="chit"
            rows={5}
            maxLength={p.maxLength}
            value={p.text}
            onChange={(e) => p.setText(e.target.value)}
            onKeyDown={onKey}
            placeholder={p.picked ? `Write to ${p.picked.label}` : 'Pick a delegation first'}
            aria-describedby="chit-count chit-help"
          />
          <div className="compose__foot">
            <p className="compose__meta">
              <span id="chit-count" className={p.text.length > p.maxLength - 50 ? 'is-near' : ''}>{p.text.length} / {p.maxLength}</span>
              <span id="chit-help">{isMac ? '⌘' : 'Ctrl'} + Enter sends</span>
            </p>
            <button type="button" className="btn btn--primary" disabled={!p.canSend} onClick={p.send}>
              <Send size={18} aria-hidden="true" /> Send chit
            </button>
          </div>
        </section>

        <div className="pcol">
          <section className="card" aria-labelledby="inbox-title">
            <div className="card__row">
              <h2 className="card__title" id="inbox-title">
                <Inbox size={22} aria-hidden="true" /> Inbox
                <span className={'badge' + (p.unread ? ' is-hot' : '')} aria-label={`${p.unread} unread`}>{p.unread}</span>
              </h2>
              <button type="button" className="text-btn" onClick={p.markAllRead} disabled={!p.unread}>
                <MailCheck size={18} aria-hidden="true" /> Mark all read
              </button>
            </div>
            <ul className="chits">
              {p.inbox.map((c) => {
                const fresh = p.isNew(c);
                return (
                  <li key={c.id} className={'chit' + (fresh ? ' is-new' : '')}>
                    <div className="chit__top">
                      <strong>{c.from}</strong>
                      {fresh && <span className="status status--new">New</span>}
                      <span className="chit__ago">{p.ago(c.createdAt)}</span>
                    </div>
                    <p className="chit__text">{c.text}</p>
                    <div className="chit__acts">
                      <button type="button" className="mini-btn" onClick={() => p.reply(c)}>
                        <CornerUpLeft size={16} aria-hidden="true" /> Reply
                      </button>
                      {fresh && (
                        <button type="button" className="mini-btn mini-btn--ghost" onClick={() => p.markRead(c)}>
                          <Check size={16} aria-hidden="true" /> Mark read
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card" aria-labelledby="sent-title">
            <h2 className="card__title" id="sent-title"><Send size={22} aria-hidden="true" /> Sent chits</h2>
            <ul className="chits">
              {p.sent.map((c) => (
                <li key={c.id} className="chit">
                  <div className="chit__top">
                    <span>To <strong>{c.to}</strong></span>
                    <Pill c={c} label={p.STATUS_LABEL[c.status]} />
                    <span className="chit__ago">{p.ago(c.createdAt)}</span>
                  </div>
                  <p className="chit__text">{c.text}</p>
                  {c.note && <p className="chit__note"><strong>Chair’s note:</strong> {c.note}</p>}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ chair */
function QueueItem({ c, p }: { c: Chit; p: P }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  return (
    <li className="chit chit--queue">
      <div className="chit__top">
        <span><strong>{c.from}</strong> to <strong>{c.to}</strong></span>
        <span className="chit__ago">{p.ago(c.createdAt)}</span>
      </div>
      <p className="chit__text">{c.text}</p>
      {rejecting ? (
        <div className="reject">
          <label htmlFor={'note-' + c.id}>Note for {c.from} (optional)</label>
          <input id={'note-' + c.id} type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why it was not approved" autoFocus />
          <div className="chit__acts">
            <button type="button" className="mini-btn mini-btn--coral" onClick={() => p.decide(c, 'reject', note.trim())}>
              <X size={16} aria-hidden="true" /> Reject chit
            </button>
            <button type="button" className="mini-btn mini-btn--ghost" onClick={() => { setRejecting(false); setNote(''); }}>Keep in queue</button>
          </div>
        </div>
      ) : (
        <div className="chit__acts">
          <button type="button" className="mini-btn mini-btn--mint" onClick={() => p.decide(c, 'approve')}>
            <Check size={16} aria-hidden="true" /> Approve &amp; deliver
          </button>
          <button type="button" className="mini-btn mini-btn--ghost" onClick={() => setRejecting(true)}>
            <X size={16} aria-hidden="true" /> Reject
          </button>
        </div>
      )}
    </li>
  );
}

export function ChairPortal({ p }: { p: P }) {
  const still = useStillCtx();
  const stats = [
    { k: 'Delegations', v: p.stats.delegations, tone: 'blue' },
    { k: 'Waiting for you', v: p.stats.waiting, tone: 'sun' },
    { k: 'Approved', v: p.stats.approved, tone: 'mint' },
    { k: 'Not approved', v: p.stats.rejected, tone: 'coral' },
  ];
  return (
    <Shell active="chair" title="Chair dashboard" who={<>{p.roster.chair.name}, {p.committee.name} ({p.committee.id})</>}>
      <ul className="pstats" aria-label="Committee at a glance">
        {stats.map((s) => (
          <li key={s.k} className={`pstat pstat--${s.tone}`}>
            <NumberFlow className="pstat__n" value={s.v} animated={!still} />
            <span className="pstat__k">{s.k}</span>
          </li>
        ))}
      </ul>
      <div className="pgrid pgrid--chair">
        <section className="card" aria-labelledby="queue-title">
          <h2 className="card__title" id="queue-title">
            Chit queue <span className={'badge' + (p.queue.length ? ' is-hot' : '')}>{p.queue.length}</span>
          </h2>
          <p className="card__hint">Newest first. Approve to deliver the chit to its recipient, or reject it with an optional note for the sender.</p>
          <ul className="chits">
            {p.queue.map((c) => <QueueItem key={c.id} c={c} p={p} />)}
            {p.queue.length === 0 && <li className="empty">Queue is clear. New chits from delegates land here.</li>}
          </ul>
        </section>
        <div className="pcol">
          <section className="card" aria-labelledby="tochair-title">
            <h2 className="card__title" id="tochair-title">To the Chair <span className="badge">{p.chairInbox.length}</span></h2>
            <ul className="chits">
              {p.chairInbox.map((c) => (
                <li key={c.id} className="chit">
                  <div className="chit__top"><strong>{c.from}</strong><span className="chit__ago">{p.ago(c.createdAt)}</span></div>
                  <p className="chit__text">{c.text}</p>
                </li>
              ))}
            </ul>
          </section>
          <section className="card" aria-labelledby="log-title">
            <h2 className="card__title" id="log-title">Decision log</h2>
            <ul className="chits">
              {p.log.map((c) => (
                <li key={c.id} className="chit">
                  <div className="chit__top">
                    <span><strong>{c.from}</strong> to <strong>{c.to}</strong></span>
                    <Pill c={c} label={p.STATUS_LABEL[c.status]} />
                  </div>
                  <p className="chit__text">{c.text}</p>
                  {c.note && <p className="chit__note"><strong>Your note:</strong> {c.note}</p>}
                </li>
              ))}
            </ul>
          </section>
          <section className="card" aria-labelledby="roster-title">
            <h2 className="card__title" id="roster-title">Delegations <span className="badge">{p.roster.delegations.length}</span></h2>
            <ul className="roster">
              {p.roster.delegations.map((d) => <li key={d.id}>{d.delegation}</li>)}
            </ul>
          </section>
        </div>
      </div>
    </Shell>
  );
}
