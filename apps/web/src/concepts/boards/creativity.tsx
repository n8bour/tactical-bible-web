import { Arrow, COLORS, Pitch, Player, type Pt } from '../../components/pitch/Pitch';
import { Frame } from '../Frame';

interface Spot {
  id: string;
  at: Pt;
  label?: string;
  /** Run target for a player who attacks space. */
  run?: Pt;
}

// 4-2-3-1 DM Wide in the final third, in metres (top of the picture = the team's left).
const DLP: Spot = { id: 'dlp', at: { x: 62, y: 26 }, label: 'DLP' };
const DMR: Spot = { id: 'dmr', at: { x: 62, y: 42 } };
const AP: Spot = { id: 'ap', at: { x: 84, y: 34 }, label: 'AP' };
const AML: Spot = { id: 'aml', at: { x: 88, y: 9 }, run: { x: 100, y: 9 } };
const AMR: Spot = { id: 'amr', at: { x: 88, y: 59 }, run: { x: 100, y: 59 } };
const ST: Spot = { id: 'st', at: { x: 94, y: 36 }, label: 'ST', run: { x: 101, y: 31 } };
const ALL = [DLP, DMR, AP, AML, AMR, ST];

const lane = { color: COLORS.focus, width: 0.4 } as const;

function Good() {
  const creators = [DLP, AP];
  return (
    <Pitch half="att" title="One or two creators passing into players who run into space">
      <Arrow from={{ x: DLP.at.x + 1.6, y: DLP.at.y + 0.8 }} to={{ x: AP.at.x - 1.8, y: AP.at.y - 0.8 }} {...lane} />
      <Arrow from={{ x: AP.at.x + 1.2, y: AP.at.y - 1.2 }} to={{ x: 98, y: 12 }} {...lane} />
      <Arrow from={{ x: AP.at.x + 1.2, y: AP.at.y + 1.2 }} to={{ x: 98, y: 56 }} {...lane} />
      <Arrow from={{ x: AP.at.x + 1.8, y: AP.at.y + 0.6 }} to={{ x: 99, y: 32 }} {...lane} />
      {ALL.filter((s) => s.run).map((s) => (
        <Arrow key={s.id} from={s.at} to={s.run as Pt} color={COLORS.home} dashed />
      ))}
      {ALL.map((s) => (
        <Player key={s.id} at={s.at} label={s.label} focus={creators.includes(s)} />
      ))}
    </Pitch>
  );
}

function Crowded() {
  const pairs: Array<[Spot, Spot]> = [];
  const group = [DLP, DMR, AP, AML, AMR];
  for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) pairs.push([group[i], group[j]]);
  return (
    <Pitch half="att" title="Too many creators: every player asks for the ball and nobody runs into space">
      {pairs.map(([a, b]) => (
        <line key={a.id + b.id} x1={a.at.x} y1={a.at.y} x2={b.at.x} y2={b.at.y} stroke={COLORS.focus} strokeWidth={0.25} strokeDasharray="0.8 0.6" opacity={0.8} />
      ))}
      {ALL.map((s) => (
        <Player key={s.id} at={s.at} focus={group.includes(s)} label={s === ST ? 'ST' : 'PM'} />
      ))}
    </Pitch>
  );
}

export default function CreativityBoard() {
  return (
    <Frame
      caption="Left: one or two creators (yellow) feed team-mates who run into space. Right: everyone wants the ball, so nobody attacks the space and the striker is left alone."
      legend={[
        { color: COLORS.focus, label: 'Creator', hollow: true },
        { color: COLORS.focus, label: 'Passing lane', square: true },
        { color: COLORS.home, label: 'Run into space', square: true },
      ]}
    >
      <div className="diagram-pair board-pair">
        <div>
          <h3>1–2 creators: good</h3>
          <Good />
        </div>
        <div>
          <h3>Too many creators: nobody attacks the space</h3>
          <Crowded />
        </div>
      </div>
    </Frame>
  );
}
