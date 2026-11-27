import type { SourceId } from './sources';

export type AttrCategory = 'Technical' | 'Mental' | 'Physical' | 'Goalkeeping';

export type AttrKey =
  | 'cor' | 'cro' | 'dri' | 'fin' | 'fir' | 'fre' | 'hea' | 'lon' | 'lth' | 'mar' | 'pas' | 'pen' | 'tck' | 'tec'
  | 'agg' | 'ant' | 'bra' | 'cmp' | 'cnt' | 'dec' | 'det' | 'fla' | 'ldr' | 'otb' | 'pos' | 'tea' | 'vis' | 'wor'
  | 'acc' | 'agi' | 'bal' | 'jum' | 'nat' | 'pac' | 'sta' | 'str'
  | 'aer' | 'cmd' | 'com' | 'ecc' | 'han' | 'kic' | 'ovo' | 'pun' | 'ref' | 'tro' | 'thr';

export interface FM27MEWeightSpec {
  key: AttrKey;
  weight: number;
  appliesTo: 'outfield' | 'gk';
  src: 'conf';
  sourceId: SourceId;
  note: string;
}

export interface AttributeDef {
  key: AttrKey;
  name: string;
  category: AttrCategory;
  summary: string;
  whatItGoverns: string;
  pairsWith: readonly AttrKey[];
  watchOut: string;
  meImpact?: FM27MEWeightSpec;
}

export const ATTR_CATEGORIES: readonly AttrCategory[] = [
  'Technical',
  'Mental',
  'Physical',
  'Goalkeeping',
] as const;

export const FM27_ME_WEIGHTS: readonly FM27MEWeightSpec[] = [
  {
    key: 'pac',
    weight: 1.35,
    appliesTo: 'outfield',
    src: 'conf',
    sourceId: 'sortitoutsi-fm27-attr-test',
    note: 'Top outfield ME impact driver in Sortitoutsi FM27 attribute testing; scales steeply above 12.',
  },
  {
    key: 'acc',
    weight: 1.35,
    appliesTo: 'outfield',
    src: 'conf',
    sourceId: 'sortitoutsi-fm27-attr-test',
    note: 'Co-leading outfield ME driver alongside Pace in Sortitoutsi FM27 attribute testing.',
  },
  {
    key: 'sta',
    weight: 1.15,
    appliesTo: 'outfield',
    src: 'conf',
    sourceId: 'sortitoutsi-fm27-attr-test',
    note: 'Elevated ME impact in FM27 under Hawk-Eye momentum and faster sprint fatigue.',
  },
  {
    key: 'jum',
    weight: 1.1,
    appliesTo: 'outfield',
    src: 'conf',
    sourceId: 'sortitoutsi-fm27-attr-test',
    note: 'Major aerial and set-piece ME differentiator in Sortitoutsi FM27 attribute testing.',
  },
  {
    key: 'str',
    weight: 0.95,
    appliesTo: 'outfield',
    src: 'conf',
    sourceId: 'sortitoutsi-fm27-attr-test',
    note: 'Increased duel and shielding impact in FM27 physical testing.',
  },
  {
    key: 'ant',
    weight: 0.9,
    appliesTo: 'outfield',
    src: 'conf',
    sourceId: 'sortitoutsi-fm27-attr-test',
    note: 'Key mental reaction attribute for 1v1 jockeying, interceptions, and box movement in FM27.',
  },
  {
    key: 'mar',
    weight: 0.85,
    appliesTo: 'outfield',
    src: 'conf',
    sourceId: 'sortitoutsi-fm27-attr-test',
    note: 'Strengthened defensive 1v1 jockeying impact in FM27 ME updates.',
  },
  {
    key: 'agi',
    weight: 1.0,
    appliesTo: 'gk',
    src: 'conf',
    sourceId: 'sortitoutsi-fm27-attr-test',
    note: 'Leading goalkeeper shot-stopping ME driver in Sortitoutsi FM27 attribute testing.',
  },
  {
    key: 'ref',
    weight: 1.0,
    appliesTo: 'gk',
    src: 'conf',
    sourceId: 'sortitoutsi-fm27-attr-test',
    note: 'Co-leading goalkeeper ME driver alongside Agility in Sortitoutsi FM27 attribute testing.',
  },
] as const;

const ME_BY_KEY: Partial<Record<AttrKey, FM27MEWeightSpec>> = Object.fromEntries(
  FM27_ME_WEIGHTS.map((w) => [w.key, w]),
);

