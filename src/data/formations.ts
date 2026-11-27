import type { PositionGroup } from './roles';

export interface FormationSlot {
  code: string;
  group: PositionGroup;
  /** Horizontal pitch coordinate along the 105 m length (safe range [6, 94], attacking left → right). */
  x: number;
  /** Lateral pitch coordinate across the 68 m width (safe range [10, 58], top = left flank, bottom = right flank). */
  y: number;
  defaultIpRole: string;
  defaultOopRole: string;
}

export interface FormationDef {
  id: string;
  name: string;
  shortName: string;
  backLine: 3 | 4 | 5;
  summary: string;
  slots: readonly FormationSlot[];
}

function groupOfCode(code: string): PositionGroup {
  if (code === 'GK') return 'GK';
  if (code === 'DL' || code === 'DR') return 'D_LR';
  if (code.startsWith('DC')) return 'DC';
  if (code.startsWith('WB')) return 'WB_LR';
  if (code.startsWith('DM')) return 'DM';
  if (code === 'ML' || code === 'MR') return 'M_LR';
  if (code.startsWith('MC')) return 'MC';
  if (code === 'AML' || code === 'AMR') return 'AM_LR';
  if (code.startsWith('AMC')) return 'AMC';
  if (code.startsWith('ST')) return 'ST';
  return 'MC';
}

const DEFAULT_IP: Record<PositionGroup, string> = {
  GK: 'gk_ip',
  DC: 'cb_ip',
  D_LR: 'fb_ip',
  WB_LR: 'wb_ip',
  DM: 'dm_ip',
  MC: 'cm_ip',
  M_LR: 'wm_ip',
  AMC: 'am_ip',
  AM_LR: 'w_ip',
  ST: 'cf_ip',
};

const DEFAULT_OOP: Record<PositionGroup, string> = {
  GK: 'gk_oop',
  DC: 'cb_oop',
  D_LR: 'fb_oop',
  WB_LR: 'wb_oop',
  DM: 'dm_oop',
  MC: 'cm_oop',
  M_LR: 'wm_oop',
  AMC: 'am_oop',
  AM_LR: 'w_oop',
  ST: 'cf_oop',
};

function slot(
  code: string,
  x: number,
  y: number,
  defaultIpRole?: string,
  defaultOopRole?: string,
): FormationSlot {
  const group = groupOfCode(code);
  return {
    code,
    group,
    x,
    y,
    defaultIpRole: defaultIpRole ?? DEFAULT_IP[group],
    defaultOopRole: defaultOopRole ?? DEFAULT_OOP[group],
  };
}

/**
 * Clean FM26/FM27 formations on a horizontal 105×68 pitch (own goal at x=0, opponent goal at x=105).
 * Every slot sits strictly within safe playable bounds: x ∈ [6, 94], y ∈ [10, 58].
 */
