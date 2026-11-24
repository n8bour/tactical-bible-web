import { defaultAttrs } from '../src/attributes';
import type { AgentSpec, Effect, Knowledge, PIKey, PIState, PlayerMods, RoleProfile, SceneSpec, TeamId } from '../src/types';
import { PI_KEYS } from '../src/types';

const F433 = [
  { code: 'GK', x: 50, y: 4 }, { code: 'DL', x: 10, y: 24 }, { code: 'DCL', x: 36, y: 20 }, { code: 'DCR', x: 64, y: 20 },
  { code: 'DR', x: 90, y: 24 }, { code: 'DM', x: 50, y: 38 }, { code: 'MCL', x: 32, y: 52 }, { code: 'MCR', x: 68, y: 52 },
  { code: 'AML', x: 12, y: 72 }, { code: 'ST', x: 50, y: 84 }, { code: 'AMR', x: 88, y: 72 },
];

const profile = (phase: 'IP' | 'OOP'): RoleProfile & { ab: string; phase: 'IP' | 'OOP' } => ({
  ab: phase === 'IP' ? 'G' : 'g', phase,
  anchor: {},
  runs: phase === 'IP' ? [{ kind: 'beyond', phase: 'final', p: 0.5 }] : [],
  onBall: { pass: 0, through: 0, carry: 0, shoot: 0, cross: 0, hold: 0, riskAversion: 0.5 },
  oop: { pressRadius: 9, holdLine: 0, track: 0.5, mark: 'zonal' },
  key: [], pref: [], src: 'est',
});

export const KNOW: Knowledge = {
  formations: { '4-3-3': F433 },
  roles: { gen_ip: profile('IP'), gen_oop: profile('OOP') },
  ti: {},
  tiDefaults: {},
  pi: Object.fromEntries(PI_KEYS.map((k) => [k, { src: 'est', note: '', mods: {} } satisfies Effect<PlayerMods>])) as Record<PIKey, Effect<PlayerMods>>,
};

const noPis = () => Object.fromEntries(PI_KEYS.map((k) => [k, false])) as PIState;

export function team(t: TeamId): AgentSpec[] {
  return F433.map((s) => ({ id: `${t ? 'a' : 'h'}_${s.code}`, team: t, slot: s.code, roleIP: 'gen_ip', roleOOP: 'gen_oop', attrs: defaultAttrs(12), pis: noPis(), foot: 'R' as const }));
}

export function scene(seed: number, owner = 'h_MCL'): SceneSpec {
  return {
    id: 'fixture', seed,
    home: { formationIP: '4-3-3', formationOOP: '4-3-3', mentality: 3, tis: {}, agents: team(0) },
    away: { formationIP: '4-3-3', formationOOP: '4-3-3', mentality: 3, tis: {}, agents: team(1) },
    ball: { owner }, focus: owner, script: [], duration: 30,
  };
}
