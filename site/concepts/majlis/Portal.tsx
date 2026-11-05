import { useRef } from 'react';
import { Check, CornerUpLeft, Search, Send, X } from 'lucide-react';
import type { usePortal } from '@/shared/hooks';
import type { Chit } from '@/data/portal-mock';

export type PortalApi = ReturnType<typeof usePortal>;

export function PreviewTag() {
  return <span className="preview">Preview · sample data</span>;
}

export function StatusPill({ c, label }: { c: Chit; label: string }) {
  return <span className={'pill pill-' + c.status}>{label}</span>;
}

export function PortalHead({ title, who, other }: { title: string; who: string; other: { href: string; label: string } }) {
  return (
    <div className="ph">
      <div className="ph-l">
        <h1 className="ph-h">{title}</h1>
        <p className="ph-who">{who}</p>
      </div>
      <div className="ph-r">
        <PreviewTag />
        <a className="ph-switch" href={other.href}>{other.label}</a>
      </div>
    </div>
  );
}

export function Delegate({ p }: { p: PortalApi }) {
  const box = useRef<HTMLTextAreaElement>(null);
  const left = p.maxLength - p.text.length;

  const pick = (c: { id: string; label: string; chair: boolean }) => {
    p.setPicked(c);
    requestAnimationFrame(() => box.current?.focus());
  };
  const reply = (c: Chit) => { p.reply(c); requestAnimationFrame(() => box.current?.focus()); };

  return (
    <div className="portal wrap">
      <PortalHead
        title="Delegate portal"
        who={`${p.me.delegation}, ${p.committee.name} (${p.committee.id})`}
        other={{ href: '#/chair', label: 'Switch to the chair view' }}
      />

      <div className="pg">
        <section className="pane compose" aria-labelledby="cmp-h">
          <h2 id="cmp-h" className="pane-h">Write a chit</h2>
          <p className="pane-p">Chits to delegations go to your chair first. Chits to the chair are delivered straight away.</p>

          <div className="step">
            <label htmlFor="dlg-q" className="step-l"><span className="step-n">1</span>Choose a delegation</label>
            <div className="search">
              <Search size={18} aria-hidden="true" />
              <input id="dlg-q" type="search" placeholder="Search delegations" value={p.filter} onChange={(e) => p.setFilter(e.target.value)} autoComplete="off" />
            </div>
            <div className="chips" role="group" aria-label="Delegations">
              {p.choices.map((c) => (
                <button key={c.id} type="button" className={'chip' + (c.chair ? ' chip-chair' : '')} aria-pressed={p.picked?.id === c.id} onClick={() => pick(c)}>
                  {c.label}
                </button>
              ))}
              {p.choices.length === 0 && <p className="empty">No delegation matches “{p.filter}”. Clear the search to see all of them.</p>}
            </div>
          </div>

          <p className={'to' + (p.picked ? ' is-set' : '')} aria-live="polite">{p.toLine}</p>

          {p.replyTo && (
            <div className="replying">
              <CornerUpLeft size={16} aria-hidden="true" />
              <span>Replying to {p.replyTo.from}: “{p.replyTo.text.slice(0, 60)}{p.replyTo.text.length > 60 ? '…' : ''}”</span>
              <button type="button" className="link-btn" onClick={p.cancelReply}>Cancel reply</button>
            </div>
          )}

          <div className="step">
            <label htmlFor="chit" className="step-l"><span className="step-n">2</span>Write your message</label>
            <textarea
              id="chit" ref={box} className="chit" rows={5} maxLength={p.maxLength} value={p.text}
              placeholder={p.picked ? 'Keep it to committee business.' : 'Choose a delegation first.'}
              onChange={(e) => p.setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); p.send(); } }}
              aria-describedby="chit-count chit-hint"
            />
            <div className="chit-foot">
              <span id="chit-hint" className="hint">Ctrl or Cmd + Enter sends</span>
              <span id="chit-count" className={'count' + (left < 50 ? ' is-low' : '')}>{p.text.length} / {p.maxLength}</span>
            </div>
          </div>
          <button type="button" className="btn btn-em send" disabled={!p.canSend} onClick={p.send}>
            <Send size={18} aria-hidden="true" /> Send chit
          </button>
        </section>

        <div className="pg-r">
          <section className="pane" aria-labelledby="inb-h">
            <div className="pane-top">
              <h2 id="inb-h" className="pane-h">Inbox <span className="badge" aria-label={`${p.unread} unread`}>{p.unread}</span></h2>
              <button type="button" className="link-btn" onClick={p.markAllRead} disabled={p.unread === 0}>Mark all read</button>
            </div>
            <ul className="msgs">
              {p.inbox.map((c) => {
                const fresh = p.isNew(c);
                return (
                  <li key={c.id} className={'msg' + (fresh ? ' is-new' : '')}>
                    <div className="msg-top">
                      <span className="msg-from">{fresh && <span className="dot" aria-hidden="true" />}{c.from}</span>
                      <span className="msg-ago">{fresh && <span className="sr-only">Unread, </span>}{p.ago(c.createdAt)}</span>
                    </div>
                    <p className="msg-t">{c.text}</p>
                    <div className="msg-act">
                      <button type="button" className="mini" onClick={() => reply(c)}><CornerUpLeft size={15} aria-hidden="true" /> Reply</button>
                      {fresh && <button type="button" className="mini" onClick={() => p.markRead(c)}><Check size={15} aria-hidden="true" /> Mark read</button>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="pane" aria-labelledby="snt-h">
            <div className="pane-top">
              <h2 id="snt-h" className="pane-h">Sent <span className="pane-c">{p.sent.length}</span></h2>
            </div>
            <ul className="msgs">
              {p.sent.map((c) => (
                <li key={c.id} className="msg">
                  <div className="msg-top">
                    <span className="msg-from">To {c.to}</span>
                    <StatusPill c={c} label={p.STATUS_LABEL[c.status]} />
                  </div>
                  <p className="msg-t">{c.text}</p>
                  <div className="msg-meta">
                    <span className="msg-ago">{p.ago(c.createdAt)}</span>
                  </div>
                  {c.note && <p className="note"><X size={14} aria-hidden="true" /> Chair’s note: {c.note}</p>}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
