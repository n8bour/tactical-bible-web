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

interface LabelBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function buildOccupiedBoxes(players: readonly PitchPlayerToken[], compact: boolean): LabelBox[] {
  const boxes: LabelBox[] = [];
  for (const p of players) {
    const px = clamp(p.x, 1.5, PITCH_LENGTH - 1.5);
    const py = clamp(p.y, 1.5, PITCH_WIDTH - 1.5);
    boxes.push({ x1: px - 3.5, y1: py - 3.5, x2: px + 3.5, y2: py + 3.5 });
    if (p.sublabel && !compact) {
      const sublabelAbove = py > PITCH_WIDTH - 8.5;
      const subEstW = clamp(p.sublabel.length * 1.18 + 2.0, 5.5, 22);
      const desiredAbsX = clamp(px, subEstW / 2 - 1.5, PITCH_LENGTH - subEstW / 2 + 1.5);
      const subCy = py + (sublabelAbove ? -(2.65 + 2.3) : 3.05 + 2.55);
      boxes.push({
        x1: desiredAbsX - subEstW / 2 - 0.4,
        y1: subCy - 1.7,
        x2: desiredAbsX + subEstW / 2 + 0.4,
        y2: subCy + 1.1,
      });
    }
  }
  return boxes;
}

function boxOverlapArea(a: LabelBox, b: LabelBox): number {
  const ox = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const oy = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  return ox * oy;
}

interface ArrowSeg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function segIntersectsBox(seg: ArrowSeg, box: LabelBox): boolean {
  // Sample 9 points along the segment (fast and accurate for short SVG arrows)
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const x = seg.x1 + (seg.x2 - seg.x1) * t;
    const y = seg.y1 + (seg.y2 - seg.y1) * t;
    if (x >= box.x1 && x <= box.x2 && y >= box.y1 && y <= box.y2) return true;
  }
  return false;
}

