import { useRef } from 'react';
import { Reply, Search, Send, X } from 'lucide-react';
import clsx from 'clsx';
import { Count, Empty, Panel, Pill, PortalShell, type Portal } from './shared';

export function DelegatePortal({ p }: { p: Portal; still: boolean }) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const left = p.maxLength - p.text.length;

  return (
    <PortalShell
      kind="Delegate portal"
      title={p.me.delegation}
      ident={[
        { k: 'Committee', v: p.committee.id },
        { k: 'Delegate', v: p.me.name },
        { k: 'Unread', v: String(p.unread) },
      ]}
    >
      <div className="pt-grid pt-grid--del">
        <Panel id="send-h" title="Send a chit" className="pn--compose">
          <p className="pn-sub">Chits go to your chair first. Once the chair approves, the other delegation receives it. Chits to the Chair arrive straight away.</p>

          <div className="step">
            <label className="step-l" htmlFor="pick">
              <span className="step-n">1</span> Choose a delegation
            </label>
            <div className="field field--search">
              <Search size={18} aria-hidden="true" />
              <input id="pick" type="search" placeholder="Search delegations" autoComplete="off" value={p.filter} onChange={(e) => p.setFilter(e.target.value)} />
            </div>
            <div className="chips" role="group" aria-label="Delegations in your committee">
              {p.choices.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={clsx('chip', c.chair && 'chip--chair')}
                  aria-pressed={p.picked?.id === c.id}
                  onClick={() => { p.setPicked(c); textRef.current?.focus({ preventScroll: true }); }}
                >
                  {c.label}
                </button>
              ))}
              {p.choices.length === 0 && <span className="chips-none">No delegation matches “{p.filter}”.</span>}
            </div>
          </div>

          {p.replyTo && (
            <div className="replying">
              <Reply size={16} aria-hidden="true" />
              <span>Replying to {p.replyTo.from}: “{p.replyTo.text.length > 64 ? p.replyTo.text.slice(0, 64) + '…' : p.replyTo.text}”</span>
              <button type="button" className="btn-s btn-s--quiet" onClick={p.cancelReply} aria-label="Cancel reply"><X size={16} aria-hidden="true" /> Cancel</button>
            </div>
          )}
          <p className={clsx('to-line', p.picked && 'is-set')} aria-live="polite">{p.toLine}</p>

          <div className="step">
            <label className="step-l" htmlFor="chit">
              <span className="step-n">2</span> Write your message
            </label>
            <textarea
              id="chit"
              ref={textRef}
              className="field field--area"
              maxLength={p.maxLength}
              rows={5}
              placeholder="Keep it short and diplomatic."
              value={p.text}
              onChange={(e) => p.setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); p.send(); } }}
              aria-describedby="chit-meta"
            />
            <div className="field-meta" id="chit-meta">
              <span><kbd>Ctrl</kbd> + <kbd>Enter</kbd> to send</span>
              <span className={clsx('count', left < 50 && 'is-low')}>{p.text.length} / {p.maxLength}</span>
            </div>
          </div>
          <button type="button" className="btn-p" disabled={!p.canSend} onClick={p.send}>
            <Send size={18} aria-hidden="true" /> Send chit
          </button>
        </Panel>

        <Panel
          id="in-h"
          title="Inbox"
          count={<Count n={p.unread} tone="hot" />}
          className="pn--inbox"
          tools={<button type="button" className="btn-s" onClick={p.markAllRead} disabled={p.unread === 0}>Mark all read</button>}
        >
          {p.inbox.length === 0 ? (
            <Empty>No chits yet. Messages from other delegations appear here once the chair approves them.</Empty>
          ) : (
            <ul className="chits">
              {p.inbox.map((c) => {
                const fresh = p.isNew(c);
                return (
                  <li key={c.id} className={clsx('chit', fresh && 'is-new')}>
                    <div className="chit-top">
                      <span className="chit-from">{fresh && <span className="dot" aria-label="Unread" />}{c.from}</span>
                      <span className="chit-ago">{p.ago(c.createdAt)}</span>
                    </div>
                    <p className="chit-text">{c.text}</p>
                    <div className="chit-act">
                      <button type="button" className="btn-s" onClick={() => { p.reply(c); textRef.current?.focus(); }}>
                        <Reply size={16} aria-hidden="true" /> Reply
                      </button>
                      {fresh && <button type="button" className="btn-s btn-s--quiet" onClick={() => p.markRead(c)}>Mark read</button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel id="sent-h" title="Sent chits" count={<Count n={p.sent.length} />} className="pn--sent">
          {p.sent.length === 0 ? (
            <Empty>Nothing sent yet. Choose a delegation and write your first chit.</Empty>
          ) : (
            <ul className="ledger">
              {p.sent.map((c) => (
                <li key={c.id} className="led">
                  <span className="led-to"><span className="led-k">To</span> {c.to}</span>
                  <span className="led-text">
                    {c.text}
                    {c.note && <span className="led-note">Chair’s note: {c.note}</span>}
                  </span>
                  <span className="led-status"><Pill status={c.status} label={p.STATUS_LABEL[c.status]} /></span>
                  <span className="led-ago">{p.ago(c.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </PortalShell>
  );
}
