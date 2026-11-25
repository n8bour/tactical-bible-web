import data from '@tb/content/data/formations.json';
import { fromLegacy, WID, type Pt } from '../components/pitch/Pitch';

// Static formation geometry for the concept boards. It reads the same data FORMATIONS is built from, but
// without importing the whole content package (scenes, role profiles, sim) into the browser bundle.
const FORMATION_DATA = data.formations as Record<string, Array<{ code: string; x: number; y: number }>>;

export type Slots = Record<string, Pt>;

/** Slot code -> position in metres (home team, own goal at x = 0, attacking +x, y = 0 is the attacker's left). */
export function slots(formation: string): Slots {
  const list = FORMATION_DATA[formation];
  if (!list) throw new Error(`Unknown formation: ${formation}`);
  return Object.fromEntries(list.map((s) => [s.code, fromLegacy(s)]));
}

export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Scale a lateral position around the pitch centre line. */
export const spread = (y: number, k: number) => WID / 2 + (y - WID / 2) * k;

/** The five vertical lanes (wide, half-space, centre, half-space, wide) are equal slices of the pitch width. */
export const LANE_H = WID / 5;
export const LANE_NAMES = ['Wide', 'Half-space', 'Centre', 'Half-space', 'Wide'] as const;
export const laneOf = (y: number) => Math.min(4, Math.max(0, Math.floor(y / LANE_H)));

/** Moves a formation slot up the pitch into an attacking shape (depth 20 -> x 44, depth 84 -> x 99). */
export const attackX = (p: Pt) => Math.min(99, 44 + (p.x / 1.05 - 20) * 0.9);
