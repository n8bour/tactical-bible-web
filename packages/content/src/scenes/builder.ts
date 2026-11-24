import { defaultAttrs, frame, PI_KEYS, type AgentSpec, type AttrKey, type Beat, type Phase, type PIKey, type PIState, type SceneSpec, type TeamId, type Vec } from '@tb/sim';
import { FORMATIONS, OPP_FORMATION } from '../knowledge';
import { DEFAULT_ROLE, groupOf, ROLE_BY_ID } from '../roles/valid';

export interface SceneOpts {
  id: string;
  title: string;
  seed?: number;
  formation: string;
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

function team(t: TeamId, formation: string, roles: Record<string, [string?, string?]>, focus: string | null, attrs: SceneOpts['attrs'], pis: SceneOpts['pis']): AgentSpec[] {
  const prefix = t === 0 ? 'h' : 'a';
  return FORMATIONS[formation].map((s) => {
    const g = groupOf(s.code);
    const [ip, oop] = roles[s.code] ?? [];
    const id = `${prefix}_${s.code}`;
    const roleIP = ip ?? DEFAULT_ROLE.IP[g];
    const roleOOP = oop ?? DEFAULT_ROLE.OOP[g];
    const a = defaultAttrs(12);
    if (id === focus) for (const k of [...ROLE_BY_ID[roleIP].key, ...ROLE_BY_ID[roleOOP].key] as AttrKey[]) a[k] = 15;
    Object.assign(a, attrs?.[id] ?? {});
    const p = noPis();
    for (const k of pis?.[id] ?? []) p[k] = true;
    return { id, team: t, slot: s.code, roleIP, roleOOP, attrs: a, pis: p, foot: s.x > 55 ? 'L' : 'R', label: s.code };
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
function opening(formation: string, phase: Phase, focus: string, oppAttack: boolean, ballToFocus: boolean): { owner: string; at: Vec; beats: NonNullable<SceneOpts['beats']> } {
  const has = (c: string) => FORMATIONS[formation].some((s) => s.code === c) && c !== focus;
  const pick = (...cs: string[]) => cs.find(has) ?? 'GK';
  const cb = pick('DCL', 'DC', 'DCR');
  const mid = pick('DM', 'DML', 'MCL', 'MC', 'MCR');
  const cm = pick('MCL', 'MC', 'MCR', 'DML', 'AMCL', 'AMC', 'DM');
  const wide = ballToFocus ? focus : pick('AML', 'ML', 'WBL', 'DL', 'AMR', 'MR');
  const last = ballToFocus ? focus : cm;
  switch (phase) {
    case 'build':
      return { owner: home('GK'), at: { x: 6, y: 34 }, beats: [{ t: 0.6, kind: 'pass', from: home('GK'), to: home(cb) }, { t: 2.8, kind: 'pass', from: home(cb), to: home(mid) }] };
    case 'prog':
      return { owner: home(cb), at: { x: 30, y: 26 }, beats: [{ t: 0.6, kind: 'pass', from: home(cb), to: home(mid) }, { t: 2.6, kind: 'pass', from: home(mid), to: home(last) }] };
    case 'final':
      return { owner: home(cm), at: { x: 74, y: 28 }, beats: [{ t: 0.8, kind: 'pass', from: home(cm), to: home(wide) }] };
    case 'loss':
      return { owner: home(cm), at: { x: 66, y: 32 }, beats: [{ t: 0.8, kind: 'pass', from: home(cm), to: away('DML') }] };
    case 'win':
      return { owner: away('DML'), at: frame(1, { x: 60, y: 36 }), beats: [{ t: 0.8, kind: 'pass', from: away('DML'), to: home(mid) }] };
    case 'oop':
    default:
      if (oppAttack) {
        const to = away(counterpart(focus));
        return { owner: away('DMR'), at: frame(1, { x: 44, y: 34 }), beats: [{ t: 0.6, kind: 'pass', from: away('DMR'), to }, { t: 2.6, kind: 'carry', from: to }] };
      }
      return { owner: away('GK'), at: frame(1, { x: 6, y: 34 }), beats: [{ t: 0.6, kind: 'pass', from: away('GK'), to: away('DCR') }, { t: 2.8, kind: 'pass', from: away('DCR'), to: away('DMR') }] };
  }
}

export function buildScene(o: SceneOpts): Scene {
  const code = o.focus.replace(/^h_/, '');
  const open = opening(o.formation, o.phase, code, !!o.oppAttack, !!o.ballToFocus);
  return {
    id: o.id,
    title: o.title,
    seed: o.seed ?? hash(o.id),
    home: { formationIP: o.formation, formationOOP: o.formation, mentality: o.mentality ?? 3, tis: { ...(o.tis ?? {}) }, agents: team(0, o.formation, o.roles ?? {}, o.focus, o.attrs, o.pis) },
    away: { formationIP: o.awayFormation ?? OPP_FORMATION, formationOOP: o.awayFormation ?? OPP_FORMATION, mentality: 3, tis: { ...(o.awayTis ?? {}) }, agents: team(1, o.awayFormation ?? OPP_FORMATION, {}, null, o.attrs, o.pis) },
    ball: { owner: open.owner },
    start: { [open.owner]: open.at },
    focus: o.focus,
    script: (o.beats ?? open.beats).map((b) => ({ ...b })),
    duration: o.duration ?? 12,
    phaseStart: o.phase,
    ...(o.lesson ? { lesson: o.lesson } : {}),
  };
}

export { home, away };
