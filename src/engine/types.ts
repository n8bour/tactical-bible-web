import type { AttrKey, PIKey, PositionGroup, RoleDef } from '../data';

export const PITCH_LENGTH = 105;
export const PITCH_WIDTH = 68;

// ── Interactive SVG Pitch Diagram Model ───────────────────────────────────────

export interface PitchPoint {
  x: number;
  y: number;
}

export interface PitchPlayerToken {
  id: string;
  slot: string;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  ghostX?: number;
  ghostY?: number;
  team: 'home' | 'away';
  highlight?: boolean;
  roleId?: string;
  note?: string;
}

export interface PitchArrow {
  from: PitchPoint;
  to: PitchPoint;
  kind: 'move' | 'run' | 'pass' | 'press' | 'compare';
  label?: string;
  dashed?: boolean;
}

export interface PitchLine {
  x: number;
  label: string;
  kind: 'def-line' | 'loe' | 'offside';
}

export interface PitchHighlight {
  x: number;
  y: number;
  r: number;
  kind: 'press' | 'zone' | 'target';
  label?: string;
}

export interface PitchDiagram {
  title: string;
  subtitle: string;
  phase: 'ip' | 'oop';
  players: PitchPlayerToken[];
  arrows: PitchArrow[];
  lines?: PitchLine[];
  ball?: PitchPoint;
  highlights?: PitchHighlight[];
}

// ── 3×3 Visualiser & 7×5 Zone Heatmap ─────────────────────────────────────────

export type BallThird = 'def' | 'mid' | 'att';
export type BallLane = 'left' | 'centre' | 'right';

export interface BallZone {
  third: BallThird;
  lane: BallLane;
}

export type ZoneStatus = 'gap' | 'light' | 'covered' | 'strong' | 'crowded';

export interface ZoneCell {
  col: number;
  row: number;
  label: string;
  band: 'def' | 'mid' | 'att';
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  score: number;
  status: ZoneStatus;
  contributors: string[];
}

export interface ZoneRoleSwap {
  id: string;
  severity: 'warn' | 'tip';
  zoneLabel: string;
  phase: 'ip' | 'oop';
  slot: string;
  currentRoleId: string;
  suggestedRoleId: string;
  reason: string;
}

export interface ZoneCoverageReport {
  phase: 'ip' | 'oop' | 'combined';
  cols: 7;
  rows: 5;
  colLabels: string[];
  rowLabels: string[];
  cells: ZoneCell[];
  bandGrades: {
    defense: number;
    midfield: number;
    attack: number;
  };
  gaps: string[];
  crowded: string[];
  swaps: ZoneRoleSwap[];
}

// ── Tactic Configuration & Diagnostic Analysis ────────────────────────────────

export interface TacticConfig {
  name?: string;
  ipFormation: string;
  oopFormation: string;
  /** 0 = Very Defensive .. 3 = Balanced .. 6 = Very Attacking */
  mentality: number;
  /** Team instruction option indices keyed by TIKey */
  tis: Record<string, number>;
  /** IP role IDs keyed by ipFormation slot code */
  ipRoles: Record<string, string>;
  /** OOP role IDs keyed by oopFormation slot code */
  oopRoles: Record<string, string>;
  /** Active Player Instruction keys keyed by ipFormation slot code */
  pis: Record<string, PIKey[]>;
}

export type DiagnosticSeverity = 'error' | 'warn' | 'tip' | 'good';

export type DiagnosticCategory =
  | 'rest-defence'
  | 'width'
  | 'box'
  | 'pressing'
  | 'outlets'
  | 'creativity'
  | 'complexity'
  | 'transition'
  | 'coherence';

export interface TacticDiagnostic {
  id: string;
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  title: string;
  detail: string;
  fix?: string;
  slots?: string[];
}

export interface TacticAnalysis {
  restDefenceCount: number;
  boxRunnersCount: number;
  creatorsCount: number;
  outletsCount: number;
  leftWidthHolders: string[];
  rightWidthHolders: string[];
  complexityScore: number;
  complexityTier: 'Simple' | 'Moderate' | 'Complex' | 'Very Complex';
  maxTravelDistance: number;
  defLineX: number;
  loeX: number;
  lineGap: number;
  diagnostics: TacticDiagnostic[];
  summary: string;
}

// ── Role Fit Finder & Role Comparator ─────────────────────────────────────────

export type RoleFitMode = 'role' | 'fm27-me';

export interface RoleFitAttrItem {
  key: AttrKey;
  value: number;
  tier: 'key' | 'pref';
}

export interface RoleFitResult {
  role: RoleDef;
  score: number;
  keyAvg: number;
  prefAvg: number;
  meBonus: number;
  strengths: RoleFitAttrItem[];
  weaknesses: RoleFitAttrItem[];
}

export interface RolePairFit {
  ip: RoleFitResult;
  oop: RoleFitResult;
  combinedScore: number;
  fitNote: string;
}

export interface RoleProfileDiffItem {
  metric: string;
  label: string;
  a: number;
  b: number;
  diff: number;
}

export interface RoleComparison {
  roleA: RoleDef;
  roleB: RoleDef;
  samePhase: boolean;
  groups: {
    shared: PositionGroup[];
    onlyA: PositionGroup[];
    onlyB: PositionGroup[];
  };
  keyAttrs: {
    shared: AttrKey[];
    onlyA: AttrKey[];
    onlyB: AttrKey[];
  };
  prefAttrs: {
    shared: AttrKey[];
    onlyA: AttrKey[];
    onlyB: AttrKey[];
  };
  profileDiffs: RoleProfileDiffItem[];
  legacyEquiv: {
    a: string | null;
    b: string | null;
  };
}

// ── FMF / JSON Tactic Import ──────────────────────────────────────────────────

export interface FmfImportResult {
  ok: boolean;
  format: 'fmf' | 'json' | 'unknown';
  confidence: 'exact' | 'partial' | 'fallback';
  tacticName: string;
  tactic: Partial<TacticConfig>;
  matched: string[];
  warnings: string[];
  error?: string;
}
