import {
  FORMATION_BY_ID,
  FORMATIONS,
  MENTALITIES,
  PI_BY_KEY,
  PRESET_BY_ID,
  ROLE_BY_ID,
  ROLES,
  TI_BY_KEY,
  TI_DEFAULTS,
  type FormationDef,
  type FormationSlot,
  type PIKey,
  type RoleDef,
  type TIKey,
} from '../data';
import type {
  BallLane,
  BallThird,
  BallZone,
  PitchArrow,
  PitchDiagram,
  PitchHighlight,
  PitchLine,
  PitchPlayerToken,
  PitchPoint,
  TacticConfig,
} from './types';

// ── Strict Safe Playable Bounds (105 × 68 Pitch) ──────────────────────────────

export const SAFE_X_MIN = 4;
export const SAFE_X_MAX = 101;
export const SAFE_Y_MIN = 5;
export const SAFE_Y_MAX = 63;

const PITCH_CY = 34;

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function clampPlayable(p: PitchPoint): PitchPoint {
  return {
    x: round1(clamp(p.x, SAFE_X_MIN, SAFE_X_MAX)),
    y: round1(clamp(p.y, SAFE_Y_MIN, SAFE_Y_MAX)),
  };
}

/**
 * Smooth strictly-monotonic symmetric compression around y = 34.
 * Linear for |dy| <= 18, then smoothly approaches `limit` (< 29) via tanh
 * so extreme stacked modifiers remain strictly monotonic and never hit the touchline.
 */
function softSym(dy: number, linearCut = 18, limit = 28.4): number {
  const abs = Math.abs(dy);
  if (abs <= linearCut) return dy;
  const span = limit - linearCut;
  const compressed = linearCut + span * Math.tanh((abs - linearCut) / 11.5);
  return Math.sign(dy) * compressed;
}

/**
 * Smooth strictly-monotonic clamping along the pitch length x ∈ [6, 99].
 */
function softX(x: number, minX = SAFE_X_MIN + 0.5, maxX = SAFE_X_MAX - 0.5): number {
  const lowSoft = minX + 5;
  const highSoft = maxX - 5;
  if (x < lowSoft) {
    return lowSoft - 5 * Math.tanh((lowSoft - x) / 8);
  }
  if (x > highSoft) {
    return highSoft + 5 * Math.tanh((x - highSoft) / 8);
  }
  return x;
}

function separateOverlappingTokens(
  players: PitchPlayerToken[],
  allowTightShadow = false,
): PitchPlayerToken[] {
  const sameTeamMinDist = 6.9;
  const crossTeamMinDist = allowTightShadow ? 4.2 : 6.4;
  const pts = players.map((p) => ({
    ...p,
    anchored: p.slot === 'GK' || Boolean(p.highlight),
  }));

  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i];
        const b = pts[j];
        const minDist = a.team === b.team ? sameTeamMinDist : crossTeamMinDist;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= minDist) continue;

        const overlap = minDist - d;
        const ux = d > 0.001 ? dx / d : 0;
        const uy = d > 0.001 ? dy / d : 1;

        if (a.anchored && b.anchored) continue;
        if (a.anchored) {
          const nextB = clampPlayable({ x: b.x + ux * overlap, y: b.y + uy * overlap });
          b.x = nextB.x;
          b.y = nextB.y;
        } else if (b.anchored) {
          const nextA = clampPlayable({ x: a.x - ux * overlap, y: a.y - uy * overlap });
          a.x = nextA.x;
          a.y = nextA.y;
        } else {
          const half = overlap * 0.5;
          const nextA = clampPlayable({ x: a.x - ux * half, y: a.y - uy * half });
          const nextB = clampPlayable({ x: b.x + ux * half, y: b.y + uy * half });
          a.x = nextA.x;
          a.y = nextA.y;
          b.x = nextB.x;
          b.y = nextB.y;
        }
        moved = true;
      }
    }
    if (!moved) break;
  }

  return pts.map(({ anchored: _anchored, ...rest }) => rest);
}

function sanitizeDiagram(diagram: PitchDiagram): PitchDiagram {
  const clampedPlayers: PitchPlayerToken[] = diagram.players.map((p) => {
    const pos = clampPlayable({ x: p.x, y: p.y });
    const next: PitchPlayerToken = {
      ...p,
      x: pos.x,
      y: pos.y,
    };
    if (p.ghostX !== undefined && p.ghostY !== undefined) {
      const ghost = clampPlayable({ x: p.ghostX, y: p.ghostY });
      next.ghostX = ghost.x;
      next.ghostY = ghost.y;
    }
    return next;
  });

  const players = separateOverlappingTokens(
    clampedPlayers,
    diagram.title === 'Mark Tighter',
  );

  const arrows: PitchArrow[] = diagram.arrows.map((a) => ({
    ...a,
    from: clampPlayable(a.from),
    to: clampPlayable(a.to),
  }));

  const lines: PitchLine[] | undefined = diagram.lines?.map((l) => ({
    ...l,
    x: round1(clamp(l.x, SAFE_X_MIN, SAFE_X_MAX)),
  }));

  const highlights: PitchHighlight[] | undefined = diagram.highlights?.map((h) => {
    const c = clampPlayable({ x: h.x, y: h.y });
    return {
      ...h,
      x: c.x,
      y: c.y,
      r: round1(clamp(h.r, 1.5, 16)),
    };
  });

  const ball = diagram.ball ? clampPlayable(diagram.ball) : undefined;

  return {
    ...diagram,
    players,
    arrows,
    ...(lines ? { lines } : {}),
    ...(highlights ? { highlights } : {}),
    ...(ball ? { ball } : {}),
  };
}

// ── Canonical 3×3 Ball Zone Coordinates ───────────────────────────────────────

export const BALL_ZONE_COORDS: Record<BallThird, Record<BallLane, PitchPoint>> = {
  def: {
    left: { x: 22, y: 13 },
    centre: { x: 22, y: 34 },
    right: { x: 22, y: 55 },
  },
  mid: {
    left: { x: 52.5, y: 13 },
    centre: { x: 52.5, y: 34 },
    right: { x: 52.5, y: 55 },
  },
  att: {
    left: { x: 82, y: 13 },
    centre: { x: 82, y: 34 },
    right: { x: 82, y: 55 },
  },
};

export function getFormation(id: string): FormationDef {
  return FORMATION_BY_ID[id] ?? FORMATIONS[0];
}

function getTi(config: TacticConfig, key: TIKey): number {
  const def = TI_BY_KEY[key];
  const raw = config.tis[key];
  if (typeof raw !== 'number' || Number.isNaN(raw)) return def.defaultIndex;
  return clamp(Math.round(raw), 0, def.options.length - 1);
}

function getMentality(config: TacticConfig) {
  const idx = clamp(Math.round(config.mentality ?? 3), 0, MENTALITIES.length - 1);
  return MENTALITIES[idx];
}

function getSlotRole(config: TacticConfig, slot: FormationSlot, phase: 'ip' | 'oop'): RoleDef {
  const rawId = phase === 'ip' ? config.ipRoles[slot.code] : config.oopRoles[slot.code];
  const found = rawId ? ROLE_BY_ID[rawId] : undefined;
  if (found && found.phase === phase) return found;
  const fallbackId = phase === 'ip' ? slot.defaultIpRole : slot.defaultOopRole;
  return ROLE_BY_ID[fallbackId] ?? ROLES[0];
}

function getSlotPis(config: TacticConfig, slotCode: string): readonly PIKey[] {
  return config.pis[slotCode] ?? [];
}

