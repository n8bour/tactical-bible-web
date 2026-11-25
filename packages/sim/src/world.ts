/// <reference path="./globals.d.ts" />
import { decideOffBall, decideOnBall, DT, isUrgent, steer } from './agent';
import { attr, n } from './attributes';
import { agentById, emit, giveBall, kick, rand, shoot, updateBall } from './ball';
import { dist, frame, PITCH } from './geom';
import { resolveMods, teamMods } from './mods';
import { gauss } from './rng';
import { phaseOf, targetsFor } from './tactics';
import type { AgentState, AttrKey, Beat, Knowledge, PIKey, SceneSpec, TeamId, Vec, WorldState } from './types';

const HISTORY = 24;

export const EXCLUSIVE: PIKey[][] = [
  ['shoot_more', 'shoot_less'],
  ['dribble_more', 'dribble_less'],
  ['take_more_risks', 'take_fewer_risks'],
  ['press_more', 'press_less'],
  ['tackle_harder', 'ease_off_tackles'],
  ['stay_wider', 'sit_narrower'],
  ['cross_from_byline', 'cross_from_deep'],
  ['target_near_post', 'target_centre', 'target_far_post'],
];

export function createWorld(sceneIn: SceneSpec, know: Knowledge): WorldState {
  const scene: SceneSpec = structuredClone(sceneIn);
  const w = {
    t: 0,
    tick: 0,
    agents: [],
    ball: { pos: { x: PITCH.len / 2, y: PITCH.wid / 2 }, z: 0, vel: { x: 0, y: 0 }, vz: 0, owner: null, lastTouch: null, lastTeam: null, intended: null, kind: null, releasedAt: 0, controlUntil: 0, shotOutcome: null, origin: null, target: null, scripted: false },
    possession: null,
    phase: ['oop', 'oop'],
    events: [],
    scene,
    teams: [scene.home, scene.away].map((spec) => ({ spec, phase: 'oop', lostAt: -Infinity, wonAt: -Infinity, mods: teamMods(spec, know) })),
    rng: { s: scene.seed >>> 0 },
    history: [],
    ballHistory: [],
    stats: {},
    scriptIdx: 0,
    beatAt: 0,
    firstShotT: null,
    know,
  } as unknown as WorldState;

  for (const spec of [...scene.home.agents, ...scene.away.agents]) {
    w.agents.push({
      spec,
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      heading: spec.team === 0 ? 0 : Math.PI,
      stamina: 1,
      perceivedAt: 0,
      lastDecisionT: -Infinity,
      intent: { kind: 'shape', target: { x: 0, y: 0 } },
      trace: [],
      planTarget: { x: 0, y: 0 },
      impulseTarget: { x: 0, y: 0 },
      slotErr: { x: gauss(() => rand(w)) * 0.7, y: gauss(() => rand(w)) * 0.7 },
      pressing: false,
      lastTackleT: -Infinity,
      receivedAt: 0,
      runCooldown: 0,
    });
    w.stats[spec.id] = { dist: 0, depthSum: 0, widthSum: 0, samples: 0 };
  }

  const owner = 'owner' in scene.ball ? agentById(w, scene.ball.owner) : undefined;
  if (owner) {
    owner.pos = { ...(scene.start?.[owner.spec.id] ?? { x: PITCH.len / 2, y: PITCH.wid / 2 }) };
    giveBall(w, owner);
  } else if ('pos' in scene.ball) w.ball.pos = { ...scene.ball.pos };
  // Two passes: the first places everyone on their phase target, the second re-targets against those positions.
  for (let pass = 0; pass < 2; pass++) {
    updateTactics(w);
    for (const a of w.agents) {
      if (a === owner) continue;
      const p = scene.start?.[a.spec.id];
      a.pos = p ? { ...p } : { ...a.intent.target };
    }
  }
  return w;
}

/** 4 Hz: phases and every agent's shape/role target. */
function updateTactics(w: WorldState) {
  w.phase = [phaseOf(w, 0), phaseOf(w, 1)];
  w.teams[0].phase = w.phase[0];
  w.teams[1].phase = w.phase[1];
  for (const a of w.agents) {
    const t = targetsFor(w, a, w.phase[a.spec.team]);
    a.planTarget = frame(a.spec.team, t.plan);
    a.impulseTarget = frame(a.spec.team, t.impulse);
    if (a.intent.kind === 'shape' || w.t === 0) {
      const adh = attr('shapeAdherence', a.spec.attrs);
      a.intent = { kind: 'shape', target: { x: a.impulseTarget.x + (a.planTarget.x - a.impulseTarget.x) * adh, y: a.impulseTarget.y + (a.planTarget.y - a.impulseTarget.y) * adh } };
    }
  }
}

/** The most recent applied beat that is not a run (runs don't hold the play up). */
function lastAction(script: Beat[], idx: number): Beat | undefined {
  for (let i = idx - 1; i >= 0; i--) if (script[i].kind !== 'run') return script[i];
  return undefined;
}

