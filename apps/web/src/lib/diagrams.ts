// Build-time data for the before/after diagrams on the instruction pages.
// Everything here is pure: it creates two deterministic worlds from the instruction's scene (instruction off/default vs on),
// reads what the simulation would do at that instant (no stepping), and returns plain data for components/InstructionDiagram.tsx.
import { KNOWLEDGE, PI_EFFECTS, playerInstructions, SCENES, teamInstructions, TI_EFFECTS, type Scene } from '@tb/content';
import { attr, createWorld, frame, isIP, laneY, n, onBallOptions, oppLineX, setPI, setRole, setTI, targetsFor, type AgentState, type OptionTrace, type Phase, type PIKey, type RunKind, type WorldState } from '@tb/sim';
import type { Pt } from '../components/pitch/Pitch';

export type DiagramKind = 'shape' | 'press' | 'runs' | 'decision' | 'stat';

/** Which picture explains each instruction. A key missing here fails the build (see the checks at the bottom). */
const TI_KINDS: Record<string, DiagramKind> = {
  passing: 'decision', tempo: 'stat', width: 'shape', creative: 'decision', att_trans: 'shape', set_pieces: 'decision', timewaste: 'stat',
  reception: 'decision', buildup: 'shape', goal_kicks: 'decision', gk_speed: 'stat', gk_target: 'decision', support_runs: 'runs',
  dribbling: 'decision', progress: 'shape', patience: 'decision', long_shots: 'decision', crossing: 'decision',
  loe: 'shape', dline: 'shape', trigger: 'press', def_trans: 'press', tackling: 'stat', press_trap: 'shape', cross_eng: 'press',
  short_gk: 'shape', dl_behaviour: 'shape',
};

const PI_KINDS: Record<PIKey, DiagramKind> = {
  shoot_more: 'decision', shoot_less: 'decision', dribble_more: 'decision', dribble_less: 'decision', take_more_risks: 'decision',
  take_fewer_risks: 'decision', cross_from_byline: 'decision', cross_from_deep: 'decision', roam_from_position: 'shape', stay_wider: 'shape',
  sit_narrower: 'shape', hold_position: 'runs', get_further_forward: 'shape', move_into_channels: 'runs', press_more: 'press', press_less: 'press',
  mark_tighter: 'stat', tackle_harder: 'stat', ease_off_tackles: 'stat', arrive_late: 'runs', attack_the_defensive_line: 'runs',
  target_near_post: 'runs', target_centre: 'runs', target_far_post: 'runs',
};

/** Team instructions whose lesson option changes nothing visible, so a different option is drawn (and linked to the tactics board). */
const TI_OPTION: Record<string, number> = { progress: 2 };

/**
 * Instructions whose scene player already behaves "as instructed" (or sits outside the range where the instruction matters).
 * The picture then borrows another role (`role`, at `slot`; default the focus slot) or position (`at`) in both worlds so the effect shows.
 */
const DEMO: Record<string, { slot?: string; role?: string; at?: Pt; note: string }> = {
  attack_the_defensive_line: { role: 'f9', note: 'Shown with a False Nine, who normally drops deep.' },
  target_centre: { slot: 'AML', role: 'wf_ip', note: 'Shown with a Wide Forward, whose box run normally goes to the far post.' },
  long_shots: { at: { x: 74.5, y: 34 }, note: 'Shown from about 30 m out, just outside the normal shooting range.' },
};

/** Option kinds an on-ball instruction changes: the best of each is always listed, even below the top five. */
const AFFECTS: Record<string, Array<OptionTrace['kind']>> = {
  passing: ['pass'], creative: ['throughPass', 'carry'], reception: ['throughPass'], set_pieces: ['cross'], patience: ['cross'], crossing: ['cross'],
  dribbling: ['carry'], long_shots: ['shoot'], goal_kicks: ['pass'], gk_target: ['pass'],
  shoot_more: ['shoot'], shoot_less: ['shoot'], dribble_more: ['carry'], dribble_less: ['carry'], take_more_risks: ['throughPass'],
  take_fewer_risks: ['throughPass'], cross_from_byline: ['cross'], cross_from_deep: ['cross'],
};

