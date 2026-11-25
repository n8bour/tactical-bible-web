import type { Beat, Phase, Vec } from '@tb/sim';
import { FORMATIONS } from '../knowledge';

/**
 * One short, fully scripted clip per role: everybody else only takes his tactical position, and the ball and the
 * selected player do exactly the role's signature move. World metres: the home team attacks towards x = 105; the
 * opponent (always the default 4-2-3-1) attacks towards x = 0.
 */
export interface RoleClip {
  phase: Phase;
  owner: string;
  at: Vec;
  beats: Beat[];
}

type B = Omit<Beat, 't'>;

const MIRROR: Record<string, string> = {};
for (const [l, r] of [['DCL', 'DCR'], ['MCL', 'MCR'], ['AML', 'AMR'], ['DL', 'DR'], ['WBL', 'WBR'], ['ML', 'MR'], ['STL', 'STR'], ['DML', 'DMR'], ['AMCL', 'AMCR']]) {
  MIRROR[l] = r;
  MIRROR[r] = l;
}

/**
 * Home team-mates by job: the first free position code in the list (written for a player on the left, mirrored for the
 * right), else the nearest free slot to a reference spot (legacy formation coordinates). Order matters: earlier jobs pick first.
 */
const JOBS: Array<[job: string, codes: string[], lx: number, ly: number]> = [
  ['st', ['ST', 'STL', 'STR', 'AMC'], 50, 90],
  ['cb', ['DCL', 'DC', 'DCR'], 36, 20],
  ['cb2', ['DCR', 'DC', 'DCL'], 64, 20],
  ['w', ['AML', 'ML', 'AMCL', 'WBL'], 12, 74],
  ['wf', ['AMR', 'MR', 'AMCR', 'WBR'], 88, 74],
  ['dm', ['DM', 'DML', 'DMR', 'MC'], 50, 38],
  ['cm', ['MCL', 'MC', 'DML', 'AMCL', 'MCR'], 34, 54],
  ['cm2', ['MCR', 'MC', 'DMR', 'AMCR', 'MCL'], 66, 54],
  ['fb', ['DL', 'WBL'], 8, 28],
  ['am', ['AMC', 'AMCL', 'AMCR'], 50, 70],
];

interface Ctx {
  me: string;
  /** −1: the selected player is on the left (small y); +1: on the right. Central players count as right, like the simulation's lanes. */
  S: -1 | 1;
  /** home team-mate for a job: st, w (near-side wide player), wf (far side), cb, cb2, dm, cm, cm2, fb, am, gk */
  h: (job: string) => string;
  /** opponent by code as seen with the selected player on the left (mirrored when he is on the right) */
  a: (code: string) => string;
  /** world point `v` metres from the centre line towards the selected player's touchline */
  P: (x: number, v: number) => Vec;
}

function ctx(formation: string, slot: string): Ctx {
  const slots = FORMATIONS[formation];
  const mine = slots.find((s) => s.code === slot) ?? slots[0];
  const S: -1 | 1 = mine.x < 45 ? -1 : 1;
  const m = (c: string) => (S === 1 ? (MIRROR[c] ?? c) : c);
  const used = new Set([slot, 'GK']);
  const free = (c: string) => !used.has(c) && slots.some((s) => s.code === c);
  const team: Record<string, string> = { gk: 'h_GK' };
  for (const [job, codes, lx, ly] of JOBS) {
    const x = S === 1 ? 100 - lx : lx;
    const code = codes.map(m).find(free) ?? slots.filter((s) => !used.has(s.code)).sort((p, q) => Math.hypot(p.x - x, p.y - ly) - Math.hypot(q.x - x, q.y - ly))[0]?.code;
    if (!code) continue;
    used.add(code);
    team[job] = `h_${code}`;
  }
  return {
    me: `h_${slot}`,
    S,
    h: (job) => team[job] ?? 'h_GK',
    a: (code) => `a_${m(code)}`,
    P: (x, v) => ({ x, y: 34 + S * v }),
  };
}