/** A beat waits for its passer to have the ball (and for a carry to arrive); it gives up after 4 s. */
function beatReady(w: WorldState, beat: Beat, prev: Beat | undefined): boolean {
  if (beat.t > w.t) return false;
  if (beat.kind === 'run' || w.t - Math.max(beat.t, w.beatAt) > 4) return true;
  if (w.ball.owner !== beat.from) return false;
  const a = agentById(w, beat.from);
  if (prev?.kind === 'carry' && prev.from === beat.from && prev.target && a && dist(a.pos, prev.target) > 3) return false;
  return w.t - w.beatAt > 0.35;
}

function applyBeat(w: WorldState, beat: Beat) {
  const a = agentById(w, beat.from);
  if (!a) return;
  w.beatAt = w.t;
  if (beat.kind === 'run') {
    const tgt = beat.target ?? a.pos;
    a.intent = { kind: 'run', run: 'box_centre', target: { ...tgt }, startAt: w.t + 0.15, until: w.t + 12 };
    a.runCooldown = w.t + 12;
    emit(w, 'run', a);
    return;
  }
  if (w.ball.owner !== a.spec.id) giveBall(w, a);
  const to = agentById(w, beat.to ?? null);
  const lead = (r: AgentState): Vec => ({ x: r.pos.x + r.vel.x * 0.6, y: r.pos.y + r.vel.y * 0.6 });
  const target = beat.target ?? (to ? lead(to) : frame(a.spec.team, { x: PITCH.len - 10, y: PITCH.wid / 2 }));
  a.heading = Math.atan2(target.y - a.pos.y, target.x - a.pos.x);
  const pressure = 0;
  switch (beat.kind) {
    case 'pass': {
      const d = dist(a.pos, target);
      kick(w, a, target, d > 32 ? 'air' : 'ground', { intended: to?.spec.id, pressure, endSpeed: 5, exact: true });
      w.ball.scripted = !!to;
      emit(w, 'pass', a, { to: to?.spec.id });
      if (to) to.intent = { kind: 'receive', target, until: w.t + 4 };
      break;
    }
    case 'cross':
      kick(w, a, target, 'air', { pressure });
      emit(w, 'cross', a);
      break;
    case 'clear':
      kick(w, a, target, 'air', { pressure });
      emit(w, 'clear', a);
      break;
    case 'shot':
      shoot(w, a, pressure);
      break;
    case 'carry':
      a.intent = { kind: 'carry', target, until: w.t + 4.5 };
      a.lastDecisionT = w.t + 4.5;
      break;
  }
}

function duels(w: WorldState) {
  const owner = agentById(w, w.ball.owner);
  if (!owner || w.scene.clip) return;
  for (const d of w.agents) {
    if (d.spec.team === owner.spec.team || !d.pressing || w.t - d.lastTackleT < 0.7) continue;
    if (dist(d.pos, owner.pos) > 2.0) continue;
    d.lastTackleT = w.t;
    const m = resolveMods(w.teams[d.spec.team].mods, d.spec, w.phase[d.spec.team], w.know);
    const commit = Math.min(1, attr('tackleCommit', d.spec.attrs) + m.tackleCommit);
    const foul = 0.08 + 0.25 * commit * (1 - n(d.spec.attrs.tck));
    const beat = attr('dribbleBeat', owner.spec.attrs, { opp: d.spec.attrs });
    const r = rand(w);
    if (r < foul) {
      emit(w, 'foul', d);
      d.lastTackleT = w.t + 1;
      continue;
    }
    if (rand(w) < (1 - beat) * (0.45 + 0.45 * commit)) {
      emit(w, 'tackle', d);
      giveBall(w, d);
      d.lastDecisionT = -Infinity;
      w.ball.controlUntil = w.t + 0.4;
      return;
    }
    emit(w, 'dribble', owner);
    d.vel = { x: d.vel.x * 0.3, y: d.vel.y * 0.3 };
    d.lastTackleT = w.t + 0.8;
  }
}

