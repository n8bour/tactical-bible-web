import type { Phase, PIKey } from '@tb/sim';
import anchors from '../../data/role-anchors.json';
import concepts from '../../data/concepts.json';
import pis from '../../data/player-instructions.json';
import tis from '../../data/team-instructions.json';
import { ROLES } from '../roles/valid';
import { buildScene, home, type Scene, type SceneOpts } from './builder';

const F433 = '4-3-3 DM Wide';
const F4231 = '4-2-3-1 Wide';

function roleScene(r: (typeof ROLES)[number]): Scene {
  const a = (anchors as Record<string, { formation: string; slot: string }>)[r.id];
  const g = r.groups[0];
  const phase: Phase = r.phase === 'OOP'
    ? 'oop'
    : r.movePhase === 'build' || r.movePhase === 'prog' || r.movePhase === 'final'
      ? r.movePhase
      : ['GK', 'DC', 'D_LR'].includes(g) ? 'build' : ['ST', 'AM_LR', 'AMC'].includes(g) ? 'final' : 'prog';
  return buildScene({
    id: `role-${r.id}`,
    title: r.name,
    formation: a.formation,
    roles: { [a.slot]: r.phase === 'IP' ? [r.id] : [undefined, r.id] },
    focus: home(a.slot),
    phase,
    oppAttack: r.phase === 'OOP' && g !== 'GK',
    ballToFocus: r.phase === 'IP' && r.tags.some((t) => t === 'CR' || t === 'LINK' || t === 'DROP'),
    lesson: { text: r.moveNote ? `Watch the ${r.ab}: ${r.moveNote}.` : r.desc },
  });
}

const TI_FOCUS: Record<string, string> = {
  width: 'AML', dline: 'DCL', loe: 'ST', trigger: 'ST', press_trap: 'AML', short_gk: 'ST', tackling: 'DCL', cross_eng: 'DL',
  def_trans: 'MCL', att_trans: 'ST', goal_kicks: 'GK', gk_speed: 'GK', gk_target: 'GK', support_runs: 'DL', patience: 'AML',
  crossing: 'AML', set_pieces: 'AML', buildup: 'DCL', dl_behaviour: 'DCL',
};

function tiScene(t: (typeof tis)[number]): Scene {
  const option = t.default < t.options.length - 1 ? t.options.length - 1 : 0;
  return buildScene({
    id: `ti-${t.key}`,
    title: t.name,
    formation: F433,
    focus: home(TI_FOCUS[t.key] ?? 'MCL'),
    phase: (t.scenePhase ?? 'prog') as Phase,
    lesson: { text: `Set ${t.name} to “${t.options[option]}” and compare with the baseline.`, ti: { key: t.key, option } },
  });
}

const PI_SETUP: Record<string, { formation: string; slot: string; role: [string?, string?]; phase: Phase }> = {
  shoot_more: { formation: F4231, slot: 'AMC', role: ['am_ip'], phase: 'final' },
  shoot_less: { formation: F4231, slot: 'AMC', role: ['am_ip'], phase: 'final' },
  dribble_more: { formation: F433, slot: 'AML', role: ['w_ip'], phase: 'prog' },
  dribble_less: { formation: F433, slot: 'AML', role: ['w_ip'], phase: 'prog' },
  take_more_risks: { formation: F433, slot: 'MCL', role: ['cm_ip'], phase: 'prog' },
  take_fewer_risks: { formation: F433, slot: 'MCL', role: ['cm_ip'], phase: 'prog' },
  cross_from_byline: { formation: F433, slot: 'AML', role: ['w_ip'], phase: 'final' },
  cross_from_deep: { formation: F433, slot: 'AML', role: ['w_ip'], phase: 'final' },
  roam_from_position: { formation: F4231, slot: 'AMC', role: ['am_ip'], phase: 'prog' },
  stay_wider: { formation: F433, slot: 'AML', role: ['iw_ip'], phase: 'final' },
  sit_narrower: { formation: F433, slot: 'AML', role: ['w_ip'], phase: 'final' },
  hold_position: { formation: F433, slot: 'DL', role: ['wb_ip'], phase: 'final' },
  get_further_forward: { formation: F433, slot: 'MCL', role: ['cm_ip'], phase: 'prog' },
  move_into_channels: { formation: F433, slot: 'ST', role: ['cf_ip'], phase: 'prog' },
  press_more: { formation: F433, slot: 'ST', role: [undefined, 'cf_oop'], phase: 'oop' },
  press_less: { formation: F433, slot: 'ST', role: [undefined, 'cf_oop'], phase: 'oop' },
  mark_tighter: { formation: F433, slot: 'DCL', role: [undefined, 'cb_oop'], phase: 'oop' },
  tackle_harder: { formation: F433, slot: 'MCL', role: [undefined, 'cm_oop'], phase: 'oop' },
  ease_off_tackles: { formation: F433, slot: 'MCL', role: [undefined, 'cm_oop'], phase: 'oop' },
  arrive_late: { formation: F433, slot: 'MCL', role: ['cm_ip'], phase: 'final' },
  attack_the_defensive_line: { formation: F433, slot: 'ST', role: ['cf_ip'], phase: 'prog' },
  target_near_post: { formation: F433, slot: 'ST', role: ['cf_ip'], phase: 'final' },
  target_centre: { formation: F433, slot: 'ST', role: ['cf_ip'], phase: 'final' },
  target_far_post: { formation: F433, slot: 'ST', role: ['cf_ip'], phase: 'final' },
};

