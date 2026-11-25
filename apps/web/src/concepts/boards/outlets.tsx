import { useState } from 'react';
import { Arrow, COLORS, Pitch, Player, type Pt } from '../../components/pitch/Pitch';
import { SliderField } from '../controls';
import { Frame, type Tone } from '../Frame';

interface Def {
  code: string;
  label?: string;
  block: Pt;
  /** Where the player waits if he is an outlet. */
  outlet?: Pt;
}

// Our 4-2-3-1 in a low block. The first N players with an `outlet` spot (in this order) stay high instead of defending.
const TEAM: Def[] = [
  { code: 'GK', label: 'GK', block: { x: 4.2, y: 34 } },
  { code: 'DL', block: { x: 15, y: 8 } },
  { code: 'DCL', block: { x: 14, y: 26 } },
  { code: 'DCR', block: { x: 14, y: 42 } },
  { code: 'DR', block: { x: 15, y: 60 } },
  { code: 'DML', block: { x: 23, y: 27 } },
  { code: 'DMR', block: { x: 23, y: 41 } },
  { code: 'AMC', block: { x: 27, y: 34 } },
  { code: 'ST', label: 'ST', block: { x: 33, y: 34 }, outlet: { x: 74, y: 34 } },
  { code: 'AML', label: 'W', block: { x: 26, y: 11 }, outlet: { x: 70, y: 9 } },
  { code: 'AMR', label: 'W', block: { x: 26, y: 57 }, outlet: { x: 70, y: 59 } },
];
const OUTLET_ORDER = ['ST', 'AML', 'AMR'];

// The opponent (red) attacks towards x = 0 with all ten outfield players.
const ATTACK: Pt[] = [
  { x: 40, y: 34 }, { x: 46, y: 14 }, { x: 46, y: 34 }, { x: 46, y: 54 },
  { x: 54, y: 26 }, { x: 54, y: 42 },
  { x: 66, y: 8 }, { x: 66, y: 26 }, { x: 66, y: 42 }, { x: 66, y: 60 },
];

export default function OutletsBoard() {
  const [n, setN] = useState(1);
  const outlets = new Set(OUTLET_ORDER.slice(0, n));
  const defending = TEAM.filter((p) => !outlets.has(p.code)).length;

  let tone: Tone;
  let verdict: string;
  if (n === 0) {
    tone = 'warn';
    verdict = 'solid, but no outlet for the counter-attack';
  } else if (n <= 2) {
    tone = 'good';
    verdict = 'a real outlet without leaving the block outnumbered';
  } else {
    tone = 'bad';
    verdict = 'the block is outnumbered';
  }
  const readout = `Defending: ${defending} (incl. GK) vs ${ATTACK.length} attackers — ${verdict}.`;

  return (
    <Frame
      caption="Our block (blue) defends the goal on the left. Outlets stay high and do not defend: they are the target for the counter-attack, but every outlet is one fewer defender."
      controls={<SliderField label="Outlet roles" value={n} min={0} max={3} valueText={`${n} outlet${n === 1 ? '' : 's'}`} onChange={setN} />}
      readout={{ text: readout, tone }}
      legend={[
        { color: COLORS.home, label: 'Defending' },
        { color: COLORS.home, label: 'Outlet (not defending)', hollow: true },
        { color: COLORS.away, label: 'Opponent attackers' },
        { color: COLORS.good, label: 'Counter-attack pass', square: true },
      ]}
    >
      <Pitch title="Low defensive block with some players kept high as counter-attack outlets">
        {ATTACK.map((p, i) => (
          <Player key={i} at={p} color={COLORS.away} />
        ))}
        <circle cx={44.4} cy={34} r={0.9} fill="#fff" stroke="#0b1410" strokeWidth={0.2} />
        {TEAM.map((p) => {
          const spot = outlets.has(p.code) ? p.outlet : undefined;
          if (!spot) return <Player key={p.code} at={p.block} label={p.label} />;
          return (
            <g key={p.code}>
              <g opacity={0.55}>
                <Player at={spot} hollow label="Outlet" />
              </g>
              <Arrow from={{ x: 30, y: 34 + (spot.y - 34) * 0.1 }} to={{ x: spot.x - 2, y: spot.y }} color={COLORS.good} dashed />
            </g>
          );
        })}
        {n > 0 && (
          <text x={74} y={24} textAnchor="middle" fontSize={2} fontWeight={600} fill="#fff" stroke="#0b1410" strokeWidth={0.45} paintOrder="stroke">
            not defending
          </text>
        )}
      </Pitch>
    </Frame>
  );
}
