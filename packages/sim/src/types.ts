import type { ResolvedTeam } from './mods';

export const ATTR_KEYS = [
  'cor', 'cro', 'dri', 'fin', 'fir', 'fre', 'hea', 'lon', 'lth', 'mar', 'pas', 'pen', 'tck', 'tec',
  'agg', 'ant', 'bra', 'cmp', 'cnt', 'dec', 'det', 'fla', 'ldr', 'otb', 'pos', 'tea', 'vis', 'wor',
  'acc', 'agi', 'bal', 'jum', 'nat', 'pac', 'sta', 'str',
  'aer', 'cmd', 'com', 'ecc', 'han', 'kic', 'ovo', 'pun', 'ref', 'tro', 'thr',
] as const;
export type AttrKey = (typeof ATTR_KEYS)[number];
export type Attrs = Record<AttrKey, number>;

export const PI_KEYS = [
  'shoot_more', 'shoot_less', 'dribble_more', 'dribble_less', 'take_more_risks', 'take_fewer_risks',
  'cross_from_byline', 'cross_from_deep', 'roam_from_position', 'stay_wider', 'sit_narrower', 'hold_position',
  'get_further_forward', 'move_into_channels', 'press_more', 'press_less', 'mark_tighter', 'tackle_harder',
  'ease_off_tackles', 'arrive_late', 'attack_the_defensive_line', 'target_near_post', 'target_centre', 'target_far_post',
] as const;
export type PIKey = (typeof PI_KEYS)[number];
export type PIState = Record<PIKey, boolean>;

export const PHASES = ['build', 'prog', 'final', 'loss', 'oop', 'win'] as const;
export type Phase = (typeof PHASES)[number];
export type Src = 'conf' | 'est';
export type TeamId = 0 | 1;

export interface Vec {
  x: number;
  y: number;
}

export type LaneKey = 'wide' | 'wide2' | 'wide3' | 'half' | 'in' | 'in2' | 'ch' | 'cbw' | 'c' | 'ball' | 'ballhalf';
export type RunKind =
  | 'beyond' | 'channel' | 'box_near' | 'box_far' | 'box_centre' | 'late_box' | 'drop'
  | 'overlap' | 'underlap' | 'drift_ball' | 'invert' | 'hold';

export interface RoleProfile {
  anchor: Partial<Record<Phase, { depth?: number; lane?: LaneKey | number; spread?: number }>>;
  runs: Array<{ kind: RunKind; phase: Phase; p: number }>;
  onBall: { pass: number; through: number; carry: number; shoot: number; cross: number; hold: number; riskAversion: number };
  oop: {
    pressRadius: number;
    /** metres up (+) or down (−) the pitch from the slot's place in the defensive block */
    holdLine: number;
    /** absolute depth (m) for outlet roles that stay high instead of joining the block */
    outletDepth?: number;
    lane?: LaneKey | number;
    track: number;
    mark: 'zonal' | 'man';
  };
  key: AttrKey[];
  pref: AttrKey[];
  src: Src;
  note?: string;
}

export interface TeamMods {
  widthScale?: number;
  blockShift?: Partial<Record<Phase, number>>;
  passLenPref?: number;
  tempo?: number;
  riskAversion?: number;
  crossBias?: number;
  shootBias?: number;
  carryBias?: number;
  pressTrigger?: number;
  lineHeight?: number;
  loe?: number;
  supportRunsP?: number;
  flankBias?: -1 | 0 | 1;
  gkDistribution?: 'short' | 'mixed' | 'long';
  counterpress?: number;
  regroup?: number;
  trapSide?: -1 | 0 | 1;
  overlap?: -1 | 0 | 1;
  throughBias?: number;
  receptionSpace?: number;
  tackleCommit?: number;
  crossHeight?: 'low' | 'mixed' | 'whipped' | 'floated';
  lineStep?: number;
  crossBlock?: number;
  gkPress?: number;
  restartSpeed?: number;
}

export interface PlayerMods {
  shootBias?: number;
  carryBias?: number;
  throughBias?: number;
  riskAversion?: number;
  crossZone?: 'byline' | 'deep';
  laneShift?: number;
  holdRuns?: boolean;
  depthShift?: number;
  channelRun?: boolean;
  /** multiplier on press radius */
  pressRadius?: number;
  markDist?: number;
  tackleCommit?: number;
  lateRun?: boolean;
  lineRun?: boolean;
  boxTarget?: 'near' | 'centre' | 'far';
  roam?: number;
}

export interface Effect<T> {
  src: Src;
  note: string;
  mods: T;
}

