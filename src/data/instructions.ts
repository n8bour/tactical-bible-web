import type { AttrKey } from './attributes';
import type { PositionGroup } from './roles';

export type TIArea =
  | 'Build-up'
  | 'Progression'
  | 'Final Third'
  | 'Out of Possession'
  | 'Transitions';

export type TIKey =
  | 'buildup'
  | 'goal_kicks'
  | 'gk_speed'
  | 'gk_target'
  | 'passing'
  | 'tempo'
  | 'width'
  | 'creative'
  | 'reception'
  | 'support_runs'
  | 'dribbling'
  | 'progress'
  | 'patience'
  | 'long_shots'
  | 'crossing'
  | 'set_pieces'
  | 'timewaste'
  | 'att_trans'
  | 'def_trans'
  | 'loe'
  | 'dline'
  | 'dl_behaviour'
  | 'trigger'
  | 'tackling'
  | 'press_trap'
  | 'cross_eng'
  | 'short_gk';

export interface TeamInstructionDef {
  key: TIKey;
  name: string;
  phase: 'ip' | 'oop';
  area: TIArea;
  options: readonly string[];
  defaultIndex: number;
  complexity: number;
  description: string;
  optionNotes: readonly string[];
  pro: string;
  con: string;
  need: {
    low?: readonly AttrKey[];
    high?: readonly AttrKey[];
  };
  src: 'conf' | 'est';
  note: string;
}

export const TI_AREAS: readonly TIArea[] = [
  'Build-up',
  'Progression',
  'Final Third',
  'Transitions',
  'Out of Possession',
] as const;

