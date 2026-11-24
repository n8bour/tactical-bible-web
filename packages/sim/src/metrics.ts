import type { TeamId, WorldState } from './types';

export interface Metrics {
  distance: number;
  avgDepth: number;
  avgWidth: number;
  passes: number;
  passesCompleted: number;
  progressive: number;
  presses: number;
  firstShot: number | null;
  teamAvgDepth: number;
  teamAvgWidth: number;
}

/** Focus-agent and team numbers for the compare strip; depth and width are in the agent's team frame. */
export function metrics(w: WorldState, focus: string): Metrics {
  const a = w.agents.find((x) => x.spec.id === focus) ?? w.agents[0];
  const team: TeamId = a.spec.team;
  const s = w.stats[a.spec.id];
  const mine = (id: string) => w.agents.find((x) => x.spec.id === id)?.spec.team === team;
  const ev = w.events.filter((e) => e.team === team);
  let tDepth = 0, tWidth = 0, tn = 0;
  for (const m of w.agents) {
    if (m.spec.team !== team || m.spec.slot === 'GK') continue;
    const st = w.stats[m.spec.id];
    tDepth += st.depthSum;
    tWidth += st.widthSum;
    tn += st.samples;
  }
  return {
    distance: s.dist,
    avgDepth: s.samples ? s.depthSum / s.samples : 0,
    avgWidth: s.samples ? s.widthSum / s.samples : 0,
    passes: ev.filter((e) => e.kind === 'pass' || e.kind === 'through' || e.kind === 'cross').length,
    passesCompleted: ev.filter((e) => e.kind === 'pass_complete' && (!e.to || mine(e.to))).length,
    progressive: ev.filter((e) => e.kind === 'pass_complete' && e.progressive).length,
    presses: w.events.filter((e) => e.kind === 'press' && e.agent === a.spec.id).length,
    firstShot: w.firstShotT,
    teamAvgDepth: tn ? tDepth / tn : 0,
    teamAvgWidth: tn ? tWidth / tn : 0,
  };
}
