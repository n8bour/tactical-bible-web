import { describe, expect, it } from 'vitest';
import { decideOnBall, steer } from '../src/agent';
import { defaultAttrs } from '../src/attributes';
import { resolveMods } from '../src/mods';
import type { AgentState } from '../src/types';
import { createWorld, hash, restore, snapshot, step } from '../src/world';
import { KNOW, scene } from './fixture';

describe('simulation core', () => {
  it('is deterministic for the same scene and seed', () => {
    const a = createWorld(scene(7), KNOW);
    const b = createWorld(scene(7), KNOW);
    for (let i = 0; i < 600; i++) { step(a); step(b); }
    expect(hash(a)).toBe(hash(b));
    expect(a.events.length).toBeGreaterThan(0);
  });

  it('replays identically from a snapshot', () => {
    const w = createWorld(scene(3), KNOW);
    const snap = snapshot(w);
    for (let i = 0; i < 200; i++) step(w);
    const first = hash(w);
    restore(w, snap);
    for (let i = 0; i < 200; i++) step(w);
    expect(hash(w)).toBe(first);
  });

  it('a fast player reaches a point 30 m away before a slow one', () => {
    const run = (pac: number) => {
      const w = createWorld(scene(1), KNOW);
      const a = w.agents[5] as AgentState;
      a.spec.attrs = { ...defaultAttrs(12), pac };
      a.pos = { x: 30, y: 34 };
      a.vel = { x: 0, y: 0 };
      const target = { x: 60, y: 34 };
      let t = 0;
      while (Math.hypot(a.pos.x - target.x, a.pos.y - target.y) > 0.5 && t < 20) { steer(a, target, 0.05, true); t += 0.05; }
      return t;
    };
    expect(run(18)).toBeLessThan(run(6));
  });

  const decisions = (attrs: Partial<Record<'dec' | 'vis', number>>, count: number) => {
    const out = [];
    for (let seed = 1; seed <= count; seed++) {
      const w = createWorld(scene(seed * 977), KNOW);
      const a = w.agents.find((x) => x.spec.id === w.scene.focus)!;
      Object.assign(a.spec.attrs, attrs);
      for (let i = 0; i < 4; i++) step(w);
      out.push(decideOnBall(w, a, resolveMods(w.teams[0].mods, a.spec, w.phase[0], KNOW)));
    }
    return out;
  };

  it('better Decisions pick higher-ranked options on average', () => {
    const rank = (dec: number) => {
      const tr = decisions({ dec }, 200);
      return tr.reduce((s, d) => s + d.options.filter((o) => o.utility > d.options[d.chosen].utility).length, 0) / tr.length;
    };
    expect(rank(18)).toBeLessThan(rank(5));
  });

  it('low Vision hides through balls in most decisions, high Vision never does', () => {
    const missing = (vis: number) => {
      const tr = decisions({ vis }, 200);
      return tr.filter((d) => !d.options.some((o) => o.kind === 'throughPass')).length / tr.length;
    };
    expect(missing(4)).toBeGreaterThanOrEqual(0.5);
    expect(missing(18)).toBe(0);
  });
});
