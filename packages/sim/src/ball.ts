import { attr, n } from './attributes';
import { clamp, dist, frame, PITCH } from './geom';
import { gauss, next } from './rng';
import type { AgentState, SimEventKind, TeamId, Vec, WorldState } from './types';

const G = 9.81;
export const FRICTION = 0.06 * G;
/** Speed-proportional drag from grass and air, on top of rolling friction (estimate). */
export const DRAG = 0.3;

/** Rolling distance from speed v to rest under FRICTION + DRAG·v. */
const rollDist = (v: number) => v / DRAG - (FRICTION / (DRAG * DRAG)) * Math.log(1 + (DRAG * v) / FRICTION);

/** Launch speed that still has `vEnd` left after `d` metres. */
function launchSpeed(d: number, vEnd: number): number {
  const want = d + rollDist(vEnd);
  let lo = vEnd, hi = 60;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (rollDist(mid) < want) lo = mid;
    else hi = mid;
  }
  return lo;
}
const CONTROL_R = 1.0;

export const rand = (w: WorldState) => next(w.rng);

export function agentById(w: WorldState, id: string | null): AgentState | undefined {
  return id == null ? undefined : w.agents.find((a) => a.spec.id === id);
}

export function emit(w: WorldState, kind: SimEventKind, a: AgentState, extra: { to?: string; progressive?: boolean } = {}) {
  w.events.push({ t: w.t, kind, agent: a.spec.id, team: a.spec.team, ...extra });
}

export function setPossession(w: WorldState, team: TeamId | null) {
  if (team === w.possession || team === null) return;
  w.teams[team].wonAt = w.possession === null ? -Infinity : w.t;
  w.teams[(1 - team) as TeamId].lostAt = w.possession === null ? -Infinity : w.t;
  w.possession = team;
}

export function giveBall(w: WorldState, a: AgentState) {
  const b = w.ball;
  b.owner = a.spec.id;
  b.lastTouch = a.spec.id;
  b.lastTeam = a.spec.team;
  b.kind = null;
  b.intended = null;
  b.z = 0;
  b.vz = 0;
  b.vel = { x: 0, y: 0 };
  b.pos = { ...a.pos };
  b.target = null;
  b.scripted = false;
  b.shotOutcome = null;
  setPossession(w, a.spec.team);
}

export type KickKind = 'ground' | 'air' | 'shot';

/** Release the ball from its owner toward a world-frame target with the kicker's execution error. */
export function kick(w: WorldState, a: AgentState, target: Vec, kind: KickKind, opts: { intended?: string; pressure: number; cross?: boolean; header?: boolean; flight?: number }) {
  const b = w.ball;
  const at = a.spec.attrs;
  const from = { ...a.pos };
  let tgt = { ...target };
  if (opts.cross) {
    const e = attr('crossErr', at);
    tgt = { x: tgt.x + gauss(() => rand(w)) * e, y: tgt.y + gauss(() => rand(w)) * e };
  }
  let ang = Math.atan2(tgt.y - from.y, tgt.x - from.x);
  const d = Math.max(1, dist(from, tgt));
  if (kind !== 'shot' && !opts.cross) ang += (gauss(() => rand(w)) * attr('passAngleErr', at, { pressure: opts.pressure }) * Math.PI) / 180;
  const sErr = 1 + gauss(() => rand(w)) * attr('passSpeedErr', at);
  b.owner = null;
  b.lastTouch = a.spec.id;
  b.lastTeam = a.spec.team;
  b.releasedAt = w.t;
  b.intended = opts.intended ?? null;
  b.origin = from;
  b.target = tgt;
  b.scripted = false;
  b.shotOutcome = null;
  b.pos = { ...from };
  if (kind === 'ground') {
    const v0 = launchSpeed(d, 7 + 0.1 * d) * sErr;
    b.vel = { x: Math.cos(ang) * v0, y: Math.sin(ang) * v0 };
    b.z = 0;
    b.vz = 0;
    b.kind = 'ground';
  } else if (kind === 'air') {
    const h = (14 + d * 0.15) * sErr * (opts.flight ?? 1);
    const T = d / h;
    b.vel = { x: Math.cos(ang) * h, y: Math.sin(ang) * h };
    b.z = 0.1;
    b.vz = (G * T) / 2;
    b.kind = 'air';
  } else {
    const v = opts.header ? 14 : 24;
    b.vel = { x: Math.cos(ang) * v, y: Math.sin(ang) * v };
    b.z = opts.header ? 1.8 : 0.3;
    b.vz = 0;
    b.kind = 'shot';
  }
}

