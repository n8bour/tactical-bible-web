import { useState } from 'react';
import { COLORS, Pitch, Player, Zone, type Pt } from '../../components/pitch/Pitch';
import { SegmentedField, SliderField } from '../controls';
import { Frame, type Tone } from '../Frame';
import { LANE_H, LANE_NAMES, laneOf, slots, spread } from '../geometry';

const SHAPE = slots('4-3-3 DM Wide');
// Same scale as the simulation's Attacking Width option (lateral spread multiplier).
const SCALE = [0.68, 0.84, 1.0, 1.12, 1.24];
const WIDTH_NAMES = ['Much Narrower', 'Narrower', 'Balanced', 'Wider', 'Much Wider'];

interface Dot {
  at: Pt;
  label: string;
  focus?: boolean;
  /** Counts as a player in the final third for lane occupancy. */
  attacking: boolean;
}

function shape(k: number, winger: 'wide' | 'inside', fullBack: 'back' | 'overlap'): Dot[] {
  const y = (v: number) => spread(v, k);
  const dots: Dot[] = [
    { at: { x: 60, y: y(SHAPE.DM.y) }, label: 'DM', attacking: false },
    { at: { x: 73, y: y(SHAPE.MCL.y) }, label: 'CM', attacking: true },
    { at: { x: 73, y: y(SHAPE.MCR.y) }, label: 'CM', attacking: true },
    { at: { x: 98, y: 34 }, label: 'ST', attacking: true },
    // The right flank is the reference: a winger on the touchline with the full-back tucked inside.
    { at: { x: 91, y: y(SHAPE.AMR.y) }, label: 'W', attacking: true },
    { at: { x: 62, y: y(46) }, label: 'FB', attacking: false },
    // The left flank is yours to change.
    { at: { x: 91, y: y(winger === 'wide' ? SHAPE.AML.y : 24) }, label: winger === 'wide' ? 'W' : 'IW', focus: true, attacking: true },
    fullBack === 'overlap'
      ? { at: { x: winger === 'wide' ? 80 : 84, y: y(4) }, label: 'FB', focus: true, attacking: true }
      : { at: { x: 52, y: y(SHAPE.DL.y) }, label: 'FB', focus: true, attacking: false },
  ];
  return dots;
}

export default function WidthBoard() {
  const [w, setW] = useState(2);
  const [winger, setWinger] = useState<'wide' | 'inside'>('wide');
  const [fullBack, setFullBack] = useState<'back' | 'overlap'>('back');

  const dots = shape(SCALE[w], winger, fullBack);
  const counts = [0, 0, 0, 0, 0];
  for (const d of dots) if (d.attacking) counts[laneOf(d.at.y)]++;
  const occupied = counts.filter((c) => c > 0).length;

  const issues: string[] = [];
  if (counts[0] === 0 && counts[4] === 0) issues.push('no width on either flank');
  else if (counts[0] === 0) issues.push('no width on the left');
  else if (counts[4] === 0) issues.push('no width on the right');
  if (counts[0] > 1) issues.push('crowded: two players in the left wide lane');
  if (counts[4] > 1) issues.push('crowded: two players in the right wide lane');
  const tone: Tone = issues.length ? 'bad' : 'good';
  const readout = `Lanes occupied: ${occupied} of 5 — ${issues.length ? issues.join('; ') : 'one player gives width on each flank'}`;

  const laneState = (i: number): { color: string; opacity: number; note?: string } => {
    const wide = i === 0 || i === 4;
    if (wide && counts[i] === 0) return { color: COLORS.bad, opacity: 0.3, note: 'NO WIDTH' };
    if (wide && counts[i] > 1) return { color: COLORS.bad, opacity: 0.3, note: 'CROWDED' };
    if (counts[i] > 0) return { color: COLORS.good, opacity: 0.12 };
    return { color: COLORS.before, opacity: 0.08 };
  };

  return (
    <Frame
      half
      caption="The five lanes across the pitch. Red lanes are a problem: a wide lane with nobody in it, or with two players fighting for it. The yellow-ringed players are the ones you are changing on the left."
      controls={
        <>
          <SliderField label="Attacking Width" value={w} min={0} max={4} valueText={`${WIDTH_NAMES[w]} (×${SCALE[w].toFixed(2)})`} onChange={setW} />
          <SegmentedField
            label="Left winger"
            value={winger}
            options={[
              { value: 'wide', label: 'Stays wide' },
              { value: 'inside', label: 'Comes inside' },
            ]}
            onChange={setWinger}
          />
          <SegmentedField
            label="Left full-back"
            value={fullBack}
            options={[
              { value: 'back', label: 'Stays back' },
              { value: 'overlap', label: 'Overlaps' },
            ]}
            onChange={setFullBack}
          />
        </>
      }
      readout={{ text: readout, tone }}
      legend={[
        { color: COLORS.home, label: 'Attacking team (home)' },
        { color: COLORS.focus, label: 'Left flank players you control', hollow: true },
        { color: COLORS.bad, label: 'Lane problem', square: true },
        { color: COLORS.good, label: 'Lane in use', square: true },
      ]}
    >
      <Pitch half="att" title="Attacking shape in the final third split into five vertical lanes">
        {LANE_NAMES.map((name, i) => {
          const s = laneState(i);
          return (
            <g key={i}>
              <Zone x={51} y={i * LANE_H} w={53.5} h={LANE_H} color={s.color} opacity={s.opacity} />
              <text x={52} y={i * LANE_H + LANE_H / 2 + 0.7} fontSize={1.9} fontWeight={600} fill="#fff" stroke="#0b1410" strokeWidth={0.45} paintOrder="stroke">
                {name}
              </text>
              {s.note && (
                <text x={103.8} y={i * LANE_H + LANE_H / 2 + 0.7} textAnchor="end" fontSize={2.2} fontWeight={700} fill={COLORS.bad} stroke="#0b1410" strokeWidth={0.5} paintOrder="stroke">
                  {s.note}
                </text>
              )}
            </g>
          );
        })}
        <text x={103.8} y={-0.9} textAnchor="end" fontSize={1.8} fill="#fff" opacity={0.8}>
          Attacking left to right · top = the team's left
        </text>
        {dots.map((d, i) => (
          <Player key={i} at={d.at} label={d.label} focus={d.focus} color={COLORS.home} />
        ))}
      </Pitch>
    </Frame>
  );
}
