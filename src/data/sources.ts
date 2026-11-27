export type SourceCategory = 'official' | 'guide' | 'engine-test' | 'forum';

export interface PublicSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  scope: string;
  category: SourceCategory;
}

export const PUBLIC_SOURCES = [
  {
    id: 'si-fm26-tactics',
    title: "In Possession & Out of Possession: FM26's New Tactical Evolution",
    publisher: 'Sports Interactive',
    url: 'https://www.footballmanager.com/news/possession-out-possession-fm26s-new-tactical-evolution',
    scope:
      'Dual IP/OOP formations, removal of legacy role modifiers, 3x3 Visualiser, new IP roles, 28 specialized OOP roles, and contextual build-up Team Instructions.',
    category: 'official',
  },
  {
    id: 'si-fm27-effectiveness',
    title: "Tactical Effectiveness: Understanding FM27's Key New Feature",
    publisher: 'Sports Interactive',
    url: 'https://www.footballmanager.com/the-dugout/tactical-effectiveness-understanding-fm27s-key-new-feature',
    scope:
      'FM27 Tactical Effectiveness 4-pillar model (Understanding 50% across 8 areas, Buy-In 25%, Next Match Info 15%, Ability 10%), Tactical Complexity, Training integration, and Projected Effectiveness.',
    category: 'official',
  },
  {
    id: 'si-fm27-tweaks-me',
    title: 'FM27 Tactical Tweaks and Match Engine Upgrades',
    publisher: 'Sports Interactive',
    url: 'https://www.footballmanager.com/fm27/features/fm27-tactical-tweaks-and-match-engine-upgrades',
    scope:
      'FM27 Tactical Tweaks touchline bundles, Attacking the Box PIs (depth/timing + target zones), rebuilt mood/personality Shouts, and Hawk-Eye movement, stamina, and 1v1 jockeying match engine upgrades.',
    category: 'official',
  },
  {
    id: 'sortitoutsi-fm26-tactics',
    title: 'FM26 New Tactics Revealed',
    publisher: 'Sortitoutsi',
    url: 'https://sortitoutsi.net/content/74556/fm-26-new-tactics-revealed',
    scope:
      'Overview of FM26 dual IP/OOP formations, four tactical views (IP, OOP, Both, Combined), Visualiser, and replacement of legacy three-tier role settings.',
    category: 'guide',
  },
  {
    id: 'sortitoutsi-fm26-roles',
    title: 'Updated FM26 Player Roles Revealed',
    publisher: 'Sortitoutsi',
    url: 'https://sortitoutsi.net/content/74008/updated-fm26-player-roles-revealed',
    scope:
      'FM26/FM27 IP and OOP role roster, legacy FM24 role transitions (e.g. Mezzala, Carrilero, BWM, Pressing Forward), and positional strata.',
    category: 'guide',
  },
  {
    id: 'sortitoutsi-fm26-role-attrs',
    title: 'FM26 Important Attributes for Every Role',
    publisher: 'Sortitoutsi',
    url: 'https://sortitoutsi.net/content/75078/fm26-important-attributes-for-every-role',
    scope: 'Key and preferred attribute mappings for FM26/FM27 In Possession and Out of Possession player roles.',
    category: 'guide',
  },
  {
    id: 'sortitoutsi-player-roles-tool',
    title: 'FM Player Roles & Attributes Reference Tool',
    publisher: 'Sortitoutsi',
    url: 'https://sortitoutsi.net/tools/player-roles',
    scope: 'Position availability and key/preferred attribute breakdown across all FM26/FM27 IP and OOP role groups.',
    category: 'guide',
  },
  {
    id: 'sortitoutsi-fm27-training-tactics',
    title: 'FM27 Training and Tactics: New System Breakdown',
    publisher: 'Sortitoutsi',
    url: 'https://sortitoutsi.net/content/77912/fm27-training-and-tactics-new-system',
    scope:
      'FM27 training overhaul, Tactical Effectiveness pillars, Tactical Complexity, and weekly tactical preparation schedules.',
    category: 'guide',
  },
  {
    id: 'sortitoutsi-fm27-me-tweaks',
    title: 'FM27 Match Engine and Tactical Tweaks',
    publisher: 'Sortitoutsi',
    url: 'https://sortitoutsi.net/content/77885/fm27-match-engine-and-tactical-tweaks',
    scope:
      'FM27 touchline Tactical Tweaks, rebuilt morale/mood Shouts, returning Heat Maps & Action Zones, and Hawk-Eye ME physical/1v1 changes.',
    category: 'guide',
  },
  {
    id: 'sortitoutsi-fm27-effectiveness-test',
    title: 'Full Analysis and Testing of Tactical Effectiveness and Tactical Understanding',
    publisher: 'Sortitoutsi',
    url: 'https://sortitoutsi.net/content/78377/full-analysis-and-testing-of-tactical-effectiveness-and-tactical-understanding',
    scope:
      'Empirical breakdown of the 50/25/15/10 Effectiveness weights, 8 Understanding areas, and the mental-attribute Tactical Ability formula (Anticipation, Decisions, Composure, Concentration, Versatility).',
    category: 'engine-test',
  },
  {
    id: 'sortitoutsi-fm27-decay-test',
    title: "How to Stop Your Squad From Forgetting Your Tactic: Mastering FM27's Training & Tactical Effectiveness",
    publisher: 'Sortitoutsi',
    url: 'https://sortitoutsi.net/content/78794/how-to-stop-your-squad-from-forgetting-your-tactic-mastering-fm27s-training-tactical-effectiveness',
    scope:
      'Community match-engine testing demonstrating that Tactical Understanding drives ME performance delta and documenting the ~3-week tactical training decay clock.',
    category: 'engine-test',
  },
  {
    id: 'sortitoutsi-fm27-attr-test',
    title: 'FM27 Attribute Test: Tactical Understanding, Training System & Engine Reverse-Engineering',
    publisher: 'Sortitoutsi',
    url: 'https://sortitoutsi.net/content/78219/fm27-attribute-test-tactical-understanding-training-system-preset-tactics-ai-reverse-engineering-engine-for-test',
    scope:
      'Match-engine attribute impact testing highlighting physical dominance (Pace, Acceleration, Stamina, Jumping Reach), GK Agility/Reflexes, and non-linear attribute thresholds.',
    category: 'engine-test',
  },
  {
    id: 'sortitoutsi-oi-guide',
    title: 'FM26 Guide: Opposition Instructions',
    publisher: 'Sortitoutsi',
    url: 'https://sortitoutsi.net/content/76647/fm26-guide-opposition-instructions',
    scope:
      'Selective Opposition Instruction targeting, weak-foot funneling without breaking block shape, attribute-based pressing/marking rules, and foul/card management.',
    category: 'guide',
  },
  {
    id: 'sortitoutsi-mentality-ladder',
    title: 'The Mentality Ladder (Part 2)',
    publisher: 'Sortitoutsi',
    url: 'https://sortitoutsi.net/content/11189/the-mentality-ladder-part-2',
    scope:
      'How Mentality acts as a global baseline multiplier for risk, tempo, directness, width, and lines, with Team Instructions stacking relatively on top.',
    category: 'guide',
  },
  {
    id: 'sortitoutsi-fm26-set-pieces',
    title: 'FM26 / FM27 Set Pieces Downloads & Routines Hub',
    publisher: 'Sortitoutsi',
    url: 'https://sortitoutsi.net/football-manager-2026-downloads/type/set_piece',
    scope:
      'Community set-piece routines for corners, free kicks, and throw-ins covering aerial target positioning, delivery zones, and rest-defence balance.',
    category: 'guide',
  },
  {
    id: 'si-forums-lines-diamonds',
    title: "Lines and Diamonds: The Tactician's Handbook",
    publisher: 'Sports Interactive Forums',
    url: 'https://community.sigames.com/forums/topic/345094-lines-and-diamonds-the-tacticians-handbook-for-football-manager-2015/',
    scope:
      'Foundational FM tactical principles: four phases of play, width, depth, penetration, compactness, lines & diamonds geometry, and role balance.',
    category: 'forum',
  },
  {
    id: 'si-forums-tactics',
    title: 'Sports Interactive Forums — Tactics, Training & Strategies',
    publisher: 'Sports Interactive Forums',
    url: 'https://community.sports-interactive.com/forums/',
    scope:
      'Foundational community tactical literature (Pairs & Combinations, attribute interactions such as Off the Ball vs Positioning, Player Traits, Opposition Instruction traps, and troubleshooting methodology).',
    category: 'forum',
  },
] as const satisfies readonly PublicSource[];

export type SourceId = (typeof PUBLIC_SOURCES)[number]['id'];

export const SOURCE_BY_ID: Record<SourceId, PublicSource> = Object.fromEntries(
  PUBLIC_SOURCES.map((s) => [s.id, s]),
) as Record<SourceId, PublicSource>;

export function getSources(ids: readonly string[]): PublicSource[] {
  return ids
    .map((id) => SOURCE_BY_ID[id as SourceId])
    .filter((s): s is PublicSource => s !== undefined);
}
