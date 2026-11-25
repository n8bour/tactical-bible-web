import type { ReactNode } from 'react';

// Static SVG pitch in world metres: x = 0..105 along the length (home attacks to the right), y = 0..68 across.
export const LEN = 105;
export const WID = 68;
const M = 3;

export const COLORS = {
  home: '#38bdf8',
  away: '#f87171',
  focus: '#facc15',
  before: '#94a3b8',
  zone: '#facc15',
  good: '#4ade80',
  bad: '#f87171',
  line: 'rgba(255,255,255,0.7)',
} as const;

export interface Pt {
  x: number;
  y: number;
}

export function Pitch(props: { children?: ReactNode; title: string; half?: 'att' | 'def'; className?: string }) {
  const x0 = props.half === 'att' ? LEN / 2 - 2 : -M;
  const w = props.half ? LEN / 2 + 2 + M : LEN + 2 * M;
  const line = { fill: 'none', stroke: COLORS.line, strokeWidth: 0.3 } as const;
  return (
    <svg className={props.className ?? 'pitch-svg'} viewBox={`${x0} ${-M} ${w} ${WID + 2 * M}`} role="img" aria-label={props.title}>
      <title>{props.title}</title>
      <rect x={-M} y={-M} width={LEN + 2 * M} height={WID + 2 * M} fill="#166534" />
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={(i * LEN) / 10} y={0} width={LEN / 10} height={WID} fill={i % 2 ? '#166534' : '#15803d'} />
      ))}
      <rect x={0} y={0} width={LEN} height={WID} {...line} />
      <line x1={LEN / 2} y1={0} x2={LEN / 2} y2={WID} {...line} />
      <circle cx={LEN / 2} cy={WID / 2} r={9.15} {...line} />
      {[0, 1].map((s) => (
        <g key={s}>
          <rect x={s ? LEN - 16.5 : 0} y={WID / 2 - 20.16} width={16.5} height={40.32} {...line} />
          <rect x={s ? LEN - 5.5 : 0} y={WID / 2 - 9.16} width={5.5} height={18.32} {...line} />
          <rect x={s ? LEN : -1.5} y={WID / 2 - 3.66} width={1.5} height={7.32} {...line} />
        </g>
      ))}
      {props.children}
    </svg>
  );
}

export function Player(props: { at: Pt; color?: string; label?: string; hollow?: boolean; focus?: boolean; r?: number }) {
  const r = props.r ?? 1.4;
  const color = props.color ?? COLORS.home;
  return (
    <g>
      <circle
        cx={props.at.x}
        cy={props.at.y}
        r={r}
        fill={props.hollow ? 'none' : color}
        stroke={props.focus ? COLORS.focus : props.hollow ? color : '#0b1410'}
        strokeWidth={props.focus ? 0.6 : props.hollow ? 0.4 : 0.25}
        strokeDasharray={props.hollow ? '0.8 0.5' : undefined}
      />
      {props.label && (
        <text x={props.at.x} y={props.at.y + r + 2.2} textAnchor="middle" fontSize={2.1} fontWeight={600} fill={props.focus ? COLORS.focus : '#fff'} stroke="#0b1410" strokeWidth={0.5} paintOrder="stroke">
          {props.label}
        </text>
      )}
    </g>
  );
}

export function Arrow(props: { from: Pt; to: Pt; color?: string; dashed?: boolean; width?: number }) {
  const c = props.color ?? COLORS.focus;
  const ang = Math.atan2(props.to.y - props.from.y, props.to.x - props.from.x);
  const h = 1.6;
  const p1 = { x: props.to.x - Math.cos(ang - 0.45) * h, y: props.to.y - Math.sin(ang - 0.45) * h };
  const p2 = { x: props.to.x - Math.cos(ang + 0.45) * h, y: props.to.y - Math.sin(ang + 0.45) * h };
  return (
    <g>
      <line x1={props.from.x} y1={props.from.y} x2={props.to.x} y2={props.to.y} stroke={c} strokeWidth={props.width ?? 0.45} strokeDasharray={props.dashed ? '1.2 0.8' : undefined} />
      <polygon points={`${props.to.x},${props.to.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`} fill={c} />
    </g>
  );
}

export function Zone(props: { x: number; y: number; w: number; h: number; color?: string; label?: string; opacity?: number }) {
  const c = props.color ?? COLORS.zone;
  return (
    <g>
      <rect x={props.x} y={props.y} width={props.w} height={props.h} fill={c} fillOpacity={props.opacity ?? 0.18} stroke={c} strokeWidth={0.3} strokeDasharray="1 0.6" rx={0.8} />
      {props.label && (
        <text x={props.x + props.w / 2} y={props.y + 2.6} textAnchor="middle" fontSize={2} fontWeight={600} fill="#fff" stroke="#0b1410" strokeWidth={0.45} paintOrder="stroke">
          {props.label}
        </text>
      )}
    </g>
  );
}

export function Ring(props: { at: Pt; r: number; color?: string; dashed?: boolean; opacity?: number }) {
  const c = props.color ?? COLORS.home;
  return <circle cx={props.at.x} cy={props.at.y} r={props.r} fill={c} fillOpacity={props.opacity ?? 0.1} stroke={c} strokeWidth={0.3} strokeDasharray={props.dashed ? '1 0.6' : undefined} />;
}

export function VLine(props: { x: number; color?: string; label?: string; dashed?: boolean }) {
  const c = props.color ?? '#fff';
  return (
    <g>
      <line x1={props.x} y1={0} x2={props.x} y2={WID} stroke={c} strokeWidth={0.4} strokeDasharray={props.dashed ? '1.2 0.8' : undefined} />
      {props.label && (
        <text x={props.x + 0.8} y={2.6} fontSize={2} fontWeight={600} fill={c} stroke="#0b1410" strokeWidth={0.45} paintOrder="stroke">
          {props.label}
        </text>
      )}
    </g>
  );
}

/** Legacy formation coordinates (x = width 0..100 left→right, y = depth 0..100) to home-team metres. */
export const fromLegacy = (s: { x: number; y: number }): Pt => ({ x: s.y * 1.05, y: s.x * 0.68 });
