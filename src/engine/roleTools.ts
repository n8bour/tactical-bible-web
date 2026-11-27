import {
  FM27_ME_WEIGHTS,
  ROLE_BY_ID,
  ROLES,
  type AttrKey,
  type PositionGroup,
  type RoleDef,
  type RolePhase,
} from '../data';
import type {
  RoleComparison,
  RoleFitAttrItem,
  RoleFitMode,
  RoleFitResult,
  RolePairFit,
  RoleProfileDiffItem,
} from './types';

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function attrVal(attrs: Partial<Record<AttrKey, number>>, key: AttrKey): number {
  const raw = attrs[key];
  if (typeof raw !== 'number' || Number.isNaN(raw)) return 10;
  return clamp(raw, 1, 20);
}

// ── 1. Role Fit Scorer ('role' and 'fm27-me' modes) ───────────────────────────

export interface RoleFitOptions {
  group?: PositionGroup;
  phase?: RolePhase;
  mode?: RoleFitMode;
  limit?: number;
}

export function scoreRoleFit(
  attrs: Partial<Record<AttrKey, number>>,
  opts: RoleFitOptions = {},
): RoleFitResult[] {
  const mode: RoleFitMode = opts.mode ?? 'role';

  const candidates = ROLES.filter((r) => {
    if (opts.group && !r.groups.includes(opts.group)) return false;
    if (opts.phase && r.phase !== opts.phase) return false;
    return true;
  });

  const results: RoleFitResult[] = candidates.map((role) => {
    const keyItems: RoleFitAttrItem[] = role.key.map((k) => ({
      key: k,
      value: attrVal(attrs, k),
      tier: 'key',
    }));
    const prefItems: RoleFitAttrItem[] = role.pref.map((k) => ({
      key: k,
      value: attrVal(attrs, k),
      tier: 'pref',
    }));

    const keySum = keyItems.reduce((acc, i) => acc + i.value, 0);
    const prefSum = prefItems.reduce((acc, i) => acc + i.value, 0);

    const keyAvg = keyItems.length > 0 ? keySum / keyItems.length : 10;
    const prefAvg = prefItems.length > 0 ? prefSum / prefItems.length : keyAvg;

    // Key attributes weighted 2×, preferred attributes weighted 1× (scaled 0..100)
    const totalWeight = keyItems.length * 2 + prefItems.length;
    const weightedAvg =
      totalWeight > 0 ? (keySum * 2 + prefSum) / totalWeight : 10;
    const baseScore = weightedAvg * 5;

    let meBonus = 0;
    if (mode === 'fm27-me') {
      const isGk = role.groups.includes('GK');
      const relevantWeights = FM27_ME_WEIGHTS.filter(
        (w) => w.appliesTo === (isGk ? 'gk' : 'outfield'),
      );
      let meNum = 0;
      let meDen = 0;
      for (const spec of relevantWeights) {
        const val = attrVal(attrs, spec.key);
        const roleRelevance = role.key.includes(spec.key)
          ? 1.35
          : role.pref.includes(spec.key)
            ? 1.1
            : 0.75;
        const w = spec.weight * roleRelevance;
        meNum += val * w;
        meDen += w;
      }
      const meAvg = meDen > 0 ? meNum / meDen : 12;
      meBonus = round1(((meAvg - 12) / 8) * 12);
    }

    const score = round1(clamp(baseScore + meBonus, 0, 100));

    const allItems = [...keyItems, ...prefItems];
    const strengths = [...allItems]
      .sort((a, b) => b.value - a.value || (a.tier === 'key' ? -1 : 1) || a.key.localeCompare(b.key))
      .slice(0, 3);
    const weaknesses = [...allItems]
      .sort((a, b) => a.value - b.value || (a.tier === 'key' ? -1 : 1) || a.key.localeCompare(b.key))
      .slice(0, 3);

    return {
      role,
      score,
      keyAvg: round1(keyAvg),
      prefAvg: round1(prefAvg),
      meBonus,
      strengths,
      weaknesses,
    };
  });

  results.sort(
    (a, b) => b.score - a.score || b.keyAvg - a.keyAvg || a.role.id.localeCompare(b.role.id),
  );

  return typeof opts.limit === 'number' && opts.limit > 0
    ? results.slice(0, opts.limit)
    : results;
}

