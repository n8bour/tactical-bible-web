import { Frame } from '../Frame';

const SOURCES = ['Team instructions', 'Player instructions', 'Opposition instructions'];

export default function ComplexityBoard() {
  return (
    <Frame caption="Every instruction you add pushes the meter to the right. Further right asks more of the players and needs more training time; in the lower leagues, stay on the left.">
      <svg className="board-info" viewBox="0 0 680 270" role="img" aria-label="Instructions add complexity; more complex tactics need more capable players and more training time">
        <title>Instructions add complexity; more complex tactics need more capable players and more training time</title>
        <defs>
          <linearGradient id="complexity-meter" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#4ade80" />
            <stop offset="0.55" stopColor="#facc15" />
            <stop offset="1" stopColor="#f87171" />
          </linearGradient>
        </defs>

        {SOURCES.map((s, i) => (
          <g key={s}>
            <rect x={10} y={30 + i * 62} width={190} height={46} rx={8} fill="#1b2823" stroke="#2c3d36" />
            <text x={105} y={58 + i * 62} textAnchor="middle" fontSize={15} fontWeight={600}>
              + {s}
            </text>
            <path d={`M200 ${53 + i * 62} L256 85`} stroke="#a6b8ae" strokeWidth={1.5} fill="none" />
          </g>
        ))}
        <text x={105} y={16} textAnchor="middle" fontSize={13} className="muted">
          What adds complexity
        </text>

        <text x={440} y={16} textAnchor="middle" fontSize={13} className="muted">
          Tactic complexity
        </text>
        <rect x={260} y={70} width={360} height={30} rx={15} fill="url(#complexity-meter)" />
        <text x={260} y={120} fontSize={14} fontWeight={600}>
          Simple
        </text>
        <text x={620} y={120} textAnchor="end" fontSize={14} fontWeight={600}>
          Complex
        </text>

        <path d="M260 56 H400" stroke="#4ade80" strokeWidth={3} />
        <text x={330} y={46} textAnchor="middle" fontSize={13}>
          Lower leagues: stay here
        </text>
        <path d="M480 56 H620" stroke="#f87171" strokeWidth={3} />
        <text x={550} y={46} textAnchor="middle" fontSize={13}>
          Needs a strong squad
        </text>

        <path d="M440 136 V150 M365 150 H540 M365 150 V172 M540 150 V172" stroke="#a6b8ae" strokeWidth={1.5} fill="none" />
        <polygon points="365,181 359,170 371,170" fill="#a6b8ae" />
        <polygon points="540,181 534,170 546,170" fill="#a6b8ae" />
        <rect x={290} y={182} width={150} height={56} rx={8} fill="#1b2823" stroke="#2c3d36" />
        <text x={365} y={206} textAnchor="middle" fontSize={14} fontWeight={600}>
          More capable
        </text>
        <text x={365} y={226} textAnchor="middle" fontSize={14} fontWeight={600}>
          players
        </text>
        <rect x={460} y={182} width={160} height={56} rx={8} fill="#1b2823" stroke="#2c3d36" />
        <text x={540} y={206} textAnchor="middle" fontSize={14} fontWeight={600}>
          More training
        </text>
        <text x={540} y={226} textAnchor="middle" fontSize={14} fontWeight={600}>
          time
        </text>
      </svg>
    </Frame>
  );
}
