// NAME: Command palette
// IDEA: A quiet bar with one "Go to…" field; press /, Ctrl+K or tap it and a palette searches every section, all 19 committees and the portal.
// WHY: Recall beats recognition for people who know what they want (a committee name), and one target is the easiest Fitts's-law hit on any screen.
// WILD: Voice point of order: hold the space bar and say "Security Council" or "schedule" and the floor jumps there, chaired by the palette.
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Autocomplete } from '@base-ui/react/autocomplete';
import { committees, conference } from '@/data/conference';
import { getLenis, scrollToSection } from '@/shared/scroll';
import { NAV_H, SECTIONS } from '../layout';
import { portal, register, signIn } from '../links';
import './nav-c.css';

const LINKS = SECTIONS.filter((s) => s.id !== 'home');
const pad2 = (n: number) => String(n).padStart(2, '0');

type Item = { value: string; label: string; code: string; hint: string; kind: 'section' | 'committee' | 'link'; target: string; also?: string };
type Group = { value: string; items: Item[] };

const GROUPS: Group[] = [
  {
    value: 'Sections',
    items: SECTIONS.map((s, i) => ({
      value: 's-' + s.id, label: s.label, code: i === 0 ? '00' : pad2(i), hint: 'Section', kind: 'section' as const, target: s.id,
    })),
  },
  {
    value: 'Committees',
    items: committees.map((c) => ({
      value: 'c-' + c.abbr, label: c.name, code: c.abbr, hint: 'Committee', kind: 'committee' as const, target: 'committees', also: c.abbr,
    })),
  },
  {
    value: 'Open',
    items: [
      { value: 'l-portal', label: 'Portal', code: '↗', hint: 'Delegate dashboard', kind: 'link' as const, target: portal },
      { value: 'l-register', label: 'Register', code: '↗', hint: 'Sign up', kind: 'link' as const, target: register },
      { value: 'l-signin', label: 'Sign in', code: '↗', hint: 'Portal', kind: 'link' as const, target: signIn },
    ],
  },
];

/** Where the query sits in a text: a contiguous run first (start of text, then start of a word, then anywhere), else every letter in order. */
function locate(text: string, q: string): { score: number; hits: number[] } | null {
  const t = text.toLowerCase();
  const query = q.toLowerCase().trim();
  if (!query) return { score: 1, hits: [] };
  const run = (at: number) => Array.from({ length: query.length }, (_, i) => at + i);
  if (t === query) return { score: 100, hits: run(0) };
  if (t.startsWith(query)) return { score: 80, hits: run(0) };
  let word = -1;
  for (let i = t.indexOf(query, 1); i > 0; i = t.indexOf(query, i + 1)) {
    if (!/[a-z0-9]/.test(t[i - 1])) { word = i; break; }
  }
  if (word > 0) return { score: 55, hits: run(word) };
  const any = t.indexOf(query);
  if (any >= 0) return { score: 40, hits: run(any) };
  const flat = query.replace(/\s+/g, '');
  if (flat.length < 2) return null;
  const hits: number[] = [];
  let from = 0;
  for (const ch of flat) {
    const at = t.indexOf(ch, from);
    if (at < 0) return null;
    hits.push(at);
    from = at + 1;
  }
  // a tight subsequence (letters close together) beats a scattered one
  return { score: Math.max(2, 20 - (hits[hits.length - 1] - hits[0] - hits.length)), hits };
}
const score = (item: Item, q: string) => {
  const a = locate(item.label, q)?.score ?? 0;
  const b = item.also ? (locate(item.also, q)?.score ?? 0) + 1 : 0; // an abbreviation hit edges out the same hit in the name
  return Math.max(a, b);
};

function Marked({ text, q }: { text: string; q: string }) {
  const found = q.trim() ? locate(text, q) : null;
  if (!found || !found.hits.length) return <>{text}</>;
  const set = new Set(found.hits);
  const out: ReactNode[] = [];
  let run = '';
  let runOn = false;
  const flush = (i: number) => { if (run) out.push(runOn ? <mark key={i}>{run}</mark> : run); run = ''; };
  [...text].forEach((ch, i) => {
    const on = set.has(i);
    if (on !== runOn) { flush(i); runOn = on; }
    run += ch;
  });
  flush(text.length);
  return <>{out}</>;
}

