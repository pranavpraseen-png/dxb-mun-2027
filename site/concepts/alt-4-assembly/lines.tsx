// Hairlines: three's LineSegments2 (width in CSS px, so 1 px stays 1 px on a 2x screen), opaque colour.
// `reveal` (0…1, read every frame) draws the segments in order; `show` hides the whole set.
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color } from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

/** Flat list of segment end points: [ax, ay, az, bx, by, bz, …]. */
export type Segs = number[];

type P = [number, number, number];
export const seg = (out: Segs, a: P, b: P) => { out.push(a[0], a[1], a[2], b[0], b[1], b[2]); };
export const polyline = (out: Segs, pts: P[], closed = false) => {
  for (let i = 0; i < pts.length - 1; i++) seg(out, pts[i], pts[i + 1]);
  if (closed && pts.length > 2) seg(out, pts[pts.length - 1], pts[0]);
};
/** Arc on the floor (y given), angle measured from +z towards +x. */
export const floorArc = (out: Segs, r: number, y: number, a0: number, a1: number, n = 48) => {
  const pts: P[] = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push([r * Math.sin(a), y, r * Math.cos(a)]); }
  polyline(out, pts);
};
/** Circle or arc in a wall plane facing +z, clockwise from 12 o'clock. */
export const wallArc = (out: Segs, cx: number, cy: number, z: number, r: number, a0 = 0, a1 = Math.PI * 2, n = 72) => {
  const pts: P[] = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push([cx + r * Math.sin(a), cy + r * Math.cos(a), z]); }
  polyline(out, pts);
};

type Props = { segs: Segs; color: string; width?: number; reveal?: () => number; show?: () => boolean; renderOrder?: number };
export function Lines({ segs, color, width = 1, reveal, show, renderOrder = 0 }: Props) {
  const obj = useMemo(() => {
    const g = new LineSegmentsGeometry();
    g.setPositions(new Float32Array(segs));
    const m = new LineMaterial({ color: new Color(color).getHex(), linewidth: width, worldUnits: false, transparent: false });
    const o = new LineSegments2(g, m);
    o.renderOrder = renderOrder;
    o.frustumCulled = false;
    return o;
    // colour changes go through the effect below and keep the geometry
  }, [segs, width, renderOrder]);
  useEffect(() => { (obj.material as LineMaterial).color.set(color); }, [obj, color]);
  useEffect(() => () => { obj.geometry.dispose(); (obj.material as LineMaterial).dispose(); }, [obj]);
  const total = segs.length / 6;
  useFrame(() => {
    const on = show ? show() : true;
    if (!reveal) { obj.visible = on; return; }
    const n = Math.round(total * Math.max(0, Math.min(1, reveal())));
    obj.geometry.instanceCount = n;
    obj.visible = on && n > 0;
  });
  return <primitive object={obj} />;
}
