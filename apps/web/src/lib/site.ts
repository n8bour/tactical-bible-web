import { attributes, groups, ROLES } from '@tb/content';
import { ATTR_MODEL, rulesUsing, type AttrKey } from '@tb/sim';

export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const href = (path: string) => `${BASE}${path}`;

export const ATTR_NAME: Record<string, string> = Object.fromEntries(attributes.map((a) => [a.key, a.name]));
export const GROUP_NAME: Record<string, string> = groups;
export const CAT_NAME: Record<string, string> = { T: 'Technical', M: 'Mental', F: 'Physical', G: 'Goalkeeping' };
export const PHASE_NAME: Record<string, string> = { IP: 'In possession', OOP: 'Out of possession' };

export interface AttrUse {
  attr: AttrKey;
  rules: Array<{ key: string; formula: string; unit: string; src: 'conf' | 'est'; note: string }>;
}

/** The simulation rules that read each attribute, straight from ATTR_MODEL, so pages can't drift from the model. */
export function attrUses(keys: string[]): AttrUse[] {
  return keys.map((k) => ({
    attr: k as AttrKey,
    rules: rulesUsing(k as AttrKey).map(([key, r]) => ({ key, formula: r.formula, unit: r.unit, src: r.src, note: r.note })),
  }));
}

export const RULE_LABEL: Record<keyof typeof ATTR_MODEL, string> = {
  topSpeed: 'Top speed', accel: 'Acceleration', turnRate: 'Turn rate', reaction: 'Reaction delay', percNoise: 'Perception error',
  decisionInterval: 'Time between decisions', decisionTemp: 'Choice randomness', visionRange: 'Pass range considered', visionCone: 'Field of view',
  throughBallSeen: 'Sees through balls', passAngleErr: 'Pass direction error', passSpeedErr: 'Pass weight error', crossErr: 'Cross error',
  shotErr: 'Shot error', touchLoss: 'First-touch loss', dribbleBeat: 'Beats a defender', aerialWin: 'Wins headers', pressWill: 'Pressing reach',
  shapeAdherence: 'Keeps the tactical position', oopSlotErr: 'Defensive position error', runTiming: 'Run timing', riskBias: 'Appetite for risk',
  tackleCommit: 'Tackle commitment', markDist: 'Marking distance', staminaDrain: 'Fatigue rate', gkReach: 'Keeper reach', gkReact: 'Keeper reaction',
  gkRush: 'Keeper starting depth',
};

export const rolesUsing = (k: string) => ROLES.filter((r) => r.key.includes(k) || r.pref.includes(k));
