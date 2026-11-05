// Shared behaviour for every concept, so designers only design. Logic mirrors the live site's js/*.js.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { wellness } from '@/data/conference';
import * as mock from '@/data/portal-mock';

/* ------------------------------------------------------------------ routing */
// Each concept is one page with four views: #/ (home), #/timer, #/portal (delegate), #/chair.
// In-page section links use #home, #about etc. (no slash) and do not change the view.
export type View = 'home' | 'timer' | 'portal' | 'chair';
const readView = (): View => {
  const h = location.hash;
  if (h.startsWith('#/timer')) return 'timer';
  if (h.startsWith('#/portal')) return 'portal';
  if (h.startsWith('#/chair')) return 'chair';
  return 'home';
};
let currentView: View = typeof location !== 'undefined' ? readView() : 'home';
const subscribeHash = (cb: () => void) => {
  const on = () => {
    if (location.hash.startsWith('#/') || location.hash === '' || location.hash === '#') {
      const next = readView();
      if (next !== currentView) { currentView = next; window.scrollTo(0, 0); }
      cb();
    }
  };
  window.addEventListener('hashchange', on);
  return () => window.removeEventListener('hashchange', on);
};
export const useView = () => useSyncExternalStore(subscribeHash, () => currentView, () => 'home' as View);
export const viewHref = (v: View) => (v === 'home' ? '#/' : '#/' + v);

/* ------------------------------------------------------------------ still / reduced motion */
// `?still` in the URL (used by screenshots) or the OS "reduce motion" setting: render final states, no motion.
export const isStill = () =>
  typeof window !== 'undefined' &&
  (new URLSearchParams(location.search).has('still') || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
export const useStill = () => useMemo(isStill, []);

/* ------------------------------------------------------------------ wellness check-in */
// Same storage key and behaviour as js/wellness.js: per device, resets each day.
const WELL_KEY = 'dxb-mun-wellness-checkin';
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export function useWellness() {
  const [checked, setChecked] = useState<string[]>([]);
  const [note, setNote] = useState<string>(wellness.note);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(WELL_KEY) || 'null');
      if (saved && saved.date === todayKey() && Array.isArray(saved.checks)) setChecked(saved.checks);
      else localStorage.removeItem(WELL_KEY);
    } catch { setNote('Could not load check-in; changes may not save.'); }
  }, []);
  const toggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem(WELL_KEY, JSON.stringify({ date: todayKey(), checks: next })); setNote(wellness.note); }
      catch { setNote('Browser storage unavailable; check-in will not persist.'); }
      return next;
    });
  }, []);
  const status = `${checked.length} of ${wellness.items.length} checked today.`;
  return { items: wellness.items, checked, toggle, status, note, done: checked.length === wellness.items.length };
}

