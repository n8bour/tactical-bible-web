import type { TeamId, Vec } from './types';

export const PITCH = { len: 105, wid: 68, goalHalf: 3.66 } as const;

export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const lerp = (a: Vec, b: Vec, w: number): Vec => ({ x: a.x + (b.x - a.x) * w, y: a.y + (b.y - a.y) * w });
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const clampPitch = (p: Vec, m = 0.5): Vec => ({ x: clamp(p.x, m, PITCH.len - m), y: clamp(p.y, m, PITCH.wid - m) });

/** Team frame ↔ world: team 0 attacks +x; team 1 is mirrored on both axes so "left" stays its own left. */
export const frame = (team: TeamId, p: Vec): Vec => (team === 0 ? { x: p.x, y: p.y } : { x: PITCH.len - p.x, y: PITCH.wid - p.y });

export function perpDist(p: Vec, a: Vec, b: Vec): { d: number; u: number } {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1e-9;
  const u = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1);
  return { d: Math.hypot(p.x - (a.x + u * dx), p.y - (a.y + u * dy)), u };
}

export function angleDiff(a: number, b: number): number {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}
