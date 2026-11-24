import type { FormationSlot, Knowledge } from '@tb/sim';
import formations from '../data/formations.json';
import { PI_EFFECTS, TI_DEFAULTS, TI_EFFECTS } from './instructions/effects';
import { ROLE_PROFILES } from './roles/profiles';

export const OPP_FORMATION = 'Opponent 4-2-3-1';
const OPP_CODES = ['GK', 'DL', 'DCL', 'DCR', 'DR', 'DML', 'DMR', 'AML', 'AMC', 'AMR', 'ST'];

export const FORMATIONS: Record<string, FormationSlot[]> = {
  ...(formations.formations as Record<string, FormationSlot[]>),
  // The opponent shape is already in the opponent's own frame (its GK at depth 4), like every formation here.
  [OPP_FORMATION]: formations.opponentShape.map((p, i) => ({ code: OPP_CODES[i], x: p.x, y: p.y })),
};

export const KNOWLEDGE: Knowledge = {
  formations: FORMATIONS,
  roles: ROLE_PROFILES,
  ti: TI_EFFECTS,
  tiDefaults: TI_DEFAULTS,
  pi: PI_EFFECTS,
};
