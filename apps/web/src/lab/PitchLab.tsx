import {
  attributes, buildScene, FORMATIONS, KNOWLEDGE, mentalities, OPP_FORMATION, playerInstructions, rolesFor, SCENES, teamInstructions, type Scene,
} from '@tb/content';
import { metrics, setAttr, setPI, setRole, setTI, type AttrKey, type Metrics, type PIKey, type WorldState } from '@tb/sim';
import { Button } from '@ui-sdk/react/button';
import { Checkbox, CheckboxIndicator } from '@ui-sdk/react/checkbox';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@ui-sdk/react/collapsible';
import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from '@ui-sdk/react/segmented-control';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@ui-sdk/react/tabs';
import { useId, useMemo, useState } from 'react';
import { AttrSlider, roleLabel, SelectField, SwitchRow } from './Controls';
import { OVERLAYS, type OverlayKey } from './PitchRenderer';
import { useLab } from './useLab';

export interface PitchLabProps {
  sceneId: string;
  focus?: string;
  mode?: 'scene' | 'sandbox';
  base?: string;
}

const ATTR_NAME: Record<string, string> = Object.fromEntries(attributes.map((a) => [a.key, a.name]));
const OVERLAY_LABEL: Record<OverlayKey, string> = {
  vision: 'Vision cone', options: 'Options', pressure: 'Press radii', runs: 'Runs', shape: 'Team shape', lines: 'Lines', trail: 'Trail',
};
const FORMATION_NAMES = Object.keys(FORMATIONS).filter((f) => f !== OPP_FORMATION);

function fmtDelta(v: number, unit: string, digits = 1) {
  const s = v > 0 ? '+' : v < 0 ? '−' : '±';
  return `${s}${Math.abs(v).toFixed(digits)}${unit}`;
}

function MetricsStrip({ live, base }: { live: Metrics; base: Metrics | null }) {
  const rows: Array<[keyof Metrics, string, string, number]> = [
    ['distance', 'Distance', ' m', 1],
    ['avgDepth', 'Avg depth', ' m', 1],
    ['avgWidth', 'Avg width', ' m', 1],
    ['passes', 'Passes', '', 0],
    ['passesCompleted', 'Completed', '', 0],
    ['progressive', 'Progressive', '', 0],
    ['presses', 'Presses', '', 0],
  ];
  return (
    <dl className="metrics" aria-label={base ? 'Difference from baseline' : 'Focus player metrics'}>
      {rows.map(([k, label, unit, digits]) => {
        const v = live[k] as number;
        const d = base ? v - (base[k] as number) : null;
        const sign = d === null ? undefined : d > 0.05 ? 'pos' : d < -0.05 ? 'neg' : 'zero';
        return (
          <div key={k}>
            <dt>{label}</dt>
            <dd data-metric={k} data-sign={sign}>{d === null ? `${v.toFixed(digits)}${unit}` : fmtDelta(d, unit, digits)}</dd>
          </div>
        );
      })}
      <div>
        <dt>First shot</dt>
        <dd data-metric="firstShot">{live.firstShot === null ? '—' : `${live.firstShot.toFixed(1)} s`}{base ? ` (base ${base.firstShot === null ? '—' : base.firstShot.toFixed(1) + ' s'})` : ''}</dd>
      </div>
    </dl>
  );
}

