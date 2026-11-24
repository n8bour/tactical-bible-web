import { attr, n } from './attributes';
import { agentById, emit, kick, rand, shoot } from './ball';
import { angleDiff, clamp, clampPitch, dist, frame, lerp, perpDist, PITCH } from './geom';
import type { Resolved } from './mods';
import { gauss } from './rng';
import { isIP, laneY, oppLineX, targetsFor } from './tactics';
import type { AgentState, AttrKey, DecisionTrace, Intent, OptionTrace, Phase, RunKind, Vec, WorldState } from './types';
import { xt } from './xt';

export const DT = 0.05;
const MID = PITCH.wid / 2;

interface Seen {
  a: AgentState;
  p: Vec;
}

/** What the agent believes: positions `reaction` seconds old plus Concentration noise, in its own team frame. */
export function perceive(w: WorldState, a: AgentState): { mates: Seen[]; opps: Seen[]; ball: Vec } {
  const lag = Math.min(w.history.length - 1, Math.round(attr('reaction', a.spec.attrs) / DT));
  const snap = w.history[Math.max(0, lag)] ?? w.agents.map((x) => x.pos);
  const sd = attr('percNoise', a.spec.attrs, { stamina: a.stamina });
  const mates: Seen[] = [];
  const opps: Seen[] = [];
  w.agents.forEach((o, i) => {
    if (o === a) return;
    const raw = snap[i] ?? o.pos;
    const p = frame(a.spec.team, { x: raw.x + gauss(() => rand(w)) * sd, y: raw.y + gauss(() => rand(w)) * sd });
    (o.spec.team === a.spec.team ? mates : opps).push({ a: o, p });
  });
  a.perceivedAt = w.t;
  return { mates, opps, ball: frame(a.spec.team, w.ballHistory[Math.max(0, Math.min(w.ballHistory.length - 1, lag))] ?? w.ball.pos) };
}

const nearestD = (list: Seen[], p: Vec) => list.reduce((m, s) => Math.min(m, dist(s.p, p)), Infinity);

function laneOpen(opps: Seen[], from: Vec, to: Vec): number {
  let m = Infinity;
  for (const o of opps) {
    const { d, u } = perpDist(o.p, from, to);
    if (u > 0.05 && u < 0.98) m = Math.min(m, d / (0.5 + u));
  }
  return clamp(m / 3.5, 0, 1);
}

function xg(p: Vec): number {
  const d = Math.hypot(PITCH.len - p.x, MID - p.y);
  const ang = Math.abs(Math.atan2(MID - p.y, PITCH.len - p.x));
  return clamp(0.55 * Math.exp(-(d - 6) / 7) * Math.cos(ang) ** 1.5, 0.005, 0.7);
}

const ON_BALL_ATTRS: AttrKey[] = ['dec', 'vis', 'pas', 'cmp', 'fla', 'dri', 'fin', 'cro', 'tec'];

