import type { AttrKey } from './attributes';
import type { SourceId } from './sources';

// ── Core FM26 / FM27 Tactical Concepts (10) ───────────────────────────────────

export interface ConceptDef {
  key: string;
  name: string;
  summary: string;
  detail: string;
  ruleOfThumb: string;
  sourceIds: readonly SourceId[];
}

export const CONCEPTS: readonly ConceptDef[] = [
  {
    key: 'ip_oop',
    name: 'In / Out of Possession',
    summary: 'Every player has a dedicated IP role and OOP role across separate phase formations.',
    detail:
      'Since FM26, tactics split cleanly into In Possession (IP) and Out of Possession (OOP) shapes across four views (IP, OOP, Both, Combined). Legacy three-tier role modifiers were removed: behaviour comes directly from pairing IP and OOP roles with contextual instructions. Staff warn you if the travel distance between a player’s IP and OOP slots is too large, because long transitions leave exploitable gaps and drain FM27 stamina.',
    ruleOfThumb: 'Keep paired IP and OOP slots within ~15–22 m so players recover shape rapidly on turnovers.',
    sourceIds: ['si-fm26-tactics', 'sortitoutsi-fm26-tactics'],
  },
  {
    key: 'effectiveness',
    name: 'Tactical Effectiveness (FM27)',
    summary: '100-point score weighted 50% Understanding, 25% Buy-In, 15% Next Match Info, and 10% Ability.',
    detail:
      'Replaces legacy Tactical Familiarity with four weighted pillars: Tactical Understanding (50%, tracked across 8 tactical areas — 4 IP and 4 OOP), Player Buy-In (25%, morale, dressing-room hierarchy, and manager backing), Next Match Info (15%, opposition scouting and match prep), and Player Ability (10%, positional/role suitability in both IP and OOP). Community engine testing shows Tactical Understanding drives almost all actual Match Engine performance delta, and neglecting tactical training triggers a ~3-week decay clock that causes squads to forget complex tactics — explaining many mid-season slumps.',
    ruleOfThumb: 'Schedule weekly tactical training sessions year-round so the ~3-week decay clock never erodes Understanding.',
    sourceIds: [
      'si-fm27-effectiveness',
      'sortitoutsi-fm27-training-tactics',
      'sortitoutsi-fm27-effectiveness-test',
      'sortitoutsi-fm27-decay-test',
    ],
  },
  {
    key: 'complexity',
    name: 'Tactical Complexity (FM27)',
    summary: 'Instruction and role load compared against your squad’s mental Player Tactical Ability.',
    detail:
      'FM27 measures Tactical Complexity across active Team, Player, and Opposition Instructions plus specialised IP/OOP roles. Complexity interacts directly with Player Tactical Ability — derived from the median of Anticipation, Decisions, Composure, Concentration, and hidden Versatility — against Tactical Simplicity (100 − Complexity). Over-instructing slows Tactical Understanding gain and accelerates decay; in lower leagues or part-time clubs, simpler tactics consistently outperform complex ones.',
    ruleOfThumb: 'Add an instruction only to fix a specific behaviour you observed — default Balanced is not passive.',
    sourceIds: ['si-fm27-effectiveness', 'sortitoutsi-fm27-effectiveness-test', 'sortitoutsi-fm27-decay-test'],
  },
  {
    key: 'rest_def',
    name: 'Rest-Defence',
    summary: 'The 3–5 outfield players staying behind the ball during attacks to stop counter-attacks.',
    detail:
      'Rest-defence is the defensive structure you hold WHILE attacking so turnovers do not turn into 2v2 breakaways. Typical shapes are 3-2 (two CBs + Inside Full-Back behind DM + Inside Wing-Back) or 3-1 (two CBs + Half Back behind a holding CM).',
    ruleOfThumb: 'Keep 3 to 5 outfield players behind the ball in Positive or Attacking mentalities.',
    sourceIds: ['si-fm26-tactics', 'si-forums-lines-diamonds'],
  },
  {
    key: 'width',
    name: 'Width & Flank Balance',
    summary: 'Assign exactly one touchline stretcher per flank and let the partner occupy the half-space or rest-defence.',
    detail:
      'Each flank needs one player providing final-third touchline width (W, WF, WB, AWB, WCM, OCB). If your winger cuts inside (IF/IW/PW), width must come from an overlapping full-back or wing-back behind. Two touchline players in the same lane crowd each other; two inverted players vacate the flank.',
    ruleOfThumb: 'One player owns the touchline, the partner owns the half-space or rest-defence.',
    sourceIds: ['si-fm26-tactics', 'si-forums-lines-diamonds'],
  },
  {
    key: 'press_coh',
    name: 'Pressing Coherence',
    summary: 'Line of Engagement and Defensive Line must move together to avoid vertical gaps.',
    detail:
      'High Press LoE paired with a Lower Defensive Line opens a massive hole between midfield and defence. Low Block paired with a Higher Defensive Line invites unpressured long balls over the top. Pressing Trap Outside needs wide stoppers (Pressing FB/WB or Tracking Winger) to shut the sideline.',
    ruleOfThumb: 'Never separate Line of Engagement and Defensive Line by more than one step.',
    sourceIds: ['si-fm26-tactics', 'si-forums-lines-diamonds'],
  },
  {
    key: 'box',
    name: 'Box Occupation (FM27)',
    summary: 'Stagger 3–4 attackers across Near Post, Centre, Far Post, and Late-Wave zones.',
    detail:
      'Crosses and cut-backs fail when everyone attacks the same spot or a False Nine empties the box. In FM27, Attacking the Box PIs split cleanly into depth/timing (Arrive Late, Attack the Defensive Line) and cross-target zones (Target Near Post, Target Centre, Target Far Post), driven heavily by Anticipation and Off the Ball.',
    ruleOfThumb: 'Aim for 3 distinct box zones plus 1 late second-wave runner while holding rest-defence behind.',
    sourceIds: ['si-fm27-tweaks-me', 'sortitoutsi-fm27-me-tweaks'],
  },
  {
    key: 'outlets',
    name: 'OOP Outlets',
    summary: 'Out-of-possession Outlet roles stay high for counters — 1–2 give release valves, 3+ break the block.',
    detail:
      'Outlet roles (WOW, WOWM, IOW, COAM, SOAM, COCF, SOCF) deliberately skip deep defensive tracking to camp near halfway. Keeping 1–2 Outlets pins opposition defenders back and sparks fast breaks; assigning 3 or more leaves your block chronically outnumbered.',
    ruleOfThumb: 'Cap OOP Outlet roles at 1–2 per tactic.',
    sourceIds: ['si-fm26-tactics', 'sortitoutsi-fm26-roles'],
  },
  {
    key: 'creativity',
    name: 'Creative Balance',
    summary: 'Anchor playmaking around 1–2 creators surrounded by runners who attack space.',
    detail:
      'Stacking three or four ball-demanding creators (DLP + MP + AP + PW + FR) makes everyone drop to feet asking for the ball while nobody attacks the defensive line. Pair one deep or central creator with direct vertical runners.',
    ruleOfThumb: '1–2 specialist playmakers per XI is the sweet spot.',
    sourceIds: ['si-forums-lines-diamonds', 'si-forums-tactics'],
  },
  {
    key: 'asymmetry',
    name: 'Purposeful Asymmetry',
    summary: 'Mirroring opposite flanks is rarely optimal — put your attacking flank on your best wide threat.',
    detail:
      'Pairing an Inside Full-Back on one side with an attacking Wing-Back on the other creates an automatic back-three rest-defence in possession while keeping a 4-man back line out of possession. Asymmetry lets you maximise your squad’s specific strengths without compromising transition safety.',
    ruleOfThumb: 'Attack down your strongest flank and anchor rest-defence on the opposite side.',
    sourceIds: ['si-fm26-tactics', 'si-forums-lines-diamonds'],
  },
] as const;

// ── Opponent Formation Counter Guides (6) ─────────────────────────────────────

export interface OpponentGuide {
  key: string;
  formation: string;
  structuralCounter: string;
  watchFor: string;
  oiTips: readonly string[];
  sourceIds: readonly SourceId[];
}