export const TEAM_INSTRUCTIONS: readonly TeamInstructionDef[] = [
  // ── Build-up (4) ────────────────────────────────────────────────────────────
  {
    key: 'buildup',
    name: 'Build-up Strategy',
    phase: 'ip',
    area: 'Build-up',
    options: ['Play Through Press', 'Balanced', 'Bypass Press'],
    defaultIndex: 1,
    complexity: 1,
    description: 'Mutually exclusive FM26/FM27 build-up mode: play short through the opposition press or launch over it.',
    optionNotes: [
      'Play Through Press: short keeper distribution and splitting CBs draw opponents in to play past the first wave.',
      'Balanced: mixes short build-up with direct outlets when pressed heavily.',
      'Bypass Press: skips short build-up with longer passes and aerial clearances towards forwards.',
    ],
    pro: 'Play Through Press draws opponents out and breaks the press; Bypass Press eliminates risky defensive-third turnovers.',
    con: 'Play Through Press with low-Composure defenders causes costly errors; Bypass Press concedes possession without aerial winners.',
    need: { low: ['pas', 'cmp', 'fir', 'dec'], high: ['jum', 'hea', 'str', 'pac'] },
    src: 'est',
    note: 'Tactical model representation of FM26/FM27 mutually exclusive build-up modes.',
  },
  {
    key: 'goal_kicks',
    name: 'Goal Kicks',
    phase: 'ip',
    area: 'Build-up',
    options: ['Short', 'Mixed', 'Long'],
    defaultIndex: 1,
    complexity: 0.5,
    description: 'Goal-kick restart length; Short splits centre-backs wide to begin controlled build-up from the six-yard box.',
    optionNotes: [
      'Short: keeper rolls short to splitting CBs or full-backs for numerical superiority at the back.',
      'Mixed: keeper adapts restart length to opposition pressing shape.',
      'Long: keeper launches directly upfield to contest second balls and skip high presses.',
    ],
    pro: 'Short builds calm possession from the back; Long neutralises aggressive high presses.',
    con: 'Short against a high press with weak passing CBs invites turnovers inside your own box.',
    need: { low: ['pas', 'cmp', 'fir', 'dec'], high: ['kic', 'jum', 'hea', 'str'] },
    src: 'est',
    note: 'Tactical model representation of goal-kick restart patterns.',
  },
  {
    key: 'gk_speed',
    name: 'GK Distribution Speed',
    phase: 'ip',
    area: 'Build-up',
    options: ['Slow Pace Down', 'Balanced', 'Distribute Quickly'],
    defaultIndex: 1,
    complexity: 0.5,
    description: 'How quickly the goalkeeper releases the ball after making a save or claiming a cross.',
    optionNotes: [
      'Slow Pace Down: keeper holds the ball to let teammates reset shape and recover stamina.',
      'Balanced: standard release cadence matched to match state.',
      'Distribute Quickly: immediate roll, throw, or kick to spark rapid counter-attacks.',
    ],
    pro: 'Distribute Quickly exploits disorganised opponents; Slow Pace Down calms matches and protects leads.',
    con: 'Quick release with teammates out of shape or poor GK distribution triggers instant turnovers.',
    need: { high: ['thr', 'kic', 'vis', 'dec', 'pac'] },
    src: 'est',
    note: 'Tactical model representation of goalkeeper restart tempo.',
  },
  {
    key: 'gk_target',
    name: 'GK Distribution',
    phase: 'ip',
    area: 'Build-up',
    options: [
      'Centre-Backs',
      'Full-Backs',
      'Playmaker',
      'Balanced',
      'Flanks',
      'Target Forward',
      'Over Opposition Defence',
    ],
    defaultIndex: 3,
    complexity: 0.5,
    description: 'Preferred receiving unit or zone for goalkeeper distribution in build-up.',
    optionNotes: [
      'Centre-Backs: short distribution to splitting CBs to start structured build-up.',
      'Full-Backs: short wide outlet to bypass central pressure.',
      'Playmaker: feeds the deep playmaker directly to initiate central progression.',
      'Balanced: keeper chooses freely based on pressure and open lanes.',
      'Flanks: medium-range balls towards wide touchlines to stretch the press.',
      'Target Forward: direct aerial service to a physical striker for knockdowns.',
      'Over Opposition Defence: long launches behind a high line for fast runners.',
    ],
    pro: 'Channels restarts to your strongest build-up passer or aerial outlet.',
    con: 'Over-targeting one receiver lets opponents set a dedicated pressing trap on them.',
    need: { low: ['pas', 'cmp', 'fir', 'thr'], high: ['kic', 'jum', 'hea', 'pac'] },
    src: 'est',
    note: 'Tactical model representation of goalkeeper distribution target zones.',
  },

  // ── Progression (8) ─────────────────────────────────────────────────────────
  {
    key: 'passing',
    name: 'Passing Directness',
    phase: 'ip',
    area: 'Progression',
    options: ['Much Shorter', 'Shorter', 'Balanced', 'More Direct', 'Much More Direct'],
    defaultIndex: 2,
    complexity: 1,
    description: 'Average pass length and verticality, stacked relatively on top of your Team Mentality.',
    optionNotes: [
      'Much Shorter: ultra-compact ground triangles maximising retention and patience.',
      'Shorter: controlled short passing through midfield lines.',
      'Balanced: mixes short recycling with vertical passes when lanes open.',
      'More Direct: looks vertically early to bypass midfield congestion.',
      'Much More Direct: launches rapidly into space or forwards on every opportunity.',
    ],
    pro: 'Short keeps possession and tires opponents; Direct breaks lines quickly and bypasses midfield presses.',
    con: 'Short demands Passing/Technique/Composure across the XI; Direct loses possession without aerial targets or pace.',
    need: { low: ['pas', 'tec', 'cmp', 'fir'], high: ['hea', 'str', 'otb', 'pac'] },
    src: 'est',
    note: 'Stacks relatively on top of the Team Mentality passing baseline.',
  },
  {
    key: 'tempo',
    name: 'Tempo',
    phase: 'ip',
    area: 'Progression',
    options: ['Much Lower', 'Lower', 'Balanced', 'Higher', 'Much Higher'],
    defaultIndex: 2,
    complexity: 1,
    description: 'Speed of decision-making and ball release (distinct from pass length), layered on top of Mentality.',
    optionNotes: [
      'Much Lower: patient circulation waiting for clear openings while conserving stamina.',
      'Lower: deliberate tempo that draws opponents out of shape.',
      'Balanced: steady circulation that accelerates selectively in the final third.',
      'Higher: brisk one- and two-touch movement catching blocks mid-shift.',
      'Much Higher: relentless urgent release maximising disruption at high technical and stamina cost.',
    ],
    pro: 'High catches disorganised blocks; Low brings control, patience, and stamina preservation.',
    con: 'High + short passing demands elite Decisions/First Touch and increases fatigue under FM27 Hawk-Eye physics.',
    need: { low: ['cmp', 'pas', 'dec', 'vis'], high: ['dec', 'tec', 'fir', 'sta'] },
    src: 'est',
    note: 'Stacks relatively on top of the Team Mentality tempo baseline.',
  },
  {
    key: 'width',
    name: 'Attacking Width',
    phase: 'ip',
    area: 'Progression',
    options: ['Much Narrower', 'Narrower', 'Balanced', 'Wider', 'Much Wider'],
    defaultIndex: 2,
    complexity: 1,
    description: 'Horizontal spacing across the pitch in possession, relative to your Mentality baseline.',
    optionNotes: [
      'Much Narrower: dense central proximity for tight one-twos and instant counter-pressing.',
      'Narrower: tucks wide players slightly inward to overload central corridors.',
      'Balanced: natural horizontal spacing between touchlines and half-spaces.',
      'Wider: stretches opposing back lines horizontally to open interior channels.',
      'Much Wider: extreme touchline stretching to pull low blocks apart at the cost of counter-press proximity.',
    ],
    pro: 'Wide stretches compact low blocks; Narrow tightens central combinations and counter-pressing.',
    con: 'Much Wider weakens counter-pressing on turnovers; Much Narrower lets opponents pack the middle.',
    need: { low: ['fir', 'pas', 'tec', 'otb'], high: ['cro', 'pac', 'sta', 'vis'] },
    src: 'est',
    note: 'Horizontal spacing multiplier layered on top of Team Mentality.',
  },
  {
    key: 'creative',
    name: 'Creative Freedom',
    phase: 'ip',
    area: 'Progression',
    options: ['More Disciplined', 'Balanced', 'More Expressive'],
    defaultIndex: 1,
    complexity: 1,
    description: 'How much latitude players have to deviate from tactical structure for imaginative passes or runs.',
    optionNotes: [
      'More Disciplined: strict adherence to tactical structure and lower-risk passes.',
      'Balanced: respects role structure while letting creators pick line-breaking passes.',
      'More Expressive: high creative freedom for elite Vision/Flair players to unlock packed blocks.',
    ],
    pro: 'Expressive unlocks stubborn low blocks; Disciplined produces predictable, low-complexity execution.',
    con: 'Expressive with weak Decisions/Flair/Vision causes sloppy turnovers and breaks shape.',
    need: { low: ['tea', 'cnt', 'dec'], high: ['dec', 'fla', 'vis', 'tec'] },
    src: 'est',
    note: 'Controls risk-taking and structural deviation across the XI.',
  },
  {
    key: 'reception',
    name: 'Pass Reception',
    phase: 'ip',
    area: 'Progression',
    options: ['Pass into Space', 'Balanced', 'Pass to Feet'],
    defaultIndex: 1,
    complexity: 1,
    description: 'Whether passers lead balls ahead of runners into space or deliver directly into feet.',
    optionNotes: [
      'Pass into Space: leads passes ahead of runners to exploit depth behind high lines.',
      'Balanced: plays to feet in build-up and into space when runners break.',
      'Pass to Feet: delivers straight into teammates’ feet to maximise control and retention.',
    ],
    pro: 'Pass to Feet improves retention; Pass into Space punishes high defensive lines.',
    con: 'Into Space fails against deep blocks with no grass behind; To Feet demands First Touch under pressure.',
    need: { low: ['otb', 'acc', 'pac', 'ant'], high: ['fir', 'cmp', 'tec', 'pas'] },
    src: 'est',
    note: 'Shifts through-ball vs to-feet passing bias.',
  },
  {
    key: 'support_runs',
    name: 'Supporting Runs',
    phase: 'ip',
    area: 'Progression',
    options: ['Underlap', 'Balanced', 'Overlap'],
    defaultIndex: 1,
    complexity: 1,
    description: 'Encourages wide players to wait for outside (Overlap) or inside half-space (Underlap) supporting runs.',
    optionNotes: [
      'Underlap: full-backs or midfielders surge inside behind touchline wingers.',
      'Balanced: players follow their natural role geometry without forced waiting.',
      'Overlap: full-backs/wing-backs surge outside around inside-cutting wingers to cross.',
    ],
    pro: 'Overlap complements Inside Forwards/Wingers; Underlap complements touchline Wingers.',
    con: 'Overlapping a touchline Winger crowds the wing and increases full-back stamina drain.',
    need: { low: ['otb', 'pas', 'fir', 'sta'], high: ['cro', 'sta', 'wor', 'pac', 'otb'] },
    src: 'est',
    note: 'Coordinates wide/half-space interplay between wide attackers and defenders.',
  },
  {
    key: 'dribbling',
    name: 'Dribbling',
    phase: 'ip',
    area: 'Progression',
    options: ['Discourage', 'Balanced', 'Encourage'],
    defaultIndex: 1,
    complexity: 1,
    description: 'Team-wide appetite for carrying the ball at defenders in 1v1 duels rather than releasing early passes.',
    optionNotes: [
      'Discourage: prioritises quick pass circulation over carrying into traffic.',
      'Balanced: carries into open grass and passes when closed down.',
      'Encourage: invites 1v1 take-ons to collapse compact blocks and draw fouls.',
    ],
    pro: 'Encourage breaks low blocks with high Dribbling/Agility/Flair (unlocking FM27 skill moves).',
    con: 'Encouraging weak ball-carriers causes high-danger turnovers and drains stamina.',
    need: { low: ['pas', 'fir', 'tea'], high: ['dri', 'agi', 'fla', 'bal'] },
    src: 'est',
    note: 'Adjusts team-wide ball-carrying frequency.',
  },
  {
    key: 'progress',
    name: 'Progress Through',
    phase: 'ip',
    area: 'Progression',
    options: ['Left', 'Balanced', 'Centre', 'Right'],
    defaultIndex: 1,
    complexity: 0.5,
    description: 'Preferred vertical corridor for advancing possession into the final third.',
    optionNotes: [
      'Left: channels build-up towards the left flank to overload your stronger side.',
      'Balanced: progresses through whichever lane opens naturally.',
      'Centre: narrows build-up slightly to combine through central midfield pockets.',
      'Right: channels progression towards the right touchline and half-space.',
    ],
    pro: 'Concentrates possession towards your best creators or an opponent’s weak side.',
    con: 'Over-focusing one lane becomes predictable and invites targeted pressing traps.',
    need: { low: ['cro', 'dri', 'pac', 'otb'], high: ['pas', 'fir', 'vis', 'dec'] },
    src: 'est',
    note: 'Biases vertical progression corridors.',
  },

  // ── Final Third (5) ─────────────────────────────────────────────────────────
  {
    key: 'patience',
    name: 'Final Third Patience',
    phase: 'ip',
    area: 'Final Third',
    options: ['Hit Early Crosses', 'Balanced', 'Work Ball Into Box'],
    defaultIndex: 1,
    complexity: 1,
    description: 'Deliver early crosses before defenders set, or probe patiently for high-xG chances inside the area.',
    optionNotes: [
      'Hit Early Crosses: whips balls in early to catch high lines before CBs recover.',
      'Balanced: mixes crossing, shooting, and box combinations naturally.',
      'Work Ball Into Box: reduces speculative shots and crosses to manufacture higher-xG openings.',
    ],
    pro: 'Work Ball Into Box raises shot quality; Hit Early Crosses punishes unsettled back lines.',
    con: 'Work Ball Into Box can cause sterile possession against low blocks; Early Crosses wastes ball without box targets.',
    need: { low: ['cro', 'otb', 'ant', 'hea'], high: ['pas', 'fir', 'dec', 'cmp', 'otb'] },
    src: 'est',
    note: 'Balances early delivery urgency against high-xG shot selection.',
  },
  {
    key: 'long_shots',
    name: 'Shots from Distance',
    phase: 'ip',
    area: 'Final Third',
    options: ['Discourage', 'Balanced', 'Encourage'],
    defaultIndex: 1,
    complexity: 0.5,
    description: 'Team-wide appetite for testing the goalkeeper from outside the penalty box.',
    optionNotes: [
      'Discourage: holds off low-percentage long efforts to keep probing.',
      'Balanced: shoots from range when clear sightlines open.',
      'Encourage: forces deep low blocks to step out when you have 15+ Long Shots takers.',
    ],
    pro: 'Encourage punishes ultra-deep blocks that pack the six-yard area.',
    con: 'Poor long shooters waste possession and hand opponents easy restarts.',
    need: { high: ['lon', 'tec', 'cmp'] },
    src: 'est',
    note: 'Adjusts outside-the-box shooting frequency.',
  },
  {
    key: 'crossing',
    name: 'Crossing Style',
    phase: 'ip',
    area: 'Final Third',
    options: ['Low Crosses', 'Balanced', 'Whipped Crosses', 'Floated Crosses'],
    defaultIndex: 1,
    complexity: 0.5,
    description: 'Trajectory and pace of wide deliveries into the penalty area.',
    optionNotes: [
      'Low Crosses: driven hard along the grass for rapid, agile strikers and cut-backs.',
      'Balanced: adapts delivery height to the targets attacking the box.',
      'Whipped Crosses: fast curving balls into the corridor between keeper and CBs.',
      'Floated Crosses: high lofted balls tailored for dominant Jumping Reach targets.',
    ],
    pro: 'Matches delivery flight directly to your box runners’ physical strengths.',
    con: 'Floated Crosses without strong Jumping Reach hand easy claims to the keeper.',
    need: { low: ['pac', 'acc', 'otb', 'ant'], high: ['cro', 'jum', 'hea', 'str'] },
    src: 'est',
    note: 'Aligns crossing trajectory with striker and box-runner profiles.',
  },
  {
    key: 'set_pieces',
    name: 'Play for Set Pieces',
    phase: 'ip',
    area: 'Final Third',
    options: ['Keep Ball in Play', 'Balanced', 'Play for Set Pieces'],
    defaultIndex: 1,
    complexity: 0.5,
    description: 'Whether attackers actively try to win corners and free kicks or keep play moving.',
    optionNotes: [
      'Keep Ball in Play: prioritises open-play rhythm over winning dead balls.',
      'Balanced: standard approach to winning corners and fouls.',
      'Play for Set Pieces: actively seeks corners and wide free kicks to exploit aerial superiority.',
    ],
    pro: 'High leverage when you hold dominant Jumping Reach/Heading targets and elite dead-ball takers.',
    con: 'Slows open-play momentum if your squad lacks aerial dominance.',
    need: { high: ['jum', 'hea', 'str', 'cor', 'fre'] },
    src: 'est',
    note: 'Controls emphasis on winning dead-ball opportunities.',
  },
  {
    key: 'timewaste',
    name: 'Time Wasting',
    phase: 'ip',
    area: 'Final Third',
    options: ['Less', 'Balanced', 'More'],
    defaultIndex: 1,
    complexity: 0.5,
    description: 'Clock-management cadence on restarts and dead balls, layered on top of Mentality.',
    optionNotes: [
      'Less: brisk restarts to maximise remaining play time when chasing a goal.',
      'Balanced: normal restart speed.',
      'More: runs down the clock on throw-ins, goal kicks, and dead balls late in matches.',
    ],
    pro: 'Helps see out narrow leads in the final 10–15 minutes without rushing into errors.',
    con: 'Can draw bookings or kill your own momentum if turned on too early.',
    need: { high: ['cmp', 'cnt', 'dec', 'tea'] },
    src: 'est',
    note: 'Modulates restart speed and game management.',
  },

  // ── Transitions (2) ─────────────────────────────────────────────────────────
  {
    key: 'att_trans',
    name: 'Attacking Transition',
    phase: 'ip',
    area: 'Transitions',
    options: ['Hold Shape', 'Balanced', 'Counter-Attack'],
    defaultIndex: 1,
    complexity: 1,
    description: 'Immediate team behaviour on winning possession: surge vertically on the break or secure shape first.',
    optionNotes: [
      'Hold Shape: secures structure and keeps calm possession after winning the ball.',
      'Balanced: breaks vertically when space is clear and recycles otherwise.',
      'Counter-Attack: triggers immediate forward sprints into open grass on turnovers.',
    ],
    pro: 'Counter-Attack exploits disorganised defences; Hold Shape consolidates possession safely.',
    con: 'Counter-Attack without pace or OOP outlets leads to quick turnovers.',
    need: { low: ['cmp', 'pas', 'fir', 'tea'], high: ['pac', 'acc', 'otb', 'ant'] },
    src: 'est',
    note: 'Governs team reaction in the seconds immediately after ball recovery.',
  },
  {
    key: 'def_trans',
    name: 'Defensive Transition',
    phase: 'oop',
    area: 'Transitions',
    options: ['Regroup', 'Balanced', 'Counter-Press'],
    defaultIndex: 1,
    complexity: 1,
    description: 'Immediate team reaction in the seconds after losing possession.',
    optionNotes: [
      'Regroup: immediately drops into compact defensive shape to deny breaks and save stamina.',
      'Balanced: nearest player delays while teammates recover structure.',
      'Counter-Press: swarms the ball carrier immediately after turnovers to win possession high.',
    ],
    pro: 'Counter-Press traps opponents before they break; Regroup protects depth and stamina.',
    con: 'Counter-Press with Much Wider spacing or tired legs gets sliced straight through.',
    need: { low: ['pos', 'cnt', 'pac'], high: ['wor', 'sta', 'acc', 'tea', 'ant'] },
    src: 'est',
    note: 'Governs team reaction in the seconds immediately after losing possession.',
  },

  // ── Out of Possession (8) ───────────────────────────────────────────────────
  {
    key: 'loe',
    name: 'Line of Engagement',
    phase: 'oop',
    area: 'Out of Possession',
    options: ['Low Block', 'Mid Block', 'High Press'],
    defaultIndex: 1,
    complexity: 1.5,
    description: 'Pitch height where your front line begins engaging the opposition’s build-up.',
    optionNotes: [
      'Low Block: retreats into your own half to stay compact and erase space in behind.',
      'Mid Block: engages around halfway for balanced compactness and counter threat.',
      'High Press: engages deep in the opponent’s half to force errors near their box.',
    ],
    pro: 'High Press wins high-value turnovers; Low Block starves fast attackers of space behind.',
    con: 'Must stay coordinated with Defensive Line; High Press drains FM27 Stamina rapidly.',
    need: { low: ['pos', 'cnt', 'tea', 'mar'], high: ['wor', 'sta', 'acc', 'agg', 'ant'] },
    src: 'est',
    note: 'Sets front-line pressing height (~40 m / 56 m / 72 m on a 105 m pitch).',
  },
  {
    key: 'dline',
    name: 'Defensive Line',
    phase: 'oop',
    area: 'Out of Possession',
    options: ['Much Lower', 'Lower', 'Standard', 'Higher', 'Much Higher'],
    defaultIndex: 2,
    complexity: 1,
    description: 'Height of your back line out of possession; must stay coordinated with your Line of Engagement.',
    optionNotes: [
      'Much Lower (~22 m): defends near your own box, eliminating balls over the top.',
      'Lower (~28 m): cautious depth protecting slower centre-backs.',
      'Standard (~34 m): balanced height between depth protection and compactness.',
      'Higher (~40 m): compresses midfield space to support an active press.',
      'Much Higher (~46 m): aggressive offside-line squeeze requiring rapid CBs and a Sweeper Keeper.',
    ],
    pro: 'High compresses vertical space; Low eliminates balls over the top against pace.',
    con: 'High demands Pace/Acceleration/Anticipation + Sweeper Keeper; Low invites pressure and long shots.',
    need: { low: ['pos', 'cnt', 'jum', 'hea'], high: ['pac', 'acc', 'ant', 'pos'] },
    src: 'est',
    note: 'Sets defensive line depth (~22 m to ~46 m from own goal).',
  },
  {
    key: 'dl_behaviour',
    name: 'Defensive Line Behaviour',
    phase: 'oop',
    area: 'Out of Possession',
    options: ['Drop Off More', 'Balanced', 'Step Up More'],
    defaultIndex: 1,
    complexity: 0.5,
    description: 'Fine-tunes whether the back line drops early to guard depth or steps up aggressively for offside.',
    optionNotes: [
      'Drop Off More: back line retreats earlier when opponents look up to pass in behind.',
      'Balanced: holds the set defensive line without extra stepping or dropping.',
      'Step Up More: squeezes upward aggressively to compress midfield and play for offside.',
    ],
    pro: 'Step Up More keeps high presses tight; Drop Off More neutralises direct balls over the top.',
    con: 'Step Up More with slow or low-Concentration defenders concedes breakaways; Drop Off stretches midfield.',
    need: { low: ['pos', 'cnt', 'jum', 'hea'], high: ['pac', 'acc', 'ant', 'pos', 'cnt'] },
    src: 'est',
    note: 'Fine-tunes back-line stepping vs dropping response.',
  },
  {
    key: 'trigger',
    name: 'Trigger Press',
    phase: 'oop',
    area: 'Out of Possession',
    options: ['Much Less', 'Less', 'Balanced', 'More', 'Much More'],
    defaultIndex: 2,
    complexity: 1,
    description: 'How eagerly players leave their zone to close down the ball carrier, stacked on top of Mentality.',
    optionNotes: [
      'Much Less: holds zonal shape strictly and preserves stamina.',
      'Less: disciplined block that waits for opponents to enter congested zones.',
      'Balanced: standard closing-down trigger radius.',
      'More: proactive pressing jumping earlier onto receivers.',
      'Much More: maximum closing-down aggression with steep FM27 stamina cost.',
    ],
    pro: 'More forces rushed errors and high recoveries; Less keeps block integrity intact.',
    con: 'Stacking Attacking Mentality + Much More Trigger Press drags defenders out of shape if Teamwork lags.',
    need: { low: ['pos', 'cnt', 'dec'], high: ['wor', 'sta', 'agg', 'ant', 'tea'] },
    src: 'est',
    note: 'Multiplies closing-down trigger radius relative to Team Mentality.',
  },
  {
    key: 'tackling',
    name: 'Tackling',
    phase: 'oop',
    area: 'Out of Possession',
    options: ['Stay On Feet', 'Balanced', 'Get Stuck In'],
    defaultIndex: 1,
    complexity: 0.5,
    description: 'Team-wide duel commitment when challenging ball carriers.',
    optionNotes: [
      'Stay On Feet: jockeys goal-side to avoid fouls, bookings, and getting beaten by dribblers.',
      'Balanced: standard tackling commitment.',
      'Get Stuck In: commits forcefully into duels to win loose balls and disrupt technical sides.',
    ],
    pro: 'Get Stuck In disrupts smooth passers; Stay On Feet protects against cards and penalties.',
    con: 'Get Stuck In with weak Tackling/Decisions creates dangerous free kicks and red-card trouble.',
    need: { low: ['pos', 'mar', 'ant', 'dec'], high: ['tck', 'agg', 'bra', 'str'] },
    src: 'est',
    note: 'Adjusts team-wide tackle commitment and foul risk.',
  },
  {
    key: 'press_trap',
    name: 'Pressing Trap',
    phase: 'oop',
    area: 'Out of Possession',
    options: ['Inside', 'Balanced', 'Outside'],
    defaultIndex: 1,
    complexity: 1,
    description: 'Angles your pressing block to funnel opposing progression towards the touchline or into central congestion.',
    optionNotes: [
      'Inside: wide players stay broader to herd opponents into a dominant central midfield.',
      'Balanced: neutral channel defence without directional funneling.',
      'Outside: uses the touchline as an extra defender; pair with Pressing Full-Backs or Tracking Wingers.',
    ],
    pro: 'Outside pins carriers against the sideline; Inside leverages a dominant midfield trio.',
    con: 'Outside leaks wide space without Pressing FBs/TWs; Inside exposes Zone 14 if midfield loses duels.',
    need: { low: ['tck', 'pos', 'ant', 'tea'], high: ['wor', 'sta', 'acc', 'agg', 'tea'] },
    src: 'est',
    note: 'Steers opponent build-up towards touchlines or central congestion.',
  },
  {
    key: 'cross_eng',
    name: 'Cross Engagement',
    phase: 'oop',
    area: 'Out of Possession',
    options: ['Invite Crosses', 'Balanced', 'Stop Crosses'],
    defaultIndex: 1,
    complexity: 0.5,
    description: 'Whether wide defenders stay narrow to protect the box or step out aggressively to block deliveries.',
    optionNotes: [
      'Invite Crosses: tucks full-backs narrow to protect Zone 14 when CBs dominate in the air.',
      'Balanced: contests wide deliveries without vacating the back post.',
      'Stop Crosses: full-backs/wing-backs engage early to block crosses and shield shorter CBs.',
    ],
    pro: 'Invite Crosses pairs with giant aerial CBs; Stop Crosses shields shorter back lines.',
    con: 'Invite Crosses concedes headers if CBs lack Jumping Reach; Stop Crosses opens inside lanes if beaten 1v1.',
    need: { low: ['jum', 'hea', 'pos', 'str'], high: ['acc', 'agi', 'tck', 'mar', 'sta'] },
    src: 'est',
    note: 'Controls wide defender stepping vs tucking behaviour against crossers.',
  },
  {
    key: 'short_gk',
    name: 'Short Goalkeeper Distribution',
    phase: 'oop',
    area: 'Out of Possession',
    options: ['Allow', 'Press'],
    defaultIndex: 0,
    complexity: 0.5,
    description: 'Instructs forwards to close down the opposing goalkeeper’s short distribution from goal kicks.',
    optionNotes: [
      'Allow: forwards hold the Line of Engagement instead of chasing the opposing keeper.',
      'Press: forwards push onto the keeper and CBs to force hurried long clearances.',
    ],
    pro: 'Pressing short GK distribution disrupts possession teams before they settle.',
    con: 'Commits forwards high, drains Stamina, and opens space behind if played through.',
    need: { high: ['wor', 'sta', 'acc', 'ant', 'agg'] },
    src: 'est',
    note: 'Controls forward engagement on opposing goalkeeper restarts.',
  },
] as const;

