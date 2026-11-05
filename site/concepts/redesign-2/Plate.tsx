import { useEffect, useRef, type RefObject } from 'react';
import { SCROLL_FEEL } from '@/shared/scroll';
import { DUBAI, dotPaths, easeInOut, formatLat, formatLon, graticule, lerp, project, seg, type Pose } from './geo';
import { DubaiClock } from './ui';

/*
  Fig. 1: a sparse dot globe drawn in vector on a flat Dusk surface plate.
  Scroll progress through `trackRef` turns it from the Atlantic to Dubai and zooms in about 8×.
  The caption sets the live centre coordinates like a figure caption, ending on Dubai's.
  Clarity pass: the Paper Shaders PaperTexture ground (fibre and crumple noise) was removed; the plate is pure SVG,
  so it is sharp at any pixel ratio and there is no canvas to size.
*/
type Props = { trackRef: RefObject<HTMLElement | null>; still: boolean };

/** Pose at progress p (0..1) for a plate of w×h px. */
export function poseAt(p: number, w: number, h: number): Pose {
  const S = Math.min(w, h);
  const turn = easeInOut(seg(p, 0, 0.8));
  const zoom = easeInOut(seg(p, 0.3, 1));
  return {
    lon: lerp(-38, DUBAI.lon, turn),
    lat: lerp(6, DUBAI.lat, turn),
    cx: w / 2,
    cy: h / 2,
    r: S * 0.4 * Math.pow(4.4, zoom),
  };
}

export function Plate({ trackRef, still }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const discRef = useRef<SVGCircleElement>(null);
  const dotsRef = useRef<(SVGPathElement | null)[]>([]);
  const gratRef = useRef<SVGPathElement>(null);
  const dubaiRef = useRef<SVGPathElement>(null);
  const retRef = useRef<SVGGElement>(null);
  const latRef = useRef<HTMLSpanElement>(null);
  const lonRef = useRef<HTMLSpanElement>(null);
  const zoomRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const stage = stageRef.current!;
    let w = stage.clientWidth, h = stage.clientHeight;
    let raf = 0, visible = true, alive = true, last = '';
    const progress = () => {
      if (still) return 1;
      const el = trackRef.current;
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      const range = r.height - innerHeight * 0.55;
      return range > 0 ? Math.min(1, Math.max(0, (innerHeight * 0.35 - r.top) / range)) : 0;
    };
    let ps = progress(), lastT = performance.now();
    const tau = SCROLL_FEEL.scrub / 3;

    const draw = (force = false) => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastT) / 1000);
      lastT = now;
      const target = progress();
      ps += (target - ps) * (1 - Math.exp(-dt / tau));
      if (Math.abs(target - ps) < 1e-4) ps = target;
      const pose = poseAt(ps, w, h);
      const key = `${ps.toFixed(4)}|${w}|${h}`;
      if (!force && key === last) return;
      last = key;
      const bands = dotPaths(pose, w, h);
      bands.forEach((d, i) => dotsRef.current[i]?.setAttribute('d', d));
      discRef.current?.setAttribute('cx', pose.cx.toFixed(1));
      discRef.current?.setAttribute('cy', pose.cy.toFixed(1));
      discRef.current?.setAttribute('r', pose.r.toFixed(1));
      let g = '';
      for (let lat = -75; lat <= 75; lat += 15) g += graticule(pose, 'lat', lat, 90);
      for (let lon = -180; lon < 180; lon += 15) g += graticule(pose, 'lon', lon, 90);
      gratRef.current?.setAttribute('d', g);
      dubaiRef.current?.setAttribute('d', graticule(pose, 'lat', DUBAI.lat, 180) + graticule(pose, 'lon', DUBAI.lon, 180));
      const [x, y, z] = project(pose, DUBAI.lat, DUBAI.lon);
      if (retRef.current) {
        retRef.current.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        retRef.current.style.opacity = String(z > 0 ? seg(ps, 0.55, 0.85) : 0);
      }
      if (latRef.current) latRef.current.textContent = formatLat(pose.lat);
      if (lonRef.current) lonRef.current.textContent = formatLon(pose.lon);
      if (zoomRef.current) zoomRef.current.textContent = `×${(pose.r / (Math.min(w, h) * 0.4)).toFixed(1)}`;
    };
    const loop = () => { raf = 0; if (!alive) return; draw(); if (visible && !still) raf = requestAnimationFrame(loop); };

    const ro = new ResizeObserver(() => {
      w = stage.clientWidth; h = stage.clientHeight;
      svgRef.current?.setAttribute('viewBox', `0 0 ${w} ${h}`);
      draw(true);
    });
    ro.observe(stage);
    svgRef.current?.setAttribute('viewBox', `0 0 ${w} ${h}`);
    draw(true);
    // Pause the loop while the plate is off screen.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf && !still) raf = requestAnimationFrame(loop);
    });
    io.observe(stage);
    if (!still) raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [trackRef, still]);

  return (
    <figure className="plate" aria-labelledby="plate-cap">
      <div ref={stageRef} className="plate-stage" aria-hidden="true">
        <svg ref={svgRef} className="plate-svg" preserveAspectRatio="none">
          <circle ref={discRef} className="g-disc" />
          <path ref={gratRef} className="g-grat" />
          <path ref={(el) => { dotsRef.current[0] = el; }} className="g-dots g-dots-0" />
          <path ref={(el) => { dotsRef.current[1] = el; }} className="g-dots g-dots-1" />
          <path ref={(el) => { dotsRef.current[2] = el; }} className="g-dots g-dots-2" />
          <path ref={dubaiRef} className="g-dubai" />
          <g ref={retRef} className="g-ret" style={{ opacity: 0 }}>
            <circle r="3.5" className="g-ret-dot" />
            <circle r="26" className="g-ret-ring" />
            <path d="M-60 0H-36M36 0H60M0 -60V-36M0 36V60" className="g-ret-tick" />
            <text x="34" y="-34" className="g-ret-label">Dubai</text>
          </g>
        </svg>
        <span className="crop crop-tl" /><span className="crop crop-tr" /><span className="crop crop-bl" /><span className="crop crop-br" />
        <span className="plate-scale">Scale <span ref={zoomRef}>×1.0</span></span>
      </div>
      <figcaption id="plate-cap" className="plate-cap">
        <span className="cap-fig">Fig. 1</span>
        <span className="cap-place"><em>Dubai</em></span>
        <span className="cap-coord"><span ref={latRef}>{formatLat(DUBAI.lat)}</span> <span ref={lonRef}>{formatLon(DUBAI.lon)}</span></span>
        <span className="cap-time"><DubaiClock label="Local time" /></span>
      </figcaption>
    </figure>
  );
}