function piScene(p: (typeof pis)[number]): Scene {
  const s = PI_SETUP[p.key];
  if (!s) throw new Error(`No scene setup for player instruction ${p.key}`);
  return buildScene({
    id: `pi-${p.key}`,
    title: p.name,
    formation: s.formation,
    roles: { [s.slot]: s.role },
    ballToFocus: /^(shoot|dribble|take|cross)_/.test(p.key),
    focus: home(s.slot),
    phase: s.phase,
    ...(p.key === 'press_more' || p.key === 'press_less' ? { tis: { loe: 2 } } : {}),
    duration: 14,
    lesson: { text: `Switch on “${p.name}” for the highlighted player and compare with the baseline.`, pi: p.key as PIKey },
  });
}

const CONCEPT_SETUP: Record<string, Omit<SceneOpts, 'id' | 'title'>> = {
  ip_oop: { formation: F433, focus: home('DL'), phase: 'win', roles: { DL: ['wb_ip', 'fb_oop'] }, lesson: { text: 'Each player switches between an in-possession and an out-of-possession role; watch the left-back change job on the turnover.' } },
  rest_def: { formation: F433, focus: home('DM'), phase: 'final', roles: { DL: ['ifb'], DM: ['dm_ip'] }, lesson: { text: 'Count who stays behind the ball while the team attacks: two centre-backs, the holding midfielder and the inside full-back.' } },
  width: { formation: F433, focus: home('AML'), phase: 'final', roles: { AML: ['iw_ip'], DL: ['wb_ip'] }, lesson: { text: 'The inside winger leaves the touchline, so the wing-back provides the width.', ti: { key: 'width', option: 4 } } },
  box: { formation: F433, focus: home('ST'), phase: 'final', roles: { AMR: ['if_ip'], MCL: ['b2b'] }, lesson: { text: 'Three players attack the box: striker, inside forward and the late-arriving midfielder.' } },
  press_coh: { formation: F433, focus: home('ST'), phase: 'oop', tis: { loe: 2, dline: 1 }, lesson: { text: 'A high line of engagement with a deep defensive line leaves a gap between the lines. Raise the defensive line to close it.', ti: { key: 'dline', option: 4 } } },
  outlets: { formation: F433, focus: home('AML'), phase: 'oop', roles: { AML: [undefined, 'wow'], ST: [undefined, 'cocf'] }, lesson: { text: 'Outlet roles stay high for the counter instead of joining the block.' } },
  creativity: { formation: F433, focus: home('MCL'), phase: 'prog', roles: { MCL: ['mp'], DM: ['dlp'] }, lesson: { text: 'One or two creators get the ball; the rest attack space for them.' } },
  asymmetry: { formation: F433, focus: home('DR'), phase: 'prog', roles: { DL: ['ifb'], DR: ['wb_ip'], AMR: ['iw_ip'] }, lesson: { text: 'A safe inside full-back on one side and an attacking wing-back on the other.' } },
};

function conceptScene(c: (typeof concepts)[number]): Scene | null {
  const s = CONCEPT_SETUP[c.key];
  return s ? buildScene({ id: `concept-${c.key}`, title: c.name, ...s }) : null;
}

export const SCENES: Record<string, Scene> = Object.fromEntries(
  [
    ...ROLES.map(roleScene),
    ...tis.map(tiScene),
    ...pis.map(piScene),
    ...concepts.filter((c) => c.scene).map(conceptScene),
  ]
    .filter((s): s is Scene => s !== null)
    .map((s) => [s.id, s]),
);

export { buildScene, type Scene, type SceneOpts };
