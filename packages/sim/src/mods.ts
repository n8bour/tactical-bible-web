import type { AgentSpec, Knowledge, Phase, PlayerMods, RoleProfile, TeamMods, TeamSpec } from './types';
import { PI_KEYS } from './types';

const MULT = ['widthScale', 'tempo', 'pressTrigger'] as const;
const ADD = ['passLenPref', 'riskAversion', 'crossBias', 'shootBias', 'carryBias', 'supportRunsP', 'counterpress', 'regroup', 'throughBias', 'receptionSpace', 'tackleCommit', 'lineStep', 'crossBlock', 'gkPress', 'restartSpeed'] as const;

export const TEAM_BASE: Required<Pick<TeamMods, 'widthScale' | 'tempo' | 'pressTrigger' | 'passLenPref' | 'lineHeight' | 'loe'>> = {
  widthScale: 1, tempo: 1, pressTrigger: 1, passLenPref: 18, lineHeight: 34, loe: 56,
};

export type ResolvedTeam = TeamMods & typeof TEAM_BASE & { blockShift: Partial<Record<Phase, number>> };

/** Combine every team instruction (plus mentality) into one set of team modifiers. */
export function teamMods(team: TeamSpec, know: Knowledge): ResolvedTeam {
  const out: ResolvedTeam = { ...TEAM_BASE, blockShift: {} };
  const bag = out as unknown as Record<string, unknown>;
  for (const key of Object.keys(know.ti)) {
    const opt = team.tis[key] ?? know.tiDefaults[key] ?? 0;
    const m = know.ti[key](opt).mods;
    for (const [k, v] of Object.entries(m) as Array<[keyof TeamMods, unknown]>) {
      if (v === undefined) continue;
      if ((MULT as readonly string[]).includes(k)) bag[k] = ((bag[k] as number | undefined) ?? 1) * (v as number);
      else if ((ADD as readonly string[]).includes(k)) bag[k] = ((bag[k] as number | undefined) ?? 0) + (v as number);
      else if (k === 'blockShift') for (const [ph, d] of Object.entries(v as Record<Phase, number>)) out.blockShift[ph as Phase] = (out.blockShift[ph as Phase] ?? 0) + d;
      else bag[k] = v;
    }
  }
  const m = team.mentality - 3;
  for (const ph of ['build', 'prog', 'final', 'win', 'oop', 'loss'] as Phase[]) out.blockShift[ph] = (out.blockShift[ph] ?? 0) + m * 1.9;
  out.riskAversion = (out.riskAversion ?? 0) - m * 0.06;
  out.tempo *= 1 - m * 0.04;
  return out;
}

export interface Resolved {
  team: ResolvedTeam;
  player: PlayerMods;
  profile: RoleProfile;
  bias: { pass: number; through: number; carry: number; shoot: number; cross: number; hold: number };
  riskAversion: number;
  pressMult: number;
  tackleCommit: number;
  markDelta: number;
}

const IP_PHASES: Phase[] = ['build', 'prog', 'final', 'win'];

/** The only place where role profile, team instructions and player instructions combine. */
export function resolveMods(team: ResolvedTeam, spec: AgentSpec, phase: Phase, know: Knowledge): Resolved {
  const player: PlayerMods = {};
  for (const k of PI_KEYS) {
    if (!spec.pis[k]) continue;
    for (const [mk, v] of Object.entries(know.pi[k].mods) as Array<[keyof PlayerMods, unknown]>) {
      if (typeof v === 'number' && mk !== 'pressRadius') (player as Record<string, unknown>)[mk] = (((player as Record<string, number>)[mk]) ?? 0) + v;
      else if (mk === 'pressRadius') player.pressRadius = (player.pressRadius ?? 1) * (v as number);
      else (player as Record<string, unknown>)[mk] = v;
    }
  }
  const roleId = IP_PHASES.includes(phase) ? spec.roleIP : spec.roleOOP;
  const profile = know.roles[roleId] ?? know.roles[spec.roleIP];
  const ipProfile = know.roles[spec.roleIP] ?? profile;
  const ob = ipProfile.onBall;
  return {
    team,
    player,
    profile,
    bias: {
      pass: ob.pass,
      through: ob.through + (team.throughBias ?? 0) + (player.throughBias ?? 0),
      carry: ob.carry + (team.carryBias ?? 0) + (player.carryBias ?? 0),
      shoot: ob.shoot + (team.shootBias ?? 0) + (player.shootBias ?? 0),
      cross: ob.cross + (team.crossBias ?? 0),
      hold: ob.hold,
    },
    riskAversion: ob.riskAversion + (team.riskAversion ?? 0) + (player.riskAversion ?? 0),
    pressMult: team.pressTrigger * (player.pressRadius ?? 1) * (/^(DL|DR|WBL|WBR)$/.test(spec.slotOOP ?? spec.slot) ? 1 + 0.3 * (team.crossBlock ?? 0) : 1),
    tackleCommit: (team.tackleCommit ?? 0) + (player.tackleCommit ?? 0),
    markDelta: player.markDist ?? 0,
  };
}
