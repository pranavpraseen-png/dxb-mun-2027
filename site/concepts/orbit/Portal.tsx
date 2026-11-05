import { useState, type ReactNode } from 'react';
import NumberFlow from '@number-flow/react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Send, Reply, CheckCheck, Check, X, Inbox, PenLine, ArrowUpRight, ListChecks, MessageSquare, Users, History, CornerDownRight } from 'lucide-react';
import { usePortal, viewHref } from '@/shared/hooks';
import type { Chit, ChitStatus } from '@/data/portal-mock';
import { DubaiClock, Wordmark } from './Chrome';

type P = ReturnType<typeof usePortal>;

/* ------------------------------------------------------------ shared shell */
function Shell({ role, title, nav, children, p }: { role: 'delegate' | 'chair'; title: string; nav: { href: string; label: string; icon: ReactNode; count?: number }[]; children: ReactNode; p: P }) {
  return (
    <div className="app">
      <aside className="app-side" aria-label="Portal">
        <a href="#/" className="top-brand app-brand" aria-label="DXB MUN home"><Wordmark /></a>
        <div className="app-ws">
          <span className="app-ws-a mono">{p.committee.id}</span>
          <span className="app-ws-n">{p.committee.name}</span>
        </div>
        <nav className="app-nav" aria-label="Sections">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="app-nav-i">
              {n.icon}<span>{n.label}</span>
              {n.count !== undefined && <span className="mono app-count">{n.count}</span>}
            </a>
          ))}
        </nav>
        <div className="app-switch">
          <span className="mono dim">Switch view</span>
          <a href={viewHref('portal')} className={'app-nav-i' + (role === 'delegate' ? ' is-on' : '')} aria-current={role === 'delegate' ? 'page' : undefined}>Delegate</a>
          <a href={viewHref('chair')} className={'app-nav-i' + (role === 'chair' ? ' is-on' : '')} aria-current={role === 'chair' ? 'page' : undefined}>Chair</a>
          <a href={viewHref('timer')} className="app-nav-i">Floor timer</a>
        </div>
        <div className="app-me">
          <span className="app-av mono" aria-hidden="true">{role === 'chair' ? 'CH' : 'FR'}</span>
          <span>
            <span className="app-me-n">{role === 'chair' ? p.roster.chair.name : p.me.name}</span>
            <span className="app-me-r mono dim">{role === 'chair' ? 'Chair, ' + p.committee.id : p.me.delegation}</span>
          </span>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-bar">
          <span className="mono dim app-crumb">{p.committee.id} / {role === 'chair' ? 'Chair' : 'Delegate'}</span>
          <span className="pv mono">Preview · sample data</span>
          <span className="app-bar-r"><DubaiClock /></span>
          <a href="#/" className="btn btn-ghost btn-sm">Website</a>
        </header>
        <div className="app-head">
          <h1 className="app-h1">{title}</h1>
        </div>
        {children}
      </div>

      <div className="toast-zone" aria-live="polite" role="status">
        <AnimatePresence>
          {p.toast && (
            <motion.div key={p.toast} className="toast mono" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.18 }}>
              <Check size={14} aria-hidden="true" />{p.toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Panel({ id, title, icon, count, action, children, className }: { id?: string; title: string; icon: ReactNode; count?: number; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={'pn ' + (className ?? '')} aria-labelledby={id ? id + '-h' : undefined}>
      <header className="pn-h">
        {icon}
        <h2 id={id ? id + '-h' : undefined}>{title}</h2>
        {count !== undefined && <span className="mono pn-c">{count}</span>}
        <span className="pn-a">{action}</span>
      </header>
      {children}
    </section>
  );
}

const STATUS_ICON: Record<ChitStatus, ReactNode> = {
  pending: <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.2 2" /></svg>,
  delivered: <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="6" fill="currentColor" /><path d="M4.2 7.2l1.9 1.8 3.7-3.9" fill="none" stroke="var(--bg)" strokeWidth="1.6" /></svg>,
  rejected: <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M4.8 4.8l4.4 4.4M9.2 4.8l-4.4 4.4" stroke="currentColor" strokeWidth="1.5" /></svg>,
};
function Pill({ status, label }: { status: ChitStatus; label: string }) {
  return <span className={'pill pill-' + status}>{STATUS_ICON[status]}{label}</span>;
}
const Empty = ({ children }: { children: ReactNode }) => <p className="empty mono dim">{children}</p>;

/* ------------------------------------------------------------ delegate */
export function Delegate({ p }: { p: P }) {
  const left = p.maxLength - p.text.length;
  return (
    <Shell
      role="delegate" p={p} title="Delegate portal"
      nav={[
        { href: '#compose', label: 'Send a chit', icon: <PenLine size={16} aria-hidden="true" /> },
        { href: '#inbox', label: 'Inbox', icon: <Inbox size={16} aria-hidden="true" />, count: p.unread },
        { href: '#sent', label: 'Sent', icon: <ArrowUpRight size={16} aria-hidden="true" />, count: p.sent.length },
      ]}
    >
      <div className="app-grid">
        <Panel id="compose" title="Send a chit" icon={<PenLine size={16} aria-hidden="true" />} className="pn-compose">
          <p className="pn-intro">Chits go to your chair first. Once the chair approves, the other delegation receives it.</p>
          <div className="step">
            <span className="mono step-n">1</span>
            <label htmlFor="dl-search" className="step-l">Choose a delegation</label>
          </div>
          <div className="search">
            <Search size={16} aria-hidden="true" />
            <input id="dl-search" className="search-in" placeholder="Search delegations" value={p.filter} onChange={(e) => p.setFilter(e.target.value)} autoComplete="off" />
          </div>
          <div className="chips" role="listbox" aria-label="Delegations">
            {p.choices.map((c) => {
              const on = p.picked?.id === c.id;
              return (
                <button key={c.id} type="button" role="option" aria-selected={on} className={'chip' + (on ? ' is-on' : '') + (c.chair ? ' chip-chair' : '')} onClick={() => p.setPicked(on ? null : c)}>
                  {c.label}
                </button>
              );
            })}
            {p.choices.length === 0 && <Empty>No delegation matches “{p.filter}”.</Empty>}
          </div>
          <p className={'to mono' + (p.picked ? ' is-set' : '')} aria-live="polite">{p.toLine}</p>

          <div className="step">
            <span className="mono step-n">2</span>
            <label htmlFor="dl-text" className="step-l">Write your message</label>
          </div>
          {p.replyTo && (
            <div className="replying mono">
              <CornerDownRight size={14} aria-hidden="true" />
              <span>Replying to {p.replyTo.from}</span>
              <button type="button" className="link-btn" onClick={p.cancelReply}>Cancel</button>
            </div>
          )}
          <textarea
            id="dl-text" className="ta" rows={5} maxLength={p.maxLength} value={p.text}
            placeholder={p.picked ? 'Write to ' + (p.picked.chair ? 'the Chair' : p.picked.label) : 'Pick a delegation first'}
            onChange={(e) => p.setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); p.send(); } }}
            aria-describedby="dl-count"
          />
          <div className="send-row">
            <span id="dl-count" className={'mono count' + (left < 50 ? ' is-low' : '')}>{p.text.length} / {p.maxLength}</span>
            <span className="mono dim kbd-hint"><kbd>Ctrl</kbd> <kbd>Enter</kbd></span>
            <button type="button" className="btn btn-primary" disabled={!p.canSend} onClick={p.send}>
              <Send size={16} aria-hidden="true" />Send chit
            </button>
          </div>
        </Panel>

        <div className="app-col">
          <Panel
            id="inbox" title="Inbox" icon={<Inbox size={16} aria-hidden="true" />} count={p.unread}
            action={<button type="button" className="btn btn-ghost btn-sm" onClick={p.markAllRead} disabled={!p.unread}><CheckCheck size={15} aria-hidden="true" />Mark all read</button>}
          >
            <ul className="rows">
              {p.inbox.map((c) => {
                const fresh = p.isNew(c);
                return (
                  <li key={c.id} className={'row' + (fresh ? ' is-new' : '')}>
                    <span className="row-dot" aria-hidden="true" />
                    <div className="row-main">
                      <div className="row-top">
                        <span className="row-from">{c.from}</span>
                        {fresh && <span className="sr-only">Unread.</span>}
                        <span className="mono dim row-t">{p.ago(c.createdAt)}</span>
                      </div>
                      <p className="row-text">{c.text}</p>
                      <div className="row-act">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => p.reply(c)}><Reply size={15} aria-hidden="true" />Reply</button>
                        {fresh && <button type="button" className="btn btn-ghost btn-sm" onClick={() => p.markRead(c)}><Check size={15} aria-hidden="true" />Mark read</button>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel id="sent" title="Sent" icon={<ArrowUpRight size={16} aria-hidden="true" />} count={p.sent.length}>
            <ul className="rows">
              {p.sent.map((c) => (
                <li key={c.id} className="row">
                  <div className="row-main">
                    <div className="row-top">
                      <span className="row-from"><span className="dim">To</span> {c.to}</span>
                      <Pill status={c.status} label={p.STATUS_LABEL[c.status]} />
                      <span className="mono dim row-t">{p.ago(c.createdAt)}</span>
                    </div>
                    <p className="row-text">{c.text}</p>
                    {c.note && <p className="row-note mono"><span className="dim">Chair’s note</span> {c.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------ chair */
export function Chair({ p, still }: { p: P; still: boolean }) {
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const stat = (label: string, v: number, accent = false) => (
    <div className={'st' + (accent ? ' st-acc' : '')}>
      <dt className="mono dim">{label}</dt>
      <dd><NumberFlow value={v} animated={!still} /></dd>
    </div>
  );
  return (
    <Shell
      role="chair" p={p} title="Chair portal"
      nav={[
        { href: '#queue', label: 'Approval queue', icon: <ListChecks size={16} aria-hidden="true" />, count: p.queue.length },
        { href: '#to-chair', label: 'To the Chair', icon: <MessageSquare size={16} aria-hidden="true" />, count: p.chairInbox.length },
        { href: '#roster', label: 'Delegations', icon: <Users size={16} aria-hidden="true" />, count: p.stats.delegations },
        { href: '#log', label: 'Decision log', icon: <History size={16} aria-hidden="true" />, count: p.log.length },
      ]}
    >
      <dl className="stats-row">
        {stat('Delegations', p.stats.delegations)}
        {stat('Waiting', p.stats.waiting, true)}
        {stat('Approved', p.stats.approved)}
        {stat('Not approved', p.stats.rejected)}
      </dl>
      <div className="app-grid">
        <Panel id="queue" title="Approval queue" icon={<ListChecks size={16} aria-hidden="true" />} count={p.queue.length} className="pn-compose">
          <p className="pn-intro">Oldest first. Approve to deliver the chit to its recipient, or reject it with an optional note for the sender.</p>
          <ul className="rows">
            <AnimatePresence initial={false}>
              {[...p.queue].sort((a, b) => a.createdAt - b.createdAt).map((c) => (
                <motion.li key={c.id} className="row row-q" layout={!still} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.2 }}>
                  <div className="row-main">
                    <div className="row-top">
                      <span className="row-from">{c.from} <span className="dim">to</span> {c.to}</span>
                      <span className="mono dim row-t">{p.ago(c.createdAt)}</span>
                    </div>
                    <p className="row-text">{c.text}</p>
                    {rejecting === c.id ? (
                      <form className="reject" onSubmit={(e) => { e.preventDefault(); p.decide(c, 'reject', note.trim()); setRejecting(null); setNote(''); }}>
                        <label htmlFor={'note-' + c.id} className="mono dim">Note for {c.from} (optional)</label>
                        <input id={'note-' + c.id} className="search-in reject-in" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: please keep chits on committee business." autoFocus />
                        <div className="row-act">
                          <button type="submit" className="btn btn-danger btn-sm"><X size={15} aria-hidden="true" />Reject chit</button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setRejecting(null); setNote(''); }}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="row-act">
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => p.decide(c, 'approve')}><Check size={15} aria-hidden="true" />Approve &amp; deliver</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setRejecting(c.id); setNote(''); }}><X size={15} aria-hidden="true" />Reject</button>
                      </div>
                    )}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {p.queue.length === 0 && <Empty>The queue is clear. New chits between delegations will appear here.</Empty>}
        </Panel>

        <div className="app-col">
          <Panel id="to-chair" title="To the Chair" icon={<MessageSquare size={16} aria-hidden="true" />} count={p.chairInbox.length}>
            <ul className="rows">
              {p.chairInbox.map((c) => <ChitRow key={c.id} c={c} p={p} />)}
            </ul>
          </Panel>
          <Panel id="log" title="Decision log" icon={<History size={16} aria-hidden="true" />} count={p.log.length}>
            <ul className="rows">
              {p.log.map((c) => (
                <li key={c.id + c.status} className="row">
                  <div className="row-main">
                    <div className="row-top">
                      <span className="row-from">{c.from} <span className="dim">to</span> {c.to}</span>
                      <Pill status={c.status} label={c.status === 'delivered' ? 'Approved' : 'Not approved'} />
                    </div>
                    <p className="row-text">{c.text}</p>
                    {c.note && <p className="row-note mono"><span className="dim">Note</span> {c.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel id="roster" title="Delegations" icon={<Users size={16} aria-hidden="true" />} count={p.roster.delegations.length}>
            <ul className="roster">
              {p.roster.delegations.map((d) => <li key={d.id}>{d.delegation}</li>)}
            </ul>
          </Panel>
        </div>
      </div>
    </Shell>
  );
}

function ChitRow({ c, p }: { c: Chit; p: P }) {
  return (
    <li className="row">
      <div className="row-main">
        <div className="row-top">
          <span className="row-from">{c.from}</span>
          <span className="mono dim row-t">{p.ago(c.createdAt)}</span>
        </div>
        <p className="row-text">{c.text}</p>
      </div>
    </li>
  );
}