export const TI_BY_KEY: Record<TIKey, TeamInstructionDef> = Object.fromEntries(
  TEAM_INSTRUCTIONS.map((ti) => [ti.key, ti]),
) as Record<TIKey, TeamInstructionDef>;

export const TI_DEFAULTS: Record<TIKey, number> = Object.fromEntries(
  TEAM_INSTRUCTIONS.map((ti) => [ti.key, ti.defaultIndex]),
) as Record<TIKey, number>;

// ── Player Instructions (24) ──────────────────────────────────────────────────

export type PIFamily =
  | 'Shooting'
  | 'Dribbling'
  | 'Passing'
  | 'Crossing'
  | 'Movement'
  | 'Pressing'
  | 'Defending'
  | 'Box (FM27)';

export type PIKey =
  | 'shoot_more'
  | 'shoot_less'
  | 'dribble_more'
  | 'dribble_less'
  | 'take_more_risks'
  | 'take_fewer_risks'
  | 'cross_from_byline'
  | 'cross_from_deep'
  | 'roam_from_position'
  | 'stay_wider'
  | 'sit_narrower'
  | 'hold_position'
  | 'get_further_forward'
  | 'move_into_channels'
  | 'press_more'
  | 'press_less'
  | 'mark_tighter'
  | 'tackle_harder'
  | 'ease_off_tackles'
  | 'arrive_late'
  | 'attack_the_defensive_line'
  | 'target_near_post'
  | 'target_centre'
  | 'target_far_post';