function dist(a: PitchPoint, b: PitchPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ── Default / Preset Config Factory ───────────────────────────────────────────

export function defaultTacticConfig(presetId?: string): TacticConfig {
  if (presetId && PRESET_BY_ID[presetId]) {
    const p = PRESET_BY_ID[presetId];
    const ipForm = getFormation(p.ipFormation);
    const oopForm = getFormation(p.oopFormation);
    const ipRoles: Record<string, string> = {};
    for (const s of ipForm.slots) {
      ipRoles[s.code] = p.ipRoles[s.code] ?? s.defaultIpRole;
    }
    const oopRoles: Record<string, string> = {};
    for (const s of oopForm.slots) {
      oopRoles[s.code] = p.oopRoles[s.code] ?? s.defaultOopRole;
    }
    const pis: Record<string, PIKey[]> = {};
    for (const [k, list] of Object.entries(p.pis)) {
      pis[k] = [...list];
    }
    return {
      name: p.name,
      ipFormation: p.ipFormation,
      oopFormation: p.oopFormation,
      mentality: p.mentality,
      tis: { ...TI_DEFAULTS, ...p.tis },
      ipRoles,
      oopRoles,
      pis,
    };
  }

  const ipForm = getFormation('4-3-3 DM Wide');
  const oopForm = getFormation('4-1-4-1 DM Wide');
  const ipRoles: Record<string, string> = {};
  for (const s of ipForm.slots) ipRoles[s.code] = s.defaultIpRole;
  const oopRoles: Record<string, string> = {};
  for (const s of oopForm.slots) oopRoles[s.code] = s.defaultOopRole;

  return {
    name: 'Balanced 4-3-3',
    ipFormation: ipForm.id,
    oopFormation: oopForm.id,
    mentality: 3,
    tis: { ...TI_DEFAULTS },
    ipRoles,
    oopRoles,
    pis: {},
  };
}

// ── Defensive Line & Line of Engagement Geometry ──────────────────────────────

const DLINE_BASE_X = [22, 28, 34, 40, 46] as const;
const LOE_BASE_X = [40, 56, 72] as const;

export function computeDefensiveLineX(config: TacticConfig): number {
  const dlineIdx = getTi(config, 'dline');
  const dlBeh = getTi(config, 'dl_behaviour');
  const ment = getMentality(config);
  const behShift = dlBeh === 0 ? -2.5 : dlBeh === 2 ? 2.5 : 0;
  const x = DLINE_BASE_X[dlineIdx] + behShift + ment.shifts.line * 3.5;
  return round1(clamp(x, 16, 54));
}

export function computeLoeX(config: TacticConfig): number {
  const loeIdx = getTi(config, 'loe');
  const shortGk = getTi(config, 'short_gk');
  const ment = getMentality(config);
  const defX = computeDefensiveLineX(config);
  const x = LOE_BASE_X[loeIdx] + ment.shifts.line * 4 + (shortGk === 1 ? 3 : 0);
  return round1(clamp(Math.max(x, defX + 12), 34, 84));
}

// ── Core Resolved Slot Positions (shared with analysis.ts) ────────────────────

export interface ResolvedPlayerPosition {
  slot: FormationSlot;
  role: RoleDef;
  x: number;
  y: number;
  note?: string;
}

export function resolveTacticPositions(
  config: TacticConfig,
  phase: 'ip' | 'oop',
  ballZone?: BallZone,
): ResolvedPlayerPosition[] {
  const form = getFormation(phase === 'ip' ? config.ipFormation : config.oopFormation);
  const ment = getMentality(config);

  const widthTi = getTi(config, 'width') - 2; // -2 .. +2
  const buildup = getTi(config, 'buildup');
  const supportRuns = getTi(config, 'support_runs');
  const progress = getTi(config, 'progress');
  const patience = getTi(config, 'patience');
  const attTrans = getTi(config, 'att_trans');
  const defTrans = getTi(config, 'def_trans');
  const trigger = getTi(config, 'trigger') - 2;
  const pressTrap = getTi(config, 'press_trap');
  const crossEng = getTi(config, 'cross_eng');

  const hasHalfBack =
    phase === 'ip' && form.slots.some((s) => getSlotRole(config, s, 'ip').id === 'hb');
  const ifbSlot =
    phase === 'ip'
      ? form.slots.find((s) => getSlotRole(config, s, 'ip').id === 'ifb')
      : undefined;
  const ifbSide = ifbSlot
    ? ifbSlot.y < PITCH_CY - 2
      ? -1
      : ifbSlot.y > PITCH_CY + 2
        ? 1
        : 0
    : 0;
  const hasDdm =
    phase === 'oop' && form.slots.some((s) => getSlotRole(config, s, 'oop').id === 'ddm');

  const outfieldBaseX = form.slots.filter((s) => s.group !== 'GK').map((s) => s.x);
  const minOutX = Math.min(...outfieldBaseX);
  const maxOutX = Math.max(...outfieldBaseX);
  const defLineX = computeDefensiveLineX(config);
  const loeX = computeLoeX(config);

  const laneSign = !ballZone ? 0 : ballZone.lane === 'left' ? -1 : ballZone.lane === 'right' ? 1 : 0;
  const third = ballZone?.third ?? 'mid';

  return form.slots.map((slot) => {
    const role = getSlotRole(config, slot, phase);
    const prof = role.profile;
    const pis = getSlotPis(config, slot.code);
    const side = slot.y < PITCH_CY - 2 ? -1 : slot.y > PITCH_CY + 2 ? 1 : 0;

    if (slot.group === 'GK') {
      let gx = slot.x + prof.depth * 6;
      if (phase === 'ip') {
        if (buildup === 0) gx += 2;
        if (buildup === 2) gx -= 1.2;
        if (ballZone) {
          if (third === 'att') gx += 4;
          else if (third === 'def') gx -= 1;
        }
      } else {
        gx += (defLineX - 34) * 0.22;
        if (ballZone) {
          if (third === 'att') gx += 3.5;
          else if (third === 'def') gx -= 1.5;
        }
      }
      const gy = PITCH_CY + (ballZone ? laneSign * 1.4 : 0);
      const p = clampPlayable({ x: gx, y: gy });
      const note =
        ballZone && Math.abs(gx - slot.x) >= 2.5
          ? role.id === 'swk'
            ? 'Steps out to sweep depth behind high line'
            : role.id === 'bpgk'
              ? 'Steps off line to support build-up'
              : undefined
          : undefined;
      return { slot, role, x: p.x, y: p.y, note };
    }

    let x = slot.x;
    let dy = slot.y - PITCH_CY;
    let note: string | undefined;

    if (phase === 'ip') {
      // Base vertical from mentality + role profile
      x += ment.shifts.line * 5.2;
      x += prof.depth * 6.8;
      x -= prof.dropDeep * 4.5;
      x += prof.overlap * 3.8;
      x += prof.lineRun * 2.8;
      x += prof.lateBox * 2.2;
      x -= Math.max(0, prof.holdPos - 0.55) * 2.8;

      // Special structural FM26/FM27 IP role geometries
      if (role.id === 'hb') {
        x = Math.min(x, 24.5 + ment.shifts.line * 3);
        dy = 0;
      } else if (role.id === 'ifb') {
        x = Math.min(x, 25 + ment.shifts.line * 3.5);
        dy = side * 14.5;
      } else if (role.id === 'acb') {
        x += 8.5;
        dy *= 0.65;
      } else if (role.id === 'ocb') {
        x += 6.5;
        dy += side * 5.5;
      } else if (role.id === 'iwb' || role.id === 'pwb') {
        dy = side * 7.5;
      } else {
        if (side !== 0) {
          dy -= side * prof.invert * 10.5;
          dy += side * prof.width * 2.8;
        }
      }

      if (hasHalfBack && slot.group === 'DC' && side !== 0) {
        dy += side * 3.5;
      } else if (ifbSide !== 0 && slot.group === 'DC' && side !== 0) {
        dy = side === ifbSide ? side * 1.5 : side * 12.5;
      }

      // Team Instructions (IP)
      if (buildup === 0) {
        if (slot.group === 'DC' || slot.group === 'DM') x -= 2.2;
        if (slot.group === 'DC' && side !== 0) dy += side * 2.2;
      } else if (buildup === 2) {
        if (slot.group === 'ST' || slot.group === 'AMC' || slot.group === 'AM_LR') x += 2.5;
      }

      if (supportRuns === 2) {
        // Overlap
        if (slot.group === 'D_LR' || slot.group === 'WB_LR') {
          x += 3.2;
          dy += side * 2.0;
        }
        if (slot.group === 'AM_LR' || slot.group === 'M_LR') {
          dy -= side * 2.5;
        }
      } else if (supportRuns === 0) {
        // Underlap
        if (slot.group === 'D_LR' || slot.group === 'WB_LR') {
          x += 2.2;
          dy -= side * 3.0;
        }
        if (slot.group === 'AM_LR' || slot.group === 'M_LR') {
          dy += side * 2.0;
        }
      }

      if (progress === 0) dy -= 1.8;
      else if (progress === 3) dy += 1.8;
      else if (progress === 2) dy *= 0.92;

      if (patience === 2 && (slot.group === 'ST' || slot.group === 'AMC' || slot.group === 'AM_LR')) {
        x += 1.8;
      }
      if (attTrans === 2 && (slot.group === 'ST' || slot.group === 'AM_LR')) {
        x += 2.0;
      }

      // Player Instructions (IP)
      if (pis.includes('get_further_forward')) x += 5.2;
      if (pis.includes('hold_position')) x -= 4.8;
      if (pis.includes('arrive_late')) x -= 1.8;
      if (pis.includes('attack_the_defensive_line')) x += 4.2;
      if (pis.includes('move_into_channels')) {
        x += 2.6;
        dy += (side !== 0 ? side : 1) * 3.2;
      }
      if (pis.includes('stay_wider')) {
        dy += (side !== 0 ? side : 0) * 3.8;
      }
      if (pis.includes('sit_narrower')) {
        dy -= side * 4.6;
      }
      if (pis.includes('target_near_post')) {
        x += 2.2;
        dy -= 2.2;
      }
      if (pis.includes('target_centre')) {
        x += 2.2;
        dy *= 0.55;
      }
      if (pis.includes('target_far_post')) {
        x += 2.2;
        dy += 2.4;
      }

      // 3×3 Ball Zone shifts (IP)
      if (ballZone) {
        const isBallSide = side !== 0 && side === laneSign;
        const isWeakSide = side !== 0 && laneSign !== 0 && side === -laneSign;

        if (third === 'def') {
          // Build-up third
          if (slot.group === 'DC' || slot.group === 'D_LR') {
            x -= 4.5;
            if (slot.group === 'DC' && side !== 0) dy += side * 2.0;
          } else if (slot.group === 'DM' || slot.group === 'MC' || slot.group === 'WB_LR') {
            x -= 9.5;
          } else {
            x -= 11.5;
          }
          if (role.id === 'hb') {
            x -= 2.5;
            note = 'Drops between CBs';
          } else if (role.id === 'ifb') {
            note = 'Tucks inside as third CB';
          } else if (role.id === 'iwb' || role.id === 'pwb') {
            note = 'Inverts into midfield';
          } else {
            note = 'Drops to support build-up';
          }
        } else if (third === 'att') {
          // Final third
          if (slot.group === 'DC' || role.id === 'ifb' || role.id === 'hb') {
            x += 12;
            note = role.id === 'hb' ? 'Anchors rest-defence behind play' : 'Steps up to lock rest-defence';
          } else if (slot.group === 'DM' || role.id === 'iwb' || role.id === 'pwb') {
            x += 11;
            note =
              role.id === 'iwb' || role.id === 'pwb'
                ? 'Inverts into midfield'
                : 'Screens counter-attack lanes';
          } else {
            x += 7.5 + prof.lateBox * 3.5 + prof.lineRun * 2.2;
            if ((role.id === 'wb_ip' || role.id === 'awb' || role.id === 'ocb') && (isBallSide || laneSign === 0)) {
              x += 4.0;
              note = 'Overlaps ball-side flank';
            } else if (role.id === 'if_ip' || role.id === 'iw_ip') {
              dy -= side * 2.5;
              note = isWeakSide ? 'Attacks far-post corridor' : 'Cuts inside into half-space';
            } else if (role.id === 'chm' || role.id === 'ss' || role.id === 'b2b') {
              note = 'Crashes box on second wave';
            } else if (role.id === 'f9' || role.id === 'dlf') {
              x -= 4.5;
              note = 'Drops into pocket to link';
            } else if (role.id === 'w_ip' || role.id === 'wf_ip') {
              note = isWeakSide ? 'Holds far-post width' : 'Stretches ball-side touchline';
            } else {
              note = 'Advances to attack final third';
            }
          }
        } else {
          // Middle third
          if (role.id === 'hb') note = 'Drops between CBs';
          else if (role.id === 'ifb') note = 'Tucks inside as third CB';
          else if (role.id === 'iwb' || role.id === 'pwb') note = 'Inverts into midfield';
          else if ((role.id === 'wb_ip' || role.id === 'awb') && isBallSide) {
            x += 4.0;
            note = 'Overlaps ball-side flank';
          } else if (role.id === 'fr' || role.id === 'ap' || role.id === 'mp') {
            note = 'Drifts ball-side to overload';
          }
        }

        // Lateral ball-side shift in IP
        if (laneSign !== 0) {
          const roamBoost = 1 + prof.roam * 0.55;
          const shift = isBallSide
            ? laneSign * 2.4 * roamBoost
            : isWeakSide
              ? laneSign * 5.2 * roamBoost
              : laneSign * 4.5 * roamBoost;
          dy += shift;
          if (!note) {
            note = isBallSide ? 'Supports ball-side flank' : 'Shifts ball-side to connect';
          }
        }
      }

      // Smooth monotonic width scaling (guaranteed strictly inside y ∈ [5, 63])
      const widthScale = 1 + widthTi * 0.115 + ment.shifts.width * 0.06;
      const scaledDy = softSym(dy * widthScale);
      const finalPt = clampPlayable({ x: softX(x), y: PITCH_CY + scaledDy });
      return { slot, role, x: finalPt.x, y: finalPt.y, note };
    }

    // ── Out of Possession (OOP) ───────────────────────────────────────────────
    const t = (slot.x - minOutX) / Math.max(1, maxOutX - minOutX);
    x = defLineX + t * (loeX - defLineX);

    x += prof.depth * 5.5;
    x -= prof.dropDeep * 5.5;
    x += trigger * 1.4;
    if (defTrans === 2) x += 2.2;
    else if (defTrans === 0) x -= 2.2;

    if (role.tags.includes('OUT')) {
      x = Math.max(x, loeX + 7);
    }
    if (role.id === 'ddm') {
      x = defLineX + 0.5;
      dy = 0;
    }
    if (hasDdm && slot.group === 'DC' && side !== 0) {
      dy += side * 2.5;
    }

    // OOP horizontal compactness & instructions
    let compactScale = 0.88;
    if (pressTrap === 0) {
      // Inside trap: wide players stay slightly wider to funnel inside
      if (slot.group === 'M_LR' || slot.group === 'AM_LR' || slot.group === 'D_LR') {
        dy += side * 2.4;
      }
    } else if (pressTrap === 2) {
      // Outside trap: central players squeeze middle, full-backs ready outside
      if (slot.group === 'MC' || slot.group === 'DM' || slot.group === 'AMC') {
        dy *= 0.85;
      } else if (slot.group === 'D_LR' || slot.group === 'WB_LR') {
        dy += side * 1.8;
      }
    }

    if (crossEng === 0 && (slot.group === 'D_LR' || slot.group === 'WB_LR')) {
      dy -= side * 3.2;
    } else if (crossEng === 2 && (slot.group === 'D_LR' || slot.group === 'WB_LR')) {
      dy += side * 2.8;
    }

    if (side !== 0) {
      dy += side * prof.width * 2.0;
      dy -= side * prof.invert * 5.5;
    }

    if (pis.includes('press_more')) x += 3.0;
    if (pis.includes('press_less')) x -= 3.0;

    // 3×3 Ball Zone shifts (OOP)
    if (ballZone) {
      const isOutlet = role.tags.includes('OUT');
      const isPresser = role.tags.includes('HP') || prof.press >= 0.8;
      const isWideCover = role.tags.includes('CW');
      const isTracker = role.tags.includes('TRK');

      if (third === 'def') {
        if (isOutlet) {
          x = Math.max(54, loeX - 4);
          note = 'Stays high as counter outlet';
        } else {
          x -= 11.5;
          compactScale = 0.78;
          if (isTracker) {
            x -= 3.0;
            note = 'Tracks runner into defensive third';
          } else if (role.id === 'ddm') {
            note = 'Drops into back line';
          } else {
            note = 'Drops into compact low block';
          }
        }
      } else if (third === 'att') {
        x += 10.5 + (isPresser ? 3.5 : 0);
        if (isPresser) {
          note = 'Jumps to press ball-side';
        } else if (isOutlet) {
          note = 'Stays high as counter outlet';
        } else {
          note = 'Pushes up to squeeze press';
        }
      } else if (isOutlet) {
        note = 'Stays high as counter outlet';
      }

      if (laneSign !== 0) {
        const slide = isWideCover ? 8.5 : isOutlet ? 3.5 : 7.0;
        dy = dy * compactScale + laneSign * slide;
        if (!note) {
          note = isWideCover
            ? 'Slides wide to cover flank'
            : isPresser
              ? 'Jumps to press ball-side'
              : 'Shifts ball-side to compress block';
        }
      } else {
        dy *= compactScale;
      }
    } else {
      dy *= compactScale;
    }

    const finalPt = clampPlayable({ x: softX(x), y: PITCH_CY + softSym(dy) });
    return { slot, role, x: finalPt.x, y: finalPt.y, note };
  });
}

// ── 1. Full Tactic Pitch Diagram (Tactics Board + 3×3 Visualiser) ─────────────

export function buildTacticPitchDiagram(
  config: TacticConfig,
  phase: 'ip' | 'oop',
  ballZone?: BallZone,
): PitchDiagram {
  const form = getFormation(phase === 'ip' ? config.ipFormation : config.oopFormation);
  const ment = getMentality(config);
  const resolved = resolveTacticPositions(config, phase, ballZone);
  const baseResolved = ballZone
    ? resolveTacticPositions(config, phase, { third: 'mid', lane: 'centre' })
    : null;

  const baseByCode = new Map(baseResolved?.map((r) => [r.slot.code, r]) ?? []);
  const arrows: PitchArrow[] = [];
  const players: PitchPlayerToken[] = [];

  for (const item of resolved) {
    const base = baseByCode.get(item.slot.code);
    const moved = base ? dist(base, item) : 0;
    const shifted = Boolean(ballZone && base && moved >= 3);

    const token: PitchPlayerToken = {
      id: `home-${item.slot.code}`,
      slot: item.slot.code,
      label: item.role.abbr,
      sublabel: item.slot.code,
      x: item.x,
      y: item.y,
      team: 'home',
      roleId: item.role.id,
      ...(shifted && base ? { ghostX: base.x, ghostY: base.y } : {}),
      ...(shifted && item.note ? { note: item.note } : {}),
    };
    players.push(token);

    if (shifted && base) {
      const kind: PitchArrow['kind'] =
        phase === 'oop'
          ? item.role.tags.includes('HP') || item.role.profile.press >= 0.8
            ? 'press'
            : 'move'
          : item.role.profile.lineRun >= 0.6 ||
              item.role.profile.overlap >= 0.7 ||
              item.role.profile.lateBox >= 0.7
            ? 'run'
            : 'move';
      arrows.push({
        from: { x: base.x, y: base.y },
        to: { x: item.x, y: item.y },
        kind,
      });
    }
  }

  const lines: PitchLine[] = [];
  if (phase === 'oop') {
    const thirdShift = !ballZone ? 0 : ballZone.third === 'def' ? -10 : ballZone.third === 'att' ? 9 : 0;
    lines.push({
      x: clamp(computeDefensiveLineX(config) + thirdShift, 14, 58),
      label: 'Def Line',
      kind: 'def-line',
    });
    lines.push({
      x: clamp(computeLoeX(config) + thirdShift, 30, 88),
      label: 'Line of Engagement',
      kind: 'loe',
    });
  }

  const ball = ballZone ? BALL_ZONE_COORDS[ballZone.third][ballZone.lane] : undefined;
  const thirdLabel =
    ballZone?.third === 'def'
      ? 'Defensive Third'
      : ballZone?.third === 'att'
        ? 'Final Third'
        : 'Middle Third';
  const laneLabel =
    ballZone?.lane === 'left'
      ? 'Left'
      : ballZone?.lane === 'right'
        ? 'Right'
        : 'Centre';

  const highlights: PitchHighlight[] | undefined = ball
    ? [
        {
          x: ball.x,
          y: ball.y,
          r: 7,
          kind: phase === 'oop' ? 'press' : 'zone',
          label: `${thirdLabel} · ${laneLabel}`,
        },
      ]
    : undefined;

  return sanitizeDiagram({
    title: `${form.name} (${phase === 'ip' ? 'In Possession' : 'Out of Possession'})`,
    subtitle: ballZone
      ? `${ment.name} · Ball in ${thirdLabel} (${laneLabel})`
      : `${ment.name} · ${config.name ?? form.shortName}`,
    phase,
    players,
    arrows,
    ...(lines.length > 0 ? { lines } : {}),
    ...(ball ? { ball } : {}),
    ...(highlights ? { highlights } : {}),
  });
}

// ── 2. Role Tactical Diagram (all 77 FM26/FM27 roles) ─────────────────────────

function pickRoleContext(role: RoleDef): { formationId: string; slotCode: string } {
  if (role.wideCB) {
    return { formationId: '3-4-2-1', slotCode: 'DCR' };
  }
  const g = role.groups;
  if (g.includes('GK')) return { formationId: '4-3-3 DM Wide', slotCode: 'GK' };
  if (g.includes('DC')) return { formationId: '4-3-3 DM Wide', slotCode: 'DCR' };
  if (g.includes('D_LR')) return { formationId: '4-3-3 DM Wide', slotCode: 'DR' };
  if (g.includes('WB_LR')) return { formationId: '3-5-2', slotCode: 'WBR' };
  if (g.includes('DM')) return { formationId: '4-3-3 DM Wide', slotCode: 'DM' };
  if (g.includes('MC')) return { formationId: '4-3-3 DM Wide', slotCode: 'MCR' };
  if (g.includes('M_LR')) return { formationId: '4-4-2', slotCode: 'MR' };
  if (g.includes('AMC')) return { formationId: '4-2-3-1 DM Wide', slotCode: 'AMC' };
  if (g.includes('AM_LR')) return { formationId: '4-3-3 DM Wide', slotCode: 'AMR' };
  return { formationId: '4-3-3 DM Wide', slotCode: 'ST' };
}

export function buildRoleDiagram(roleId: string): PitchDiagram {
  const role = ROLE_BY_ID[roleId] ?? ROLES[0];
  const { formationId, slotCode } = pickRoleContext(role);
  const form = getFormation(formationId);
  const phase = role.phase;

  const players: PitchPlayerToken[] = form.slots.map((s) => {
    const isTarget = s.code === slotCode;
    return {
      id: `home-${s.code}`,
      slot: s.code,
      label: isTarget ? role.abbr : s.code,
      sublabel: isTarget ? s.code : undefined,
      x: s.x,
      y: s.y,
      team: 'home',
      highlight: isTarget,
      roleId: isTarget ? role.id : phase === 'ip' ? s.defaultIpRole : s.defaultOopRole,
      ...(isTarget ? { note: role.moveNote ?? role.summary } : {}),
    };
  });

  const target = players.find((p) => p.slot === slotCode)!;
  const arrows: PitchArrow[] = [];
  const highlights: PitchHighlight[] = [];
  const lines: PitchLine[] = [];
  let ball: PitchPoint | undefined;

  const addAway = (id: string, label: string, x: number, y: number) => {
    players.push({ id, slot: label, label, x, y, team: 'away' });
  };

  // Signature tactical behaviour per role
  switch (role.id) {
    // ── GK ──
    case 'gk_ip':
      ball = { x: target.x + 2, y: target.y };
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 22, y: 24 }, kind: 'pass', label: 'Safe pass' },
        { from: { x: target.x, y: target.y }, to: { x: 26, y: 56 }, kind: 'pass' },
      );
      break;
    case 'bpgk':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 14;
      ball = { x: 15.5, y: 34 };
      addAway('away-st', 'ST', 26, 34);
      arrows.push(
        { from: { x: 8, y: 34 }, to: { x: 14, y: 34 }, kind: 'move', label: 'Steps off line' },
        { from: { x: 15, y: 34 }, to: { x: 39, y: 34 }, kind: 'pass', label: 'Breaks press' },
        { from: { x: 15, y: 34 }, to: { x: 26, y: 12 }, kind: 'pass' },
      );
      break;
    case 'nngk':
      ball = { x: target.x + 1.5, y: target.y };
      arrows.push({
        from: { x: target.x + 1, y: target.y },
        to: { x: 76, y: 34 },
        kind: 'pass',
        label: 'Direct clearance',
        dashed: true,
      });
      highlights.push({ x: 76, y: 34, r: 7, kind: 'target', label: 'Aerial target' });
      break;
    case 'gk_oop':
      highlights.push({ x: 11, y: 34, r: 6, kind: 'zone', label: 'Balanced box' });
      arrows.push({ from: { x: 8, y: 34 }, to: { x: 13, y: 34 }, kind: 'move', label: 'Claims / holds' });
      break;
    case 'lhk':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 5.5;
      highlights.push({ x: 5.5, y: 34, r: 5, kind: 'zone', label: 'Goal line' });
      arrows.push({ from: { x: 8, y: 34 }, to: { x: 5.5, y: 34 }, kind: 'move', label: 'Holds line' });
      break;
    case 'swk':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 18;
      lines.push({ x: 40, label: 'High Def Line', kind: 'def-line' });
      addAway('away-st', 'ST', 42, 30);
      ball = { x: 27, y: 32 };
      arrows.push({ from: { x: 8, y: 34 }, to: { x: 25, y: 32 }, kind: 'run', label: 'Sweeps in behind' });
      highlights.push({ x: 24, y: 34, r: 8, kind: 'press', label: 'Sweep zone' });
      break;

    // ── DC ──
    case 'cb_ip':
      ball = { x: target.x + 2, y: target.y };
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 39, y: 34 }, kind: 'pass', label: 'Simple recycle' },
        { from: { x: target.x, y: target.y }, to: { x: 26, y: 56 }, kind: 'pass' },
      );
      break;
    case 'bpcb':
      ball = { x: target.x + 2, y: target.y };
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 53, y: 45 }, kind: 'pass', label: 'Line-breaking pass' },
        { from: { x: target.x, y: target.y }, to: { x: 73, y: 12 }, kind: 'pass', label: 'Diagonal switch', dashed: true },
      );
      break;
    case 'nncb':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 19;
      ball = { x: 20.5, y: target.y };
      arrows.push({
        from: { x: 19, y: target.y },
        to: { x: 72, y: 38 },
        kind: 'pass',
        label: 'Early clearance',
        dashed: true,
      });
      break;
    case 'acb':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 38;
      target.y = 39;
      arrows.push(
        { from: { x: 22, y: 44 }, to: { x: 38, y: 39 }, kind: 'run', label: 'Steps into DM' },
        { from: { x: 38, y: 39 }, to: { x: 64, y: 48 }, kind: 'pass', label: 'Progressive pass' },
      );
      break;
    case 'ocb':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 58;
      target.y = 60;
      arrows.push(
        { from: { x: 22, y: 48 }, to: { x: 58, y: 60 }, kind: 'run', label: 'Wide overlap' },
        { from: { x: 58, y: 60 }, to: { x: 88, y: 38 }, kind: 'pass', label: 'Cross' },
      );
      break;
    case 'cb_oop':
      lines.push({ x: 32, label: 'Def Line', kind: 'def-line' });
      highlights.push({ x: target.x, y: target.y, r: 6.5, kind: 'zone', label: 'Line discipline' });
      arrows.push({ from: { x: target.x, y: target.y }, to: { x: target.x + 5, y: target.y - 2 }, kind: 'move', label: 'Balanced step' });
      break;
    case 'ccb':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 17;
      lines.push({ x: 23, label: 'Def Line', kind: 'def-line' });
      addAway('away-st', 'ST', 27, 36);
      arrows.push({ from: { x: 22, y: 44 }, to: { x: 17, y: 40 }, kind: 'move', label: 'Drops to cover depth' });
      highlights.push({ x: 17, y: 40, r: 7, kind: 'zone', label: 'Cover depth' });
      break;
    case 'scb':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 33;
      addAway('away-am', 'AMC', 36, 40);
      ball = { x: 35, y: 40 };
      arrows.push({ from: { x: 22, y: 44 }, to: { x: 33, y: 41 }, kind: 'press', label: 'Steps into Zone 14' });
      highlights.push({ x: 35, y: 40, r: 6, kind: 'press', label: 'Duel trigger' });
      break;
    case 'cwcb':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 18;
      target.y = 54;
      arrows.push({ from: { x: 22, y: 48 }, to: { x: 18, y: 54 }, kind: 'move', label: 'Covers wide channel' });
      highlights.push({ x: 20, y: 55, r: 7, kind: 'zone', label: 'Flank cover' });
      break;
    case 'swcb':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 36;
      target.y = 52;
      addAway('away-am', 'AML', 39, 51);
      arrows.push({ from: { x: 22, y: 48 }, to: { x: 36, y: 52 }, kind: 'press', label: 'Squeezes half-space' });
      highlights.push({ x: 38, y: 51, r: 6, kind: 'press' });
      break;

    // ── D_LR & WB_LR ──
    case 'fb_ip':
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 46, y: 58 }, kind: 'move', label: 'Measured support' },
        { from: { x: 46, y: 58 }, to: { x: 73, y: 56 }, kind: 'pass' },
      );
      break;
    case 'ifb': {
      const dclMate = players.find((p) => p.slot === 'DCL');
      const dcrMate = players.find((p) => p.slot === 'DCR');
      if (dclMate) dclMate.y = 20;
      if (dcrMate) dcrMate.y = 34;
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 23;
      target.y = 48;
      arrows.push({ from: { x: 26, y: 56 }, to: { x: 23, y: 48 }, kind: 'move', label: 'Forms back 3' });
      highlights.push({ x: 22, y: 34, r: 14, kind: 'zone', label: '3-man rest defence' });
      break;
    }
    case 'wb_ip':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 64;
      target.y = 60;
      arrows.push(
        { from: { x: 26, y: 56 }, to: { x: 64, y: 60 }, kind: 'run', label: 'High overlap' },
        { from: { x: 64, y: 60 }, to: { x: 88, y: 36 }, kind: 'pass', label: 'Cross into box' },
      );
      break;
    case 'iwb':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 42;
      target.y = 42;
      arrows.push({ from: { x: 26, y: 56 }, to: { x: 42, y: 42 }, kind: 'move', label: 'Inverts into DM' });
      highlights.push({ x: 40, y: 38, r: 8, kind: 'zone', label: 'Double pivot' });
      break;
    case 'pwb':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 46;
      target.y = 42;
      ball = { x: 47.5, y: 42 };
      arrows.push(
        { from: { x: 26, y: 56 }, to: { x: 46, y: 42 }, kind: 'move', label: 'Inverts to dictate' },
        { from: { x: 47, y: 42 }, to: { x: 76, y: 18 }, kind: 'pass', label: 'Diagonal switch' },
        { from: { x: 47, y: 42 }, to: { x: 84, y: 36 }, kind: 'pass', label: 'Through-ball' },
      );
      break;
    case 'awb':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 84;
      target.y = 61;
      arrows.push(
        { from: { x: 45, y: 57 }, to: { x: 84, y: 61 }, kind: 'run', label: 'Surges to byline' },
        { from: { x: 84, y: 61 }, to: { x: 92, y: 36 }, kind: 'pass', label: 'Cut-back' },
      );
      break;
    case 'fb_oop':
      addAway('away-w', 'AML', 34, 57);
      arrows.push({ from: { x: target.x, y: target.y }, to: { x: 31, y: 56 }, kind: 'move', label: 'Engages wide' });
      break;
    case 'hfb':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 22;
      target.y = 50;
      arrows.push({ from: { x: 26, y: 56 }, to: { x: 22, y: 50 }, kind: 'move', label: 'Tucks beside CB' });
      highlights.push({ x: 22, y: 48, r: 6.5, kind: 'zone', label: 'Back-post shield' });
      break;
    case 'pfb':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 46;
      target.y = 58;
      addAway('away-w', 'AML', 49, 58);
      ball = { x: 49, y: 58 };
      arrows.push({ from: { x: 26, y: 56 }, to: { x: 46, y: 58 }, kind: 'press', label: 'Locks outside trap' });
      highlights.push({ x: 49, y: 58, r: 6.5, kind: 'press', label: 'Touchline trap' });
      break;
    case 'wb_oop':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 29;
      target.y = 57;
      arrows.push({ from: { x: 45, y: 57 }, to: { x: 29, y: 57 }, kind: 'move', label: 'Tracks into back 5' });
      break;
    case 'hwb':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 23;
      target.y = 55;
      arrows.push({ from: { x: 45, y: 57 }, to: { x: 23, y: 55 }, kind: 'move', label: 'Drops early to back 5' });
      highlights.push({ x: 23, y: 55, r: 6.5, kind: 'zone' });
      break;
    case 'prwb':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 64;
      target.y = 58;
      addAway('away-fb', 'DL', 67, 58);
      ball = { x: 67, y: 58 };
      arrows.push({ from: { x: 45, y: 57 }, to: { x: 64, y: 58 }, kind: 'press', label: 'Presses opposing FB' });
      highlights.push({ x: 67, y: 58, r: 6.5, kind: 'press' });
      break;

    // ── DM ──
    case 'dm_ip':
      ball = { x: target.x + 1.5, y: target.y };
      highlights.push({ x: target.x, y: target.y, r: 7, kind: 'zone', label: 'Anchor zone' });
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 53, y: 23 }, kind: 'pass', label: 'Circulates' },
        { from: { x: target.x, y: target.y }, to: { x: 53, y: 45 }, kind: 'pass' },
      );
      break;
    case 'dlp':
      ball = { x: target.x + 1.5, y: target.y };
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 73, y: 12 }, kind: 'pass', label: 'Diagonal switch' },
        { from: { x: target.x, y: target.y }, to: { x: 78, y: 36 }, kind: 'pass', label: 'Line-breaker' },
      );
      highlights.push({ x: target.x, y: target.y, r: 6.5, kind: 'zone', label: 'Dictates tempo' });
      break;
    case 'hb': {
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 22;
      target.y = 34;
      const dcl = players.find((p) => p.slot === 'DCL');
      const dcr = players.find((p) => p.slot === 'DCR');
      if (dcl) {
        dcl.ghostX = dcl.x;
        dcl.ghostY = dcl.y;
        dcl.y = 19;
      }
      if (dcr) {
        dcr.ghostX = dcr.x;
        dcr.ghostY = dcr.y;
        dcr.y = 49;
      }
      arrows.push(
        { from: { x: 39, y: 34 }, to: { x: 22, y: 34 }, kind: 'move', label: 'Drops between CBs' },
        { from: { x: 22, y: 24 }, to: { x: 22, y: 19 }, kind: 'compare', dashed: true },
        { from: { x: 22, y: 44 }, to: { x: 22, y: 49 }, kind: 'compare', dashed: true },
      );
      break;
    }
    case 'b2b':
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 78, y: 36 }, kind: 'run', label: 'Late box surge' },
        { from: { x: target.x, y: target.y }, to: { x: 28, y: 34 }, kind: 'move', dashed: true, label: 'Recovers deep' },
      );
      highlights.push({ x: 82, y: 36, r: 6.5, kind: 'target', label: '2nd wave' });
      break;
    case 'b2bp':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 62;
      target.y = 40;
      arrows.push(
        { from: { x: 39, y: 34 }, to: { x: 62, y: 40 }, kind: 'run', label: 'Advances to half-space' },
        { from: { x: 62, y: 40 }, to: { x: 86, y: 28 }, kind: 'pass', label: 'Killer pass' },
      );
      break;
    case 'dm_oop':
      highlights.push({ x: target.x, y: target.y, r: 7.5, kind: 'zone', label: 'Zone 14 shield' });
      arrows.push({ from: { x: target.x, y: target.y }, to: { x: target.x + 6, y: target.y }, kind: 'press', label: 'Balanced challenge' });
      break;
    case 'ddm':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 22;
      target.y = 34;
      arrows.push({ from: { x: 39, y: 34 }, to: { x: 22, y: 34 }, kind: 'move', label: 'Forms back 5' });
      highlights.push({ x: 22, y: 34, r: 9, kind: 'zone', label: 'Box protection' });
      break;
    case 'sdm':
      addAway('away-am', 'AMC', 44, 34);
      highlights.push({ x: 38, y: 34, r: 8, kind: 'zone', label: 'Screens Zone 14' });
      arrows.push(
        { from: { x: 39, y: 34 }, to: { x: 39, y: 27 }, kind: 'move', dashed: true },
        { from: { x: 39, y: 34 }, to: { x: 39, y: 41 }, kind: 'move', dashed: true },
      );
      break;
    case 'wcdm':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.y = 50;
      arrows.push({ from: { x: 39, y: 34 }, to: { x: 39, y: 50 }, kind: 'move', label: 'Covers wide channel' });
      highlights.push({ x: 39, y: 52, r: 7, kind: 'zone', label: 'Flank cover' });
      break;
    case 'pdm':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 52;
      addAway('away-cm', 'MC', 55, 34);
      ball = { x: 55, y: 34 };
      arrows.push({ from: { x: 39, y: 34 }, to: { x: 52, y: 34 }, kind: 'press', label: 'Snaps into duels' });
      highlights.push({ x: 54, y: 34, r: 6.5, kind: 'press' });
      break;

    // ── MC ──
    case 'cm_ip':
      ball = { x: target.x + 1.5, y: target.y };
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 64, y: 44 }, kind: 'move', label: 'Links play' },
        { from: { x: target.x, y: target.y }, to: { x: 73, y: 56 }, kind: 'pass' },
      );
      break;
    case 'mp':
      ball = { x: target.x + 1.5, y: target.y };
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 82, y: 34 }, kind: 'pass', label: 'Through-ball' },
        { from: { x: target.x, y: target.y }, to: { x: 73, y: 12 }, kind: 'pass', label: 'Switch' },
      );
      highlights.push({ x: target.x, y: target.y, r: 7.5, kind: 'zone', label: 'Playmaking hub' });
      break;
    case 'wcm':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 64;
      target.y = 58;
      arrows.push(
        { from: { x: 53, y: 45 }, to: { x: 64, y: 58 }, kind: 'run', label: 'Drifts wide' },
        { from: { x: 64, y: 58 }, to: { x: 89, y: 36 }, kind: 'pass', label: 'Angled cross' },
      );
      break;
    case 'chm':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 76;
      target.y = 50;
      addAway('away-cb', 'CB', 82, 41);
      addAway('away-fb', 'DL', 82, 56);
      arrows.push({ from: { x: 53, y: 45 }, to: { x: 84, y: 50 }, kind: 'run', label: 'Bursts into channel' });
      highlights.push({ x: 84, y: 50, r: 6, kind: 'target', label: 'CB–FB gap' });
      break;
    case 'ap':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 68;
      target.y = 38;
      ball = { x: 69.5, y: 38 };
      arrows.push(
        { from: { x: 53, y: 45 }, to: { x: 68, y: 38 }, kind: 'move', label: 'Finds pocket' },
        { from: { x: 69, y: 38 }, to: { x: 91, y: 30 }, kind: 'pass', label: 'Killer pass' },
      );
      break;
    case 'am_ip':
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 86, y: 36 }, kind: 'run', label: 'Crashes box' },
        { from: { x: 74, y: 38 }, to: { x: 96, y: 34 }, kind: 'pass', dashed: true, label: 'Long-shot threat' },
      );
      highlights.push({ x: 86, y: 36, r: 6.5, kind: 'target' });
      break;
    case 'cm_oop':
      highlights.push({ x: target.x, y: target.y, r: 7, kind: 'zone', label: 'Block alignment' });
      arrows.push({ from: { x: target.x, y: target.y }, to: { x: target.x + 6, y: target.y - 3 }, kind: 'move', label: 'Shifts with ball' });
      break;
    case 'pcm':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 68;
      addAway('away-dm', 'DM', 71, 43);
      ball = { x: 71, y: 43 };
      arrows.push({ from: { x: 53, y: 45 }, to: { x: 68, y: 44 }, kind: 'press', label: 'Joins first press' });
      highlights.push({ x: 71, y: 43, r: 6.5, kind: 'press' });
      break;
    case 'scm':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 46;
      highlights.push({ x: 46, y: 42, r: 7.5, kind: 'zone', label: 'Screens centre' });
      arrows.push({ from: { x: 53, y: 45 }, to: { x: 46, y: 42 }, kind: 'move', label: 'Holds midfield shape' });
      break;
    case 'wccm':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 46;
      target.y = 56;
      arrows.push({ from: { x: 53, y: 45 }, to: { x: 46, y: 56 }, kind: 'move', label: 'Covers flank' });
      highlights.push({ x: 46, y: 56, r: 7, kind: 'zone', label: 'Wide cover' });
      break;

    // ── M_LR & AM_LR ──
    case 'wm_ip':
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 72, y: 58 }, kind: 'move', label: 'Holds wide link' },
        { from: { x: 72, y: 58 }, to: { x: 90, y: 36 }, kind: 'pass', label: 'Measured cross' },
      );
      break;
    case 'w_ip':
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 94, y: 60 }, kind: 'run', label: 'Drives to byline' },
        { from: { x: 94, y: 60 }, to: { x: 93, y: 34 }, kind: 'pass', label: 'Byline cross' },
      );
      break;
    case 'iw_ip':
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 78, y: 44 }, kind: 'run', label: 'Cuts into half-space' },
        { from: { x: 78, y: 44 }, to: { x: 93, y: 30 }, kind: 'pass', label: 'Creates chance' },
      );
      break;
    case 'pw':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 70;
      target.y = 44;
      ball = { x: 71, y: 44 };
      arrows.push(
        { from: { x: 73, y: 56 }, to: { x: 70, y: 44 }, kind: 'move', label: 'Drifts inside' },
        { from: { x: 70, y: 44 }, to: { x: 91, y: 26 }, kind: 'pass', label: 'Through-ball' },
        { from: { x: 70, y: 44 }, to: { x: 78, y: 12 }, kind: 'pass', label: 'Switch', dashed: true },
      );
      break;
    case 'if_ip':
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 91, y: 41 }, kind: 'run', label: 'Cuts inside to score' },
      );
      highlights.push({ x: 92, y: 40, r: 6, kind: 'target', label: 'Finishing zone' });
      break;
    case 'wf_ip':
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 84, y: 58 }, kind: 'move', label: 'Holds width' },
        { from: { x: 84, y: 58 }, to: { x: 94, y: 42 }, kind: 'run', label: 'Attacks far post' },
      );
      highlights.push({ x: 94, y: 42, r: 6, kind: 'target', label: 'Far post' });
      break;
    case 'wm_oop':
    case 'w_oop':
      arrows.push({ from: { x: target.x, y: target.y }, to: { x: target.x - 10, y: target.y }, kind: 'move', label: 'Drops into block' });
      break;
    case 'twm':
    case 'tw':
      addAway('away-fb', 'DL', 34, 58);
      arrows.push({ from: { x: target.x, y: target.y }, to: { x: 30, y: 57 }, kind: 'run', label: 'Tracks FB deep' });
      highlights.push({ x: 30, y: 57, r: 7, kind: 'zone', label: 'Flank double-up' });
      break;
    case 'wowm':
    case 'wow':
      lines.push({ x: 54, label: 'Mid Block', kind: 'loe' });
      arrows.push({ from: { x: target.x, y: target.y }, to: { x: 88, y: 59 }, kind: 'run', label: 'High wide outlet' });
      highlights.push({ x: 86, y: 59, r: 6.5, kind: 'target', label: 'Counter space' });
      break;
    case 'iow':
      lines.push({ x: 54, label: 'Mid Block', kind: 'loe' });
      arrows.push({ from: { x: target.x, y: target.y }, to: { x: 90, y: 44 }, kind: 'run', label: 'Half-space counter' });
      highlights.push({ x: 89, y: 44, r: 6.5, kind: 'target', label: 'Channel break' });
      break;

    // ── AMC ──
    case 'fr':
      ball = { x: target.x + 1.5, y: target.y };
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 74, y: 20 }, kind: 'move', dashed: true, label: 'Roams ball-side' },
        { from: { x: target.x, y: target.y }, to: { x: 74, y: 48 }, kind: 'move', dashed: true },
        { from: { x: target.x, y: target.y }, to: { x: 92, y: 34 }, kind: 'pass', label: 'Disguised pass' },
      );
      break;
    case 'ss':
      arrows.push({ from: { x: target.x, y: target.y }, to: { x: 93, y: 34 }, kind: 'run', label: 'Bursts past striker' });
      highlights.push({ x: 93, y: 34, r: 6.5, kind: 'target', label: 'Penalty spot' });
      break;
    case 'am_oop':
      addAway('away-dm', 'DM', 64, 34);
      arrows.push({ from: { x: target.x, y: target.y }, to: { x: 64, y: 34 }, kind: 'press', label: 'Shadows pivot' });
      break;
    case 'coam':
      arrows.push({ from: { x: target.x, y: target.y }, to: { x: 84, y: 34 }, kind: 'run', label: 'Central counter link' });
      highlights.push({ x: 74, y: 34, r: 7, kind: 'target' });
      break;
    case 'soam':
      arrows.push({ from: { x: target.x, y: target.y }, to: { x: 86, y: 18 }, kind: 'run', label: 'Splits into channel' });
      highlights.push({ x: 86, y: 18, r: 6.5, kind: 'target' });
      break;
    case 'tam':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 52;
      arrows.push({ from: { x: 68, y: 34 }, to: { x: 52, y: 34 }, kind: 'run', label: 'Drops into midfield' });
      highlights.push({ x: 52, y: 34, r: 7, kind: 'zone', label: 'Extra midfielder' });
      break;

    // ── ST ──
    case 'cf_ip':
      addAway('away-cb1', 'CB', 88, 28);
      addAway('away-cb2', 'CB', 88, 40);
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 95, y: 34 }, kind: 'run', label: 'Attacks box' },
        { from: { x: target.x, y: target.y }, to: { x: 74, y: 34 }, kind: 'move', dashed: true, label: 'Links play' },
      );
      break;
    case 'chf':
      addAway('away-cb', 'CB', 88, 39);
      addAway('away-fb', 'DL', 88, 55);
      arrows.push({ from: { x: target.x, y: target.y }, to: { x: 94, y: 48 }, kind: 'run', label: 'Darts into channel' });
      highlights.push({ x: 93, y: 48, r: 6, kind: 'target', label: 'Wide channel' });
      break;
    case 'dlf':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 73;
      arrows.push(
        { from: { x: 85, y: 34 }, to: { x: 73, y: 34 }, kind: 'move', label: 'Drops to hold up' },
        { from: { x: 73, y: 34 }, to: { x: 91, y: 18 }, kind: 'pass', label: 'Releases runner' },
      );
      break;
    case 'f9':
      target.ghostX = target.x;
      target.ghostY = target.y;
      target.x = 67;
      arrows.push(
        { from: { x: 85, y: 34 }, to: { x: 67, y: 34 }, kind: 'move', label: 'Drops into midfield' },
        { from: { x: 67, y: 34 }, to: { x: 91, y: 20 }, kind: 'pass', label: 'Slips IF in behind' },
        { from: { x: 67, y: 34 }, to: { x: 91, y: 48 }, kind: 'pass' },
      );
      break;
    case 'poa':
      lines.push({ x: 87, label: 'Opponent Def Line', kind: 'def-line' });
      addAway('away-cb1', 'CB', 87, 29);
      addAway('away-cb2', 'CB', 87, 39);
      target.x = 86.5;
      arrows.push({ from: { x: 86.5, y: 34 }, to: { x: 95.5, y: 33 }, kind: 'run', label: 'Darts off shoulder' });
      highlights.push({ x: 95, y: 33, r: 5.5, kind: 'target', label: '6-yard box' });
      break;
    case 'tf':
      ball = { x: 86, y: 34 };
      arrows.push(
        { from: { x: 40, y: 34 }, to: { x: 85, y: 34 }, kind: 'pass', dashed: true, label: 'Direct aerial ball' },
        { from: { x: 85, y: 34 }, to: { x: 77, y: 22 }, kind: 'pass', label: 'Knockdown' },
      );
      highlights.push({ x: 85, y: 34, r: 6.5, kind: 'target', label: 'Aerial focal point' });
      break;
    case 'cf_oop':
      addAway('away-cb1', 'CB', 88, 28);
      addAway('away-cb2', 'CB', 88, 40);
      arrows.push({ from: { x: target.x, y: target.y }, to: { x: 87, y: 34 }, kind: 'press', label: 'Screens & presses' });
      break;
    case 'cocf':
      lines.push({ x: 56, label: 'Mid Block', kind: 'loe' });
      arrows.push({ from: { x: target.x, y: target.y }, to: { x: 94, y: 34 }, kind: 'run', label: 'Stays high central' });
      highlights.push({ x: 88, y: 34, r: 6.5, kind: 'target', label: 'Direct release' });
      break;
    case 'socf':
      lines.push({ x: 56, label: 'Mid Block', kind: 'loe' });
      arrows.push({ from: { x: target.x, y: target.y }, to: { x: 93, y: 17 }, kind: 'run', label: 'Splits behind FB' });
      highlights.push({ x: 92, y: 17, r: 6.5, kind: 'target', label: 'Wide counter channel' });
      break;
    case 'tcf':
      addAway('away-cb', 'CB', 90, 29);
      addAway('away-dm', 'DM', 74, 34);
      arrows.push(
        { from: { x: target.x, y: target.y }, to: { x: 89, y: 30 }, kind: 'press', label: 'Leads press on CB' },
        { from: { x: target.x, y: target.y }, to: { x: 75, y: 34 }, kind: 'move', dashed: true, label: 'Drops onto DM' },
      );
      highlights.push({ x: 89, y: 30, r: 6, kind: 'press' });
      break;
    default:
      arrows.push({
        from: { x: target.x, y: target.y },
        to: { x: target.x + (role.profile.depth >= 0 ? 8 : -8), y: target.y },
        kind: phase === 'oop' ? 'press' : 'move',
        label: role.abbr,
      });
      break;
  }

  return sanitizeDiagram({
    title: `${role.name} (${role.abbr})`,
    subtitle: `${role.phase === 'ip' ? 'In Possession' : 'Out of Possession'} · ${form.shortName} context`,
    phase,
    players,
    arrows,
    ...(lines.length > 0 ? { lines } : {}),
    ...(highlights.length > 0 ? { highlights } : {}),
    ...(ball ? { ball } : {}),
  });
}

