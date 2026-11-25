import { useState } from 'react';
import { Arrow, COLORS, Pitch, Player, Zone, type Pt } from '../../components/pitch/Pitch';
import { SwitchField } from '../controls';
import { Frame, type Tone } from '../Frame';

type Key = 'near' | 'centre' | 'far' | 'late';

interface Run {
  label: string;
  switchLabel: string;
  from: Pt;
  to: Pt;
  zone: { x: number; y: number; w: number; h: number };
  late?: boolean;
}

// The crosser is on the attacking team's left wing (top of the picture); the near post is the one on his side.
const CROSSER: Pt = { x: 95, y: 5 };
const RUNS: Record<Key, Run> = {
  near: { label: 'Near', switchLabel: 'Near post', from: { x: 84, y: 22 }, to: { x: 101, y: 28.5 }, zone: { x: 99.5, y: 25, w: 5.5, h: 7 } },
  centre: { label: 'Centre', switchLabel: 'Centre', from: { x: 82, y: 34 }, to: { x: 95, y: 34 }, zone: { x: 91, y: 30, w: 8, h: 8 } },
  far: { label: 'Far', switchLabel: 'Far post', from: { x: 84, y: 46 }, to: { x: 101, y: 41 }, zone: { x: 98, y: 37.5, w: 7, h: 7.5 } },
  late: { label: 'Late', switchLabel: 'Arrive late', from: { x: 68, y: 36 }, to: { x: 87, y: 40 }, zone: { x: 82, y: 35.5, w: 8.5, h: 9 }, late: true },
};
const KEYS = Object.keys(RUNS) as Key[];

export default function BoxBoard() {
  const [on, setOn] = useState<Record<Key, boolean>>({ near: true, centre: false, far: true, late: false });
  const active = KEYS.filter((k) => on[k]);
  const n = active.length;

  let tone: Tone;
  let verdict: string;
  if (n === 0) {
    tone = 'bad';
    verdict = 'nobody attacks the cross';
  } else if (n === 1) {
    tone = 'warn';
    verdict = 'a single target is easy to defend';
  } else if (n <= 3) {
    tone = 'good';
    verdict = 'recommended';
  } else {
    tone = 'warn';
    verdict = 'too many: fewer players left to defend a counter';
  }

  return (
    <Frame
      half
      caption="A cross comes in from the left wing. Switch on a box instruction and a runner appears with his target zone: dashed grey is where he starts, solid blue is where he ends up."
      controls={KEYS.map((k) => (
        <SwitchField key={k} label={RUNS[k].switchLabel} checked={on[k]} onChange={(c) => setOn((s) => ({ ...s, [k]: c }))} />
      ))}
      readout={{ text: `Players attacking the box: ${n} — recommended 2–3 (${verdict}).`, tone }}
      legend={[
        { color: COLORS.home, label: 'Attacker (end of run)' },
        { color: COLORS.before, label: 'Attacker (start of run)', hollow: true },
        { color: COLORS.zone, label: 'Target zone', square: true },
        { color: COLORS.focus, label: 'Crosser', hollow: true },
      ]}
    >
      <Pitch half="att" title="Final third with a cross from the left wing and the box-attacking runs switched on">
        <Player at={CROSSER} label="Cross" focus />
        {active.map((k) => {
          const r = RUNS[k];
          const mid = { x: r.zone.x + r.zone.w / 2, y: r.zone.y + r.zone.h / 2 };
          return (
            <g key={k}>
              <Zone {...r.zone} color={COLORS.zone} opacity={0.22} />
              <Arrow from={{ x: CROSSER.x + 1.5, y: CROSSER.y + 1.2 }} to={mid} color={COLORS.focus} dashed width={0.3} />
              <Player at={r.from} color={COLORS.before} hollow />
              <Arrow from={r.from} to={{ x: r.to.x - 1.6 * Math.sign(r.to.x - r.from.x), y: r.to.y }} color={COLORS.home} dashed={r.late} />
              <Player at={r.to} label={r.label} />
            </g>
          );
        })}
      </Pitch>
    </Frame>
  );
}