/** Shot from the agent: aims inside a post and resolves goal/save/miss when the ball reaches the goal line. */
export function shoot(w: WorldState, a: AgentState, pressure: number, header = false) {
  const me = frame(a.spec.team, a.pos);
  const d = Math.hypot(PITCH.len - me.x, PITCH.wid / 2 - me.y);
  const longRange = d > 18;
  const err = attr('shotErr', header ? { ...a.spec.attrs, fin: a.spec.attrs.hea } : a.spec.attrs, { pressure, longRange });
  const aimSide = me.y < PITCH.wid / 2 ? 1 : -1;
  const aimY = PITCH.wid / 2 + aimSide * 2.4 + gauss(() => rand(w)) * err;
  const tgt = frame(a.spec.team, { x: PITCH.len + 0.5, y: aimY });
  kick(w, a, tgt, 'shot', { pressure, header });
  emit(w, 'shot', a);
  if (w.firstShotT === null) w.firstShotT = w.t;
}

function nearestOf(w: WorldState, p: Vec, team: TeamId, filter?: (a: AgentState) => boolean): AgentState | undefined {
  let best: AgentState | undefined;
  let bd = Infinity;
  for (const a of w.agents) {
    if (a.spec.team !== team || (filter && !filter(a))) continue;
    const d = dist(a.pos, p);
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}

function keeperOf(w: WorldState, team: TeamId) {
  return w.agents.find((a) => a.spec.team === team && a.spec.slot === 'GK') ?? w.agents.find((a) => a.spec.team === team)!;
}

function restartWith(w: WorldState, a: AgentState, at: Vec) {
  a.pos = { x: clamp(at.x, 1, PITCH.len - 1), y: clamp(at.y, 1, PITCH.wid - 1) };
  a.vel = { x: 0, y: 0 };
  giveBall(w, a);
  const quick = w.teams[a.spec.team].mods.restartSpeed ?? 0;
  a.lastDecisionT = w.t + 0.6 - 0.25 * quick;
  w.ball.controlUntil = w.t + 0.8 - 0.3 * quick;
}

function receive(w: WorldState, a: AgentState) {
  const b = w.ball;
  const passer = agentById(w, b.lastTouch);
  const speed = Math.hypot(b.vel.x, b.vel.y);
  const wasPass = b.kind === 'ground' || b.kind === 'air';
  const sameTeam = passer?.spec.team === a.spec.team;
  if (passer && passer !== a && wasPass) {
    if (sameTeam) {
      const o = frame(a.spec.team, b.origin ?? passer.pos);
      const r = frame(a.spec.team, a.pos);
      emit(w, 'pass_complete', passer, { to: a.spec.id, progressive: r.x - o.x >= 10 && r.x > 35 });
    } else emit(w, 'intercept', a);
  }
  giveBall(w, a);
  const loss = attr('touchLoss', a.spec.attrs, { incomingSpeed: speed });
  b.controlUntil = w.t + loss * 0.3;
  a.receivedAt = w.t;
  a.lastDecisionT = -Infinity;
  a.intent = { kind: 'hold', target: { ...a.pos } };
}

/** Advance the ball one tick: follow the owner, fly, roll, get intercepted, leave the pitch. */
export function updateBall(w: WorldState, dt: number) {
  const b = w.ball;
  const owner = agentById(w, b.owner);
  if (owner) {
    const h = owner.heading;
    b.pos = { x: owner.pos.x + Math.cos(h) * 0.7, y: owner.pos.y + Math.sin(h) * 0.7 };
    b.vel = { ...owner.vel };
    b.z = 0;
    return;
  }
  const prev = { ...b.pos };
  b.pos = { x: b.pos.x + b.vel.x * dt, y: b.pos.y + b.vel.y * dt };
  if (b.kind === 'air') {
    b.vz -= G * dt;
    b.z += b.vz * dt;
    if (b.z <= 0) {
      b.z = 0;
      b.vz = 0;
      b.kind = 'ground';
      b.vel = { x: b.vel.x * 0.55, y: b.vel.y * 0.55 };
    }
  } else if (b.kind === 'ground') {
    const s = Math.hypot(b.vel.x, b.vel.y);
    const ns = Math.max(0, s - (FRICTION + DRAG * s) * dt);
    b.vel = s > 0 ? { x: (b.vel.x / s) * ns, y: (b.vel.y / s) * ns } : b.vel;
  }

  const shooter = agentById(w, b.lastTouch);
  if (b.kind === 'shot' && shooter) {
    const team = shooter.spec.team;
    const p = frame(team, b.pos);
    if (p.x >= PITCH.len) {
      const q = frame(team, prev);
      const u = (PITCH.len - q.x) / Math.max(1e-6, p.x - q.x);
      const yAt = q.y + (p.y - q.y) * u;
      const gk = keeperOf(w, (1 - team) as TeamId);
      const onTarget = Math.abs(yAt - PITCH.wid / 2) <= PITCH.goalHalf;
      if (!onTarget) {
        emit(w, 'miss', shooter);
        restartWith(w, gk, frame(gk.spec.team, { x: 5.5, y: PITCH.wid / 2 }));
        return;
      }
      const g = frame(gk.spec.team, gk.pos);
      const reach = attr('gkReach', gk.spec.attrs);
      const lateral = Math.abs(g.y - (PITCH.wid - yAt));
      const react = attr('gkReact', gk.spec.attrs);
      const pSave = clamp(0.92 - lateral / (reach * 2.2) - react * 0.6 + n(gk.spec.attrs.han) * 0.1, 0.05, 0.95);
      if (rand(w) < pSave) {
        emit(w, 'save', gk);
        restartWith(w, gk, frame(gk.spec.team, { x: 2, y: clamp(PITCH.wid - yAt, 30.5, 37.5) }));
      } else {
        emit(w, 'goal', shooter);
        restartWith(w, gk, frame(gk.spec.team, { x: 5.5, y: PITCH.wid / 2 }));
      }
      return;
    }
  }

  if (b.pos.x < 0 || b.pos.x > PITCH.len || b.pos.y < 0 || b.pos.y > PITCH.wid) {
    const last = shooter ?? w.agents[0];
    emit(w, 'out', last);
    const team = (1 - last.spec.team) as TeamId;
    const overGoalLine = b.pos.x < 0 || b.pos.x > PITCH.len;
    const defendingGoal = frame(team, b.pos).x < 0;
    const taker = overGoalLine && defendingGoal ? keeperOf(w, team) : nearestOf(w, b.pos, team)!;
    const at = overGoalLine && defendingGoal ? frame(team, { x: 5.5, y: PITCH.wid / 2 }) : b.pos;
    restartWith(w, taker, at);
    return;
  }

  if (b.kind === 'air' && b.vz < 0 && b.z < 2.9 && b.z > 1.6) aerialContest(w);
  if (b.owner || b.z >= 1.9) return;

  let best: AgentState | undefined;
  let bd = Infinity;
  for (const a of w.agents) {
    if (a.spec.id === b.lastTouch && w.t - b.releasedAt < 0.3) continue;
    if (b.scripted && a.spec.id !== b.intended) continue;
    const isGK = a.spec.slot === 'GK';
    const r = b.kind === 'shot' ? (isGK ? 0 : 0.6) : isGK ? CONTROL_R * 1.4 : CONTROL_R;
    const d = dist(a.pos, b.pos);
    if (d <= r && d < bd) { bd = d; best = a; }
  }
  if (best) {
    if (b.kind === 'shot') emit(w, 'clear', best);
    receive(w, best);
  }
}

function aerialContest(w: WorldState) {
  const b = w.ball;
  const near = w.agents.filter((a) => dist(a.pos, b.pos) < (a.spec.slot === 'GK' ? attr('gkReach', a.spec.attrs) * 0.6 : 1.4));
  if (!near.length) return;
  const teams = new Set(near.map((a) => a.spec.team));
  const passerTeam = b.lastTeam ?? 0;
  const att = near.filter((a) => a.spec.team === passerTeam).sort((p, q) => dist(p.pos, b.pos) - dist(q.pos, b.pos))[0];
  const def = near.filter((a) => a.spec.team !== passerTeam).sort((p, q) => dist(p.pos, b.pos) - dist(q.pos, b.pos))[0];
  let winner = att ?? def;
  if (teams.size > 1 && att && def) {
    const gk = def.spec.slot === 'GK';
    const pAtt = gk ? 0.35 - 0.2 * n(def.spec.attrs.cmd) : attr('aerialWin', att.spec.attrs, { opp: def.spec.attrs });
    winner = rand(w) < pAtt ? att : def;
    emit(w, 'aerial', winner);
  }
  const p = frame(winner.spec.team, winner.pos);
  const inBox = p.x > 88.5 && Math.abs(p.y - PITCH.wid / 2) < 20;
  if (winner.spec.team === passerTeam && inBox && winner.spec.slot !== 'GK') {
    winner.vel = { x: 0, y: 0 };
    b.owner = null;
    b.pos = { ...winner.pos };
    shoot(w, winner, 0.5, true);
    return;
  }
  if (winner.spec.team !== passerTeam && winner.spec.slot !== 'GK' && p.x < 30) {
    b.pos = { ...winner.pos };
    winner.heading = winner.spec.team === 0 ? 0 : Math.PI;
    const clearTo = frame(winner.spec.team, { x: p.x + 30, y: clamp(p.y + (rand(w) - 0.5) * 30, 5, 63) });
    kick(w, winner, clearTo, 'air', { pressure: 1 });
    emit(w, 'clear', winner);
    return;
  }
  receive(w, winner);
}
