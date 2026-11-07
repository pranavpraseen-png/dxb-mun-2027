// Preview harness for Alt 4 opening + hero options B and C (spec: site/ALT4-FLOOR.md, "Options per part").
// ?show=opening-b|opening-c|hero-b|hero-c renders that one part full-page.
// - An opening runs, then a plain dark screen says "opening done". Add &under=hero-b|hero-c to put a hero under it.
// - A hero gets revealed=true after 300 ms; a placeholder #committees section follows so scrolling works.
// ?still renders the settled frame (the parts read isStill() themselves).
import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/jetbrains-mono';
import { OpeningB } from '../alt-4/parts/opening-b';
import { OpeningC } from '../alt-4/parts/opening-c';
import { HeroB } from '../alt-4/parts/hero-b';
import { HeroC } from '../alt-4/parts/hero-c';

const q = new URLSearchParams(location.search);
const show = q.get('show') ?? '';
const under = q.get('under') ?? '';
const root = document.documentElement;

function Hero({ which, revealed }: { which: string; revealed: boolean }) {
  return which === 'hero-c' ? <HeroC revealed={revealed} /> : <HeroB revealed={revealed} />;
}

function OpeningPage({ which }: { which: string }) {
  const [done, setDone] = useState(false);
  const onDone = () => { setDone(true); root.dataset.ohDone = '1'; };
  const O = which === 'opening-c' ? OpeningC : OpeningB;
  const withHero = under === 'hero-b' || under === 'hero-c';
  return (
    <>
      {!done && <O onDone={onDone} />}
      {withHero ? (
        <main><Hero which={under} revealed={done} /><Next /></main>
      ) : done ? (
        <div className="oh-done"><b>opening done</b><a href={location.href}>Replay</a></div>
      ) : null}
    </>
  );
}

function HeroPage({ which }: { which: string }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { const t = setTimeout(() => { setRevealed(true); root.dataset.ohRevealed = '1'; }, 300); return () => clearTimeout(t); }, []);
  return <main><Hero which={which} revealed={revealed} /><Next /></main>;
}

const Next = () => <section id="committees" className="oh-next"><span>#committees · the next section</span></section>;

function Index() {
  const parts = ['opening-b', 'opening-c', 'hero-b', 'hero-c'];
  return (
    <div className="oh-index">
      <span>Alt 4 · opening + hero, options B and C</span>
      <ul>{parts.map((p) => <li key={p}><a href={`?show=${p}`}>{p}</a> · <a href={`?show=${p}&still`}>still</a></li>)}</ul>
    </div>
  );
}

function App() {
  if (show.startsWith('opening-')) return <OpeningPage which={show} />;
  if (show.startsWith('hero-')) return <HeroPage which={show} />;
  return <Index />;
}

createRoot(document.getElementById('root')!).render(<App />);