// ── 3. Team Instruction Diagram (all 27 TIs × every option) ───────────────────

export function buildTeamInstructionDiagram(tiKey: string, optionIndex: number): PitchDiagram {
  const ti = TI_BY_KEY[tiKey as TIKey] ?? TI_BY_KEY.width;
  const optIdx = clamp(Math.round(optionIndex), 0, ti.options.length - 1);
  const optLabel = ti.options[optIdx];
  const phase = ti.phase;

  const baseConfig = defaultTacticConfig();
  // Use 4-3-3 for IP and 4-1-4-1 for OOP cleanly
  baseConfig.ipFormation = '4-3-3 DM Wide';
  baseConfig.oopFormation = '4-1-4-1 DM Wide';
  baseConfig.mentality = 3;
  baseConfig.tis = { ...TI_DEFAULTS };

  const activeConfig: TacticConfig = {
    ...baseConfig,
    tis: { ...TI_DEFAULTS, [ti.key]: optIdx },
  };

  const basePos = resolveTacticPositions(baseConfig, phase);
  const activePos = resolveTacticPositions(activeConfig, phase);
  const baseMap = new Map(basePos.map((p) => [p.slot.code, p]));

  const players: PitchPlayerToken[] = activePos.map((p) => {
    const b = baseMap.get(p.slot.code)!;
    const moved = dist(b, p) >= 1.2;
    return {
      id: `home-${p.slot.code}`,
      slot: p.slot.code,
      label: p.slot.code,
      x: p.x,
      y: p.y,
      ...(moved ? { ghostX: b.x, ghostY: b.y } : {}),
      team: 'home',
      roleId: p.role.id,
    };
  });

  const bySlot = (code: string) => players.find((p) => p.slot === code);
  const arrows: PitchArrow[] = [];
  const lines: PitchLine[] = [];
  const highlights: PitchHighlight[] = [];
  let ball: PitchPoint | undefined;

  const addAway = (id: string, label: string, x: number, y: number) => {
    players.push({ id, slot: label, label, x, y, team: 'away' });
  };

  // Add subtle compare arrows for any player shifted significantly by the TI itself
  const addShiftArrows = (kind: PitchArrow['kind'] = 'compare') => {
    for (const p of players) {
      if (p.team === 'home' && p.ghostX !== undefined && p.ghostY !== undefined) {
        if (dist({ x: p.ghostX, y: p.ghostY }, p) >= 1.8) {
          arrows.push({
            from: { x: p.ghostX, y: p.ghostY },
            to: { x: p.x, y: p.y },
            kind,
            dashed: kind === 'compare',
          });
        }
      }
    }
  };

  const gk = bySlot('GK')!;
  const dl = bySlot('DL');
  const dr = bySlot('DR');
  const dcl = bySlot('DCL');
  const dcr = bySlot('DCR');
  const dm = bySlot('DM');
  const mcl = bySlot('MCL');
  const mcr = bySlot('MCR');
  const aml = bySlot('AML') ?? bySlot('ML');
  const amr = bySlot('AMR') ?? bySlot('MR');
  const st = bySlot('ST')!;

  switch (ti.key) {
    case 'buildup':
      ball = { x: gk.x + 2, y: gk.y };
      addShiftArrows('move');
      if (optIdx === 0) {
        addAway('away-st', 'ST', 28, 27);
        addAway('away-am', 'AM', 37, 46);
        if (dcl && dm) {
          arrows.push(
            { from: gk, to: dcl, kind: 'pass', label: 'Short build-up' },
            { from: dcl, to: dm, kind: 'pass', label: 'Break press' },
          );
        }
      } else if (optIdx === 2) {
        arrows.push({ from: gk, to: st, kind: 'pass', label: 'Launch over press', dashed: true });
        highlights.push({ x: st.x, y: st.y, r: 7.5, kind: 'target', label: '2nd-ball zone' });
      } else if (dcr && mcl) {
        arrows.push(
          { from: gk, to: dcr, kind: 'pass', label: 'Short option' },
          { from: gk, to: mcl, kind: 'pass', dashed: true, label: 'Direct option' },
        );
      }
      break;

    case 'goal_kicks':
      ball = { x: 6, y: 34 };
      if (optIdx === 0 && dcl && dcr) {
        dcl.ghostX = dcl.x;
        dcl.ghostY = dcl.y;
        dcl.x = 16;
        dcl.y = 18;
        dcr.ghostX = dcr.x;
        dcr.ghostY = dcr.y;
        dcr.x = 16;
        dcr.y = 50;
        arrows.push(
          { from: ball, to: dcl, kind: 'pass', label: 'Short restart' },
          { from: ball, to: dcr, kind: 'pass' },
        );
      } else if (optIdx === 2) {
        arrows.push({ from: ball, to: { x: 74, y: 34 }, kind: 'pass', label: 'Long goal kick', dashed: true });
        highlights.push({ x: 74, y: 34, r: 8, kind: 'target', label: 'Aerial duel' });
      } else if (dcr) {
        arrows.push(
          { from: ball, to: dcr, kind: 'pass', label: 'Short' },
          { from: ball, to: { x: 58, y: 34 }, kind: 'pass', dashed: true, label: 'Mid-range' },
        );
      }
      break;

    case 'gk_speed':
      ball = { x: gk.x + 2, y: gk.y };
      if (optIdx === 0 && dcl) {
        highlights.push({ x: gk.x + 2, y: gk.y, r: 6, kind: 'zone', label: 'Holds & resets' });
        arrows.push({ from: gk, to: dcl, kind: 'pass', dashed: true, label: 'Calm release' });
      } else if (optIdx === 2 && aml && amr) {
        arrows.push(
          { from: gk, to: aml, kind: 'pass', label: 'Fast counter launch' },
          { from: aml, to: { x: 92, y: 15 }, kind: 'run' },
          { from: amr, to: { x: 92, y: 53 }, kind: 'run' },
        );
      } else if (dm) {
        arrows.push({ from: gk, to: dm, kind: 'pass', label: 'Standard cadence' });
      }
      break;

    case 'gk_target': {
      ball = { x: gk.x + 2, y: gk.y };
      if (optIdx === 0 && dcl && dcr) {
        arrows.push({ from: gk, to: dcl, kind: 'pass', label: 'To CBs' }, { from: gk, to: dcr, kind: 'pass' });
        highlights.push({ x: dcl.x, y: dcl.y, r: 5, kind: 'target' }, { x: dcr.x, y: dcr.y, r: 5, kind: 'target' });
      } else if (optIdx === 1 && dl && dr) {
        arrows.push({ from: gk, to: dl, kind: 'pass', label: 'To Full-Backs' }, { from: gk, to: dr, kind: 'pass' });
        highlights.push({ x: dl.x, y: dl.y, r: 5, kind: 'target' }, { x: dr.x, y: dr.y, r: 5, kind: 'target' });
      } else if (optIdx === 2 && dm) {
        arrows.push({ from: gk, to: dm, kind: 'pass', label: 'To Playmaker' });
        highlights.push({ x: dm.x, y: dm.y, r: 6, kind: 'target' });
      } else if (optIdx === 4 && aml && amr) {
        arrows.push({ from: gk, to: aml, kind: 'pass', label: 'To Flanks' }, { from: gk, to: amr, kind: 'pass' });
        highlights.push({ x: aml.x, y: aml.y, r: 6, kind: 'target' }, { x: amr.x, y: amr.y, r: 6, kind: 'target' });
      } else if (optIdx === 5) {
        arrows.push({ from: gk, to: st, kind: 'pass', label: 'To Target Forward', dashed: true });
        highlights.push({ x: st.x, y: st.y, r: 6.5, kind: 'target' });
      } else if (optIdx === 6) {
        lines.push({ x: 76, label: 'Opp High Line', kind: 'def-line' });
        arrows.push({ from: gk, to: { x: 90, y: 24 }, kind: 'pass', label: 'Over defence', dashed: true });
        highlights.push({ x: 90, y: 24, r: 7, kind: 'target', label: 'Space in behind' });
      } else if (dcl && dm) {
        arrows.push({ from: gk, to: dcl, kind: 'pass', label: 'Balanced choice' }, { from: gk, to: dm, kind: 'pass' });
      }
      break;
    }

    case 'passing': {
      ball = dm ? { x: dm.x + 1, y: dm.y } : { x: 40, y: 34 };
      const passReach = [12, 18, 26, 36, 48][optIdx];
      if (dm) {
        const targetX = clamp(dm.x + passReach, 48, 92);
        arrows.push(
          { from: dm, to: { x: targetX, y: 34 }, kind: 'pass', label: optLabel },
          { from: dm, to: { x: clamp(dm.x + passReach * 0.85, 46, 88), y: optIdx <= 1 ? 23 : 16 }, kind: 'pass' },
        );
        if (optIdx <= 1 && mcl && mcr) {
          highlights.push({ x: 48, y: 34, r: 11, kind: 'zone', label: 'Short triangles' });
        } else if (optIdx >= 3) {
          highlights.push({ x: targetX, y: 34, r: 7.5, kind: 'target', label: 'Vertical target' });
        }
      }
      break;
    }

    case 'tempo': {
      ball = dm ? { x: dm.x + 1, y: dm.y } : { x: 40, y: 34 };
      const chainCount = optIdx + 1; // 1..5 visual urgency cues
      if (dm && mcl && mcr && aml && st) {
        if (optIdx <= 1) {
          arrows.push(
            { from: dm, to: mcl, kind: 'pass', dashed: true, label: 'Patient recycle' },
            { from: mcl, to: mcr, kind: 'pass', dashed: true },
          );
          highlights.push({ x: 49, y: 34, r: 10, kind: 'zone', label: `${optLabel} tempo` });
        } else {
          arrows.push(
            { from: dm, to: mcl, kind: 'pass', label: optIdx >= 3 ? '1-touch release' : 'Steady tempo' },
            { from: mcl, to: aml, kind: 'pass' },
          );
          if (chainCount >= 4) {
            arrows.push({ from: aml, to: st, kind: 'pass', label: 'Urgent surge' });
            arrows.push({ from: st, to: { x: 95, y: 34 }, kind: 'run' });
          }
        }
      }
      break;
    }

    case 'width':
      addShiftArrows('compare');
      highlights.push({
        x: 56,
        y: 34,
        r: [8, 10, 12, 14, 16][optIdx],
        kind: 'zone',
        label: optLabel,
      });
      break;

    case 'creative':
      ball = mcr ? { x: mcr.x + 1, y: mcr.y } : { x: 54, y: 45 };
      if (optIdx === 0 && mcr && amr) {
        highlights.push({ x: mcr.x, y: mcr.y, r: 5.5, kind: 'zone', label: 'Strict lane' });
        arrows.push({ from: mcr, to: amr, kind: 'pass', label: 'Structured pass' });
      } else if (optIdx === 2 && mcr) {
        arrows.push(
          { from: mcr, to: { x: 64, y: 32 }, kind: 'move', dashed: true, label: 'Free roam' },
          { from: mcr, to: { x: 88, y: 18 }, kind: 'pass', label: 'Disguised killer ball' },
          { from: mcr, to: { x: 92, y: 36 }, kind: 'pass' },
        );
      } else if (mcr && st) {
        arrows.push({ from: mcr, to: st, kind: 'pass', label: 'Balanced creativity' });
      }
      break;

    case 'reception':
      ball = mcl ? { x: mcl.x + 1, y: mcl.y } : { x: 54, y: 23 };
      if (mcl && aml && st) {
        if (optIdx === 0) {
          arrows.push(
            { from: mcl, to: { x: 88, y: 14 }, kind: 'pass', label: 'Into space' },
            { from: aml, to: { x: 88, y: 14 }, kind: 'run', label: 'Sprint onto ball' },
          );
          highlights.push({ x: 88, y: 14, r: 5.5, kind: 'target' });
        } else if (optIdx === 2) {
          arrows.push(
            { from: mcl, to: aml, kind: 'pass', label: 'Direct to feet' },
            { from: mcl, to: st, kind: 'pass' },
          );
          highlights.push({ x: aml.x, y: aml.y, r: 4.5, kind: 'zone' });
        } else {
          arrows.push(
            { from: mcl, to: aml, kind: 'pass', label: 'To feet' },
            { from: mcl, to: { x: 91, y: 34 }, kind: 'pass', dashed: true, label: 'Or space' },
          );
        }
      }
      break;

    case 'support_runs':
      addShiftArrows('compare');
      if (dl && dr && aml && amr) {
        if (optIdx === 0) {
          // Underlap
          arrows.push(
            { from: dl, to: { x: 66, y: 20 }, kind: 'run', label: 'Underlap inside' },
            { from: dr, to: { x: 66, y: 48 }, kind: 'run', label: 'Underlap inside' },
          );
        } else if (optIdx === 2) {
          // Overlap
          arrows.push(
            { from: dl, to: { x: 76, y: 8 }, kind: 'run', label: 'Overlap outside' },
            { from: dr, to: { x: 76, y: 60 }, kind: 'run', label: 'Overlap outside' },
          );
        } else {
          arrows.push(
            { from: dl, to: { x: 50, y: 12 }, kind: 'move', label: 'Natural support' },
            { from: dr, to: { x: 50, y: 56 }, kind: 'move' },
          );
        }
      }
      break;

    case 'dribbling':
      ball = aml ? { x: aml.x + 1, y: aml.y } : { x: 73, y: 12 };
      addAway('away-fb', 'DR', 86, 20);
      if (aml && mcl && st) {
        if (optIdx === 0) {
          arrows.push(
            { from: aml, to: mcl, kind: 'pass', label: 'Pass early' },
            { from: mcl, to: st, kind: 'pass' },
          );
        } else if (optIdx === 2) {
          arrows.push(
            { from: aml, to: { x: 94, y: 12 }, kind: 'run', label: 'Attack 1v1' },
            { from: mcl, to: { x: 70, y: 26 }, kind: 'run', label: 'Carry into space' },
          );
        } else {
          arrows.push(
            { from: aml, to: { x: 87, y: 11 }, kind: 'run', label: 'Carry if open' },
            { from: aml, to: st, kind: 'pass' },
          );
        }
      }
      break;

    case 'progress':
      addShiftArrows('compare');
      if (optIdx === 0 && dl && aml) {
        arrows.push({ from: dl, to: aml, kind: 'pass', label: 'Focus Left' });
        highlights.push({ x: 55, y: 13, r: 9, kind: 'zone', label: 'Left corridor' });
      } else if (optIdx === 2 && dm && st) {
        arrows.push({ from: dm, to: st, kind: 'pass', label: 'Focus Centre' });
        highlights.push({ x: 58, y: 34, r: 9, kind: 'zone', label: 'Central corridor' });
      } else if (optIdx === 3 && dr && amr) {
        arrows.push({ from: dr, to: amr, kind: 'pass', label: 'Focus Right' });
        highlights.push({ x: 55, y: 55, r: 9, kind: 'zone', label: 'Right corridor' });
      } else if (dm && aml && amr) {
        arrows.push({ from: dm, to: aml, kind: 'pass' }, { from: dm, to: amr, kind: 'pass', label: 'Balanced lanes' });
      }
      break;

    case 'patience':
      ball = aml ? { x: aml.x, y: aml.y } : { x: 73, y: 12 };
      if (optIdx === 0 && aml) {
        arrows.push({ from: { x: 68, y: 12 }, to: { x: 92, y: 34 }, kind: 'pass', label: 'Early cross' });
        highlights.push({ x: 92, y: 34, r: 6.5, kind: 'target', label: 'Unsettled box' });
      } else if (optIdx === 2 && aml && mcl && st) {
        arrows.push(
          { from: aml, to: mcl, kind: 'pass', label: 'Patient probe' },
          { from: mcl, to: { x: 86, y: 30 }, kind: 'pass' },
          { from: { x: 86, y: 30 }, to: { x: 94, y: 34 }, kind: 'pass', label: 'High-xG chance' },
        );
        highlights.push({ x: 93, y: 34, r: 6, kind: 'target', label: 'Inside box' });
      } else if (aml && st) {
        arrows.push({ from: aml, to: st, kind: 'pass', label: 'Balanced final third' });
      }
      break;

    case 'long_shots':
      ball = mcl ? { x: 74, y: 28 } : { x: 74, y: 28 };
      if (optIdx === 0) {
        arrows.push({ from: { x: 74, y: 28 }, to: { x: 90, y: 34 }, kind: 'pass', label: 'Pass into box' });
      } else if (optIdx === 2) {
        arrows.push(
          { from: { x: 74, y: 28 }, to: { x: 99, y: 32 }, kind: 'pass', label: 'Shoot from distance' },
          { from: { x: 75, y: 40 }, to: { x: 99, y: 36 }, kind: 'pass' },
        );
        highlights.push({ x: 75, y: 34, r: 7, kind: 'target', label: 'Shooting pocket' });
      } else {
        arrows.push({ from: { x: 74, y: 28 }, to: { x: 96, y: 34 }, kind: 'pass', dashed: true, label: 'Shoot if open' });
      }
      break;

    case 'crossing':
      ball = { x: 86, y: 10 };
      if (optIdx === 0) {
        arrows.push({ from: ball, to: { x: 94, y: 34 }, kind: 'pass', label: 'Driven low cut-back' });
        highlights.push({ x: 94, y: 34, r: 5.5, kind: 'target', label: 'Low corridor' });
      } else if (optIdx === 2) {
        arrows.push({ from: ball, to: { x: 95, y: 30 }, kind: 'pass', label: 'Whipped corridor' });
        highlights.push({ x: 95, y: 30, r: 5.5, kind: 'target', label: 'Between GK & CB' });
      } else if (optIdx === 3) {
        arrows.push({ from: ball, to: { x: 93, y: 42 }, kind: 'pass', dashed: true, label: 'Floated aerial ball' });
        highlights.push({ x: 93, y: 42, r: 6.5, kind: 'target', label: 'Far-post header' });
      } else {
        arrows.push({ from: ball, to: { x: 93, y: 34 }, kind: 'pass', label: 'Varied delivery' });
      }
      break;

    case 'set_pieces':
      ball = { x: 84, y: 11 };
      if (optIdx === 0 && mcl) {
        arrows.push({ from: ball, to: mcl, kind: 'pass', label: 'Keep open-play rhythm' });
      } else if (optIdx === 2) {
        arrows.push(
          { from: ball, to: { x: 98, y: 8 }, kind: 'run', label: 'Win corner / foul' },
          { from: { x: 98, y: 8 }, to: { x: 93, y: 32 }, kind: 'pass', dashed: true, label: 'Dead-ball threat' },
        );
        highlights.push({ x: 93, y: 32, r: 7, kind: 'target', label: 'Aerial routine' });
      } else {
        arrows.push({ from: ball, to: { x: 93, y: 24 }, kind: 'run', label: 'Balanced approach' });
      }
      break;

    case 'timewaste':
      ball = { x: 24, y: 56 };
      if (optIdx === 0 && dr && amr) {
        arrows.push({ from: dr, to: amr, kind: 'pass', label: 'Immediate restart' });
      } else if (optIdx === 2 && dr && dcr) {
        arrows.push({ from: dr, to: dcr, kind: 'pass', dashed: true, label: 'Run down clock' });
        highlights.push({ x: 24, y: 56, r: 6, kind: 'zone', label: 'Slow restarts' });
      } else if (dr && mcr) {
        arrows.push({ from: dr, to: mcr, kind: 'pass', label: 'Normal cadence' });
      }
      break;

    case 'att_trans':
      ball = dm ? { x: dm.x + 2, y: dm.y } : { x: 42, y: 34 };
      if (optIdx === 0 && dm && dcr && dcl) {
        arrows.push(
          { from: dm, to: dcr, kind: 'pass', label: 'Consolidate shape' },
          { from: dm, to: dcl, kind: 'pass' },
        );
      } else if (optIdx === 2 && aml && amr) {
        arrows.push(
          { from: aml, to: { x: 94, y: 14 }, kind: 'run', label: 'Counter sprint' },
          { from: st, to: { x: 96, y: 34 }, kind: 'run' },
          { from: amr, to: { x: 94, y: 54 }, kind: 'run' },
        );
      } else if (dm && mcl) {
        arrows.push({ from: dm, to: mcl, kind: 'pass', label: 'Balanced break' });
      }
      break;

    case 'def_trans':
      ball = { x: 64, y: 34 };
      addAway('away-cm', 'MC', 64, 34);
      if (optIdx === 0) {
        addShiftArrows('move');
        if (mcl && mcr) {
          arrows.push(
            { from: mcl, to: { x: mcl.x - 10, y: mcl.y }, kind: 'move', label: 'Regroup' },
            { from: mcr, to: { x: mcr.x - 10, y: mcr.y }, kind: 'move' },
          );
        }
      } else if (optIdx === 2 && mcl && mcr) {
        arrows.push(
          { from: mcl, to: { x: 61, y: 30 }, kind: 'press', label: 'Counter-press' },
          { from: mcr, to: { x: 61, y: 38 }, kind: 'press' },
          { from: st, to: { x: 66, y: 34 }, kind: 'press' },
        );
        highlights.push({ x: 64, y: 34, r: 8, kind: 'press', label: '5-sec swarm' });
      } else if (mcl) {
        arrows.push({ from: mcl, to: { x: 59, y: 31 }, kind: 'press', label: 'Delay carrier' });
      }
      break;

    case 'loe':
      lines.push(
        { x: computeDefensiveLineX(activeConfig), label: 'Def Line', kind: 'def-line' },
        { x: computeLoeX(activeConfig), label: optLabel, kind: 'loe' },
      );
      addShiftArrows('compare');
      break;

    case 'dline':
      lines.push(
        { x: computeDefensiveLineX(activeConfig), label: `Def Line (${optLabel})`, kind: 'def-line' },
        { x: computeLoeX(activeConfig), label: 'LoE', kind: 'loe' },
      );
      addShiftArrows('compare');
      break;

    case 'dl_behaviour': {
      const defX = computeDefensiveLineX(activeConfig);
      lines.push({ x: defX, label: optLabel, kind: optIdx === 2 ? 'offside' : 'def-line' });
      addShiftArrows('move');
      if (dcl && dcr) {
        const dx = optIdx === 0 ? -6 : optIdx === 2 ? 6 : 0;
        if (dx !== 0) {
          arrows.push(
            { from: dcl, to: { x: dcl.x + dx, y: dcl.y }, kind: optIdx === 2 ? 'press' : 'move', label: optLabel },
            { from: dcr, to: { x: dcr.x + dx, y: dcr.y }, kind: optIdx === 2 ? 'press' : 'move' },
          );
        }
      }
      break;
    }

    case 'trigger': {
      const r = [4.5, 6, 7.5, 9.5, 11.5][optIdx];
      addAway('away-cm', 'MC', 62, 34);
      ball = { x: 62, y: 34 };
      if (mcl && mcr) {
        highlights.push(
          { x: mcl.x, y: mcl.y, r, kind: 'press', label: optLabel },
          { x: mcr.x, y: mcr.y, r, kind: 'press' },
        );
        if (optIdx >= 3) {
          arrows.push(
            { from: mcl, to: { x: 60, y: 31 }, kind: 'press', label: 'Jump early' },
            { from: mcr, to: { x: 60, y: 37 }, kind: 'press' },
          );
        }
      }
      break;
    }

    case 'tackling':
      addAway('away-am', 'AM', 54, 34);
      ball = { x: 54, y: 34 };
      if (dm) {
        if (optIdx === 0) {
          arrows.push({ from: dm, to: { x: 47, y: 34 }, kind: 'move', label: 'Jockey goal-side' });
          highlights.push({ x: 48, y: 34, r: 6, kind: 'zone', label: 'Stay on feet' });
        } else if (optIdx === 2) {
          arrows.push({ from: dm, to: { x: 53, y: 34 }, kind: 'press', label: 'Commit hard' });
          highlights.push({ x: 54, y: 34, r: 6.5, kind: 'press', label: 'High duel intensity' });
        } else {
          arrows.push({ from: dm, to: { x: 51, y: 34 }, kind: 'press', label: 'Balanced duel' });
        }
      }
      break;

    case 'press_trap':
      addShiftArrows('compare');
      if (optIdx === 0 && aml && amr) {
        arrows.push(
          { from: aml, to: { x: aml.x + 4, y: 24 }, kind: 'press', label: 'Funnel inside' },
          { from: amr, to: { x: amr.x + 4, y: 44 }, kind: 'press' },
        );
        highlights.push({ x: 52, y: 34, r: 9, kind: 'press', label: 'Central trap' });
      } else if (optIdx === 2 && mcl && mcr) {
        arrows.push(
          { from: mcl, to: { x: mcl.x + 4, y: 14 }, kind: 'press', label: 'Funnel outside' },
          { from: mcr, to: { x: mcr.x + 4, y: 54 }, kind: 'press' },
        );
        highlights.push(
          { x: 54, y: 11, r: 7, kind: 'press', label: 'Sideline trap' },
          { x: 54, y: 57, r: 7, kind: 'press' },
        );
      } else {
        highlights.push({ x: 52, y: 34, r: 8, kind: 'zone', label: 'Balanced screen' });
      }
      break;

    case 'cross_eng':
      addAway('away-w', 'AMR', 34, 8);
      ball = { x: 34, y: 8 };
      addShiftArrows('compare');
      if (optIdx === 0 && dl) {
        highlights.push({ x: 22, y: 34, r: 10, kind: 'zone', label: 'Protect box' });
        arrows.push({ from: dl, to: { x: 25, y: 21 }, kind: 'move', label: 'Tuck narrow' });
      } else if (optIdx === 2 && dl) {
        arrows.push({ from: dl, to: { x: 32, y: 10 }, kind: 'press', label: 'Close down crosser' });
        highlights.push({ x: 33, y: 9, r: 5.5, kind: 'press', label: 'Block cross' });
      } else if (dl) {
        arrows.push({ from: dl, to: { x: 29, y: 13 }, kind: 'move', label: 'Balanced wide mark' });
      }
      break;

    case 'short_gk':
      addAway('away-gk', 'GK', 96, 34);
      addAway('away-cb1', 'CB', 86, 22);
      addAway('away-cb2', 'CB', 86, 46);
      ball = { x: 94, y: 34 };
      if (optIdx === 1 && aml && amr) {
        arrows.push(
          { from: st, to: { x: 92, y: 34 }, kind: 'press', label: 'Press GK restart' },
          { from: aml, to: { x: 84, y: 22 }, kind: 'press' },
          { from: amr, to: { x: 84, y: 46 }, kind: 'press' },
        );
        highlights.push({ x: 90, y: 34, r: 9, kind: 'press', label: 'Restart press' });
      } else {
        lines.push({ x: computeLoeX(activeConfig), label: 'Hold LoE', kind: 'loe' });
        arrows.push({ from: { x: 94, y: 34 }, to: { x: 86, y: 22 }, kind: 'pass', dashed: true, label: 'Allowed short' });
      }
      break;
  }

  return sanitizeDiagram({
    title: `${ti.name}: ${optLabel}`,
    subtitle: ti.optionNotes[optIdx] ?? ti.description,
    phase,
    players,
    arrows,
    ...(lines.length > 0 ? { lines } : {}),
    ...(highlights.length > 0 ? { highlights } : {}),
    ...(ball ? { ball } : {}),
  });
}