/** One line saying what to look at. */
const LOOK_AT: Record<string, string> = {
  passing: 'Look at the pass options: with a more direct style the longer passes climb the list.',
  tempo: 'Look at the time between decisions on the ball: a higher tempo shortens it.',
  width: 'Look at the wide players: the whole team stretches towards the touchlines.',
  creative: 'Look at the risky options (through passes, carries): they rise when the team is told to be expressive.',
  att_trans: 'Look at the shape the moment the ball is won: the whole block starts higher for the counter.',
  set_pieces: 'Look at the cross options: they score a little higher when the team plays for set pieces.',
  timewaste: 'Look at the bars: decisions and restarts both take longer.',
  reception: 'Look at the pass options: balls into space and through balls rise when passes are played into space.',
  buildup: 'Look at the back line and midfield in build-up: they sit higher when the team bypasses the press.',
  goal_kicks: 'Look at the keeper’s options: long distribution outranks short passes.',
  gk_speed: 'Look at the bars: a keeper told to distribute quickly releases the ball sooner.',
  gk_target: 'Look at the keeper’s options: a forward target favours the long ball.',
  support_runs: 'Look at the full-backs: they add an overlapping run past the winger.',
  dribbling: 'Look at the carry options: they climb the list when dribbling is encouraged.',
  progress: 'Look at the wide players: the shape narrows slightly when play is steered down the centre.',
  patience: 'Look at the cross options: they score higher when the team hits early crosses.',
  long_shots: 'Look at the shot: it enters the list from further out when long shots are encouraged.',
  crossing: 'Look at the bar: crosses are delivered at a different speed and height.',
  loe: 'Look at the dashed vs solid vertical lines: the block starts pressing much higher up the pitch.',
  dline: 'Look at the back line: the defenders step up the pitch with a higher defensive line.',
  trigger: 'Look at the rings: players leave their positions to press from further away.',
  def_trans: 'Look at the rings: counter-pressing players close the ball down from further away for four seconds after a turnover.',
  tackling: 'Look at the bars: more commitment wins more tackles and gives away more fouls.',
  press_trap: 'Look at the wide players: they tuck in or stay wide to steer the ball.',
  cross_eng: 'Look at the full-backs’ rings: they press wide carriers harder to stop crosses.',
  short_gk: 'Look at the forwards: they push up onto the opposition keeper.',
  dl_behaviour: 'Look at the back line: it steps up a little further when the ball is played.',
  shoot_more: 'Look at the shot: it climbs the list, and shots are considered from further out.',
  shoot_less: 'Look at the shot: it drops down the list.',
  dribble_more: 'Look at the carries: they climb the list.',
  dribble_less: 'Look at the carries: they drop down the list.',
  take_more_risks: 'Look at the through passes: they climb the list and cautious options lose ground.',
  take_fewer_risks: 'Look at the through passes: they drop down the list and safe passes gain ground.',
  cross_from_byline: 'Look at the crosses: they score better close to the byline.',
  cross_from_deep: 'Look at the crosses: they score better from deeper positions.',
  roam_from_position: 'Look at the player: he drifts towards the ball side and a little higher.',
  stay_wider: 'Look at the player: he holds a position 6 m closer to the touchline.',
  sit_narrower: 'Look at the player: he holds a position 6 m further inside.',
  hold_position: 'Look at the arrows: the player no longer makes forward runs.',
  get_further_forward: 'Look at the player: he holds a position 8 m higher up the pitch.',
  move_into_channels: 'Look at the arrows: the player adds a run into the gap between full-back and centre-back.',
  press_more: 'Look at the ring: the player closes the ball down from further away.',
  press_less: 'Look at the ring: the player only closes down the ball when it is near.',
  mark_tighter: 'Look at the bar: the player stands closer to his opponent.',
  tackle_harder: 'Look at the bars: more commitment wins more tackles and gives away more fouls.',
  ease_off_tackles: 'Look at the bars: less commitment means fewer fouls and fewer tackles won.',
  arrive_late: 'Look at the arrows: the player adds a run that arrives in the box after the cross is on its way.',
  attack_the_defensive_line: 'Look at the player: he stands on the last defender’s shoulder instead of his normal position.',
  target_near_post: 'Look at the arrows: box runs go to the near post.',
  target_centre: 'Look at the arrows: box runs go to the centre of the box.',
  target_far_post: 'Look at the arrows: box runs go to the far post.',
};

