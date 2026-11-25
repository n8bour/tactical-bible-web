import { useState } from 'react';
import { Arrow, COLORS, Pitch, Player, WID, type Pt } from '../../components/pitch/Pitch';
import { SliderField } from '../controls';
import { Frame, type Tone } from '../Frame';

// Same values as the simulation's Line of Engagement and Defensive Line options (metres from our own goal line).
const LOE = [40, 56, 72];
const LOE_NAMES = ['Low Block', 'Mid Block', 'High Press'];
const LINE = [22, 28, 34, 40, 46];
const LINE_NAMES = ['Much Lower', 'Lower', 'Standard', 'Higher', 'Much Higher'];

const BACK_Y = [6.8, 24.5, 43.5, 61.2];
const MID_Y = [6.8, 25.8, 42.2, 61.2];
const FWD_Y = [27, 41];

const label = { fontSize: 2, fontWeight: 600, stroke: '#0b1410', strokeWidth: 0.45, paintOrder: 'stroke' } as const;

export default function PressCohBoard() {
  const [loe, setLoe] = useState(1);
  const [line, setLine] = useState(2);

  const loeX = LOE[loe];
  const lineX = LINE[line];
  const gap = loeX - lineX;
  const front = Math.max(loeX, lineX + 3);
  const mid = (lineX + front) / 2;
  const highLine = line >= 3;
  const spaceBetween = gap > 25;

  let tone: Tone;
  let verdict: string;
  if (gap < 0) {
    tone = 'bad';
    verdict = 'the back line is ahead of the press: space in behind and nobody pressing the pass';
  } else if (gap > 25) {
    tone = 'bad';
    verdict = 'too big: space between the lines';
  } else if (gap < 12) {
    tone = 'good';
    verdict = 'compact';
  } else {
    tone = 'good';
    verdict = 'workable';
  }
  const behind = highLine ? ` High line: ${lineX} m of pitch behind it — needs quick centre-backs and a sweeper keeper.` : '';
  const readout = `Gap between the lines: ${gap} m — ${verdict}.${behind}`;

  const gapColor = gap < 0 || spaceBetween ? COLORS.bad : gap < 12 ? COLORS.good : COLORS.zone;
  const gapX = Math.min(lineX, loeX);
  const passer: Pt = { x: front + 10, y: WID / 2 };

  return (
    <Frame
      caption="Our team (blue) defends the goal on the left. Move the two lines: the shaded band is the space the opponent (red) can use between our lines."
      controls={
        <>
          <SliderField label="Line of Engagement" value={loe} min={0} max={2} valueText={`${LOE_NAMES[loe]} (${loeX} m)`} onChange={setLoe} />
          <SliderField label="Defensive Line" value={line} min={0} max={4} valueText={`${LINE_NAMES[line]} (${lineX} m)`} onChange={setLine} />
        </>
      }
      readout={{ text: readout, tone }}
      legend={[
        { color: COLORS.home, label: 'Our team' },
        { color: COLORS.away, label: 'Opponent' },
        { color: gapColor, label: 'Space between the lines', square: true },
        { color: COLORS.bad, label: 'Space behind a high line', square: true },
      ]}
    >
      <Pitch title="Defensive block with the line of engagement and the defensive line drawn as vertical lines">
        {highLine && <rect x={0} y={0} width={lineX} height={WID} fill={COLORS.bad} fillOpacity={0.1} />}
        {gap !== 0 && <rect x={gapX} y={0} width={Math.abs(gap)} height={WID} fill={gapColor} fillOpacity={0.22} />}

        <line x1={lineX} y1={0} x2={lineX} y2={WID} stroke={COLORS.home} strokeWidth={0.5} />
        <text x={lineX - 0.8} y={WID - 1.2} textAnchor="end" fill={COLORS.home} {...label}>
          Defensive line · {lineX} m
        </text>
        <line x1={loeX} y1={0} x2={loeX} y2={WID} stroke="#fff" strokeWidth={0.5} strokeDasharray="1.2 0.8" />
        <text x={loeX + 0.8} y={2.6} fill="#fff" {...label}>
          Line of engagement · {loeX} m
        </text>

        <Player at={{ x: 4.2, y: 34 }} label="GK" />
        {BACK_Y.map((y, i) => <Player key={`b${i}`} at={{ x: lineX, y }} />)}
        {MID_Y.map((y, i) => <Player key={`m${i}`} at={{ x: mid, y }} />)}
        {FWD_Y.map((y, i) => <Player key={`f${i}`} at={{ x: front, y }} />)}

        {(spaceBetween || highLine) && (
          <>
            <Player at={passer} color={COLORS.away} label="Ball" />
            {spaceBetween && (
              <>
                <Arrow from={{ x: passer.x - 1.6, y: passer.y }} to={{ x: mid + 2, y: WID / 2 }} color={COLORS.away} dashed />
                <Player at={{ x: mid, y: WID / 2 }} color={COLORS.away} label="Free" />
              </>
            )}
            {highLine && (
              <>
                <Arrow from={{ x: passer.x - 1.4, y: passer.y + 1 }} to={{ x: Math.max(lineX - 10, 12) + 1.6, y: 53 }} color={COLORS.away} dashed />
                <Player at={{ x: Math.max(lineX - 10, 12), y: 54 }} color={COLORS.away} label="Runner" />
              </>
            )}
          </>
        )}
      </Pitch>
    </Frame>
  );
}
