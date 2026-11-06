// The calm page's drawings: the same hall as a static SVG floor plan (seen from above) and the dais clock as an
// SVG dial. Same data as the 3D (layout.ts), no motion.
import { A0, A1, blocks, COL, dialAngle, FURNITURE, ROW_DEPTH, ROWS, seats, slotArcs, TAKE_SEAT, WALL_Z } from './layout';

const arcPath = (r: number, a0: number, a1: number) => {
  const p = (a: number) => `${(r * Math.sin(a)).toFixed(3)} ${(r * Math.cos(a)).toFixed(3)}`;
  return `M ${p(a0)} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 0 ${p(a1)}`;
};

const blockPath = (r0: number, r1: number, a0: number, a1: number) => {
  const p = (r: number, a: number) => `${(r * Math.sin(a)).toFixed(3)} ${(r * Math.cos(a)).toFixed(3)}`;
  return `M ${p(r0, a0)} A ${r0} ${r0} 0 0 0 ${p(r0, a1)} L ${p(r1, a1)} A ${r1} ${r1} 0 0 1 ${p(r1, a0)} Z`;
};

export function Plan({ block = -1, take = false, label }: { block?: number; take?: boolean; label: string }) {
  const D = Math.PI / 180;
  return (
    <svg className="plan" viewBox="-15.8 -3.4 31.6 19.6" role="img" aria-label={label}>
      <g fill="none" stroke={COL.wire} strokeWidth="1">
        {ROWS.map(({ r }) => <path key={r} d={arcPath(r - ROW_DEPTH / 2, A0 - 3 * D, A1 + 3 * D)} vectorEffect="non-scaling-stroke" />)}
        <path d={arcPath(ROWS[ROWS.length - 1].r + ROW_DEPTH / 2, A0 - 3 * D, A1 + 3 * D)} vectorEffect="non-scaling-stroke" />
        <path d={arcPath(14.7, A0, A1)} stroke={COL.wireHi} vectorEffect="non-scaling-stroke" />
        {Array.from({ length: 57 }, (_, i) => {
          const a = (-70 + i * 2.5) * D, l = i % 4 === 0 ? 0.5 : 0.2;
          return <line key={i} x1={14.7 * Math.sin(a)} y1={14.7 * Math.cos(a)} x2={(14.7 + l) * Math.sin(a)} y2={(14.7 + l) * Math.cos(a)} stroke={COL.wireHi} vectorEffect="non-scaling-stroke" />;
        })}
        {blocks.map((b, i) => (
          <path key={i} vectorEffect="non-scaling-stroke" stroke={i === block ? COL.un : COL.wire} strokeWidth={i === block ? 2 : 1}
            d={blockPath(b.r0, b.r1, b.a0, b.a1)} />
        ))}
        <path d={arcPath(3.2, -90 * D, 90 * D)} vectorEffect="non-scaling-stroke" />
        <line x1={-8.5} y1={WALL_Z} x2={8.5} y2={WALL_Z} stroke={COL.wireHi} vectorEffect="non-scaling-stroke" />
      </g>
      {FURNITURE.slice(0, -1).map(([x, , z, w, , d], i) => (
        <rect key={i} x={x - w / 2} y={z - d / 2} width={w} height={d} fill={COL.seat} stroke={COL.seatEdge} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
      <circle cx={0} cy={WALL_Z - 0.35} r={0.28} fill="none" stroke={COL.gold} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      {seats.map((s, i) => {
        const lit = i === TAKE_SEAT && take ? COL.take : s.block === block ? COL.un : COL.seat;
        return (
          <rect key={i} x={-0.28} y={-0.31} width={0.56} height={0.45} fill={lit} stroke={lit === COL.seat ? COL.seatEdge : COL.ink} strokeWidth="1" vectorEffect="non-scaling-stroke"
            transform={`translate(${s.x.toFixed(3)} ${s.z.toFixed(3)}) rotate(${(-s.a * 180) / Math.PI})`} />
        );
      })}
    </svg>
  );
}

export function Dial({ day, slot, label }: { day: number; slot: number; label: string }) {
  const R = 100;
  const pt = (a: number, r: number) => [(r * Math.sin(a)).toFixed(2), (-r * Math.cos(a)).toFixed(2)].join(' ');
  const arc = (a0: number, a1: number, r: number) => `M ${pt(a0, r)} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${pt(a1, r)}`;
  const chosen = slotArcs[day][slot];
  const ha = dialAngle(chosen.start);
  return (
    <svg className="dial" viewBox="-130 -130 260 260" role="img" aria-label={label}>
      <g fill="none" stroke={COL.wireHi} strokeWidth="1" vectorEffect="non-scaling-stroke">
        <circle r={R} /><circle r={R * 0.94} />
        {Array.from({ length: 60 }, (_, i) => { const a = (i / 60) * Math.PI * 2, l = i % 5 === 0 ? 11 : 5; return <path key={i} d={`M ${pt(a, R * 0.94 - l)} L ${pt(a, R * 0.94)}`} />; })}
      </g>
      {Array.from({ length: 12 }, (_, i) => { const a = ((i === 0 ? 12 : i) / 12) * Math.PI * 2; const [x, y] = pt(a, R * 1.17).split(' '); return <text key={i} x={x} y={y} className="dial-n">{i === 0 ? 12 : i}</text>; })}
      <g fill="none" stroke={COL.mute} strokeWidth="1.5" vectorEffect="non-scaling-stroke">
        {slotArcs[day].map((s, i) => { const a0 = dialAngle(s.start); return s.end === null ? <path key={i} d={`M ${pt(a0, R * 0.62)} L ${pt(a0, R * 0.82)}`} /> : <path key={i} d={arc(a0 + 0.02, a0 + dialAngle(s.end - s.start) - 0.02, R * 0.72)} />; })}
      </g>
      {chosen.end !== null
        ? <path d={arc(ha, ha + dialAngle(chosen.end - chosen.start), R * 0.72)} fill="none" stroke={COL.un} strokeWidth="5" />
        : <path d={`M ${pt(ha, R * 0.6)} L ${pt(ha, R * 0.84)}`} stroke={COL.un} strokeWidth="5" />}
      <path d={`M ${pt(ha + Math.PI, 8)} L ${pt(ha, R * 0.82)}`} stroke={COL.ink} strokeWidth="2" />
      <circle r="4" fill={COL.ground} stroke={COL.ink} strokeWidth="2" />
    </svg>
  );
}