export interface PlayerInstructionDef {
  key: PIKey;
  name: string;
  phase: 'ip' | 'oop';
  family: PIFamily;
  description: string;
  tip: string;
  allowedGroups: readonly PositionGroup[];
  need: readonly AttrKey[];
  incompatibleWith: readonly PIKey[];
  fm27: boolean;
  src: 'conf' | 'est';
  note: string;
}

const OUTFIELD: readonly PositionGroup[] = [
  'DC',
  'D_LR',
  'WB_LR',
  'DM',
  'MC',
  'M_LR',
  'AMC',
  'AM_LR',
  'ST',
];

const ALL_POSITIONS: readonly PositionGroup[] = ['GK', ...OUTFIELD];

export const PLAYER_INSTRUCTIONS: readonly PlayerInstructionDef[] = [
  {
    key: 'shoot_more',
    name: 'Shoot More',
    phase: 'ip',
    family: 'Shooting',
    description: 'Encourages earlier and more frequent shots, including strikes from outside the penalty area.',
    tip: 'Use on 15+ Long Shots takers with strong Technique and Composure against packed low blocks.',
    allowedGroups: OUTFIELD,
    need: ['lon', 'fin', 'tec', 'cmp'],
    incompatibleWith: ['shoot_less'],
    fm27: false,
    src: 'est',
    note: 'Raises individual shooting bias.',
  },
  {
    key: 'shoot_less',
    name: 'Shoot Less',
    phase: 'ip',
    family: 'Shooting',
    description: 'Instructs the player to pass up low-percentage shots and look for a better-positioned teammate.',
    tip: 'Ideal for midfielders or wide players with weak Long Shots or Finishing who waste attacks.',
    allowedGroups: OUTFIELD,
    need: ['pas', 'dec', 'tea', 'vis'],
    incompatibleWith: ['shoot_more'],
    fm27: false,
    src: 'est',
    note: 'Lowers individual shooting bias.',
  },
  {
    key: 'dribble_more',
    name: 'Dribble More',
    phase: 'ip',
    family: 'Dribbling',
    description: 'Tells the player to carry aggressively into space and beat markers in 1v1 duels.',
    tip: 'Requires high Dribbling, Agility, Balance, and Acceleration; unlocks FM27 1v1 skill moves with Flair.',
    allowedGroups: OUTFIELD,
    need: ['dri', 'agi', 'bal', 'fla', 'acc'],
    incompatibleWith: ['dribble_less'],
    fm27: false,
    src: 'est',
    note: 'Raises individual ball-carrying bias.',
  },
  {
    key: 'dribble_less',
    name: 'Dribble Less',
    phase: 'ip',
    family: 'Dribbling',
    description: 'Encourages releasing passes quickly rather than carrying the ball into traffic.',
    tip: 'Best for limited ball-carriers in deep build-up zones where losing a 1v1 concedes a break.',
    allowedGroups: OUTFIELD,
    need: ['pas', 'fir', 'dec', 'tea'],
    incompatibleWith: ['dribble_more'],
    fm27: false,
    src: 'est',
    note: 'Lowers individual ball-carrying bias.',
  },
  {
    key: 'take_more_risks',
    name: 'Take More Risks',
    phase: 'ip',
    family: 'Passing',
    description: 'Authorises line-breaking through-balls, diagonal switches, and ambitious killer passes.',
    tip: 'Requires Passing and Vision ≥ 15 plus strong Decisions and Composure.',
    allowedGroups: ALL_POSITIONS,
    need: ['pas', 'vis', 'dec', 'tec', 'cmp'],
    incompatibleWith: ['take_fewer_risks'],
    fm27: false,
    src: 'est',
    note: 'Raises through-ball and passing risk appetite.',
  },
  {
    key: 'take_fewer_risks',
    name: 'Take Fewer Risks',
    phase: 'ip',
    family: 'Passing',
    description: 'Restricts the player to high-percentage, safe passes that retain possession.',
    tip: 'Use on centre-backs, holding DMs, or full-backs with modest Passing/Vision to cut build-up turnovers.',
    allowedGroups: ALL_POSITIONS,
    need: ['cmp', 'dec', 'pas', 'cnt'],
    incompatibleWith: ['take_more_risks'],
    fm27: false,
    src: 'est',
    note: 'Lowers passing risk and reinforces safe recycling.',
  },
  {
    key: 'cross_from_byline',
    name: 'Cross From Byline',
    phase: 'ip',
    family: 'Crossing',
    description: 'Drives all the way to the byline before delivering a cut-back or cross, pinning the defence deep.',
    tip: 'Suits rapid wingers and overlapping wing-backs with high Acceleration, Dribbling, and Crossing.',
    allowedGroups: ['D_LR', 'WB_LR', 'M_LR', 'AM_LR'],
    need: ['cro', 'acc', 'pac', 'dri', 'agi'],
    incompatibleWith: ['cross_from_deep'],
    fm27: false,
    src: 'est',
    note: 'Delays wide deliveries until reaching deep byline zones.',
  },
  {
    key: 'cross_from_deep',
    name: 'Cross From Deep',
    phase: 'ip',
    family: 'Crossing',
    description: 'Encourages early crosses from deeper wide zones before the opposing back line settles.',
    tip: 'Strong on full-backs, wing-backs, or inside wingers with high Crossing and Vision.',
    allowedGroups: ['D_LR', 'WB_LR', 'M_LR', 'AM_LR'],
    need: ['cro', 'vis', 'tec', 'dec'],
    incompatibleWith: ['cross_from_byline'],
    fm27: false,
    src: 'est',
    note: 'Triggers earlier wide deliveries from deeper zones.',
  },
  {
    key: 'roam_from_position',
    name: 'Roam From Position',
    phase: 'ip',
    family: 'Movement',
    description: 'Grants freedom to drift away from the assigned slot towards the ball or open pockets.',
    tip: 'Needs high Off the Ball, Decisions, and Vision; raises Tactical Complexity and needs cover nearby.',
    allowedGroups: ['DM', 'MC', 'M_LR', 'AMC', 'AM_LR', 'ST'],
    need: ['otb', 'dec', 'ant', 'vis', 'sta'],
    incompatibleWith: ['hold_position'],
    fm27: false,
    src: 'est',
    note: 'Increases ball-side roaming freedom in possession.',
  },
  {
    key: 'stay_wider',
    name: 'Stay Wider',
    phase: 'ip',
    family: 'Movement',
    description: 'Pins the player closer to the touchline in possession to stretch the defence horizontally.',
    tip: 'Ideal for balancing asymmetric flanks or opening interior half-spaces for a Channel Midfielder.',
    allowedGroups: ['DC', 'D_LR', 'WB_LR', 'MC', 'M_LR', 'AMC', 'AM_LR', 'ST'],
    need: ['cro', 'dri', 'otb', 'pac'],
    incompatibleWith: ['sit_narrower'],
    fm27: false,
    src: 'est',
    note: 'Shifts in-possession lane outward towards the touchline.',
  },
  {
    key: 'sit_narrower',
    name: 'Sit Narrower',
    phase: 'ip',
    family: 'Movement',
    description: 'Tucks a wide player inward into the half-space to create central overloads and open the overlap.',
    tip: 'Pair with an attacking Wing-Back or Advanced Wing-Back behind so the flank keeps width.',
    allowedGroups: ['D_LR', 'WB_LR', 'M_LR', 'AM_LR'],
    need: ['fir', 'pas', 'otb', 'dec', 'tec'],
    incompatibleWith: ['stay_wider'],
    fm27: false,
    src: 'est',
    note: 'Shifts in-possession lane inward towards the half-space.',
  },
  {
    key: 'hold_position',
    name: 'Hold Position',
    phase: 'ip',
    family: 'Movement',
    description: 'Anchors the player in his tactical zone during attacks instead of making forward runs.',
    tip: 'Directly reinforces rest-defence (target 3–5 players behind the ball in Positive/Attacking systems).',
    allowedGroups: ['DC', 'D_LR', 'WB_LR', 'DM', 'MC', 'M_LR', 'AMC', 'AM_LR'],
    need: ['pos', 'cnt', 'dec', 'ant', 'tea'],
    incompatibleWith: [
      'get_further_forward',
      'arrive_late',
      'move_into_channels',
      'roam_from_position',
      'attack_the_defensive_line',
      'target_near_post',
      'target_centre',
      'target_far_post',
    ],
    fm27: false,
    src: 'est',
    note: 'Suppresses forward runs to anchor rest-defence.',
  },
  {
    key: 'get_further_forward',
    name: 'Get Further Forward',
    phase: 'ip',
    family: 'Movement',
    description: 'Pushes the player aggressively into advanced progression and final-third zones earlier.',
    tip: 'Requires Stamina, Work Rate, and Off the Ball; verify another teammate covers the space left behind.',
    allowedGroups: ['DC', 'D_LR', 'WB_LR', 'DM', 'MC', 'M_LR', 'AMC', 'AM_LR'],
    need: ['otb', 'sta', 'wor', 'acc', 'ant'],
    incompatibleWith: ['hold_position'],
    fm27: false,
    src: 'est',
    note: 'Advances in-possession target depth upfield.',
  },
  {
    key: 'move_into_channels',
    name: 'Move Into Channels',
    phase: 'ip',
    family: 'Movement',
    description: 'Directs diagonal runs into the gap between opposing centre-back and full-back.',
    tip: 'Lethal on quick strikers or AMs facing high lines, opening central lanes for a Second Striker.',
    allowedGroups: ['MC', 'AMC', 'AM_LR', 'ST'],
    need: ['otb', 'acc', 'pac', 'ant', 'dri'],
    incompatibleWith: ['hold_position'],
    fm27: false,
    src: 'est',
    note: 'Adds diagonal runs into the CB–FB channel.',
  },
  {
    key: 'press_more',
    name: 'Press More',
    phase: 'oop',
    family: 'Pressing',
    description: 'Widens the player’s pressing trigger beyond the team baseline to close down carriers sooner.',
    tip: 'Needs Work Rate, Stamina, Acceleration, and Teamwork; monitor FM27 stamina drain late on.',
    allowedGroups: OUTFIELD,
    need: ['wor', 'sta', 'agg', 'acc', 'ant', 'tea'],
    incompatibleWith: ['press_less'],
    fm27: false,
    src: 'est',
    note: 'Expands individual pressing trigger radius.',
  },
  {
    key: 'press_less',
    name: 'Press Less',
    phase: 'oop',
    family: 'Pressing',
    description: 'Shrinks the player’s pressing radius so he holds his defensive zone and conserves stamina.',
    tip: 'Ideal for ageing creators or a holding DM who must never be dragged out of Zone 14.',
    allowedGroups: OUTFIELD,
    need: ['pos', 'cnt', 'dec'],
    incompatibleWith: ['press_more'],
    fm27: false,
    src: 'est',
    note: 'Shrinks individual pressing trigger radius to protect shape and stamina.',
  },
  {
    key: 'mark_tighter',
    name: 'Mark Tighter',
    phase: 'oop',
    family: 'Defending',
    description: 'Reduces the cushion given to nearby opponents out of possession to deny turning space.',
    tip: 'Needs Marking ≥ 15, Anticipation, and Agility; never use against rapid forwards who spin in behind.',
    allowedGroups: OUTFIELD,
    need: ['mar', 'ant', 'cnt', 'agi', 'acc'],
    incompatibleWith: [],
    fm27: false,
    src: 'est',
    note: 'Tightens individual marking cushion out of possession.',
  },
  {
    key: 'tackle_harder',
    name: 'Tackle Harder',
    phase: 'oop',
    family: 'Defending',
    description: 'Increases duel commitment to win possession forcefully at a higher foul and card risk.',
    tip: 'Best for strong ball-winners with high Tackling and Decisions; turn off immediately once booked.',
    allowedGroups: OUTFIELD,
    need: ['tck', 'agg', 'bra', 'str', 'dec'],
    incompatibleWith: ['ease_off_tackles'],
    fm27: false,
    src: 'est',
    note: 'Raises individual tackle commitment.',
  },
  {
    key: 'ease_off_tackles',
    name: 'Ease Off Tackles',
    phase: 'oop',
    family: 'Defending',
    description: 'Instructs the player to stay on his feet and jockey rather than diving into challenges.',
    tip: 'Essential for booked defenders, weak tacklers, or anyone facing elite agile dribblers.',
    allowedGroups: OUTFIELD,
    need: ['pos', 'ant', 'cnt', 'dec'],
    incompatibleWith: ['tackle_harder'],
    fm27: false,
    src: 'est',
    note: 'Lowers individual tackle commitment to reduce fouls and cards.',
  },
  {
    key: 'arrive_late',
    name: 'Arrive Late',
    phase: 'ip',
    family: 'Box (FM27)',
    description: 'Delays the player’s box surge until defenders drop deep, arriving unmarked as a second wave.',
    tip: 'Ideal for Box-to-Box, Attacking, and Channel Midfielders with high Off the Ball and Anticipation.',
    allowedGroups: ['DM', 'MC', 'M_LR', 'AMC', 'AM_LR'],
    need: ['otb', 'ant', 'sta', 'fin', 'dec'],
    incompatibleWith: ['hold_position', 'attack_the_defensive_line'],
    fm27: true,
    src: 'est',
    note: 'FM27 Box-Attacking depth/timing PI: delays box entry for cut-backs and second balls.',
  },
  {
    key: 'attack_the_defensive_line',
    name: 'Attack the Defensive Line',
    phase: 'ip',
    family: 'Box (FM27)',
    description: 'Pins the shoulder of the last defender to threaten vertical runs in behind and stretch the line.',
    tip: 'Best for rapid Poachers, Channel Forwards, and Inside Forwards with high Acceleration and Off the Ball.',
    allowedGroups: ['M_LR', 'AMC', 'AM_LR', 'ST'],
    need: ['otb', 'ant', 'acc', 'pac', 'cmp'],
    incompatibleWith: ['hold_position', 'arrive_late'],
    fm27: true,
    src: 'est',
    note: 'FM27 Box-Attacking depth/timing PI: pins last defender and bursts in behind.',
  },
  {
    key: 'target_near_post',
    name: 'Target Near Post',
    phase: 'ip',
    family: 'Box (FM27)',
    description: 'Directs box runs towards the near-post corridor to dart across defenders onto early or whipped crosses.',
    tip: 'Suits sharp Poachers or front-post strikers with high Anticipation, Acceleration, and Off the Ball.',
    allowedGroups: ['MC', 'M_LR', 'AMC', 'AM_LR', 'ST'],
    need: ['ant', 'otb', 'acc', 'fin'],
    incompatibleWith: ['target_centre', 'target_far_post', 'hold_position'],
    fm27: true,
    src: 'est',
    note: 'FM27 Box-Attacking target-zone PI: attacks the near-post corridor.',
  },
  {
    key: 'target_centre',
    name: 'Target Centre',
    phase: 'ip',
    family: 'Box (FM27)',
    description: 'Directs box movement towards the central penalty-spot zone for aerial balls and cut-backs.',
    tip: 'Best for Target Forwards, Centre Forwards, or tall AMs with high Jumping Reach and Heading.',
    allowedGroups: ['MC', 'M_LR', 'AMC', 'AM_LR', 'ST'],
    need: ['jum', 'hea', 'str', 'otb', 'ant'],
    incompatibleWith: ['target_near_post', 'target_far_post', 'hold_position'],
    fm27: true,
    src: 'est',
    note: 'FM27 Box-Attacking target-zone PI: attacks the central penalty-spot zone.',
  },
  {
    key: 'target_far_post',
    name: 'Target Far Post',
    phase: 'ip',
    family: 'Box (FM27)',
    description: 'Ghosts onto the back post on crosses to exploit blind-side mismatches against the opposing full-back.',
    tip: 'Lethal on far-side Wide Forwards, Inside Forwards, or tall wingers with strong Off the Ball and Jumping Reach.',
    allowedGroups: ['MC', 'M_LR', 'AMC', 'AM_LR', 'ST'],
    need: ['otb', 'ant', 'jum', 'hea', 'fin'],
    incompatibleWith: ['target_near_post', 'target_centre', 'hold_position'],
    fm27: true,
    src: 'est',
    note: 'FM27 Box-Attacking target-zone PI: attacks the blind-side far post.',
  },
] as const;

