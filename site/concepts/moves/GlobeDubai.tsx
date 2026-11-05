// Live 02 · A sticky scene inside a tall track: ScrollTrigger scrubs one timeline that turns the cobe globe to Dubai,
// zooms in, then brings up a hairline reticle. cobe has no render loop of its own, so it only draws when the
// timeline updates: off screen it costs nothing.
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Demo, NARROW, STILL } from './kit';

gsap.registerPlugin(ScrollTrigger);

const DUBAI = { lat: 25.2048, lon: 55.2708 };
const RAD = Math.PI / 180;
// Dusk tokens in cobe's 0..1 RGB.
const BASE: [number, number, number] = [0.16, 0.255, 0.294]; // line #28414b
const MARKER: [number, number, number] = [0.867, 0.537, 0.392]; // accent #dd8964
const GROUND: [number, number, number] = [0.02, 0.086, 0.114]; // #05161d, used as glow so no glow shows

const CLAUSES = [
  { verb: 'Turns', rest: 'toward Dubai,' },
  { verb: 'Convenes', rest: 'DXB MUN 2027,' },
  { verb: 'Hosted by', rest: 'Indian High School.' },
];

export function GlobeDubai() {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const reticle = useRef<HTMLDivElement>(null);
  const caps = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const el = stage.current!;
    let w = el.clientWidth, h = el.clientHeight;
    const fit = () => Math.min(1, w / h / 0.9);
    const s = { lon: -38, lat: 8, zoom: 0, ret: 0 };
    let globe: { update: (o: Record<string, unknown>) => void; destroy: () => void } | null = null;
    let alive = true;
    const pose = () => {
      const scale = (0.62 + s.zoom * 1.9) * fit();
      return { phi: 1.5 * Math.PI - s.lon * RAD, theta: s.lat * RAD, scale };
    };
    const render = () => {
      globe?.update(pose());
      if (reticle.current) reticle.current.style.opacity = String(s.ret);
    };

    // Captions: each clause rises out of its own clip in its third of the scene.
    const capTl = (tl: gsap.core.Timeline) => {
      caps.current.forEach((c, k) => {
        if (!c) return;
        if (k > 0) tl.fromTo(c, { yPercent: 110 }, { yPercent: 0, duration: 0.12, ease: 'power3.out' }, k * 0.33);
        if (k < CLAUSES.length - 1) tl.to(c, { yPercent: -110, duration: 0.1, ease: 'power2.in' }, k * 0.33 + 0.25);
      });
    };

    let tl: gsap.core.Timeline | null = null;
    if (STILL) {
      Object.assign(s, { lon: DUBAI.lon, lat: DUBAI.lat, zoom: 1, ret: 1 });
    } else {
      tl = gsap.timeline({ defaults: { ease: 'none' }, onUpdate: render, scrollTrigger: { trigger: track.current, start: 'top top', end: 'bottom bottom', scrub: 1 } });
      tl.to(s, { lon: DUBAI.lon, lat: DUBAI.lat, duration: 0.6, ease: 'power2.inOut' }, 0)
        .to(s, { zoom: 1, duration: 0.35, ease: 'power2.in' }, 0.55)
        .to(s, { ret: 1, duration: 0.08 }, 0.9);
      capTl(tl);
    }

    import('cobe').then(({ default: createGlobe }) => {
      if (!alive || !host.current) return;
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.className = 'globe-canvas';
      host.current.appendChild(canvas);
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: w, height: h, ...pose(),
        dark: 1, diffuse: 1.1, mapSamples: NARROW ? 12000 : 20000, mapBrightness: 4.2, mapBaseBrightness: 0.03,
        baseColor: BASE, markerColor: MARKER, glowColor: GROUND,
        markers: [{ location: [DUBAI.lat, DUBAI.lon], size: 0.03 }],
      }) as unknown as typeof globe;
      render();
    }).catch(() => { el.dataset.gl = 'off'; });

    const ro = new ResizeObserver(() => {
      w = el.clientWidth; h = el.clientHeight;
      globe?.update({ width: w, height: h, ...pose() });
    });
    ro.observe(el);

    return () => {
      alive = false;
      tl?.scrollTrigger?.kill(); tl?.kill();
      ro.disconnect();
      globe?.destroy();
      host.current?.replaceChildren();
    };
  }, []);

  return (
    <Demo id="demo-globe" n={2} className="is-track" likeLabel="Globe flies to Dubai"
      title="The globe flies to Dubai"
      caption="A pinned scene. Scroll turns the world, zooms to Dubai, and sets the reticle."
      credit={[{ label: 'cobe', url: 'https://cobe.vercel.app/' }, { label: 'GSAP ScrollTrigger', url: 'https://gsap.com/docs/v3/Plugins/ScrollTrigger/' }]}>
      <div ref={track} className="track track-globe">
        <div ref={stage} className="sticky globe-stage">
          <div ref={host} className="globe-host" />
          <div ref={reticle} className="ret" style={{ opacity: STILL ? 1 : 0 }}>
            <svg className="reticle" viewBox="0 0 200 200" aria-hidden="true">
              <path d="M40 64V40h24M136 40h24v24M160 136v24h-24M64 160H40v-24" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <path d="M100 88v-8M100 112v8M88 100h-8M112 100h8" fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </svg>
            <p className="globe-coord"><span>Dubai</span><span>25.20° N · 55.27° E</span></p>
          </div>
          <p className="globe-clauses">
            {CLAUSES.map((c, k) => (
              <span className="clip-line" key={c.verb}>
                <span ref={(n) => { caps.current[k] = n; }} className="clip-in" style={STILL && k < CLAUSES.length - 1 ? { display: 'none' } : undefined}>
                  <em>{c.verb}</em> {c.rest}
                </span>
              </span>
            ))}
          </p>
        </div>
      </div>
    </Demo>
  );
}
