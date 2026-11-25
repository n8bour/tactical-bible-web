import { createWorld, setPI, setTI, step, type PIKey, type WorldState } from '@tb/sim';
import { describe, expect, it } from 'vitest';
import { KNOWLEDGE, PI_EFFECTS, playerInstructions, ROLE_PROFILES, ROLES, SCENES, TI_EFFECTS, teamInstructions } from '../src';

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Runs the scene once per seed and pools the samples, so one chaotic replay can't decide a test. */
function run(sceneId: string, setup: (w: WorldState) => void, seconds: number, sample: (w: WorldState) => number | null, tis: Record<string, number> = {}) {
  const xs: number[] = [];
  const worlds: WorldState[] = [];
  for (const seed of SEEDS) {
    const s = SCENES[sceneId];
    const w = createWorld({ ...s, seed, home: { ...s.home, tis: { ...s.home.tis, ...tis } } }, KNOWLEDGE);
    setup(w);
    for (let i = 0; i < seconds * 20; i++) {
      step(w);
      const v = sample(w);
      if (v !== null) xs.push(v);
    }
    worlds.push(w);
  }
  return { mean: xs.reduce((s, v) => s + v, 0) / Math.max(1, xs.length), samples: xs.length, worlds };
}

const focusOf = (w: WorldState) => w.agents.find((a) => a.spec.id === w.scene.focus)!;

describe('instruction effects in the simulation', () => {
  it('Much Wider spreads the team more than 15 % wider than Much Narrower in the final third', () => {
    const spread = (w: WorldState) =>
      w.phase[0] === 'final' ? w.agents.filter((a) => a.spec.team === 0 && a.spec.slot !== 'GK').reduce((s, a) => s + Math.abs(a.pos.y - 34), 0) / 10 : null;
    const narrow = run('ti-width', () => {}, 8, spread, { width: 0 });
    const wide = run('ti-width', () => {}, 8, spread, { width: 4 });
    expect(narrow.samples).toBeGreaterThan(100);
    expect(wide.samples).toBeGreaterThan(100);
    expect(wide.mean).toBeGreaterThan(narrow.mean * 1.15);
  });

  it('Stay Wider moves the focus winger at least 4 m further from the centre while his team has the ball and he is off it (10 s)', () => {
    const width = (w: WorldState) => (w.possession === 0 && w.ball.owner !== w.scene.focus ? Math.abs(focusOf(w).pos.y - 34) : null);
    const base = run('pi-stay_wider', () => {}, 10, width);
    const wider = run('pi-stay_wider', (w) => setPI(w, w.scene.focus, 'stay_wider', true), 10, width);
    expect(wider.mean - base.mean).toBeGreaterThanOrEqual(4);
  });

  it('Press More makes the focus player start more presses over 20 s', () => {
    const presses = (worlds: WorldState[]) =>
      worlds.reduce((s, w) => s + w.events.filter((e) => e.kind === 'press' && e.agent === w.scene.focus).length, 0);
    const base = run('pi-press_more', () => {}, 20, () => null);
    const more = run('pi-press_more', (w) => setPI(w, w.scene.focus, 'press_more', true), 20, () => null);
    expect(presses(more.worlds)).toBeGreaterThan(presses(base.worlds));
  });

  it('Much Higher defensive line holds the centre-backs more than 15 m higher than Much Lower out of possession', () => {
    const cbX = (w: WorldState) => {
      if (w.phase[0] !== 'oop') return null;
      const cbs = w.agents.filter((a) => a.spec.team === 0 && a.spec.slot.startsWith('DC'));
      return cbs.reduce((s, a) => s + a.pos.x, 0) / cbs.length;
    };
    const low = run('ti-dline', (w) => setTI(w, 0, 'dline', 0), 10, cbX);
    const high = run('ti-dline', (w) => setTI(w, 0, 'dline', 4), 10, cbX);
    expect(low.samples).toBeGreaterThan(100);
    expect(high.mean - low.mean).toBeGreaterThan(15);
  });

  it('enabling one of an exclusive pair switches its partner off', () => {
    const w = createWorld(SCENES['pi-shoot_more'], KNOWLEDGE);
    setPI(w, w.scene.focus, 'shoot_more', true);
    setPI(w, w.scene.focus, 'shoot_less', true);
    expect(focusOf(w).spec.pis.shoot_more).toBe(false);
    setPI(w, w.scene.focus, 'target_far_post', true);
    setPI(w, w.scene.focus, 'target_near_post', true);
    expect(focusOf(w).spec.pis.target_far_post).toBe(false);
  });
});

describe('coverage', () => {
  it('every instruction has an effect and a scene', () => {
    for (const t of teamInstructions) {
      expect(TI_EFFECTS[t.key], t.key).toBeTypeOf('function');
      t.options.forEach((_, i) => expect(TI_EFFECTS[t.key](i).mods, `${t.key}[${i}]`).toBeTypeOf('object'));
      expect(SCENES[`ti-${t.key}`], t.key).toBeDefined();
    }
    for (const p of playerInstructions) {
      expect(PI_EFFECTS[p.key as PIKey], p.key).toBeDefined();
      expect(SCENES[`pi-${p.key}`], p.key).toBeDefined();
    }
  });

  it('every role has a profile and a scene whose focus plays that role', () => {
    for (const r of ROLES) {
      expect(ROLE_PROFILES[r.id], r.id).toBeDefined();
      const s = SCENES[`role-${r.id}`];
      const focus = s.home.agents.find((a) => a.id === s.focus)!;
      expect(r.phase === 'IP' ? focus.roleIP : focus.roleOOP, r.id).toBe(r.id);
    }
  });

  it('every scene runs its full duration without NaN positions', () => {
    for (const s of Object.values(SCENES)) {
      const w = createWorld(s, KNOWLEDGE);
      for (let i = 0; i < s.duration * 20; i++) step(w);
      for (const a of w.agents) expect(Number.isFinite(a.pos.x) && Number.isFinite(a.pos.y), `${s.id} ${a.spec.id}`).toBe(true);
      expect(Number.isFinite(w.ball.pos.x), s.id).toBe(true);
    }
  });
});
