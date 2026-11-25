import { attr } from './attributes';
import { clamp, clampPitch, frame, PITCH } from './geom';
import { resolveMods, type Resolved } from './mods';
import type { AgentState, FormationSlot, LaneKey, Phase, TeamId, Vec, WorldState } from './types';

export const IP_PHASES: readonly Phase[] = ['build', 'prog', 'final', 'win'];
export const isIP = (ph: Phase) => IP_PHASES.includes(ph);

export function phaseOf(world: WorldState, team: TeamId): Phase {
  const tr = world.teams[team];
  const owns = world.possession === team;
  if (owns) {
    if (world.t - tr.wonAt < 4) return 'win';
    const b = frame(team, world.ball.pos);
    return b.x < 35 ? 'build' : b.x <= 70 ? 'prog' : 'final';
  }
  if (world.t - tr.lostAt < 4) return 'loss';
  return 'oop';
}

export function slotOf(world: WorldState, formation: string, code: string, index: number): FormationSlot {
  const f = world.know.formations[formation] ?? Object.values(world.know.formations)[0];
  return f.find((s) => s.code === code) ?? f[Math.min(index, f.length - 1)];
}

/** −1 left, +1 right (team frame), from the slot's legacy width coordinate. */
export function sideOf(slot: FormationSlot, flank: number): -1 | 1 {
  return slot.x < 45 ? -1 : slot.x > 55 ? 1 : flank >= 0 ? 1 : -1;
}

export function laneY(lane: LaneKey | number, side: number, width: number, ballY: number): number {
  if (typeof lane === 'number') return lane * 0.68;
  const toward = ballY >= PITCH.wid / 2 ? 1 : -1;
  const pct: Record<LaneKey, number> = {
    wide: side * Math.min(44 * width, 45),
    wide2: side * Math.min(36 * width, 43),
    wide3: side * Math.min(29 * width, 41),
    half: side * Math.min(18 * width, 36),
    in: side * 9 * width,
    in2: side * 13 * width,
    ch: side * 23 * width,
    cbw: side * 29,
    c: 0,
    ball: toward * 15,
    ballhalf: toward * 20,
  };
  return PITCH.wid / 2 + pct[lane] * 0.68;
}

const IP_DEPTH: Record<string, (y: number) => number> = {
  build: (y) => y * 0.6 + 3,
  prog: (y) => y * 0.85 + 8,
  final: (y) => Math.min(96, y * 0.75 + 25),
};

export interface Targets {
  plan: Vec;
  impulse: Vec;
  mods: Resolved;
}

/**
 * plan: where the tactic puts the player (formation + role anchor + instructions).
 * impulse: the same spot dragged towards the ball; Teamwork decides how much the player follows it instead of the plan.
 */
export function targetsFor(world: WorldState, a: AgentState, phase: Phase): Targets {
  const team = a.spec.team;
  const tr = world.teams[team];
  const tm = tr.mods;
  const mods = resolveMods(tm, a.spec, phase, world.know);
  const idx = tr.spec.agents.indexOf(a.spec);
  const ball = frame(team, world.ball.pos);
  const pm = mods.player;
  const prof = mods.profile;
  const isGK = a.spec.slot === 'GK';
  const mid = PITCH.wid / 2;

  if (isIP(phase)) {
    const slot = slotOf(world, tr.spec.formationIP, a.spec.slot, idx);
    const side = sideOf(slot, tm.flankBias ?? 0);
    const basePh = phase === 'win' ? 'prog' : phase;
    const shift = tm.blockShift[phase] ?? 0;
    const W = tm.widthScale;
    let depth = IP_DEPTH[basePh](slot.y) * 1.05 + (isGK ? 0 : shift);
    let y = mid + (slot.x * 0.68 - mid) * W;
    if (!isGK) y += (ball.y - mid) * 0.12;
    const anc = prof.anchor[basePh];
    if (anc?.depth != null) depth = anc.depth + (isGK ? 0 : shift);
    if (anc?.spread != null) y = mid + (slot.x * 0.68 - mid) * anc.spread;
    if (anc?.lane != null) y = laneY(anc.lane, side, W, ball.y);
    if (pm.laneShift) y += side * pm.laneShift;
    if (pm.depthShift) depth += pm.depthShift;
    if (pm.roam) {
      y += (ball.y - y) * 0.35 * pm.roam;
      depth += 4 * pm.roam;
    }
    return withImpulse({ x: depth, y }, ball, mods);
  }

  const slot = slotOf(world, tr.spec.formationOOP, a.spec.slotOOP ?? a.spec.slot, idx);
  const side = sideOf(slot, 0);
  const L = tm.lineHeight + (tm.lineStep ?? 0) * 2;
  const E = tm.loe;
  const shift = (tm.blockShift.oop ?? 0) + (phase === 'loss' ? 6 * (1 - (tm.regroup ?? 0)) : 0);
  let depth = isGK
    ? 2.5 + 9 * attr('gkRush', a.spec.attrs) * (L / 46)
    : L + (clamp(slot.y, 16, 86) - 18) / 66 * (E + 12 - L) + shift;
  // The line never sits in front of the ball: when the ball is deep in our half the whole block retreats.
  const drop = Math.max(0, L + shift - Math.max(7, ball.x - 3));
  if (!isGK) depth -= drop * (slot.y < 30 ? 1 : 0.75);
  const trap = (tm.trapSide ?? 0) * 3;
  let y = mid + (slot.x * 0.68 - mid) * 0.82 + (ball.y - mid) * (isGK ? 0.1 : 0.35);
  if (!isGK && Math.abs(slot.x - 50) > 25) y -= side * trap;
  const err = world.scene.strict ? 0 : attr('oopSlotErr', a.spec.attrs);
  depth += isGK ? prof.oop.holdLine * (L / 34) : prof.oop.holdLine;
  if (!isGK) {
    if (prof.oop.outletDepth != null) depth = Math.max(depth, prof.oop.outletDepth);
    if ((tm.gkPress ?? 0) > 0 && slot.y >= 66 && ball.x > 85) depth = Math.max(depth, 88);
    if (prof.oop.lane != null) y = laneY(prof.oop.lane, side, 1, ball.y) + (ball.y - mid) * 0.2;
    if (pm.laneShift) y += side * pm.laneShift * 0.5;
    depth += a.slotErr.x * err;
    y += a.slotErr.y * err;
  }
  return withImpulse({ x: depth, y }, ball, mods);
}

function withImpulse(p: Vec, ball: Vec, mods: Resolved): Targets {
  const plan = clampPitch(p, 1);
  const dx = (ball.x - plan.x) * 0.3, dy = (ball.y - plan.y) * 0.3;
  const k = Math.min(1, 8 / (Math.hypot(dx, dy) || 1));
  return { plan, impulse: clampPitch({ x: plan.x + dx * k, y: plan.y + dy * k }, 1), mods };
}

/** Deepest outfield opponent depth in this team's frame: the line attackers run against. */
export function oppLineX(world: WorldState, team: TeamId): number {
  let best = 0;
  for (const o of world.agents) {
    if (o.spec.team === team || o.spec.slot === 'GK') continue;
    const x = frame(team, o.pos).x;
    if (x > best) best = x;
  }
  return best || 70;
}

/** Highest own-team defender: own defensive line depth in team frame. */
export function ownLineX(world: WorldState, team: TeamId): number {
  let best: number = PITCH.len;
  for (const o of world.agents) {
    if (o.spec.team !== team || o.spec.slot === 'GK') continue;
    best = Math.min(best, frame(team, o.pos).x);
  }
  return best;
}