/** Score every on-ball option. Coordinates are computed in team frame and stored in world frame. */
export function onBallOptions(w: WorldState, a: AgentState, m: Resolved): OptionTrace[] {
  const team = a.spec.team;
  const at = a.spec.attrs;
  const { mates, opps } = perceive(w, a);
  const me = frame(team, a.pos);
  const heading = team === 0 ? a.heading : a.heading + Math.PI;
  const speed = Math.hypot(a.vel.x, a.vel.y);
  const pressure = clamp(1 - nearestD(opps, me) / 5, 0, 1);
  const range = attr('visionRange', at);
  const cone = speed < 0.5 ? 360 : attr('visionCone', at);
  const seesThrough = attr('throughBallSeen', at, { rng: () => rand(w) }) === 1;
  const risk = attr('riskBias', at);
  const ra = m.riskAversion;
  const xtHere = xt(me);
  const passLen = m.team.passLenPref;
  const gkd = a.spec.slot === 'GK' ? m.team.gkDistribution : undefined;
  const opts: OptionTrace[] = [];
  const toW = (p: Vec) => frame(team, p);

  const passOpt = (kind: 'pass' | 'throughPass', to: string, target: Vec) => {
    const d = dist(me, target);
    const air = d > 32;
    const open = air ? 0.75 : laneOpen(opps, me, target);
    const recv = clamp(1 - nearestD(opps, target) / 5, 0, 1);
    const pLoss = clamp(0.55 * (1 - open) + 0.3 * recv + 0.1 * (d / 40), 0, 1);
    const terms: Record<string, number> = {
      xt: (xt(target) - xtHere) * 12,
      lane: 0.5 * open,
      pressure: -0.6 * recv,
      length: -Math.abs(d - passLen) / 30,
      keep: 0.15,
      role: kind === 'pass' ? m.bias.pass : m.bias.through,
      caution: -ra * pLoss,
      flair: risk * (kind === 'throughPass' ? 0.4 + pLoss : pLoss * 0.6),
    };
    if (gkd === 'long') terms.distribution = d > 35 ? 0.6 : -0.3;
    if (gkd === 'short') terms.distribution = d < 25 ? 0.5 : -0.4;
    opts.push({ kind, to, target: toW(target), utility: 0, terms });
  };

  for (const s of mates) {
    const d = dist(me, s.p);
    if (d < 3 || d > range) continue;
    const ang = Math.abs(angleDiff(Math.atan2(s.p.y - me.y, s.p.x - me.x), heading)) * (180 / Math.PI);
    if (ang * 2 > cone) continue;
    passOpt('pass', s.a.spec.id, s.p);
    if (seesThrough && s.p.x > me.x - 2) {
      const lead = 7 + 3 * (m.team.receptionSpace ?? 0);
      const tgt = { x: Math.min(PITCH.len - 3, s.p.x + lead), y: s.p.y + (MID - s.p.y) * 0.15 };
      if (dist(me, tgt) <= range + 8) passOpt('throughPass', s.a.spec.id, tgt);
    }
  }

  const beatP = (() => {
    const near = opps.reduce<Seen | null>((b, s) => (!b || dist(s.p, me) < dist(b.p, me) ? s : b), null);
    return near ? attr('dribbleBeat', at, { opp: near.a.spec.attrs }) : 1;
  })();
  const carries: OptionTrace[] = [];
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * 2 * Math.PI;
    const tgt = clampPitch({ x: me.x + Math.cos(ang) * 6, y: me.y + Math.sin(ang) * 6 }, 1);
    const space = clamp(nearestD(opps, tgt) / 6, 0, 1);
    const pLoss = (1 - space) * (1 - beatP);
    const terms = { xt: (xt(tgt) - xtHere) * 12, space: 0.25 * space - 0.15, role: m.bias.carry, caution: -ra * pLoss, flair: risk * pLoss * 0.5 };
    carries.push({ kind: 'carry', target: toW(tgt), utility: Object.values(terms).reduce((s, v) => s + v, 0), terms });
  }
  // Eight directions would crowd the softmax; only the three best carries compete with passes.
  opts.push(...carries.sort((p, q) => q.utility - p.utility).slice(0, 3));

  const dGoal = Math.hypot(PITCH.len - me.x, MID - me.y);
  if (dGoal < 30 + m.bias.shoot * 10) {
    const blockers = opps.filter((o) => perpDist(o.p, me, { x: PITCH.len, y: MID }).d < 1.2 && o.p.x > me.x).length;
    const q = xg(me) * (1 - Math.min(0.7, blockers * 0.25));
    opts.push({
      kind: 'shoot', target: toW({ x: PITCH.len, y: MID }), utility: 0,
      terms: { xg: q * 8, cost: -0.35 - xtHere * 12, role: m.bias.shoot, flair: risk * 0.3 * (dGoal > 18 ? 1 : 0) },
    });
  }

  if (me.x > 70 && Math.abs(me.y - MID) > 13) {
    const box = mates.filter((s) => s.p.x > 86 && Math.abs(s.p.y - MID) < 20).length;
    const nearSide = me.y < MID ? -1 : 1;
    const zone = m.player.crossZone;
    const spot = zone === 'byline' ? (me.x > 94 ? 0.35 : -0.35) : zone === 'deep' ? (me.x < 88 ? 0.35 : -0.35) : 0;
    const zones: Array<[string, Vec]> = [
      ['near', { x: 99, y: MID + nearSide * 4 }],
      ['centre', { x: 96, y: MID }],
      ['far', { x: 98, y: MID - nearSide * 6 }],
    ];
    for (const [, tgt] of zones) {
      const def = opps.filter((o) => dist(o.p, tgt) < 3).length;
      opts.push({
        kind: 'cross', target: toW(tgt), utility: 0,
        terms: { box: 0.28 * box - 0.25 * def - 0.15, role: m.bias.cross, zone: spot, xt: (xt(tgt) - xtHere) * 4 },
      });
    }
  }

  opts.push({ kind: 'hold', target: toW(me), utility: 0, terms: { base: -0.4 - 0.5 * pressure, role: m.bias.hold } });
  for (const o of opts) o.utility = Object.values(o.terms).reduce((s, v) => s + v, 0);
  return opts;
}