export const OPPONENT_GUIDES: readonly OpponentGuide[] = [
  {
    key: '442',
    formation: '4-4-2',
    structuralCounter:
      'Win central superiority with three midfielders (4-3-3 or 4-2-3-1) and attack the half-spaces behind their wide midfielders. Out of possession, protect both strikers with two CBs plus a Screening DM.',
    watchFor:
      'Direct vertical passes into the strike partnership and quick wide combinations when your full-backs step too high without DM cover.',
    oiTips: [
      'Trigger Press whichever of their two CMs has lower Composure and Decisions to cut supply to the front two.',
      'Tight Mark their slower Target/Deep-Lying striker, never a rapid Channel/Poacher partner who can spin in behind.',
      'Show wide midfielders onto their weaker foot only if rated Poor/Weak, funneling crosses into dominant aerial CBs.',
    ],
    sourceIds: ['sortitoutsi-oi-guide', 'si-forums-lines-diamonds'],
  },
  {
    key: '4231',
    formation: '4-2-3-1',
    structuralCounter:
      'Neutralise their AMC between the lines with a Screening DM or Stopping CB. Press their double pivot with two players (e.g. 4-4-2 OOP with your AM stepping alongside the striker).',
    watchFor:
      'Overloads in Zone 14 when their AMC drops into the pocket and both inverted wingers attack the half-spaces simultaneously.',
    oiTips: [
      'Tight Mark a slow, static AMC (AP/Free Role) with your Screening DM, without dragging a CB out against a rapid striker.',
      'Trigger Press the less composed member of their double pivot rather than chasing a press-resistant DLP.',
      'Show inverted wingers (IF/IW) onto their outside foot if weak-footed, pushing them away from shooting lanes.',
    ],
    sourceIds: ['sortitoutsi-oi-guide', 'si-forums-tactics'],
  },
  {
    key: '433',
    formation: '4-3-3',
    structuralCounter:
      'Choose where you want numerical superiority: the centre (4-4-2 Diamond or 4-2-2-2) or the flanks (wing-backs). Because their full-backs push high, punish transitions with a Wide Outlet or Splitting Outlet.',
    watchFor:
      'Third-man runs from their Channel/Box-to-Box CMs into the space opened when their wingers pin your full-backs.',
    oiTips: [
      'Trigger Press their lone DM only when your striker/AM covers the vertical lane behind them.',
      'Never Hard Tackle agile, high-Dribbling wingers — use Easy Tackling and stay goal-side to avoid penalties.',
      'Show overlapping full-backs onto their weaker foot near the touchline to blunt first-time crosses.',
    ],
    sourceIds: ['sortitoutsi-oi-guide', 'si-forums-tactics'],
  },
  {
    key: '352',
    formation: '3-5-2 / 3-4-3',
    structuralCounter:
      'Their wing-backs supply all their width: set Pressing Trap Outside with Pressing Full-Backs and pin their wing-backs deep with your own wingers while protecting half-spaces with a Wide Covering CM.',
    watchFor:
      'Diagonal switches to the far-side wing-back whenever your midfield shifts too far across to the ball side.',
    oiTips: [
      'Trigger Press their wing-backs as they receive wide so they cannot whip early crosses uncontested.',
      'Target the least composed of their three CBs with Trigger Press to disrupt build-up from the back.',
      'Never Tight Mark both strikers if they pair a rapid runner with a link striker — mark the link striker and keep a Covering CB.',
    ],
    sourceIds: ['sortitoutsi-oi-guide', 'si-forums-lines-diamonds'],
  },
  {
    key: '541',
    formation: '5-3-2 / 5-4-1 (Low Block)',
    structuralCounter:
      'Prioritise patience, Wider attacking width, and flank overloads to drag their back five horizontally; add Shots from Distance for elite long shooters, Counter-Press turnovers immediately, and stagger box runs.',
    watchFor:
      'Direct balls into wide channels behind your advancing full-backs after sterile final-third turnovers.',
    oiTips: [
      'Avoid blanket Tight Marking or Trigger Press across their midfield — you already hold possession and need rest-defence.',
      'Tight Mark their lone Outlet or Target striker with one CB so clearances cannot stick.',
      'Trigger Press their keeper or weakest technical CB selectively when they attempt short restarts.',
    ],
    sourceIds: ['sortitoutsi-oi-guide', 'si-forums-tactics'],
  },
  {
    key: 'diamond',
    formation: '4-4-2 Diamond',
    structuralCounter:
      'Narrow shape that dominates the centre but surrenders the touchlines: stretch them with Wider attacking width and overlapping full-backs/wing-backs. Out of possession, keep the middle compact and force them wide.',
    watchFor:
      'Quick central one-twos through the tip of the diamond and late blind-side overlaps from their full-backs.',
    oiTips: [
      'Trigger Press their base DM (DLP/HB) to starve the diamond of vertical central progression.',
      'Tight Mark their AMC if he lacks pace and agility to break easy triangles at the tip.',
      'Never drag your CMs wide to press their full-backs — let your wingers or full-backs engage wide so the middle stays shut.',
    ],
    sourceIds: ['sortitoutsi-oi-guide', 'si-forums-lines-diamonds'],
  },
] as const;

// ── Opposition Instructions Guide ─────────────────────────────────────────────

export interface OIActionGuide {
  key: 'trigger_press' | 'tight_marking' | 'tackling' | 'show_onto_foot';
  name: string;
  options: readonly string[];
  summary: string;
  whenToUse: readonly string[];
  whenNeverToUse: readonly string[];
  targetAttributes: {
    targetWhenLow?: readonly AttrKey[];
    avoidWhenHigh?: readonly AttrKey[];
    note: string;
  };
  sourceIds: readonly SourceId[];
}

export interface OIArchetype {
  id: string;
  archetype: string;
  exampleRoles: readonly string[];
  recommended: {
    triggerPress: string;
    tightMarking: string;
    tackling: string;
    showOntoFoot: string;
  };
  why: string;
  trapToAvoid: string;
  sourceIds: readonly SourceId[];
}

export interface OppositionInstructionsGuide {
  principles: readonly string[];
  actions: readonly OIActionGuide[];
  archetypes: readonly OIArchetype[];
  sourceIds: readonly SourceId[];
}

export const OPPOSITION_INSTRUCTIONS: OppositionInstructionsGuide = {
  principles: [
    'Apply Opposition Instructions selectively to specific threats rather than across the entire XI — blanket OIs drag defenders out of block shape and raise FM27 Tactical Complexity.',
    'Always inspect the target’s Composure, Decisions, Dribbling, Acceleration/Pace, Bravery, and Weak Foot rating before applying OIs.',
    'Align OIs with your Team Instructions: Show Onto Foot should steer carriers into your Pressing Trap or away from shooting lanes, never into open central space.',
  ],
  actions: [
    {
      key: 'trigger_press',
      name: 'Trigger Press',
      options: ['Always', 'Default', 'Never'],
      summary: 'Overrides team pressing intensity on a specific opponent to hurry decisions or deliberately leave them unpressed.',
      whenToUse: [
        'Against low-Composure, low-Decisions defenders or midfielders who panic under pressure.',
        'Against players with the Dwells on Ball trait or poor First Touch who need extra touches.',
        'Against a static deep build-up link when your block has clear cover behind the presser.',
      ],
      whenNeverToUse: [
        'Never Trigger Press elite press-resistant carriers (high Composure + Dribbling + Agility) — they spin the presser and break your shape.',
        'Never Trigger Press a rapid attacker receiving with open grass behind your defensive line.',
      ],
      targetAttributes: {
        targetWhenLow: ['cmp', 'dec', 'fir', 'tec'],
        avoidWhenHigh: ['cmp', 'dri', 'agi', 'bal'],
        note: 'Target low Composure/Decisions/First Touch; avoid press-resistant dribblers.',
      },
      sourceIds: ['sortitoutsi-oi-guide', 'si-forums-tactics'],
    },
    {
      key: 'tight_marking',
      name: 'Tight Marking',
      options: ['Always', 'Default', 'Never'],
      summary: 'Keeps the nearest defender touch-tight to deny an opponent room to receive and turn.',
      whenToUse: [
        'Against slow, static playmakers (DLP, AP, Free Role) who hurt you when given time.',
        'Against isolated Target Forwards or Deep-Lying Forwards to contest aerial knockdowns.',
      ],
      whenNeverToUse: [
        'Never Tight Mark rapid, agile attackers (high Acceleration/Pace/Agility) — one turn burns your marker in behind.',
        'Avoid Tight Marking multiple midfielders at once, which destroys zonal compactness.',
      ],
      targetAttributes: {
        targetWhenLow: ['acc', 'pac', 'agi'],
        avoidWhenHigh: ['acc', 'pac', 'agi', 'otb'],
        note: 'Best against slow creators and isolated targets; lethal trap against rapid runners.',
      },
      sourceIds: ['sortitoutsi-oi-guide', 'si-forums-tactics'],
    },
    {
      key: 'tackling',
      name: 'Tackling',
      options: ['Hard', 'Normal', 'Easy'],
      summary: 'Controls how forcefully defenders challenge a specific opponent in 1v1 duels.',
      whenToUse: [
        'Hard Tackling against low-Bravery opponents, fatigued players late on, or hold-up strikers who dislike contact.',
        'Easy Tackling against elite agile dribblers so defenders jockey goal-side instead of lunging into fouls or penalties.',
      ],
      whenNeverToUse: [
        'Never Hard Tackle agile, high-Dribbling wingers or AMs near the penalty area.',
        'Avoid Hard Tackling when your marker is already on a yellow card or has modest Tackling/Decisions.',
      ],
      targetAttributes: {
        targetWhenLow: ['bra', 'str', 'bal'],
        avoidWhenHigh: ['dri', 'agi', 'fla', 'bal'],
        note: 'Hard Tackle low Bravery/Balance; switch to Easy Tackling against elite dribblers.',
      },
      sourceIds: ['sortitoutsi-oi-guide', 'si-forums-tactics'],
    },
    {
      key: 'show_onto_foot',
      name: 'Show Onto Foot',
      options: ['Weaker Foot', 'Left Foot', 'Right Foot', 'Default'],
      summary: 'Angles the defender’s body to steer the opponent onto a specific foot or towards a preferred zone.',
      whenToUse: [
        'Show Onto Weaker Foot against one-footed creators and inverted wingers whose weak foot is Poor or Weak.',
        'Explicit Left/Right Foot to push inverted wingers down the outside touchline away from central shooting lanes.',
      ],
      whenNeverToUse: [
        'Never apply blindly to two-footed players — adds Tactical Complexity for zero gain.',
        'Never angle a defender so showing onto a weaker foot opens a straight lane into Zone 14.',
      ],
      targetAttributes: {
        targetWhenLow: ['cro', 'lon'],
        note: 'Check Weak Foot rating first; only apply when one foot is clearly weaker or when funneling into a trap.',
      },
      sourceIds: ['sortitoutsi-oi-guide', 'si-forums-tactics'],
    },
  ],
  archetypes: [
    {
      id: 'slow-dlp',
      archetype: 'Slow Deep-Lying Playmaker',
      exampleRoles: ['dlp', 'mp'],
      recommended: {
        triggerPress: 'Default (or Always if Composure ≤ 13)',
        tightMarking: 'Always',
        tackling: 'Hard (if low Bravery)',
        showOntoFoot: 'Weaker Foot (if one-footed)',
      },
      why: 'Denies time to turn and pick switches without risking being beaten for pace.',
      trapToAvoid: 'Do not drag a CM out of block shape to press a press-resistant DLP; screen his passing lanes instead.',
      sourceIds: ['sortitoutsi-oi-guide', 'si-forums-tactics'],
    },
    {
      id: 'fast-inverted-winger',
      archetype: 'Fast Inverted Winger / Inside Forward',
      exampleRoles: ['if_ip', 'iw_ip'],
      recommended: {
        triggerPress: 'Default',
        tightMarking: 'Never',
        tackling: 'Easy',
        showOntoFoot: 'Outside foot (touchline)',
      },
      why: 'Cushion prevents spins in behind, Easy stops penalties, and showing outside denies half-space curling shots.',
      trapToAvoid: 'Never Tight Mark or Hard Tackle rapid, agile wingers — one feint wins a 1v1 or penalty.',
      sourceIds: ['sortitoutsi-oi-guide', 'si-forums-tactics'],
    },
    {
      id: 'isolated-target-forward',
      archetype: 'Isolated Target Forward',
      exampleRoles: ['tf', 'dlf'],
      recommended: {
        triggerPress: 'Default',
        tightMarking: 'Always',
        tackling: 'Hard (if your CB is strong)',
        showOntoFoot: 'Weaker Foot',
      },
      why: 'Staying tight disrupts clean chest-downs and flick-ons before runners arrive.',
      trapToAvoid: 'Keep a Covering CB or Screening DM behind to collect knockdowns if your stopper loses a header.',
      sourceIds: ['sortitoutsi-oi-guide', 'si-forums-tactics'],
    },
    {
      id: 'rapid-channel-striker',
      archetype: 'Rapid Poacher / Channel Forward',
      exampleRoles: ['poa', 'chf'],
      recommended: {
        triggerPress: 'Never',
        tightMarking: 'Never',
        tackling: 'Normal',
        showOntoFoot: 'Weaker Foot (if one-footed)',
      },
      why: 'Keeping a cushion lets defenders react to runs in behind rather than getting turned on halfway.',
      trapToAvoid: 'Tight Marking a high-Acceleration/Pace striker is the #1 OI cause of breakaway 1v1s.',
      sourceIds: ['sortitoutsi-oi-guide', 'si-forums-tactics'],
    },
    {
      id: 'low-composure-cb',
      archetype: 'Low-Composure Build-Up Centre-Back',
      exampleRoles: ['bpcb', 'cb_ip'],
      recommended: {
        triggerPress: 'Always',
        tightMarking: 'Default',
        tackling: 'Normal',
        showOntoFoot: 'Weaker Foot',
      },
      why: 'Pressing the weakest technical defender forces hurried clearances or high turnovers near their box.',
      trapToAvoid: 'Do not press both CBs blindly if their keeper or DM is wide open to bypass your press.',
      sourceIds: ['sortitoutsi-oi-guide', 'si-forums-tactics'],
    },
    {
      id: 'elite-agile-amc',
      archetype: 'Elite Agile Playmaker (AMC)',
      exampleRoles: ['ap', 'fr'],
      recommended: {
        triggerPress: 'Default',
        tightMarking: 'Default (use Screening DM)',
        tackling: 'Easy',
        showOntoFoot: 'Weaker Foot (only if Weak/Poor)',
      },
      why: 'Jockeying with a Screening DM protects Zone 14 without conceding central edge-of-box free kicks.',
      trapToAvoid: 'Trigger Press + Hard Tackling drags CBs out of line and gifts dangerous free kicks.',
      sourceIds: ['sortitoutsi-oi-guide', 'si-forums-tactics'],
    },
    {
      id: 'attacking-wing-back',
      archetype: 'Overlapping Wing-Back / Full-Back',
      exampleRoles: ['wb_ip', 'awb'],
      recommended: {
        triggerPress: 'Always (when receiving wide)',
        tightMarking: 'Default',
        tackling: 'Normal',
        showOntoFoot: 'Weaker Foot (or Inside if poor Crossing)',
      },
      why: 'Closing down wide receivers early cuts off whipped crosses before box runners arrive.',
      trapToAvoid: 'Let your winger, full-back, or Wide Covering CM engage wide — never pull CMs out of the middle.',
      sourceIds: ['sortitoutsi-oi-guide', 'si-forums-lines-diamonds'],
    },
  ],
  sourceIds: ['sortitoutsi-oi-guide', 'si-forums-tactics'],
};

