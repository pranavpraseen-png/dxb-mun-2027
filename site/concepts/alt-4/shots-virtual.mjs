// Virtual time for capture scripts (shots.mjs, video.mjs): injected with evaluateOnNewDocument.
// Virtual time: rAF, performance.now, Date.now and timers only move when __advance(ms) is called.
export const VIRTUAL = () => {
  let vt = 0; const start = Date.now(); const realNow = performance.now.bind(performance);
  let rid = 0; const raf = new Map(); let tid = 0; const timers = new Map();
  performance.now = () => vt; Date.now = () => start + vt;
  window.requestAnimationFrame = (cb) => { raf.set(++rid, cb); return rid; };
  window.cancelAnimationFrame = (id) => raf.delete(id);
  const rs = window.setTimeout.bind(window);
  window.setTimeout = (cb, ms = 0, ...a) => { timers.set(++tid, { at: vt + Math.max(0, ms), cb, a }); return tid; };
  window.clearTimeout = (id) => timers.delete(id);
  window.setInterval = (cb, ms = 0, ...a) => { const id = ++tid; const run = () => { timers.set(id, { at: vt + ms, cb: () => { run(); cb(...a); }, a: [] }); }; run(); return id; };
  window.clearInterval = (id) => timers.delete(id);
  window.__realTimeout = rs; window.__realNow = realNow;
  window.__advance = (ms) => {
    const end = vt + ms;
    for (;;) {
      let next = null;
      for (const [id, t] of timers) if (t.at <= end && (!next || t.at < next[1].at)) next = [id, t];
      if (!next) break;
      vt = Math.max(vt, next[1].at); timers.delete(next[0]);
      try { typeof next[1].cb === 'function' && next[1].cb(...next[1].a); } catch (e) { console.error(e); }
    }
    vt = end;
    const q = [...raf.values()]; raf.clear();
    for (const cb of q) { try { cb(vt); } catch (e) { console.error(e); } }
  };
};

