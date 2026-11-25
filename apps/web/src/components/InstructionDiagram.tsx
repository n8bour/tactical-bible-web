// Server-rendered before/after diagram for one instruction. No client JS: Astro renders this without a `client:` directive.
import type { CSSProperties } from 'react';
import type { DecisionDiagram, DecisionOption, InstructionView, PressDiagram, RunsDiagram, ShapeDiagram, StatDiagram } from '../lib/diagrams';
import { Arrow, COLORS, Pitch, Player, Ring, VLine, type Pt } from './pitch/Pitch';

const RANK_COLORS = [COLORS.focus, '#4ade80', '#38bdf8', '#c084fc', '#fb923c'];
const rankColor = (rank: number) => RANK_COLORS[rank - 1] ?? '#94a3b8';
const FAINT = 0.38;
const MOVED = 1.5;

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Arrow that stops at the edge of the destination marker instead of running into its centre. */
function Move(props: { from: Pt; to: Pt; color?: string }) {
  const d = dist(props.from, props.to);
  const stop = 1.5;
  if (d < MOVED) return null;
  const k = (d - stop) / d;
  const end = { x: props.from.x + (props.to.x - props.from.x) * k, y: props.from.y + (props.to.y - props.from.y) * k };
  return <Arrow from={props.from} to={end} color={props.color ?? '#fff'} width={0.3} />;
}

function Label(props: { at: Pt; text: string; color?: string; anchor?: 'start' | 'middle' | 'end' }) {
  return (
    <text x={props.at.x} y={props.at.y} textAnchor={props.anchor ?? 'middle'} fontSize={2} fontWeight={600} fill={props.color ?? '#fff'} stroke="#0b1410" strokeWidth={0.45} paintOrder="stroke">
      {props.text}
    </text>
  );
}

function Faint(props: { points: Pt[]; color: string }) {
  return (
    <g opacity={FAINT}>
      {props.points.map((p, i) => <Player key={i} at={p} color={props.color} r={1.2} />)}
    </g>
  );
}

