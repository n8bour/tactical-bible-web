import type { Effect, PIKey, PlayerMods, TeamMods } from '@tb/sim';
import tiData from '../../data/team-instructions.json';

type TIDef = (typeof tiData)[number];
export type TIKey = TIDef['key'];

const DEF: Record<string, number> = Object.fromEntries(tiData.map((t) => [t.key, t.default]));
const UNCONF: Record<string, boolean> = Object.fromEntries(tiData.map((t) => [t.key, t.unconf]));
const sign = (c: number) => (c < 0 ? -1 : c > 0 ? 1 : 0) as -1 | 0 | 1;

const RULES: Record<string, { note: string; fn: (i: number, c: number) => TeamMods }> = {
  passing: { note: 'Preferred pass length 18 m ± 7 m per step.', fn: (_, c) => ({ passLenPref: 7 * c }) },
  tempo: { note: 'Decision interval on the ball ×(1 − 0.12 per step).', fn: (_, c) => ({ tempo: 1 - 0.12 * c }) },
  width: { note: 'In-possession lateral spread ×0.68…1.24.', fn: (i) => ({ widthScale: [0.68, 0.84, 1.0, 1.12, 1.24][i] }) },
  creative: { note: 'Risk aversion −0.15 per step towards Expressive; slight through-ball bias.', fn: (_, c) => ({ riskAversion: -0.15 * c, throughBias: 0.1 * c }) },
  att_trans: { note: 'After winning the ball: run probability +0.15 per step and the block pushes up 4 m per step.', fn: (_, c) => ({ supportRunsP: 0.15 * c, blockShift: { win: 4 * c } }) },
  set_pieces: { note: 'Play for Set Pieces nudges wide players to cross (to win corners).', fn: (_, c) => ({ crossBias: 0.1 * c }) },
  timewaste: { note: 'More time wasting slows decisions on the ball and restarts.', fn: (_, c) => ({ tempo: 1 + 0.06 * c, restartSpeed: -c }) },
  reception: { note: 'Into Space: passes are led further ahead and through balls favoured; To Feet: the reverse.', fn: (_, c) => ({ receptionSpace: -c, throughBias: -0.2 * c }) },
  buildup: {
    note: 'Through Press: shorter passes and short keeper distribution; Bypass: longer, keeper goes long, team higher in build-up.',
    fn: (_, c) => ({ passLenPref: 5 * c, blockShift: { build: 3 * c }, ...(c ? { gkDistribution: c < 0 ? 'short' : 'long' } : {}) }),
  },
  goal_kicks: { note: 'Keeper distribution length.', fn: (i) => ({ gkDistribution: (['short', 'mixed', 'long'] as const)[i] }) },
  gk_speed: { note: 'Faster restarts after the keeper gains the ball.', fn: (_, c) => ({ restartSpeed: c }) },
  gk_target: {
    note: 'Centre-backs/full-backs → short distribution, flanks → mixed, target forward → long.',
    fn: (i) => (i === 2 ? {} : { gkDistribution: (['short', 'short', 'mixed', 'mixed', 'long'] as const)[i] }),
  },
  support_runs: { note: 'Full-backs and wing-backs add overlapping or underlapping runs in the final third.', fn: (_, c) => ({ overlap: sign(c) }) },
  dribbling: { note: 'Carry utility ±0.15 per step.', fn: (_, c) => ({ carryBias: 0.15 * c }) },
  progress: {
    note: 'Left/Right sets which flank central players favour; Centre narrows the shape slightly.',
    fn: (i) => (i === 0 ? { flankBias: -1 } : i === 3 ? { flankBias: 1 } : i === 2 ? { widthScale: 0.92 } : {}),
  },
  patience: { note: 'Hit Early Crosses raises cross utility; Work Ball Into Box lowers crossing and long shots.', fn: (_, c) => ({ crossBias: -0.25 * c, shootBias: -0.1 * c }) },
  long_shots: { note: 'Shot utility ±0.15 per step (the shot is considered from further out too).', fn: (_, c) => ({ shootBias: 0.15 * c }) },
  crossing: { note: 'Ball flight of crosses: low and driven, whipped (fast), floated (slow, high).', fn: (i) => (i === 1 ? {} : { crossHeight: (['low', 'mixed', 'whipped', 'floated'] as const)[i] }) },
  loe: { note: 'Line of engagement depth 40/56/72 m from own goal.', fn: (i) => ({ loe: [40, 56, 72][i] }) },
  dline: { note: 'Defensive line depth 22–46 m from own goal.', fn: (i) => ({ lineHeight: [22, 28, 34, 40, 46][i] }) },
  trigger: { note: 'Press radius ×(1 + 0.2 per step).', fn: (_, c) => ({ pressTrigger: 1 + 0.2 * c }) },
  def_trans: { note: 'Counter-Press widens press radius for 4 s after losing the ball; Regroup drops straight into the block.', fn: (_, c) => ({ counterpress: Math.max(0, c) * 0.6, regroup: Math.max(0, -c) }) },
  tackling: { note: 'Tackle commitment ±0.15 per step (more wins and more fouls).', fn: (_, c) => ({ tackleCommit: 0.15 * c }) },
  press_trap: { note: 'Outside: wide players tuck in to show the ball wide; Inside: they stay wider to force it inside.', fn: (_, c) => ({ trapSide: sign(c) }) },
  cross_eng: { note: 'Stop Crosses makes full-backs and wing-backs press wide carriers harder; Invite lets them drop off.', fn: (_, c) => ({ crossBlock: c }) },
  short_gk: { note: 'Forwards push up onto the keeper when he has the ball.', fn: (i) => ({ gkPress: i }) },
  dl_behaviour: { note: 'Step Up pushes the line 2 m higher, Drop Off 2 m deeper.', fn: (_, c) => ({ lineStep: c }) },
};

