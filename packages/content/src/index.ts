import attributes from '../data/attributes.json';
import concepts from '../data/concepts.json';
import groups from '../data/groups.json';
import mentalities from '../data/mentalities.json';
import opponents from '../data/opponents.json';
import playerInstructions from '../data/player-instructions.json';
import teamInstructions from '../data/team-instructions.json';

export { attributes, concepts, groups, mentalities, opponents, playerInstructions, teamInstructions };
export { KNOWLEDGE, FORMATIONS, OPP_FORMATION } from './knowledge';
export { ROLE_PROFILES, OVERRIDES, type ContentProfile } from './roles/profiles';
export { ROLES, ROLE_BY_ID, DEFAULT_ROLE, groupOf, isWideCB, roleFits, rolesFor, type Group, type RoleData } from './roles/valid';
export { TI_EFFECTS, PI_EFFECTS, TI_DEFAULTS, type TIKey } from './instructions/effects';
export { SCENES, buildScene, type Scene, type SceneOpts } from './scenes';
export type { SceneLesson } from './scenes/builder';