export function step(w: WorldState, dt = DT): void {
  w.t = Math.round((w.t + dt) * 1e6) / 1e6;
  w.tick++;
  const script = w.scene.script;
  while (w.scriptIdx < script.length && beatReady(w, script[w.scriptIdx], lastAction(script, w.scriptIdx))) applyBeat(w, script[w.scriptIdx++]);
  const scripted = w.scriptIdx < script.length;

  w.history.unshift(w.agents.map((a) => ({ ...a.pos })));
  if (w.history.length > HISTORY) w.history.pop();
  w.ballHistory.unshift({ ...w.ball.pos });
  if (w.ballHistory.length > HISTORY) w.ballHistory.pop();

  if (w.tick % 5 === 1) updateTactics(w);
  w.possession = w.ball.owner ? agentById(w, w.ball.owner)!.spec.team : w.ball.lastTeam ?? w.possession;

  if (w.ball.intended && !w.ball.owner && w.t - w.ball.releasedAt > 3) {
    w.ball.intended = null;
    w.ball.scripted = false;
  }
  for (const a of w.agents) {
    const team = a.spec.team;
    const phase = w.phase[team];
    const owner = w.ball.owner === a.spec.id;
    const tm = w.teams[team].mods;
    const interval = attr('decisionInterval', a.spec.attrs) * (owner ? tm.tempo : 1);
    if (owner) {
      if (!scripted && w.t >= w.ball.controlUntil && w.t - a.lastDecisionT >= interval) {
        if (w.scene.clip && a.spec.id !== w.scene.focus) {
          a.lastDecisionT = w.t;
          a.intent = { kind: 'hold', target: { ...a.pos } };
        } else decideOnBall(w, a, resolveMods(tm, a.spec, phase, w.know));
      } else if (scripted && a.intent.kind !== 'carry') {
        a.intent = { kind: 'hold', target: { ...a.pos } };
      }
    } else if (w.t - a.lastDecisionT >= interval || (a.intent.kind === 'receive' && w.ball.intended !== a.spec.id)) {
      decideOffBall(w, a, phase);
    }
    if (a.intent.kind === 'press' || a.intent.kind === 'chase') {
      const lag = Math.min(w.history.length - 1, Math.round(attr('reaction', a.spec.attrs) / DT));
      const carrier = agentById(w, w.ball.owner);
      const idx = carrier ? w.agents.indexOf(carrier) : -1;
      a.intent.target = idx >= 0 ? { ...(w.history[lag]?.[idx] ?? carrier!.pos) } : { ...(w.ballHistory[lag] ?? w.ball.pos) };
    }
    const b = w.ball;
    if (a.intent.kind === 'receive' && b.intended === a.spec.id && !b.owner) {
      const sp2 = b.vel.x * b.vel.x + b.vel.y * b.vel.y;
      if (b.kind === 'air' && b.target) a.intent.target = { ...b.target };
      else if (sp2 > 0.25) {
        const u = ((a.pos.x - b.pos.x) * b.vel.x + (a.pos.y - b.pos.y) * b.vel.y) / sp2;
        if (u < 0 && dist(a.pos, b.pos) > 2) {
          b.intended = null;
          b.scripted = false;
        }
        else a.intent.target = { x: b.pos.x + b.vel.x * Math.max(0, u), y: b.pos.y + b.vel.y * Math.max(0, u) };
      } else a.intent.target = { ...b.pos };
    }
    if (a.intent.kind === 'carry' && (!owner || w.t > (a.intent.until ?? 0))) a.intent = { kind: 'hold', target: { ...a.pos } };
    const waiting = a.intent.kind === 'run' && w.t < (a.intent.startAt ?? 0);
    const target = waiting ? a.pos : a.intent.target;
    const before = { ...a.pos };
    steer(a, target, dt, isUrgent(a.intent.kind), owner, a.intent.kind === 'press' || a.intent.kind === 'chase' || a.intent.kind === 'receive');
    const s = w.stats[a.spec.id];
    const f = frame(team, a.pos);
    s.dist += dist(before, a.pos);
    s.depthSum += f.x;
    s.widthSum += Math.abs(f.y - PITCH.wid / 2);
    s.samples++;
  }
  updateBall(w, dt);
  duels(w);
}

export function setAttr(w: WorldState, agentId: string, key: AttrKey, value: number) {
  const a = agentById(w, agentId);
  if (a) a.spec.attrs[key] = Math.max(1, Math.min(20, Math.round(value)));
}

export function setRole(w: WorldState, agentId: string, which: 'IP' | 'OOP', roleId: string) {
  const a = agentById(w, agentId);
  if (!a || !w.know.roles[roleId]) return;
  if (which === 'IP') a.spec.roleIP = roleId;
  else a.spec.roleOOP = roleId;
}

export function setTI(w: WorldState, team: TeamId, key: string, option: number) {
  const tr = w.teams[team];
  if (key === 'mentality') tr.spec.mentality = option;
  else tr.spec.tis[key] = option;
  tr.mods = teamMods(tr.spec, w.know);
}

export function setPI(w: WorldState, agentId: string, key: PIKey, on: boolean) {
  const a = agentById(w, agentId);
  if (!a) return;
  if (on) for (const group of EXCLUSIVE) if (group.includes(key)) for (const k of group) a.spec.pis[k] = false;
  a.spec.pis[key] = on;
}

export type Snapshot = Omit<WorldState, 'know'>;

export function snapshot(w: WorldState): Snapshot {
  const { know, ...rest } = w;
  void know;
  return structuredClone(rest);
}

/** structuredClone keeps the shared spec references (scene ↔ teams ↔ agents) intact. */
export function restore(w: WorldState, snap: Snapshot): void {
  Object.assign(w, structuredClone(snap));
}

export function hash(w: WorldState): string {
  let h = 2166136261;
  const mix = (v: number) => {
    const x = Math.round(v * 1000);
    h = Math.imul(h ^ (x & 0xffff), 16777619);
    h = Math.imul(h ^ (x >>> 16), 16777619);
  };
  for (const a of w.agents) {
    mix(a.pos.x);
    mix(a.pos.y);
  }
  mix(w.ball.pos.x);
  mix(w.ball.pos.y);
  mix(w.events.length);
  return (h >>> 0).toString(16);
}