export const TI_EFFECTS: Record<TIKey, (opt: number) => Effect<TeamMods>> = Object.fromEntries(
  tiData.map((t) => {
    const rule = RULES[t.key];
    if (!rule) throw new Error(`No effect rule for team instruction ${t.key}`);
    const unconf = UNCONF[t.key] ? ' Options unconfirmed for FM27.' : '';
    return [t.key, (opt: number) => ({ src: 'est' as const, note: rule.note + unconf, mods: rule.fn(opt, opt - DEF[t.key]) })];
  }),
);

export const TI_DEFAULTS: Record<string, number> = DEF;

const pe = (note: string, mods: PlayerMods): Effect<PlayerMods> => ({ src: 'est', note, mods });

export const PI_EFFECTS: Record<PIKey, Effect<PlayerMods>> = {
  shoot_more: pe('Shot utility +0.3 and shoots from further out.', { shootBias: 0.3 }),
  shoot_less: pe('Shot utility −0.3.', { shootBias: -0.3 }),
  dribble_more: pe('Carry utility +0.3.', { carryBias: 0.3 }),
  dribble_less: pe('Carry utility −0.3.', { carryBias: -0.3 }),
  take_more_risks: pe('Through-ball utility +0.35, risk aversion −0.25.', { throughBias: 0.35, riskAversion: -0.25 }),
  take_fewer_risks: pe('Through-ball utility −0.35, risk aversion +0.25.', { throughBias: -0.35, riskAversion: 0.25 }),
  cross_from_byline: pe('Cross utility rises close to the byline and falls from deep.', { crossZone: 'byline' }),
  cross_from_deep: pe('Cross utility rises from deep and falls near the byline.', { crossZone: 'deep' }),
  roam_from_position: pe('Drifts 35 % towards the ball side and 4 m higher (scaled by 0.6).', { roam: 0.6 }),
  stay_wider: pe('Lane 6 m wider.', { laneShift: 6 }),
  sit_narrower: pe('Lane 6 m narrower.', { laneShift: -6 }),
  hold_position: pe('Makes no forward runs.', { holdRuns: true }),
  get_further_forward: pe('Target depth +8 m in possession.', { depthShift: 8 }),
  move_into_channels: pe('Adds channel runs in progression and the final third.', { channelRun: true }),
  press_more: pe('Press radius ×1.35.', { pressRadius: 1.35 }),
  press_less: pe('Press radius ×0.7.', { pressRadius: 0.7 }),
  mark_tighter: pe('Marking distance −1 m.', { markDist: -1.0 }),
  tackle_harder: pe('Tackle commitment +0.25.', { tackleCommit: 0.25 }),
  ease_off_tackles: pe('Tackle commitment −0.25.', { tackleCommit: -0.25 }),
  arrive_late: pe('Adds a box run that starts 1.2 s after the trigger.', { lateRun: true }),
  attack_the_defensive_line: pe('Holds a position on the last defender’s shoulder (line − 0.5 m).', { lineRun: true }),
  target_near_post: pe('Box runs go to the near post.', { boxTarget: 'near' }),
  target_centre: pe('Box runs go to the centre of the box.', { boxTarget: 'centre' }),
  target_far_post: pe('Box runs go to the far post.', { boxTarget: 'far' }),
};
