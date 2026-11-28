import { useId } from 'react';
import {
  PITCH_LENGTH,
  PITCH_WIDTH,
  type BallLane,
  type BallThird,
  type BallZone,
  type PitchArrow,
  type PitchDiagram,
  type PitchLine,
  type PitchPlayerToken,
  type ZoneCell,
  type ZoneCoverageReport,
  type ZoneStatus,
} from '../engine/types';

export interface PitchSvgProps {
  diagram: PitchDiagram;
  selectedSlot?: string | null;
  onSelectSlot?: (slot: string) => void;
  /** Optional 3x3 Ball Zone interactive grid overlay */
  ballZone?: BallZone | null;
  onSelectBallZone?: (zone: BallZone) => void;
  /** Optional 35-zone coverage heatmap overlay */
  coverage?: ZoneCoverageReport | null;
  selectedCell?: { col: number; row: number } | null;
  onSelectCell?: (cell: ZoneCell) => void;
  compact?: boolean;
  ariaLabel?: string;
}

const BALL_THIRDS: readonly { id: BallThird; label: string; x0: number; x1: number }[] = [
  { id: 'def', label: 'Def', x0: 0, x1: PITCH_LENGTH / 3 },
  { id: 'mid', label: 'Mid', x0: PITCH_LENGTH / 3, x1: (PITCH_LENGTH * 2) / 3 },
  { id: 'att', label: 'Att', x0: (PITCH_LENGTH * 2) / 3, x1: PITCH_LENGTH },
];

const BALL_LANES: readonly { id: BallLane; label: string; y0: number; y1: number }[] = [
  { id: 'left', label: 'Left', y0: 0, y1: PITCH_WIDTH / 3 },
  { id: 'centre', label: 'Centre', y0: PITCH_WIDTH / 3, y1: (PITCH_WIDTH * 2) / 3 },
  { id: 'right', label: 'Right', y0: (PITCH_WIDTH * 2) / 3, y1: PITCH_WIDTH },
];

const ZONE_STYLE: Record<ZoneStatus, { fill: string; stroke: string }> = {
  gap: { fill: 'rgba(244, 63, 94, 0.30)', stroke: 'rgba(251, 113, 133, 0.48)' },
  light: { fill: 'rgba(245, 158, 11, 0.23)', stroke: 'rgba(251, 191, 36, 0.36)' },
  covered: { fill: 'rgba(16, 185, 129, 0.22)', stroke: 'rgba(52, 211, 153, 0.34)' },
  strong: { fill: 'rgba(34, 197, 94, 0.35)', stroke: 'rgba(74, 222, 128, 0.48)' },
  crowded: { fill: 'rgba(168, 85, 247, 0.32)', stroke: 'rgba(192, 132, 252, 0.56)' },
};

const ARROW_COLOR: Record<PitchArrow['kind'], string> = {
  run: '#fbbf24',
  move: '#38bdf8',
  pass: '#ecfdf5',
  press: '#fb7185',
  compare: '#22d3ee',
};

const LINE_COLOR: Record<PitchLine['kind'], string> = {
  'def-line': '#38bdf8',
  loe: '#fbbf24',
  offside: '#fb7185',
};

const STRIPE_COUNT = 10;
const STRIPE_WIDTH = PITCH_LENGTH / STRIPE_COUNT;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function shortenArrow(arrow: PitchArrow, trimEnd: number, trimStart: number) {
  const dx = arrow.to.x - arrow.from.x;
  const dy = arrow.to.y - arrow.from.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return null;
  const ux = dx / dist;
  const uy = dy / dist;
  const startOffset = dist > trimStart + trimEnd + 1.5 ? trimStart : 0;
  const endOffset = dist > trimEnd + 2 ? trimEnd : dist * 0.15;
  return {
    x1: arrow.from.x + ux * startOffset,
    y1: arrow.from.y + uy * startOffset,
    x2: arrow.to.x - ux * endOffset,
    y2: arrow.to.y - uy * endOffset,
    mx: (arrow.from.x + arrow.to.x) / 2,
    my: (arrow.from.y + arrow.to.y) / 2,
  };
}

