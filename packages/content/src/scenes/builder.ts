import { defaultAttrs, frame, PI_KEYS, type AgentSpec, type AttrKey, type Beat, type Phase, type PIKey, type PIState, type SceneSpec, type TeamId, type Vec } from '@tb/sim';
import { FORMATIONS, OPP_FORMATION } from '../knowledge';
import { DEFAULT_ROLE, groupOf, ROLE_BY_ID } from '../roles/valid';

export interface SceneOpts {
  id: string;
  title: string;
  seed?: number;
  formation: string;
  /** home out-of-possession formation; defaults to `formation`. Slots are paired with the nearest IP slot. */
  formationOOP?: string;
  awayFormation?: string;
  /** out of possession: the opponent carries the ball at the focus player's zone instead of building from the keeper */
  oppAttack?: boolean;
  /** in possession: the set-up passes end at the focus player (for on-ball lessons) */
  ballToFocus?: boolean;
  /** home slot code → [IP role, OOP role]; unlisted slots get the default role of their group */
  roles?: Record<string, [string?, string?]>;
  focus: string;
  /** where the lesson starts: the ball phase from the home team's point of view */
  phase: Phase;
  tis?: Record<string, number>;
  awayTis?: Record<string, number>;
  pis?: Partial<Record<string, PIKey[]>>;
  attrs?: Partial<Record<string, Partial<Record<AttrKey, number>>>>;
  mentality?: number;
  /** where the focus player starts, instead of his tactical position */
  focusStart?: Vec;
  beats?: Array<{ t: number; kind: Beat['kind']; from: string; to?: string; target?: Vec }>;
  duration?: number;
  lesson?: SceneLesson;
}

export interface SceneLesson {
  text: string;
  ti?: { key: string; option: number };
  pi?: PIKey;
  attr?: { key: AttrKey; value: number };
}

export type Scene = SceneSpec & { lesson?: SceneLesson; phaseStart: Phase };

const noPis = () => Object.fromEntries(PI_KEYS.map((k) => [k, false])) as PIState;
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);

/** Pairs each IP slot with an OOP slot of another formation: GK to GK, then the closest free pairs first. */
export function pairSlots(ipForm: string, oopForm: string): Record<string, string> {
  const A = FORMATIONS[ipForm], B = FORMATIONS[oopForm];
  if (ipForm === oopForm) return Object.fromEntries(A.map((s) => [s.code, s.code]));
  const pairs = A.flatMap((a) => B.map((b) => ({ a: a.code, b: b.code, d: a.code === 'GK' || b.code === 'GK' ? (a.code === b.code ? -1 : 1e9) : Math.hypot(a.x - b.x, a.y - b.y) })));
  pairs.sort((p, q) => p.d - q.d);
  const out: Record<string, string> = {};
  const used = new Set<string>();
  for (const p of pairs) if (!(p.a in out) && !used.has(p.b)) { out[p.a] = p.b; used.add(p.b); }
  return out;
}

function team(t: TeamId, formation: string, formationOOP: string, roles: Record<string, [string?, string?]>, focus: string | null, attrs: SceneOpts['attrs'], pis: SceneOpts['pis']): AgentSpec[] {
  const prefix = t === 0 ? 'h' : 'a';
  const oopSlot = pairSlots(formation, formationOOP);
  return FORMATIONS[formation].map((s) => {
    const slotOOP = oopSlot[s.code];
    const [ip, oop] = roles[s.code] ?? [];
    const id = `${prefix}_${s.code}`;
    const roleIP = ip ?? DEFAULT_ROLE.IP[groupOf(s.code)];
    const roleOOP = oop ?? DEFAULT_ROLE.OOP[groupOf(slotOOP)];
    const a = defaultAttrs(12);
    if (id === focus) for (const k of [...ROLE_BY_ID[roleIP].key, ...ROLE_BY_ID[roleOOP].key] as AttrKey[]) a[k] = 15;
    Object.assign(a, attrs?.[id] ?? {});
    const p = noPis();
    for (const k of pis?.[id] ?? []) p[k] = true;
    return { id, team: t, slot: s.code, ...(slotOOP !== s.code ? { slotOOP } : {}), roleIP, roleOOP, attrs: a, pis: p, foot: s.x > 55 ? 'L' : 'R', label: s.code };
  });
}

