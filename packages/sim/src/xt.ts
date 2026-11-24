import type { Vec } from './types';

// Expected-threat grid, 12 zones along the length × 8 across the width, own goal → opponent goal.
// Shape follows Karun Singh's public xT grid (karun.in/blog/expected-threat.html); values transcribed approximately,
// and the four touchline-to-centre rows are mirrored for the other half of the pitch.
const HALF: number[][] = [
  [0.00638, 0.0078, 0.00845, 0.00978, 0.01126, 0.01248, 0.01473, 0.01745, 0.02122, 0.02756, 0.03485, 0.03793],
  [0.0075, 0.00878, 0.00942, 0.01059, 0.01214, 0.01384, 0.01611, 0.0187, 0.02401, 0.02953, 0.04066, 0.04647],
  [0.00887, 0.00977, 0.01043, 0.01151, 0.01279, 0.01427, 0.0165, 0.01939, 0.0239, 0.03447, 0.06042, 0.115],
  [0.00941, 0.01082, 0.01016, 0.01132, 0.01262, 0.01484, 0.01637, 0.01883, 0.02402, 0.03728, 0.10951, 0.25365],
];
export const XT_GRID: number[][] = [...HALF, ...HALF.slice().reverse()];
export const XT_SRC = { src: 'est' as const, note: 'Approximates Karun Singh, “Introducing Expected Threat (xT)”, 2018 (public 12×8 grid); re-check values before marking conf.' };

/** xT at a point in team frame (x = 0 own goal line → 105, y = 0 → 68). */
export function xt(p: Vec): number {
  const c = Math.min(11, Math.max(0, Math.floor((p.x / 105) * 12)));
  const r = Math.min(7, Math.max(0, Math.floor((p.y / 68) * 8)));
  return XT_GRID[r][c];
}