// ── 2. Compatible IP + OOP Role Pair Suggester ────────────────────────────────

interface PairSynergy {
  bonus: number;
  note: string;
}

function evaluatePairSynergy(ip: RoleDef, oop: RoleDef): PairSynergy {
  // Exact curated FM26/FM27 high-synergy pairings
  const key = `${ip.id}+${oop.id}`;
  const curated: Record<string, PairSynergy> = {
    'bpgk+swk': { bonus: 3.0, note: 'Modern high-line keeper pair: breaks press on the ball and sweeps depth off it.' },
    'nngk+lhk': { bonus: 2.5, note: 'Pure low-block keeper pair: zero build-up risk paired with goal-line shot-stopping.' },
    'bpcb+scb': { bonus: 2.0, note: 'Proactive front-foot CB: steps out to win duels OOP and breaks lines IP.' },
    'cb_ip+ccb': { bonus: 2.0, note: 'Disciplined anchor CB: holds rest-defence IP and sweeps depth OOP.' },
    'ocb+cwcb': { bonus: 1.5, note: 'Wide back-three specialist balancing overlapping runs with wide channel cover.' },
    'ifb+hfb': { bonus: 3.0, note: 'Seamless back-three anchor: stays tucked beside CBs in both phases.' },
    'wb_ip+pfb': { bonus: 2.0, note: 'High-energy touchline pair locking outside pressing traps and overlapping high.' },
    'awb+prwb': { bonus: 2.5, note: 'Relentless high-line wing-back dominating the entire touchline both ways.' },
    'iwb+fb_oop': { bonus: 2.0, note: 'Inverts into central pivot IP then recovers cleanly to standard back-four alignment OOP.' },
    'dlp+sdm': { bonus: 3.0, note: 'Ideal single-pivot pair: dictates tempo IP and seals Zone 14 OOP without getting dragged out.' },
    'dm_ip+sdm': { bonus: 2.5, note: 'Rock-solid central shield locking transitions in both phases.' },
    'hb+ddm': { bonus: 2.5, note: 'Hybrid CB/DM anchoring a back three in build-up and a back five without the ball.' },
    'b2b+pcm': { bonus: 2.5, note: 'High-engine pressing midfielder crashing the box IP and hunting the ball OOP.' },
    'chm+pcm': { bonus: 2.0, note: 'Aggressive half-space runner who seamlessly joins the first pressing wave.' },
    'wcm+wccm': { bonus: 3.0, note: 'Natural wide-channel midfielder providing IP width and OOP flank cover.' },
    'w_ip+tw': { bonus: 2.5, note: 'Disciplined touchline winger who stretches play IP and doubles up on opposing FBs OOP.' },
    'w_ip+twm': { bonus: 2.5, note: 'Tireless wide midfielder pairing touchline crossing with deep defensive tracking.' },
    'if_ip+iow': { bonus: 2.0, note: 'Lethal transition forward staying high in the half-space to burst inside on turnovers.' },
    'wf_ip+wow': { bonus: 2.0, note: 'Explosive wide outlet threatening the far post IP and counter space OOP.' },
    'ap+tam': { bonus: 1.5, note: 'Creative Zone-14 hub who still drops into midfield to preserve block numbers.' },
    'cf_ip+tcf': { bonus: 2.5, note: 'Complete front-foot striker leading the press OOP and pinning CBs IP.' },
    'chf+socf': { bonus: 2.5, note: 'Channel-running threat stretching opposing full-backs in both open play and counters.' },
    'poa+cocf': { bonus: 2.0, note: 'Pure last-line finisher conserving energy OOP to stay ready for direct vertical releases.' },
  };
  if (curated[key]) return curated[key];

  // Penalty for wide-CB mismatch if ever checked generically
  if (Boolean(ip.wideCB) !== Boolean(oop.wideCB)) {
    return { bonus: -3.0, note: 'Mixed wide-CB and central-CB tactical scope; check back-three alignment.' };
  }

  // Smooth profile-coherence heuristics
  const depthGap = Math.abs(ip.profile.depth - oop.profile.depth);
  if (ip.tags.includes('RD') && oop.tags.includes('LOW')) {
    return { bonus: 2.0, note: 'Disciplined two-way anchor keeping rest-defence and low-block spacing tight.' };
  }
  if ((ip.tags.includes('ADV') || ip.tags.includes('RUN')) && oop.tags.includes('HP')) {
    return { bonus: 1.5, note: 'High-tempo front-foot pairing combining aggressive attacking runs with immediate pressing.' };
  }
  if (oop.tags.includes('OUT') && ip.tags.includes('RUN')) {
    return { bonus: 1.5, note: 'Transition-ready pairing minimising recovery distance to spring fast vertical breaks.' };
  }
  if (depthGap > 1.1) {
    return { bonus: -1.5, note: 'Large vertical shift between IP and OOP duties; demands high Stamina and Work Rate.' };
  }
  return { bonus: 0.5, note: `Balanced dual-phase pairing combining ${ip.name} (IP) with ${oop.name} (OOP).` };
}