function tokenFontSize(label: string, compact: boolean): number {
  const base = compact ? 1.85 : 2.05;
  if (label.length >= 4) return base * 0.78;
  if (label.length === 3) return base * 0.88;
  return base;
}

function renderPlayerAriaLabel(player: PitchPlayerToken): string {
  const parts = [player.slot, player.label];
  if (player.sublabel && player.sublabel !== player.label && player.sublabel !== player.slot) {
    parts.push(player.sublabel);
  }
  if (player.note) parts.push(player.note);
  return parts.join(' - ');
}

function minPlayerDist(x: number, y: number, players: readonly PitchPlayerToken[]): number {
  let min = Infinity;
  for (const p of players) {
    const dBody = Math.hypot(x - p.x, y - p.y);
    if (dBody < min) min = dBody;
    if (p.sublabel) {
      const subY = p.y > PITCH_WIDTH - 8.5 ? p.y - 5.2 : p.y + 5.6;
      const dSub = Math.hypot(x - p.x, y - subY);
      if (dSub < min) min = dSub;
    }
  }
  return min;
}

function pickCellScoreAnchor(
  cell: ZoneCell,
  players: readonly PitchPlayerToken[],
): { x: number; y: number; textAnchor: 'start' | 'end' } {
  const w = cell.x1 - cell.x0;
  const h = cell.y1 - cell.y0;
  const candidates: { x: number; y: number; textAnchor: 'start' | 'end' }[] = [
    { x: cell.x0 + w - 1.1, y: cell.y0 + 2.5, textAnchor: 'end' },
    { x: cell.x0 + 1.1, y: cell.y0 + 2.5, textAnchor: 'start' },
    { x: cell.x0 + w - 1.1, y: cell.y0 + h - 1.1, textAnchor: 'end' },
    { x: cell.x0 + 1.1, y: cell.y0 + h - 1.1, textAnchor: 'start' },
  ];
  let best = candidates[0];
  let bestDist = -1;
  for (const c of candidates) {
    const d = minPlayerDist(c.x, c.y, players);
    if (d > bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

function pickHighlightLabelPos(
  hl: { x: number; y: number; r: number; label: string },
  players: readonly PitchPlayerToken[],
): { x: number; y: number; estWidth: number } {
  const estWidth = clamp(hl.label.length * 1.28 + 3.2, 10, 30);
  const halfW = estWidth / 2;
  const rawCandidates = [
    { x: hl.x, y: hl.y - hl.r - 1.8 },
    { x: hl.x, y: hl.y + hl.r + 2.4 },
    { x: hl.x - hl.r - halfW - 1.2, y: hl.y + 0.5 },
    { x: hl.x + hl.r + halfW + 1.2, y: hl.y + 0.5 },
  ];

  let best = {
    x: clamp(rawCandidates[0].x, halfW + 1, PITCH_LENGTH - halfW - 1),
    y: clamp(rawCandidates[0].y, 3.4, PITCH_WIDTH - 2.4),
  };
  let bestDist = -1;

  for (const cand of rawCandidates) {
    const cx = clamp(cand.x, halfW + 1, PITCH_LENGTH - halfW - 1);
    const cy = clamp(cand.y, 3.4, PITCH_WIDTH - 2.4);
    const d = minPlayerDist(cx, cy, players);
    if (d > bestDist) {
      bestDist = d;
      best = { x: cx, y: cy };
    }
  }

  return { ...best, estWidth };
}

export function PitchSvg({
  diagram,
  selectedSlot,
  onSelectSlot,
  ballZone,
  onSelectBallZone,
  coverage,
  selectedCell,
  onSelectCell,
  compact = false,
  ariaLabel,
}: PitchSvgProps) {
  const uid = useId().replace(/:/g, '');
  const clipId = `pitch-clip-${uid}`;
  const tokenR = compact ? 2.65 : 3.05;
  const isInteractive = Boolean(onSelectSlot || onSelectBallZone || onSelectCell);
  const label = ariaLabel ?? `${diagram.title}${diagram.subtitle ? `: ${diagram.subtitle}` : ''}`;

  // Stagger vertical line badges when two tactical lines sit close together horizontally.
  const lineBadges = (diagram.lines ?? []).map((line, index, arr) => {
    const x = clamp(line.x, 1.5, PITCH_LENGTH - 1.5);
    const estWidth = clamp(line.label.length * 1.35 + 3.2, 10, 28);
    const badgeX = clamp(x, estWidth / 2 + 0.8, PITCH_LENGTH - estWidth / 2 - 0.8);
    const overlapsPrev =
      index > 0 && Math.abs(clamp(arr[index - 1].x, 1.5, PITCH_LENGTH - 1.5) - x) < estWidth + 2;
    const badgeY = overlapsPrev ? 7.2 : 2.8;
    return { line, x, estWidth, badgeX, badgeY };
  });

  // Derive fallback ball coordinates when ballZone is active but diagram.ball is omitted.
  const ballPos =
    diagram.ball ??
    (ballZone
      ? (() => {
          const t = BALL_THIRDS.find((b) => b.id === ballZone.third);
          const l = BALL_LANES.find((b) => b.id === ballZone.lane);
          return t && l ? { x: (t.x0 + t.x1) / 2, y: (l.y0 + l.y1) / 2 } : undefined;
        })()
      : undefined);

  return (
    <div className={compact ? 'pitch-wrap pitch-wrap--compact' : 'pitch-wrap'}>
      <svg
        className="pitch-svg"
        viewBox="-4 -4 113 76"
        role={isInteractive ? 'group' : 'img'}
        aria-label={label}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={PITCH_LENGTH} height={PITCH_WIDTH} rx={0.6} />
          </clipPath>
          {(Object.keys(ARROW_COLOR) as PitchArrow['kind'][]).map((kind) => (
            <marker
              key={kind}
              id={`arrow-${kind}-${uid}`}
              viewBox="0 0 10 10"
              refX="7.5"
              refY="5"
              markerWidth="4.6"
              markerHeight="4.6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.2 L 8.8 5 L 0 8.8 z" fill={ARROW_COLOR[kind]} />
            </marker>
          ))}
        </defs>

        {/* Outer pitch surround */}
        <rect x={-4} y={-4} width={113} height={76} rx={2.4} fill="#0a1f16" />

        {/* Mown turf stripes */}
        <g clipPath={`url(#${clipId})`}>
          {Array.from({ length: STRIPE_COUNT }, (_, i) => (
            <rect
              key={i}
              x={i * STRIPE_WIDTH}
              y={0}
              width={STRIPE_WIDTH + 0.08}
              height={PITCH_WIDTH}
              fill={i % 2 === 0 ? '#103725' : '#133f2b'}
            />
          ))}
        </g>

        {/* Optional 35-zone coverage heatmap overlay */}
        {coverage && (
          <g aria-label="Pitch zone coverage heatmap" clipPath={`url(#${clipId})`}>
            {coverage.cells.map((cell) => {
              const style = ZONE_STYLE[cell.status];
              const isSelected =
                selectedCell?.col === cell.col && selectedCell?.row === cell.row;
              const w = cell.x1 - cell.x0;
              const h = cell.y1 - cell.y0;
              const interactiveCell = Boolean(onSelectCell);
              const scoreAnchor = !compact ? pickCellScoreAnchor(cell, diagram.players) : null;
              return (
                <g
                  key={`${cell.col}-${cell.row}`}
                  className={interactiveCell ? 'pitch-zone-cell' : undefined}
                  role={interactiveCell ? 'button' : undefined}
                  tabIndex={interactiveCell ? 0 : undefined}
                  aria-pressed={interactiveCell ? isSelected : undefined}
                  aria-label={`${cell.label}: ${cell.status}, score ${cell.score.toFixed(1)}`}
                  onClick={interactiveCell ? () => onSelectCell?.(cell) : undefined}
                  onKeyDown={
                    interactiveCell
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectCell?.(cell);
                          }
                        }
                      : undefined
                  }
                >
                  <title>{`${cell.label} · ${cell.status} (${cell.score.toFixed(1)})`}</title>
                  <rect
                    x={cell.x0 + 0.25}
                    y={cell.y0 + 0.25}
                    width={Math.max(0, w - 0.5)}
                    height={Math.max(0, h - 0.5)}
                    rx={0.5}
                    fill={style.fill}
                    stroke={isSelected ? '#f0f4f1' : style.stroke}
                    strokeWidth={isSelected ? 0.55 : 0.22}
                  />
                  {scoreAnchor && (
                    <text
                      x={scoreAnchor.x}
                      y={scoreAnchor.y}
                      textAnchor={scoreAnchor.textAnchor}
                      fill="rgba(240, 244, 241, 0.78)"
                      fontSize={1.75}
                      fontWeight={600}
                      pointerEvents="none"
                    >
                      {cell.score.toFixed(1)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* Crisp field markings (always above heatmap fills) */}
        <g
          fill="none"
          stroke="rgba(240, 244, 241, 0.40)"
          strokeWidth={0.34}
          pointerEvents="none"
        >
          {/* Outer boundary */}
          <rect x={0} y={0} width={PITCH_LENGTH} height={PITCH_WIDTH} />
          {/* Halfway line & centre circle */}
          <line x1={PITCH_LENGTH / 2} y1={0} x2={PITCH_LENGTH / 2} y2={PITCH_WIDTH} />
          <circle cx={PITCH_LENGTH / 2} cy={PITCH_WIDTH / 2} r={9.15} />
          <circle cx={PITCH_LENGTH / 2} cy={PITCH_WIDTH / 2} r={0.42} fill="rgba(255,255,255,0.65)" />

          {/* Left penalty box, 6-yard box, penalty spot & arc */}
          <rect x={0} y={13.84} width={16.5} height={40.32} />
          <rect x={0} y={24.84} width={5.5} height={18.32} />
          <circle cx={11} cy={PITCH_WIDTH / 2} r={0.38} fill="rgba(255,255,255,0.65)" />
          <path d="M 16.5 26.69 A 9.15 9.15 0 0 1 16.5 41.31" />

          {/* Right penalty box, 6-yard box, penalty spot & arc */}
          <rect x={PITCH_LENGTH - 16.5} y={13.84} width={16.5} height={40.32} />
          <rect x={PITCH_LENGTH - 5.5} y={24.84} width={5.5} height={18.32} />
          <circle cx={PITCH_LENGTH - 11} cy={PITCH_WIDTH / 2} r={0.38} fill="rgba(255,255,255,0.65)" />
          <path d="M 88.5 26.69 A 9.15 9.15 0 0 0 88.5 41.31" />

          {/* Corner arcs */}
          <path d="M 0 1 A 1 1 0 0 0 1 0" />
          <path d="M 104 0 A 1 1 0 0 0 105 1" />
          <path d="M 0 67 A 1 1 0 0 1 1 68" />
          <path d="M 104 68 A 1 1 0 0 1 105 67" />

          {/* Goal frames */}
          <rect x={-1.8} y={30.34} width={1.8} height={7.32} stroke="rgba(255,255,255,0.34)" />
          <rect x={PITCH_LENGTH} y={30.34} width={1.8} height={7.32} stroke="rgba(255,255,255,0.34)" />
        </g>

        {/* Top margin indicators (phase + attacking direction) */}
        <g pointerEvents="none">
          <text
            x={0.8}
            y={-1.45}
            fill="rgba(240, 244, 241, 0.78)"
            fontSize={2.05}
            fontWeight={500}
            letterSpacing={0.02}
          >
            {diagram.phase === 'ip' ? 'In possession' : 'Out of possession'}
          </text>
          <text
            x={PITCH_LENGTH - 0.5}
            y={-1.45}
            textAnchor="end"
            fill="rgba(153, 170, 162, 0.9)"
            fontSize={2.05}
            fontWeight={500}
          >
            Attacking →
          </text>
        </g>

        {/* Optional 3x3 Ball Zone interactive grid overlay */}
        {(ballZone !== undefined || onSelectBallZone) && (
          <g aria-label="Ball zone selector">
            {BALL_THIRDS.map((third) =>
              BALL_LANES.map((lane) => {
                const active = ballZone?.third === third.id && ballZone?.lane === lane.id;
                const interactiveZone = Boolean(onSelectBallZone);
                const w = third.x1 - third.x0;
                const h = lane.y1 - lane.y0;
                const zoneName = `${third.label} · ${lane.label}`;
                return (
                  <g
                    key={`${third.id}-${lane.id}`}
                    className={interactiveZone ? 'pitch-ball-zone' : undefined}
                    role={interactiveZone ? 'button' : undefined}
                    tabIndex={interactiveZone ? 0 : undefined}
                    aria-pressed={interactiveZone ? active : undefined}
                    aria-label={`Set ball zone to ${third.label} third, ${lane.label} lane`}
                    onClick={
                      interactiveZone
                        ? () => onSelectBallZone?.({ third: third.id, lane: lane.id })
                        : undefined
                    }
                    onKeyDown={
                      interactiveZone
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectBallZone?.({ third: third.id, lane: lane.id });
                            }
                          }
                        : undefined
                    }
                  >
                    <rect
                      x={third.x0 + 0.3}
                      y={lane.y0 + 0.3}
                      width={w - 0.6}
                      height={h - 0.6}
                      rx={0.6}
                      fill={active ? 'rgba(56, 189, 248, 0.17)' : 'transparent'}
                      stroke={active ? 'rgba(56, 189, 248, 0.78)' : 'rgba(255, 255, 255, 0.16)'}
                      strokeWidth={active ? 0.45 : 0.22}
                      strokeDasharray={active ? undefined : '1.4 1.2'}
                    />
                    {!compact && (
                      <text
                        x={third.x0 + 1.6}
                        y={lane.y0 + 3.0}
                        fill={active ? '#e0f2fe' : 'rgba(226, 232, 240, 0.42)'}
                        fontSize={1.8}
                        fontWeight={active ? 700 : 500}
                        pointerEvents="none"
                      >
                        {zoneName}
                      </text>
                    )}
                  </g>
                );
              }),
            )}
          </g>
        )}

        {/* Highlights (press radius, zones, box targets) */}
        {diagram.highlights && diagram.highlights.length > 0 && (
          <g pointerEvents="none">
            {diagram.highlights.map((hl, idx) => {
              const color =
                hl.kind === 'press'
                  ? { fill: 'rgba(251, 113, 133, 0.14)', stroke: 'rgba(251, 113, 133, 0.62)' }
                  : hl.kind === 'target'
                    ? { fill: 'rgba(251, 191, 36, 0.16)', stroke: 'rgba(251, 191, 36, 0.72)' }
                    : { fill: 'rgba(56, 189, 248, 0.14)', stroke: 'rgba(56, 189, 248, 0.54)' };
              const labelPos =
                hl.label && !compact
                  ? pickHighlightLabelPos({ ...hl, label: hl.label }, diagram.players)
                  : null;
              return (
                <g key={idx}>
                  <circle
                    cx={hl.x}
                    cy={hl.y}
                    r={hl.r}
                    fill={color.fill}
                    stroke={color.stroke}
                    strokeWidth={0.36}
                    strokeDasharray={hl.kind === 'press' ? '1.5 1.1' : undefined}
                  />
                  {hl.label && labelPos && (
                    <g transform={`translate(${labelPos.x}, ${labelPos.y})`}>
                      <rect
                        x={-labelPos.estWidth / 2}
                        y={-1.65}
                        width={labelPos.estWidth}
                        height={2.85}
                        rx={0.8}
                        fill="rgba(11, 14, 13, 0.86)"
                        stroke={color.stroke}
                        strokeWidth={0.2}
                      />
                      <text
                        y={0.42}
                        textAnchor="middle"
                        fill="#f0f4f1"
                        fontSize={1.85}
                        fontWeight={600}
                      >
                        {hl.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* Vertical tactical lines (Defensive Line, LoE, Offside) */}
        {lineBadges.length > 0 && (
          <g pointerEvents="none">
            {lineBadges.map(({ line, x, estWidth, badgeX, badgeY }, idx) => {
              const stroke = LINE_COLOR[line.kind];
              return (
                <g key={`${line.kind}-${idx}`}>
                  <line
                    x1={x}
                    y1={0.4}
                    x2={x}
                    y2={PITCH_WIDTH - 0.4}
                    stroke={stroke}
                    strokeWidth={0.42}
                    strokeDasharray="2 1.4"
                    opacity={0.85}
                  />
                  <rect
                    x={badgeX - estWidth / 2}
                    y={badgeY - 1.75}
                    width={estWidth}
                    height={3.2}
                    rx={0.9}
                    fill="rgba(11, 17, 22, 0.88)"
                    stroke={stroke}
                    strokeWidth={0.25}
                  />
                  <text
                    x={badgeX}
                    y={badgeY + 0.55}
                    textAnchor="middle"
                    fill={stroke}
                    fontSize={1.85}
                    fontWeight={700}
                  >
                    {line.label}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* Arrows (runs, movement, passes, pressing, comparison) */}
        {diagram.arrows.length > 0 && (
          <g pointerEvents="none">
            {diagram.arrows.map((arrow, idx) => {
              const geom = shortenArrow(arrow, tokenR * 0.72, tokenR * 0.55);
              if (!geom) return null;
              const stroke = ARROW_COLOR[arrow.kind];
              const isDashed =
                arrow.dashed ?? (arrow.kind === 'compare' || arrow.kind === 'press');
              const labelW = arrow.label ? clamp(arrow.label.length * 1.25 + 2.6, 8, 26) : 0;
              const lx = clamp(geom.mx, labelW / 2 + 1, PITCH_LENGTH - labelW / 2 - 1);
              const ly = clamp(geom.my - 1.6, 3.6, PITCH_WIDTH - 2.6);
              return (
                <g key={idx}>
                  <line
                    x1={geom.x1}
                    y1={geom.y1}
                    x2={geom.x2}
                    y2={geom.y2}
                    stroke={stroke}
                    strokeWidth={arrow.kind === 'run' ? 0.55 : 0.45}
                    strokeLinecap="round"
                    strokeDasharray={isDashed ? '1.8 1.2' : undefined}
                    markerEnd={`url(#arrow-${arrow.kind}-${uid})`}
                    opacity={0.92}
                  />
                  {arrow.label && !compact && (
                    <g>
                      <rect
                        x={lx - labelW / 2}
                        y={ly - 1.65}
                        width={labelW}
                        height={2.9}
                        rx={0.75}
                        fill="rgba(11, 17, 22, 0.86)"
                      />
                      <text
                        x={lx}
                        y={ly + 0.45}
                        textAnchor="middle"
                        fill={stroke}
                        fontSize={1.75}
                        fontWeight={600}
                      >
                        {arrow.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* Ghost baseline positions (before vs after comparison) */}
        <g pointerEvents="none">
          {diagram.players.map((player) => {
            if (player.ghostX == null || player.ghostY == null) return null;
            const dist = Math.hypot(player.x - player.ghostX, player.y - player.ghostY);
            if (dist < 1.2) return null;
            return (
              <g key={`ghost-${player.id}`}>
                <line
                  x1={player.ghostX}
                  y1={player.ghostY}
                  x2={player.x}
                  y2={player.y}
                  stroke="rgba(148, 163, 184, 0.45)"
                  strokeWidth={0.34}
                  strokeDasharray="1.2 1.1"
                />
                <circle
                  cx={player.ghostX}
                  cy={player.ghostY}
                  r={tokenR * 0.84}
                  fill="rgba(15, 23, 42, 0.35)"
                  stroke="rgba(203, 213, 225, 0.55)"
                  strokeWidth={0.32}
                  strokeDasharray="1.1 0.9"
                />
              </g>
            );
          })}
        </g>

        {/* Ball marker */}
        {ballPos && (
          <g
            className="pitch-ball"
            style={{ transform: `translate(${ballPos.x}px, ${ballPos.y}px)` }}
            pointerEvents="none"
          >
            <circle r={1.65} fill="rgba(15, 23, 42, 0.45)" cy={0.28} />
            <circle r={1.32} fill="#f8fafc" stroke="#0f172a" strokeWidth={0.34} />
            <circle r={0.46} fill="#0f172a" />
          </g>
        )}

        {/* Player tokens */}
        <g>
          {diagram.players.map((player) => {
            const isHome = player.team === 'home';
            const isSelected = Boolean(selectedSlot && isHome && player.slot === selectedSlot);
            const isHighlighted = Boolean(player.highlight || isSelected);
            const canSelect = Boolean(onSelectSlot && isHome);
            const px = clamp(player.x, 1.5, PITCH_LENGTH - 1.5);
            const py = clamp(player.y, 1.5, PITCH_WIDTH - 1.5);

            // Place sublabel above token if near bottom touchline so it never clips.
            const sublabelAbove = py > PITCH_WIDTH - 8.5;
            const subText = player.sublabel;
            const subEstW = subText ? clamp(subText.length * 1.18 + 2.0, 5.5, 22) : 0;
            // Offset sublabel horizontally inside token local coords if token is very close to left/right edge.
            const desiredAbsX = clamp(px, subEstW / 2 - 1.5, PITCH_LENGTH - subEstW / 2 + 1.5);
            const subDx = desiredAbsX - px;
            const subDy = sublabelAbove ? -(tokenR + 2.3) : tokenR + 2.55;

            const fill = isHome
              ? isSelected
                ? '#065f46'
                : '#0e1513'
              : '#261217';
            const stroke = isHome
              ? isSelected
                ? '#fbbf24'
                : player.highlight
                  ? '#38bdf8'
                  : '#34d399'
              : '#fb7185';

            return (
              <g
                key={player.id}
                className={canSelect ? 'pitch-token pitch-token--interactive' : 'pitch-token'}
                style={{ transform: `translate(${px}px, ${py}px)` }}
                role={canSelect ? 'button' : undefined}
                tabIndex={canSelect ? 0 : undefined}
                aria-pressed={canSelect ? isSelected : undefined}
                aria-label={canSelect ? renderPlayerAriaLabel(player) : undefined}
                onClick={canSelect ? () => onSelectSlot?.(player.slot) : undefined}
                onKeyDown={
                  canSelect
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectSlot?.(player.slot);
                        }
                      }
                    : undefined
                }
              >
                <title>{renderPlayerAriaLabel(player)}</title>

                {/* Focus / selection halo */}
                {isHighlighted && (
                  <circle
                    r={tokenR + 1.15}
                    fill={
                      isSelected
                        ? 'rgba(251, 191, 36, 0.24)'
                        : 'rgba(56, 189, 248, 0.22)'
                    }
                    stroke={isSelected ? 'rgba(251, 191, 36, 0.75)' : 'rgba(56, 189, 248, 0.6)'}
                    strokeWidth={0.32}
                  />
                )}

                {/* Subtle drop shadow */}
                <circle r={tokenR} cy={0.35} fill="rgba(2, 6, 23, 0.45)" />

                {/* Token body */}
                <circle
                  className="pitch-token-body"
                  r={tokenR}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isHighlighted ? 0.62 : 0.48}
                />

                {/* Role / slot abbreviation */}
                <text
                  y={0.68}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize={tokenFontSize(player.label, compact)}
                  fontWeight={700}
                  letterSpacing={0.04}
                  pointerEvents="none"
                >
                  {player.label}
                </text>

                {/* Clamped sublabel pill */}
                {subText && !compact && (
                  <g transform={`translate(${subDx}, ${subDy})`} pointerEvents="none">
                    <rect
                      x={-subEstW / 2}
                      y={-1.55}
                      width={subEstW}
                      height={2.6}
                      rx={0.7}
                      fill="rgba(11, 17, 22, 0.82)"
                    />
                    <text
                      y={0.35}
                      textAnchor="middle"
                      fill="#e2e8f0"
                      fontSize={1.65}
                      fontWeight={600}
                    >
                      {subText}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