// ── Curated Player Traits / PPMs (18) ─────────────────────────────────────────

export type TraitCategory = 'Movement' | 'Passing & Tempo' | 'Dribbling & Shooting' | 'Defending';

export interface PlayerTrait {
  id: string;
  name: string;
  category: TraitCategory;
  effect: string;
  bestRolesIP: readonly string[];
  bestRolesOOP: readonly string[];
  conflictsWithTIs: readonly string[];
  conflictsWithPIs: readonly string[];
  conflictNote: string;
  moderationAttrs: readonly AttrKey[];
  sourceIds: readonly SourceId[];
}

export const PLAYER_TRAITS: readonly PlayerTrait[] = [
  {
    id: 'comes_deep_to_get_ball',
    name: 'Comes Deep To Get Ball',
    category: 'Movement',
    effect: 'Drops significantly deeper towards midfield to receive passes to feet, pulling markers out of position.',
    bestRolesIP: ['dlf', 'f9', 'ap', 'fr', 'mp'],
    bestRolesOOP: ['tcf', 'tam', 'cm_oop'],
    conflictsWithTIs: ['reception'],
    conflictsWithPIs: ['attack_the_defensive_line', 'get_further_forward'],
    conflictNote: 'Overrides forward-pinning striker instructions; empties the box on a Poacher unless runners attack depth.',
    moderationAttrs: ['dec', 'tea', 'otb'],
    sourceIds: ['si-forums-tactics', 'sortitoutsi-fm26-roles'],
  },
  {
    id: 'gets_forward_whenever_possible',
    name: 'Gets Forward Whenever Possible',
    category: 'Movement',
    effect: 'Surges ahead of the ball whenever possession is established, seeking final-third overlaps or box entries.',
    bestRolesIP: ['wb_ip', 'awb', 'b2b', 'chm', 'ocb', 'ss'],
    bestRolesOOP: ['pfb', 'prwb', 'pcm'],
    conflictsWithTIs: ['att_trans'],
    conflictsWithPIs: ['hold_position'],
    conflictNote: 'Fights Hold Position and Hold Shape; dangerous on a lone DM or Inside Full-Back.',
    moderationAttrs: ['dec', 'tea', 'pos', 'sta'],
    sourceIds: ['si-forums-tactics', 'sortitoutsi-fm26-roles'],
  },
  {
    id: 'stays_back_at_all_times',
    name: 'Stays Back At All Times',
    category: 'Movement',
    effect: 'Refuses to join advanced attacks, staying anchored behind the ball as permanent rest-defence.',
    bestRolesIP: ['cb_ip', 'nncb', 'ifb', 'dm_ip', 'hb'],
    bestRolesOOP: ['ccb', 'hfb', 'hwb', 'sdm', 'ddm'],
    conflictsWithTIs: ['support_runs'],
    conflictsWithPIs: ['get_further_forward', 'arrive_late', 'attack_the_defensive_line'],
    conflictNote: 'Suppresses overlaps and late box arrivals; wastes attacking Wing-Backs or Box-to-Box Midfielders.',
    moderationAttrs: ['dec', 'tea'],
    sourceIds: ['si-forums-tactics'],
  },
  {
    id: 'moves_into_channels',
    name: 'Moves Into Channels',
    category: 'Movement',
    effect: 'Peels diagonally into the gap between opposing centre-back and full-back to stretch the defence.',
    bestRolesIP: ['chf', 'chm', 'cf_ip', 'ss', 'wf_ip'],
    bestRolesOOP: ['socf', 'soam'],
    conflictsWithTIs: [],
    conflictsWithPIs: ['hold_position'],
    conflictNote: 'Can pull a central Target Forward away from crossing zones or collide with an Inside Forward.',
    moderationAttrs: ['otb', 'dec', 'ant'],
    sourceIds: ['si-forums-tactics', 'sortitoutsi-fm26-roles'],
  },
  {
    id: 'arrives_late_in_opponents_area',
    name: "Arrives Late In Opponent's Area",
    category: 'Movement',
    effect: 'Times second-wave surges into the box once play reaches the final third for cut-backs and rebounds.',
    bestRolesIP: ['b2b', 'b2bp', 'am_ip', 'chm', 'cm_ip'],
    bestRolesOOP: ['cm_oop', 'pcm'],
    conflictsWithTIs: [],
    conflictsWithPIs: ['hold_position', 'attack_the_defensive_line'],
    conflictNote: 'Reinforces FM27 Arrive Late naturally, but clashes with anchor roles protecting rest-defence.',
    moderationAttrs: ['otb', 'ant', 'dec', 'sta'],
    sourceIds: ['si-fm27-tweaks-me', 'si-forums-tactics'],
  },
  {
    id: 'likes_to_try_to_beat_offside_trap',
    name: 'Likes To Try To Beat Offside Trap',
    category: 'Movement',
    effect: 'Plays aggressively on the shoulder of the last defender, timing vertical sprints in behind.',
    bestRolesIP: ['poa', 'chf', 'if_ip', 'wf_ip', 'ss'],
    bestRolesOOP: ['cocf', 'socf', 'wow'],
    conflictsWithTIs: ['reception'],
    conflictsWithPIs: ['hold_position', 'arrive_late'],
    conflictNote: 'Synergises with Attack the Defensive Line and Pass into Space; clashes with Pass to Feet or F9/DLF.',
    moderationAttrs: ['ant', 'otb', 'acc', 'pac'],
    sourceIds: ['si-fm27-tweaks-me', 'si-forums-tactics'],
  },
  {
    id: 'dictates_tempo',
    name: 'Dictates Tempo',
    category: 'Passing & Tempo',
    effect: 'Overrides team Tempo on the ball, speeding play up or slowing it down according to his own reading.',
    bestRolesIP: ['dlp', 'mp', 'pwb', 'ap'],
    bestRolesOOP: ['sdm', 'scm'],
    conflictsWithTIs: ['tempo'],
    conflictsWithPIs: [],
    conflictNote: 'Overrides Higher/Lower Tempo TIs; elite with high Decisions/Vision, disruptive if Decisions are poor.',
    moderationAttrs: ['dec', 'vis', 'cmp', 'tea'],
    sourceIds: ['si-forums-tactics'],
  },
  {
    id: 'tries_killer_balls_often',
    name: 'Tries Killer Balls Often',
    category: 'Passing & Tempo',
    effect: 'Actively hunts high-risk, line-breaking through-balls even when safer passes are open.',
    bestRolesIP: ['ap', 'dlp', 'mp', 'fr', 'pwb', 'pw', 'f9'],
    bestRolesOOP: ['am_oop', 'cm_oop'],
    conflictsWithTIs: ['passing', 'creative'],
    conflictsWithPIs: ['take_fewer_risks'],
    conflictNote: 'Overrides Take Fewer Risks and Much Shorter Passing; demands runners ahead and high Passing/Vision.',
    moderationAttrs: ['pas', 'vis', 'dec', 'tea'],
    sourceIds: ['si-forums-tactics'],
  },
  {
    id: 'switches_ball_to_other_flank',
    name: 'Switches Ball To Other Flank',
    category: 'Passing & Tempo',
    effect: 'Looks for cross-field diagonal passes to isolate far-side wingers or wing-backs.',
    bestRolesIP: ['dlp', 'bpcb', 'pwb', 'mp', 'pw'],
    bestRolesOOP: ['cb_oop', 'dm_oop'],
    conflictsWithTIs: ['passing'],
    conflictsWithPIs: ['take_fewer_risks'],
    conflictNote: 'Can override Much Shorter Passing, though it is a potent low-block weapon with Wider spacing.',
    moderationAttrs: ['pas', 'vis', 'tec', 'dec'],
    sourceIds: ['si-forums-tactics'],
  },
  {
    id: 'plays_short_simple_passes',
    name: 'Plays Short Simple Passes',
    category: 'Passing & Tempo',
    effect: 'Avoids ambitious long passes and recycles possession cleanly to the nearest open teammate.',
    bestRolesIP: ['dm_ip', 'hb', 'cb_ip', 'ifb', 'cm_ip'],
    bestRolesOOP: ['sdm', 'scm', 'hfb'],
    conflictsWithTIs: ['passing', 'buildup'],
    conflictsWithPIs: ['take_more_risks'],
    conflictNote: 'Neutralises Take More Risks and Bypass Press; never put on your primary playmaker.',
    moderationAttrs: ['dec', 'tea', 'cmp'],
    sourceIds: ['si-forums-tactics'],
  },
  {
    id: 'dwells_on_ball',
    name: 'Dwells On Ball',
    category: 'Passing & Tempo',
    effect: 'Holds the ball longer before releasing, slowing circulation and inviting pressure.',
    bestRolesIP: ['dlf', 'tf'],
    bestRolesOOP: [],
    conflictsWithTIs: ['tempo', 'att_trans'],
    conflictsWithPIs: ['dribble_less'],
    conflictNote: 'Major liability in High Tempo or Play Through Press and a prime OI Trigger Press target.',
    moderationAttrs: ['cmp', 'dec', 'str', 'bal'],
    sourceIds: ['sortitoutsi-oi-guide', 'si-forums-tactics'],
  },
  {
    id: 'runs_with_ball_often',
    name: 'Runs With Ball Often',
    category: 'Dribbling & Shooting',
    effect: 'Prefers carrying the ball into space and engaging defenders 1v1 instead of releasing early passes.',
    bestRolesIP: ['w_ip', 'iw_ip', 'if_ip', 'awb', 'wb_ip', 'b2bp', 'ocb'],
    bestRolesOOP: ['wow', 'iow', 'socf'],
    conflictsWithTIs: ['dribbling', 'tempo'],
    conflictsWithPIs: ['dribble_less'],
    conflictNote: 'Overrides Discourage Dribbling and Dribble Less; slows quick one-touch circulation.',
    moderationAttrs: ['dri', 'agi', 'dec', 'tea'],
    sourceIds: ['si-forums-tactics'],
  },
  {
    id: 'cuts_inside_from_wing',
    name: 'Cuts Inside From Wing',
    category: 'Dribbling & Shooting',
    effect: 'Drives diagonally inward onto his stronger foot rather than going down the outside touchline.',
    bestRolesIP: ['if_ip', 'iw_ip', 'pw'],
    bestRolesOOP: ['iow'],
    conflictsWithTIs: ['width', 'support_runs'],
    conflictsWithPIs: ['stay_wider', 'cross_from_byline'],
    conflictNote: 'Clashes with Stay Wider and Cross From Byline; pair with an overlapping Wing-Back.',
    moderationAttrs: ['dri', 'agi', 'otb', 'dec'],
    sourceIds: ['si-forums-tactics', 'sortitoutsi-fm26-roles'],
  },
  {
    id: 'hugs_line',
    name: 'Hugs Line',
    category: 'Dribbling & Shooting',
    effect: 'Stays glued to the touchline in possession to stretch the defence and isolate 1v1s.',
    bestRolesIP: ['w_ip', 'wm_ip', 'wb_ip', 'awb'],
    bestRolesOOP: ['wow', 'wowm'],
    conflictsWithTIs: ['width'],
    conflictsWithPIs: ['sit_narrower'],
    conflictNote: 'Clashes with Sit Narrower and inverted wing roles; pairs best with an underlapping IWB or CHM.',
    moderationAttrs: ['cro', 'pac', 'dri', 'otb'],
    sourceIds: ['si-forums-tactics'],
  },
  {
    id: 'shoots_from_distance',
    name: 'Shoots From Distance',
    category: 'Dribbling & Shooting',
    effect: 'Looks to strike from outside the box whenever a sightline opens.',
    bestRolesIP: ['am_ip', 'b2b', 'if_ip', 'fr'],
    bestRolesOOP: [],
    conflictsWithTIs: ['patience', 'long_shots'],
    conflictsWithPIs: ['shoot_less'],
    conflictNote: 'Overrides Work Ball Into Box and Shoot Less; hurts xG unless Long Shots and Technique are elite.',
    moderationAttrs: ['lon', 'tec', 'dec', 'cmp'],
    sourceIds: ['si-forums-tactics'],
  },
  {
    id: 'dives_into_tackles',
    name: 'Dives Into Tackles',
    category: 'Defending',
    effect: 'Commits aggressively to ground challenges rather than jockeying.',
    bestRolesIP: [],
    bestRolesOOP: ['pdm', 'pcm', 'scb', 'swcb', 'pfb'],
    conflictsWithTIs: ['tackling'],
    conflictsWithPIs: ['ease_off_tackles'],
    conflictNote: 'Overrides Stay On Feet and Ease Off Tackles; risky in FM27’s revamped 1v1 jockeying engine.',
    moderationAttrs: ['tck', 'dec', 'ant', 'agi'],
    sourceIds: ['si-fm27-tweaks-me', 'si-forums-tactics'],
  },
  {
    id: 'does_not_dive_into_tackles',
    name: 'Does Not Dive Into Tackles',
    category: 'Defending',
    effect: 'Stays on his feet, jockeys the carrier, and waits for a clean interception or error.',
    bestRolesIP: [],
    bestRolesOOP: ['ccb', 'cwcb', 'sdm', 'scm', 'hfb', 'hwb'],
    conflictsWithTIs: ['tackling'],
    conflictsWithPIs: ['tackle_harder'],
    conflictNote: 'Moderates Get Stuck In and Tackle Harder; high-value trait in FM27’s 1v1 jockeying model.',
    moderationAttrs: ['mar', 'pos', 'ant', 'cnt'],
    sourceIds: ['si-fm27-tweaks-me', 'si-forums-tactics'],
  },
  {
    id: 'marks_opponent_tightly',
    name: 'Marks Opponent Tightly',
    category: 'Defending',
    effect: 'Naturally sticks close to nearby opponents out of possession to deny turning space.',
    bestRolesIP: [],
    bestRolesOOP: ['scb', 'swcb', 'dm_oop', 'twm', 'tw'],
    conflictsWithTIs: [],
    conflictsWithPIs: [],
    conflictNote: 'Strong on Stopping CBs vs static link strikers, risky on slow defenders vs rapid Poachers.',
    moderationAttrs: ['mar', 'ant', 'acc', 'agi'],
    sourceIds: ['sortitoutsi-oi-guide', 'si-forums-tactics'],
  },
] as const;

