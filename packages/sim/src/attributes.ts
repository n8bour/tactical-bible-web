import type { AttrKey, Attrs, Src } from './types';

export interface Ctx {
  stamina?: number;
  pressure?: number;
  incomingSpeed?: number;
  longRange?: boolean;
  opp?: Attrs;
  rng?: () => number;
}

export interface AttrRule {
  fn: (a: Attrs, ctx?: Ctx) => number;
  uses: AttrKey[];
  unit: string;
  formula: string;
  src: Src;
  note: string;
}

export const n = (v: number) => (Math.min(20, Math.max(1, v)) - 1) / 19;
export const logistic = (x: number) => 1 / (1 + Math.exp(-x));
const fat = (ctx?: Ctx) => 1 - 0.25 * (1 - (ctx?.stamina ?? 1));
const press = (ctx?: Ctx) => ctx?.pressure ?? 0;

const EST = 'Hand-tuned estimate; no public source for the exact curve.';

export const ATTR_MODEL = {
  topSpeed: {
    fn: (a, c) => (6.6 + 2.8 * n(a.pac)) * fat(c), uses: ['pac', 'sta'], unit: 'm/s', formula: '(6.6 + 2.8·n(Pace)) × fatigue',
    src: 'est', note: 'Range 6.6–9.4 m/s matches typical professional sprint speeds. ' + EST,
  },
  accel: {
    fn: (a, c) => (2.8 + 3.2 * n(a.acc)) * fat(c), uses: ['acc'], unit: 'm/s²', formula: '(2.8 + 3.2·n(Acceleration)) × fatigue',
    src: 'est', note: EST,
  },
  turnRate: {
    fn: (a) => 3.5 + 6.5 * (0.7 * n(a.agi) + 0.3 * n(a.bal)), uses: ['agi', 'bal'], unit: 'rad/s', formula: '3.5 + 6.5·(0.7·n(Agility) + 0.3·n(Balance))',
    src: 'est', note: EST,
  },
  reaction: {
    fn: (a) => 0.48 - 0.33 * n(a.ant), uses: ['ant'], unit: 's', formula: '0.48 − 0.33·n(Anticipation)',
    src: 'est', note: 'Delay before a player perceives a change in the ball. ' + EST,
  },
  percNoise: {
    fn: (a, c) => (0.3 + 2.4 * (1 - n(a.cnt))) * (1 + 0.6 * (1 - (c?.stamina ?? 1))), uses: ['cnt', 'sta'], unit: 'm', formula: '(0.3 + 2.4·(1 − n(Concentration))) × (1 + 0.6·tiredness)',
    src: 'est', note: 'Standard deviation of where a player thinks others are. ' + EST,
  },
  decisionInterval: {
    fn: (a) => 0.65 - 0.35 * n(a.dec), uses: ['dec'], unit: 's', formula: '0.65 − 0.35·n(Decisions)',
    src: 'est', note: EST,
  },
  decisionTemp: {
    fn: (a) => 0.04 + 0.45 * (1 - n(a.dec)), uses: ['dec'], unit: '', formula: '0.04 + 0.45·(1 − n(Decisions))',
    src: 'est', note: 'Softmax temperature over option utilities: low = picks the best option almost always. ' + EST,
  },
  visionRange: {
    fn: (a) => 18 + 32 * n(a.vis), uses: ['vis'], unit: 'm', formula: '18 + 32·n(Vision)',
    src: 'est', note: 'Longest pass the player considers. ' + EST,
  },
  visionCone: {
    fn: (a) => 100 + 140 * n(a.vis), uses: ['vis'], unit: '°', formula: '100 + 140·n(Vision)',
    src: 'est', note: 'Field of view around the heading; 360° when standing still on the ball. ' + EST,
  },
  throughBallSeen: {
    fn: (a, c) => (n(a.vis) >= 0.45 ? 1 : (c?.rng?.() ?? 1) < n(a.vis) / 0.45 ? 1 : 0), uses: ['vis'], unit: 'bool',
    formula: 'n(Vision) ≥ 0.45, otherwise a per-decision chance of n(Vision)/0.45',
    src: 'est', note: 'Whether through balls are even considered. ' + EST,
  },
  passAngleErr: {
    fn: (a, c) => (1.0 + 7 * (1 - n(a.pas))) * (1 + press(c) * 1.6 * (1 - n(a.cmp))), uses: ['pas', 'cmp'], unit: '° σ',
    formula: '(1 + 7·(1 − n(Passing))) × (1 + pressure·1.6·(1 − n(Composure)))', src: 'est', note: EST,
  },
  passSpeedErr: {
    fn: (a) => 0.04 + 0.16 * (1 - n(a.tec)), uses: ['tec'], unit: 'fraction σ', formula: '0.04 + 0.16·(1 − n(Technique))', src: 'est', note: EST,
  },
  crossErr: {
    fn: (a) => 1.2 + 6 * (1 - n(a.cro)), uses: ['cro'], unit: 'm σ', formula: '1.2 + 6·(1 − n(Crossing))', src: 'est', note: EST,
  },
  shotErr: {
    fn: (a, c) => (0.8 + 5 * (1 - n(c?.longRange ? a.lon : a.fin))) * (1 + press(c) * (1 - n(a.cmp))), uses: ['fin', 'lon', 'cmp'], unit: 'm σ',
    formula: '(0.8 + 5·(1 − n(Finishing or Long Shots))) × (1 + pressure·(1 − n(Composure)))', src: 'est', note: 'Long Shots replaces Finishing beyond 18 m. ' + EST,
  },
  touchLoss: {
    fn: (a, c) => (0.2 + 1.6 * (1 - n(a.fir))) * (1 + (0.5 * (c?.incomingSpeed ?? 10)) / 20), uses: ['fir'], unit: 'm',
    formula: '(0.2 + 1.6·(1 − n(First Touch))) × (1 + 0.5·incoming speed/20)', src: 'est', note: 'How far the ball escapes on reception; also delays the next action. ' + EST,
  },
  dribbleBeat: {
    fn: (a, c) => {
      const o = c?.opp ?? a;
      return logistic(1.6 * ((n(a.dri) + n(a.agi) + n(a.bal)) / 3 - (n(o.tck) + n(o.pos) + n(o.str) * 0.5) / 2.5));
    },
    uses: ['dri', 'agi', 'bal', 'tck', 'pos', 'str'], unit: 'p',
    formula: 'logistic(1.6·((Dribbling+Agility+Balance)/3 − (defender Tackling+Positioning+½Strength)/2.5))', src: 'est', note: 'Chance to beat the closest defender. ' + EST,
  },
  aerialWin: {
    fn: (a, c) => {
      const o = c?.opp ?? a;
      const s = (x: Attrs) => 0.5 * n(x.jum) + 0.35 * n(x.hea) + 0.15 * n(x.bra);
      return logistic(3 * (s(a) - s(o)));
    },
    uses: ['jum', 'hea', 'bra'], unit: 'p', formula: 'logistic(3·(0.5·Jumping + 0.35·Heading + 0.15·Bravery − opponent))', src: 'est', note: EST,
  },
  pressWill: {
    fn: (a) => 0.6 + 1.0 * n(a.wor), uses: ['wor'], unit: '×', formula: '0.6 + 1.0·n(Work Rate)', src: 'est',
    note: 'Scales the press radius and how far a player tracks runners. Tuned from 0.35 + 0.65·n: with the original range a Work Rate 12 striker in a high press never reached the centre-backs he should engage. ' + EST,
  },
  shapeAdherence: {
    fn: (a) => 0.45 + 0.55 * n(a.tea), uses: ['tea'], unit: 'weight', formula: '0.45 + 0.55·n(Teamwork)', src: 'est',
    note: 'Blend of the team-shape target against the player’s own role/run target. ' + EST,
  },
  oopSlotErr: {
    fn: (a) => 0.3 + 3.2 * (1 - n(a.pos)), uses: ['pos'], unit: 'm', formula: '0.3 + 3.2·(1 − n(Positioning))', src: 'est', note: 'Offset from the ideal defensive spot. ' + EST,
  },
  runTiming: {
    fn: (a) => 0.6 * n(a.otb) + 0.4 * n(a.ant), uses: ['otb', 'ant'], unit: 'q', formula: '0.6·n(Off the Ball) + 0.4·n(Anticipation)', src: 'est',
    note: 'Run quality: offside risk 0.35·(1−q), start delay 0.9·(1−q) s. ' + EST,
  },
  riskBias: {
    fn: (a) => -0.2 + 0.5 * n(a.fla), uses: ['fla'], unit: 'utility', formula: '−0.2 + 0.5·n(Flair)', src: 'est', note: 'Added to the utility of risky options. ' + EST,
  },
  tackleCommit: {
    fn: (a) => 0.3 + 0.5 * n(a.agg) + 0.2 * n(a.bra), uses: ['agg', 'bra', 'tck'], unit: '0..1', formula: '0.3 + 0.5·n(Aggression) + 0.2·n(Bravery); foul p = 0.08 + 0.25·commit·(1 − n(Tackling))',
    src: 'est', note: EST,
  },
  markDist: {
    fn: (a) => 3.2 - 1.8 * n(a.mar), uses: ['mar'], unit: 'm', formula: '3.2 − 1.8·n(Marking)', src: 'est', note: EST,
  },
  staminaDrain: {
    fn: (a, c) => (1 / 5400) * (c?.pressure ?? 1) * (1.3 - 0.6 * n(a.sta)) * (1.2 - 0.4 * n(a.nat)), uses: ['sta', 'nat'], unit: '/s',
    formula: 'intensity·(1.3 − 0.6·n(Stamina))·(1.2 − 0.4·n(Natural Fitness))/5400', src: 'est', note: 'Context pressure carries the running intensity. ' + EST,
  },
  gkReach: {
    fn: (a) => 2.0 + 1.4 * n(a.aer), uses: ['aer', 'han'], unit: 'm', formula: '2.0 + 1.4·n(Aerial Reach)', src: 'est', note: EST,
  },
  gkReact: {
    fn: (a) => 0.35 - 0.22 * n(a.ref), uses: ['ref', 'ovo'], unit: 's', formula: '0.35 − 0.22·n(Reflexes)', src: 'est', note: EST,
  },
  gkRush: {
    fn: (a) => n(a.tro) * (0.6 + 0.4 * n(a.cmd)), uses: ['tro', 'cmd'], unit: '0..1', formula: 'n(Rushing Out) × (0.6 + 0.4·n(Command of Area))', src: 'est', note: 'Scales how far the keeper starts from the line. ' + EST,
  },
} satisfies Record<string, AttrRule>;

export type AttrRuleKey = keyof typeof ATTR_MODEL;

export function attr(key: AttrRuleKey, a: Attrs, ctx?: Ctx): number {
  return ATTR_MODEL[key].fn(a, ctx);
}

export function rulesUsing(k: AttrKey): Array<[AttrRuleKey, AttrRule]> {
  return (Object.entries(ATTR_MODEL) as Array<[AttrRuleKey, AttrRule]>).filter(([, r]) => r.uses.includes(k));
}

export function defaultAttrs(v = 12): Attrs {
  const out = {} as Attrs;
  for (const k of ['cor', 'cro', 'dri', 'fin', 'fir', 'fre', 'hea', 'lon', 'lth', 'mar', 'pas', 'pen', 'tck', 'tec', 'agg', 'ant', 'bra', 'cmp', 'cnt', 'dec', 'det', 'fla', 'ldr', 'otb', 'pos', 'tea', 'vis', 'wor', 'acc', 'agi', 'bal', 'jum', 'nat', 'pac', 'sta', 'str', 'aer', 'cmd', 'com', 'ecc', 'han', 'kic', 'ovo', 'pun', 'ref', 'tro', 'thr'] as AttrKey[]) out[k] = v;
  return out;
}
