import {
  MENTALITIES,
  ROLE_BY_ID,
  rolesForSlot,
  TEAM_INSTRUCTIONS,
  TI_BY_KEY,
  TI_DEFAULTS,
  type PIKey,
  type RoleDef,
  type TIKey,
} from '../data';
import {
  computeDefensiveLineX,
  computeLoeX,
  getFormation,
  resolveTacticPositions,
  type ResolvedPlayerPosition,
} from './pitch';
import {
  PITCH_LENGTH,
  PITCH_WIDTH,
  type TacticAnalysis,
  type TacticConfig,
  type TacticDiagnostic,
  type ZoneCell,
  type ZoneCoverageReport,
  type ZoneRoleSwap,
  type ZoneStatus,
} from './types';

// ── 7×5 (35-Zone) Coverage Grid Constants ─────────────────────────────────────

const COLS = 7 as const;
const ROWS = 5 as const;

const COL_LABELS = [
  'Own Box',
  'Deep Build-up',
  'Def Midfield',
  'Centre Circle',
  'Att Midfield',
  'Final Third',
  'Opposition Box',
] as const;

const ROW_LABELS = [
  'Left Wing',
  'Left Half-Space',
  'Central',
  'Right Half-Space',
  'Right Wing',
] as const;

function colBand(col: number): 'def' | 'mid' | 'att' {
  if (col <= 1) return 'def';
  if (col <= 4) return 'mid';
  return 'att';
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function getTi(config: TacticConfig, key: TIKey): number {
  const def = TI_BY_KEY[key];
  const raw = config.tis[key];
  if (typeof raw !== 'number' || Number.isNaN(raw)) return def.defaultIndex;
  return clamp(Math.round(raw), 0, def.options.length - 1);
}

interface ReachPoint {
  x: number;
  y: number;
  sigma: number;
  weight: number;
  label: string;
}

function buildReachPoints(positions: ResolvedPlayerPosition[], phase: 'ip' | 'oop'): ReachPoint[] {
  const pts: ReachPoint[] = [];

  for (const pos of positions) {
    const { slot, role, x, y } = pos;
    const p = role.profile;
    const label = `${slot.code} (${role.abbr})`;

    if (slot.group === 'GK') {
      pts.push({
        x,
        y,
        sigma: role.id === 'swk' || role.id === 'bpgk' ? 11.5 : 9.0,
        weight: 0.95,
        label,
      });
      continue;
    }

    const baseSigma =
      10.2 + p.roam * 2.4 + (phase === 'oop' ? p.press * 1.8 : p.lineRun * 1.4);
    pts.push({ x, y, sigma: baseSigma, weight: 1.0, label });

    // Secondary dynamic reach reflecting role movement vectors
    if (phase === 'ip') {
      if (p.lateBox >= 0.65 || p.lineRun >= 0.75) {
        pts.push({
          x: clamp(x + 11, 8, 98),
          y: clamp(y + (y < 34 ? 2.5 : y > 34 ? -2.5 : 0), 7, 61),
          sigma: 9.5,
          weight: 0.55,
          label,
        });
      }
      if (p.overlap >= 0.7) {
        const side = y < 34 ? -1 : 1;
        pts.push({
          x: clamp(x + 14, 10, 96),
          y: clamp(34 + side * 26, 7, 61),
          sigma: 9.0,
          weight: 0.55,
          label,
        });
      }
      if (p.dropDeep >= 0.7) {
        pts.push({
          x: clamp(x - 11, 12, 92),
          y,
          sigma: 9.2,
          weight: 0.5,
          label,
        });
      }
    } else {
      if (p.press >= 0.8) {
        pts.push({
          x: clamp(x + 8, 12, 94),
          y,
          sigma: 9.0,
          weight: 0.48,
          label,
        });
      }
      if (role.tags.includes('CW')) {
        const side = y < 34 ? -1 : y > 34 ? 1 : 0;
        if (side !== 0) {
          pts.push({
            x,
            y: clamp(34 + side * 24, 8, 60),
            sigma: 9.5,
            weight: 0.55,
            label,
          });
        }
      }
    }
  }

  return pts;
}

function classifyZone(score: number, heavyCount: number): ZoneStatus {
  if (heavyCount >= 3 && score >= 82) return 'crowded';
  if (score >= 92) return 'crowded';
  if (score >= 68) return 'strong';
  if (score >= 42) return 'covered';
  if (score >= 22) return 'light';
  return 'gap';
}

function cellQualityScore(cell: ZoneCell): number {
  switch (cell.status) {
    case 'strong':
      return 96;
    case 'covered':
      return 84;
    case 'crowded':
      return 66;
    case 'light':
      return 48;
    case 'gap':
      return 15;
  }
}

function buildValidRoleSwaps(
  config: TacticConfig,
  phase: 'ip' | 'oop' | 'combined',
  cells: ZoneCell[],
  ipPos: ResolvedPlayerPosition[],
  oopPos: ResolvedPlayerPosition[],
): ZoneRoleSwap[] {
  const swaps: ZoneRoleSwap[] = [];
  const seen = new Set<string>();

  const ipForm = getFormation(config.ipFormation);
  const oopForm = getFormation(config.oopFormation);
  const ipCodes = ipForm.slots.map((s) => s.code);
  const oopCodes = oopForm.slots.map((s) => s.code);

  const tryAddSwap = (
    swapPhase: 'ip' | 'oop',
    slot: string,
    suggestedRoleId: string,
    zoneLabel: string,
    severity: 'warn' | 'tip',
    reason: string,
  ) => {
    const codes = swapPhase === 'ip' ? ipCodes : oopCodes;
    if (!codes.includes(slot)) return;
    const valid = rolesForSlot(slot, codes, swapPhase);
    if (!valid.some((r) => r.id === suggestedRoleId)) return;

    const currentRoleId =
      (swapPhase === 'ip' ? config.ipRoles[slot] : config.oopRoles[slot]) ??
      (swapPhase === 'ip'
        ? ipForm.slots.find((s) => s.code === slot)?.defaultIpRole
        : oopForm.slots.find((s) => s.code === slot)?.defaultOopRole) ??
      '';
    if (!currentRoleId || currentRoleId === suggestedRoleId) return;

    const key = `${swapPhase}:${slot}:${suggestedRoleId}`;
    if (seen.has(key)) return;
    seen.add(key);

    swaps.push({
      id: `swap-${swaps.length + 1}-${slot.toLowerCase()}-${suggestedRoleId}`,
      severity,
      zoneLabel,
      phase: swapPhase,
      slot,
      currentRoleId,
      suggestedRoleId,
      reason,
    });
  };

  const cellAt = (col: number, row: number) => cells[col * ROWS + row];

  // ── IP / Combined structural suggestions ──
  if (phase === 'ip' || phase === 'combined') {
    // 1. Left Wing gap (cols 4–5, row 0)
    const leftAttWing = cellAt(4, 0);
    const leftFinalWing = cellAt(5, 0);
    if (leftAttWing.status === 'gap' || leftFinalWing.status === 'gap') {
      tryAddSwap('ip', 'DL', 'wb_ip', leftFinalWing.label, 'warn', 'Push DL forward as a Wing-Back to hold left touchline width.');
      tryAddSwap('ip', 'WBL', 'awb', leftFinalWing.label, 'warn', 'Upgrade WBL to Advanced Wing-Back to stretch the left flank.');
      tryAddSwap('ip', 'AML', 'w_ip', leftFinalWing.label, 'tip', 'Switch AML to a touchline Winger to occupy the empty left flank.');
      tryAddSwap('ip', 'MCL', 'wcm', leftAttWing.label, 'tip', 'Use a Wide Central Midfielder on the left to drift into the vacant wing.');
    }

    // 2. Right Wing gap (cols 4–5, row 4)
    const rightAttWing = cellAt(4, 4);
    const rightFinalWing = cellAt(5, 4);
    if (rightAttWing.status === 'gap' || rightFinalWing.status === 'gap') {
      tryAddSwap('ip', 'DR', 'wb_ip', rightFinalWing.label, 'warn', 'Push DR forward as a Wing-Back to hold right touchline width.');
      tryAddSwap('ip', 'WBR', 'awb', rightFinalWing.label, 'warn', 'Upgrade WBR to Advanced Wing-Back to stretch the right flank.');
      tryAddSwap('ip', 'AMR', 'w_ip', rightFinalWing.label, 'tip', 'Switch AMR to a touchline Winger to occupy the empty right flank.');
      tryAddSwap('ip', 'MCR', 'wcm', rightAttWing.label, 'tip', 'Use a Wide Central Midfielder on the right to drift into the vacant wing.');
    }

    // 3. Opposition Box Central gap (col 6, row 2)
    const oppBox = cellAt(6, 2);
    if (oppBox.status === 'gap' || oppBox.status === 'light') {
      const stPos = ipPos.find((p) => p.slot.group === 'ST');
      if (stPos && (stPos.role.id === 'f9' || stPos.role.id === 'dlf')) {
        tryAddSwap('ip', stPos.slot.code, 'cf_ip', oppBox.label, 'warn', 'Switch the dropping striker to Centre Forward to anchor the box.');
      }
      tryAddSwap('ip', 'AMC', 'ss', oppBox.label, 'tip', 'Turn AMC into a Second Striker to crash the penalty spot.');
      tryAddSwap('ip', 'MCL', 'chm', oppBox.label, 'tip', 'Use a Channel Midfielder to add aggressive vertical box runs.');
      tryAddSwap('ip', 'MCR', 'b2b', oppBox.label, 'tip', 'Use a Box-To-Box Midfielder to arrive late in the penalty area.');
    }

    // 4. Defensive Midfield Central gap (col 2, row 2)
    const defMid = cellAt(2, 2);
    if (defMid.status === 'gap' || defMid.status === 'light') {
      tryAddSwap('ip', 'DM', 'dm_ip', defMid.label, 'warn', 'Anchor DM as a holding Defensive Midfielder to lock central rest-defence.');
      tryAddSwap('ip', 'DML', 'dm_ip', defMid.label, 'warn', 'Anchor DML as a holding Defensive Midfielder to shield Zone 14.');
      tryAddSwap('ip', 'DL', 'iwb', defMid.label, 'tip', 'Invert DL as an Inside Wing-Back to add a body in defensive midfield.');
      tryAddSwap('ip', 'DR', 'iwb', defMid.label, 'tip', 'Invert DR as an Inside Wing-Back to reinforce central build-up.');
    }

    // 5. Crowded Central / Half-Space resolution
    for (const c of cells) {
      if (c.status === 'crowded' && (c.row === 1 || c.row === 2 || c.row === 3)) {
        if (c.row === 1) {
          tryAddSwap('ip', 'AML', 'w_ip', c.label, 'tip', 'Widen AML to a touchline Winger to decongest the left half-space.');
          tryAddSwap('ip', 'DL', 'ifb', c.label, 'tip', 'Tuck DL into an Inside Full-Back role to declutter left midfield.');
        } else if (c.row === 3) {
          tryAddSwap('ip', 'AMR', 'w_ip', c.label, 'tip', 'Widen AMR to a touchline Winger to decongest the right half-space.');
          tryAddSwap('ip', 'DR', 'ifb', c.label, 'tip', 'Tuck DR into an Inside Full-Back role to declutter right midfield.');
        } else {
          tryAddSwap('ip', 'MCL', 'wcm', c.label, 'tip', 'Pull MCL wider as a Wide Central Midfielder to relieve central congestion.');
        }
      }
    }
  }

  // ── OOP / Combined defensive suggestions ──
  if (phase === 'oop' || phase === 'combined') {
    const defMidCentre = cellAt(2, 2);
    if (defMidCentre.status === 'gap' || defMidCentre.status === 'light') {
      tryAddSwap('oop', 'DM', 'sdm', defMidCentre.label, 'warn', 'Use a Screening DM to protect Zone 14 out of possession.');
      tryAddSwap('oop', 'MCL', 'scm', defMidCentre.label, 'tip', 'Use a Screening CM to keep central passing lanes closed.');
      tryAddSwap('oop', 'AMC', 'tam', defMidCentre.label, 'tip', 'Use a Tracking AM to drop into midfield and seal the centre.');
    }

    const leftDefFlank = cellAt(1, 0);
    if (leftDefFlank.status === 'gap' || leftDefFlank.status === 'light') {
      tryAddSwap('oop', 'ML', 'twm', leftDefFlank.label, 'warn', 'Assign Tracking Wide Midfielder on the left to protect the flank.');
      tryAddSwap('oop', 'AML', 'tw', leftDefFlank.label, 'tip', 'Assign Tracking Winger on the left to track opposing full-backs.');
      tryAddSwap('oop', 'MCL', 'wccm', leftDefFlank.label, 'tip', 'Use a Wide Covering CM to cover the left defensive channel.');
    }

    const rightDefFlank = cellAt(1, 4);
    if (rightDefFlank.status === 'gap' || rightDefFlank.status === 'light') {
      tryAddSwap('oop', 'MR', 'twm', rightDefFlank.label, 'warn', 'Assign Tracking Wide Midfielder on the right to protect the flank.');
      tryAddSwap('oop', 'AMR', 'tw', rightDefFlank.label, 'tip', 'Assign Tracking Winger on the right to track opposing full-backs.');
      tryAddSwap('oop', 'MCR', 'wccm', rightDefFlank.label, 'tip', 'Use a Wide Covering CM to cover the right defensive channel.');
    }

    // High-line Sweeper Keeper check
    const dline = getTi(config, 'dline');
    const gkOop = oopPos.find((p) => p.slot.group === 'GK');
    if (dline >= 3 && gkOop && gkOop.role.id !== 'swk') {
      tryAddSwap('oop', 'GK', 'swk', cellAt(1, 2).label, 'warn', 'Switch GK to Sweeper Keeper to cover space behind the high defensive line.');
    }
  }

  return swaps.slice(0, 5);
}

export function computeZoneCoverage(
  config: TacticConfig,
  phase: 'ip' | 'oop' | 'combined',
): ZoneCoverageReport {
  const ipPos = resolveTacticPositions(config, 'ip');
  const oopPos = resolveTacticPositions(config, 'oop');

  const reachSets: { pts: ReachPoint[]; weight: number }[] =
    phase === 'ip'
      ? [{ pts: buildReachPoints(ipPos, 'ip'), weight: 1 }]
      : phase === 'oop'
        ? [{ pts: buildReachPoints(oopPos, 'oop'), weight: 1 }]
        : [
            { pts: buildReachPoints(ipPos, 'ip'), weight: 0.55 },
            { pts: buildReachPoints(oopPos, 'oop'), weight: 0.45 },
          ];

  const colW = PITCH_LENGTH / COLS; // 15 m
  const rowH = PITCH_WIDTH / ROWS; // 13.6 m
  const cells: ZoneCell[] = [];

  for (let col = 0; col < COLS; col++) {
    const x0 = round1(col * colW);
    const x1 = round1((col + 1) * colW);
    const cx = (x0 + x1) / 2;
    const band = colBand(col);

    for (let row = 0; row < ROWS; row++) {
      const y0 = round1(row * rowH);
      const y1 = round1((row + 1) * rowH);
      const cy = (y0 + y1) / 2;

      let totalIntensity = 0;
      const contribMap = new Map<string, number>();

      for (const set of reachSets) {
        for (const pt of set.pts) {
          const d = Math.hypot(cx - pt.x, cy - pt.y);
          const g = pt.weight * Math.exp(-(d * d) / (2 * pt.sigma * pt.sigma));
          totalIntensity += g * set.weight;
          if (g >= 0.3) {
            contribMap.set(pt.label, Math.max(contribMap.get(pt.label) ?? 0, g));
          }
        }
      }

      // Scale smoothly into 0..100
      const score = Math.round(clamp(totalIntensity * 44, 0, 100));
      const contributors = [...contribMap.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([lbl]) => lbl);
      const heavyCount = [...contribMap.values()].filter((v) => v >= 0.58).length;
      const status = classifyZone(score, heavyCount);

      cells.push({
        col,
        row,
        label: `${COL_LABELS[col]} · ${ROW_LABELS[row]}`,
        band,
        x0,
        x1,
        y0,
        y1,
        score,
        status,
        contributors,
      });
    }
  }

  const gradeBand = (band: 'def' | 'mid' | 'att'): number => {
    const bandCells = cells.filter((c) => c.band === band);
    const avg =
      bandCells.reduce((acc, c) => acc + cellQualityScore(c), 0) /
      Math.max(1, bandCells.length);
    return Math.round(clamp(avg, 0, 100));
  };

  const gaps = cells.filter((c) => c.status === 'gap').map((c) => c.label);
  const crowded = cells.filter((c) => c.status === 'crowded').map((c) => c.label);
  const swaps = buildValidRoleSwaps(config, phase, cells, ipPos, oopPos);

  return {
    phase,
    cols: COLS,
    rows: ROWS,
    colLabels: [...COL_LABELS],
    rowLabels: [...ROW_LABELS],
    cells,
    bandGrades: {
      defense: gradeBand('def'),
      midfield: gradeBand('mid'),
      attack: gradeBand('att'),
    },
    gaps,
    crowded,
    swaps,
  };
}

// ── Tactic Diagnostics & Analysis ─────────────────────────────────────────────

interface TransitionPair {
  ipSlot: string;
  oopSlot: string;
  distance: number;
}

function pairIpToOopOutfield(
  ipPos: ResolvedPlayerPosition[],
  oopPos: ResolvedPlayerPosition[],
): TransitionPair[] {
  const ipOut = ipPos.filter((p) => p.slot.group !== 'GK');
  const oopOut = oopPos.filter((p) => p.slot.group !== 'GK');
  const usedOop = new Set<string>();
  const pairs: TransitionPair[] = [];
  const unmatchedIp: ResolvedPlayerPosition[] = [];

  // Exact slot-code matches first
  for (const ip of ipOut) {
    const exact = oopOut.find((o) => o.slot.code === ip.slot.code && !usedOop.has(o.slot.code));
    if (exact) {
      usedOop.add(exact.slot.code);
      pairs.push({
        ipSlot: ip.slot.code,
        oopSlot: exact.slot.code,
        distance: round1(Math.hypot(ip.x - exact.x, ip.y - exact.y)),
      });
    } else {
      unmatchedIp.push(ip);
    }
  }

  // Deterministic greedy nearest-base-slot pairing for formation morphs (e.g. AML <-> ML)
  const remainingOop = oopOut.filter((o) => !usedOop.has(o.slot.code));
  for (const ip of unmatchedIp) {
    if (remainingOop.length === 0) break;
    let bestIdx = 0;
    let bestBaseDist = Infinity;
    for (let i = 0; i < remainingOop.length; i++) {
      const o = remainingOop[i];
      const d = Math.hypot(ip.slot.x - o.slot.x, ip.slot.y - o.slot.y);
      if (d < bestBaseDist) {
        bestBaseDist = d;
        bestIdx = i;
      }
    }
    const chosen = remainingOop.splice(bestIdx, 1)[0];
    pairs.push({
      ipSlot: ip.slot.code,
      oopSlot: chosen.slot.code,
      distance: round1(Math.hypot(ip.x - chosen.x, ip.y - chosen.y)),
    });
  }

  return pairs;
}

const CENTRAL_PLAYMAKER_IDS = new Set(['dlp', 'mp', 'ap', 'b2bp', 'pwb', 'fr']);
const FM27_BOX_PIS: readonly PIKey[] = [
  'arrive_late',
  'attack_the_defensive_line',
  'target_near_post',
  'target_centre',
  'target_far_post',
];
const BOX_TARGET_ZONE_PIS: readonly PIKey[] = [
  'target_near_post',
  'target_centre',
  'target_far_post',
];

function isSpecialistRole(role: RoleDef): boolean {
  return (
    role.profile.invert >= 0.6 ||
    role.profile.overlap >= 0.7 ||
    role.profile.roam >= 0.45 ||
    role.tags.includes('CR') ||
    role.tags.includes('TODM') ||
    role.tags.includes('TOCB') ||
    role.tags.includes('OUT')
  );
}

export function analyzeTactic(config: TacticConfig): TacticAnalysis {
  const ipForm = getFormation(config.ipFormation);
  const oopForm = getFormation(config.oopFormation);
  const ment = MENTALITIES[clamp(Math.round(config.mentality ?? 3), 0, MENTALITIES.length - 1)];

  const ipPos = resolveTacticPositions(config, 'ip');
  const oopPos = resolveTacticPositions(config, 'oop');
  const ipOutfield = ipPos.filter((p) => p.slot.group !== 'GK');
  const oopOutfield = oopPos.filter((p) => p.slot.group !== 'GK');

  const defLineX = computeDefensiveLineX(config);
  const loeX = computeLoeX(config);
  const lineGap = round1(loeX - defLineX);

  // ── Core tactical counts ──
  const restDefenceSlots = ipOutfield.filter((p) => {
    const pis = config.pis[p.slot.code] ?? [];
    if (pis.includes('get_further_forward')) return false;
    return (
      p.role.tags.includes('RD') ||
      pis.includes('hold_position') ||
      p.role.profile.holdPos >= 0.74
    );
  });
  const restDefenceCount = restDefenceSlots.length;

  const boxRunnerSlots = ipOutfield.filter((p) => {
    const pis = config.pis[p.slot.code] ?? [];
    if (pis.includes('hold_position')) return false;
    return (
      p.role.tags.includes('BOX') ||
      p.role.profile.lateBox >= 0.65 ||
      pis.some((k) => FM27_BOX_PIS.includes(k))
    );
  });
  const boxRunnersCount = boxRunnerSlots.length;

  const creatorSlots = ipOutfield.filter((p) => {
    const pis = config.pis[p.slot.code] ?? [];
    return p.role.tags.includes('CR') || pis.includes('take_more_risks');
  });
  const creatorsCount = creatorSlots.length;

  const outletSlots = oopOutfield.filter((p) => p.role.tags.includes('OUT'));
  const outletsCount = outletSlots.length;

  const leftWidthHolders = ipOutfield
    .filter((p) => {
      const pis = config.pis[p.slot.code] ?? [];
      if (pis.includes('sit_narrower')) return false;
      const isLeft = p.slot.y < 30;
      return isLeft && (p.y <= 18.5 || p.role.tags.includes('W') || pis.includes('stay_wider'));
    })
    .map((p) => p.slot.code);

  const rightWidthHolders = ipOutfield
    .filter((p) => {
      const pis = config.pis[p.slot.code] ?? [];
      if (pis.includes('sit_narrower')) return false;
      const isRight = p.slot.y > 38;
      return isRight && (p.y >= 49.5 || p.role.tags.includes('W') || pis.includes('stay_wider'));
    })
    .map((p) => p.slot.code);

  // ── IP ↔ OOP Transition Distance ──
  const transitionPairs = pairIpToOopOutfield(ipPos, oopPos);
  const avgTravelDistance = round1(
    transitionPairs.reduce((acc, p) => acc + p.distance, 0) / Math.max(1, transitionPairs.length),
  );
  const maxPair = transitionPairs.reduce(
    (best, cur) => (cur.distance > best.distance ? cur : best),
    transitionPairs[0] ?? { ipSlot: 'ST', oopSlot: 'ST', distance: 0 },
  );
  const maxTravelDistance = maxPair.distance;
  const stretchedSlots = transitionPairs.filter((p) => p.distance >= 28).map((p) => p.ipSlot);

  // ── FM27 Tactical Complexity (0–100) ──
  let complexityRaw = 8; // baseline structure
  if (ipForm.id !== oopForm.id) complexityRaw += 14;
  for (const ti of TEAM_INSTRUCTIONS) {
    const val = getTi(config, ti.key);
    if (val !== ti.defaultIndex) {
      complexityRaw += ti.complexity * 4.5;
    }
  }
  const specialistCount = [...ipPos, ...oopPos].filter((p) => isSpecialistRole(p.role)).length;
  complexityRaw += specialistCount * 2.2;

  const totalPiCount = Object.values(config.pis).reduce((acc, list) => acc + list.length, 0);
  complexityRaw += totalPiCount * 2.5;
  if (getTi(config, 'creative') === 2) complexityRaw += 6;
  if (ment.index === 0 || ment.index === 6) complexityRaw += 5;

  const complexityScore = Math.round(clamp(complexityRaw, 0, 100));
  const complexityTier: TacticAnalysis['complexityTier'] =
    complexityScore < 28
      ? 'Simple'
      : complexityScore < 52
        ? 'Moderate'
        : complexityScore < 76
          ? 'Complex'
          : 'Very Complex';

  // ── Plain-English Diagnostics ──
  const diagnostics: TacticDiagnostic[] = [];

  // 1. Transition Distance
  if (maxTravelDistance >= 28) {
    diagnostics.push({
      id: 'transition-distance-high',
      severity: 'warn',
      category: 'transition',
      title: `Heavy IP ↔ OOP transition load (max ${maxTravelDistance} m, avg ${avgTravelDistance} m)`,
      detail: `At least one outfield player (${stretchedSlots.join(', ')}) has to cover ${maxTravelDistance} m between your ${ipForm.shortName} IP shape and ${oopForm.shortName} OOP block, draining Stamina and opening transition counters.`,
      fix: 'Align your IP/OOP shapes more closely, reduce extreme line shifts, or add a Wide Covering midfielder behind advancing wing-backs.',
      slots: stretchedSlots,
    });
  } else if (maxTravelDistance >= 22) {
    diagnostics.push({
      id: 'transition-distance-mod',
      severity: 'tip',
      category: 'transition',
      title: `Moderate IP ↔ OOP transition distance (max ${maxTravelDistance} m, avg ${avgTravelDistance} m)`,
      detail: `Your largest morph (${maxPair.ipSlot} → ${maxPair.oopSlot}) travels ${maxTravelDistance} m on turnovers — manageable with Stamina ≥ 14 and planned 60-minute subs.`,
      slots: [maxPair.ipSlot],
    });
  } else {
    diagnostics.push({
      id: 'transition-distance-good',
      severity: 'good',
      category: 'transition',
      title: `Compact IP ↔ OOP transitions (max ${maxTravelDistance} m, avg ${avgTravelDistance} m)`,
      detail: `All 10 outfield players stay within ${maxTravelDistance} m between possession and defensive shapes, conserving FM27 Hawk-Eye Stamina.`,
    });
  }

  // 2. FM27 Tactical Complexity
  diagnostics.push({
    id: 'fm27-complexity',
    severity: complexityTier === 'Very Complex' ? 'warn' : complexityTier === 'Complex' ? 'tip' : 'good',
    category: 'complexity',
    title: `FM27 Tactical Complexity: ${complexityTier} (${complexityScore}/100)`,
    detail:
      complexityTier === 'Very Complex' || complexityTier === 'Complex'
        ? `High instruction and role load slows FM27 Tactical Understanding and requires weekly tactical training to avoid the ~3-week decay penalty (relying heavily on Decisions, Anticipation, Composure, and Concentration).`
        : `Clean, digestible tactical footprint — squads reach high FM27 Tactical Understanding quickly and resist the ~3-week training decay between fixtures.`,
    ...(complexityTier === 'Very Complex'
      ? { fix: 'Reset low-impact Team Instructions to Balanced and trim overlapping PIs unless your XI has elite mental attributes.' }
      : {}),
  });

  // 3. Rest Defence
  const minRestDef = ment.index >= 5 ? 4 : 3;
  if (restDefenceCount < minRestDef) {
    diagnostics.push({
      id: 'rest-defence-thin',
      severity: restDefenceCount <= 2 ? 'error' : 'warn',
      category: 'rest-defence',
      title: `Thin rest-defence (${restDefenceCount} outfield players behind the ball)`,
      detail: `With ${ment.name} mentality, leaving fewer than ${minRestDef} players behind play exposes your centre-backs to direct counter-attacks on turnovers.`,
      fix: 'Convert one full-back to Inside Full-Back (IFB) or Inside Wing-Back (IWB), or give a DM/CM the Hold Position PI.',
    });
  } else if (restDefenceCount <= 5) {
    diagnostics.push({
      id: 'rest-defence-solid',
      severity: 'good',
      category: 'rest-defence',
      title: `Balanced rest-defence (${restDefenceCount} players anchoring transitions)`,
      detail: `Slots ${restDefenceSlots.map((p) => p.slot.code).join(', ')} lock central transition lanes cleanly behind attacks.`,
      slots: restDefenceSlots.map((p) => p.slot.code),
    });
  } else if (ment.index >= 4) {
    diagnostics.push({
      id: 'rest-defence-heavy',
      severity: 'tip',
      category: 'rest-defence',
      title: `Conservative rest-defence (${restDefenceCount} players staying back)`,
      detail: `Holding ${restDefenceCount} outfield players back in a ${ment.name} system can starve your final third of passing options against low blocks.`,
      fix: 'Release one full-back as a Wing-Back or switch a holding midfielder to Box-To-Box or Channel Midfielder.',
    });
  }

  // 4. Flank Width
  if (leftWidthHolders.length === 0 || rightWidthHolders.length === 0) {
    const missing: string[] = [];
    if (leftWidthHolders.length === 0) missing.push('left');
    if (rightWidthHolders.length === 0) missing.push('right');
    diagnostics.push({
      id: 'width-missing',
      severity: 'warn',
      category: 'width',
      title: `No touchline width holder on the ${missing.join(' & ')} flank`,
      detail: `Everyone on the ${missing.join(' and ')} side tucks inward, letting opponents squeeze the middle without defending the touchline.`,
      fix: 'Pair an inside-cutting winger with a Wing-Back/AWB behind, switch the winger to W/WF, or add Stay Wider.',
    });
  } else {
    diagnostics.push({
      id: 'width-balanced',
      severity: 'good',
      category: 'width',
      title: `Both flanks stretched (L: ${leftWidthHolders.join(', ')} · R: ${rightWidthHolders.join(', ')})`,
      detail: 'Touchline presence on both flanks forces the opposing back line to defend the full 68 m width.',
    });
  }

  // 5. FM27 Box Occupation
  const targetZoneCounts: Record<string, string[]> = {
    target_near_post: [],
    target_centre: [],
    target_far_post: [],
  };
  for (const p of ipOutfield) {
    for (const key of BOX_TARGET_ZONE_PIS) {
      if ((config.pis[p.slot.code] ?? []).includes(key)) {
        targetZoneCounts[key].push(p.slot.code);
      }
    }
  }
  const overlappingTargets = Object.entries(targetZoneCounts).filter(([, list]) => list.length >= 2);
  const loneDroppingStriker =
    ipOutfield.filter((p) => p.slot.group === 'ST').length === 1 &&
    ipOutfield.some((p) => p.slot.group === 'ST' && (p.role.id === 'f9' || p.role.id === 'dlf'));

  if (boxRunnersCount < 2) {
    diagnostics.push({
      id: 'box-occupation-low',
      severity: 'warn',
      category: 'box',
      title: `Low FM27 box occupation (${boxRunnersCount} box runner${boxRunnersCount === 1 ? '' : 's'})`,
      detail: loneDroppingStriker
        ? 'Your lone striker drops deep to link play without enough vertical runners attacking the penalty box.'
        : 'Too few players attack the penalty box on crosses and cut-backs, lowering xG conversion.',
      fix: 'Add an Inside Forward, Second Striker, Channel Midfielder, or FM27 Box PIs (Attack the Defensive Line / Arrive Late).',
    });
  } else if (overlappingTargets.length > 0) {
    const [zoneKey, slots] = overlappingTargets[0];
    diagnostics.push({
      id: 'box-target-overlap',
      severity: 'tip',
      category: 'box',
      title: `Stacked FM27 box target zone (${slots.join(' & ')})`,
      detail: `Multiple runners share ${zoneKey.replace(/_/g, ' ')}. Staggering Near Post, Centre, Far Post, and Arrive Late stretches marking assignments.`,
      fix: 'Assign distinct target zones across your front three and late-arriving midfielder.',
      slots,
    });
  } else {
    diagnostics.push({
      id: 'box-occupation-good',
      severity: 'good',
      category: 'box',
      title: `Strong FM27 box occupation (${boxRunnersCount} box threats)`,
      detail: `Multiple runners (${boxRunnerSlots.map((p) => p.slot.code).join(', ')}) attack the area across varied corridors and waves.`,
      slots: boxRunnerSlots.map((p) => p.slot.code),
    });
  }

  // 6. OOP Outlets check
  if (outletsCount >= 3) {
    diagnostics.push({
      id: 'outlets-too-many',
      severity: 'warn',
      category: 'outlets',
      title: `Too many OOP counter outlets (${outletsCount})`,
      detail: `Leaving ${outletsCount} players high out of possession (${outletSlots.map((p) => p.slot.code).join(', ')}) starves your defensive block of numbers.`,
      fix: 'Cap OOP Outlet roles to 1–2 and convert the extra attacker into a Tracking role.',
      slots: outletSlots.map((p) => p.slot.code),
    });
  }

  // 7. Coherence Checks
  const buildup = getTi(config, 'buildup');
  const passing = getTi(config, 'passing');
  const widthTi = getTi(config, 'width');
  const loe = getTi(config, 'loe');
  const dline = getTi(config, 'dline');
  const dlBeh = getTi(config, 'dl_behaviour');
  const trigger = getTi(config, 'trigger');
  const defTrans = getTi(config, 'def_trans');

  // 7a. nncb / nngk + Play Through Press
  const noNonsenseSlots = ipPos
    .filter((p) => p.role.id === 'nncb' || p.role.id === 'nngk')
    .map((p) => p.slot.code);
  if (buildup === 0 && noNonsenseSlots.length > 0) {
    diagnostics.push({
      id: 'coherence-nncb-play-through',
      severity: 'error',
      category: 'coherence',
      title: `Build-up clash: Play Through Press with ${noNonsenseSlots.join(', ')}`,
      detail: 'No-Nonsense GK/CB roles refuse build-up risk and clear early, directly contradicting Play Through Press.',
      fix: 'Switch those slots to CB / BPCB / BPGK, or change Build-up Strategy to Balanced / Bypass Press.',
      slots: noNonsenseSlots,
    });
  }

  // 7b. Attacking / Very Attacking + High Press + Step Up More overload
  if (ment.index >= 5 && loe === 2 && (dlBeh === 2 || trigger >= 3)) {
    diagnostics.push({
      id: 'coherence-press-overload',
      severity: 'warn',
      category: 'pressing',
      title: 'Extreme press & line stacking overload',
      detail: `${ment.name} mentality already pushes lines and pressing up; stacking High Press with ${dlBeh === 2 ? 'Step Up More' : 'elevated Trigger Press'} risks severe FM27 Hawk-Eye stamina drain and balls over the top.`,
      fix: 'Drop mentality to Positive or dial Defensive Line Behaviour / Trigger Press back one notch to Balanced.',
    });
  }

  // 7c. Duplicate central playmakers
  const centralPlaymakers = ipOutfield.filter(
    (p) =>
      CENTRAL_PLAYMAKER_IDS.has(p.role.id) &&
      (p.slot.group === 'DM' || p.slot.group === 'MC' || p.slot.group === 'AMC' || p.role.id === 'pwb'),
  );
  if (centralPlaymakers.length >= 2) {
    diagnostics.push({
      id: 'creativity-duplicate-playmakers',
      severity: 'warn',
      category: 'creativity',
      title: `Duplicate central playmakers (${centralPlaymakers.map((p) => `${p.slot.code} ${p.role.abbr}`).join(', ')})`,
      detail: 'Multiple ball-dominant central playmakers ask for possession in the same pocket, slowing tempo and reducing vertical runners ahead of them.',
      fix: 'Keep one primary central organiser and switch the partner to a runner (CHM, B2B, SS) or anchor (DM).',
      slots: centralPlaymakers.map((p) => p.slot.code),
    });
  }

  // 7d. High Defensive Line without Sweeper Keeper
  const gkOop = oopPos.find((p) => p.slot.group === 'GK');
  if (dline >= 3 && gkOop && gkOop.role.id !== 'swk') {
    diagnostics.push({
      id: 'pressing-high-line-no-swk',
      severity: 'warn',
      category: 'pressing',
      title: 'High defensive line without a Sweeper Keeper',
      detail: `Your back line sits at ${defLineX} m, leaving vast space in behind while ${gkOop.role.name} stays deeper in the box.`,
      fix: 'Switch your OOP goalkeeper role to Sweeper Keeper (SK).',
      slots: ['GK'],
    });
  }

  // 7e. Stretched vertical line gap (Low D-Line + High Press)
  if (lineGap >= 38) {
    diagnostics.push({
      id: 'pressing-line-gap',
      severity: 'warn',
      category: 'pressing',
      title: `Stretched vertical block (${lineGap} m between Def Line and LoE)`,
      detail: `Your Line of Engagement (${loeX} m) is far ahead of your Defensive Line (${defLineX} m), handing opponents easy space between the lines.`,
      fix: 'Raise your Defensive Line to support the press, or lower Line of Engagement to Mid Block.',
    });
  }

  // 7f. Counter-Press + Much Wider
  if (defTrans === 2 && widthTi === 4) {
    diagnostics.push({
      id: 'coherence-counterpress-wide',
      severity: 'warn',
      category: 'coherence',
      title: 'Counter-Press paired with Much Wider spacing',
      detail: 'Extreme attacking width pulls players too far apart to swarm the ball carrier immediately on turnovers.',
      fix: 'Bring Attacking Width to Balanced/Wider or switch Defensive Transition to Balanced/Regroup.',
    });
  }

  // 7g. Bypass Press + Shorter / Much Shorter Passing
  if (buildup === 2 && passing <= 1) {
    diagnostics.push({
      id: 'coherence-bypass-short',
      severity: 'warn',
      category: 'coherence',
      title: 'Bypass Press paired with Shorter Passing',
      detail: 'Bypass Press asks defenders to go long while Shorter Passing narrows build-up connections.',
      fix: 'Align Build-up Strategy to Balanced/Play Through Press or raise Passing Directness to Balanced/More Direct.',
    });
  }

  // Executive plain-English summary
  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warnCount = diagnostics.filter((d) => d.severity === 'warn').length;
  const topIssue = diagnostics.find((d) => d.severity === 'error' || d.severity === 'warn');

  const summary =
    errorCount === 0 && warnCount === 0
      ? `${ment.name} ${ipForm.shortName} → ${oopForm.shortName} looks structurally coherent: ${restDefenceCount}-man rest-defence, ${boxRunnersCount} box threats, ${complexityTier.toLowerCase()} FM27 complexity (${complexityScore}/100), and compact ${maxTravelDistance} m max transition travel.`
      : `${ment.name} ${ipForm.shortName} → ${oopForm.shortName} has ${errorCount > 0 ? `${errorCount} critical issue${errorCount > 1 ? 's' : ''} and ` : ''}${warnCount} warning${warnCount === 1 ? '' : 's'} (${complexityTier} complexity ${complexityScore}/100). Priority fix: ${topIssue?.title ?? 'review flagged diagnostics'}.`;

  // Ensure ROLE_BY_ID import isn't unused if needed later; verify clean reference
  void ROLE_BY_ID;

  return {
    restDefenceCount,
    boxRunnersCount,
    creatorsCount,
    outletsCount,
    leftWidthHolders,
    rightWidthHolders,
    complexityScore,
    complexityTier,
    maxTravelDistance,
    defLineX,
    loeX,
    lineGap,
    diagnostics,
    summary,
  };
}