// ── Set Pieces Guide (4 categories, 12 routines) ──────────────────────────────

export type SetPieceCategoryId = 'attacking-corners' | 'defensive-corners' | 'free-kicks' | 'throw-ins';

export interface SetPieceRoleAssignment {
  assignment: string;
  targetAttrs: readonly AttrKey[];
  note: string;
}

export interface SetPieceRoutine {
  id: string;
  name: string;
  delivery: string;
  setup: string;
  bestWhen: string;
  restDefence: string;
  keyRoles: readonly SetPieceRoleAssignment[];
  pitfalls: readonly string[];
}

export interface SetPieceCategory {
  id: SetPieceCategoryId;
  title: string;
  summary: string;
  routines: readonly SetPieceRoutine[];
  sourceIds: readonly SourceId[];
}

export interface SetPiecesGuide {
  overview: string;
  categories: readonly SetPieceCategory[];
  sourceIds: readonly SourceId[];
}

export const SET_PIECES: SetPiecesGuide = {
  overview:
    'In FM26 and FM27, set pieces remain one of the highest-leverage ways to swing tight matches — especially when aerial mismatches (Jumping Reach, Heading, Strength, Bravery) are paired with disciplined rest-defence against counter-attacks. Every routine balances box threat with transition security: committing too many defenders without fast recovery cover turns your own corners into opposition breakaways.',
  sourceIds: ['sortitoutsi-fm26-set-pieces', 'sortitoutsi-fm27-attr-test', 'si-forums-tactics'],
  categories: [
    {
      id: 'attacking-corners',
      title: 'Attacking Corners',
      summary: 'Create clean aerial mismatches at the near or far post while holding 2–3 recovery defenders back.',
      sourceIds: ['sortitoutsi-fm26-set-pieces', 'sortitoutsi-fm27-attr-test'],
      routines: [
        {
          id: 'near-post-inswinger',
          name: 'Near-Post Aerial Overload (Inswinger)',
          delivery: 'Inswinging delivery aimed at the near post (left-footed from the right, right-footed from the left).',
          setup:
            'Attack the near post with your highest Jumping Reach player, station a second header in the central six-yard corridor to pin the zonal blocker, place one blocker on the keeper, and lurk a shooter/recycler on the edge of the box.',
          bestWhen: 'You have a dominant aerial CB or striker (Jumping Reach 15+, Heading 13+) and a 13+ Corners taker.',
          restDefence: 'Keep 2 fast, composed defenders back plus 1 edge-of-box screener to prevent 2v1 breakaways.',
          keyRoles: [
            {
              assignment: 'Near-Post Primary Target',
              targetAttrs: ['jum', 'hea', 'bra', 'ant', 'str'],
              note: 'Attacks the front-post zone at speed to beat the first zonal defender.',
            },
            {
              assignment: 'Corner Taker (Inswinger)',
              targetAttrs: ['cor', 'tec', 'cro', 'dec'],
              note: 'Whips consistent pace and curl past the first defender.',
            },
            {
              assignment: 'Edge-of-Box Recycler / Screener',
              targetAttrs: ['lon', 'fir', 'ant', 'pas', 'pac'],
              note: 'Collects half-clearances for volleys or delays immediate counters.',
            },
          ],
          pitfalls: [
            'Outswinging feet slow ball arrival and let the keeper claim comfortably.',
            'Sending both rapid full-backs into the box leaves slow CBs exposed to wide outlets.',
          ],
        },
        {
          id: 'far-post-mismatch',
          name: 'Far-Post Mismatch & Back-Post Flick',
          delivery: 'Inswinging or high outswinging delivery lofted over the six-yard cluster to the back post.',
          setup:
            'Stack two decoys near and central to occupy the opponent’s tallest CBs while your best aerial mismatch ghosts onto the back post against a smaller full-back.',
          bestWhen: 'Opponents load the near post with giants but leave shorter wide players guarding the far post.',
          restDefence: 'Hold 2 recovery defenders on halfway plus 1 deeper midfielder ready to sweep clearances.',
          keyRoles: [
            {
              assignment: 'Far-Post Target',
              targetAttrs: ['jum', 'hea', 'otb', 'str', 'ant'],
              note: 'Arrives behind the keeper’s line of sight to nod on goal or back across the six-yard box.',
            },
            {
              assignment: 'Central Decoy & Tap-In Runner',
              targetAttrs: ['ant', 'otb', 'fin', 'bra'],
              note: 'Pins central defenders and pounces on knockdowns steered back across goal.',
            },
            {
              assignment: 'Rest-Defence Sweeper',
              targetAttrs: ['pac', 'acc', 'pos', 'ant', 'tck'],
              note: 'Matches the speed of opposition high outlets (SOCF/WOW) on keeper claims.',
            },
          ],
          pitfalls: [
            'Low Corners/Technique over-hitting deliveries straight out of play.',
            'High Aerial Reach/Command keepers claiming hanging balls unchallenged.',
          ],
        },
        {
          id: 'short-corner-overload',
          name: 'Short Corner Half-Space Overload',
          delivery: 'Short pass to a receiver at the corner of the box, followed by a cut-back or clipped cross.',
          setup:
            'Offer 1 technical creator short to force a 2v1, while 3 runners delay near the penalty spot and back post to attack the shifted defensive line.',
          bestWhen: 'Your squad lacks aerial height or you want low-risk clock management late in a match.',
          restDefence: 'Keep 3 players back (2 CBs + 1 DM) because losing a short routine invites central breaks.',
          keyRoles: [
            {
              assignment: 'Short Receiver / Creator',
              targetAttrs: ['fir', 'dri', 'cro', 'pas', 'vis'],
              note: 'Draws the defender out and drives to the byline or shifts inside for an angled cross.',
            },
            {
              assignment: 'Late Box Arriver',
              targetAttrs: ['otb', 'ant', 'fin', 'cmp'],
              note: 'Exploits the split second when markers step towards the short pass.',
            },
          ],
          pitfalls: [
            'Offside traps if the taker lingers near the flag on the return pass.',
            'Losing a 1v1 near the corner flag without counter-press support.',
          ],
        },
      ],
    },
    {
      id: 'defensive-corners',
      title: 'Defensive Corners',
      summary: 'Shield the six-yard corridor with aerial zonal anchors, man-mark primary threats, and calibrate outlets.',
      sourceIds: ['sortitoutsi-fm26-set-pieces', 'sortitoutsi-fm27-attr-test'],
      routines: [
        {
          id: 'hybrid-zonal-man',
          name: 'Hybrid Zonal + Man-Marking Six-Yard Shield',
          delivery: 'Balanced defensive corner shell effective against both inswingers and outswingers.',
          setup:
            'Put your 3 strongest aerial players on near, central, and far zonal six-yard slots, man-mark their 3–4 tallest runners, station 1 player on the edge of the box, and leave 1 fast outlet high.',
          bestWhen: 'Most matches — the most reliable all-round FM26/FM27 defensive corner shape.',
          restDefence: 'One fast outlet on halfway pins 2 opposition defenders back, lowering bodies in your box.',
          keyRoles: [
            {
              assignment: 'Zonal Six-Yard Anchors (x3)',
              targetAttrs: ['jum', 'hea', 'pos', 'bra', 'str'],
              note: 'Attack ball flight aggressively without being pulled away by decoy screens.',
            },
            {
              assignment: 'Tall Man-Markers',
              targetAttrs: ['mar', 'jum', 'str', 'cnt', 'ant'],
              note: 'Disrupt the run-ups of the opponent’s primary aerial threats.',
            },
            {
              assignment: 'Edge-of-Box Shot Blocker',
              targetAttrs: ['acc', 'ant', 'pos', 'tck'],
              note: 'Closes down short corners and blocks second-ball strikes.',
            },
          ],
          pitfalls: [
            'Wasting your best header man-marking a decoy instead of owning the near/central zonal slot.',
            'Leaving the edge of the box empty against long-shot threats.',
          ],
        },
        {
          id: 'counter-launch-two-outlets',
          name: 'Near-Post Clearance & Two-Outlet Counter Launch',
          delivery: 'Aggressive clearance-to-counter setup punishing top-heavy opposition corners.',
          setup:
            'Guard near and central six-yard corridors with top headers, keep 1 edge-of-box interceptor, and station 2 rapid forwards high near halfway (central + wide channel).',
          bestWhen: 'Facing an aggressive favourite committing 7+ players forward when you hold 15+ Pace up front.',
          restDefence: 'Leaving 2 forwards high forces the opponent to hold 3 defenders back or risk an instant 2v2 break.',
          keyRoles: [
            {
              assignment: 'High Counter Outlets (x2)',
              targetAttrs: ['pac', 'acc', 'otb', 'dri', 'cmp'],
              note: 'Sprint into open half-spaces the instant possession turns over.',
            },
            {
              assignment: 'Goalkeeper Claimer / Launcher',
              targetAttrs: ['aer', 'cmd', 'han', 'thr', 'kic'],
              note: 'Claims cleanly and launches fast counters by throw or kick.',
            },
          ],
          pitfalls: [
            'Leaving the box undermanned against physically dominant set-piece specialists.',
            'Weak keeper Aerial Reach or Handling turning claims into loose rebounds.',
          ],
        },
        {
          id: 'full-box-late-lead',
          name: 'Full-Box Low-Risk Protection (Closing Out a Lead)',
          delivery: 'Ultra-compact late-match shell prioritising first contacts and shot blocks over counters.',
          setup:
            'Bring all 10 outfielders back: 3 zonal six-yard headers, 4–5 tight man-markers, 1 short-corner guard, and 1 edge-of-box sweeper.',
          bestWhen: 'Final 10–15 minutes defending a one-goal lead or facing multiple 17+ Jumping Reach threats.',
          restDefence: 'Deliberately trades counter outlets for total box security.',
          keyRoles: [
            {
              assignment: 'Short-Corner Disruptor',
              targetAttrs: ['acc', 'wor', 'tck', 'ant'],
              note: 'Stops quick short-corner 2v1s immediately.',
            },
            {
              assignment: 'Central Box Organiser',
              targetAttrs: ['cnt', 'pos', 'jum', 'hea', 'ldr'],
              note: 'Maintains late-game focus when FM27 stamina fatigue peaks.',
            },
          ],
          pitfalls: [
            'Inviting repeat waves of pressure as clearances come straight back.',
            'Leaving tired, low-Concentration markers on tight assignments instead of bringing on fresh aerial subs.',
          ],
        },
      ],
    },
    {
      id: 'free-kicks',
      title: 'Free Kicks (Attacking & Defensive)',
      summary: 'Exploit diagonal crossing angles, match edge-of-box takers to Free Kick Taking, and keep defensive line discipline.',
      sourceIds: ['sortitoutsi-fm26-set-pieces', 'si-forums-tactics'],
      routines: [
        {
          id: 'wide-inswinging-fk',
          name: 'Wide Inswinging Free Kick — Back-Post Diagonal Run',
          delivery: 'Whipped inswinger aimed at the corridor between penalty spot and back post.',
          setup:
            'Line 3–4 aerial threats onside along the opposing line, trigger diagonal back-post runs, keep 1 short option wide, and hold 2–3 defenders back.',
          bestWhen: 'Wide attacking-third free kicks where the angle freezes the goalkeeper on his line.',
          restDefence: 'Hold 2 rapid defenders plus 1 midfielder at the top of the box against cleared counters.',
          keyRoles: [
            {
              assignment: 'Wide Free-Kick Taker',
              targetAttrs: ['fre', 'cro', 'tec', 'vis'],
              note: 'Whips dip and pace behind the line so any flick beats the keeper.',
            },
            {
              assignment: 'Back-Post Diagonal Runner',
              targetAttrs: ['jum', 'hea', 'otb', 'ant', 'bra'],
              note: 'Times the run onside to attack the ball with momentum.',
            },
          ],
          pitfalls: [
            'Low Off the Ball/Anticipation causing repeated offside flags.',
            'Committing tall CBs forward on deep midfield free kicks.',
          ],
        },
        {
          id: 'central-direct-vs-layoff',
          name: 'Central Edge-of-Box Direct Strike vs Lay-Off',
          delivery: 'Direct shot within 25 m for a 15+ Free Kick specialist; short lay-off or clip otherwise.',
          setup:
            'Assign your top Free Kick Taking + Technique striker, place 1 wall disruptor beside the wall, and station 2 rebound hunters ready for parries.',
          bestWhen: 'Central fouls 18–26 m from goal.',
          restDefence: 'Hold 3 defenders behind play — blocked wall strikes rebound fast into breaks.',
          keyRoles: [
            {
              assignment: 'Direct Free-Kick Specialist',
              targetAttrs: ['fre', 'tec', 'lon', 'cmp'],
              note: 'Produces reliable curl and dip over the defensive wall.',
            },
            {
              assignment: 'Rebound Hunter',
              targetAttrs: ['ant', 'acc', 'fin', 'otb'],
              note: 'Reacts first to parries and deflections off the wall.',
            },
          ],
          pitfalls: [
            'Letting a 10-rated taker fire speculative shots from 30+ m.',
            'Failing to cover the rebound lane off the wall.',
          ],
        },
        {
          id: 'defensive-wide-fk-line',
          name: 'Defensive Wide Free Kick — Disciplined Line & Wall Balance',
          delivery: 'Coordinated defensive line and minimal wall against angled crosses from 22–38 m.',
          setup:
            'Use a 1–2 man wall purely to block short passes/near-post drives, hold a flat line near the edge of the box matching tallest markers to jumpers, and leave 1 outlet high.',
          bestWhen: 'Defending wide free kicks where opponents whip balls behind the line.',
          restDefence: 'One outlet forward keeps opposing full-backs honest and provides an escape valve.',
          keyRoles: [
            {
              assignment: 'Defensive Line Anchor',
              targetAttrs: ['pos', 'cnt', 'jum', 'hea', 'ant'],
              note: 'Holds a flat line and drops together as the kicker strikes.',
            },
            {
              assignment: 'Goalkeeper Claimer',
              targetAttrs: ['aer', 'cmd', 'dec', 'han', 'pos'],
              note: 'Judges decisively whether to claim balls dropped behind the line.',
            },
          ],
          pitfalls: [
            'Putting 3–4 players in a wide wall where a direct shot is unlikely.',
            'Low-Concentration defenders stepping late and playing everyone onside.',
          ],
        },
      ],
    },
    {
      id: 'throw-ins',
      title: 'Throw-Ins (Attacking & Defensive)',
      summary: 'Weaponise Long Throws in the final third or retain possession and switch flanks cleanly.',
      sourceIds: ['sortitoutsi-fm26-set-pieces', 'sortitoutsi-fm27-attr-test'],
      routines: [
        {
          id: 'long-throw-box-overload',
          name: 'Long Throw Into the Six-Yard Chaos Zone',
          delivery: 'Flat, driven long throw hurled into the near-post / six-yard corridor (Long Throws 15+).',
          setup:
            'Put your highest Jumping Reach player at the near post for the flick-on, 2 finishers central/far post, 1 edge-of-box volleyer, and 1 short decoy.',
          bestWhen: 'Attacking-third throws with a 15+ Long Throws specialist and aerial box targets.',
          restDefence: 'Keep 2 rapid defenders + 1 CM back — throw-ins have NO offside, so opponents can camp high.',
          keyRoles: [
            {
              assignment: 'Long-Throw Specialist',
              targetAttrs: ['lth', 'str', 'bal'],
              note: 'Generates flat distance into the six-yard box; below 14 hangs too short.',
            },
            {
              assignment: 'Near-Post Flick-On Target',
              targetAttrs: ['jum', 'hea', 'bra', 'str'],
              note: 'Glances first contact across goal where defenders face their own net.',
            },
          ],
          pitfalls: [
            'Using long throws with a taker below 14 Long Throws.',
            'Forgetting offside does not apply on throw-ins.',
          ],
        },
        {
          id: 'short-triangle-switch',
          name: 'Short Triangle Retention & Opposite-Flank Switch',
          delivery: 'Short throw to feet with a bounce-pass back or inside to switch play away from pressure.',
          setup:
            'Offer 1 short receiver to feet, 1 half-space midfielder, and 1 forward pinning the line so you can bounce inside and switch to the isolated far-side winger.',
          bestWhen: 'Middle- and defensive-third throws, or attacking throws without a long-throw taker.',
          restDefence: 'Hold 3 defenders + 1 screening DM behind play against touchline interceptions.',
          keyRoles: [
            {
              assignment: 'Short Receiver',
              targetAttrs: ['fir', 'cmp', 'bal', 'pas', 'str'],
              note: 'Shields the ball under immediate touchline pressure and lays off cleanly.',
            },
            {
              assignment: 'Half-Space Switcher',
              targetAttrs: ['pas', 'vis', 'dec', 'tec'],
              note: 'Takes the second pass and switches play into open grass.',
            },
          ],
          pitfalls: [
            'Throwing blindly backwards under a high press without a safe CB/GK lane.',
            'Crowding 4+ players onto the throw-in sideline with nobody left to switch to.',
          ],
        },
        {
          id: 'defensive-throw-touchline-lock',
          name: 'Defensive Throw-In Touchline Press Lock',
          delivery: 'Ball-side marking trap pinning opposing throws against the touchline.',
          setup:
            'Man-mark every short receiver within 15 m tightly, position 1 CM to cut off the inward switch, and keep far-side defenders tucked narrow against flick-ons down the line.',
          bestWhen: 'Defending opposing throws in their own or middle third where the sideline acts as an extra defender.',
          restDefence: 'Hold depth against throws down the touchline since offside does not apply.',
          keyRoles: [
            {
              assignment: 'Ball-Side Tight Markers',
              targetAttrs: ['mar', 'ant', 'acc', 'agg', 'wor'],
              note: 'Deny easy bounce-passes and force contested aerial throws down the line.',
            },
            {
              assignment: 'Line-Channel Sweeper',
              targetAttrs: ['pos', 'pac', 'jum', 'hea', 'cnt'],
              note: 'Covers behind the full-back against quick throws down the channel.',
            },
          ],
          pitfalls: [
            'Over-committing every CM to the touchline and leaving the central pivot free to switch.',
            'Trying to play an offside trap on a throw-in.',
          ],
        },
      ],
    },
  ],
};