function placeLabelBox(
  anchor: { x: number; y: number },
  candidates: readonly { x: number; y: number }[],
  width: number,
  height: number,
  occupied: LabelBox[],
  arrowSegs: readonly ArrowSeg[],
): { x: number; y: number } {
  const halfW = width / 2;
  const halfH = height / 2;
  let best = {
    x: clamp(anchor.x, halfW + 1, PITCH_LENGTH - halfW - 1),
    y: clamp(anchor.y, halfH + 1.2, PITCH_WIDTH - halfH - 1.2),
  };
  let bestOverlap = Infinity;
  let bestArrowHits = Infinity;
  let bestAnchorDist = Infinity;

  const tryCandidates = (list: readonly { x: number; y: number }[]) => {
    for (const cand of list) {
      const cx = clamp(cand.x, halfW + 1, PITCH_LENGTH - halfW - 1);
      const cy = clamp(cand.y, halfH + 1.2, PITCH_WIDTH - halfH - 1.2);
      const box: LabelBox = {
        x1: cx - halfW - 0.35,
        y1: cy - halfH - 0.35,
        x2: cx + halfW + 0.35,
        y2: cy + halfH + 0.35,
      };
      let totalOverlap = 0;
      for (const occ of occupied) {
        totalOverlap += boxOverlapArea(box, occ);
      }
      let arrowHits = 0;
      for (const seg of arrowSegs) {
        if (segIntersectsBox(seg, box)) arrowHits += 1;
      }
      const anchorDist = Math.hypot(cx - anchor.x, cy - anchor.y);

      const betterOverlap = totalOverlap < bestOverlap - 0.05;
      const sameOverlap = Math.abs(totalOverlap - bestOverlap) <= 0.05;
      const betterArrows = sameOverlap && arrowHits < bestArrowHits;
      const sameArrows = sameOverlap && arrowHits === bestArrowHits;
      const closerToAnchor = sameArrows && anchorDist < bestAnchorDist;

      if (betterOverlap || betterArrows || closerToAnchor) {
        bestOverlap = totalOverlap;
        bestArrowHits = arrowHits;
        bestAnchorDist = anchorDist;
        best = { x: cx, y: cy };
      }
    }
  };

  tryCandidates(candidates);

  // Local tight fallback ring only (max ~7.5 units) so labels never detach onto another player's arrow
  if (bestOverlap > 0.05) {
    const localRing: { x: number; y: number }[] = [];
    for (const dy of [-3.5, 3.5, -5.8, 5.8]) {
      for (const dx of [0, -4.5, 4.5, -8.5, 8.5]) {
        localRing.push({ x: anchor.x + dx, y: anchor.y + dy });
      }
    }
    tryCandidates(localRing);
  }

  occupied.push({
    x1: best.x - halfW - 0.35,
    y1: best.y - halfH - 0.35,
    x2: best.x + halfW + 0.35,
    y2: best.y + halfH + 0.35,
  });
  return best;
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
  const lineBadges: {
    line: PitchLine;
    x: number;
    estWidth: number;
    badgeX: number;
    badgeY: number;
  }[] = [];
  for (const line of diagram.lines ?? []) {
    const x = clamp(line.x, 1.5, PITCH_LENGTH - 1.5);
    const estWidth = clamp(line.label.length * 1.35 + 3.4, 10, 32);
    const badgeX = clamp(x, estWidth / 2 + 0.8, PITCH_LENGTH - estWidth / 2 - 0.8);
    const overlapsPrev = lineBadges.some(
      (prev) =>
        prev.badgeY < 5 &&
        Math.abs(prev.badgeX - badgeX) < (prev.estWidth + estWidth) / 2 + 1.5,
    );
    const badgeY = overlapsPrev ? 6.8 : 2.8;
    lineBadges.push({ line, x, estWidth, badgeX, badgeY });
  }

  // Precompute non-overlapping label positions for highlights and arrows
  const occupied = buildOccupiedBoxes(diagram.players, compact);
  for (const lb of lineBadges) {
    occupied.push({
      x1: lb.badgeX - lb.estWidth / 2,
      y1: lb.badgeY - 1.75,
      x2: lb.badgeX + lb.estWidth / 2,
      y2: lb.badgeY + 1.45,
    });
  }

  const arrowGeoms = diagram.arrows.map((arrow) => ({
    arrow,
    geom: shortenArrow(arrow, tokenR * 0.72, tokenR * 0.55),
  }));
  const allArrowSegs: ArrowSeg[] = arrowGeoms
    .filter((a): a is { arrow: PitchArrow; geom: NonNullable<typeof a.geom> } => Boolean(a.geom))
    .map(({ geom }) => ({ x1: geom.x1, y1: geom.y1, x2: geom.x2, y2: geom.y2 }));

  const placedHighlights = (diagram.highlights ?? []).map((hl) => {
    const stroke =
      hl.kind === 'press'
        ? 'rgba(251, 113, 133, 0.62)'
        : hl.kind === 'target'
          ? 'rgba(251, 191, 36, 0.72)'
          : 'rgba(56, 189, 248, 0.54)';
    const fill =
      hl.kind === 'press'
        ? 'rgba(251, 113, 133, 0.14)'
        : hl.kind === 'target'
          ? 'rgba(251, 191, 36, 0.16)'
          : 'rgba(56, 189, 248, 0.14)';
    if (!hl.label || compact) {
      return { hl, fill, stroke, labelPos: null as { x: number; y: number; estWidth: number } | null };
    }
    const estWidth = clamp(hl.label.length * 1.28 + 3.2, 10, 30);
    const halfW = estWidth / 2;
    const pos = placeLabelBox(
      { x: hl.x, y: hl.y - hl.r - 2.0 },
      [
        { x: hl.x, y: hl.y - hl.r - 2.0 },
        { x: hl.x, y: hl.y + hl.r + 2.2 },
        { x: hl.x + hl.r + halfW + 1.4, y: hl.y },
        { x: hl.x - hl.r - halfW - 1.4, y: hl.y },
        { x: hl.x - halfW * 0.6, y: hl.y - hl.r - 2.2 },
        { x: hl.x + halfW * 0.6, y: hl.y + hl.r + 2.4 },
      ],
      estWidth,
      2.85,
      occupied,
      allArrowSegs,
    );
    return { hl, fill, stroke, labelPos: { ...pos, estWidth } };
  });

  const placedArrows = arrowGeoms.map(({ arrow, geom }) => {
    if (!geom) return null;
    const stroke = ARROW_COLOR[arrow.kind];
    const isDashed = arrow.dashed ?? (arrow.kind === 'compare' || arrow.kind === 'press');
    let labelBox: { x: number; y: number; width: number } | null = null;
    if (arrow.label && !compact) {
      const labelW = clamp(arrow.label.length * 1.25 + 2.8, 8, 28);
      const dx = geom.x2 - geom.x1;
      const dy = geom.y2 - geom.y1;
      const len = Math.max(1, Math.hypot(dx, dy));
      const ux = dx / len;
      const uy = dy / len;
      const nx = -uy;
      const ny = ux;
      const anchor = { x: geom.mx, y: geom.my };
      const cands: { x: number; y: number }[] = [];
      for (const t of [0.5, 0.4, 0.6]) {
        const ax = geom.x1 + dx * t;
        const ay = geom.y1 + dy * t;
        cands.push(
          { x: ax + nx * 2.5, y: ay + ny * 2.5 },
          { x: ax - nx * 2.5, y: ay - ny * 2.5 },
          { x: ax, y: ay - 2.6 },
          { x: ax, y: ay + 2.6 },
          { x: ax + nx * 4.2, y: ay + ny * 4.2 },
          { x: ax - nx * 4.2, y: ay - ny * 4.2 },
        );
      }
      const pos = placeLabelBox(anchor, cands, labelW, 2.9, occupied, allArrowSegs);
      labelBox = { x: pos.x, y: pos.y, width: labelW };
    }
    return { arrow, geom, stroke, isDashed, labelBox };
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
        {placedHighlights.length > 0 && (
          <g pointerEvents="none">
            {placedHighlights.map(({ hl, fill, stroke }, idx) => (
              <circle
                key={idx}
                cx={hl.x}
                cy={hl.y}
                r={hl.r}
                fill={fill}
                stroke={stroke}
                strokeWidth={0.36}
                strokeDasharray={hl.kind === 'press' ? '1.5 1.1' : undefined}
              />
            ))}
          </g>
        )}

        {/* Vertical tactical lines (Defensive Line, LoE, Offside) */}
        {lineBadges.length > 0 && (
          <g pointerEvents="none">
            {lineBadges.map(({ line, x }, idx) => (
              <line
                key={`${line.kind}-${idx}`}
                x1={x}
                y1={0.4}
                x2={x}
                y2={PITCH_WIDTH - 0.4}
                stroke={LINE_COLOR[line.kind]}
                strokeWidth={0.42}
                strokeDasharray="2 1.4"
                opacity={0.85}
              />
            ))}
          </g>
        )}

        {/* Arrows (runs, movement, passes, pressing, comparison) */}
        {placedArrows.length > 0 && (
          <g pointerEvents="none">
            {placedArrows.map((item, idx) => {
              if (!item) return null;
              const { arrow, geom, stroke, isDashed } = item;
              return (
                <line
                  key={idx}
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
        {/* Top-most collision-free annotation labels (lines, highlights, arrows) */}
        <g pointerEvents="none">
          {lineBadges.map(({ line, estWidth, badgeX, badgeY }, idx) => {
            const stroke = LINE_COLOR[line.kind];
            return (
              <g key={`line-lbl-${idx}`} transform={`translate(${badgeX}, ${badgeY})`}>
                <rect
                  x={-estWidth / 2}
                  y={-1.75}
                  width={estWidth}
                  height={3.2}
                  rx={0.9}
                  fill="rgba(11, 14, 13, 0.9)"
                  stroke={stroke}
                  strokeWidth={0.25}
                />
                <text
                  y={0.55}
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

          {placedHighlights.map(({ hl, stroke, labelPos }, idx) =>
            hl.label && labelPos ? (
              <g key={`hl-lbl-${idx}`} transform={`translate(${labelPos.x}, ${labelPos.y})`}>
                <rect
                  x={-labelPos.estWidth / 2}
                  y={-1.45}
                  width={labelPos.estWidth}
                  height={2.85}
                  rx={0.8}
                  fill="rgba(11, 14, 13, 0.9)"
                  stroke={stroke}
                  strokeWidth={0.2}
                />
                <text
                  y={0.55}
                  textAnchor="middle"
                  fill="#f0f4f1"
                  fontSize={1.85}
                  fontWeight={600}
                >
                  {hl.label}
                </text>
              </g>
            ) : null,
          )}

          {placedArrows.map((item, idx) =>
            item && item.arrow.label && item.labelBox ? (
              <g
                key={`arr-lbl-${idx}`}
                transform={`translate(${item.labelBox.x}, ${item.labelBox.y})`}
              >
                <rect
                  x={-item.labelBox.width / 2}
                  y={-1.45}
                  width={item.labelBox.width}
                  height={2.9}
                  rx={0.75}
                  fill="rgba(11, 14, 13, 0.9)"
                />
                <text
                  y={0.55}
                  textAnchor="middle"
                  fill={item.stroke}
                  fontSize={1.75}
                  fontWeight={600}
                >
                  {item.arrow.label}
                </text>
              </g>
            ) : null,
          )}
        </g>
      </svg>
    </div>
  );
}