export const PI_BY_KEY: Record<PIKey, PlayerInstructionDef> = Object.fromEntries(
  PLAYER_INSTRUCTIONS.map((pi) => [pi.key, pi]),
) as Record<PIKey, PlayerInstructionDef>;

// ── Mentalities (7) ───────────────────────────────────────────────────────────

export interface MentalityDef {
  index: number;
  name: string;
  summary: string;
  whenToUse: string;
  /** Relative baseline shifts (-3 Very Defensive .. +3 Very Attacking, scaled to clean -1..+1 deltas). */
  shifts: {
    risk: number;
    tempo: number;
    directness: number;
    width: number;
    line: number;
    pressing: number;
  };
  src: 'conf' | 'est';
  note: string;
}

export const MENTALITIES: readonly MentalityDef[] = [
  {
    index: 0,
    name: 'Very Defensive',
    summary: 'Very deep block, minimum risk, slow restarts, and locked-in rest-defence.',
    whenToUse: 'Protecting a narrow lead in the closing minutes or surviving heavily outmatched away fixtures.',
    shifts: { risk: -0.9, tempo: -0.75, directness: -0.45, width: -0.6, line: -0.9, pressing: -0.75 },
    src: 'est',
    note: 'Relative baseline multiplier below Balanced; Team Instructions stack on top.',
  },
  {
    index: 1,
    name: 'Defensive',
    summary: 'Prioritises block solidity, deeper lines, and cautious transition risk.',
    whenToUse: 'Away underdog fixtures and disciplined low-block counter-attacking game plans.',
    shifts: { risk: -0.6, tempo: -0.5, directness: -0.3, width: -0.4, line: -0.6, pressing: -0.5 },
    src: 'est',
    note: 'Relative baseline multiplier below Balanced; Team Instructions stack on top.',
  },
  {
    index: 2,
    name: 'Cautious',
    summary: 'Prudent, measured possession with slightly deeper lines and patient progression.',
    whenToUse: 'Tough away matches or controlling tempo against aggressive counter-attacking opponents.',
    shifts: { risk: -0.3, tempo: -0.25, directness: -0.15, width: -0.2, line: -0.3, pressing: -0.25 },
    src: 'est',
    note: 'Relative baseline multiplier below Balanced; Team Instructions stack on top.',
  },
  {
    index: 3,
    name: 'Balanced',
    summary: 'Neutral baseline across risk, tempo, width, and lines — roles and instructions define team character.',
    whenToUse: 'Default starting point for evenly matched fixtures or cleanly testing role/TI changes.',
    shifts: { risk: 0, tempo: 0, directness: 0, width: 0, line: 0, pressing: 0 },
    src: 'est',
    note: 'Neutral 0-offset baseline of the Mentality Ladder.',
  },
  {
    index: 4,
    name: 'Positive',
    summary: 'Proactive without extremes: pushes lines up, lifts tempo slightly, and encourages controlled risk.',
    whenToUse: 'Ideal default for favourites, home fixtures, and front-foot possession or pressing systems.',
    shifts: { risk: 0.3, tempo: 0.25, directness: 0.15, width: 0.2, line: 0.3, pressing: 0.25 },
    src: 'est',
    note: 'Relative baseline multiplier above Balanced; Team Instructions stack on top.',
  },
  {
    index: 5,
    name: 'Attacking',
    summary: 'Higher tempo, wider spacing, aggressive forward runs, and steeper defensive-line risk.',
    whenToUse: 'Breaking down weaker sides or chasing a match — verify your 3–5 man rest-defence.',
    shifts: { risk: 0.6, tempo: 0.5, directness: 0.3, width: 0.4, line: 0.6, pressing: 0.5 },
    src: 'est',
    note: 'Relative baseline multiplier above Balanced; Team Instructions stack on top.',
  },
  {
    index: 6,
    name: 'Very Attacking',
    summary: 'All-out forward push with maximum risk, high tempo, and heavily exposed transitions.',
    whenToUse: 'Final 10–15 minutes when chasing an equaliser or knockout winner.',
    shifts: { risk: 0.9, tempo: 0.75, directness: 0.45, width: 0.6, line: 0.9, pressing: 0.75 },
    src: 'est',
    note: 'Relative baseline multiplier above Balanced; Team Instructions stack on top.',
  },
] as const;