// ── Troubleshooting Guide (9 symptoms) ────────────────────────────────────────

export type TroubleshootingCategory =
  | 'Defence & Transitions'
  | 'Attack & Chance Creation'
  | 'Build-Up & Possession'
  | 'Fitness & Tactical Decay';

export interface TroubleshootingItem {
  id: string;
  symptom: string;
  category: TroubleshootingCategory;
  summary: string;
  rootCauses: readonly string[];
  fixes: readonly string[];
  ruleOfThumb: string;
  relatedRoles: readonly string[];
  relatedTIs: readonly string[];
  relatedPIs: readonly string[];
  presetId?: string;
  sourceIds: readonly SourceId[];
}

export const TROUBLESHOOTING: readonly TroubleshootingItem[] = [
  {
    id: 'conceding-over-the-top',
    symptom: 'Conceding balls over the top and breakaway 1v1s',
    category: 'Defence & Transitions',
    summary: 'Opponents repeatedly launch vertical passes behind your back line for rapid forwards.',
    rootCauses: [
      'Higher/Much Higher Defensive Line (or Step Up More) paired with slow CBs or a Line-Holding GK.',
      'Low Line of Engagement combined with a High Defensive Line, giving passers unpressured time.',
      'Tight Marking OIs on rapid Poachers or Channel Forwards who spin past defenders on the turn.',
    ],
    fixes: [
      'Switch OOP GK to Sweeper Keeper (SK) and pair one Stopping CB with a quick Covering CB.',
      'Change Defensive Line Behaviour from Step Up More to Balanced or Drop Off More, or drop Defensive Line one notch.',
      'Remove Tight Marking OIs on fast strikers and ensure your LoE pressures the passer.',
    ],
    ruleOfThumb: 'Change one variable at a time: test Drop Off More or Sweeper Keeper before rewriting your whole press.',
    relatedRoles: ['swk', 'ccb', 'cwcb', 'hfb'],
    relatedTIs: ['dline', 'dl_behaviour', 'loe'],
    relatedPIs: ['mark_tighter'],
    presetId: 'low-block-541',
    sourceIds: ['si-forums-tactics', 'sortitoutsi-oi-guide'],
  },
  {
    id: 'high-possession-low-xg',
    symptom: '65%+ possession with almost no clear chances (low xG vs low block)',
    category: 'Attack & Chance Creation',
    summary: 'Endless circulation in front of a packed 5-4-1 or 4-4-2 without dangerous box entries.',
    rootCauses: [
      'Too many creators (DLP + MP + AP + PW) dropping to feet while nobody attacks depth.',
      'Stacking Much Shorter Passing + Much Lower Tempo + Work Ball Into Box removes vertical risk.',
      'Narrow attacking width lets the opposing back five stay compact horizontally.',
    ],
    fixes: [
      'Widen attacking shape (Wider) to pull defenders horizontally and open half-spaces.',
      'Swap one dropping creator for a direct runner (CHM, SS, IF) and stagger FM27 Box-Attacking PIs.',
      'Lift Tempo by one notch or remove Work Ball Into Box so passers break lines before the block resets.',
    ],
    ruleOfThumb: 'Change one variable at a time: add vertical runners and width before raising Mentality.',
    relatedRoles: ['chm', 'ss', 'if_ip', 'wf_ip', 'w_ip'],
    relatedTIs: ['width', 'tempo', 'patience', 'creative', 'long_shots'],
    relatedPIs: ['arrive_late', 'target_far_post', 'take_more_risks'],
    presetId: 'asymmetric-4231',
    sourceIds: ['si-fm27-tweaks-me', 'si-forums-lines-diamonds', 'si-forums-tactics'],
  },
  {
    id: 'buildup-turnovers',
    symptom: 'Costly build-up turnovers near your own penalty area',
    category: 'Build-Up & Possession',
    summary: 'Keeper, centre-backs, or deep midfielders lose possession in your defensive third and gift tap-ins.',
    rootCauses: [
      'Play Through Press + Short Goal Kicks with low-Composure defenders or No-Nonsense roles.',
      'Coherence conflict: Play Through Press stacked with Much Higher Tempo and Much More Direct.',
      'No numerical superiority in the first wave (both full-backs bombing high with no HB or IFB).',
    ],
    fixes: [
      'Build a 3-2 base using a Half Back, Inside Full-Back, or Inside Wing-Back beside your CBs.',
      'Put Take Fewer Risks and Dribble Less on limited defenders, or switch Build-up to Balanced / Bypass Press.',
      'Lower Tempo slightly in build-up and use Pass to Feet if runners leave your passer isolated.',
    ],
    ruleOfThumb: 'Match Build-up Strategy to your GK/CB Composure and First Touch, not wishful thinking.',
    relatedRoles: ['bpgk', 'bpcb', 'hb', 'ifb', 'iwb', 'nncb'],
    relatedTIs: ['buildup', 'goal_kicks', 'gk_target', 'reception', 'tempo'],
    relatedPIs: ['take_fewer_risks', 'dribble_less', 'hold_position'],
    presetId: 'positional-325',
    sourceIds: ['si-fm26-tactics', 'si-forums-tactics'],
  },
  {
    id: 'mid-season-slump',
    symptom: 'Mid-season slump: the same tactic suddenly stops working',
    category: 'Fitness & Tactical Decay',
    summary: 'A tactic that dominated autumn suddenly feels sluggish and disconnected in winter.',
    rootCauses: [
      'FM27 ~3-week tactical training decay clock: skipping tactical sessions quietly drops Tactical Understanding (50% of Effectiveness).',
      'Tactical Complexity exceeds your squad’s Player Tactical Ability.',
      'Opponents play more cautiously against a rising reputation, turning transition games into low-block tests.',
    ],
    fixes: [
      'Audit FM27 Tactical Effectiveness (especially the 8 Understanding areas) and schedule weekly tactical training.',
      'Trim redundant TIs, PIs, and OIs to reduce Complexity and accelerate Understanding recovery.',
      'Use a touchline Tweak for packed low blocks (wider spacing + patient box runners) instead of scrapping your base tactic.',
    ],
    ruleOfThumb: 'Check Tactical Understanding and fatigue before assuming the AI "cracked" your tactic.',
    relatedRoles: ['cm_ip', 'dm_ip', 'cb_ip'],
    relatedTIs: ['width', 'patience', 'tempo'],
    relatedPIs: ['roam_from_position'],
    presetId: 'counter-442',
    sourceIds: ['si-fm27-effectiveness', 'sortitoutsi-fm27-effectiveness-test', 'sortitoutsi-fm27-decay-test'],
  },
  {
    id: 'tired-by-65',
    symptom: 'Players exhausted and conceding late goals after minute 65',
    category: 'Fitness & Tactical Decay',
    summary: 'Bright first hour followed by heavy legs, lost duels, and late goals conceded.',
    rootCauses: [
      'FM27 Hawk-Eye movement model punishes repeated high-speed sprints with steeper Stamina drain.',
      'Stacking Attacking Mentality + High Press + Trigger Press Much More + Counter-Press + Much Higher Tempo.',
      'Huge IP-to-OOP slot travel distances forcing wing-backs or tracking wingers to sprint 50+ m on every turnover.',
    ],
    fixes: [
      'Dial back Trigger Press and switch to Regroup or Lower Tempo via a touchline Tweak after minute 60.',
      'Shorten IP↔OOP travel distance by aligning OOP roles (e.g. IFB on one side, standard Winger OOP).',
      'Sub high-sprint roles proactively at minutes 58–65 and set Press Less on low-Stamina creators.',
    ],
    ruleOfThumb: 'Drop Trigger Press or Tempo first rather than abandoning your whole defensive shape.',
    relatedRoles: ['ifb', 'hfb', 'sdm', 'scm', 'wb_ip', 'tw'],
    relatedTIs: ['trigger', 'def_trans', 'tempo', 'loe', 'timewaste'],
    relatedPIs: ['press_less', 'hold_position'],
    presetId: 'counter-442',
    sourceIds: ['si-fm27-tweaks-me', 'sortitoutsi-fm27-me-tweaks', 'sortitoutsi-fm27-attr-test'],
  },
  {
    id: 'isolated-wingers',
    symptom: 'Isolated wingers or two players crowding the same wide lane',
    category: 'Attack & Chance Creation',
    summary: 'Wide attackers either receive completely isolated or stand on top of their own full-back.',
    rootCauses: [
      'Two touchline roles on the same flank (Winger IP + Wing-Back IP + Overlap) crowding the sideline.',
      'Two inverted roles (Inside Forward + Inside Wing-Back) vacating the touchline.',
      'A Wide Outlet staying high while the full-back holds deep, opening a 30 m isolation gap.',
    ],
    fixes: [
      'Apply the one-wide-player-per-flank rule: IF/IW + overlapping WB, or touchline W/WF + IWB/IFB.',
      'Match Supporting Runs to the flank (Overlap for inside wingers, Underlap for touchline wingers, Balanced for asymmetric flanks).',
      'Use Stay Wider or Sit Narrower PIs to separate two players sharing a corridor.',
    ],
    ruleOfThumb: 'Audit each flank independently: one player owns touchline width, the partner owns the half-space or rest-defence.',
    relatedRoles: ['w_ip', 'iw_ip', 'if_ip', 'wb_ip', 'iwb', 'ifb', 'wcm'],
    relatedTIs: ['support_runs', 'width', 'progress'],
    relatedPIs: ['stay_wider', 'sit_narrower'],
    presetId: 'direct-352',
    sourceIds: ['si-fm26-tactics', 'si-forums-lines-diamonds'],
  },
  {
    id: 'midfield-overrun',
    symptom: 'Midfield overrun and wide open between the lines',
    category: 'Defence & Transitions',
    summary: 'Opponents slice straight through central midfield into Zone 14 with minimal resistance.',
    rootCauses: [
      'High Press LoE paired with a Lower Defensive Line stretching the vertical gap between lines.',
      'Too many OOP Outlet roles (3+) or aggressive Pressing CMs chasing out of shape without a Screening partner.',
      'Both CMs surging forward in possession (B2B + CHM) leaving fewer than 3–5 players in rest-defence.',
    ],
    fixes: [
      'Align Line of Engagement and Defensive Line (High Press + Higher/Much Higher, or Mid Block + Standard).',
      'Assign at least one Screening DM or Screening CM out of possession and cap OOP Outlets at 1–2.',
      'Add Hold Position to your deeper midfielder or tuck one full-back inside (IFB/IWB).',
    ],
    ruleOfThumb: 'Never separate LoE and Defensive Line by more than one step.',
    relatedRoles: ['sdm', 'scm', 'dm_ip', 'ifb', 'iwb', 'scb'],
    relatedTIs: ['loe', 'dline', 'trigger', 'press_trap'],
    relatedPIs: ['hold_position', 'press_less'],
    presetId: 'high-press-433',
    sourceIds: ['si-fm26-tactics', 'si-forums-lines-diamonds'],
  },
  {
    id: 'weak-counter-press',
    symptom: 'Counter-press gets played straight through on every turnover',
    category: 'Defence & Transitions',
    summary: 'One pass bypasses your immediate press on turnovers and exposes your back line.',
    rootCauses: [
      'Counter-Press active alongside Much Wider width — players are too far apart horizontally to swarm.',
      'Fewer than 3 players in rest-defence because both full-backs and CMs pushed high.',
      'Over-stacking Attacking Mentality + Much More Trigger Press with low-Teamwork or fatigued legs.',
    ],
    fixes: [
      'Pull Attacking Width back to Balanced or Narrower so teammates stay close enough to swarm on loss.',
      'Lock in a 3-2 or 3-1 rest-defence (two CBs + IFB + holding DM/IWB with Hold Position).',
      'If your squad lacks Stamina, Acceleration, and Teamwork, switch Defensive Transition to Balanced or Regroup.',
    ],
    ruleOfThumb: 'Counter-pressing succeeds through proximity at the moment of loss, not just ticking Counter-Press.',
    relatedRoles: ['ifb', 'iwb', 'dm_ip', 'hb', 'wcdm', 'wccm'],
    relatedTIs: ['def_trans', 'width', 'trigger'],
    relatedPIs: ['hold_position'],
    presetId: 'positional-325',
    sourceIds: ['si-forums-lines-diamonds', 'si-forums-tactics', 'sortitoutsi-mentality-ladder'],
  },
  {
    id: 'empty-box',
    symptom: 'Plenty of crosses and cut-backs, but nobody attacking the box',
    category: 'Attack & Chance Creation',
    summary: 'Wingers and wing-backs reach great crossing spots only to find one outnumbered striker.',
    rootCauses: [
      'Dropping striker (False Nine or DLF) without vertical runners (SS, IF, CHM, B2B) replacing him.',
      'Multiple attackers crowding the exact same central spot instead of staggering across zones.',
      'Crossing Style mismatched to your forwards (e.g. Floated Crosses to a short, quick striker).',
    ],
    fixes: [
      'Stagger FM27 Box-Attacking PIs across 3–4 attackers: Near Post (ST), Centre (AM/SS), Far Post (far-side WF/IF), Arrive Late (B2B/CHM).',
      'Match Crossing Style to personnel: Low for quick Poachers, Floated for Target Forwards, Whipped for staggered runners.',
      'With a False Nine or DLF, ensure at least two teammates attack the defensive line or crash the box.',
    ],
    ruleOfThumb: 'Occupy 3 distinct box zones on wide deliveries while holding 3–5 players in rest-defence.',
    relatedRoles: ['poa', 'tf', 'ss', 'wf_ip', 'if_ip', 'b2b', 'chm'],
    relatedTIs: ['crossing', 'patience', 'support_runs'],
    relatedPIs: ['target_near_post', 'target_centre', 'target_far_post', 'arrive_late', 'attack_the_defensive_line'],
    presetId: 'asymmetric-4231',
    sourceIds: ['si-fm27-tweaks-me', 'sortitoutsi-fm27-me-tweaks'],
  },
] as const;