/** Softmax pick; Decisions sets the temperature. */
export function choose(w: WorldState, opts: OptionTrace[], temp: number): number {
  const max = Math.max(...opts.map((o) => o.utility));
  const ws = opts.map((o) => Math.exp((o.utility - max) / temp));
  const sum = ws.reduce((s, v) => s + v, 0);
  let r = rand(w) * sum;
  for (let i = 0; i < ws.length; i++) {
    r -= ws[i];
    if (r <= 0) return i;
  }
  return ws.length - 1;
}

function pushTrace(a: AgentState, tr: DecisionTrace) {
  a.trace.push(tr);
  if (a.trace.length > 20) a.trace.shift();
}

function pressureOn(w: WorldState, a: AgentState): number {
  let d = Infinity;
  for (const o of w.agents) if (o.spec.team !== a.spec.team) d = Math.min(d, dist(o.pos, a.pos));
  return clamp(1 - d / 5, 0, 1);
}

export function decideOnBall(w: WorldState, a: AgentState, m: Resolved): DecisionTrace {
  const opts = onBallOptions(w, a, m);
  const idx = choose(w, opts, attr('decisionTemp', a.spec.attrs));
  const tr: DecisionTrace = { t: w.t, chosen: idx, options: opts, attrsUsed: ON_BALL_ATTRS };
  pushTrace(a, tr);
  a.lastDecisionT = w.t;
  execute(w, a, opts[idx]);
  return tr;
}

export function execute(w: WorldState, a: AgentState, o: OptionTrace) {
  const pressure = pressureOn(w, a);
  const me = frame(a.spec.team, a.pos);
  switch (o.kind) {
    case 'pass':
    case 'throughPass': {
      const d = dist(a.pos, o.target);
      kick(w, a, o.target, d > 32 ? 'air' : 'ground', { intended: o.to, pressure });
      emit(w, o.kind === 'pass' ? 'pass' : 'through', a, { to: o.to });
      const r = agentById(w, o.to ?? null);
      if (r) r.intent = { kind: 'receive', target: o.target, until: w.t + 4 };
      break;
    }
    case 'cross': {
      const h = w.teams[a.spec.team].mods.crossHeight;
      kick(w, a, o.target, h === 'low' ? 'ground' : 'air', { pressure, cross: true, flight: h === 'whipped' ? 1.3 : h === 'floated' ? 0.75 : 1 });
      emit(w, 'cross', a);
      break;
    }
    case 'shoot':
      shoot(w, a, pressure);
      break;
    case 'carry':
      a.intent = { kind: 'carry', target: o.target, until: w.t + 1.2 };
      emit(w, 'carry', a);
      break;
    case 'hold':
      a.intent = { kind: 'hold', target: frame(a.spec.team, { x: me.x, y: me.y }) };
      break;
    default:
      break;
  }
}

function runTarget(w: WorldState, a: AgentState, kind: RunKind, role: Vec, m: Resolved): Vec {
  const team = a.spec.team;
  const lineX = oppLineX(w, team);
  const ball = frame(team, w.ball.pos);
  const side = role.y < MID ? -1 : 1;
  const box = m.player.boxTarget;
  const bSide = ball.y < MID ? -1 : 1;
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
}

function startRun(w: WorldState, a: AgentState, kind: RunKind, role: Vec, m: Resolved, delayExtra = 0): boolean {
  const q = attr('runTiming', a.spec.attrs);
  if (kind === 'beyond' || kind === 'channel') {
    if (rand(w) < 0.35 * (1 - q)) {
      emit(w, 'offside', a);
      a.runCooldown = w.t + 2.5;
      return false;
    }
  }
  const tgt = runTarget(w, a, kind, role, m);
  if (m.player.laneShift && !kind.startsWith('box')) tgt.y += (role.y < MID ? -1 : 1) * m.player.laneShift;
  a.intent = { kind: 'run', run: kind, target: clampPitch(frame(a.spec.team, tgt), 1), startAt: w.t + 0.9 * (1 - q) + delayExtra, until: w.t + 4 + delayExtra };
  a.runCooldown = w.t + 5;
  emit(w, 'run', a);
  return true;
}