export interface FormationSlot {
  code: string;
  /** legacy units: x = width 0..100 (left→right), y = depth 0..100 (own goal→opponent goal) */
  x: number;
  y: number;
}

/** Everything the simulation knows about roles and instructions. Built by @tb/content. */
export interface Knowledge {
  formations: Record<string, FormationSlot[]>;
  roles: Record<string, RoleProfile & { ab: string; phase: 'IP' | 'OOP' }>;
  ti: Record<string, (opt: number) => Effect<TeamMods>>;
  tiDefaults: Record<string, number>;
  pi: Record<PIKey, Effect<PlayerMods>>;
}

export interface AgentSpec {
  id: string;
  team: TeamId;
  slot: string;
  slotOOP?: string;
  roleIP: string;
  roleOOP: string;
  attrs: Attrs;
  pis: PIState;
  foot: 'L' | 'R' | 'B';
  label?: string;
}

export interface TeamSpec {
  formationIP: string;
  formationOOP: string;
  mentality: number;
  tis: Record<string, number>;
  agents: AgentSpec[];
}

export type Beat = { t: number; kind: 'pass' | 'carry' | 'shot' | 'cross' | 'clear'; from: string; to?: string; target?: Vec };

export interface SceneSpec {
  id: string;
  title?: string;
  seed: number;
  home: TeamSpec;
  away: TeamSpec;
  ball: { owner: string } | { pos: Vec };
  focus: string;
  script: Beat[];
  duration: number;
  /** optional start positions in world metres; otherwise agents start on their phase target */
  start?: Record<string, Vec>;
  note?: string;
}

export type OptionKind = 'pass' | 'throughPass' | 'carry' | 'shoot' | 'cross' | 'hold' | 'shape' | 'run' | 'press' | 'mark';

export interface OptionTrace {
  kind: OptionKind;
  to?: string;
  run?: RunKind;
  target: Vec;
  utility: number;
  terms: Record<string, number>;
}

export interface DecisionTrace {
  t: number;
  chosen: number;
  options: OptionTrace[];
  attrsUsed: AttrKey[];
}

export type IntentKind = 'shape' | 'run' | 'press' | 'mark' | 'carry' | 'hold' | 'receive' | 'chase' | 'keeper';

export interface Intent {
  kind: IntentKind;
  target: Vec;
  run?: RunKind;
  startAt?: number;
  until?: number;
}

export interface AgentState {
  spec: AgentSpec;
  pos: Vec;
  vel: Vec;
  heading: number;
  stamina: number;
  perceivedAt: number;
  lastDecisionT: number;
  intent: Intent;
  trace: DecisionTrace[];
  /** where the tactic wants the player (world frame) */
  planTarget: Vec;
  /** the plan dragged towards the ball; low Teamwork follows this more */
  impulseTarget: Vec;
  slotErr: Vec;
  pressing: boolean;
  lastTackleT: number;
  receivedAt: number;
  runCooldown: number;
}

export interface BallState {
  pos: Vec;
  z: number;
  vel: Vec;
  vz: number;
  owner: string | null;
  lastTouch: string | null;
  lastTeam: TeamId | null;
  intended: string | null;
  kind: 'ground' | 'air' | 'shot' | null;
  releasedAt: number;
  controlUntil: number;
  shotOutcome: 'goal' | 'save' | 'miss' | null;
  origin: Vec | null;
  /** set-up pass from a scene beat: only its intended receiver may collect it */
  scripted: boolean;
  target: Vec | null;
}

export type SimEventKind =
  | 'pass' | 'pass_complete' | 'intercept' | 'through' | 'cross' | 'carry' | 'shot' | 'goal' | 'save' | 'miss'
  | 'press' | 'tackle' | 'foul' | 'dribble' | 'aerial' | 'out' | 'offside' | 'run' | 'clear';

export interface SimEvent {
  t: number;
  kind: SimEventKind;
  agent: string;
  team: TeamId;
  to?: string;
  progressive?: boolean;
}

export interface TeamRuntime {
  spec: TeamSpec;
  phase: Phase;
  lostAt: number;
  wonAt: number;
  mods: ResolvedTeam;
}

export interface AgentStats {
  dist: number;
  depthSum: number;
  widthSum: number;
  samples: number;
}

export interface WorldState {
  t: number;
  tick: number;
  agents: AgentState[];
  ball: BallState;
  possession: TeamId | null;
  phase: [Phase, Phase];
  events: SimEvent[];
  scene: SceneSpec;
  teams: [TeamRuntime, TeamRuntime];
  rng: { s: number };
  history: Vec[][];
  ballHistory: Vec[];
  stats: Record<string, AgentStats>;
  scriptIdx: number;
  firstShotT: number | null;
  know: Knowledge;
}