// ── In-Match Guide (FM27 Tactical Tweaks + Rebuilt Shouts + Half-Time) ────────

export type TweakCategory = 'Game State' | 'Attacking' | 'Defensive' | 'Situational';

export interface TacticalTweakItem {
  id: string;
  name: string;
  category: TweakCategory;
  whenToUse: string;
  whatItAdjusts: string;
  caution: string;
  sourceIds: readonly SourceId[];
}

export interface ShoutItem {
  id: string;
  name: string;
  bestMatchState: string;
  bestMoodOrPersonality: string;
  avoidWhen: string;
  expectedEffect: string;
  sourceIds: readonly SourceId[];
}

export interface InMatchGuide {
  tweaksOverview: string;
  tweaksVsMainTactic: readonly string[];
  tweaks: readonly TacticalTweakItem[];
  shoutsOverview: string;
  shouts: readonly ShoutItem[];
  halfTimeChecklist: readonly string[];
  sourceIds: readonly SourceId[];
}

export const IN_MATCH_GUIDE: InMatchGuide = {
  tweaksOverview:
    'Introduced in FM27, Tactical Tweaks are one-click touchline bundles that adjust coordinated combinations of team and player instructions in real time without permanently rewriting your base tactic. Staff provide timing cues and undo prompts when match conditions shift.',
  tweaksVsMainTactic: [
    'Use Tactical Tweaks for temporary match-state reactions (protecting a 75th-minute lead, chasing a late goal, flipping wingers against a booked full-back) so your base Tactical Understanding stays intact.',
    'Edit your main tactic only when diagnosing a recurring structural flaw across multiple matches — constant permanent edits raise Complexity and hurt Understanding.',
    'Undo temporary Tweaks immediately when the match state shifts (e.g. cancel Push for a Goal as soon as you equalise).',
  ],
  tweaks: [
    {
      id: 'swap-wings',
      name: 'Swap Wings',
      category: 'Attacking',
      whenToUse: 'When wide forwards are pocketed 1v1, or to isolate a slow, fatigued, or booked opposing full-back.',
      whatItAdjusts: 'Swaps left and right wide players temporarily, altering whether they cut inside or stay on their stronger foot.',
      caution: 'Verify your full-backs/wing-backs still balance width behind the swapped wingers.',
      sourceIds: ['si-fm27-tweaks-me', 'sortitoutsi-fm27-me-tweaks'],
    },
    {
      id: 'push-for-a-goal',
      name: 'Push for a Goal / Go More Direct',
      category: 'Game State',
      whenToUse: 'Trailing or chasing a winner in the final 15–20 minutes against a settled defence.',
      whatItAdjusts: 'Bundles higher urgency, faster tempo, more direct box service, and aggressive forward commitment.',
      caution: 'Severely exposes rest-defence and drains late Stamina; revert immediately once you score.',
      sourceIds: ['si-fm27-tweaks-me', 'sortitoutsi-fm27-me-tweaks'],
    },
    {
      id: 'protect-the-lead',
      name: 'Shut Up Shop / Protect the Lead',
      category: 'Defensive',
      whenToUse: 'Defending a one-goal lead in the final 10–15 minutes while opponents throw bodies forward.',
      whatItAdjusts: 'Bundles lower tempo, higher time wasting, regrouping on turnovers, and conservative rest-defence.',
      caution: 'Activating too early (minute 55) invites sustained waves of pressure onto your box.',
      sourceIds: ['si-fm27-tweaks-me', 'sortitoutsi-fm27-me-tweaks'],
    },
    {
      id: 'manage-fatigue',
      name: 'Dial Back Pressing Intensity',
      category: 'Defensive',
      whenToUse: 'Minutes 60–70 when FM27 Hawk-Eye stamina drain pushes pressing roles into orange/red.',
      whatItAdjusts: 'Lowers Trigger Press and transition aggression so the block stays compact instead of chasing.',
      caution: 'Pair with fresh substitutions on wing-backs and pressing midfielders.',
      sourceIds: ['si-fm27-tweaks-me', 'sortitoutsi-fm27-me-tweaks'],
    },
    {
      id: 'send-gk-forward',
      name: 'Send Goalkeeper Forward',
      category: 'Situational',
      whenToUse: 'Stoppage time of a must-win or knockout tie on a late attacking corner or free kick.',
      whatItAdjusts: 'Sends your goalkeeper into the opposition penalty area as an extra aerial body.',
      caution: 'Leaves an empty net on clearances — strictly for closing moments when conceding no longer matters.',
      sourceIds: ['si-fm27-tweaks-me'],
    },
  ],
  shoutsOverview:
    'Rebuilt from the ground up in FM27 around live player mood, mental state, match context, and personality. Rather than spamming one generic shout on cooldown, match the shout directly to the psychological moment.',
  shouts: [
    {
      id: 'dig-deeper-fire-up',
      name: 'Dig Deeper / Fire Up',
      bestMatchState: 'Level or trailing by one goal in a tight contest where energy is dipping.',
      bestMoodOrPersonality: 'Determined, Driven, Professional, or Spirited players who thrive on competitive challenge.',
      avoidWhen: 'Players look Nervous, Anxious, or Frustrated — pushes them into reckless fouls or errors.',
      expectedEffect: 'Lifts focus, motivation, and work rate for pushing back into the match.',
      sourceIds: ['si-fm27-tweaks-me', 'sortitoutsi-fm27-me-tweaks'],
    },
    {
      id: 'well-done',
      name: 'Well Done',
      bestMatchState: 'Leading comfortably, or right after a goal, crucial save, or strong spell.',
      bestMoodOrPersonality: 'Confident or encouraged squads; especially effective on young players.',
      avoidWhen: 'Trailing, playing poorly, or when players already look Complacent.',
      expectedEffect: 'Reinforces morale, Composure, and confidence during positive spells.',
      sourceIds: ['si-fm27-tweaks-me', 'sortitoutsi-fm27-me-tweaks'],
    },
    {
      id: 'up-your-game',
      name: 'Up Your Game',
      bestMatchState: 'Underperforming as favourites, flat first half, or trailing a weaker opponent.',
      bestMoodOrPersonality: 'High-Determination, Professional, or Resolute squads accepting accountability.',
      avoidWhen: 'Already winning, or on low-Pressure/sensitive players who are overwhelmed.',
      expectedEffect: 'Demands sharper execution and higher standards from coasting players.',
      sourceIds: ['si-fm27-tweaks-me', 'sortitoutsi-fm27-me-tweaks'],
    },
    {
      id: 'wake-up',
      name: 'Wake Up',
      bestMatchState: 'Players showing Complacent or Uninterested body language while leading.',
      bestMoodOrPersonality: 'Complacent favourites switching off defensively before half-time or at 2-0.',
      avoidWhen: 'Players are already giving full effort or feeling Anxious under heavy pressure.',
      expectedEffect: 'Snaps players out of complacency to prevent Concentration lapses.',
      sourceIds: ['si-fm27-tweaks-me', 'sortitoutsi-fm27-me-tweaks'],
    },
    {
      id: 'calm-down',
      name: 'Calm Down',
      bestMatchState: 'Tense late minutes, heated derbies, or multiple Frustrated/Aggressive/booked players.',
      bestMoodOrPersonality: 'Volatile, Aggressive, or Frustrated players risking reckless tackles or rushed shots.',
      avoidWhen: 'Team looks flat, lethargic, or Complacent — removes needed edge.',
      expectedEffect: 'Steadies emotional volatility so defenders stay on their feet and passers keep composure.',
      sourceIds: ['si-fm27-tweaks-me', 'sortitoutsi-fm27-me-tweaks'],
    },
    {
      id: 'no-pressure',
      name: 'No Pressure',
      bestMatchState: 'Underdog fixtures, cup finals, relegation six-pointers, or Nervous/Anxious youth.',
      bestMoodOrPersonality: 'Nervous, Anxious, or lower-Pressure younger players feeling the occasion.',
      avoidWhen: 'Heavy favourites who are already Complacent — kills urgency.',
      expectedEffect: 'Relieves anxiety so players pass and finish closer to their true technical level.',
      sourceIds: ['si-fm27-tweaks-me', 'sortitoutsi-fm27-me-tweaks'],
    },
  ],
  halfTimeChecklist: [
    'Change one variable at a time and observe 10–15 match minutes before layering another adjustment.',
    'Inspect FM27’s returning Heat Maps and Action Zones to spot overcrowded lanes or empty zones before touching Team Instructions.',
    'Check individual ratings, pass completion, and Opponent OIs — one struggling build-up defender or unpressed opposing playmaker is often the real culprit.',
    'Plan Stamina substitutions early (minutes 58–68) for high-sprint roles (Wing-Backs, Tracking Wingers, Pressing CMs).',
    'Check booked defenders and immediately apply Ease Off Tackles before a second yellow decides the match.',
  ],
  sourceIds: ['si-fm27-tweaks-me', 'sortitoutsi-fm27-me-tweaks'],
};