const RAW_ATTRIBUTES: readonly Omit<AttributeDef, 'meImpact'>[] = [
  // Technical (14)
  {
    key: 'cor',
    name: 'Corners',
    category: 'Technical',
    summary: 'How accurately and consistently a player delivers corner kicks to the intended target zone.',
    whatItGoverns:
      'Controls delivery accuracy, trajectory, and consistency on near-post, central, and far-post corners. Purely a set-piece specialist stat rather than an open-play role requirement.',
    pairsWith: ['tec', 'cro', 'jum', 'hea'],
    watchOut:
      'Corners does not affect open-play crossing. Pair an elite taker with strong aerial targets (Jumping Reach + Heading) and left/right-footed inswinger angles.',
  },
  {
    key: 'cro',
    name: 'Crossing',
    category: 'Technical',
    summary: 'How accurately a player delivers balls from wide touchlines, bylines, and half-spaces into the box.',
    whatItGoverns:
      'Controls curl, placement, and flight on open-play deliveries from wide areas. Key for Wingers, Playmaking Wingers, Wide Midfielders, Wing-Backs, Advanced Wing-Backs, Channel Midfielders, and Overlapping Centre-Backs.',
    pairsWith: ['tec', 'vis', 'dec', 'acc'],
    watchOut:
      'Match Crossing Style (Low, Whipped, Floated) and Cross from Byline vs Deep to both your crossers and your box targets.',
  },
  {
    key: 'dri',
    name: 'Dribbling',
    category: 'Technical',
    summary: 'How cleanly a player carries the ball at speed and beats defenders in 1v1 duels.',
    whatItGoverns:
      'Measures close control while running with the ball and escaping markers. Key for wide attackers, Wing-Backs, Channel Forwards, False Nines, Free Roles, and Overlapping Centre-Backs.',
    pairsWith: ['agi', 'acc', 'bal', 'fla', 'tec'],
    watchOut:
      'Dribbling needs Agility, Balance, and Acceleration to beat markers. In FM27, high Dribbling + Flair unlocks expressive skill moves, while Marking + Anticipation counters it.',
  },
  {
    key: 'fin',
    name: 'Finishing',
    category: 'Technical',
    summary: 'How accurately a player places shots on target in and around the penalty area.',
    whatItGoverns:
      'Controls shot placement inside the box. Key for all central striker roles (except False Nine where it is preferred) and Second Striker.',
    pairsWith: ['cmp', 'tec', 'otb', 'ant', 'dec'],
    watchOut:
      'Do not over-index on Finishing alone: a quick forward with elite Pace, Acceleration, Off the Ball, and Composure creates far more high-xG looks than a static clinical finisher.',
  },
  {
    key: 'fir',
    name: 'First Touch',
    category: 'Technical',
    summary: 'How cleanly a player cushions passes and sets up their next action under pressure.',
    whatItGoverns:
      'Determines whether incoming passes are controlled in stride or bounce away under pressure. Key for 20 progressive, playmaking, and attacking roles.',
    pairsWith: ['tec', 'cmp', 'bal', 'pas'],
    watchOut:
      'Non-negotiable for Play Through Press, Pass to Feet, and Higher Tempo — heavy touches in build-up turn straight into opposition counter-attacks.',
  },
  {
    key: 'fre',
    name: 'Free Kick Taking',
    category: 'Technical',
    summary: 'How accurately a player strikes direct free kicks and delivers indirect set-piece balls.',
    whatItGoverns:
      'Governs direct shots on goal from 18–26 m and angled indirect deliveries into the box. A pure specialist set-piece attribute.',
    pairsWith: ['tec', 'lon', 'cmp', 'cro'],
    watchOut:
      'Does not affect open-play passing or long shots; check Long Shots and Passing separately.',
  },
  {
    key: 'hea',
    name: 'Heading',
    category: 'Technical',
    summary: 'How accurately and purposefully a player directs the ball once they make aerial contact.',
    whatItGoverns:
      'Controls precision on defensive clearances, aerial flick-ons, and headed finishes. Key for central defenders, Inside Full-Backs, Half Backs, and aerial strikers.',
    pairsWith: ['jum', 'str', 'bra', 'pos', 'otb'],
    watchOut:
      'Jumping Reach wins the aerial duel; Heading directs the ball. A short player with 16 Heading and 9 Jumping Reach still loses aerial battles.',
  },
  {
    key: 'lon',
    name: 'Long Shots',
    category: 'Technical',
    summary: 'How accurately a player strikes shots from outside the penalty area.',
    whatItGoverns:
      'Controls accuracy and threat from beyond 18 yards. Key for Attacking Midfielders and Free Roles, and preferred for Box-to-Box, Channel Midfielders, and Inside Forwards.',
    pairsWith: ['tec', 'bal', 'cmp', 'dec'],
    watchOut:
      'Encourage Shots from Distance only with genuine 15+ takers against low blocks; otherwise apply Shoot Less to stop wasted attacks.',
  },
  {
    key: 'lth',
    name: 'Long Throws',
    category: 'Technical',
    summary: 'How far and flat a player can launch throw-ins into the penalty area or down the line.',
    whatItGoverns:
      'Pure set-piece weapon for turning attacking-third throws into box chaos without offside risk. Below 14 Long Throws, balls hang too short.',
    pairsWith: ['str', 'bal', 'jum', 'hea'],
    watchOut:
      'Adds zero Tactical Complexity while creating high-leverage near-post flick-on chances — just keep 2–3 fast defenders back because throw-ins have no offside.',
  },
  {
    key: 'mar',
    name: 'Marking',
    category: 'Technical',
    summary: 'How tightly and cleanly a defender tracks an opponent out of possession and denies turning room.',
    whatItGoverns:
      'Controls 1v1 goal-side tracking and shadow tightness. Key for 26 defensive roles across CBs, full-backs, DMs, and tracking wide players.',
    pairsWith: ['pos', 'ant', 'cnt', 'tck', 'acc'],
    watchOut:
      'FM27 rewrote 1v1 defensive jockeying, boosting Marking + Anticipation impact. Never Tight Mark rapid, agile attackers who can spin in behind.',
  },
  {
    key: 'pas',
    name: 'Passing',
    category: 'Technical',
    summary: 'How accurately and cleanly weighted a player executes short, vertical, and cross-field passes.',
    whatItGoverns:
      'Executes the pass a player chooses across build-up, midfield circulation, and killer through-balls. Key for 17 build-up and creative roles.',
    pairsWith: ['vis', 'dec', 'tec', 'cmp', 'fir'],
    watchOut:
      'Passing only executes what Vision sees and Decisions picks — 16 Passing with 8 Vision produces tidy sideways recycling without breaking lines.',
  },
  {
    key: 'pen',
    name: 'Penalty Taking',
    category: 'Technical',
    summary: 'How reliably a player converts spot-kicks in matches and shootouts.',
    whatItGoverns:
      'Specialist set-piece attribute governing accuracy and placement from 12 yards. Does not affect open-play finishing.',
    pairsWith: ['cmp', 'fin', 'tec'],
    watchOut:
      'Always evaluate alongside Composure — a calm 14 Penalty Taking specialist often beats a nervous 16 taker in late high-pressure moments.',
  },
  {
    key: 'tck',
    name: 'Tackling',
    category: 'Technical',
    summary: 'How cleanly a player wins the ball in challenges without committing fouls.',
    whatItGoverns:
      'Determines clean ball-winning execution in ground duels. Key for 33 defensive, holding, and pressing roles across the pitch.',
    pairsWith: ['ant', 'dec', 'pos', 'str', 'bra'],
    watchOut:
      'High Aggression with weak Tackling or Decisions is a card trap. Switch booked players or defenders facing elite dribblers to Ease Off Tackles.',
  },
  {
    key: 'tec',
    name: 'Technique',
    category: 'Technical',
    summary: 'Underlying ball-craft multiplier governing difficult passes, touches, volleys, and whipped crosses.',
    whatItGoverns:
      'Determines how reliably a player pulls off complex technical executions across passing, trapping, dribbling, crossing, and shooting. Key for 19 creative and attacking roles.',
    pairsWith: ['pas', 'fir', 'dri', 'cro', 'fla'],
    watchOut:
      'Essential when combining Shorter Passing + Higher Tempo or Pass to Feet — without Technique, fast combinations break down into mis-hit touches.',
  },

  // Mental (14)
  {
    key: 'agg',
    name: 'Aggression',
    category: 'Mental',
    summary: 'How readily a player engages in physical contests, 50-50 duels, and early closing down.',
    whatItGoverns:
      'Measures combative assertiveness rather than dirty play. Key for Stopping Wide CB, Pressing Full-Back, Pressing DM/CM, and Target Forward.',
    pairsWith: ['tck', 'dec', 'bra', 'wor', 'str'],
    watchOut:
      'High Aggression is an asset only when moderated by Tackling and Decisions. Avoid stacking Get Stuck In onto aggressive players facing agile dribblers.',
  },
  {
    key: 'ant',
    name: 'Anticipation',
    category: 'Mental',
    summary: 'How early a player reads an incoming pass, turnover, or movement before it fully develops.',
    whatItGoverns:
      'Opening link of the mental decision chain (Anticipation → Vision → Decisions → Composure). Key for 42 roles across every line.',
    pairsWith: ['otb', 'pos', 'dec', 'vis', 'mar'],
    watchOut:
      'Triple FM27 weight: drives 1v1 defensive jockeying, powers Attacking the Box PIs (with Off the Ball), and sits in FM27 Player Tactical Ability (handling Tactical Complexity).',
  },
  {
    key: 'bra',
    name: 'Bravery',
    category: 'Mental',
    summary: 'How willing a player is to commit their body to contested headers, blocks, and physical 50-50 duels.',
    whatItGoverns:
      'Determines commitment in heavy contact situations inside both boxes. Key for Stopping Centre-Back and Target Forward.',
    pairsWith: ['jum', 'hea', 'str', 'tck', 'agg'],
    watchOut:
      'Low-Bravery opponents pull out of duels and are prime Opposition Instruction targets for Hard Tackling.',
  },
  {
    key: 'cmp',
    name: 'Composure',
    category: 'Mental',
    summary: 'How calmly a player executes passes, touches, and finishes when closed down under pressure.',
    whatItGoverns:
      'Closing link of the mental cluster (Anticipation → Vision → Decisions → Composure): prevents Passing, First Touch, or Finishing from collapsing under pressure. Key for 16 roles.',
    pairsWith: ['dec', 'fir', 'pas', 'fin', 'ant'],
    watchOut:
      'Not just a striker stat — vital for Play Through Press CBs/GKs and FM27 Tactical Ability. Low-Composure opposing CBs/DMs are #1 Trigger Press OI targets.',
  },
  {
    key: 'cnt',
    name: 'Concentration',
    category: 'Mental',
    summary: 'How consistently a player stays mentally alert and holds their mark or line without switching off.',
    whatItGoverns:
      'Prevents split-second defensive lapses, missed offside steps, and lost back-post runners across 90 minutes. Key for 18 goalkeeper, defensive, and holding roles.',
    pairsWith: ['pos', 'mar', 'ant', 'dec'],
    watchOut:
      'Concentration is NOT Stamina — low Concentration causes mental lapses even when physically fresh. Also part of FM27 Player Tactical Ability.',
  },
  {
    key: 'dec',
    name: 'Decisions',
    category: 'Mental',
    summary: 'How accurately and promptly a player picks the best option among those they see.',
    whatItGoverns:
      'Central hub of the mental chain (Anticipation → Vision → Decisions → Composure). Key for 32 backbone roles across build-up, playmaking, and defensive discipline.',
    pairsWith: ['ant', 'vis', 'cmp', 'tea', 'pas'],
    watchOut:
      'Decisions is choice quality, not Vision: 18 Decisions + 9 Vision plays safe sensible passes. Core to Higher Tempo, More Expressive, and FM27 Tactical Ability.',
  },
  {
    key: 'det',
    name: 'Determination',
    category: 'Mental',
    summary: 'How resilient and competitive a player stays when trailing or facing match adversity.',
    whatItGoverns:
      'Shapes match-state resilience, squad personality, and training development rather than specific positional role mechanics.',
    pairsWith: ['wor', 'bra', 'ldr'],
    watchOut:
      'Supports dressing-room morale and the Player Buy-In (25%) pillar of FM27 Tactical Effectiveness, plus responses to FM27 mood-based Shouts.',
  },
  {
    key: 'fla',
    name: 'Flair',
    category: 'Mental',
    summary: 'How inclined a player is to try disguised passes, improvised turns, and unexpected tricks.',
    whatItGoverns:
      'Drives unpredictable final-third creativity. Key for Attacking Midfielder and Free Role, and preferred for 10 creative/wide roles.',
    pairsWith: ['dri', 'tec', 'vis', 'dec'],
    watchOut:
      'In FM27, high Flair + Dribbling unlocks new 1v1 skill animations. Keep high-Flair, low-Decisions mavericks in the final third — never in rest-defence.',
  },
  {
    key: 'ldr',
    name: 'Leadership',
    category: 'Mental',
    summary: 'How strongly a player commands respect in the dressing room and organises teammates on the pitch.',
    whatItGoverns:
      'Determines captaincy effectiveness, squad hierarchy stability, and composure during difficult away spells.',
    pairsWith: ['det', 'tea', 'com'],
    watchOut:
      'Directly stabilizes dressing-room hierarchy and the Player Buy-In (25%) pillar of FM27 Tactical Effectiveness.',
  },
  {
    key: 'otb',
    name: 'Off the Ball',
    category: 'Mental',
    summary: 'How intelligently a player finds space and times attacking runs when your team has possession.',
    whatItGoverns:
      'Strictly an In Possession attribute: governs finding pockets between lines, curving runs to stay onside, and attacking box spaces. Key for 25 attacking, running, and outlet roles.',
    pairsWith: ['ant', 'acc', 'pac', 'dec'],
    watchOut:
      'Never confuse with Positioning: Off the Ball is strictly In Possession, while Positioning is strictly Out of Possession. Primary driver of FM27 Box-Attacking PIs.',
  },
  {
    key: 'pos',
    name: 'Positioning',
    category: 'Mental',
    summary: 'How accurately a player reads danger and holds defensive shape when the opponent has the ball.',
    whatItGoverns:
      'Strictly an Out of Possession attribute: governs holding the defensive line, blocking passing lanes, and protecting the box. Key for 33 GK and defensive roles.',
    pairsWith: ['ant', 'cnt', 'mar', 'tea'],
    watchOut:
      'Never confuse with Off the Ball: Positioning NEVER affects attacking movement — it governs defensive placement only, and anchors rest-defence and pressing discipline.',
  },
  {
    key: 'tea',
    name: 'Teamwork',
    category: 'Mental',
    summary: 'How faithfully a player follows tactical instructions, holds their lane, and plays for the collective.',
    whatItGoverns:
      'Controls adherence to IP/OOP tactical structure, synchronised pressing triggers, and unselfish passing. Key for 33 connective, pressing, and disciplined roles.',
    pairsWith: ['wor', 'pos', 'dec'],
    watchOut:
      'Essential to keep high-Work-Rate pressers in sync and to moderate stubborn Player Traits that conflict with your instructions.',
  },
  {
    key: 'vis',
    name: 'Vision',
    category: 'Mental',
    summary: 'How wide a player’s on-ball radar is for spotting passing lanes, switches, and disguised through-balls.',
    whatItGoverns:
      'Second link in the mental cluster (Anticipation → Vision → Decisions → Composure). Key for all 8 specialist creative roles (DLP, MP, AP, B2BP, PWB, PW, FR, F9).',
    pairsWith: ['pas', 'dec', 'ant', 'tec'],
    watchOut:
      'High Vision without Passing produces intercepted ideas; high Passing without Vision produces sideways recycling. Anchor creativity around 1–2 high-Vision hubs.',
  },
  {
    key: 'wor',
    name: 'Work Rate',
    category: 'Mental',
    summary: 'How willingly a player works at high intensity, closes down, and covers ground across the match.',
    whatItGoverns:
      'Controls effort level in pressing, tracking back, and repeated support runs. Key for 26 high-mileage pressing, tracking, and wing-back roles.',
    pairsWith: ['sta', 'pos', 'tea', 'acc'],
    watchOut:
      'Trade-off: high Work Rate WITHOUT Positioning and Teamwork breaks your shape by chasing lost causes — and without Stamina, players burn out by minute 65 under FM27 Hawk-Eye drain.',
  },

  // Physical (8)
  {
    key: 'acc',
    name: 'Acceleration',
    category: 'Physical',
    summary: 'How explosively a player bursts off the mark over the first five yards or after changing direction.',
    whatItGoverns:
      'Wins the initial separation in 1v1 duels, pressing jumps, offside-trap sprints, and defensive recoveries. Key for 27 dynamic roles.',
    pairsWith: ['pac', 'agi', 'otb', 'ant', 'sta'],
    watchOut:
      'Acceleration ≠ Pace: Acceleration is initial burst over five yards; Pace is top speed over distance. Co-top outfield ME driver in Sortitoutsi FM27 testing.',
  },
  {
    key: 'agi',
    name: 'Agility',
    category: 'Physical',
    summary: 'How nimbly a player twists, turns in tight spaces, or dives and resets in goal.',
    whatItGoverns:
      'Controls body orientation speed for dribblers escaping tight pockets and for goalkeepers diving across goal. Key for 5 GK roles and 4 wide-attacking roles.',
    pairsWith: ['acc', 'bal', 'dri', 'ref'],
    watchOut:
      'Co-leading GK shot-stopping driver (with Reflexes) in FM27 ME testing, and amplified for outfielders by FM27 Hawk-Eye momentum/turning physics.',
  },
  {
    key: 'bal',
    name: 'Balance',
    category: 'Physical',
    summary: 'How steadily a player stays upright and retains control when jostled or turning at speed.',
    whatItGoverns:
      'Prevents stumbling during shoulder-to-shoulder contact, hold-up play, and sharp cuts into the box. Key for Target Forward and Inside Outlet Winger.',
    pairsWith: ['str', 'agi', 'dri', 'fir'],
    watchOut:
      'Amplified under FM27 Hawk-Eye momentum physics — even strong players lose duels when challenged at an angle if Balance is weak.',
  },
  {
    key: 'jum',
    name: 'Jumping Reach',
    category: 'Physical',
    summary: 'The absolute peak height a player can reach with their head when contesting aerial balls.',
    whatItGoverns:
      'Already accounts for player height and directly decides who reaches high balls first in open play and set pieces. Key for CBs, Half Back, and Target Forward.',
    pairsWith: ['hea', 'str', 'bra', 'pos'],
    watchOut:
      'Jumping Reach is the true height metric checked by the engine (not raw height alone) and a top-4 outfield ME driver in FM27 testing, especially on set pieces.',
  },
  {
    key: 'nat',
    name: 'Natural Fitness',
    category: 'Physical',
    summary: 'How rapidly a player recovers condition between fixtures, absorbs training load, and ages.',
    whatItGoverns:
      'Operates across fixture congestion and seasons rather than inside a single duel — governs match-to-match freshness and injury resistance.',
    pairsWith: ['sta', 'wor'],
    watchOut:
      'Stamina governs 90-minute match endurance; Natural Fitness governs recovery 3 days later — crucial alongside FM27 weekly tactical training to prevent 3-week decay.',
  },
  {
    key: 'pac',
    name: 'Pace',
    category: 'Physical',
    summary: 'A player’s maximum running speed once up to full stride over longer distances.',
    whatItGoverns:
      'Decides long recovery races behind high defensive lines and breakaway counter-attacks. Key for Covering CBs, Wingers, Wide Forwards, and Outlets.',
    pairsWith: ['acc', 'sta', 'otb', 'pos'],
    watchOut:
      'Pace ≠ Acceleration: Pace is top speed over open grass, not initial burst. Top outfield ME attribute in Sortitoutsi FM27 testing with steep gains above 12.',
  },
  {
    key: 'sta',
    name: 'Stamina',
    category: 'Physical',
    summary: 'How long a player can sustain high-intensity sprinting and pressing during a single match.',
    whatItGoverns:
      'Preserves physical speed and late-game decision sharpness across 90 minutes. Key for 16 high-mileage wing-back, B2B, pressing, and tracking roles.',
    pairsWith: ['wor', 'nat', 'acc', 'pac'],
    watchOut:
      'Stamina ≠ Concentration. FM27 Hawk-Eye physics drains Stamina faster on repeated sprints — plan 60-minute subs or dial back Trigger Press when bars turn orange.',
  },
  {
    key: 'str',
    name: 'Strength',
    category: 'Physical',
    summary: 'How forcefully a player holds off opponents and wins shoulder-to-shoulder physical battles.',
    whatItGoverns:
      'Controls shielding with back to goal, holding ground in box duels, and physical tackling. Key for 14 central spine roles (CBs, IFB, HB, DDM, CF, DLF, TF).',
    pairsWith: ['bal', 'jum', 'hea', 'tck'],
    watchOut:
      'Stronger duel impact in FM27 physical testing; still needs Pace/Acceleration alongside it if playing a high defensive line.',
  },

  // Goalkeeping (11)
  {
    key: 'aer',
    name: 'Aerial Reach',
    category: 'Goalkeeping',
    summary: 'How high a goalkeeper can reach with their hands when claiming crosses, corners, and lofted balls.',
    whatItGoverns:
      'The goalkeeper equivalent of Jumping Reach for commanding high balls into the six-yard box. Key for all three IP goalkeeper roles.',
    pairsWith: ['cmd', 'han', 'bra', 'dec'],
    watchOut:
      'High Aerial Reach goes unused if Command of Area is low and the keeper stays rooted to the goal line.',
  },
  {
    key: 'cmd',
    name: 'Command of Area',
    category: 'Goalkeeping',
    summary: 'How assertively a goalkeeper takes charge of their penalty area on crosses and loose balls.',
    whatItGoverns:
      'Controls willingness to come off the line and own the box. Key for GK (IP), BPGK, NNGK, and Sweeper Keeper.',
    pairsWith: ['aer', 'han', 'com', 'dec', 'ant'],
    watchOut:
      'Must be backed by Aerial Reach and Handling — high Command of Area with poor Handling creates flapped crosses.',
  },
  {
    key: 'com',
    name: 'Communication',
    category: 'Goalkeeping',
    summary: 'How clearly a goalkeeper organises the defensive line and prevents mix-ups in front of them.',
    whatItGoverns:
      'Improves back-line alignment, blind-side runner warnings, and coordination on crosses and loose balls. Key for all three IP GK roles.',
    pairsWith: ['cmd', 'pos', 'ldr'],
    watchOut:
      'Especially valuable while young defenders or new signings are still building FM27 Tactical Understanding.',
  },
  {
    key: 'ecc',
    name: 'Eccentricity',
    category: 'Goalkeeping',
    summary: 'A goalkeeper’s behavioural tendency to attempt unpredictable or high-risk actions.',
    whatItGoverns:
      'Tendency (not quality) to dribble past pressers, roam far outside the box, or attempt audacious passes. Preferred only for BPGK.',
    pairsWith: ['dec', 'cmp', 'fir', 'pas'],
    watchOut:
      'Higher is NOT automatically better — high Eccentricity without elite Decisions and Composure causes costly build-up errors.',
  },
  {
    key: 'han',
    name: 'Handling',
    category: 'Goalkeeping',
    summary: 'How cleanly a goalkeeper catches and holds shots and crosses without spilling rebounds.',
    whatItGoverns:
      'Turns reflex saves and cross claims into clean possession rather than dangerous tap-in rebounds. Key for 5 GK roles and preferred for Sweeper Keeper.',
    pairsWith: ['ref', 'agi', 'aer', 'cmd'],
    watchOut:
      'Clean Handling lets you trigger Distribute Quickly into immediate Counter-Attacks via Throwing or Kicking.',
  },
  {
    key: 'kic',
    name: 'Kicking',
    category: 'Goalkeeping',
    summary: 'How far and accurately a goalkeeper kicks goal kicks, clearances, and long passes.',
    whatItGoverns:
      'Controls distance and accuracy of restarts by foot. Key for Ball-Playing Goalkeeper and preferred for GK, NNGK, and Sweeper Keeper.',
    pairsWith: ['pas', 'vis', 'dec', 'fir'],
    watchOut:
      'Critical for Bypass Press, Long Goal Kicks, and distributing Over Opposition Defence or to a Target Forward.',
  },
  {
    key: 'ovo',
    name: 'One on Ones',
    category: 'Goalkeeping',
    summary: 'How decisively a goalkeeper narrows angles and deals with attackers clean through on goal.',
    whatItGoverns:
      'Governs spreading timing, nerve, and body positioning during breakaways. Key for GK (OOP) and Sweeper Keeper.',
    pairsWith: ['ref', 'agi', 'ant', 'dec', 'tro'],
    watchOut:
      'Essential insurance policy behind any Higher or Much Higher Defensive Line or Step Up More trap.',
  },
  {
    key: 'pun',
    name: 'Punching (Tendency)',
    category: 'Goalkeeping',
    summary: 'A goalkeeper’s tendency to punch crosses clear rather than attempting to catch them.',
    whatItGoverns:
      'Purely a stylistic tendency (not a quality rating). Safer for keepers with modest Handling/Strength under heavy traffic, but surrenders possession.',
    pairsWith: ['han', 'aer', 'cmd'],
    watchOut:
      'Higher is NOT better — if your keeper punches frequently, ensure midfielders anticipate second balls at the edge of the box.',
  },
  {
    key: 'ref',
    name: 'Reflexes',
    category: 'Goalkeeping',
    summary: 'How instantaneously a goalkeeper reacts to close-range strikes and deflected shots.',
    whatItGoverns:
      'Universal baseline of shot-stopping — key for ALL SIX goalkeeper roles (3 IP + 3 OOP).',
    pairsWith: ['agi', 'pos', 'han', 'ovo'],
    watchOut:
      'Co-leading GK attribute (alongside Agility) in Sortitoutsi FM27 ME testing — prioritise Reflexes + Agility first when recruiting keepers.',
  },
  {
    key: 'tro',
    name: 'Rushing Out (Tendency)',
    category: 'Goalkeeping',
    summary: 'How eagerly a goalkeeper leaves their line to sweep balls in behind and confront breakaways.',
    whatItGoverns:
      'Behavioural tendency key exclusively for Sweeper Keeper; determines proactive sweeping behind a high defensive line.',
    pairsWith: ['ant', 'dec', 'acc', 'ovo', 'cmd'],
    watchOut:
      'Context-dependent: vital for Sweeper Keepers behind high lines, harmful for low-block Line-Holding Goalkeepers or slow keepers.',
  },
  {
    key: 'thr',
    name: 'Throwing',
    category: 'Goalkeeping',
    summary: 'How accurately and far a goalkeeper bowls or throws the ball out to start attacks.',
    whatItGoverns:
      'Enables fast, ground-level distribution to full-backs, flanks, or playmakers immediately after a catch. Preferred for GK and BPGK.',
    pairsWith: ['han', 'dec', 'vis', 'ant'],
    watchOut:
      'Underrated counter-attacking trigger with Distribute Quickly — bypasses midfield press cleanly on the grass.',
  },
];

