// Hairlines for the whole stage: three's LineSegments2 (screen-space width in CSS px, so 1 px stays 1 px
// on a 2x screen) with an opaque colour. Combo 2: the width is scaled to one dither block (see bayer.ts). `reveal` (0…1, read every frame) draws the segments in order.
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Vector3 } from 'three';
import { grid } from './bayer';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

export const COL = {
  ground: '#100904',
  surface: '#1c130c',
  ink: '#faf7ef',
  line: '#382416',
  dim: '#7c6e62', // opaque mix of the line brown and the cream (35%): back-row wireframe
  mute: '#aca398',
  accent: '#dc5000',
  maroon: '#600e0e',
  gold: '#ffb606',
} as const;

/** A flat list of segment end points: [a, b, a, b, …]. */
export type Seg = Vector3[];

/** Polyline → segments. */
export const poly = (pts: Vector3[], closed = false): Seg => {
  const out: Vector3[] = [];
  for (let i = 0; i < pts.length - 1; i++) out.push(pts[i], pts[i + 1]);
  if (closed && pts.length > 2) out.push(pts[pts.length - 1], pts[0]);
  return out;
};

type Props = {
  segs: Seg;
  color: string;
  width?: number;
  reveal?: () => number;
  depthTest?: boolean;
  renderOrder?: number;
};
export function Segs({ segs, color, width = 1, reveal, depthTest = true, renderOrder = 0 }: Props) {
  const obj = useMemo(() => {
    const g = new LineSegmentsGeometry();
    const arr = new Float32Array(segs.length * 3);
    segs.forEach((p, i) => { arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z; });
    g.setPositions(arr);
    const m = new LineMaterial({ color: new Color(color).getHex(), linewidth: width, worldUnits: false, transparent: false, depthTest });
    const o = new LineSegments2(g, m);
    o.renderOrder = renderOrder;
    o.frustumCulled = false;
    return o;
    // colour is left out on purpose: a colour change goes through the effect below and keeps the geometry
  }, [segs, width, depthTest, renderOrder]);
  useEffect(() => { (obj.material as LineMaterial).color.set(color); }, [obj, color]);
  useEffect(() => () => { obj.geometry.dispose(); (obj.material as LineMaterial).dispose(); }, [obj]);
  const total = segs.length / 2;
  useFrame(() => {
    // the dither pass renders one texel per block: a 1 px line becomes exactly one block wide
    (obj.material as LineMaterial).linewidth = width * grid.css;
    if (!reveal) return;
    const n = Math.round(total * Math.max(0, Math.min(1, reveal())));
    obj.geometry.instanceCount = n;
    obj.visible = n > 0;
  });
  return <primitive object={obj} />;
}

/** A circle as a polyline in the plane spanned by u and v. */
export const circle = (c: Vector3, r: number, u: Vector3, w: Vector3, n = 64, a0 = 0, a1 = Math.PI * 2) => {
  const pts: Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push(c.clone().addScaledVector(u, Math.cos(a) * r).addScaledVector(w, Math.sin(a) * r));
  }
  return pts;
};
