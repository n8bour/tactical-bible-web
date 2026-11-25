import { Frame } from '../Frame';

const PILLARS = [
  { name: 'Tactical Understanding', note: 'Drops when you change many roles and instructions at once.' },
  { name: 'Player Ability', note: 'Whether the players can actually do what the roles ask.' },
  { name: 'Player Buy-In', note: 'Improved by communicating with the squad.' },
  { name: 'Next Match Information', note: 'Improved by scouting the opponent.' },
];
const SEEN_IN = ['Training', 'Tactics screen', 'Squad', 'Database', 'Scouting reports (Projected Effectiveness)'];

export default function EffectivenessBoard() {
  return (
    <Frame caption="Four pillars add up to Tactical Effectiveness, which replaces Tactical Familiarity: how well this squad can execute the tactic you set.">
      <ul className="board-pillars">
        {PILLARS.map((p) => (
          <li key={p.name}>
            <strong>{p.name}</strong>
            <span>{p.note}</span>
          </li>
        ))}
      </ul>
      <p className="board-result">
        <strong>= Tactical Effectiveness</strong> (FM27, replaces Tactical Familiarity)
      </p>
      <p style={{ margin: '0.75rem 0 0', fontSize: '0.9rem' }}>Where you see it:</p>
      <ul className="board-chips">
        {SEEN_IN.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </Frame>
  );
}
