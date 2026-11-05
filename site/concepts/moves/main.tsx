// DXB MUN 2027 · Motion moves: 8 live demos built only from installed packages, then the full catalogue.
// Every demo and card has a Like toggle (localStorage `moves.likes`); the picks bar reads them back in order.
import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import '@fontsource-variable/source-serif-4/opsz.css';
import '@fontsource-variable/source-serif-4/opsz-italic.css';
import '@fontsource-variable/public-sans';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './moves.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { moves, liveNames, type LiveId } from './moves';
import { LikeButton, STILL, clearLikes, useLikes } from './kit';
import { Scramble } from './Scramble';
import { GlobeDubai } from './GlobeDubai';
import { Clauses } from './Clauses';
import { PlateFlip } from './PlateFlip';
import { DuskSky } from './DuskSky';
import { PhotoDistort } from './PhotoDistort';
import { ViewNav } from './ViewNav';
import { Magnetic } from './Magnetic';

gsap.registerPlugin(ScrollTrigger);
document.documentElement.classList.add(STILL ? 'is-still' : 'is-motion');
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// Lenis on GSAP's ticker so every scrubbed scene reads the same scroll. Off for reduced motion and `?nolenis`.
let lenis: Lenis | null = null;
if (!STILL && !new URLSearchParams(location.search).has('nolenis')) {
  lenis = new Lenis({ autoRaf: false, lerp: 0.12 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const jump = (hash: string) => (e: React.MouseEvent) => {
  const el = document.querySelector(hash);
  if (!el) return;
  e.preventDefault();
  if (lenis) lenis.scrollTo(el as HTMLElement, { offset: -56 });
  else el.scrollIntoView({ behavior: STILL ? 'auto' : 'smooth' });
};

const nameOf = (id: string) => liveNames[id as LiveId] ?? moves.find((m) => m.id === id)?.name ?? id;

function TopBar() {
  return (
    <header className="top">
      <a className="top-brand" href="#top" onClick={jump('#top')}>DXB MUN 2027 <span>Motion moves</span></a>
      <nav aria-label="Page">
        <a href="#live" onClick={jump('#live')}>Live demos</a>
        <a href="#catalogue" onClick={jump('#catalogue')}>Catalogue</a>
      </nav>
    </header>
  );
}

function Intro() {
  return (
    <section id="top" className="intro">
      <p className="kicker">For the owner · tick what you like</p>
      <h1>{moves.length} motion moves. <em>Eight</em> proven live.</h1>
      <p className="lede">Clean pages, a few world-class moves. Every demo below runs on packages the site already has.</p>
      <ol className="intro-index" id="live">
        {Object.entries(liveNames).map(([id, n]) => (
          <li key={id}><a href={'#' + id} onClick={jump('#' + id)}>{n.replace(/^Live \d · /, '')}</a></li>
        ))}
      </ol>
    </section>
  );
}

function Catalogue() {
  return (
    <section id="catalogue" className="cat" aria-labelledby="cat-t">
      <header className="cat-head">
        <p className="kicker">The full catalogue</p>
        <h2 id="cat-t">{moves.length} moves, with licence and cost</h2>
        <p className="lede">Each is one specific effect. Links were opened on 5 November 2026.</p>
      </header>
      <ol className="cards">
        {moves.map((m, i) => (
          <li key={m.id} className="card" id={'move-' + m.id}>
            <div className="card-top">
              <span className="card-n">{String(i + 1).padStart(2, '0')}</span>
              {m.live && <a className="card-live" href={'#' + m.live} onClick={jump('#' + m.live)}>Live above ↑</a>}
              <span className={'card-inst inst-' + m.installed.replace(' ', '-')}>{m.installed === 'yes' ? 'Installed' : m.installed === 'native' ? 'Built into browsers' : 'Needs install'}</span>
            </div>
            <h3>{m.name}</h3>
            <p className="card-what">{m.what}</p>
            <dl className="card-facts">
              <div><dt>Where</dt><dd>{m.where}</dd></div>
              <div><dt>Licence</dt><dd>{m.licence}</dd></div>
              <div><dt>Uses</dt><dd>{m.uses}</dd></div>
              <div><dt>Phone cost</dt><dd>{m.phone}</dd></div>
              <div><dt>Clarity</dt><dd>{m.clarity}</dd></div>
            </dl>
            <p className="card-links">
              {m.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noopener">{s.label} ↗</a>)}
            </p>
            <LikeButton id={m.id} label={m.name} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function Picks() {
  const likes = useLikes();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = likes.map((id, i) => `${i + 1}. ${nameOf(id)}`).join('\n');
  const copy = async () => {
    try { await navigator.clipboard.writeText('My motion picks:\n' + text); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  };
  return (
    <aside className="picks" aria-label="Your picks" data-open={open}>
      <div className="picks-row">
        <button type="button" className="picks-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)} disabled={!likes.length}>
          Your picks <b>{likes.length}</b>
        </button>
        <p className="picks-line">{likes.length ? likes.map((id, i) => `${i + 1}. ${nameOf(id).replace(/^Live \d · /, '')}`).join('   ') : 'Nothing liked yet. Tap Like on any demo or card.'}</p>
        {likes.length > 0 && <button type="button" className="btn-line" onClick={copy}>{copied ? 'Copied' : 'Copy list'}</button>}
        {likes.length > 0 && <button type="button" className="btn-text" onClick={clearLikes}>Clear</button>}
      </div>
      {open && likes.length > 0 && (
        <ol className="picks-list">{likes.map((id) => <li key={id}>{nameOf(id)}</li>)}</ol>
      )}
    </aside>
  );
}

function App() {
  useEffect(() => {
    // Fonts change line breaks and heights: re-measure every trigger once they are in.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);
  return (
    <>
      <TopBar />
      <main>
        <Intro />
        <Scramble />
        <GlobeDubai />
        <Clauses />
        <PlateFlip />
        <DuskSky />
        <PhotoDistort />
        <ViewNav />
        <Magnetic />
        <Catalogue />
      </main>
      <footer className="foot">
        <p>DXB MUN 2027 · Indian High School · Diplomacy around us.</p>
        <p className="mono">Research page. Not the homepage. Libraries credited on each demo and card.</p>
      </footer>
      <Picks />
    </>
  );
}

// Read-only handle for shots.mjs: scroll a demo to a fraction of its scroll track.
(window as unknown as { __moves: unknown }).__moves = {
  at: (id: string, f: number) => {
    const el = document.getElementById(id);
    if (!el) return 0;
    const track = el.querySelector<HTMLElement>('.track') ?? el;
    const top = track.getBoundingClientRect().top + scrollY;
    const y = Math.round(top + Math.max(0, track.offsetHeight - innerHeight) * f);
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
    return y;
  },
};

createRoot(document.getElementById('root')!).render(<App />);