// ---------------------------------------------------------------------------------------------------------------------------------
// Data types

interface Common {
  caption: string;
  beforeLabel: string;
  afterLabel: string;
}

export interface ShapeDiagram extends Common {
  kind: 'shape';
  players: Array<{ label: string; focus: boolean; before: Pt; after: Pt }>;
  away: Pt[];
  ball: Pt | null;
  /** Out-of-possession phases only: defensive line and line of engagement (world x), [before, after]. */
  lines: { defence: [number, number]; loe: [number, number] } | null;
}

export interface PressDiagram extends Common {
  kind: 'press';
  players: Array<{ label: string; focus: boolean; at: Pt; before: number; after: number }>;
  away: Pt[];
  carrier: Pt | null;
  ball: Pt;
}

export type RunState = 'kept' | 'removed' | 'added';
export interface RunsDiagram extends Common {
  kind: 'runs';
  players: Array<{
    label: string;
    focus: boolean;
    stand: { before: Pt; after: Pt };
    runs: Array<{ label: string; to: Pt; state: RunState }>;
  }>;
  /** other home players, drawn faint */
  context: Pt[];
  away: Pt[];
  /** x of the deepest opposing outfield player */
  lineX: number;
}

export interface DecisionOption {
  rank: number;
  label: string;
  kind: OptionTrace['kind'];
  target: Pt;
  utility: number;
  /** utility change vs the default; undefined when the option did not exist before */
  delta?: number;
}
export interface DecisionDiagram extends Common {
  kind: 'decision';
  player: { label: string; at: Pt };
  half: 'att' | undefined;
  home: Pt[];
  away: Pt[];
  before: DecisionOption[];
  after: DecisionOption[];
}

export interface StatRow {
  label: string;
  unit: string;
  before: number;
  after: number;
  max: number;
  decimals: number;
}
export interface StatDiagram extends Common {
  kind: 'stat';
  rows: StatRow[];
}

export type Diagram = ShapeDiagram | PressDiagram | RunsDiagram | DecisionDiagram | StatDiagram;