export function WhyPanel({ world, focus, base }: { world: WorldState; focus: string; base: string }) {
  const headingId = useId();
  const a = world.agents.find((x) => x.spec.id === focus);
  const tr = a?.trace[a.trace.length - 1];
  if (!a || !tr) return <p className="why">No decision yet for this player.</p>;
  const ranked = tr.options.map((o, i) => ({ o, i })).sort((p, q) => q.o.utility - p.o.utility).slice(0, 8);
  const label = (o: (typeof tr.options)[number]) => {
    const who = o.to ? world.agents.find((x) => x.spec.id === o.to)?.spec.label ?? o.to : '';
    return `${o.kind}${o.run ? ` (${o.run})` : ''}${who ? ` → ${who}` : ''}`;
  };
  return (
    <div className="why">
      <h3 id={headingId}>Why: latest decision at {tr.t.toFixed(1)} s</h3>
      <div className="table-wrapper" tabIndex={0} role="region" aria-labelledby={headingId}>
        <table>
          <caption className="visually-hidden">Ranked decision options and utility terms</caption>
          <thead>
            <tr><th scope="col">Option</th><th scope="col">Utility</th><th scope="col">Top terms</th></tr>
          </thead>
          <tbody>
            {ranked.map(({ o, i }) => (
              <tr key={`${i}-${o.kind}-${o.to ?? ''}`} data-chosen={i === tr.chosen ? '' : undefined}>
                <th scope="row">{i === tr.chosen ? '▶ ' : ''}{label(o)}</th>
                <td>{o.utility.toFixed(2)}</td>
                <td>
                  {Object.entries(o.terms).sort((p, q) => Math.abs(q[1]) - Math.abs(p[1])).slice(0, 3).map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v.toFixed(2)}`).join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Attributes behind this choice:{' '}
        {tr.attrsUsed.map((k, i) => (
          <span key={k}>{i ? ', ' : ''}<a href={`${base}/attributes/${k}`}>{ATTR_NAME[k] ?? k}</a> {a.spec.attrs[k]}</span>
        ))}
      </p>
    </div>
  );
}

export default function PitchLab({ sceneId, focus: focusProp, mode = 'scene', base = '' }: PitchLabProps) {
  const [homeForm, setHomeForm] = useState('4-3-3 DM Wide');
  const [awayForm, setAwayForm] = useState(OPP_FORMATION);
  const scene: Scene = useMemo(() => {
    if (mode === 'sandbox') {
      const mid = FORMATIONS[homeForm].find((s) => /^(MC|DM|AMC)/.test(s.code))?.code ?? 'GK';
      return buildScene({ id: 'sandbox', title: 'Sandbox', formation: homeForm, awayFormation: awayForm, focus: `h_${mid}`, phase: 'prog', duration: 90, beats: [] });
    }
    const s = SCENES[sceneId];
    return focusProp ? { ...s, focus: focusProp } : s;
  }, [sceneId, focusProp, mode, homeForm, awayForm]);
  const lab = useLab(scene, `${scene.id}|${homeForm}|${awayForm}`);
  const w = lab.world.current;
  const [team, setTeam] = useState<0 | 1>(0);

  const agent = w?.agents.find((a) => a.spec.id === lab.focus) ?? w?.agents[0];
  const live = w && agent ? metrics(w, agent.spec.id) : null;
  const baseM = lab.baseline.current && agent ? metrics(lab.baseline.current, agent.spec.id) : null;
  const edit = (fn: () => void) => { fn(); lab.touch(); };

  const teamSpec = w ? w.teams[team].spec : null;
  const roleKeys = agent ? [...new Set([...(KNOWLEDGE.roles[agent.spec.roleIP]?.key ?? []), ...(KNOWLEDGE.roles[agent.spec.roleIP]?.pref ?? []), ...(KNOWLEDGE.roles[agent.spec.roleOOP]?.key ?? [])])] : [];
  const otherKeys = attributes.map((a) => a.key as AttrKey).filter((k) => !roleKeys.includes(k));
  const slotsIP = agent && w ? FORMATIONS[w.teams[agent.spec.team].spec.formationIP] : [];
  const slotsOOP = agent && w ? FORMATIONS[w.teams[agent.spec.team].spec.formationOOP] : [];
  const lesson = mode === 'scene' ? scene.lesson : undefined;

  return (
    <section className="lab" aria-label={`Pitch lab: ${scene.title ?? scene.id}`} data-testid="pitch-lab">
      <div className="lab-stage">
        {lesson && (
          <p className="lab-lesson">
            {lesson.text}{' '}
            {(lesson.ti || lesson.pi) && w && agent && (
              <Button
                onClick={() => edit(() => {
                  if (lesson.ti) setTI(w, agent.spec.team, lesson.ti.key, lesson.ti.option);
                  if (lesson.pi) setPI(w, scene.focus, lesson.pi, true);
                })}
              >
                Try it
              </Button>
            )}
          </p>
        )}
        <div className="lab-canvas" ref={lab.host} />
        <div className="lab-transport">
          <Button onClick={() => lab.setPlaying(!lab.playing)}>{lab.playing ? 'Pause' : 'Play'}</Button>
          <Button onClick={lab.restart}>Restart</Button>
          <Button onClick={lab.stepOnce}>Step</Button>
          <SegmentedControl aria-label="Speed" value={String(lab.speed)} onValueChange={(v) => v && lab.setSpeed(Number(v))}>
            <SegmentedControlIndicator />
            <SegmentedControlItem value="0.5">0.5×</SegmentedControlItem>
            <SegmentedControlItem value="1">1×</SegmentedControlItem>
            <SegmentedControlItem value="2">2×</SegmentedControlItem>
          </SegmentedControl>
          <span className="lab-time" aria-live="off">{w ? `${w.t.toFixed(1)} s · ${w.phase[0]}` : ''}</span>
        </div>
        <div className="legend" aria-hidden="true">
          <span style={{ '--dot': '#38bdf8' } as React.CSSProperties}>Your team (attacks →)</span>
          <span style={{ '--dot': '#f87171' } as React.CSSProperties}>Opponent</span>
          <span style={{ '--dot': '#facc15' } as React.CSSProperties}>Focus player</span>
        </div>
        {live && <MetricsStrip live={live} base={baseM} />}
        {w && <WhyPanel world={w} focus={lab.focus} base={base} />}
      </div>

      <div className="lab-panel">
        {w && agent && (
          <Tabs defaultValue="player">
            <TabsList aria-label="Lab controls">
              <TabsTab value="player">Player</TabsTab>
              <TabsTab value="team">Team</TabsTab>
              <TabsTab value="view">View</TabsTab>
            </TabsList>

            <TabsPanel value="player">
              <SelectField
                label="Focus player"
                value={agent.spec.id}
                options={w.agents.map((a) => ({ value: a.spec.id, label: `${a.spec.team === 0 ? 'Your' : 'Opp.'} ${a.spec.slot} · ${KNOWLEDGE.roles[a.spec.roleIP]?.ab ?? ''}/${KNOWLEDGE.roles[a.spec.roleOOP]?.ab ?? ''}` }))}
                onChange={lab.setFocus}
              />
              <SelectField
                label="In-possession role"
                value={agent.spec.roleIP}
                options={rolesFor(agent.spec.slot, slotsIP, 'IP').map((r) => ({ value: r.id, label: roleLabel(r.id) }))}
                onChange={(v) => edit(() => setRole(w, agent.spec.id, 'IP', v))}
              />
              <SelectField
                label="Out-of-possession role"
                value={agent.spec.roleOOP}
                options={rolesFor(agent.spec.slotOOP ?? agent.spec.slot, slotsOOP, 'OOP').map((r) => ({ value: r.id, label: roleLabel(r.id) }))}
                onChange={(v) => edit(() => setRole(w, agent.spec.id, 'OOP', v))}
              />
              <h3>Role attributes</h3>
              {roleKeys.map((k) => (
                <AttrSlider key={k} attr={k} name={ATTR_NAME[k]} value={agent.spec.attrs[k]} isKey onChange={(v) => edit(() => setAttr(w, agent.spec.id, k, v))} />
              ))}
              <Collapsible>
                <CollapsibleTrigger>All attributes</CollapsibleTrigger>
                <CollapsiblePanel>
                  {otherKeys.map((k) => (
                    <AttrSlider key={k} attr={k} name={ATTR_NAME[k]} value={agent.spec.attrs[k]} isKey={false} onChange={(v) => edit(() => setAttr(w, agent.spec.id, k, v))} />
                  ))}
                </CollapsiblePanel>
              </Collapsible>
              <h3>Player instructions</h3>
              {playerInstructions.map((p) => (
                <SwitchRow key={p.key} label={p.name} checked={agent.spec.pis[p.key as PIKey]} onChange={(on) => edit(() => setPI(w, agent.spec.id, p.key as PIKey, on))} />
              ))}
            </TabsPanel>

            <TabsPanel value="team">
              {mode === 'sandbox' && (
                <>
                  <SelectField label="Your formation" value={homeForm} options={FORMATION_NAMES.map((f) => ({ value: f, label: f }))} onChange={setHomeForm} />
                  <SelectField label="Opponent formation" value={awayForm} options={[OPP_FORMATION, ...FORMATION_NAMES].map((f) => ({ value: f, label: f }))} onChange={setAwayForm} />
                </>
              )}
              <SelectField label="Edit instructions for" value={String(team)} options={[{ value: '0', label: 'Your team' }, { value: '1', label: 'Opponent' }]} onChange={(v) => setTeam(v === '1' ? 1 : 0)} />
              {teamSpec && (
                <>
                  <SelectField
                    label="Mentality"
                    value={String(teamSpec.mentality)}
                    options={mentalities.map((m, i) => ({ value: String(i), label: m.name }))}
                    onChange={(v) => edit(() => setTI(w, team, 'mentality', Number(v)))}
                  />
                  <Tabs defaultValue="IP">
                    <TabsList aria-label="Instruction phase">
                      <TabsTab value="IP">In possession</TabsTab>
                      <TabsTab value="OOP">Out of possession</TabsTab>
                    </TabsList>
                    {(['IP', 'OOP'] as const).map((ph) => (
                      <TabsPanel key={ph} value={ph}>
                        {teamInstructions.filter((t) => t.phase === ph).map((t) => (
                          <SelectField
                            key={t.key}
                            label={t.name + (t.unconf ? ' (options unconfirmed)' : '')}
                            value={String(teamSpec.tis[t.key] ?? t.default)}
                            options={t.options.map((o, i) => ({ value: String(i), label: o + (i === t.default ? ' (default)' : '') }))}
                            onChange={(v) => edit(() => setTI(w, team, t.key, Number(v)))}
                          />
                        ))}
                      </TabsPanel>
                    ))}
                  </Tabs>
                </>
              )}
            </TabsPanel>

            <TabsPanel value="view">
              <SwitchRow label="Compare with baseline" checked={lab.compare} onChange={lab.setCompare} />
              <h3>Overlays</h3>
              <div className="overlay-list">
                {OVERLAYS.map((k) => (
                  <label key={k} className="check-row">
                    <Checkbox checked={lab.overlays[k]} onCheckedChange={(c) => lab.setOverlay(k, c === true)}>
                      <CheckboxIndicator />
                    </Checkbox>
                    {OVERLAY_LABEL[k]}
                  </label>
                ))}
              </div>
            </TabsPanel>
          </Tabs>
        )}
      </div>
    </section>
  );
}