const home = (code: string) => `h_${code}`;
const away = (code: string) => `a_${code}`;

/** The opponent who attacks the focus player's zone (away frame is mirrored, so left faces right). */
function counterpart(code: string): string {
  if (/^(DL|WBL)$/.test(code)) return 'AMR';
  if (/^(DR|WBR)$/.test(code)) return 'AML';
  if (/^(ML|AML)$/.test(code)) return 'DR';
  if (/^(MR|AMR)$/.test(code)) return 'DL';
  if (code.startsWith('DC')) return 'ST';
  if (code.startsWith('AMC')) return 'DML';
  if (code.startsWith('ST')) return 'DCL';
  return 'AMC';
}

/** Ball carrier and starting spot (world metres) for each starting phase. */
function opening(formation: string, awayFormation: string, phase: Phase, focus: string, oppAttack: boolean, ballToFocus: boolean): { owner: string; at: Vec; beats: NonNullable<SceneOpts['beats']> } {
  const has = (c: string) => FORMATIONS[formation].some((s) => s.code === c) && c !== focus;
  const pick = (...cs: string[]) => cs.find(has) ?? 'GK';
  const hasA = (c: string) => FORMATIONS[awayFormation].some((s) => s.code === c);
  const pickA = (...cs: string[]) => cs.find(hasA) ?? 'GK';
  const cb = pick('DCL', 'DC', 'DCR');
  const mid = pick('DM', 'DML', 'MCL', 'MC', 'MCR');
  const cm = pick('MCL', 'MC', 'MCR', 'DML', 'AMCL', 'AMC', 'DM');
  const wide = ballToFocus ? focus : pick('AML', 'ML', 'WBL', 'DL', 'AMR', 'MR');
  const last = ballToFocus ? focus : cm;
  const aCb = pickA('DCR', 'DC', 'DCL');
  const aMid = pickA('DMR', 'DM', 'DML', 'MCR', 'MC', 'MCL');
  const aMid2 = pickA('DML', 'DM', 'MCL', 'MC', 'DMR');
  switch (phase) {
    case 'build':
      return { owner: home('GK'), at: { x: 6, y: 34 }, beats: [{ t: 0.6, kind: 'pass', from: home('GK'), to: home(cb) }, { t: 2.8, kind: 'pass', from: home(cb), to: home(mid) }] };
    case 'prog':
      return { owner: home(cb), at: { x: 30, y: 26 }, beats: [{ t: 0.6, kind: 'pass', from: home(cb), to: home(mid) }, { t: 2.6, kind: 'pass', from: home(mid), to: home(last) }] };
    case 'final':
      return { owner: home(cm), at: { x: 74, y: 28 }, beats: [{ t: 0.8, kind: 'pass', from: home(cm), to: home(wide) }] };
    case 'loss':
      return { owner: home(cm), at: { x: 66, y: 32 }, beats: [{ t: 0.8, kind: 'pass', from: home(cm), to: away(aMid2) }] };
    case 'win':
      return { owner: away(aMid2), at: frame(1, { x: 60, y: 36 }), beats: [{ t: 0.8, kind: 'pass', from: away(aMid2), to: home(mid) }] };
    case 'oop':
    default:
      if (oppAttack) {
        const to = away(pickA(counterpart(focus), 'AMC', 'ST', 'STL'));
        return { owner: away(aMid), at: frame(1, { x: 44, y: 34 }), beats: [{ t: 0.6, kind: 'pass', from: away(aMid), to }, { t: 2.6, kind: 'carry', from: to }] };
      }
      return { owner: away('GK'), at: frame(1, { x: 6, y: 34 }), beats: [{ t: 0.6, kind: 'pass', from: away('GK'), to: away(aCb) }, { t: 2.8, kind: 'pass', from: away(aCb), to: away(aMid) }] };
  }
}