export interface InstructionView {
  diagram: Diagram;
  /** the kind chosen in the table; differs from `diagram.kind` when the picture came out identical and fell back to `stat` */
  requested: DiagramKind;
  fellBack: boolean;
  /** site path (without base) of the tactics-board link */
  board: string;
  option?: number;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Worlds

interface Pair {
  scene: Scene;
  phase: Phase;
  before: WorldState;
  after: WorldState;
  focus: number; // agent index (same in both worlds)
}

function makePair(sceneId: string, key: string, apply: (w: WorldState, focusId: string) => void): Pair {
  const scene = SCENES[sceneId];
  if (!scene) throw new Error(`No scene ${sceneId} for an instruction diagram`);
  const before = createWorld(scene, KNOWLEDGE);
  const after = createWorld(scene, KNOWLEDGE);
  const demo = DEMO[key];
  const focusId = demo?.slot ? `h_${demo.slot}` : scene.focus;
  for (const w of [before, after]) {
    if (demo?.role) setRole(w, focusId, 'IP', demo.role);
    const who = w.agents.find((a) => a.spec.id === focusId);
    if (demo?.at && who) who.pos = { ...demo.at };
  }
  apply(after, focusId);
  const focus = before.agents.findIndex((a) => a.spec.id === focusId);
  if (focus < 0) throw new Error(`Scene ${sceneId} has no focus agent ${focusId}`);
  return { scene, phase: scene.phaseStart, before, after, focus };
}

const homeIdx = (w: WorldState) => w.agents.map((a, i) => [a, i] as const).filter(([a]) => a.spec.team === 0).map(([, i]) => i);
const plan = (w: WorldState, i: number, phase: Phase): Pt => frame(0, targetsFor(w, w.agents[i], phase).plan);
const awayPositions = (w: WorldState): Pt[] => w.agents.filter((a) => a.spec.team === 1).map((a) => ({ ...a.pos }));
const slotLabel = (a: AgentState) => a.spec.label ?? a.spec.slot;
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ---------------------------------------------------------------------------------------------------------------------------------
// shape

function shapeDiagram(p: Pair, labels: Common): ShapeDiagram | null {
  const idx = homeIdx(p.before);
  const players = idx.map((i) => ({
    label: slotLabel(p.before.agents[i]),
    focus: i === p.focus,
    before: plan(p.before, i, p.phase),
    after: plan(p.after, i, p.phase),
  }));
  let lines: ShapeDiagram['lines'] = null;
  if (p.phase === 'oop' || p.phase === 'loss') {
    const back = (w: WorldState) => Math.min(...idx.filter((i) => w.agents[i].spec.slot !== 'GK').map((i) => plan(w, i, p.phase).x));
    lines = {
      defence: [back(p.before), back(p.after)],
      loe: [frame(0, { x: p.before.teams[0].mods.loe, y: 0 }).x, frame(0, { x: p.after.teams[0].mods.loe, y: 0 }).x],
    };
  }
  const same = players.every((q) => dist(q.before, q.after) < 0.05) && (!lines || (Math.abs(lines.defence[0] - lines.defence[1]) < 0.05 && Math.abs(lines.loe[0] - lines.loe[1]) < 0.05));
  if (same) return null;
  return { ...labels, kind: 'shape', players, away: awayPositions(p.before), ball: { ...p.before.ball.pos }, lines };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// press

/** Same radius as agent.ts decideOffBall (and the lab's pressure overlay); counter-press only applies in the 'loss' phase. */
function pressRadius(w: WorldState, i: number, phase: Phase): number {
  const t = targetsFor(w, w.agents[i], phase);
  const counter = phase === 'loss' ? 1 + (t.mods.team.counterpress ?? 0) : 1;
  return t.mods.profile.oop.pressRadius * attr('pressWill', w.agents[i].spec.attrs) * t.mods.pressMult * counter;
}

function pressDiagram(p: Pair, labels: Common): PressDiagram | null {
  const ball = p.before.ball.pos;
  const all = homeIdx(p.before)
    .filter((i) => p.before.agents[i].spec.slot !== 'GK')
    .map((i) => ({ i, before: pressRadius(p.before, i, p.phase), after: pressRadius(p.after, i, p.phase), at: plan(p.before, i, p.phase) }))
    .filter((r) => Math.abs(r.before - r.after) > 0.05);
  if (!all.length) return null;
  // Ten overlapping rings are unreadable: keep the focus player and the five nearest to the ball.
  const shown = all.sort((a, b) => (a.i === p.focus ? -1 : b.i === p.focus ? 1 : dist(a.at, ball) - dist(b.at, ball))).slice(0, 6);
  const owner = p.before.agents.find((a) => a.spec.id === p.before.ball.owner);
  return {
    ...labels,
    kind: 'press',
    players: shown.map((r) => ({ label: slotLabel(p.before.agents[r.i]), focus: r.i === p.focus, at: r.at, before: r.before, after: r.after })),
    away: awayPositions(p.before),
    carrier: owner && owner.spec.team === 1 ? { ...owner.pos } : null,
    ball: { ...ball },
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// runs

const MID = 34;
const RUN_LABEL: Record<RunKind, string> = {
  beyond: 'Run in behind', channel: 'Channel run', box_near: 'Near-post run', box_far: 'Far-post run', box_centre: 'Central box run',
  late_box: 'Late run into the box', drop: 'Drop deep', overlap: 'Overlap', underlap: 'Underlap', drift_ball: 'Drift to the ball',
  invert: 'Move inside', hold: 'Hold',
};

/**
 * Replicates agent.ts decideOffBall (run list) and runTarget/startRun (target formulas) for a settled teammate on the ball,
 * in team frame (= world frame for the home team). Keep in sync with packages/sim/src/agent.ts.
 */
function runTargets(w: WorldState, i: number, phase: Phase): Array<{ kind: RunKind; to: Pt }> {
  if (!isIP(phase)) return [];
  const a = w.agents[i];
  const t = targetsFor(w, a, phase);
  const m = t.mods;
  if (m.player.holdRuns) return [];
  const runs = [...m.profile.runs];
  if (m.player.channelRun) runs.push({ kind: 'channel', phase: 'final', p: 0.6 }, { kind: 'channel', phase: 'prog', p: 0.5 });
  if (m.player.lateRun) runs.push({ kind: 'late_box', phase: 'final', p: 0.8 });
  const sup = m.team.overlap ?? 0;
  if (/^(DL|DR|WBL|WBR)$/.test(a.spec.slot) && sup !== 0) runs.push({ kind: sup > 0 ? 'overlap' : 'underlap', phase: 'final', p: 0.6 });
  const runPh = phase === 'win' ? ['prog', 'final'] : [phase];
  const lineX = oppLineX(w, 0);
  const ball = frame(0, w.ball.pos);
  const role = t.plan;
  const side = role.y < MID ? -1 : 1;
  const bSide = ball.y < MID ? -1 : 1;
  const box = m.player.boxTarget;
  const target = (kind: RunKind): Pt => {
    switch (kind) {
      case 'beyond': return { x: Math.min(lineX + 7, 100), y: role.y };
      case 'channel': return { x: Math.min(lineX + 4, 99), y: laneY('ch', side, 1, ball.y) };
      case 'box_near':
      case 'box_far':
      case 'box_centre': {
        const k = box ?? (kind === 'box_near' ? 'near' : kind === 'box_far' ? 'far' : 'centre');
        return k === 'near' ? { x: 98, y: MID + bSide * 5 } : k === 'far' ? { x: 97, y: MID - bSide * 7 } : { x: 95, y: MID };
      }
      case 'late_box': return { x: 90, y: MID + (role.y - MID) * 0.3 };
      case 'drop': return { x: role.x - 12, y: role.y + (MID - role.y) * 0.3 };
      case 'overlap': return { x: Math.min(role.x + 14, 98), y: laneY('wide', side, m.team.widthScale, ball.y) };
      case 'underlap': return { x: Math.min(role.x + 12, 96), y: laneY('half', side, 1, ball.y) };
      case 'drift_ball': return { x: role.x + 2, y: role.y + (ball.y - role.y) * 0.6 };
      case 'invert': return { x: Math.min(role.x + 6, 97), y: laneY('in2', side, 1, ball.y) };
      case 'hold': return role;
    }
  };
  return runs
    .filter((r) => r.kind !== 'hold' && runPh.includes(r.phase))
    .map((r) => {
      const tgt = target(r.kind);
      if (m.player.laneShift && !r.kind.startsWith('box')) tgt.y += (role.y < MID ? -1 : 1) * m.player.laneShift;
      return { kind: r.kind, to: frame(0, { x: clamp(tgt.x, 1, 104), y: clamp(tgt.y, 1, 67) }) };
    });
}

/** Where the player stands: the blend of plan and ball-drag as in agent.ts decideOffBall; attack_the_defensive_line pins him to the last defender. */
function standAt(w: WorldState, i: number, phase: Phase): Pt {
  const t = targetsFor(w, w.agents[i], phase);
  const adh = attr('shapeAdherence', w.agents[i].spec.attrs);
  const at = frame(0, { x: t.impulse.x + (t.plan.x - t.impulse.x) * adh, y: t.impulse.y + (t.plan.y - t.impulse.y) * adh });
  if (isIP(phase) && t.mods.player.lineRun && phase !== 'build') return { x: Math.max(at.x, oppLineX(w, 0) - 0.5), y: at.y };
  return at;
}

function runsDiagram(p: Pair, labels: Common, key: string): RunsDiagram | null {
  const who = key === 'support_runs' ? homeIdx(p.before).filter((i) => /^(DL|DR|WBL|WBR)$/.test(p.before.agents[i].spec.slot)) : [p.focus];
  const players: RunsDiagram['players'] = who.map((i) => {
    const b = runTargets(p.before, i, p.phase);
    const a = runTargets(p.after, i, p.phase);
    const runs: RunsDiagram['players'][number]['runs'] = [];
    for (const r of b) runs.push({ label: RUN_LABEL[r.kind], to: r.to, state: a.some((x) => x.kind === r.kind && dist(x.to, r.to) < 0.5) ? 'kept' : 'removed' });
    for (const r of a) if (!b.some((x) => x.kind === r.kind && dist(x.to, r.to) < 0.5)) runs.push({ label: RUN_LABEL[r.kind], to: r.to, state: 'added' });
    return { label: slotLabel(p.before.agents[i]), focus: i === p.focus, stand: { before: standAt(p.before, i, p.phase), after: standAt(p.after, i, p.phase) }, runs };
  });
  const same = players.every((q) => q.runs.every((r) => r.state === 'kept') && dist(q.stand.before, q.stand.after) < 0.05);
  if (same) return null;
  const exclude = new Set(who);
  return {
    ...labels,
    kind: 'runs',
    players,
    context: homeIdx(p.before).filter((i) => !exclude.has(i)).map((i) => plan(p.before, i, p.phase)),
    away: awayPositions(p.before),
    lineX: oppLineX(p.before, 0),
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// decision

const CROSS_ZONE = ['near post', 'centre', 'far post']; // onBallOptions pushes the three cross zones in this order

function describe(p: Pair, opts: OptionTrace[]): Array<{ o: OptionTrace; label: string; key: string }> {
  let crosses = 0;
  return opts.map((o) => {
    const mate = o.to ? p.before.agents.find((a) => a.spec.id === o.to) : undefined;
    const who = mate ? slotLabel(mate) : '';
    let label: string;
    switch (o.kind) {
      case 'pass': label = `Pass to ${who}`; break;
      case 'throughPass': label = `Through ball for ${who}`; break;
      case 'carry': label = 'Carry the ball'; break;
      case 'shoot': label = 'Shoot'; break;
      case 'cross': label = `Cross to the ${CROSS_ZONE[crosses++] ?? 'box'}`; break;
      case 'hold': label = 'Hold the ball'; break;
      default: label = o.kind;
    }
    return { o, label, key: `${o.kind}|${o.to ?? ''}|${o.target.x.toFixed(1)}|${o.target.y.toFixed(1)}` };
  });
}

function decisionDiagram(p: Pair, labels: Common, key: string): DecisionDiagram | null {
  const rank = (w: WorldState) => {
    const a = w.agents[p.focus];
    const t = targetsFor(w, a, p.phase);
    return describe(p, onBallOptions(w, a, t.mods)).sort((x, y) => y.o.utility - x.o.utility);
  };
  const b = rank(p.before);
  const a = rank(p.after);
  const prior = new Map(b.map((d) => [d.key, d.o.utility]));
  const top = (list: typeof b, withDelta: boolean): DecisionOption[] => {
    const picked = list.slice(0, 5);
    for (const kind of AFFECTS[key] ?? []) {
      const best = list.find((d) => d.o.kind === kind);
      if (best && !picked.includes(best)) picked.push(best);
    }
    return picked.map((d) => ({
      rank: list.indexOf(d) + 1,
      label: d.label,
      kind: d.o.kind,
      target: { ...d.o.target },
      utility: d.o.utility,
      ...(withDelta && prior.has(d.key) ? { delta: d.o.utility - prior.get(d.key)! } : {}),
    }));
  };
  const before = top(b, false);
  const after = top(a, true);
  const same = before.length === after.length && before.every((o, k) => o.label === after[k].label && o.rank === after[k].rank && Math.abs(o.utility - after[k].utility) < 1e-6);
  if (same) return null;
  const me = p.before.agents[p.focus].pos;
  const minX = Math.min(me.x, ...before.map((o) => o.target.x), ...after.map((o) => o.target.x));
  return {
    ...labels,
    kind: 'decision',
    player: { label: slotLabel(p.before.agents[p.focus]), at: { ...me } },
    half: minX > 52 ? 'att' : undefined,
    home: p.before.agents.filter((x, i) => x.spec.team === 0 && i !== p.focus).map((x) => ({ ...x.pos })),
    away: awayPositions(p.before),
    before,
    after,
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// stat

function focusFacts(p: Pair, w: WorldState) {
  const a = w.agents[p.focus];
  const t = targetsFor(w, a, p.phase);
  return { a, t, team: w.teams[a.spec.team].mods };
}

/** The numbers the instruction changes, per instruction. Formulas as in world.ts (duels, restarts, decision interval) and agent.ts (marking). */
const STAT_ROWS: Record<string, (p: Pair) => StatRow[]> = {
  tempo: (p) => [interval(p)],
  timewaste: (p) => [interval(p), restart(p)],
  gk_speed: (p) => [restart(p), restartDecision(p)],
  tackling: (p) => tackle(p),
  tackle_harder: (p) => tackle(p),
  ease_off_tackles: (p) => tackle(p),
  mark_tighter: (p) => {
    const dist = (w: WorldState) => Math.max(0.6, attr('markDist', focusFacts(p, w).a.spec.attrs) + focusFacts(p, w).t.mods.markDelta);
    return [{ label: 'Distance he keeps from the man he marks', unit: 'm', before: dist(p.before), after: dist(p.after), max: 4, decimals: 1 }];
  },
  crossing: (p) => {
    const f = (w: WorldState) => ({ whipped: 1.3, floated: 0.75 }[w.teams[0].mods.crossHeight as 'whipped' | 'floated'] ?? 1);
    return [{ label: 'Speed of the delivery (1 = standard)', unit: '×', before: f(p.before), after: f(p.after), max: 1.5, decimals: 2 }];
  },
};

const interval = (p: Pair): StatRow => ({
  label: 'Time between decisions on the ball',
  unit: 's',
  before: attr('decisionInterval', p.before.agents[p.focus].spec.attrs) * p.before.teams[0].mods.tempo,
  after: attr('decisionInterval', p.after.agents[p.focus].spec.attrs) * p.after.teams[0].mods.tempo,
  max: 0.8,
  decimals: 2,
});
const restart = (p: Pair): StatRow => ({
  label: 'Ball held before a restart',
  unit: 's',
  before: 0.8 - 0.3 * (p.before.teams[0].mods.restartSpeed ?? 0),
  after: 0.8 - 0.3 * (p.after.teams[0].mods.restartSpeed ?? 0),
  max: 1,
  decimals: 2,
});
const restartDecision = (p: Pair): StatRow => ({
  label: 'Wait before the keeper’s first decision',
  unit: 's',
  before: 0.6 - 0.25 * (p.before.teams[0].mods.restartSpeed ?? 0),
  after: 0.6 - 0.25 * (p.after.teams[0].mods.restartSpeed ?? 0),
  max: 1,
  decimals: 2,
});
function tackle(p: Pair): StatRow[] {
  const commit = (w: WorldState) => Math.min(1, attr('tackleCommit', focusFacts(p, w).a.spec.attrs) + focusFacts(p, w).t.mods.tackleCommit);
  const foul = (w: WorldState) => (0.08 + 0.25 * commit(w) * (1 - n(focusFacts(p, w).a.spec.attrs.tck))) * 100;
  return [
    { label: 'Tackle commitment', unit: '0–1', before: commit(p.before), after: commit(p.after), max: 1, decimals: 2 },
    { label: 'Chance a tackle is a foul', unit: '%', before: foul(p.before), after: foul(p.after), max: 35, decimals: 1 },
  ];
}

function statDiagram(p: Pair, key: string, labels: Common): StatDiagram | null {
  const rows = STAT_ROWS[key]?.(p) ?? [];
  const visible = rows.filter((r) => Math.abs(r.before - r.after) > 1e-6);
  if (!visible.length) return null;
  return { ...labels, kind: 'stat', rows };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Entry points

function build(p: Pair, key: string, wanted: DiagramKind, labels: Common): { diagram: Diagram; fellBack: boolean } {
  const first =
    wanted === 'shape' ? shapeDiagram(p, labels)
    : wanted === 'press' ? pressDiagram(p, labels)
    : wanted === 'runs' ? runsDiagram(p, labels, key)
    : wanted === 'decision' ? decisionDiagram(p, labels, key)
    : statDiagram(p, key, labels);
  if (first) return { diagram: first, fellBack: false };
  const stat = statDiagram(p, key, labels);
  if (stat) return { diagram: stat, fellBack: true };
  throw new Error(`Instruction ${key}: no measurable change in a ${wanted} diagram and no stat rows to fall back to`);
}

const captionFor = (key: string) => (DEMO[key] ? `${LOOK_AT[key]} ${DEMO[key].note}` : LOOK_AT[key]);

export function teamDiagram(key: string): InstructionView {
  const wanted = TI_KINDS[key];
  const data = teamInstructions.find((t) => t.key === key);
  const scene = SCENES[`ti-${key}`];
  if (!wanted || !data || !scene?.lesson?.ti) throw new Error(`Missing diagram table entry, instruction data or scene lesson for team instruction ${key}`);
  const option = TI_OPTION[key] ?? scene.lesson.ti.option;
  const p = makePair(scene.id, key, (w) => setTI(w, 0, key, option));
  const labels: Common = { beforeLabel: `Default (${data.options[data.default]})`, afterLabel: data.options[option], caption: captionFor(key) };
  const out = build(p, key, wanted, labels);
  const tab = data.phase === 'OOP' ? 'oop' : 'ip';
  return { ...out, requested: wanted, option, board: `/tactics?tab=${tab}&ti=${key}:${option}` };
}

export function playerDiagram(key: PIKey): InstructionView {
  const wanted = PI_KINDS[key];
  const scene = SCENES[`pi-${key}`];
  if (!wanted || !scene) throw new Error(`Missing diagram table entry or scene for player instruction ${key}`);
  const p = makePair(scene.id, key, (w, focusId) => setPI(w, focusId, key, true));
  const labels: Common = { beforeLabel: 'Off', afterLabel: 'On', caption: captionFor(key) };
  const out = build(p, key, wanted, labels);
  const tab = scene.phaseStart === 'oop' || scene.phaseStart === 'loss' ? 'oop' : 'ip';
  return { ...out, requested: wanted, board: `/tactics?tab=${tab}&pi=${key}&slot=${scene.focus.replace(/^h_/, '')}` };
}

// Fail the build when an instruction has no diagram entry, caption or scene (keeps the tables in step with the data).
for (const t of teamInstructions) {
  if (!TI_KINDS[t.key] || !LOOK_AT[t.key] || !TI_EFFECTS[t.key as keyof typeof TI_EFFECTS]) throw new Error(`diagrams.ts: no diagram kind or caption for team instruction ${t.key}`);
}
for (const t of playerInstructions) {
  if (!PI_KINDS[t.key as PIKey] || !LOOK_AT[t.key] || !PI_EFFECTS[t.key as PIKey]) throw new Error(`diagrams.ts: no diagram kind or caption for player instruction ${t.key}`);
}