/* ------------------------------------------------------------------ floor timer */
// Deadline-based countdown like js/timer.js. Duration is set by presets or a minutes/seconds picker (0-59 each).
export function useFloorTimer(initial = 60) {
  const [total, setTotalState] = useState(initial);
  const [left, setLeft] = useState(initial);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const deadline = useRef(0);
  const leftRef = useRef(initial);

  useEffect(() => {
    if (!running) return;
    deadline.current = Date.now() + leftRef.current * 1000;
    const id = setInterval(() => {
      const l = Math.max(0, (deadline.current - Date.now()) / 1000);
      leftRef.current = l;
      setLeft(l);
      if (l <= 0) { setRunning(false); setFinished(true); }
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  const setTotal = useCallback((sec: number) => {
    if (running) return;
    const s = Math.max(0, Math.min(59 * 60 + 59, Math.round(sec)));
    setTotalState(s); setLeft(s); leftRef.current = s; setFinished(false);
  }, [running]);
  const start = useCallback(() => {
    if (leftRef.current <= 0) { leftRef.current = total; setLeft(total); }
    setFinished(false); setRunning(true);
  }, [total]);
  const pause = useCallback(() => setRunning(false), []);
  const toggle = useCallback(() => (running ? pause() : start()), [running, pause, start]);
  const reset = useCallback(() => { setRunning(false); setFinished(false); setLeft(total); leftRef.current = total; }, [total]);

  const shown = Math.max(0, Math.ceil(left));
  const mm = String(Math.floor(shown / 60)).padStart(2, '0');
  const ss = String(shown % 60).padStart(2, '0');
  const state = finished ? 'Time is up.' : running ? 'Speaking…' : left < total ? 'Paused.' : 'Ready when you are.';
  return {
    total, left, running, finished, minutes: Math.floor(total / 60), seconds: total % 60,
    display: `${mm}:${ss}`, mm, ss, progress: total ? 1 - left / total : 0, state,
    presets: mock.timerPresets, setTotal, start, pause, toggle, reset,
  };
}

/* ------------------------------------------------------------------ portals (sample data) */
// Delegate and chair views share one in-memory store so approving a chit as chair shows up for the delegate.
export function usePortal() {
  const [sent, setSent] = useState(mock.sent);
  const [inbox] = useState(mock.inbox);
  const [queue, setQueue] = useState(mock.chairQueue);
  const [log, setLog] = useState(mock.chairLog);
  const [seen, setSeen] = useState<Record<string, boolean>>({ k3: true });
  const [picked, setPicked] = useState<{ id: string; label: string; chair: boolean } | null>(null);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('');
  const [replyTo, setReplyTo] = useState<mock.Chit | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  const choices = useMemo(() => {
    const all = [{ id: mock.roster.chair.id, label: 'Chair', chair: true }, ...mock.roster.delegations.map((d) => ({ id: d.id, label: d.delegation, chair: false }))];
    const q = filter.trim().toLowerCase();
    return all.filter((c) => !q || c.label.toLowerCase().includes(q));
  }, [filter]);

  const toLine = !picked ? 'Pick a delegation above to start.' : picked.chair ? 'To: the Chair. Delivered straight away.' : `To: ${picked.label}. Goes via the Chair for approval.`;
  const unread = inbox.filter((c) => !seen[c.id]).length;

  const send = () => {
    if (!picked || !text.trim()) return;
    const chit: mock.Chit = { id: 'n' + Date.now(), from: mock.me.delegation, fromId: mock.me.id, to: picked.chair ? 'Chair' : picked.label, text: text.trim(), status: picked.chair ? 'delivered' : 'pending', createdAt: Date.now(), replyTo: replyTo?.id };
    setSent((s) => [chit, ...s]);
    if (!picked.chair) setQueue((q) => [chit, ...q]);
    setToast(picked.chair ? 'Sent to the Chair' : 'Chit sent to your chair for approval');
    setText(''); setReplyTo(null);
  };
  const reply = (c: mock.Chit) => {
    setSeen((s) => ({ ...s, [c.id]: true }));
    const target = c.fromId === mock.roster.chair.id ? { id: c.fromId, label: 'Chair', chair: true } : { id: c.fromId, label: c.from, chair: false };
    setReplyTo(c); setPicked(target);
  };
  const decide = (c: mock.Chit, action: 'approve' | 'reject', note = '') => {
    const status: mock.ChitStatus = action === 'approve' ? 'delivered' : 'rejected';
    setQueue((q) => q.filter((x) => x.id !== c.id));
    setLog((l) => [{ ...c, status, note: note || undefined }, ...l]);
    setSent((s) => s.map((x) => (x.id === c.id ? { ...x, status, note: note || undefined } : x)));
    setToast(action === 'approve' ? 'Approved and delivered' : 'Chit rejected');
  };

  return {
    me: mock.me, committee: mock.myCommittee, roster: mock.roster,
    choices, filter, setFilter, picked, setPicked: (p: typeof picked) => { setReplyTo(null); setPicked(p); },
    text, setText, maxLength: 500, canSend: !!picked && !!text.trim(), send, toLine,
    replyTo, cancelReply: () => setReplyTo(null), reply,
    inbox, unread, isNew: (c: mock.Chit) => !seen[c.id], markRead: (c: mock.Chit) => setSeen((s) => ({ ...s, [c.id]: true })),
    markAllRead: () => setSeen(Object.fromEntries(inbox.map((c) => [c.id, true]))),
    sent, queue, chairInbox: mock.chairInbox, log, decide,
    stats: { delegations: mock.roster.delegations.length, waiting: queue.length, approved: log.filter((c) => c.status === 'delivered').length, rejected: log.filter((c) => c.status === 'rejected').length },
    toast, STATUS_LABEL: mock.STATUS_LABEL, ago: mock.ago,
  };
}

/* ------------------------------------------------------------------ live schedule */
// Which slot is "now" can't be known (dates TBA). Expose the day tab state only.
export function useDayTabs(initial = 1) {
  const [day, setDay] = useState(initial);
  return { day, setDay };
}