export function suggestRolePairs(
  attrs: Partial<Record<AttrKey, number>>,
  group: PositionGroup,
  mode: RoleFitMode = 'role',
  limit = 5,
): RolePairFit[] {
  const ipFits = scoreRoleFit(attrs, { group, phase: 'ip', mode });
  const oopFits = scoreRoleFit(attrs, { group, phase: 'oop', mode });

  const pairs: RolePairFit[] = [];
  for (const ip of ipFits) {
    for (const oop of oopFits) {
      const syn = evaluatePairSynergy(ip.role, oop.role);
      const combinedScore = round1(clamp((ip.score + oop.score) / 2 + syn.bonus, 0, 100));
      pairs.push({
        ip,
        oop,
        combinedScore,
        fitNote: syn.note,
      });
    }
  }

  pairs.sort(
    (a, b) =>
      b.combinedScore - a.combinedScore ||
      b.ip.score - a.ip.score ||
      a.ip.role.id.localeCompare(b.ip.role.id) ||
      a.oop.role.id.localeCompare(b.oop.role.id),
  );

  return pairs.slice(0, Math.max(1, limit));
}

// ── 3. Role Comparator ────────────────────────────────────────────────────────

const PROFILE_METRICS: readonly { key: keyof RoleDef['profile']; label: string }[] = [
  { key: 'depth', label: 'Depth' },
  { key: 'width', label: 'Width' },
  { key: 'roam', label: 'Roaming' },
  { key: 'risk', label: 'Passing Risk' },
  { key: 'press', label: 'Pressing' },
  { key: 'lineRun', label: 'Line Runs' },
  { key: 'lateBox', label: 'Late Box Runs' },
  { key: 'invert', label: 'Inversion' },
  { key: 'overlap', label: 'Overlapping' },
  { key: 'dropDeep', label: 'Dropping Deep' },
  { key: 'holdPos', label: 'Hold Position' },
] as const;

function diffArrays<T>(a: readonly T[], b: readonly T[]): { shared: T[]; onlyA: T[]; onlyB: T[] } {
  const setA = new Set(a);
  const setB = new Set(b);
  return {
    shared: a.filter((item) => setB.has(item)),
    onlyA: a.filter((item) => !setB.has(item)),
    onlyB: b.filter((item) => !setA.has(item)),
  };
}

export function compareRoles(roleAId: string, roleBId: string): RoleComparison | null {
  const roleA = ROLE_BY_ID[roleAId];
  const roleB = ROLE_BY_ID[roleBId];
  if (!roleA || !roleB) return null;

  const profileDiffs: RoleProfileDiffItem[] = PROFILE_METRICS.map(({ key, label }) => {
    const a = Number(roleA.profile[key]);
    const b = Number(roleB.profile[key]);
    return {
      metric: key,
      label,
      a: round2(a),
      b: round2(b),
      diff: round2(a - b),
    };
  });

  return {
    roleA,
    roleB,
    samePhase: roleA.phase === roleB.phase,
    groups: diffArrays(roleA.groups, roleB.groups),
    keyAttrs: diffArrays(roleA.key, roleB.key),
    prefAttrs: diffArrays(roleA.pref, roleB.pref),
    profileDiffs,
    legacyEquiv: {
      a: roleA.legacyEquiv ?? null,
      b: roleB.legacyEquiv ?? null,
    },
  };
}