export const FORMATIONS: readonly FormationDef[] = [
  {
    id: '4-3-3 DM Wide',
    name: '4-3-3 DM Wide',
    shortName: '4-3-3',
    backLine: 4,
    summary: 'Single pivot behind two central midfielders and a wide front three; morphs cleanly into 3-2-5 IP or 4-1-4-1 OOP.',
    slots: [
      slot('GK', 8, 34),
      slot('DL', 26, 12),
      slot('DCL', 22, 24),
      slot('DCR', 22, 44),
      slot('DR', 26, 56),
      slot('DM', 39, 34),
      slot('MCL', 53, 23),
      slot('MCR', 53, 45),
      slot('AML', 73, 12),
      slot('AMR', 73, 56),
      slot('ST', 85, 34),
    ],
  },
  {
    id: '4-2-3-1 DM Wide',
    name: '4-2-3-1 DM Wide',
    shortName: '4-2-3-1',
    backLine: 4,
    summary: 'Double pivot protecting Zone 14 behind a central number 10, two wingers, and a lone striker.',
    slots: [
      slot('GK', 8, 34),
      slot('DL', 26, 12),
      slot('DCL', 22, 24),
      slot('DCR', 22, 44),
      slot('DR', 26, 56),
      slot('DML', 39, 26),
      slot('DMR', 39, 42),
      slot('AML', 70, 12),
      slot('AMC', 68, 34),
      slot('AMR', 70, 56),
      slot('ST', 85, 34),
    ],
  },
  {
    id: '4-2-3-1 Wide',
    name: '4-2-3-1 Wide',
    shortName: '4-2-3-1 CM',
    backLine: 4,
    summary: 'Higher CM double pivot pushing closer to the attacking trio for aggressive counter-pressing.',
    slots: [
      slot('GK', 8, 34),
      slot('DL', 26, 12),
      slot('DCL', 22, 24),
      slot('DCR', 22, 44),
      slot('DR', 26, 56),
      slot('MCL', 47, 26),
      slot('MCR', 47, 42),
      slot('AML', 70, 12),
      slot('AMC', 68, 34),
      slot('AMR', 70, 56),
      slot('ST', 85, 34),
    ],
  },
  {
    id: '4-1-4-1 DM Wide',
    name: '4-1-4-1 DM Wide',
    shortName: '4-1-4-1',
    backLine: 4,
    summary: 'Compact defensive shell with a screening DM behind a flat bank of four midfielders; the gold-standard OOP partner for 4-3-3.',
    slots: [
      slot('GK', 8, 34),
      slot('DL', 26, 12),
      slot('DCL', 22, 24),
      slot('DCR', 22, 44),
      slot('DR', 26, 56),
      slot('DM', 37, 34),
      slot('ML', 52, 12),
      slot('MCL', 52, 25),
      slot('MCR', 52, 43),
      slot('MR', 52, 56),
      slot('ST', 80, 34),
    ],
  },
  {
    id: '4-4-2',
    name: '4-4-2',
    shortName: '4-4-2',
    backLine: 4,
    summary: 'Two banks of four with a dual-striker partnership — clean vertical transitions and strong flank doubling.',
    slots: [
      slot('GK', 8, 34),
      slot('DL', 26, 12),
      slot('DCL', 22, 24),
      slot('DCR', 22, 44),
      slot('DR', 26, 56),
      slot('ML', 51, 12),
      slot('MCL', 49, 26),
      slot('MCR', 49, 42),
      slot('MR', 51, 56),
      slot('STL', 82, 27),
      slot('STR', 82, 41),
    ],
  },
  {
    id: '4-4-2 DM Wide',
    name: '4-4-2 DM Wide',
    shortName: '4-4-2 DM',
    backLine: 4,
    summary: 'Deeper double-pivot 4-4-2 that shields Zone 14 while pressing opposing centre-backs with two forwards.',
    slots: [
      slot('GK', 8, 34),
      slot('DL', 24, 12),
      slot('DCL', 20, 24),
      slot('DCR', 20, 44),
      slot('DR', 24, 56),
      slot('DML', 36, 26),
      slot('DMR', 36, 42),
      slot('ML', 49, 12),
      slot('MR', 49, 56),
      slot('STL', 74, 27),
      slot('STR', 74, 41),
    ],
  },
  {
    id: '4-4-1-1',
    name: '4-4-1-1',
    shortName: '4-4-1-1',
    backLine: 4,
    summary: 'Solid two banks of four with an attacking midfielder linking between midfield and the lone striker.',
    slots: [
      slot('GK', 8, 34),
      slot('DL', 26, 12),
      slot('DCL', 22, 24),
      slot('DCR', 22, 44),
      slot('DR', 26, 56),
      slot('ML', 51, 12),
      slot('MCL', 49, 26),
      slot('MCR', 49, 42),
      slot('MR', 51, 56),
      slot('AMC', 68, 34),
      slot('ST', 84, 34),
    ],
  },
  {
    id: '4-4-2 Diamond',
    name: '4-4-2 Diamond',
    shortName: '4-4-2 Diamond',
    backLine: 4,
    summary: 'Narrow central diamond creating a 4v3 midfield overload; relies on attacking full-backs for flank width.',
    slots: [
      slot('GK', 8, 34),
      slot('DL', 26, 12),
      slot('DCL', 22, 24),
      slot('DCR', 22, 44),
      slot('DR', 26, 56),
      slot('DM', 37, 34),
      slot('MCL', 51, 22),
      slot('MCR', 51, 46),
      slot('AMC', 66, 34),
      slot('STL', 83, 27),
      slot('STR', 83, 41),
    ],
  },
  {
    id: '4-2-2-2',
    name: '4-2-2-2',
    shortName: '4-2-2-2',
    backLine: 4,
    summary: 'Box-midfield shape with two DMs and two narrow half-space AMs feeding a strike partnership.',
    slots: [
      slot('GK', 8, 34),
      slot('DL', 26, 12),
      slot('DCL', 22, 24),
      slot('DCR', 22, 44),
      slot('DR', 26, 56),
      slot('DML', 39, 26),
      slot('DMR', 39, 42),
      slot('AMCL', 68, 22),
      slot('AMCR', 68, 46),
      slot('STL', 85, 27),
      slot('STR', 85, 41),
    ],
  },
  {
    id: '4-3-3 Flat',
    name: '4-3-3 Flat',
    shortName: '4-3-3 Flat',
    backLine: 4,
    summary: 'Flat central trio pushing higher upfield behind wide forwards; aggressive in mid-block pressing.',
    slots: [
      slot('GK', 8, 34),
      slot('DL', 26, 12),
      slot('DCL', 22, 24),
      slot('DCR', 22, 44),
      slot('DR', 26, 56),
      slot('MCL', 49, 21),
      slot('MC', 47, 34),
      slot('MCR', 49, 47),
      slot('AML', 73, 12),
      slot('AMR', 73, 56),
      slot('ST', 85, 34),
    ],
  },
  {
    id: '3-4-2-1',
    name: '3-4-2-1',
    shortName: '3-4-2-1',
    backLine: 3,
    summary: 'Back three with wing-backs holding full width and dual half-space 10s operating behind a lone striker.',
    slots: [
      slot('GK', 8, 34),
      slot('DCL', 22, 20),
      slot('DC', 20, 34),
      slot('DCR', 22, 48),
      slot('WBL', 44, 11),
      slot('MCL', 48, 26),
      slot('MCR', 48, 42),
      slot('WBR', 44, 57),
      slot('AMCL', 70, 23),
      slot('AMCR', 70, 45),
      slot('ST', 85, 34),
    ],
  },
  {
    id: '3-4-3',
    name: '3-4-3',
    shortName: '3-4-3',
    backLine: 3,
    summary: 'Front-foot back three with wing-backs and wide forwards creating constant 2v1 overloads on the flanks.',
    slots: [
      slot('GK', 8, 34),
      slot('DCL', 22, 20),
      slot('DC', 20, 34),
      slot('DCR', 22, 48),
      slot('WBL', 45, 11),
      slot('MCL', 48, 26),
      slot('MCR', 48, 42),
      slot('WBR', 45, 57),
      slot('AML', 73, 14),
      slot('AMR', 73, 54),
      slot('ST', 85, 34),
    ],
  },
  {
    id: '3-5-2',
    name: '3-5-2',
    shortName: '3-5-2',
    backLine: 3,
    summary: 'Three centre-backs, wing-backs supplying full touchline width, a central triangle, and two strikers.',
    slots: [
      slot('GK', 8, 34),
      slot('DCL', 22, 20),
      slot('DC', 20, 34),
      slot('DCR', 22, 48),
      slot('WBL', 45, 11),
      slot('DM', 37, 34),
      slot('MCL', 53, 24),
      slot('MCR', 53, 44),
      slot('WBR', 45, 57),
      slot('STL', 83, 27),
      slot('STR', 83, 41),
    ],
  },
  {
    id: '5-3-2 WB',
    name: '5-3-2 WB',
    shortName: '5-3-2',
    backLine: 5,
    summary: 'Compact back five out of possession paired with a central midfield trio and two transition strikers.',
    slots: [
      slot('GK', 8, 34),
      slot('WBL', 29, 11),
      slot('DCL', 20, 22),
      slot('DC', 18, 34),
      slot('DCR', 20, 46),
      slot('WBR', 29, 57),
      slot('MCL', 47, 22),
      slot('MC', 45, 34),
      slot('MCR', 47, 46),
      slot('STL', 77, 27),
      slot('STR', 77, 41),
    ],
  },
  {
    id: '5-4-1',
    name: '5-4-1',
    shortName: '5-4-1',
    backLine: 5,
    summary: 'Classic low-block shell: five across the back line and four across midfield starving space in behind.',
    slots: [
      slot('GK', 8, 34),
      slot('WBL', 27, 11),
      slot('DCL', 20, 22),
      slot('DC', 18, 34),
      slot('DCR', 20, 46),
      slot('WBR', 27, 57),
      slot('ML', 47, 13),
      slot('MCL', 45, 26),
      slot('MCR', 45, 42),
      slot('MR', 47, 55),
      slot('ST', 75, 34),
    ],
  },
  {
    id: '4-2-4 DM Wide',
    name: '4-2-4 DM Wide',
    shortName: '4-2-4',
    backLine: 4,
    summary: 'Ultra-vertical front four ahead of a double pivot; pins opposing back fours across the whole pitch width.',
    slots: [
      slot('GK', 8, 34),
      slot('DL', 26, 12),
      slot('DCL', 22, 24),
      slot('DCR', 22, 44),
      slot('DR', 26, 56),
      slot('DML', 39, 26),
      slot('DMR', 39, 42),
      slot('AML', 68, 12),
      slot('AMR', 68, 56),
      slot('STL', 85, 27),
      slot('STR', 85, 41),
    ],
  },
  {
    id: '4-5-1',
    name: '4-5-1',
    shortName: '4-5-1',
    backLine: 4,
    summary: 'Dense five-man midfield bank protecting the back four while leaving one striker as a central release valve.',
    slots: [
      slot('GK', 8, 34),
      slot('DL', 24, 12),
      slot('DCL', 20, 24),
      slot('DCR', 20, 44),
      slot('DR', 24, 56),
      slot('ML', 46, 12),
      slot('MCL', 46, 23),
      slot('MC', 44, 34),
      slot('MCR', 46, 45),
      slot('MR', 46, 56),
      slot('ST', 74, 34),
    ],
  },
] as const;

export const FORMATION_BY_ID: Record<string, FormationDef> = Object.fromEntries(
  FORMATIONS.map((f) => [f.id, f]),
);

export const FORMATION_NAMES: readonly string[] = FORMATIONS.map((f) => f.id);

/** Default opponent 4-2-3-1 shape in the opponent's own frame (mirror via x' = 105 - x, y' = 68 - y). */
export const OPPONENT_FORMATION: FormationDef = FORMATION_BY_ID['4-2-3-1 DM Wide'];