// ── 4. Player Instruction Diagram (all 24 PIs + FM27 Box Trio) ────────────────

function buildBoxDepthTrioDiagram(mode: 'standard' | 'arrive_late' | 'attack_the_defensive_line'): PitchDiagram {
  const players: PitchPlayerToken[] = [
    // Supporting home attackers & midfielders in final third
    { id: 'home-dm', slot: 'DM', label: 'DM', x: 54, y: 34, team: 'home' },
    { id: 'home-dl', slot: 'DL', label: 'WB', x: 64, y: 11, team: 'home' },
    { id: 'home-aml', slot: 'AML', label: 'W', x: 80, y: 11, team: 'home' },
    { id: 'home-mcr', slot: 'MCR', label: 'CM', x: 68, y: 45, team: 'home' },
    { id: 'home-amr', slot: 'AMR', label: 'IF', x: 78, y: 53, team: 'home' },
    // Opponent defensive line pinned cleanly at x = 87 m
    { id: 'away-gk', slot: 'GK', label: 'GK', x: 99, y: 34, team: 'away' },
    { id: 'away-dr', slot: 'DR', label: 'FB', x: 87, y: 14, team: 'away' },
    { id: 'away-dcr', slot: 'DCR', label: 'CB', x: 87, y: 27, team: 'away' },
    { id: 'away-dcl', slot: 'DCL', label: 'CB', x: 87, y: 41, team: 'away' },
    { id: 'away-dl', slot: 'DL', label: 'FB', x: 87, y: 54, team: 'away' },
  ];

  const arrows: PitchArrow[] = [];
  const highlights: PitchHighlight[] = [];
  const lines: PitchLine[] = [{ x: 87, label: 'Opponent Def Line (87m)', kind: 'def-line' }];
  const ball: PitchPoint = { x: 78, y: 12 };

  if (mode === 'standard') {
    players.push({
      id: 'home-st',
      slot: 'ST',
      label: 'ST',
      x: 79,
      y: 34,
      team: 'home',
      highlight: true,
      note: 'Normal box-edge positioning before the delivery',
    });
    arrows.push({
      from: { x: 79, y: 34 },
      to: { x: 86, y: 34 },
      kind: 'run',
      label: 'Standard box entry',
    });
    highlights.push({ x: 86, y: 34, r: 5.5, kind: 'zone', label: 'Standard entry' });
    return sanitizeDiagram({
      title: 'Box Attacking Depth: Standard',
      subtitle: 'Holds a balanced position near the edge of the area (x ≈ 79 m) before moving into the box.',
      phase: 'ip',
      players,
      arrows,
      lines,
      highlights,
      ball,
    });
  }

  if (mode === 'arrive_late') {
    players.push({
      id: 'home-st',
      slot: 'AMC',
      label: 'AM',
      x: 78,
      y: 34,
      ghostX: 79,
      ghostY: 34,
      team: 'home',
      highlight: true,
      note: 'Holds back near the edge, then bursts late into vacated space',
    });
    arrows.push(
      {
        from: { x: 78, y: 34 },
        to: { x: 92, y: 34 },
        kind: 'run',
        label: 'Delayed 2nd-wave burst',
      },
      {
        from: { x: 80, y: 12 },
        to: { x: 92, y: 34 },
        kind: 'pass',
        dashed: true,
        label: 'Cut-back',
      },
    );
    highlights.push({ x: 92, y: 34, r: 6, kind: 'target', label: 'Late-wave pocket' });
    return sanitizeDiagram({
      title: 'Arrive Late (FM27 Box Depth)',
      subtitle: 'Holds back near the box edge (x ≈ 78 m) as defenders drop, then surges unmarked into space (x ≈ 92 m).',
      phase: 'ip',
      players,
      arrows,
      lines,
      highlights,
      ball,
    });
  }

  // attack_the_defensive_line: steps onto defender's shoulder (x = 86.5) with crisp forward dart into box (x = 95)
  players.push({
    id: 'home-st',
    slot: 'ST',
    label: 'ST',
    x: 86.5,
    y: 34,
    ghostX: 79,
    ghostY: 34,
    team: 'home',
    highlight: true,
    note: 'Pins the last defender’s shoulder and darts forward in behind',
  });
  arrows.push(
    {
      from: { x: 86.5, y: 34 },
      to: { x: 95, y: 32 },
      kind: 'run',
      label: 'Dart in behind',
    },
    {
      from: { x: 80, y: 12 },
      to: { x: 95, y: 32 },
      kind: 'pass',
      dashed: true,
      label: 'Driven delivery',
    },
  );
  highlights.push({ x: 95, y: 32, r: 5.5, kind: 'target', label: 'Behind line' });
  return sanitizeDiagram({
    title: 'Attack the Defensive Line (FM27 Box Depth)',
    subtitle: 'Steps right onto the CB’s shoulder (x ≈ 86.5 m) and darts forward into the six-yard corridor (x ≈ 95 m).',
    phase: 'ip',
    players,
    arrows,
    lines,
    highlights,
    ball,
  });
}

