import { useState } from 'react';
import { Arrow, COLORS, Pitch, Player, WID, Zone, type Pt } from '../../components/pitch/Pitch';
import { SliderField } from '../controls';
import { Frame, type Tone } from '../Frame';
import { slots } from '../geometry';

const S = slots('4-3-3 DM Wide');

interface Role {
  code: string;
  label?: string;
  stay: Pt;
  /** Where the player is when he joins the attack; centre-backs never do. */
  go?: Pt;
}

// Who stays behind the ball, in order: centre-backs first, then the DM, then full-backs.
const ORDER: Role[] = [
  { code: 'DCL', label: 'CB', stay: { x: 46, y: S.DCL.y } },
  { code: 'DCR', label: 'CB', stay: { x: 46, y: S.DCR.y } },
  { code: 'DM', label: 'DM', stay: { x: 56, y: S.DM.y }, go: { x: 70, y: S.DM.y } },
  { code: 'DR', label: 'FB', stay: { x: 50, y: S.DR.y }, go: { x: 90, y: 63 } },
  { code: 'DL', label: 'FB', stay: { x: 50, y: S.DL.y }, go: { x: 90, y: 5 } },
];
const ATTACKERS: Pt[] = [
  { x: 80, y: S.MCL.y },
  { x: 80, y: S.MCR.y },
  { x: 95, y: 16 },
  { x: 95, y: 52 },
  { x: 99, y: 34 },
];

const HALF_COVER = 6; // a player behind the ball covers about 12 m of width
const MIN_CHANNEL = 6; // narrower gaps are too tight for a runner to use

function openChannels(ys: number[]): Array<[number, number]> {
  const covered = ys.map((y): [number, number] => [y - HALF_COVER, y + HALF_COVER]).sort((a, b) => a[0] - b[0]);
  const open: Array<[number, number]> = [];
  let edge = 0;
  for (const [a, b] of covered) {
    if (a - edge >= MIN_CHANNEL) open.push([edge, a]);
    edge = Math.max(edge, b);
  }
  if (WID - edge >= MIN_CHANNEL) open.push([edge, WID]);
  return open.map(([a, b]) => [Math.max(a, 0), Math.min(b, WID)]);
}

export default function RestDefBoard() {
  const [n, setN] = useState(3);
  const behind = ORDER.slice(0, n);
  const channels = openChannels(behind.map((r) => r.stay.y));
  const widest = channels.reduce<[number, number] | null>((a, c) => (!a || c[1] - c[0] > a[1] - a[0] ? c : a), null);

  const tone: Tone = n < 3 ? 'bad' : 'good';
  const verdict = n < 3 ? 'too few: the counter-attack has free lanes' : n >= 5 ? 'safe, but only 5 players are left to attack' : 'recommended';
  const readout = `Rest-defence: ${n} + GK — recommended 3–5 (${verdict}). Open counter channels: ${channels.length}.`;

  return (
    <Frame
      caption="Our team (blue) attacks in the opponent's third. The yellow-ringed players stay behind the ball; the red bands are lanes a counter-attack can run down unopposed."
      controls={<SliderField label="Players behind the ball" value={n} min={2} max={5} valueText={`${n} (+ goalkeeper)`} onChange={setN} />}
      readout={{ text: readout, tone }}
      legend={[
        { color: COLORS.home, label: 'Attacking players' },
        { color: COLORS.focus, label: 'Rest-defence (behind the ball)', hollow: true },
        { color: COLORS.bad, label: 'Open counter channel', square: true },
        { color: COLORS.away, label: 'Opponent counter-attacker' },
      ]}
    >
      <Pitch title="Attacking team with some players held back as rest-defence and the uncovered counter-attack channels shaded">
        {channels.map(([a, b]) => (
          <Zone key={a} x={20} y={a} w={42} h={b - a} color={COLORS.bad} opacity={0.28} label="Open" />
        ))}
        <Player at={S.GK} label="GK" />
        {ORDER.map((r, i) => {
          const stays = i < n;
          return <Player key={r.code} at={stays ? r.stay : (r.go as Pt)} label={r.label} focus={stays} />;
        })}
        {ATTACKERS.map((p, i) => (
          <Player key={i} at={p} />
        ))}
        <circle cx={96.6} cy={34} r={0.9} fill="#fff" stroke="#0b1410" strokeWidth={0.2} />
        {widest && (
          <>
            <Player at={{ x: 66, y: (widest[0] + widest[1]) / 2 }} color={COLORS.away} label="Counter" />
            <Arrow from={{ x: 64, y: (widest[0] + widest[1]) / 2 }} to={{ x: 22, y: (widest[0] + widest[1]) / 2 }} color={COLORS.away} dashed />
          </>
        )}
      </Pitch>
    </Frame>
  );
}
