import { useState } from 'react';
import { COLORS, Pitch, type Pt } from '../../components/pitch/Pitch';
import { SegmentedField } from '../controls';
import { Frame, type Tone } from '../Frame';
import { dist, slots } from '../geometry';

// Distance above which a player's two spots are flagged. The game's real warning threshold is not published.
const WARN_M = 25;

const IP = slots('4-3-3 DM Wide');
const OOP_SHAPES = {
  '441': slots('4-1-4-1 DM Wide'),
  '541': slots('5-4-1'),
};
type OopShape = keyof typeof OOP_SHAPES;

// [IP slot, OOP slot in 4-1-4-1 DM Wide, OOP slot in 5-4-1, name]
const PLAYERS: Array<[string, string, string, string]> = [
  ['GK', 'GK', 'GK', 'Goalkeeper'],
  ['DL', 'DL', 'WBL', 'Left full-back'],
  ['DCL', 'DCL', 'DCL', 'Left centre-back'],
  ['DCR', 'DCR', 'DCR', 'Right centre-back'],
  ['DR', 'DR', 'WBR', 'Right full-back'],
  ['DM', 'DM', 'DC', 'Defensive midfielder'],
  ['MCL', 'MCL', 'MCL', 'Left central midfielder'],
  ['MCR', 'MCR', 'MCR', 'Right central midfielder'],
  ['AML', 'ML', 'ML', 'Left winger'],
  ['AMR', 'MR', 'MR', 'Right winger'],
  ['ST', 'ST', 'ST', 'Striker'],
];

const move = (p: Pt) => ({ transform: `translate(${p.x}px, ${p.y}px)` });

export default function IpOopBoard() {
  const [phase, setPhase] = useState<'ip' | 'oop'>('ip');
  const [shape, setShape] = useState<OopShape>('441');
  const oop = OOP_SHAPES[shape];

  const rows = PLAYERS.map(([ipCode, oop441, oop541, name]) => {
    const oopCode = shape === '441' ? oop441 : oop541;
    const ip = IP[ipCode];
    const out = oop[oopCode];
    return { ipCode, oopCode, name, ip, out, d: dist(ip, out) };
  });
  const far = rows.filter((r) => r.d > WARN_M).sort((a, b) => b.d - a.d);
  const longest = rows.reduce((a, b) => (b.d > a.d ? b : a));

  let tone: Tone;
  let readout: string;
  if (far.length) {
    tone = 'bad';
    readout = `${far.map((r) => `${r.name} ${Math.round(r.d)} m`).join(', ')} — more than ${WARN_M} m between the two positions: the game warns about this, and it leaves holes in transitions.`;
  } else {
    tone = 'good';
    readout = `Longest IP↔OOP move: ${longest.name}, ${Math.round(longest.d)} m — close enough that transitions stay connected.`;
  }

  return (
    <Frame
      caption={`The same 11 players in possession (4-3-3 DM Wide) and out of possession. Dashed circles show where each player stands in the other phase. A red ring marks a move of more than ${WARN_M} m (a rule of thumb, not the game's exact threshold).`}
      controls={
        <>
          <SegmentedField
            label="Phase"
            value={phase}
            options={[
              { value: 'ip', label: 'In possession' },
              { value: 'oop', label: 'Out of possession' },
            ]}
            onChange={setPhase}
          />
          <SegmentedField
            label="Out-of-possession shape"
            value={shape}
            options={[
              { value: '441', label: '4-1-4-1 DM Wide' },
              { value: '541', label: '5-4-1' },
            ]}
            onChange={setShape}
          />
        </>
      }
      readout={{ text: readout, tone }}
      legend={[
        { color: COLORS.home, label: 'Player now' },
        { color: COLORS.before, label: 'Same player in the other phase', hollow: true },
        { color: COLORS.bad, label: `Moves more than ${WARN_M} m`, hollow: true },
      ]}
    >
      <Pitch title="The same eleven players shown in their in-possession and out-of-possession positions">
        {rows.map((r) => (
          <line key={`l${r.ipCode}`} x1={r.ip.x} y1={r.ip.y} x2={r.out.x} y2={r.out.y} stroke={r.d > WARN_M ? COLORS.bad : COLORS.before} strokeWidth={0.3} strokeDasharray="0.8 0.6" />
        ))}
        {rows.map((r) => (
          <g key={`g${r.ipCode}`} className="board-mover" style={move(phase === 'ip' ? r.out : r.ip)}>
            <circle r={1.4} fill="none" stroke={COLORS.before} strokeWidth={0.4} strokeDasharray="0.8 0.5" />
          </g>
        ))}
        {rows.map((r) => {
          const here = phase === 'ip' ? r.ip : r.out;
          const code = phase === 'ip' ? r.ipCode : r.oopCode;
          return (
            <g key={`p${r.ipCode}`} className="board-mover" style={move(here)}>
              {r.d > WARN_M && <circle r={3.4} fill={COLORS.bad} fillOpacity={0.15} stroke={COLORS.bad} strokeWidth={0.4} strokeDasharray="1 0.6" />}
              <circle r={1.4} fill={COLORS.home} stroke="#0b1410" strokeWidth={0.25} />
              <text y={3.6} textAnchor="middle" fontSize={2.1} fontWeight={600} fill="#fff" stroke="#0b1410" strokeWidth={0.5} paintOrder="stroke">
                {code}
              </text>
            </g>
          );
        })}
      </Pitch>
    </Frame>
  );
}