// ── Curated FM27 Tactical Blueprints (6) ──────────────────────────────────────

export interface TacticalPreset {
  id: string;
  name: string;
  style: string;
  summary: string;
  watchFor: readonly string[];
  ipFormation: string;
  oopFormation: string;
  mentality: number;
  tis: Partial<Record<TIKey, number>>;
  ipRoles: Record<string, string>;
  oopRoles: Record<string, string>;
  pis: Record<string, PIKey[]>;
}

export const TACTICAL_PRESETS: readonly TacticalPreset[] = [
  {
    id: 'high-press-433',
    name: 'High-Press 4-3-3',
    style: 'High Press',
    summary:
      'Front-foot 4-3-3 in possession that collapses into a compact, outside-trapping 4-1-4-1 press without the ball.',
    watchFor: [
      'Tight vertical gap between High Press LoE and Higher/Much Higher Defensive Line with Step Up More',
      'Sweeper Keeper positioned high to sweep balls played over the top',
      'Outside pressing trap funneling passes towards Pressing Full-Backs and Tracking Wide Midfielders',
      'Asymmetric rest-defence (left Wing-Back high, right Inside Full-Back tucked beside the CBs)',
    ],
    ipFormation: '4-3-3 DM Wide',
    oopFormation: '4-1-4-1 DM Wide',
    mentality: 4,
    tis: {
      loe: 2,
      dline: 4,
      dl_behaviour: 2,
      trigger: 3,
      def_trans: 2,
      press_trap: 2,
      short_gk: 1,
      tempo: 3,
      att_trans: 2,
      passing: 1,
      buildup: 0,
    },
    ipRoles: {
      GK: 'bpgk',
      DL: 'wb_ip',
      DCL: 'bpcb',
      DCR: 'cb_ip',
      DR: 'ifb',
      DM: 'dm_ip',
      MCL: 'chm',
      MCR: 'mp',
      AML: 'if_ip',
      AMR: 'w_ip',
      ST: 'cf_ip',
    },
    oopRoles: {
      GK: 'swk',
      DL: 'pfb',
      DCL: 'scb',
      DCR: 'ccb',
      DR: 'pfb',
      DM: 'sdm',
      ML: 'twm',
      MCL: 'pcm',
      MCR: 'wccm',
      MR: 'twm',
      ST: 'tcf',
    },
    pis: {
      ST: ['press_more', 'attack_the_defensive_line'],
      MCL: ['arrive_late'],
      DM: ['hold_position'],
    },
  },
  {
    id: 'positional-325',
    name: 'Positional 3-2-5',
    style: 'Positional Play',
    summary:
      '4-3-3 morphing into a 3-2-5 build-up using an Inside Full-Back, an Inside Wing-Back, and a dropping False Nine.',
    watchFor: [
      'Clean 3-2 rest-defence formed by IFB + two CBs behind DLP + IWB',
      'Right IWB inverting beside the DLP while AML/AMR hold touchline width',
      'False Nine dropping between the lines while Channel Midfielder, AM, and Wide Forward attack the box',
      'Play Through Press + Pass to Feet enabling calm short progression from the BPGK',
    ],
    ipFormation: '4-3-3 DM Wide',
    oopFormation: '4-1-4-1 DM Wide',
    mentality: 4,
    tis: {
      buildup: 0,
      passing: 1,
      tempo: 1,
      width: 3,
      patience: 2,
      reception: 2,
      gk_target: 0,
      loe: 2,
      dline: 3,
      def_trans: 2,
    },
    ipRoles: {
      GK: 'bpgk',
      DL: 'ifb',
      DCL: 'bpcb',
      DCR: 'cb_ip',
      DR: 'iwb',
      DM: 'dlp',
      MCL: 'chm',
      MCR: 'am_ip',
      AML: 'w_ip',
      AMR: 'wf_ip',
      ST: 'f9',
    },
    oopRoles: {
      GK: 'swk',
      DL: 'hfb',
      DCL: 'cb_oop',
      DCR: 'ccb',
      DR: 'fb_oop',
      DM: 'sdm',
      ML: 'twm',
      MCL: 'cm_oop',
      MCR: 'pcm',
      MR: 'twm',
      ST: 'cf_oop',
    },
    pis: {
      DR: ['hold_position'],
      AMR: ['target_far_post'],
      MCR: ['arrive_late'],
    },
  },
  {
    id: 'counter-442',
    name: 'Counter 4-4-2',
    style: 'Direct Counter',
    summary:
      'Disciplined two-banks-of-four mid block that springs rapid vertical transitions into a complementary strike pair.',
    watchFor: [
      'Compact 4-4-2 mid block with Screening CM and Tracking Wide Midfielders closing central lanes',
      'Target Forward winning aerial flick-ons for a rapid Channel Forward attacking depth',
      'More Direct Passing + Counter-Attack + Pass into Space turning turnovers into immediate chances',
      'Low Tactical Complexity so squads achieve high FM27 Tactical Understanding quickly',
    ],
    ipFormation: '4-4-2',
    oopFormation: '4-4-2',
    mentality: 3,
    tis: {
      passing: 3,
      tempo: 3,
      att_trans: 2,
      reception: 0,
      patience: 0,
      loe: 1,
      dline: 2,
      def_trans: 0,
      press_trap: 2,
    },
    ipRoles: {
      GK: 'gk_ip',
      DL: 'fb_ip',
      DCL: 'cb_ip',
      DCR: 'bpcb',
      DR: 'wb_ip',
      ML: 'w_ip',
      MCL: 'cm_ip',
      MCR: 'b2b',
      MR: 'iw_ip',
      STL: 'tf',
      STR: 'chf',
    },
    oopRoles: {
      GK: 'gk_oop',
      DL: 'hfb',
      DCL: 'scb',
      DCR: 'ccb',
      DR: 'fb_oop',
      ML: 'twm',
      MCL: 'scm',
      MCR: 'cm_oop',
      MR: 'twm',
      STL: 'cf_oop',
      STR: 'socf',
    },
    pis: {
      STL: ['target_centre'],
      STR: ['attack_the_defensive_line', 'move_into_channels'],
      MCL: ['hold_position'],
      MCR: ['arrive_late'],
    },
  },
  {
    id: 'low-block-541',
    name: 'Low-Block 5-4-1',
    style: 'Low Block',
    summary:
      'Deep 5-4-1 defensive shell that erases space in behind and breaks into a 3-4-3 through two high Outlets.',
    watchFor: [
      'Compact 5-4-1 shell with Much Lower Defensive Line + Drop Off More protecting depth',
      'Line-Holding Goalkeeper anchored to the six-yard box',
      'Exactly two OOP Outlets (SOCF + WOWM) staying high for rapid vertical releases',
      'Bypass Press + Distribute Quickly launching transitions straight into open channels',
    ],
    ipFormation: '3-4-3',
    oopFormation: '5-4-1',
    mentality: 1,
    tis: {
      loe: 0,
      dline: 0,
      dl_behaviour: 0,
      trigger: 1,
      def_trans: 0,
      cross_eng: 0,
      passing: 3,
      tempo: 4,
      att_trans: 2,
      buildup: 2,
      reception: 0,
      gk_target: 5,
      gk_speed: 2,
    },
    ipRoles: {
      GK: 'nngk',
      DCL: 'nncb',
      DC: 'cb_ip',
      DCR: 'nncb',
      WBL: 'wb_ip',
      MCL: 'cm_ip',
      MCR: 'cm_ip',
      WBR: 'wb_ip',
      AML: 'w_ip',
      AMR: 'if_ip',
      ST: 'chf',
    },
    oopRoles: {
      GK: 'lhk',
      WBL: 'hwb',
      DCL: 'cwcb',
      DC: 'ccb',
      DCR: 'cwcb',
      WBR: 'hwb',
      ML: 'wowm',
      MCL: 'scm',
      MCR: 'scm',
      MR: 'twm',
      ST: 'socf',
    },
    pis: {
      ST: ['attack_the_defensive_line', 'move_into_channels'],
      AML: ['stay_wider'],
    },
  },
  {
    id: 'asymmetric-4231',
    name: 'Asymmetric 4-2-3-1',
    style: 'FM27 Box Attack',
    summary:
      'Coordinates all five FM27 Box-Attacking PIs across Near Post, Centre, Far Post, and Late-Wave runners over a 3+1 rest-defence.',
    watchFor: [
      'Staggered box occupation: Near (ST), Centre (AMC), Far (AMR), and Late Wave (DML)',
      'Left Wing-Back overlapping outside the Inside Winger while right IFB forms a back three',
      '4-man rest-defence (IFB + two CBs + holding DMR) staying secure behind every cross',
      'Morphs into a disciplined 4-4-2 DM Wide out of possession to press opposing build-up with two forwards',
    ],
    ipFormation: '4-2-3-1 DM Wide',
    oopFormation: '4-4-2 DM Wide',
    mentality: 4,
    tis: {
      support_runs: 2,
      crossing: 2,
      creative: 2,
      reception: 0,
      tempo: 3,
      loe: 2,
      dline: 3,
      def_trans: 2,
    },
    ipRoles: {
      GK: 'bpgk',
      DL: 'wb_ip',
      DCL: 'bpcb',
      DCR: 'cb_ip',
      DR: 'ifb',
      DML: 'b2b',
      DMR: 'dm_ip',
      AML: 'iw_ip',
      AMC: 'am_ip',
      AMR: 'wf_ip',
      ST: 'poa',
    },
    oopRoles: {
      GK: 'swk',
      DL: 'fb_oop',
      DCL: 'cb_oop',
      DCR: 'ccb',
      DR: 'hfb',
      DML: 'pdm',
      DMR: 'sdm',
      ML: 'twm',
      MR: 'twm',
      STL: 'tcf',
      STR: 'cf_oop',
    },
    pis: {
      ST: ['attack_the_defensive_line', 'target_near_post'],
      AMC: ['target_centre'],
      AMR: ['target_far_post'],
      DML: ['arrive_late'],
      DMR: ['hold_position'],
    },
  },
  {
    id: 'direct-352',
    name: 'Direct 3-5-2',
    style: 'Wing-Back Overloads',
    summary:
      'Back-three vertical 3-5-2 unleashing dual wing-backs and a Channel Midfielder behind a Target + Poacher front two.',
    watchFor: [
      'Dual Wing-Backs stretching the entire pitch to Wider width while three CBs + DLP lock rest-defence',
      'Target Forward anchoring central crosses while Poacher attacks the defensive line and near post',
      'Drops into a resilient 5-3-2 WB block out of possession with Wide Covering CMs protecting the flanks',
      'Hit Early Crosses + Whipped Crosses punishing teams before their midfield recovers',
    ],
    ipFormation: '3-5-2',
    oopFormation: '5-3-2 WB',
    mentality: 4,
    tis: {
      passing: 3,
      tempo: 3,
      width: 3,
      patience: 0,
      crossing: 2,
      att_trans: 2,
      loe: 1,
      dline: 2,
      press_trap: 2,
    },
    ipRoles: {
      GK: 'gk_ip',
      DCL: 'bpcb',
      DC: 'cb_ip',
      DCR: 'ocb',
      WBL: 'awb',
      DM: 'dlp',
      MCL: 'chm',
      MCR: 'cm_ip',
      WBR: 'pwb',
      STL: 'tf',
      STR: 'poa',
    },
    oopRoles: {
      GK: 'swk',
      WBL: 'prwb',
      DCL: 'cwcb',
      DC: 'ccb',
      DCR: 'swcb',
      WBR: 'hwb',
      MCL: 'wccm',
      MC: 'scm',
      MCR: 'wccm',
      STL: 'tcf',
      STR: 'socf',
    },
    pis: {
      STL: ['target_centre'],
      STR: ['attack_the_defensive_line', 'target_near_post'],
      MCL: ['arrive_late'],
      DM: ['hold_position'],
    },
  },
] as const;

export const PRESET_BY_ID: Record<string, TacticalPreset> = Object.fromEntries(
  TACTICAL_PRESETS.map((p) => [p.id, p]),
);