export function buildPlayerInstructionDiagram(
  piKey: string,
  activeOption?: string,
): PitchDiagram {
  const normalizedOpt = activeOption?.trim().toLowerCase();

  // FM27 Box Attacking depth trio selector support
  if (
    piKey === 'arrive_late' ||
    piKey === 'attack_the_defensive_line' ||
    normalizedOpt === 'standard' ||
    normalizedOpt === 'arrive_late' ||
    normalizedOpt === 'attack_the_defensive_line'
  ) {
    if (normalizedOpt === 'standard') return buildBoxDepthTrioDiagram('standard');
    if (normalizedOpt === 'arrive_late') return buildBoxDepthTrioDiagram('arrive_late');
    if (normalizedOpt === 'attack_the_defensive_line') {
      return buildBoxDepthTrioDiagram('attack_the_defensive_line');
    }
    if (piKey === 'arrive_late') return buildBoxDepthTrioDiagram('arrive_late');
    if (piKey === 'attack_the_defensive_line') {
      return buildBoxDepthTrioDiagram('attack_the_defensive_line');
    }
  }

  const pi = PI_BY_KEY[piKey as PIKey] ?? PI_BY_KEY.stay_wider;
  const phase = pi.phase;

  // Base clean context formation
  const form = getFormation(phase === 'ip' ? '4-3-3 DM Wide' : '4-1-4-1 DM Wide');
  const players: PitchPlayerToken[] = form.slots.map((s) => ({
    id: `home-${s.code}`,
    slot: s.code,
    label: s.code,
    x: s.x,
    y: s.y,
    team: 'home',
  }));

  const bySlot = (code: string) => players.find((p) => p.slot === code)!;
  const arrows: PitchArrow[] = [];
  const highlights: PitchHighlight[] = [];
  const lines: PitchLine[] = [];
  let ball: PitchPoint | undefined;

  const addAway = (id: string, label: string, x: number, y: number) => {
    players.push({ id, slot: label, label, x, y, team: 'away' });
  };

  const highlightSlot = (code: string, note: string) => {
    const t = bySlot(code);
    t.highlight = true;
    t.note = note;
    return t;
  };

  switch (pi.key) {
    // ── FM27 Box Target-Zone Trio ──
    case 'target_near_post':
    case 'target_centre':
    case 'target_far_post': {
      const boxPlayers: PitchPlayerToken[] = [
        { id: 'home-w', slot: 'AML', label: 'W', x: 84, y: 10, team: 'home' },
        { id: 'home-cm', slot: 'MCR', label: 'CM', x: 68, y: 42, team: 'home' },
        { id: 'away-gk', slot: 'GK', label: 'GK', x: 99, y: 34, team: 'away' },
        { id: 'away-cb1', slot: 'DCR', label: 'CB', x: 89, y: 28, team: 'away' },
        { id: 'away-cb2', slot: 'DCL', label: 'CB', x: 89, y: 40, team: 'away' },
        { id: 'away-fb', slot: 'DL', label: 'FB', x: 88, y: 52, team: 'away' },
      ];
      const targetPt: PitchPoint =
        pi.key === 'target_near_post'
          ? { x: 93, y: 25 }
          : pi.key === 'target_centre'
            ? { x: 93, y: 34 }
            : { x: 93, y: 45 };
      const startPt: PitchPoint =
        pi.key === 'target_near_post'
          ? { x: 83, y: 30 }
          : pi.key === 'target_centre'
            ? { x: 81, y: 34 }
            : { x: 82, y: 50 };
      boxPlayers.push({
        id: 'home-target',
        slot: pi.key === 'target_far_post' ? 'AMR' : 'ST',
        label: pi.key === 'target_far_post' ? 'WF' : 'ST',
        x: startPt.x,
        y: startPt.y,
        team: 'home',
        highlight: true,
        note: pi.description,
      });
      return sanitizeDiagram({
        title: `${pi.name} (FM27 Box Target)`,
        subtitle: pi.description,
        phase: 'ip',
        players: boxPlayers,
        arrows: [
          { from: startPt, to: targetPt, kind: 'run', label: pi.name },
          { from: { x: 84, y: 10 }, to: targetPt, kind: 'pass', dashed: true, label: 'Cross' },
        ],
        lines: [{ x: 89, label: 'Opponent Def Line', kind: 'def-line' }],
        highlights: [{ x: targetPt.x, y: targetPt.y, r: 5.5, kind: 'target', label: pi.name }],
        ball: { x: 84, y: 10 },
      });
    }

    // ── Shooting ──
    case 'shoot_more': {
      const t = highlightSlot('MCR', 'Tests the keeper early from outside the box');
      t.ghostX = t.x;
      t.ghostY = t.y;
      t.x = 74;
      t.y = 40;
      ball = { x: 75, y: 40 };
      arrows.push({ from: t, to: { x: 99, y: 35 }, kind: 'pass', label: 'Long shot' });
      highlights.push({ x: 74, y: 40, r: 6.5, kind: 'target', label: 'Shot zone' });
      break;
    }
    case 'shoot_less': {
      const t = highlightSlot('MCR', 'Passes up low-xG shot to feed a better-placed runner');
      t.ghostX = t.x;
      t.ghostY = t.y;
      t.x = 73;
      t.y = 42;
      ball = { x: 74, y: 42 };
      const st = bySlot('ST');
      arrows.push({ from: t, to: st, kind: 'pass', label: 'Extra pass into box' });
      break;
    }

    // ── Dribbling ──
    case 'dribble_more': {
      const t = highlightSlot('AML', 'Carries aggressively at defender in 1v1 duels');
      ball = { x: t.x + 1, y: t.y };
      addAway('away-fb', 'DR', 82, 14);
      arrows.push({ from: t, to: { x: 92, y: 19 }, kind: 'run', label: '1v1 take-on' });
      break;
    }
    case 'dribble_less': {
      const t = highlightSlot('DM', 'Releases the pass early instead of carrying into traffic');
      ball = { x: t.x + 1, y: t.y };
      const mcl = bySlot('MCL');
      const mcr = bySlot('MCR');
      arrows.push(
        { from: t, to: mcl, kind: 'pass', label: 'Early release' },
        { from: t, to: mcr, kind: 'pass' },
      );
      break;
    }

    // ── Passing ──
    case 'take_more_risks': {
      const t = highlightSlot('MCR', 'Looks for disguised through-balls and diagonal switches');
      ball = { x: t.x + 1, y: t.y };
      arrows.push(
        { from: t, to: { x: 90, y: 28 }, kind: 'pass', label: 'Line-breaking pass' },
        { from: t, to: { x: 78, y: 12 }, kind: 'pass', label: 'Switch', dashed: true },
      );
      break;
    }
    case 'take_fewer_risks': {
      const t = highlightSlot('DCR', 'Plays safe high-percentage passes to protect possession');
      ball = { x: t.x + 1, y: t.y };
      const dm = bySlot('DM');
      const dr = bySlot('DR');
      arrows.push(
        { from: t, to: dm, kind: 'pass', label: 'Safe recycle' },
        { from: t, to: dr, kind: 'pass' },
      );
      break;
    }

    // ── Crossing ──
    case 'cross_from_byline': {
      const t = highlightSlot('AMR', 'Drives to the byline before cutting back into the box');
      ball = { x: t.x + 1, y: t.y };
      arrows.push(
        { from: t, to: { x: 95, y: 60 }, kind: 'run', label: 'Drive to byline' },
        { from: { x: 95, y: 60 }, to: { x: 92, y: 34 }, kind: 'pass', label: 'Cut-back cross' },
      );
      highlights.push({ x: 95, y: 60, r: 5, kind: 'target' });
      break;
    }
    case 'cross_from_deep': {
      const t = highlightSlot('DR', 'Whips an early cross from deep before CBs set');
      t.ghostX = t.x;
      t.ghostY = t.y;
      t.x = 58;
      t.y = 58;
      ball = { x: 59, y: 58 };
      arrows.push({ from: t, to: { x: 90, y: 34 }, kind: 'pass', label: 'Early deep cross' });
      highlights.push({ x: 90, y: 34, r: 6.5, kind: 'target', label: 'Early delivery zone' });
      break;
    }

    // ── Movement ──
    case 'roam_from_position': {
      const t = highlightSlot('MCR', 'Drifts freely toward open pockets and ball-side overloads');
      arrows.push(
        { from: t, to: { x: 64, y: 30 }, kind: 'move', dashed: true, label: 'Roams ball-side' },
        { from: t, to: { x: 68, y: 54 }, kind: 'move', dashed: true },
        { from: t, to: { x: 46, y: 44 }, kind: 'move', dashed: true },
      );
      highlights.push({ x: t.x + 6, y: t.y, r: 10, kind: 'zone', label: 'Free roam radius' });
      break;
    }
    case 'stay_wider': {
      const t = highlightSlot('AMR', 'Hugs the touchline to stretch the opposing back line');
      t.ghostX = t.x;
      t.ghostY = t.y;
      t.y = 61;
      arrows.push({ from: { x: t.ghostX, y: t.ghostY }, to: t, kind: 'move', label: 'Hugs touchline' });
      highlights.push({ x: t.x, y: 61, r: 5.5, kind: 'zone', label: 'Max width' });
      break;
    }
    case 'sit_narrower': {
      const t = highlightSlot('AMR', 'Tucks into the half-space to open an outside overlap lane');
      t.ghostX = t.x;
      t.ghostY = t.y;
      t.y = 44;
      arrows.push({ from: { x: t.ghostX, y: t.ghostY }, to: t, kind: 'move', label: 'Tucks into half-space' });
      highlights.push({ x: t.x, y: 44, r: 5.5, kind: 'zone', label: 'Half-space' });
      break;
    }
    case 'hold_position': {
      const t = highlightSlot('DM', 'Anchors central zone behind play for rest-defence');
      t.ghostX = 46;
      t.ghostY = 34;
      arrows.push({ from: { x: 46, y: 34 }, to: t, kind: 'compare', dashed: true, label: 'Holds anchor' });
      highlights.push({ x: t.x, y: t.y, r: 7, kind: 'zone', label: 'Rest-defence lock' });
      break;
    }
    case 'get_further_forward': {
      const t = highlightSlot('MCL', 'Surges early into advanced final-third zones');
      t.ghostX = t.x;
      t.ghostY = t.y;
      t.x = 71;
      arrows.push({ from: { x: t.ghostX, y: t.ghostY }, to: t, kind: 'run', label: 'Advances early' });
      highlights.push({ x: 71, y: t.y, r: 6, kind: 'target' });
      break;
    }
    case 'move_into_channels': {
      const t = highlightSlot('ST', 'Peels diagonally into the gap between CB and FB');
      addAway('away-cb', 'CB', 90, 29);
      addAway('away-fb', 'DR', 88, 12);
      arrows.push({ from: t, to: { x: 94, y: 20 }, kind: 'run', label: 'Attacks CB–FB channel' });
      highlights.push({ x: 94, y: 20, r: 5.5, kind: 'target', label: 'Channel gap' });
      break;
    }

    // ── Pressing & Defending (OOP) ──
    case 'press_more': {
      const t = highlightSlot('MCL', 'Expands pressing radius to close down earlier');
      addAway('away-cm', 'MC', 64, 24);
      ball = { x: 64, y: 24 };
      arrows.push({ from: t, to: { x: 62, y: 24 }, kind: 'press', label: 'Expanded press trigger' });
      highlights.push({ x: t.x, y: t.y, r: 10.5, kind: 'press', label: 'Wide trigger' });
      break;
    }
    case 'press_less': {
      const t = highlightSlot('DM', 'Shrinks pressing radius to guard Zone 14 and save stamina');
      highlights.push({ x: t.x, y: t.y, r: 5, kind: 'zone', label: 'Tight zonal hold' });
      arrows.push({ from: { x: t.x + 6, y: t.y }, to: t, kind: 'compare', dashed: true, label: 'Holds shape' });
      break;
    }
    case 'mark_tighter': {
      const t = highlightSlot('DCL', 'Eliminates turning space against receiver');
      addAway('away-st', 'ST', 30, 26);
      t.ghostX = t.x;
      t.ghostY = t.y;
      t.x = 27.5;
      t.y = 25.5;
      arrows.push({ from: { x: t.ghostX, y: t.ghostY }, to: t, kind: 'press', label: 'Tight shadow' });
      highlights.push({ x: 29, y: 26, r: 4.5, kind: 'press', label: 'Zero cushion' });
      break;
    }
    case 'tackle_harder': {
      const t = highlightSlot('DM', 'Commits forcefully into ground duels');
      addAway('away-am', 'AM', 44, 34);
      ball = { x: 44, y: 34 };
      arrows.push({ from: t, to: { x: 43, y: 34 }, kind: 'press', label: 'Hard challenge' });
      highlights.push({ x: 44, y: 34, r: 6, kind: 'press', label: 'High duel force' });
      break;
    }
    case 'ease_off_tackles': {
      const t = highlightSlot('DL', 'Stays on his feet and jockeys goal-side to avoid cards');
      addAway('away-w', 'AMR', 35, 12);
      ball = { x: 35, y: 12 };
      arrows.push({ from: t, to: { x: 29, y: 14 }, kind: 'move', label: 'Jockey goal-side' });
      highlights.push({ x: 29, y: 14, r: 5.5, kind: 'zone', label: 'Stay on feet' });
      break;
    }
  }

  return sanitizeDiagram({
    title: pi.name,
    subtitle: `${pi.family} · ${pi.description}`,
    phase,
    players,
    arrows,
    ...(lines.length > 0 ? { lines } : {}),
    ...(highlights.length > 0 ? { highlights } : {}),
    ...(ball ? { ball } : {}),
  });
}
