import { useState } from 'react';
import NumberFlow from '@number-flow/react';
import { Check, X } from 'lucide-react';
import type { Chit } from '@/data/portal-mock';
import { PortalHead, StatusPill, type PortalApi } from './Portal';

function QueueItem({ c, p, still }: { c: Chit; p: PortalApi; still: boolean }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const id = 'note-' + c.id;
  return (
    <li className="msg q">
      <div className="msg-top">
        <span className="msg-from">{c.from} <span className="q-to">to {c.to}</span></span>
        <span className="msg-ago">{p.ago(c.createdAt)}</span>
      </div>
      <p className="msg-t">{c.text}</p>
      {!rejecting ? (
        <div className="q-act">
          <button type="button" className="btn btn-em btn-sm" onClick={() => p.decide(c, 'approve')}>
            <Check size={16} aria-hidden="true" /> Approve &amp; deliver
          </button>
          <button type="button" className="btn btn-line-dk btn-sm" onClick={() => setRejecting(true)}>
            <X size={16} aria-hidden="true" /> Reject
          </button>
        </div>
      ) : (
        <div className={'q-rej' + (still ? '' : ' is-anim')}>
          <label htmlFor={id} className="q-rej-l">Note for {c.from} (optional)</label>
          <input id={id} className="q-rej-i" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why it was not approved" autoFocus maxLength={160} />
          <div className="q-act">
            <button type="button" className="btn btn-wine btn-sm" onClick={() => p.decide(c, 'reject', note.trim())}>Reject chit</button>
            <button type="button" className="btn btn-line-dk btn-sm" onClick={() => { setRejecting(false); setNote(''); }}>Cancel</button>
          </div>
        </div>
      )}
    </li>
  );
}

export function ChairView({ p, still }: { p: PortalApi; still: boolean }) {
  const stats = [
    { k: 'Waiting for you', v: p.stats.waiting, cls: 'st-wait' },
    { k: 'Approved', v: p.stats.approved, cls: 'st-ok' },
    { k: 'Not approved', v: p.stats.rejected, cls: 'st-no' },
    { k: 'Delegations', v: p.stats.delegations, cls: '' },
  ];
  return (
    <div className="portal wrap">
      <PortalHead
        title="Chair portal"
        who={`${p.roster.chair.name}, ${p.committee.name} (${p.committee.id})`}
        other={{ href: '#/portal', label: 'Switch to the delegate view' }}
      />

      <dl className="stats">
        {stats.map((s) => (
          <div key={s.k} className={'stat ' + s.cls}>
            <dt>{s.k}</dt>
            <dd><NumberFlow value={s.v} animated={!still} /></dd>
          </div>
        ))}
      </dl>

      <div className="pg">
        <section className="pane" aria-labelledby="q-h">
          <div className="pane-top">
            <h2 id="q-h" className="pane-h">Approval queue <span className="badge">{p.queue.length}</span></h2>
          </div>
          <p className="pane-p">Approve to deliver a chit to its recipient, or reject it with an optional note for the sender.</p>
          {p.queue.length === 0
            ? <p className="empty">The queue is clear. New chits from delegates appear here.</p>
            : <ul className="msgs">{p.queue.map((c) => <QueueItem key={c.id} c={c} p={p} still={still} />)}</ul>}
        </section>

        <div className="pg-r">
          <section className="pane" aria-labelledby="ci-h">
            <div className="pane-top">
              <h2 id="ci-h" className="pane-h">To the chair <span className="pane-c">{p.chairInbox.length}</span></h2>
            </div>
            <ul className="msgs">
              {p.chairInbox.map((c) => (
                <li key={c.id} className="msg">
                  <div className="msg-top">
                    <span className="msg-from">{c.from}</span>
                    <span className="msg-ago">{p.ago(c.createdAt)}</span>
                  </div>
                  <p className="msg-t">{c.text}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="pane" aria-labelledby="log-h">
            <div className="pane-top">
              <h2 id="log-h" className="pane-h">Decision log <span className="pane-c">{p.log.length}</span></h2>
            </div>
            <ul className="log">
              {p.log.map((c) => (
                <li key={c.id} className="log-row">
                  <div className="log-main">
                    <span className="msg-from">{c.from} <span className="q-to">to {c.to}</span></span>
                    <p className="msg-t">{c.text}</p>
                    {c.note && <p className="note">Note: {c.note}</p>}
                  </div>
                  <div className="log-side">
                    <StatusPill c={c} label={p.STATUS_LABEL[c.status]} />
                    <span className="msg-ago">{p.ago(c.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
