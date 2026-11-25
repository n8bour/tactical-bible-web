import { createWorld, step, type WorldState } from '@tb/sim';
import { describe, expect, it } from 'vitest';
import { DEFAULT_ROLE, FORMATIONS, groupOf, KNOWLEDGE, OPP_FORMATION, roleScene, rolesFor } from '../src';

const done = (w: WorldState) => w.scriptIdx >= w.scene.script.length && w.t - w.beatAt > 2.5;

describe('role clips', () => {
  it('every role in every position plays its script through: no skipped beats, no ball out, done within 15 s', () => {
    const broken: string[] = [];
    for (const f of Object.keys(FORMATIONS).filter((f) => f !== OPP_FORMATION))
      for (const s of FORMATIONS[f])
        for (const phase of ['IP', 'OOP'] as const)
          for (const r of rolesFor(s.code, FORMATIONS[f], phase)) {
            const scene = roleScene({
              formation: f,
              slot: s.code,
              roleIP: phase === 'IP' ? r.id : DEFAULT_ROLE.IP[groupOf(s.code)],
              roleOOP: phase === 'OOP' ? r.id : DEFAULT_ROLE.OOP[groupOf(s.code)],
              withBall: phase === 'IP',
            });
            const w = createWorld(scene, KNOWLEDGE);
            const issues = new Set<string>();
            while (!done(w) && w.t < 15) {
              const idx = w.scriptIdx;
              const owner = w.ball.owner;
              step(w);
              // A ball beat that fires while its passer doesn't have the ball means the previous action never arrived.
              for (let j = idx; j < w.scriptIdx; j++) {
                const b = w.scene.script[j];
                if (b.kind !== 'run' && b.kind !== 'mark' && owner !== b.from) issues.add(`beat ${j} (${b.kind}) skipped`);
              }
            }
            if (!done(w)) issues.add('not finished');
            if (w.events.some((e) => e.kind === 'out')) issues.add('ball out');
            if (scene.script.some((b) => b.to === b.from)) issues.add('pass to himself');
            if (issues.size) broken.push(`${r.id} @ ${f}/${s.code}: ${[...issues].join(', ')}`);
          }
    expect(broken).toEqual([]);
  });
});
