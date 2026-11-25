import { Arrow, COLORS, LEN, Pitch, Player, Zone, WID, type Pt } from '../../components/pitch/Pitch';
import { Frame } from '../Frame';
import { slots } from '../geometry';

const S = slots('4-3-3 DM Wide');

interface Move {
  label: string;
  from: Pt;
  to: Pt;
}

// Left (top of the picture): a safe, inverted full-back and a winger on the touchline.
// Right (bottom): an attacking wing-back for width, with the winger cutting inside.
const MOVES: Move[] = [
  { label: 'IFB', from: S.DL, to: { x: 42, y: 24 } },
  { label: 'AWB', from: S.DR, to: { x: 66, y: 62 } },
  { label: 'IW', from: S.AMR, to: { x: 82, y: 46 } },
];
const STAY: Array<[string, Pt, string?]> = [
  ['GK', S.GK, 'GK'],
  ['DCL', S.DCL, 'CB'],
  ['DCR', S.DCR, 'CB'],
  ['DM', S.DM, 'DM'],
  ['MCL', S.MCL, 'CM'],
  ['MCR', S.MCR, 'CM'],
  ['AML', S.AML, 'W'],
  ['ST', S.ST, 'ST'],
];

export default function AsymmetryBoard() {
  return (
    <Frame
      caption="Different roles on each side are not a flaw. The left side is the safe one (inverted full-back plus a winger); the right side attacks (wing-back for width, winger cutting inside). Put the attacking side on your best player's flank."
      legend={[
        { color: COLORS.home, label: 'Player now' },
        { color: COLORS.before, label: 'Starting slot', hollow: true },
      ]}
    >
      <Pitch title="Asymmetric attacking structure: an inverted full-back on one side and an advanced wing-back on the other">
        <Zone x={0} y={0.4} w={LEN} h={WID / 2 - 0.4} color={COLORS.home} opacity={0.08} label="Safe side: inverted full-back + winger" />
        <Zone x={0} y={WID / 2} w={LEN} h={WID / 2 - 0.4} color={COLORS.zone} opacity={0.1} label="Attacking side: wing-back + inside winger (best player here)" />
        {MOVES.map((m) => (
          <g key={m.label}>
            <Player at={m.from} color={COLORS.before} hollow />
            <Arrow from={m.from} to={{ x: m.to.x - 1.6 * Math.sign(m.to.x - m.from.x), y: m.to.y - 0.9 * Math.sign(m.to.y - m.from.y) }} color={COLORS.focus} />
            <Player at={m.to} label={m.label} focus />
          </g>
        ))}
        {STAY.map(([id, at, label]) => (
          <Player key={id} at={at} label={label} />
        ))}
      </Pitch>
    </Frame>
  );
}
