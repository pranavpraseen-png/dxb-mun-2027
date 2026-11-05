import { useState } from 'react';
import NumberFlow from '@number-flow/react';
import { Check, X } from 'lucide-react';
import type { Chit } from '@/data/portal-mock';
import { Count, Empty, Panel, Pill, PortalShell, type Portal } from './shared';

export function ChairPortal({ p, still }: { p: Portal; still: boolean }) {
  const stats = [
    { k: 'Delegations', v: p.stats.delegations },
    { k: 'Waiting for you', v: p.stats.waiting, hot: true },
    { k: 'Approved', v: p.stats.approved },
    { k: 'Not approved', v: p.stats.rejected },
  ];

  return (
    <PortalShell
      kind="Chair portal"
      title={p.committee.name}
      ident={[
        { k: 'Committee', v: p.committee.id },
        { k: 'Chair', v: p.roster.chair.name },
      ]}
      aside={
        <dl className="kpis">
          {stats.map((s) => (
            <div key={s.k} className={s.hot && s.v > 0 ? 'kpi is-hot' : 'kpi'}>
              <dt>{s.k}</dt>
              <dd><NumberFlow value={s.v} animated={!still} /></dd>
            </div>
          ))}
        </dl>
      }
    >
      <div className="pt-grid pt-grid--chair">
        <Panel id="q-h" title="Approval queue" count={<Count n={p.queue.length} tone="hot" />} className="pn--queue">
          <p className="pn-sub">Approve to deliver the chit to its recipient, or reject it with an optional note for the sender.</p>
          {p.queue.length === 0 ? (
            <Empty>The queue is clear. New chits from delegations will wait here for you.</Empty>
          ) : (
            <ul className="chits">
              {p.queue.map((c) => <QueueItem key={c.id} c={c} p={p} />)}
            </ul>
          )}
        </Panel>

        <div className="pt-stack">
          <Panel id="c-h" title="To the Chair" count={<Count n={p.chairInbox.length} />}>
            {p.chairInbox.length === 0 ? (
              <Empty>No messages for the chair.</Empty>
            ) : (
              <ul className="chits">
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
            )}
          </Panel>
          <Panel id="r-h" title="Delegations" count={<Count n={p.roster.delegations.length} />}>
            <ul className="roster">
              {p.roster.delegations.map((d) => <li key={d.id}>{d.delegation}</li>)}
            </ul>
          </Panel>
        </div>

        <Panel id="l-h" title="Decision log" count={<Count n={p.log.length} />} className="pn--sent">
          {p.log.length === 0 ? (
            <Empty>Decisions you make appear here.</Empty>
          ) : (
            <ul className="ledger">
              {p.log.map((c) => (
                <li key={c.id + c.status} className="led">
                  <span className="led-to">{c.from} <span className="led-k">to</span> {c.to}</span>
                  <span className="led-text">
                    {c.text}
                    {c.note && <span className="led-note">Your note: {c.note}</span>}
                  </span>
                  <span className="led-status"><Pill status={c.status} label={c.status === 'delivered' ? 'Approved' : p.STATUS_LABEL[c.status]} /></span>
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

function QueueItem({ c, p }: { c: Chit; p: Portal }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const noteId = 'note-' + c.id;
  return (
    <li className="chit chit--q">
      <div className="chit-top">
        <span className="chit-from">{c.from} <span className="chit-arrow">to</span> {c.to}</span>
        <span className="chit-ago">{p.ago(c.createdAt)}</span>
      </div>
      <p className="chit-text">{c.text}</p>
      {!rejecting ? (
        <div className="chit-act">
          <button type="button" className="btn-p btn-p--sm" onClick={() => p.decide(c, 'approve')}>
            <Check size={18} aria-hidden="true" /> Approve &amp; deliver
          </button>
          <button type="button" className="btn-s" onClick={() => setRejecting(true)}>
            <X size={16} aria-hidden="true" /> Reject
          </button>
        </div>
      ) : (
        <div className="reject">
          <label htmlFor={noteId} className="reject-l">Note for {c.from} (optional)</label>
          <input
            id={noteId}
            className="field"
            value={note}
            autoFocus
            placeholder="For example: please keep chits on committee business."
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') p.decide(c, 'reject', note.trim()); if (e.key === 'Escape') setRejecting(false); }}
          />
          <div className="chit-act">
            <button type="button" className="btn-s btn-s--danger" onClick={() => p.decide(c, 'reject', note.trim())}>Reject chit</button>
            <button type="button" className="btn-s btn-s--quiet" onClick={() => setRejecting(false)}>Cancel</button>
          </div>
        </div>
      )}
    </li>
  );
}