/** Off-ball choice: hold the blend of role and team-shape targets, make a run, press or mark. */
export function decideOffBall(w: WorldState, a: AgentState, phase: Phase) {
  const t = targetsFor(w, a, phase);
  const m = t.mods;
  const team = a.spec.team;
  const adh = attr('shapeAdherence', a.spec.attrs);
  const home = lerp(t.impulse, t.plan, adh);
  a.lastDecisionT = w.t;
  const options: OptionTrace[] = [{ kind: 'shape', target: frame(team, home), utility: adh, terms: { teamwork: adh } }];
  const b = w.ball;
  const carrier = agentById(w, b.owner);

  if (a.intent.kind === 'receive' && b.intended === a.spec.id && b.owner === null && w.t < (a.intent.until ?? 0)) return;

  if (!b.owner && b.intended === null && b.kind !== 'shot') {
    const mine = w.agents.filter((o) => o.spec.team === team && o.spec.slot !== 'GK').sort((p, q) => dist(p.pos, b.pos) - dist(q.pos, b.pos));
    if (mine[0] === a) {
      a.intent = { kind: 'chase', target: { ...b.pos } };
      return;
    }
  }

  if (isIP(phase)) {
    if (a.intent.kind === 'run' && w.t < (a.intent.until ?? 0) && dist(a.pos, a.intent.target) > 1.5) return;
    const runs = [...m.profile.runs];
    if (m.player.channelRun) runs.push({ kind: 'channel', phase: 'final', p: 0.6 }, { kind: 'channel', phase: 'prog', p: 0.5 });
    if (m.player.lateRun) runs.push({ kind: 'late_box', phase: 'final', p: 0.8 });
    const sup = m.team.overlap ?? 0;
    const isFB = /^(DL|DR|WBL|WBR)$/.test(a.spec.slot);
    if (isFB && sup !== 0) runs.push({ kind: sup > 0 ? 'overlap' : 'underlap', phase: 'final', p: 0.6 });
    // Runs start once a teammate has settled the ball and is not facing his own goal, or as a team pass travels.
    const settled = carrier && carrier.spec.team === team && Math.cos(team === 0 ? carrier.heading : carrier.heading + Math.PI) > -0.3 && w.t - carrier.receivedAt > 0.4;
    const passing = !carrier && b.lastTeam === team && b.intended !== null && b.intended !== a.spec.id;
    const carrierFwd = settled || passing;
    const runPh = phase === 'win' ? ['prog', 'final'] : [phase];
    const supP = m.team.supportRunsP ?? 0;
    if (!m.player.holdRuns && carrier !== a && carrierFwd && w.t > a.runCooldown) {
      for (const r of runs) {
        if (r.kind === 'hold' || !runPh.includes(r.phase)) continue;
        const p = clamp(r.p * 0.45 + supP, 0, 0.95);
        options.push({ kind: 'run', run: r.kind, target: frame(team, runTarget(w, a, r.kind, t.plan, m)), utility: p, terms: { role: r.p, team: supP } });
      }
      const picks = options.filter((o) => o.kind === 'run');
      for (const o of picks) {
        if (rand(w) < o.utility) {
          const late = o.run === 'late_box' ? 1.2 : 0;
          if (startRun(w, a, o.run!, t.plan, m, late)) {
            pushTrace(a, { t: w.t, chosen: options.indexOf(o), options, attrsUsed: ['otb', 'ant', 'tea'] });
            return;
          }
        }
      }
    }
    if (m.player.lineRun && phase !== 'build') {
      const lineX = oppLineX(w, team);
      home.x = Math.max(home.x, lineX - 0.5);
    }
    a.intent = { kind: 'shape', target: frame(team, clampPitch(home, 1)) };
    pushTrace(a, { t: w.t, chosen: 0, options, attrsUsed: ['tea', 'otb'] });
    return;
  }

  if (a.spec.slot === 'GK') {
    const bp = frame(team, b.pos);
    const dy = bp.y - MID;
    const L = Math.hypot(bp.x, dy) || 1;
    const k = Math.min(t.plan.x, L * 0.35);
    a.intent = { kind: 'keeper', target: frame(team, { x: 0.5 + (bp.x / L) * k, y: MID + (dy / L) * k }) };
    return;
  }

  const ownedByOpp = carrier && carrier.spec.team !== team;
  if (ownedByOpp) {
    const { opps } = perceive(w, a);
    const seen = opps.find((s) => s.a === carrier)?.p ?? frame(team, carrier.pos);
    const me = frame(team, a.pos);
    const d = dist(me, seen);
    const counter = phase === 'loss' ? 1 + (m.team.counterpress ?? 0) : 1;
    const radius = m.profile.oop.pressRadius * attr('pressWill', a.spec.attrs) * m.pressMult * counter;
    const scripted = w.scriptIdx < w.scene.script.length;
    const inLoe = !scripted && (seen.x < m.team.loe + 12 || phase === 'loss');
    const closer = w.agents.filter((o) => o.spec.team === team && o !== a && o.spec.slot !== 'GK' && dist(o.pos, carrier.pos) < dist(a.pos, carrier.pos)).length;
    options.push({ kind: 'press', to: carrier.spec.id, target: carrier.pos, utility: radius - d, terms: { radius, distance: -d } });
    if (d < radius && inLoe && closer < 2) {
      if (!a.pressing) emit(w, 'press', a);
      a.pressing = true;
      a.intent = { kind: 'press', target: { ...carrier.pos } };
      pushTrace(a, { t: w.t, chosen: options.length - 1, options, attrsUsed: ['wor', 'ant', 'cnt'] });
      return;
    }
    a.pressing = false;
    let mark: Seen | null = null;
    let md = 10;
    for (const s of opps) {
      if (s.a === carrier || s.a.spec.slot === 'GK') continue;
      const dd = dist(s.p, t.plan);
      if (dd < md) { md = dd; mark = s; }
    }
    if (mark) {
      const md2 = Math.max(0.6, attr('markDist', a.spec.attrs) + m.markDelta);
      const toGoal = { x: -mark.p.x, y: MID - mark.p.y };
      const l = Math.hypot(toGoal.x, toGoal.y) || 1;
      const goalSide = { x: mark.p.x + (toGoal.x / l) * md2, y: mark.p.y + (toGoal.y / l) * md2 };
      const track = m.profile.oop.mark === 'man' ? 1 : m.profile.oop.track * attr('pressWill', a.spec.attrs);
      const tgt = lerp(home, goalSide, clamp(track, 0, 1) * 0.8);
      options.push({ kind: 'mark', to: mark.a.spec.id, target: frame(team, tgt), utility: track, terms: { track, marking: -md2 } });
      a.intent = { kind: 'mark', target: frame(team, clampPitch(tgt, 1)) };
      pushTrace(a, { t: w.t, chosen: options.length - 1, options, attrsUsed: ['mar', 'pos', 'wor', 'tea'] });
      return;
    }
  }
  a.pressing = false;
  a.intent = { kind: 'shape', target: frame(team, clampPitch(home, 1)) };
  pushTrace(a, { t: w.t, chosen: 0, options, attrsUsed: ['tea', 'pos'] });
}

