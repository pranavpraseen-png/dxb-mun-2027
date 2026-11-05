import { useEffect, useRef, type RefObject } from 'react';
import { SCROLL_FEEL } from '@/shared/scroll';
import { DUBAI, dotPaths, graticule, project, toCobe, type Pose } from './geo';

export type Frame = { pose: Pose; reticle: number };
type Props = {
  /** 'scroll': progress comes from trackRef and a cobe/SVG globe is redrawn per frame. 'still': one static SVG frame. */
  mode: 'scroll' | 'still';
  trackRef?: RefObject<HTMLElement | null>;
  frameAt: (p: number, w: number, h: number, drift: number) => Frame;
  onFrame?: (p: number, f: Frame, w: number, h: number) => void;
  className?: string;
};

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
};

// Paper stage colours in cobe's 0..1 RGB (light globe): a paper sphere, navy-ink land dots, an IHS maroon marker.
const BASE: [number, number, number] = [0.97, 0.96, 0.93];
const MARKER: [number, number, number] = [0.5, 0.06, 0.06];
const BG: [number, number, number] = [0.965, 0.953, 0.925];

export default function Globe({ mode, trackRef, frameAt, onFrame, className }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<(SVGPathElement | null)[]>([]);
  const gratRef = useRef<SVGPathElement>(null);
  const dubaiRef = useRef<SVGPathElement>(null);
  const limbRef = useRef<SVGCircleElement>(null);
  const reticleRef = useRef<SVGGElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const frameAtRef = useRef(frameAt);
  const onFrameRef = useRef(onFrame);
  frameAtRef.current = frameAt;
  onFrameRef.current = onFrame;

  useEffect(() => {
    const stage = stageRef.current!;
    let w = stage.clientWidth, h = stage.clientHeight;
    let raf = 0, visible = true, alive = true;
    let globe: { update: (o: Record<string, unknown>) => void; destroy: () => void } | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let last = '';
    const t0 = performance.now();
    const useGL = mode === 'scroll' && hasWebGL();

    const progress = () => {
      const el = trackRef?.current;
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      const range = r.height - innerHeight;
      return range > 0 ? Math.min(1, Math.max(0, -r.top / range)) : 0;
    };

    // Scrub: the globe trails the scroll position and settles in about SCROLL_FEEL.scrub seconds,
    // the same weighted feel as a GSAP `scrub: 1.2` timeline.
    let ps = mode === 'scroll' ? progress() : 1;
    let lastT = performance.now();
    const tau = SCROLL_FEEL.scrub / 3;
    const draw = (force = false) => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastT) / 1000);
      lastT = now;
      if (mode === 'scroll') {
        const target = progress();
        ps += (target - ps) * (1 - Math.exp(-dt / tau));
        if (Math.abs(target - ps) < 1e-4) ps = target;
      }
      const p = ps;
      const drift = mode === 'scroll' ? ((performance.now() - t0) / 1000) * 2.4 : 0;
      const f = frameAtRef.current(p, w, h, drift);
      const { pose } = f;
      const key = `${pose.lon.toFixed(3)}|${pose.lat.toFixed(3)}|${pose.cx.toFixed(1)}|${pose.cy.toFixed(1)}|${pose.r.toFixed(1)}|${f.reticle.toFixed(3)}`;
      if (!force && key === last) return;
      last = key;
      if (globe) {
        const c = toCobe(pose, w, h);
        globe.update({ phi: c.phi, theta: c.theta, scale: c.scale, offset: c.offset });
      } else {
        const bands = dotPaths(pose, w, h);
        bands.forEach((d, i) => dotsRef.current[i]?.setAttribute('d', d));
      }
      // Overlay: limb, 30° graticule, Dubai's own parallel and meridian, the reticle.
      limbRef.current?.setAttribute('cx', pose.cx.toFixed(1));
      limbRef.current?.setAttribute('cy', pose.cy.toFixed(1));
      limbRef.current?.setAttribute('r', pose.r.toFixed(1));
      let g = '';
      for (let lat = -60; lat <= 60; lat += 30) g += graticule(pose, 'lat', lat);
      for (let lon = -180; lon < 180; lon += 30) g += graticule(pose, 'lon', lon);
      gratRef.current?.setAttribute('d', g);
      dubaiRef.current?.setAttribute('d', graticule(pose, 'lat', DUBAI.lat, 180) + graticule(pose, 'lon', DUBAI.lon, 180));
      const [x, y, z] = project(pose, DUBAI.lat, DUBAI.lon);
      if (reticleRef.current) {
        reticleRef.current.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        reticleRef.current.style.opacity = String(z > 0 ? f.reticle : 0);
      }
      onFrameRef.current?.(p, f, w, h);
    };

    const loop = () => {
      raf = 0;
      if (!alive) return;
      draw();
      if (visible) raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(() => {
      w = stage.clientWidth; h = stage.clientHeight;
      svgRef.current?.setAttribute('viewBox', `0 0 ${w} ${h}`);
      if (globe && canvas) globe.update({ width: w, height: h });
      draw(true);
    });
    ro.observe(stage);
    svgRef.current?.setAttribute('viewBox', `0 0 ${w} ${h}`);
    draw(true);

    let io: IntersectionObserver | null = null;
    if (mode === 'scroll') {
      io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      });
      io.observe(stage);
      raf = requestAnimationFrame(loop);
    }

    if (useGL) {
      import('cobe').then(({ default: createGlobe }) => {
        if (!alive || !hostRef.current) return;
        canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        canvas.className = 'globe-canvas';
        hostRef.current.appendChild(canvas);
        const small = w < 768;
        const c = toCobe(frameAtRef.current(ps, w, h, 0).pose, w, h);
        globe = createGlobe(canvas, {
          devicePixelRatio: Math.min(window.devicePixelRatio || 1, small ? 1.75 : 2),
          width: w, height: h,
          phi: c.phi, theta: c.theta, scale: c.scale, offset: c.offset,
          dark: 0, diffuse: 1.2, mapSamples: small ? 14000 : 20000, mapBrightness: 2.4, mapBaseBrightness: 0,
          baseColor: BASE, markerColor: MARKER, glowColor: BG,
          markers: [{ location: [DUBAI.lat, DUBAI.lon], size: 0.022 }],
          markerElevation: 0.004,
        }) as unknown as typeof globe;
        // Hide the SVG dots: cobe draws them now.
        dotsRef.current.forEach((el) => el?.setAttribute('d', ''));
        stage.dataset.renderer = 'webgl';
        requestAnimationFrame(() => canvas?.classList.add('is-on'));
        draw(true);
      }).catch(() => { stage.dataset.renderer = 'svg'; });
    } else {
      stage.dataset.renderer = 'svg';
    }

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
      globe?.destroy();
      // cobe wraps the canvas in its own div; remove whatever it added.
      if (hostRef.current) hostRef.current.replaceChildren();
    };
  }, [mode, trackRef]);

  return (
    <div ref={stageRef} className={'globe-stage ' + (className ?? '')} aria-hidden="true">
      <div ref={hostRef} className="globe-host" />
      <svg ref={svgRef} className="globe-svg" preserveAspectRatio="none">
        <circle ref={limbRef} className="g-disc" />
        <path ref={(el) => { dotsRef.current[0] = el; }} className="g-dots g-dots-0" />
        <path ref={(el) => { dotsRef.current[1] = el; }} className="g-dots g-dots-1" />
        <path ref={(el) => { dotsRef.current[2] = el; }} className="g-dots g-dots-2" />
        <path ref={gratRef} className="g-grat" />
        <path ref={dubaiRef} className="g-dubai" />
        <g ref={reticleRef} className="g-reticle" style={{ opacity: 0 }}>
          <circle r="5" className="g-ret-dot" />
          <circle r="22" className="g-ret-ring" />
          <path d="M-46 0H-30M30 0H46M0 -46V-30M0 30V46" className="g-ret-ticks" />
        </g>
      </svg>
    </div>
  );
}