export function buildScene(o: SceneOpts): Scene {
  const code = o.focus.replace(/^h_/, '');
  const awayForm = o.awayFormation ?? OPP_FORMATION;
  const oopForm = o.formationOOP ?? o.formation;
  const open = opening(o.formation, awayForm, o.phase, code, !!o.oppAttack, !!o.ballToFocus);
  return {
    id: o.id,
    title: o.title,
    seed: o.seed ?? hash(o.id),
    home: { formationIP: o.formation, formationOOP: oopForm, mentality: o.mentality ?? 3, tis: { ...(o.tis ?? {}) }, agents: team(0, o.formation, oopForm, o.roles ?? {}, o.focus, o.attrs, o.pis) },
    away: { formationIP: awayForm, formationOOP: awayForm, mentality: 3, tis: { ...(o.awayTis ?? {}) }, agents: team(1, awayForm, awayForm, {}, null, o.attrs, o.pis) },
    ball: { owner: open.owner },
    start: { [open.owner]: open.at, ...(o.focusStart ? { [o.focus]: o.focusStart } : {}) },
    focus: o.focus,
    script: (o.beats ?? open.beats).map((b) => ({ ...b })),
    duration: o.duration ?? 12,
    phaseStart: o.phase,
    ...(o.lesson ? { lesson: o.lesson } : {}),
  };
}

type Beats = NonNullable<SceneOpts['beats']>;

/**
 * One simple attacking move for the lesson: out from the keeper, up the middle, wide, a carry to the byline area, then a cross
 * while the striker, the far-side winger and a late midfielder attack the box. After the cross the players are free.
 */
export function attackPlay(formation: string, startFrom: 'build' | 'final' = 'build'): Beats {
  const has = (c: string) => FORMATIONS[formation].some((s) => s.code === c);
  const pick = (...cs: string[]) => cs.find(has) ?? 'GK';
  const cb = pick('DCL', 'DC', 'DCR'), cm = pick('MCL', 'MC', 'MCR', 'DML');
  const wide = pick('AML', 'ML', 'WBL', 'AMCL'), far = pick('AMR', 'MR', 'WBR', 'AMCR');
  const st = pick('ST', 'STL', 'AMC'), late = pick('MCR', 'MC', 'MCL');
  const out: Beats = [];
  const pass = (from: string, to: string) => out.push({ t: 0.6, kind: 'pass', from: home(from), to: home(to) });
  if (startFrom === 'build') {
    pass('GK', cb);
    pass(cb, cm);
  }
  pass(cm, wide);
  out.push({ t: 0.6, kind: 'carry', from: home(wide), target: { x: 88, y: 9 } });
  out.push({ t: 0.6, kind: 'run', from: home(st), target: { x: 96, y: 32 } });
  out.push({ t: 0.6, kind: 'run', from: home(far), target: { x: 95, y: 44 } });
  if (late !== cm) out.push({ t: 0.6, kind: 'run', from: home(late), target: { x: 86, y: 34 } });
  out.push({ t: 0.6, kind: 'cross', from: home(wide), to: home(st), target: { x: 96, y: 32 } });
  return out;
}

/** A ball played in behind for a striker who runs the channel: run first, then the pass into his path. */
export function throughPlay(formation: string, focus: string): Beats {
  const has = (c: string) => FORMATIONS[formation].some((s) => s.code === c) && c !== focus;
  const cm = ['MCL', 'MC', 'MCR', 'DML', 'AMC'].find(has) ?? 'GK';
  const y = FORMATIONS[formation].find((s) => s.code === focus)!.x * 0.68;
  const target = { x: 94, y: 34 + (y - 34) * 0.5 };
  return [
    { t: 0.6, kind: 'run', from: home(focus), target },
    { t: 0.6, kind: 'pass', from: home(cm), to: home(focus), target },
  ];
}

export { home, away };