const pass = (from: string, to: string, o: Partial<B> = {}): B => ({ kind: 'pass', from, to, ...o });
const carry = (from: string, target: Vec, o: Partial<B> = {}): B => ({ kind: 'carry', from, target, ...o });
const run = (from: string, target: Vec, o: Partial<B> = {}): B => ({ kind: 'run', from, target, ...o });
const mark = (from: string, to: string, gap: number, o: Partial<B> = {}): B => ({ kind: 'mark', from, to, gap, ...o });
const cross = (from: string, to: string, target: Vec, o: Partial<B> = {}): B => ({ kind: 'cross', from, to, target, ...o });
const shot = (from: string, o: Partial<B> = {}): B => ({ kind: 'shot', from, ...o });

/** Default opponent move into the selected player's zone: the deep midfielder starts with the ball in the middle. */
const oppStart = (c: Ctx) => ({ owner: c.a('DMR'), at: { x: 62, y: 34 } });

interface Draft {
  phase?: Phase;
  owner: string;
  at: Vec;
  beats: B[];
}
type Def = (c: Ctx) => Draft;

/** An opponent attack on the other flank, the ball won back, then straight to the player who stayed up. */
function outlet(c: Ctx, spot: Vec): Draft {
  return {
    phase: 'oop',
    ...oppStart(c),
    beats: [
      run(c.me, spot),
      pass(c.a('DMR'), c.a('AML'), { wait: 0.8 }),
      carry(c.a('AML'), c.P(34, -24)),
      pass(c.a('AML'), c.h('cb2'), { wait: 0.6 }),
      pass(c.h('cb2'), c.me, { wait: 0.7, target: spot }),
      carry(c.me, { x: spot.x + 12, y: spot.y }, { wait: 0.3 }),
    ],
  };
}