/** The section under the reading line, '' in the hero. */
function useActive() {
  const [active, setActive] = useState('');
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const line = NAV_H + innerHeight * 0.3;
      let cur = '';
      for (const s of LINKS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) cur = s.id;
      }
      if (cur && innerHeight + scrollY >= document.documentElement.scrollHeight - 2) cur = LINKS[LINKS.length - 1].id;
      setActive(cur);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', on);
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
  return active;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export function NavC({ visible, demo = false }: { visible: boolean; demo?: boolean }) {
  const active = useActive();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const pending = useRef<Item | null>(null);
  const bar = useRef<HTMLElement>(null);
  const [box, setBox] = useState<HTMLElement | null>(null);
  const activeIdx = LINKS.findIndex((s) => s.id === active);

  useEffect(() => { if (demo && bar.current) setBox(bar.current.parentElement); }, [demo]);

  // "/" or Ctrl/Cmd+K opens the palette, unless the visitor is typing somewhere else.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setOpen((o) => !o); return; }
      if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); setOpen(true); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [visible]);

  // Narrow screens get a bottom sheet (thumb reach); wide ones a full-width panel that drops from the bar.
  // Read at render time: opening re-renders, so the value is fresh for the frame the palette appears.
  const sheet = (demo && box ? box.clientWidth : typeof innerWidth === 'number' ? innerWidth : 1440) < 640;

  useEffect(() => {
    if (demo) return;
    const l = getLenis();
    if (open) l?.stop(); else l?.start();
  }, [open, demo]);

  const run = (item: Item) => {
    if (item.kind === 'link') { location.href = item.target; return; }
    scrollToSection(item.target, NAV_H);
    history.replaceState(null, '', '#' + item.target);
    // A committees part may listen and open this one; nothing breaks if none does.
    if (item.kind === 'committee') window.dispatchEvent(new CustomEvent('floor:committee', { detail: item.also }));
  };
  const pick = (item: Item) => { pending.current = item; setOpen(false); };
  const closed = (isOpen: boolean) => {
    if (isOpen) return;
    setQ('');
    const item = pending.current;
    pending.current = null;
    if (!item) return;
    getLenis()?.start();
    requestAnimationFrame(() => run(item));
  };
  const home = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); run(GROUPS[0].items[0]); };

  // Ranked results: each group keeps only its matches, best first; empty groups drop out.
  const filtered = useMemo(() => {
    if (!q.trim()) return GROUPS;
    return GROUPS.map((g) => ({
      value: g.value,
      items: g.items.map((i) => ({ i, s: score(i, q) })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s).map((x) => x.i),
    })).filter((g) => g.items.length);
  }, [q]);
  const count = filtered.reduce((n, g) => n + g.items.length, 0);

  return (
    <header ref={bar} className={'navc' + (visible ? ' is-in' : '') + (demo ? ' is-demo' : '')}
      aria-hidden={visible ? undefined : 'true'} inert={!visible}>
      <div className="navc-in">
        <a className="navc-home" href="#home" onClick={home} aria-label={conference.edition + ', back to the top'}>
          <b>DXB MUN</b><span>27</span>
        </a>

        <Dialog.Root open={open} onOpenChange={setOpen} onOpenChangeComplete={closed} modal={demo ? 'trap-focus' : true}>
          <Dialog.Trigger className="navc-go" aria-label="Go to a section or committee" aria-keyshortcuts="/ Control+K">
            <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" /><path d="m11 11 3.5 3.5" /></svg>
            <span className="navc-go-t">Go to…</span>
            <span className="navc-where" aria-hidden="true">
              {activeIdx >= 0 ? <><b>{pad2(activeIdx + 1)}</b> {LINKS[activeIdx].label}</> : 'Sections, committees, portal'}
            </span>
            <span className="navc-keys" aria-hidden="true"><kbd>/</kbd><kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd></span>
          </Dialog.Trigger>

          <Dialog.Portal container={demo ? box : undefined}>
            <Dialog.Backdrop className={'navc-back' + (demo ? ' is-demo' : '')} />
            <Dialog.Popup className={'navc-pal' + (demo ? ' is-demo' : '') + (sheet ? ' is-sheet' : '')} aria-label="Go to">
              <Autocomplete.Root open inline items={GROUPS} value={q} onValueChange={(v) => setQ(v)}
                filter={null} filteredItems={filtered} autoHighlight="always" keepHighlight
                itemToStringValue={(i: Item) => i.label}>
                <div className="navc-pal-top">
                  <span className="navc-pal-k" aria-hidden="true">Go to</span>
                  <Autocomplete.Input className="navc-input" aria-label="Search sections, committees and links"
                    placeholder="Type a section or committee, e.g. unsc" spellCheck={false} autoComplete="off" />
                  <Dialog.Close className="navc-esc" aria-label="Close"><kbd>Esc</kbd><span className="navc-close-t">Close</span></Dialog.Close>
                </div>
                <div className="navc-list-wrap">
                  <Autocomplete.Empty>
                    <p className="navc-empty">Nothing matches “{q}”. Try a committee abbreviation, like WHO.</p>
                  </Autocomplete.Empty>
                  <Autocomplete.List className="navc-list">
                    {(group: Group) => (
                      <Autocomplete.Group key={group.value} items={group.items} className="navc-group">
                        <Autocomplete.GroupLabel className="navc-glabel">{group.value}</Autocomplete.GroupLabel>
                        <Autocomplete.Collection>
                          {(item: Item) => (
                            <Autocomplete.Item key={item.value} value={item} onClick={() => pick(item)}
                              className={'navc-item' + (item.target === active && item.kind === 'section' ? ' is-here' : '')}>
                              <span className="navc-code">{item.kind === 'committee' ? <Marked text={item.code} q={q} /> : item.code}</span>
                              <span className="navc-label"><Marked text={item.label} q={q} /></span>
                              <span className="navc-hint">{item.target === active && item.kind === 'section' ? 'You are here' : item.hint}</span>
                            </Autocomplete.Item>
                          )}
                        </Autocomplete.Collection>
                      </Autocomplete.Group>
                    )}
                  </Autocomplete.List>
                </div>
                <div className="navc-foot" aria-hidden="true">
                  <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
                  <span><kbd>Enter</kbd> go</span>
                  <span><kbd>Esc</kbd> close</span>
                  <span className="navc-count">{count} {count === 1 ? 'result' : 'results'}</span>
                </div>
              </Autocomplete.Root>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        <a className="navc-portal" href={portal}>Portal</a>
        <a className="navc-reg" href={register}>Register</a>
      </div>
    </header>
  );
}