const URGENT: Partial<Record<Intent['kind'], true>> = { press: true, run: true, chase: true, receive: true, carry: true, keeper: true };

/** Arrive/pursue toward the intent, limited by Acceleration, Pace and Agility. Pure kinematics. */
export function steer(a: AgentState, target: Vec, dt: number, urgent: boolean, owner = false, pursue = false) {
  const at = a.spec.attrs;
  const top = attr('topSpeed', at, { stamina: a.stamina }) * (owner ? 0.85 : 1);
  const acc = attr('accel', at, { stamina: a.stamina });
  const turn = attr('turnRate', at);
  const dx = target.x - a.pos.x, dy = target.y - a.pos.y;
  const d = Math.hypot(dx, dy);
  const cruise = urgent || d > 8 ? top : top * 0.7;
  const want = pursue ? cruise : Math.min(cruise, d * 1.6);
  let dvx = (d > 1e-6 ? (dx / d) * want : 0) - a.vel.x;
  let dvy = (d > 1e-6 ? (dy / d) * want : 0) - a.vel.y;
  const dv = Math.hypot(dvx, dvy);
  const cap = acc * dt * (want < Math.hypot(a.vel.x, a.vel.y) ? 1.8 : 1);
  if (dv > cap) { dvx = (dvx / dv) * cap; dvy = (dvy / dv) * cap; }
  let vx = a.vel.x + dvx, vy = a.vel.y + dvy;
  const sp = Math.hypot(vx, vy);
  const cur = Math.hypot(a.vel.x, a.vel.y);
  if (sp > 1 && cur > 1) {
    const h0 = Math.atan2(a.vel.y, a.vel.x);
    const h1 = Math.atan2(vy, vx);
    const diff = angleDiff(h1, h0);
    const lim = turn * dt;
    if (Math.abs(diff) > lim) {
      const h = h0 + Math.sign(diff) * lim;
      const s2 = Math.min(sp, cur);
      vx = Math.cos(h) * s2;
      vy = Math.sin(h) * s2;
    }
  }
  a.vel = { x: vx, y: vy };
  a.pos = { x: clamp(a.pos.x + vx * dt, 0.3, PITCH.len - 0.3), y: clamp(a.pos.y + vy * dt, 0.3, PITCH.wid - 0.3) };
  if (Math.hypot(vx, vy) > 0.3) a.heading = Math.atan2(vy, vx);
  const intensity = Math.hypot(vx, vy) / top;
  a.stamina = Math.max(0, a.stamina - attr('staminaDrain', at, { pressure: 0.3 + intensity }) * dt);
}

export const isUrgent = (k: Intent['kind']) => URGENT[k] === true;