const CLIPS: Record<string, Def> = {
  // ── Goalkeepers ──
  gk_ip: (c) => ({ phase: 'build', owner: c.me, at: { x: 5, y: 34 }, beats: [pass(c.me, c.h('cb'), { wait: 0.8 }), pass(c.h('cb'), c.h('dm'), { wait: 0.8 })] }),
  bpgk: (c) => ({
    phase: 'build', owner: c.h('cb'), at: c.P(18, 14),
    beats: [run(c.me, { x: 15, y: 34 }), pass(c.h('cb'), c.me, { wait: 1.4, target: { x: 15, y: 34 } }), pass(c.me, c.h('cm2'), { wait: 0.7 })],
  }),
  nngk: (c) => ({ phase: 'build', owner: c.me, at: { x: 6, y: 34 }, beats: [pass(c.me, c.h('st'), { wait: 0.8 })] }),
  gk_oop: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [pass(c.a('DMR'), c.a('AMC'), { wait: 0.6 }), carry(c.a('AMC'), { x: 24, y: 34 }), shot(c.a('AMC'))],
  }),
  lhk: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [pass(c.a('DMR'), c.a('AMR'), { wait: 0.6 }), carry(c.a('AMR'), c.P(12, 26)), run(c.a('ST'), { x: 8, y: 34 }), cross(c.a('AMR'), c.a('ST'), { x: 8, y: 34 })],
  }),
  swk: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [run(c.a('ST'), { x: 20, y: 34 }, { wait: 0.6 }), run(c.me, { x: 23, y: 34 }, { dur: 4 }), pass(c.a('DMR'), c.me, { wait: 0.2, target: { x: 23, y: 34 } }), { kind: 'clear', from: c.me, target: { x: 62, y: 34 }, wait: 0.4 }],
  }),

  // ── Centre-backs ──
  cb_ip: (c) => ({ phase: 'build', owner: c.h('gk'), at: { x: 5, y: 34 }, beats: [pass(c.h('gk'), c.me, { wait: 0.8 }), pass(c.me, c.h('dm'), { wait: 0.9 })] }),
  bpcb: (c) => ({ phase: 'build', owner: c.h('gk'), at: { x: 5, y: 34 }, beats: [pass(c.h('gk'), c.me, { wait: 0.8 }), pass(c.me, c.h('st'), { wait: 0.9 })] }),
  nncb: (c) => ({ phase: 'build', owner: c.h('gk'), at: { x: 5, y: 34 }, beats: [pass(c.h('gk'), c.me, { wait: 0.8 }), { kind: 'clear', from: c.me, target: { x: 80, y: 34 }, wait: 0.5 }] }),
  acb: (c) => ({
    phase: 'build', owner: c.h('gk'), at: { x: 5, y: 34 },
    beats: [pass(c.h('gk'), c.me, { wait: 0.8 }), carry(c.me, c.P(48, 6), { wait: 0.4 }), pass(c.me, c.h('cm'), { wait: 0.2 })],
  }),
  ocb: (c) => ({
    phase: 'prog', owner: c.me, at: c.P(42, 14),
    beats: [pass(c.me, c.h('fb'), { wait: 0.8 }), carry(c.h('fb'), c.P(66, 28)), run(c.me, c.P(88, 29)), pass(c.h('fb'), c.me, { target: c.P(88, 29) }), cross(c.me, c.h('st'), { x: 96, y: 34 }, { wait: 0.4 })],
  }),
  cb_oop: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [run(c.a('ST'), c.P(36, 3)), mark(c.me, c.a('ST'), 1.5, { wait: 0.4 }), pass(c.a('DMR'), c.a('ST'), { wait: 0.9 }), pass(c.a('ST'), c.a('AMC'), { wait: 1.2 })],
  }),
  ccb: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [pass(c.a('DMR'), c.a('AMC'), { wait: 0.6 }), run(c.me, c.P(13, 2)), run(c.a('ST'), c.P(16, -6), { wait: 0.4 }), pass(c.a('AMC'), c.a('ST'), { wait: 1.3, target: c.P(16, -6) })],
  }),
  scb: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [run(c.a('AMC'), c.P(38, 6)), pass(c.a('DMR'), c.a('AMC'), { wait: 0.9 }), mark(c.me, c.a('AMC'), 1, { wait: 0.1 }), pass(c.a('AMC'), c.a('DMR'), { wait: 1.6 })],
  }),
  cwcb: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [run(c.a('AMR'), c.P(18, 26)), mark(c.me, c.a('AMR'), 2), pass(c.a('DMR'), c.a('AMR'), { wait: 0.6, target: c.P(18, 26) }), pass(c.a('AMR'), c.a('DMR'), { wait: 1.2 })],
  }),
  swcb: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [run(c.a('AMR'), c.P(36, 14)), pass(c.a('DMR'), c.a('AMR'), { wait: 0.9 }), mark(c.me, c.a('AMR'), 1, { wait: 0.1 }), pass(c.a('AMR'), c.a('DMR'), { wait: 1.6 })],
  }),

  // ── Full-backs and wing-backs ──
  fb_ip: (c) => ({
    phase: 'build', owner: c.h('cb'), at: c.P(18, 14),
    beats: [pass(c.h('cb'), c.me, { wait: 0.6 }), pass(c.me, c.h('w'), { wait: 0.8 }), run(c.me, c.P(62, 30), { dur: 4 })],
  }),
  ifb: (c) => ({
    phase: 'build', owner: c.h('gk'), at: { x: 5, y: 34 },
    beats: [run(c.me, c.P(17, 20)), pass(c.h('gk'), c.me, { wait: 1.6, target: c.P(17, 20) }), pass(c.me, c.h('dm'), { wait: 0.8 })],
  }),
  wb_ip: (c) => ({
    phase: 'prog', owner: c.h('cb'), at: c.P(28, 14),
    beats: [run(c.me, c.P(68, 30)), pass(c.h('cb'), c.h('cm'), { wait: 0.6 }), pass(c.h('cm'), c.me, { wait: 0.6, target: c.P(68, 30) }), carry(c.me, c.P(84, 30)), cross(c.me, c.h('st'), { x: 96, y: 34 })],
  }),
  iwb: (c) => ({
    phase: 'build', owner: c.h('gk'), at: { x: 5, y: 34 },
    beats: [run(c.me, c.P(36, 10)), pass(c.h('gk'), c.h('cb'), { wait: 0.8 }), pass(c.h('cb'), c.me, { wait: 0.9, target: c.P(36, 10) }), pass(c.me, c.h('w'), { wait: 0.7 })],
  }),
  pwb: (c) => ({
    phase: 'prog', owner: c.h('cb'), at: c.P(26, 14),
    beats: [run(c.me, c.P(50, 12)), pass(c.h('cb'), c.me, { wait: 1.6, target: c.P(50, 12) }), run(c.h('w'), c.P(84, 24), { wait: 0.4 }), pass(c.me, c.h('w'), { wait: 0.6, target: c.P(84, 24) })],
  }),
  awb: (c) => ({
    phase: 'final', owner: c.h('cm'), at: c.P(60, 12),
    beats: [pass(c.h('cm'), c.h('w'), { wait: 0.6 }), run(c.me, c.P(92, 30)), pass(c.h('w'), c.me, { wait: 1.6, target: c.P(92, 30) }), cross(c.me, c.h('st'), { x: 96, y: 34 }, { wait: 0.3 })],
  }),
  fb_oop: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [pass(c.a('DMR'), c.a('AMR'), { wait: 0.6 }), mark(c.me, c.a('AMR'), 3), carry(c.a('AMR'), c.P(26, 27), { wait: 0.4 }), pass(c.a('AMR'), c.a('DMR'), { wait: 0.6 })],
  }),
  hfb: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [pass(c.a('DMR'), c.a('AMR'), { wait: 0.6 }), run(c.me, c.P(12, 19)), carry(c.a('AMR'), c.P(22, 29)), run(c.a('ST'), { x: 10, y: 34 }), cross(c.a('AMR'), c.a('ST'), { x: 10, y: 34 })],
  }),
  pfb: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [pass(c.a('DMR'), c.a('AMR'), { wait: 0.6 }), mark(c.me, c.a('AMR'), 1, { wait: 0.2 }), pass(c.a('AMR'), c.a('DMR'), { wait: 1.8 })],
  }),
  wb_oop: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [pass(c.a('DMR'), c.a('AMR'), { wait: 0.6 }), run(c.a('DR'), c.P(24, 30)), mark(c.me, c.a('DR'), 1.5, { wait: 0.3 }), pass(c.a('AMR'), c.a('DR'), { wait: 1.8, target: c.P(24, 30) })],
  }),
  hwb: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [pass(c.a('DMR'), c.a('AMR'), { wait: 0.6 }), run(c.me, c.P(14, 27)), carry(c.a('AMR'), c.P(32, 26)), pass(c.a('AMR'), c.a('DMR'), { wait: 0.4 })],
  }),
  prwb: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [pass(c.a('DMR'), c.a('AMR'), { wait: 0.6 }), mark(c.me, c.a('AMR'), 1, { wait: 0.2 }), pass(c.a('AMR'), c.a('DMR'), { wait: 1.8 })],
  }),

  // ── Defensive midfielders ──
  dm_ip: (c) => ({ phase: 'build', owner: c.h('cb'), at: c.P(18, 12), beats: [pass(c.h('cb'), c.me, { wait: 0.6 }), pass(c.me, c.h('cm'), { wait: 0.8 })] }),
  dlp: (c) => ({ phase: 'prog', owner: c.h('cb'), at: c.P(26, 12), beats: [pass(c.h('cb'), c.me, { wait: 0.6 }), pass(c.me, c.h('wf'), { wait: 0.9 })] }),
  hb: (c) => ({
    phase: 'build', owner: c.h('gk'), at: { x: 5, y: 34 },
    beats: [run(c.me, { x: 16, y: 34 }), run(c.h('cb'), c.P(15, 20)), run(c.h('cb2'), c.P(15, -20)), pass(c.h('gk'), c.me, { wait: 1.6, target: { x: 16, y: 34 } }), pass(c.me, c.h('cb'), { wait: 0.7 })],
  }),
  b2b: (c) => ({
    phase: 'final', owner: c.me, at: c.P(50, 8),
    beats: [pass(c.me, c.h('w'), { wait: 0.6 }), carry(c.h('w'), c.P(90, 26)), run(c.me, c.P(88, 4), { wait: 0.3 }), pass(c.h('w'), c.me, { wait: 0.4, target: c.P(88, 4) }), shot(c.me, { wait: 0.3 })],
  }),
  b2bp: (c) => ({
    phase: 'prog', owner: c.h('cb'), at: c.P(28, 12),
    beats: [run(c.me, c.P(70, 10)), pass(c.h('cb'), c.h('cm'), { wait: 0.6 }), pass(c.h('cm'), c.me, { wait: 0.9, target: c.P(70, 10) }), run(c.h('st'), c.P(92, 2), { wait: 0.3 }), pass(c.me, c.h('st'), { wait: 0.4, target: c.P(92, 2) }), shot(c.h('st'), { wait: 0.3 })],
  }),
  dm_oop: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [run(c.a('AMC'), { x: 38, y: 34 }), pass(c.a('DMR'), c.a('AMC'), { wait: 0.9 }), mark(c.me, c.a('AMC'), 2), pass(c.a('AMC'), c.a('AMR'), { wait: 1.6 })],
  }),
  ddm: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [run(c.me, { x: 15, y: 34 }), pass(c.a('DMR'), c.a('AMC'), { wait: 0.8 }), carry(c.a('AMC'), { x: 32, y: 34 }), pass(c.a('AMC'), c.a('AMR'), { wait: 0.3 })],
  }),
  sdm: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [run(c.me, { x: 30, y: 34 }), pass(c.a('DMR'), c.a('DML'), { wait: 1.2 }), pass(c.a('DML'), c.a('AML'), { wait: 0.8 })],
  }),
  wcdm: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [pass(c.a('DMR'), c.a('AMR'), { wait: 0.6 }), run(c.a('DR'), c.P(24, 30)), run(c.me, c.P(26, 24), { wait: 0.3 }), pass(c.a('AMR'), c.a('DR'), { wait: 1.8, target: c.P(24, 30) })],
  }),
  pdm: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [run(c.a('AMC'), { x: 42, y: 34 }), pass(c.a('DMR'), c.a('AMC'), { wait: 0.9 }), mark(c.me, c.a('AMC'), 1), pass(c.a('AMC'), c.a('DMR'), { wait: 1.6 })],
  }),

  // ── Central midfielders ──
  cm_ip: (c) => ({ phase: 'prog', owner: c.h('cb'), at: c.P(24, 12), beats: [pass(c.h('cb'), c.h('dm'), { wait: 0.6 }), pass(c.h('dm'), c.me, { wait: 0.7 }), pass(c.me, c.h('w'), { wait: 0.7 })] }),
  mp: (c) => ({
    phase: 'prog', owner: c.h('dm'), at: { x: 42, y: 34 },
    beats: [run(c.me, c.P(62, 16)), pass(c.h('dm'), c.me, { wait: 1.4, target: c.P(62, 16) }), run(c.h('st'), c.P(92, 6), { wait: 0.2 }), pass(c.me, c.h('st'), { wait: 0.5, target: c.P(92, 6) }), shot(c.h('st'), { wait: 0.3 })],
  }),
  wcm: (c) => ({
    phase: 'prog', owner: c.h('dm'), at: { x: 42, y: 34 },
    beats: [run(c.me, c.P(64, 30)), run(c.h('w'), c.P(78, 14)), pass(c.h('dm'), c.me, { wait: 1.6, target: c.P(64, 30) }), carry(c.me, c.P(76, 30)), cross(c.me, c.h('st'), { x: 95, y: 34 })],
  }),
  chm: (c) => ({
    phase: 'final', owner: c.h('dm'), at: { x: 50, y: 34 },
    beats: [run(c.me, c.P(90, 17)), pass(c.h('dm'), c.me, { wait: 1.2, target: c.P(90, 17) }), shot(c.me, { wait: 0.4 })],
  }),
  ap: (c) => ({
    phase: 'prog', owner: c.h('cb'), at: c.P(28, 12),
    beats: [run(c.me, c.P(72, 8)), pass(c.h('cb'), c.h('dm'), { wait: 0.6 }), pass(c.h('dm'), c.me, { wait: 0.9, target: c.P(72, 8) }), run(c.h('st'), c.P(93, -2), { wait: 0.3 }), pass(c.me, c.h('st'), { wait: 0.4, target: c.P(93, -2) }), shot(c.h('st'), { wait: 0.3 })],
  }),
  am_ip: (c) => ({
    phase: 'final', owner: c.h('dm'), at: { x: 52, y: 34 },
    beats: [run(c.me, c.P(78, 4)), pass(c.h('dm'), c.me, { wait: 1.4, target: c.P(78, 4) }), shot(c.me, { wait: 0.5 })],
  }),
  cm_oop: (c) => ({
    phase: 'oop', owner: c.a('DCR'), at: c.P(80, 8),
    beats: [pass(c.a('DCR'), c.a('DMR'), { wait: 0.6 }), mark(c.me, c.a('DMR'), 5), pass(c.a('DMR'), c.a('DML'), { wait: 1.6 })],
  }),
  pcm: (c) => ({
    phase: 'oop', owner: c.a('DCR'), at: c.P(80, 8),
    beats: [pass(c.a('DCR'), c.a('DMR'), { wait: 0.6 }), mark(c.me, c.a('DMR'), 1, { wait: 0.1 }), pass(c.a('DMR'), c.a('DCR'), { wait: 1.6 })],
  }),
  scm: (c) => ({
    phase: 'oop', owner: c.a('DCR'), at: c.P(80, 8),
    beats: [run(c.me, c.P(40, 6)), pass(c.a('DCR'), c.a('DR'), { wait: 0.8 }), pass(c.a('DR'), c.a('AMR'), { wait: 0.8 })],
  }),
  wccm: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [pass(c.a('DMR'), c.a('AMR'), { wait: 0.6 }), run(c.a('DR'), c.P(30, 30)), mark(c.me, c.a('DR'), 1.5, { wait: 0.3 }), pass(c.a('AMR'), c.a('DR'), { wait: 1.6, target: c.P(30, 30) })],
  }),

  // ── Wide midfielders and wingers ──
  wm_ip: (c) => ({
    phase: 'prog', owner: c.h('cm'), at: c.P(48, 10),
    beats: [pass(c.h('cm'), c.me, { wait: 0.6 }), carry(c.me, c.P(74, 30)), cross(c.me, c.h('st'), { x: 94, y: 34 })],
  }),
  w_ip: (c) => ({
    phase: 'final', owner: c.h('cm'), at: c.P(56, 10),
    beats: [pass(c.h('cm'), c.me, { wait: 0.6 }), carry(c.me, c.P(93, 30)), run(c.h('st'), { x: 97, y: 33 }), cross(c.me, c.h('st'), { x: 97, y: 33 })],
  }),
  iw_ip: (c) => ({
    phase: 'final', owner: c.h('cm'), at: c.P(56, 10),
    beats: [pass(c.h('cm'), c.me, { wait: 0.6 }), carry(c.me, c.P(80, 13)), run(c.h('st'), c.P(94, -3)), pass(c.me, c.h('st'), { wait: 0.3, target: c.P(94, -3) }), shot(c.h('st'), { wait: 0.3 })],
  }),
  pw: (c) => ({
    phase: 'prog', owner: c.h('cb'), at: c.P(28, 12),
    beats: [run(c.me, c.P(60, 14)), pass(c.h('cb'), c.h('cm'), { wait: 0.6 }), pass(c.h('cm'), c.me, { wait: 0.8, target: c.P(60, 14) }), run(c.h('fb'), c.P(82, 30)), pass(c.me, c.h('fb'), { wait: 0.6, target: c.P(82, 30) })],
  }),
  wm_oop: (c) => ({
    phase: 'oop', owner: c.a('DCR'), at: c.P(82, 10),
    beats: [pass(c.a('DCR'), c.a('DR'), { wait: 0.6 }), mark(c.me, c.a('DR'), 5), carry(c.a('DR'), c.P(60, 30)), pass(c.a('DR'), c.a('DMR'), { wait: 0.4 })],
  }),
  twm: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [pass(c.a('DMR'), c.a('AMR'), { wait: 0.6 }), run(c.a('DR'), c.P(22, 30)), mark(c.me, c.a('DR'), 1.5, { wait: 0.2 }), pass(c.a('AMR'), c.a('DR'), { wait: 2.2, target: c.P(22, 30) })],
  }),
  wowm: (c) => outlet(c, c.P(62, 29)),

  // ── Attacking midfielders ──
  fr: (c) => ({
    phase: 'final', owner: c.h('cm'), at: c.P(56, 10),
    beats: [pass(c.h('cm'), c.h('w'), { wait: 0.6 }), run(c.me, c.P(76, 22)), pass(c.h('w'), c.me, { wait: 1.2, target: c.P(76, 22) }), run(c.h('st'), c.P(93, 4)), pass(c.me, c.h('st'), { wait: 0.4, target: c.P(93, 4) }), shot(c.h('st'), { wait: 0.3 })],
  }),
  ss: (c) => ({
    phase: 'final', owner: c.h('cm'), at: c.P(56, 10),
    beats: [pass(c.h('cm'), c.h('w'), { wait: 0.6 }), carry(c.h('w'), c.P(90, 27)), run(c.me, c.P(91, 3)), pass(c.h('w'), c.me, { wait: 0.3, target: c.P(91, 3) }), shot(c.me, { wait: 0.3 })],
  }),
  am_oop: (c) => ({
    phase: 'oop', owner: c.a('DCR'), at: c.P(82, 8),
    beats: [mark(c.me, c.a('DMR'), 4), pass(c.a('DCR'), c.a('DMR'), { wait: 0.8 }), pass(c.a('DMR'), c.a('DCR'), { wait: 1.4 })],
  }),
  coam: (c) => outlet(c, { x: 64, y: 34 }),
  soam: (c) => outlet(c, c.P(64, 14)),
  tam: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [run(c.me, c.P(38, 4)), pass(c.a('DMR'), c.a('AMC'), { wait: 1.2 }), mark(c.me, c.a('AMC'), 2, { wait: 0.2 }), pass(c.a('AMC'), c.a('AMR'), { wait: 1.4 })],
  }),

  // ── Inside / wide forwards ──
  if_ip: (c) => ({
    phase: 'final', owner: c.h('cm'), at: c.P(56, 10),
    beats: [pass(c.h('cm'), c.me, { wait: 0.6 }), carry(c.me, c.P(87, 9)), shot(c.me, { wait: 0.2 })],
  }),
  wf_ip: (c) => ({
    phase: 'final', owner: c.h('cm2'), at: c.P(56, -10),
    beats: [pass(c.h('cm2'), c.h('wf'), { wait: 0.6 }), carry(c.h('wf'), c.P(88, -28)), run(c.h('st'), c.P(96, -3)), run(c.me, c.P(97, 7)), cross(c.h('wf'), c.me, c.P(97, 7), { wait: 0.3 })],
  }),
  w_oop: (c) => ({
    phase: 'oop', owner: c.a('DCR'), at: c.P(82, 10),
    beats: [pass(c.a('DCR'), c.a('DR'), { wait: 0.6 }), mark(c.me, c.a('DR'), 6), pass(c.a('DR'), c.a('DMR'), { wait: 1.6 })],
  }),
  tw: (c) => ({
    phase: 'oop', ...oppStart(c),
    beats: [pass(c.a('DMR'), c.a('AMR'), { wait: 0.6 }), run(c.a('DR'), c.P(22, 30)), mark(c.me, c.a('DR'), 1.5, { wait: 0.2 }), pass(c.a('AMR'), c.a('DR'), { wait: 2.2, target: c.P(22, 30) })],
  }),
  wow: (c) => outlet(c, c.P(70, 30)),
  iow: (c) => outlet(c, c.P(68, 12)),

  // ── Strikers ──
  cf_ip: (c) => ({
    phase: 'final', owner: c.h('cm'), at: c.P(56, 10),
    beats: [pass(c.h('cm'), c.h('w'), { wait: 0.6 }), carry(c.h('w'), c.P(88, 27)), run(c.me, { x: 96, y: 34 }), cross(c.h('w'), c.me, { x: 96, y: 34 })],
  }),
  chf: (c) => ({
    phase: 'final', owner: c.h('cm'), at: c.P(56, 8),
    beats: [run(c.me, c.P(92, 16)), pass(c.h('cm'), c.me, { wait: 0.9, target: c.P(92, 16) }), shot(c.me, { wait: 0.4 })],
  }),
  dlf: (c) => ({
    phase: 'prog', owner: c.h('dm'), at: { x: 44, y: 34 },
    beats: [run(c.me, c.P(66, 3), { dur: 3 }), pass(c.h('dm'), c.me, { wait: 1.4, target: c.P(66, 3) }), run(c.h('cm'), c.P(70, 10)), pass(c.me, c.h('cm'), { wait: 0.6 }), run(c.me, { x: 94, y: 34 }), run(c.h('w'), c.P(90, 22)), pass(c.h('cm'), c.h('w'), { wait: 0.6, target: c.P(90, 22) })],
  }),
  f9: (c) => ({
    phase: 'prog', owner: c.h('dm'), at: { x: 44, y: 34 },
    beats: [run(c.me, { x: 60, y: 34 }), pass(c.h('dm'), c.me, { wait: 1.4, target: { x: 60, y: 34 } }), run(c.h('w'), c.P(90, 10)), pass(c.me, c.h('w'), { wait: 0.5, target: c.P(90, 10) }), shot(c.h('w'), { wait: 0.3 })],
  }),
  poa: (c) => ({
    phase: 'final', owner: c.h('cm'), at: c.P(56, 10),
    beats: [pass(c.h('cm'), c.h('w'), { wait: 0.6 }), carry(c.h('w'), c.P(94, 26)), run(c.me, { x: 95, y: 34 }), pass(c.h('w'), c.me, { wait: 0.2, target: { x: 95, y: 34 } }), shot(c.me, { wait: 0.15 })],
  }),
  tf: (c) => ({
    phase: 'final', owner: c.h('cm'), at: c.P(56, 10),
    beats: [pass(c.h('cm'), c.h('w'), { wait: 0.6 }), carry(c.h('w'), c.P(84, 29)), run(c.me, { x: 95, y: 34 }), cross(c.h('w'), c.me, { x: 95, y: 34 })],
  }),
  cf_oop: (c) => ({
    phase: 'oop', owner: c.a('DCR'), at: c.P(84, 6),
    beats: [run(c.me, c.P(76, 4)), pass(c.a('DCR'), c.a('DCL'), { wait: 1.2 }), pass(c.a('DCL'), c.a('DL'), { wait: 0.8 })],
  }),
  cocf: (c) => outlet(c, { x: 66, y: 34 }),
  socf: (c) => outlet(c, c.P(68, 14)),
  tcf: (c) => ({
    phase: 'oop', owner: c.a('DCR'), at: c.P(84, 8),
    beats: [pass(c.a('DCR'), c.a('DMR'), { wait: 0.6 }), mark(c.me, c.a('DMR'), 1, { wait: 0.1 }), pass(c.a('DMR'), c.a('DCR'), { wait: 1.6 })],
  }),
};

/** The dedicated clip for a role played from `slot` in `formation`. */
export function roleClip(roleId: string, formation: string, slot: string): RoleClip {
  const def = CLIPS[roleId];
  if (!def) throw new Error(`No clip for role ${roleId}`);
  const c = ctx(formation, slot);
  const d = def(c);
  return { phase: d.phase ?? 'prog', owner: d.owner, at: d.at, beats: d.beats.map((b) => ({ t: 0, ...b })) };
}

export const CLIP_ROLES = Object.keys(CLIPS);