function Legend(props: { items: Array<[string, string]> }) {
  return (
    <div className="legend">
      {props.items.map(([color, text]) => <span key={text} style={{ '--dot': color } as CSSProperties}>{text}</span>)}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------------------

function ShapeView({ d }: { d: ShapeDiagram }) {
  const L = d.lines;
  return (
    <>
      <Pitch title={`Team shape: ${d.beforeLabel} against ${d.afterLabel}`}>
        <Faint points={d.away} color={COLORS.away} />
        {L && Math.abs(L.defence[0] - L.defence[1]) > 0.05 && <VLine x={L.defence[0]} color={COLORS.before} dashed />}
        {L && Math.abs(L.loe[0] - L.loe[1]) > 0.05 && <VLine x={L.loe[0]} color={COLORS.before} dashed />}
        {L && <VLine x={L.defence[1]} color={COLORS.home} label="Defensive line" />}
        {L && <VLine x={L.loe[1]} color="#fff" label="Line of engagement" />}
        {d.players.map((p) => dist(p.before, p.after) >= MOVED && <Player key={`b-${p.label}`} at={p.before} color={COLORS.before} hollow r={1.4} />)}
        {d.players.map((p) => <Move key={`m-${p.label}`} from={p.before} to={p.after} />)}
        {d.players.map((p) => <Player key={`a-${p.label}`} at={p.after} color={COLORS.home} focus={p.focus} label={p.label} />)}
        {d.ball && <circle cx={d.ball.x} cy={d.ball.y} r={0.8} fill="#fff" stroke="#0b1410" strokeWidth={0.2} />}
      </Pitch>
      <Legend items={[[COLORS.before, `Dashed outline: ${d.beforeLabel}`], [COLORS.home, `Filled: ${d.afterLabel}`], [COLORS.focus, 'Yellow ring: the player the lesson is about']]} />
    </>
  );
}

function PressView({ d }: { d: PressDiagram }) {
  return (
    <>
      <Pitch title={`Press radius: ${d.beforeLabel} against ${d.afterLabel}`}>
        <Faint points={d.away} color={COLORS.away} />
        {d.carrier && <Player at={d.carrier} color={COLORS.away} r={1.4} />}
        {d.players.map((p) => <Ring key={`b-${p.label}`} at={p.at} r={p.before} color={COLORS.before} dashed opacity={0.04} />)}
        {d.players.map((p) => <Ring key={`a-${p.label}`} at={p.at} r={p.after} color={COLORS.home} opacity={0.1} />)}
        {d.players.map((p) => <Player key={`p-${p.label}`} at={p.at} color={COLORS.home} focus={p.focus} label={p.label} />)}
        <circle cx={d.ball.x} cy={d.ball.y} r={0.8} fill="#fff" stroke="#0b1410" strokeWidth={0.2} />
      </Pitch>
      <Legend items={[[COLORS.before, `Dashed ring: ${d.beforeLabel}`], [COLORS.home, `Solid ring: ${d.afterLabel}`], [COLORS.away, 'Red: opponent']]} />
      <ul className="instr-list">
        {d.players.map((p) => <li key={p.label}><strong>{p.label}</strong> presses from {p.before.toFixed(1)} m → {p.after.toFixed(1)} m</li>)}
      </ul>
    </>
  );
}

function RunsView({ d }: { d: RunsDiagram }) {
  const color = { kept: '#fff', removed: COLORS.before, added: COLORS.focus } as const;
  const states = new Set(d.players.flatMap((p) => p.runs.map((r) => r.state)));
  return (
    <>
      <Pitch title={`Off-the-ball runs: ${d.beforeLabel} against ${d.afterLabel}`}>
        <Faint points={d.away} color={COLORS.away} />
        <Faint points={d.context} color={COLORS.home} />
        <VLine x={d.lineX} color="#fff" label="Last defender" dashed />
        {d.players.map((p) => dist(p.stand.before, p.stand.after) >= MOVED && <Player key={`b-${p.label}`} at={p.stand.before} color={COLORS.before} hollow />)}
        {d.players.map((p) => <Move key={`m-${p.label}`} from={p.stand.before} to={p.stand.after} />)}
        {d.players.map((p) => p.runs.map((r, i) => (
          <g key={`${p.label}-${i}`}>
            <Arrow from={r.state === 'removed' ? p.stand.before : p.stand.after} to={r.to} color={color[r.state]} dashed={r.state === 'removed'} width={r.state === 'added' ? 0.6 : 0.4} />
            <Label at={{ x: r.to.x, y: r.to.y - 1.4 }} text={r.label} color={color[r.state]} anchor={r.to.x > 85 ? 'end' : 'middle'} />
          </g>
        )))}
        {d.players.map((p) => <Player key={`a-${p.label}`} at={p.stand.after} color={COLORS.home} focus={p.focus} label={p.label} />)}
      </Pitch>
      <Legend
        items={[
          ...(states.has('removed') ? ([[COLORS.before, `Dashed grey: only with ${d.beforeLabel}`]] as Array<[string, string]>) : []),
          ...(states.has('kept') ? ([['#fff', 'White: in both']] as Array<[string, string]>) : []),
          ...(states.has('added') ? ([[COLORS.focus, `Yellow: only with ${d.afterLabel}`]] as Array<[string, string]>) : []),
        ]}
      />
      {d.players.every((p) => p.runs.length === 0) && <p className="instr-list">No forward runs in either case.</p>}
    </>
  );
}

function OptionPanel({ d, options, heading, withDelta }: { d: DecisionDiagram; options: DecisionOption[]; heading: string; withDelta: boolean }) {
  const ordered = options.toSorted((a, b) => b.rank - a.rank); // best option drawn last, on top
  return (
    <div>
      <h3>{heading}</h3>
      <Pitch title={`Ranked options for ${d.player.label}: ${heading}`} half={d.half} className={d.half ? 'pitch-svg pitch-half' : 'pitch-svg'}>
        <Faint points={d.away} color={COLORS.away} />
        <Faint points={d.home} color={COLORS.home} />
        {ordered.map((o) => {
          const c = rankColor(o.rank);
          return o.kind === 'hold' ? <Ring key={o.rank} at={d.player.at} r={2.6} color={c} dashed opacity={0} /> : <Arrow key={o.rank} from={d.player.at} to={o.target} color={c} width={o.rank === 1 ? 0.7 : 0.35} />;
        })}
        <Player at={d.player.at} color={COLORS.home} focus label={d.player.label} />
        {ordered.map((o) => {
          const at = o.kind === 'hold' ? { x: d.player.at.x, y: d.player.at.y - 3.4 } : o.target;
          return (
            <g key={`n-${o.rank}`}>
              <circle cx={at.x} cy={at.y} r={1.3} fill={rankColor(o.rank)} stroke="#0b1410" strokeWidth={0.2} />
              <text x={at.x} y={at.y + 0.7} textAnchor="middle" fontSize={1.9} fontWeight={700} fill="#0b1410">{o.rank}</text>
            </g>
          );
        })}
      </Pitch>
      <ol className="instr-options" role="list">
        {options.map((o) => (
          <li key={o.rank} style={{ '--dot': rankColor(o.rank) } as CSSProperties}>
            <span className="instr-rank">#{o.rank}</span> {o.label} <span className="instr-util">{o.utility.toFixed(2)}</span>
            {withDelta && o.delta === undefined && <span className="instr-delta" data-sign="pos"> new</span>}
            {withDelta && o.delta !== undefined && Math.abs(o.delta) >= 0.005 && <span className="instr-delta" data-sign={o.delta > 0 ? 'pos' : 'neg'}> {o.delta > 0 ? '+' : '−'}{Math.abs(o.delta).toFixed(2)}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function DecisionView({ d }: { d: DecisionDiagram }) {
  return (
    <div className="diagram-pair">
      <OptionPanel d={d} options={d.before} heading={d.beforeLabel} withDelta={false} />
      <OptionPanel d={d} options={d.after} heading={d.afterLabel} withDelta />
    </div>
  );
}

function StatView({ d }: { d: StatDiagram }) {
  const W = 560;
  const bar = 16;
  const rowH = 82;
  const x0 = 78;
  const span = W - x0 - 90;
  const fmt = (v: number, r: StatDiagram['rows'][number]) => `${v.toFixed(r.decimals)} ${r.unit}`;
  return (
    <svg className="instr-stat" viewBox={`0 0 ${W} ${d.rows.length * rowH + 6}`} role="img" aria-label={`${d.beforeLabel} against ${d.afterLabel}: ${d.rows.map((r) => r.label).join(', ')}`}>
      {d.rows.map((r, i) => {
        const y = i * rowH;
        const w = (v: number) => Math.max(2, (Math.min(v, r.max) / r.max) * span);
        return (
          <g key={r.label} transform={`translate(0 ${y})`}>
            <text x={0} y={16} fontSize={14} fontWeight={600} fill="#e8efe9">{r.label}</text>
            <text x={0} y={39} fontSize={12} fill="#a6b8ae">Default</text>
            <rect x={x0} y={27} width={w(r.before)} height={bar} rx={3} fill={COLORS.before} />
            <text x={x0 + w(r.before) + 8} y={40} fontSize={13} fill="#e8efe9">{fmt(r.before, r)}</text>
            <text x={0} y={63} fontSize={12} fill="#a6b8ae">With it</text>
            <rect x={x0} y={51} width={w(r.after)} height={bar} rx={3} fill={COLORS.home} />
            <text x={x0 + w(r.after) + 8} y={64} fontSize={13} fill="#e8efe9">{fmt(r.after, r)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function InstructionDiagram(props: { view: InstructionView; note: string; src: 'conf' | 'est'; board: string }) {
  const d = props.view.diagram;
  return (
    <figure className="diagram instr-diagram">
      {d.kind === 'shape' && <ShapeView d={d} />}
      {d.kind === 'press' && <PressView d={d} />}
      {d.kind === 'runs' && <RunsView d={d} />}
      {d.kind === 'decision' && <DecisionView d={d} />}
      {d.kind === 'stat' && <StatView d={d} />}
      <figcaption>
        <p className="instr-caption">{d.caption}</p>
        <p>
          <span className="badge" data-src={props.src}>Effect {props.src.toUpperCase()}</span> {props.note}
        </p>
        {d.kind === 'stat' && <p>This instruction changes a number in the model rather than where players stand, so it is shown as a comparison.</p>}
        <a className="cta" href={props.board}>Open in tactics board</a>
      </figcaption>
    </figure>
  );
}
