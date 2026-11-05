import { Fragment, useCallback, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { committees, conference, heroPhoto, stats, tba } from '@/data/conference';
import { useStill } from '@/shared/hooks';
import { SCROLL_FEEL, scrollToSection } from '@/shared/scroll';
import Globe, { type Frame } from './Globe';
import { DUBAI, easeInOut, formatLat, formatLon, lerp, project, seg } from './geo';
import { DubaiClock, NAV_H, Ticker } from './ui';
import { Button } from '../../portal/ui/coss/button';
import { Badge } from '../../portal/ui/coss/badge';

// coss Badge themed as a programme tag: Archivo caps, 15px, maroon-ground fill, a faint cream edge.
const TAG = 'lt-teaser h-auto sm:h-auto px-2.5 py-1 font-sans text-[15px] sm:text-[15px] font-semibold uppercase tracking-[0.08em] text-g5 bg-background dark:bg-background border-cream/45';
const clsxTag = (c: string) => TAG.replace('lt-teaser', c) + ' gap-2.5';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/*
  The opening is ONE pinned broadcast, scrubbed by scroll (track = 100svh + EXTRA viewports of scroll):
    A  0.00–0.27  title card: the blue and white sweeps cross, the "DXB MUN" card is pushed off,
                  six navy slabs peel away and the photo opens; the lower-third keys on.
    B  0.27–0.36  hold on the photo.
    C  0.36–0.46  cut: a navy band with a UN-blue edge wipes across; behind it the photo hands off to the globe.
    D  0.40–0.97  the globe turns, tilts and zooms to Dubai while the facts ink in as a draft resolution.
*/
const EXTRA = 2; // viewports of scroll the pin adds
const vp = (v: number) => v / EXTRA; // p-span of v viewports of scroll
const A = vp(0.6) / 1.12; // the original Live wipe ran 1.12 timeline units; scale it to 60% of a viewport
const SLABS = 6;
const G0 = 0.4, G1 = 0.97; // globe flight

/* ------------------------------------------------------------------ facts as a draft resolution */
type Clause = { verb: string; fact: string; note: string; op?: boolean; href?: string; host?: boolean };
const first = committees[0], last = committees[committees.length - 1];
const clauses: Clause[] = [
  { verb: 'Hosted by', fact: conference.host, note: `In ${conference.city}.`, host: true },
  { verb: 'Guided by', fact: conference.motto, note: 'The motto of the conference.' },
  { op: true, verb: 'Convenes', fact: `${committees.length} committees`, note: `From ${first.abbr} to ${last.abbr}, each one on a nameplate below.` },
  { op: true, verb: 'Meets for', fact: `${stats[1].value} days · ${stats[2].value} sessions`, note: 'Every day’s timings are in the schedule.' },
  { op: true, verb: 'Dates', fact: tba(conference.dates), note: `Venue: ${tba(conference.venue).toLowerCase()}.` },
  { op: true, verb: 'Invites you to', fact: 'Explore committees', note: 'Pick a nameplate to read its full name.', href: '#committees' },
];

const tickerItems = [
  conference.motto,
  `${stats[0].value} committees`,
  `${stats[1].value} days`,
  `${stats[2].value} committee sessions`,
  `Hosted by ${conference.host}`,
  `Dates: ${tba(conference.dates)}`,
  `Venue: ${tba(conference.venue)}`,
  ...committees.map((c) => c.abbr),
];

const Words = ({ text }: { text: string }) => (
  <>
    {text.split(' ').map((w, i) => (
      <Fragment key={i}>{i > 0 && ' '}<span className="w">{w}</span></Fragment>
    ))}
  </>
);

const go = (id: string) => (e: React.MouseEvent) => { e.preventDefault(); scrollToSection(id, NAV_H); };

function Resolution({ still }: { still: boolean }) {
  let n = 0;
  return (
    <section id={still ? 'about' : undefined} className="res" aria-labelledby="res-h">
      <p className="res-kicker" data-ink><span className="w">Draft resolution</span> <span className="w">·</span> <span className="w">{conference.edition}</span></p>
      <h2 id="res-h" className="res-h" data-ink><Words text={`A ${conference.kind} in ${conference.city}`} /></h2>
      <div className="clauses-wrap">
      <span className="reading-rule" aria-hidden="true"><i /></span>
      <ol className="clauses">
        {clauses.map((c) => (
          <li key={c.verb} className={'clause' + (c.op ? ' clause--op' : ' clause--pre') + (c.host ? ' clause--host' : '')} data-clause>
            <span className="cl-no" aria-hidden="true">{c.op ? `${++n}.` : ''}</span>
            <p className="cl-main">
              <span className="cl-block" aria-hidden="true" />
              <em className="cl-verb"><span className="w">{c.verb}</span></em>{' '}
              {c.href ? (
                <a className="cl-fact cl-fact--link" href={c.href} onClick={go('committees')}><Words text={c.fact} /><span className="w cl-arrow" aria-hidden="true">{' →'}</span></a>
              ) : (
                <strong className="cl-fact"><Words text={c.fact} /></strong>
              )}
            </p>
            <p className="cl-note">{c.note}</p>
          </li>
        ))}
      </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ globe poses */
const wide = (w: number) => w >= 1024;
function startPose(w: number, h: number) {
  return wide(w)
    ? { cx: w * 0.73, cy: h * 0.53, r: Math.min(h * 0.4, w * 0.25) }
    : { cx: w * 0.5, cy: h * 0.3, r: Math.min(w * 0.46, h * 0.2) };
}
function endPose(w: number, h: number) {
  return wide(w) ? { cx: w * 0.74, cy: h * 0.48, r: Math.max(w, h) * 0.62 } : { cx: w * 0.5, cy: h * 0.22, r: h * 0.6 };
}
const SPIN = 385;
const flight = (raw: number, w: number, h: number, drift: number): Frame => {
  const g = seg(raw, G0, G1);
  const a = startPose(w, h), b = endPose(w, h);
  const move = easeInOut(seg(g, 0.02, 0.55));
  const zoom = easeInOut(seg(g, 0.3, 0.97));
  const spin = easeInOut(seg(g, 0, 0.9));
  const idle = raw < G0 - 0.12 ? 0 : 1 - seg(g, 0, 0.25); // idle turn only while the globe is on screen
  return {
    pose: {
      lon: DUBAI.lon - SPIN * (1 - spin) - (drift % 360) * idle,
      lat: lerp(14, DUBAI.lat, spin),
      cx: lerp(a.cx, b.cx, move),
      cy: lerp(a.cy, b.cy, move),
      r: a.r * Math.pow(b.r / a.r, zoom),
    },
    reticle: seg(g, 0.9, 0.98),
  };
};
const landed = (_p: number, w: number, h: number): Frame => {
  const m = !wide(w);
  return { pose: { lon: DUBAI.lon, lat: DUBAI.lat, cx: w * 0.5, cy: m ? h * 0.5 : h * 0.5, r: m ? Math.min(w * 0.6, h * 0.62) : Math.min(h * 0.46, w * 0.42) }, reticle: 1 };
};

/* ------------------------------------------------------------------ the opening */
export function Opening() {
  const still = useStill();
  const track = useRef<HTMLElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);

  const onFrame = useCallback((p: number, f: Frame, w: number, h: number) => {
    const el = hudRef.current;
    if (el) {
      const z = f.pose.r / startPose(w, h).r;
      el.querySelector('[data-k=lat]')!.textContent = formatLat(f.pose.lat);
      el.querySelector('[data-k=lon]')!.textContent = formatLon(f.pose.lon);
      el.querySelector('[data-k=zoom]')!.textContent = z.toFixed(2) + '×';
      (el.querySelector('[data-k=bar]') as HTMLElement).style.transform = `scaleX(${seg(p, G0, G1).toFixed(4)})`;
    }
    const tag = tagRef.current;
    if (tag) {
      const [x, y, z] = project(f.pose, DUBAI.lat, DUBAI.lon);
      const left = !wide(w) && x > w * 0.55;
      tag.style.transform = `translate(${(left ? x - 34 - tag.offsetWidth : x + 34).toFixed(1)}px, ${(y - tag.offsetHeight / 2).toFixed(1)}px)`;
      tag.style.opacity = String(z > 0 ? f.reticle : 0);
    }
  }, []);

  useGSAP(
    () => {
      if (still) return;
      const q = gsap.utils.selector(track);
      const W = () => window.innerWidth;
      gsap.set(q('.slab, .sweep, .cut'), { skewX: -14 });

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: track.current, start: 'top top', end: 'bottom bottom', scrub: SCROLL_FEEL.scrub, invalidateOnRefresh: true },
      });
      tl.to({}, { duration: 1 }, 0); // timeline positions read as scroll progress p (0..1)

      /* A: the original Live title card wipe */
      tl.to(q('.intro-cue'), { opacity: 0, duration: 0.04 * A }, 0)
        .fromTo(q('.sweep--un'), { x: () => -W() * 0.7 }, { x: () => W() * 1.25, duration: 0.4 * A }, 0.02 * A)
        .fromTo(q('.sweep--white'), { x: () => -W() * 0.5 }, { x: () => W() * 1.3, duration: 0.4 * A }, 0.07 * A)
        .to(q('.ident'), { x: () => W() * 3, duration: 0.24 * A, ease: 'power2.in' }, 0.1 * A)
        .fromTo(q('.intro-photo'), { scale: 1.18 }, { scale: 1, duration: 0.62 * A, ease: 'power1.out' }, 0.1 * A);
      q('.slab').forEach((el, i) => {
        tl.to(el, { yPercent: i % 2 ? 112 : -112, duration: 0.26 * A, ease: 'power2.inOut' }, (0.16 + i * 0.05) * A);
      });
      q('.lt-row--key').forEach((el, i) => {
        tl.fromTo(el, { xPercent: -104, x: 0 }, { xPercent: 0, duration: 0.17 * A, ease: 'power3.out' }, (0.52 + i * 0.06) * A);
      });

      /* C: cut from the photo to the globe */
      tl.to(q('.lower-third'), { xPercent: -112, duration: 0.06, ease: 'power2.in' }, 0.34)
        .fromTo(q('.cut'), { x: () => -W() * 1.7 }, { x: 0, duration: 0.05, ease: 'power1.in' }, 0.36)
        .set(q('.layer--photo'), { opacity: 0 }, 0.41)
        .set(q('.layer--globe'), { opacity: 1 }, 0.41)
        .to(q('.cut'), { x: () => W() * 1.7, duration: 0.05, ease: 'power1.out' }, 0.41);

      /* D: the resolution panel keys on and every clause inks in, word by word */
      const mm = gsap.matchMedia();
      mm.add({ wide: '(min-width: 1024px)', narrow: '(max-width: 1023.98px)' }, (ctx) => {
        const { wide: isWide } = ctx.conditions as { wide: boolean };
        tl.fromTo(q('.res'), isWide ? { xPercent: -104, yPercent: 0, x: 0, y: 0 } : { yPercent: 104, xPercent: 0, x: 0, y: 0 }, { xPercent: 0, yPercent: 0, duration: 0.05, ease: 'power3.out' }, 0.42);
      });
      tl.fromTo(q('[data-ink] .w'), { opacity: 0.14 }, { opacity: 1, duration: 0.03, stagger: 0.006 }, 0.44);
      q('[data-clause]').forEach((cl, i) => {
        const at = 0.46 + i * 0.045;
        const span = vp(0.6);
        const no = cl.querySelector('.cl-no');
        if (no) tl.fromTo(no, { opacity: 0 }, { opacity: 1, duration: span * 0.3 }, at);
        // Kinetic clauses as colour blocks (after WEIMA and Mat Voyce): a cream block keys across the line; the fact is behind it.
        const words = cl.querySelectorAll('.w');
        const blk = cl.querySelector('.cl-block');
        const half = span * 0.22;
        tl.fromTo(blk, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: half, ease: 'power2.in', immediateRender: false }, at)
          .fromTo(words, { opacity: 0 }, { opacity: 1, duration: 0.0001, immediateRender: true }, at + half)
          .set(blk, { transformOrigin: '100% 50%' }, at + half)
          .to(blk, { scaleX: 0, duration: half, ease: 'power2.out' }, at + half);
        tl.fromTo(cl.querySelector('.cl-note'), { opacity: 0.14 }, { opacity: 1, duration: span * 0.25 }, at + span * 0.7);
      });
      tl.fromTo(q('.reading-rule i'), { scaleY: 0 }, { scaleY: 1, duration: 0.5 }, 0.46);
      tl.fromTo(q('.hud'), { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.44);
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
    },
    { scope: track, dependencies: [still] },
  );

  const where = (
    <>
      <div ref={tagRef} className="where-tag" aria-hidden="true" style={still ? undefined : { opacity: 0 }}>
        <span className="where-k">Dubai</span>
        <DubaiClock label={false} />
        <span className="where-c">{formatLat(DUBAI.lat)} · {formatLon(DUBAI.lon)}</span>
      </div>
    </>
  );

  const lowerThird = (
    <div className="lower-third">
      <div className="lt-head">
        {!still && (
          <h1 id="intro-title" className="ident">
            <span className="ident-title"><span>DXB</span> <span>MUN</span></span>{' '}
            <span className="ident-sub"><span className="ident-year">{conference.year}</span> <span className="ident-kind">{conference.kind}</span></span>
          </h1>
        )}
        <div className="lt-row lt-row--title lt-row--key">
          {still ? <h1 id="intro-title">{conference.edition}</h1> : <p aria-hidden="true">{conference.edition}</p>}
        </div>
        <div className="lt-row lt-row--sub lt-row--key">
          <p>{conference.kind}, {conference.city}</p>
        </div>
      </div>
      <div className="lt-row lt-row--desc">
        <p className="lt-desc">A {conference.kind} conference in {conference.city}, hosted by {conference.host}.</p>
        <p className="lt-when">
          <span>Dates: {tba(conference.dates)}</span>
          <span>Venue: {tba(conference.venue)}</span>
        </p>
      </div>
      <div className="lt-row lt-row--cta">
        <Button size="xl" className="lt-cta" render={<a href="#committees" onClick={go('committees')} />}>Explore committees</Button>
        <Badge variant="outline" size="lg" className={TAG}>{committees.length} committees, {stats[1].value} days</Badge>
      </div>
    </div>
  );

  if (still) {
    return (
      <>
        <section id="home" className="opening is-static" aria-labelledby="intro-title">
          <div className="stage">
            <div className="layer layer--photo">
              <img className="intro-photo" src={heroPhoto.src} width={heroPhoto.width} height={heroPhoto.height} alt={heroPhoto.alt} fetchPriority="high" />
            </div>
            <Badge variant="outline" size="lg" className={clsxTag("bug")} render={<p />}><span className="bug-dot" aria-hidden="true" />{conference.edition}</Badge>
            {lowerThird}
            <Ticker items={tickerItems} label="Conference ticker" />
          </div>
        </section>
        <div className="where is-static">
          <div className="where-globe">
            <Globe mode="still" frameAt={landed} className="where-svg" />
            {where}
          </div>
          <Resolution still />
        </div>
      </>
    );
  }

  return (
    <section ref={track} id="home" className="opening" aria-labelledby="intro-title">
      {/* Nav anchors: "About" lands where the resolution has fully inked; the spy lights it as the panel arrives. */}
      <span id="about" className="anchor anchor--about" aria-hidden="true" />
      <span data-spy="about" className="anchor anchor--spy" aria-hidden="true" />
      <div className="stage">
        <div className="layer layer--photo">
          <img className="intro-photo" src={heroPhoto.src} width={heroPhoto.width} height={heroPhoto.height} alt={heroPhoto.alt} fetchPriority="high" />
        </div>
        <div className="layer layer--globe">
          <Globe mode="scroll" trackRef={track} frameAt={flight} onFrame={onFrame} className="opening-globe" />
          {where}
          <div ref={hudRef} className="hud" aria-hidden="true">
            <span className="hud-k">Target</span><span className="hud-v hud-acc">Dubai</span>
            <span className="hud-k">Lat</span><span className="hud-v" data-k="lat">{formatLat(DUBAI.lat)}</span>
            <span className="hud-k">Lon</span><span className="hud-v" data-k="lon">{formatLon(DUBAI.lon)}</span>
            <span className="hud-k">Zoom</span><span className="hud-v" data-k="zoom">1.00×</span>
            <span className="hud-bar"><i data-k="bar" /></span>
          </div>
        </div>

        <div className="wipes" aria-hidden="true">
          {Array.from({ length: SLABS }, (_, i) => (
            <span key={i} className="slab" style={{ ['--i' as string]: i }} />
          ))}
          <span className="sweep sweep--un" />
          <span className="sweep sweep--white" />
          <p className="intro-cue">Scroll to open</p>
        </div>

        <Badge variant="outline" size="lg" className={clsxTag("bug")} render={<p />}><span className="bug-dot" aria-hidden="true" />{conference.edition}</Badge>
        {lowerThird}
        <span className="cut" aria-hidden="true" />
        <Resolution still={false} />
        <Ticker items={tickerItems} label="Conference ticker" />
      </div>
    </section>
  );
}
