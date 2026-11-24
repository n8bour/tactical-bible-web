import type { RoleProfile, Src } from '@tb/sim';
import roles from '../../data/roles.json';
import { DRAFT_PROFILES, type DraftProfile } from './profiles.generated';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends Array<infer U> ? U[] : T[K] extends object ? DeepPartial<T[K]> : T[K] };

export type RoleId = string;
export type ContentProfile = DraftProfile & { attrSrc: Src };

const nn = 'Hand-tuned from the role description; not engine-verified.';

/** Hand tuning on top of the generated drafts. Each entry's note says why. Arrays replace, objects merge. */
export const OVERRIDES: Partial<Record<RoleId, DeepPartial<RoleProfile>>> = {
  bpgk: { onBall: { pass: 0.2 }, anchor: { build: { depth: 11.6 } }, note: 'Steps off his line to join the build-up. ' + nn },
  nngk: { onBall: { riskAversion: 1.2, through: -0.3 }, note: 'Avoids risk; prefers long, safe distribution. ' + nn },
  swk: { oop: { holdLine: 7 }, note: 'Starts high to sweep behind the line. ' + nn },
  lhk: { oop: { holdLine: -2 }, note: 'Stays on the goal line. ' + nn },
  nncb: { onBall: { riskAversion: 1.1 }, note: nn },
  acb: { runs: [], onBall: { pass: 0.2, carry: 0.2 }, note: 'Steps into midfield instead of overlapping. ' + nn },
  ocb: { runs: [{ kind: 'overlap', phase: 'final', p: 0.8 }, { kind: 'overlap', phase: 'prog', p: 0.5 }], note: nn },
  ccb: { oop: { holdLine: -4, pressRadius: 5 }, note: 'Sits slightly behind the line to cover depth. ' + nn },
  scb: { oop: { pressRadius: 15, holdLine: 2 }, note: 'Steps out of the line to engage between the lines. ' + nn },
  cwcb: { oop: { holdLine: -4, lane: 'cbw' }, note: nn },
  swcb: { oop: { pressRadius: 15, lane: 'cbw' }, note: nn },
  wb_ip: { runs: [{ kind: 'overlap', phase: 'final', p: 0.7 }], note: nn },
  awb: { runs: [{ kind: 'overlap', phase: 'final', p: 0.9 }, { kind: 'beyond', phase: 'final', p: 0.6 }], onBall: { cross: 0.5 }, note: nn },
  hfb: { oop: { lane: 'ch' }, note: 'Stays deep and narrow beside the centre-back. ' + nn },
  pfb: { oop: { pressRadius: 15, holdLine: 4 }, note: 'Pushes up to press the winger. ' + nn },
  prwb: { oop: { pressRadius: 15, holdLine: 5 }, note: nn },
  hwb: { oop: { holdLine: -3 }, note: 'Holds the back five. ' + nn },
  hb: { runs: [], note: 'Drops between the centre-backs rather than moving higher. ' + nn },
  b2b: { runs: [{ kind: 'late_box', phase: 'final', p: 0.85 }, { kind: 'beyond', phase: 'prog', p: 0.4 }], note: 'Arrives in the box as a second wave. ' + nn },
  ddm: { oop: { holdLine: -10, lane: 'c' }, note: 'Drops into the defensive line. ' + nn },
  sdm: { oop: { holdLine: -2, pressRadius: 5, lane: 'c' }, note: 'Screens central passing lanes. ' + nn },
  wcdm: { oop: { lane: 'ch' }, note: 'Shuffles across to cover the flank. ' + nn },
  pdm: { oop: { pressRadius: 15, holdLine: 4 }, note: nn },
  wcm: { runs: [{ kind: 'overlap', phase: 'prog', p: 0.6 }], note: nn },
  chm: { runs: [{ kind: 'channel', phase: 'final', p: 0.85 }, { kind: 'channel', phase: 'prog', p: 0.5 }], note: 'Attacks the channel between full-back and centre-back. ' + nn },
  ap: { onBall: { through: 0.6 }, note: nn },
  am_ip: { onBall: { shoot: 0.3 }, note: 'Occupies Zone 14 and threatens from outside the box. ' + nn },
  pcm: { oop: { pressRadius: 14, holdLine: 4 }, note: nn },
  scm: { oop: { holdLine: -3, pressRadius: 5 }, note: nn },
  wccm: { oop: { lane: 'ch' }, note: nn },
  w_ip: { onBall: { cross: 0.6, carry: 0.25 }, note: 'Goes to the byline to cross. ' + nn },
  iw_ip: { onBall: { carry: 0.2 }, note: nn },
  pw: { onBall: { pass: 0.3, through: 0.5 }, note: nn },
  if_ip: { onBall: { shoot: 0.35, carry: 0.3 }, note: 'Cuts inside towards goal. ' + nn },
  wf_ip: { runs: [{ kind: 'box_far', phase: 'final', p: 0.85 }, { kind: 'beyond', phase: 'prog', p: 0.6 }], note: 'Stays wide and attacks the far post. ' + nn },
  fr: { runs: [{ kind: 'drift_ball', phase: 'prog', p: 0.85 }, { kind: 'drift_ball', phase: 'final', p: 0.6 }], note: 'Roams to the ball side. ' + nn },
  ss: { onBall: { shoot: 0.3 }, note: nn },
  wowm: { oop: { lane: 'wide' }, note: nn },
  wow: { oop: { lane: 'wide' }, note: nn },
  iow: { oop: { lane: 'half' }, note: nn },
  coam: { oop: { lane: 'c' }, note: nn },
  soam: { oop: { lane: 'ch' }, note: nn },
  cocf: { oop: { lane: 'c', outletDepth: 64 }, note: nn },
  socf: { oop: { lane: 'ch', outletDepth: 64 }, note: nn },
  tam: { oop: { holdLine: -5 }, note: 'Drops back to defend. ' + nn },
  tw: { oop: { holdLine: -5 }, note: 'Tracks the full-back back. ' + nn },
  twm: { oop: { holdLine: -4, track: 0.9 }, note: nn },
  tcf: { oop: { holdLine: -8, lane: 'c' }, note: 'Drops onto the opposition holding midfielder. ' + nn },
  cf_ip: { onBall: { shoot: 0.3 }, note: nn },
  chf: { runs: [{ kind: 'channel', phase: 'final', p: 0.85 }, { kind: 'channel', phase: 'prog', p: 0.7 }], note: nn },
  dlf: { runs: [{ kind: 'drop', phase: 'final', p: 0.7 }, { kind: 'drop', phase: 'prog', p: 0.8 }], onBall: { pass: 0.4 }, note: 'Drops to link play. ' + nn },
  f9: { runs: [{ kind: 'drop', phase: 'prog', p: 0.9 }, { kind: 'drop', phase: 'final', p: 0.6 }], onBall: { through: 0.6 }, note: 'Drops to midfield and drags centre-backs. ' + nn },
  poa: { runs: [{ kind: 'beyond', phase: 'prog', p: 0.9 }, { kind: 'beyond', phase: 'final', p: 0.9 }, { kind: 'box_centre', phase: 'final', p: 0.8 }], onBall: { shoot: 0.5, pass: -0.2 }, note: 'Lives on the last line. ' + nn },
  tf: { onBall: { hold: 0.3, pass: 0.2 }, note: nn },
};

function merge<T>(base: T, over: DeepPartial<T> | undefined): T {
  if (!over) return base;
  const out = structuredClone(base) as Record<string, unknown>;
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined) continue;
    const cur = out[k];
    out[k] = Array.isArray(v) || typeof v !== 'object' || v === null || typeof cur !== 'object' || cur === null ? v : merge(cur, v as DeepPartial<typeof cur>);
  }
  return out as T;
}

const ATTR_CONF = new Set(roles.filter((r) => r.attrsConf).map((r) => r.id));

export const ROLE_PROFILES: Record<RoleId, ContentProfile> = Object.fromEntries(
  Object.entries(DRAFT_PROFILES).map(([id, p]) => [id, { ...merge(p, OVERRIDES[id] as DeepPartial<DraftProfile>), attrSrc: ATTR_CONF.has(id) ? 'conf' : 'est' }]),
);