export const ATTRIBUTES: readonly AttributeDef[] = RAW_ATTRIBUTES.map((a) =>
  ME_BY_KEY[a.key] ? { ...a, meImpact: ME_BY_KEY[a.key] } : a,
);

export const ATTRIBUTE_BY_KEY: Record<AttrKey, AttributeDef> = Object.fromEntries(
  ATTRIBUTES.map((a) => [a.key, a]),
) as Record<AttrKey, AttributeDef>;

export interface PlayerArchetype {
  id: string;
  name: string;
  group: 'GK' | 'DC' | 'D_LR' | 'WB_LR' | 'DM' | 'MC' | 'M_LR' | 'AMC' | 'AM_LR' | 'ST';
  summary: string;
  attrs: Partial<Record<AttrKey, number>>;
}

export const PLAYER_ARCHETYPES: readonly PlayerArchetype[] = [
  {
    id: 'sweeper-keeper',
    name: 'Modern Sweeper-Keeper',
    group: 'GK',
    summary: 'Quick off his line with elite reflexes, agility, and composed short distribution for high-line build-up.',
    attrs: {
      aer: 14, cmd: 15, com: 14, ecc: 11, han: 15, kic: 15, ovo: 16, pun: 10, ref: 17, tro: 16, thr: 15,
      agi: 16, acc: 14, pac: 13, ant: 15, cmp: 15, cnt: 14, dec: 15, pos: 14, pas: 14, fir: 13, vis: 13,
    },
  },
  {
    id: 'ball-playing-stopper',
    name: 'Ball-Playing Stopper CB',
    group: 'DC',
    summary: 'Aerially dominant, aggressive centre-back who steps into duels and hits crisp line-breaking passes.',
    attrs: {
      hea: 16, mar: 15, tck: 16, pas: 15, fir: 14, tec: 13,
      ant: 15, bra: 16, cmp: 15, cnt: 14, dec: 14, pos: 15, agg: 15, vis: 13,
      jum: 17, str: 16, pac: 14, acc: 13, sta: 14, bal: 14,
    },
  },
  {
    id: 'inverted-playmaking-fb',
    name: 'Inverted / Playmaking Full-Back',
    group: 'D_LR',
    summary: 'Press-resistant wide defender built to tuck into midfield, dictate tempo, and track transitions.',
    attrs: {
      pas: 16, fir: 15, tec: 15, tck: 14, mar: 14, cro: 12, dri: 13,
      ant: 15, cmp: 15, cnt: 14, dec: 15, pos: 15, tea: 16, vis: 15, wor: 15, otb: 13,
      acc: 14, pac: 14, sta: 15, agi: 14, bal: 14, str: 12, jum: 10,
    },
  },
  {
    id: 'destroyer-anchor-dm',
    name: 'Ball-Winning Anchor DM',
    group: 'DM',
    summary: 'Relentless midfield shield combining high stamina, tackling, and anticipation to snuff out counters.',
    attrs: {
      tck: 17, mar: 16, pas: 13, fir: 13, hea: 13, tec: 12,
      agg: 16, ant: 16, bra: 16, cmp: 13, cnt: 15, dec: 14, pos: 16, tea: 16, wor: 17,
      sta: 17, str: 16, pac: 13, acc: 14, jum: 14, bal: 14,
    },
  },
  {
    id: 'dynamic-channel-cm',
    name: 'Dynamic Channel / B2B Midfielder',
    group: 'MC',
    summary: 'High-engine central runner who bursts into half-spaces and arrives late in the box while pressing hard.',
    attrs: {
      pas: 15, dri: 15, fir: 15, tec: 15, fin: 13, lon: 14, tck: 13, cro: 13,
      otb: 16, ant: 15, dec: 14, vis: 14, wor: 17, tea: 15, cmp: 14, fla: 14,
      sta: 17, acc: 15, pac: 15, agi: 14, bal: 14, str: 13, jum: 12,
    },
  },
  {
    id: 'explosive-inside-forward',
    name: 'Explosive Inside Forward',
    group: 'AM_LR',
    summary: 'Blistering wide attacker who cuts inside off the flank to attack the far post and finish 1v1s.',
    attrs: {
      dri: 17, fin: 15, fir: 15, tec: 15, cro: 13, pas: 13, lon: 13,
      otb: 16, ant: 15, cmp: 14, fla: 16, dec: 13, wor: 12, tea: 12,
      pac: 18, acc: 18, agi: 17, bal: 15, sta: 14, str: 11, jum: 11,
    },
  },
  {
    id: 'creative-number-ten',
    name: 'Creative Number 10 / Shadow Striker',
    group: 'AMC',
    summary: 'Inventive Zone-14 playmaker with elite vision, first touch, and composure to unlock compact low blocks.',
    attrs: {
      pas: 17, fir: 17, tec: 17, dri: 16, fin: 14, lon: 14,
      vis: 18, fla: 17, dec: 16, cmp: 16, otb: 16, ant: 15, tea: 14, wor: 12,
      agi: 16, bal: 15, acc: 14, pac: 13, sta: 13, str: 10, jum: 9,
    },
  },
  {
    id: 'pressing-channel-striker',
    name: 'Pressing Channel Striker',
    group: 'ST',
    summary: 'Rapid, physical all-round striker who pins centre-backs, attacks channels, and leads the high press.',
    attrs: {
      fin: 16, fir: 14, dri: 14, hea: 15, pas: 12, tec: 14,
      otb: 16, ant: 16, cmp: 15, wor: 16, tea: 15, agg: 15, bra: 14, dec: 14,
      pac: 17, acc: 16, sta: 16, str: 15, jum: 15, bal: 14, agi: 14,
    },
  },
] as const;
