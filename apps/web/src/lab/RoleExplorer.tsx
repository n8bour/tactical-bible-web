import { attributes, DEFAULT_ROLE, FORMATIONS, groupOf, OPP_FORMATION, ROLE_BY_ID, ROLE_HOME, roleScene, rolesFor } from '@tb/content';
import { attr, defaultAttrs, metrics, n, rulesUsing, type AttrKey, type Attrs, type WorldState } from '@tb/sim';
import { Button } from '@ui-sdk/react/button';
import { Checkbox, CheckboxIndicator } from '@ui-sdk/react/checkbox';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@ui-sdk/react/collapsible';
import { Field, FieldLabel } from '@ui-sdk/react/field';
import { Radio, RadioGroup, RadioIndicator } from '@ui-sdk/react/radio';
import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from '@ui-sdk/react/segmented-control';
import { useEffect, useMemo, useState } from 'react';
import { fromLegacy, Pitch } from '../components/pitch/Pitch';
import { RULE_LABEL } from '../lib/site';
import { AttrSlider, roleLabel, SelectField } from './Controls';
import { WhyPanel } from './PitchLab';
import { type OverlayKey } from './PitchRenderer';
import { Stage } from './Stage';
import { useLab } from './useLab';

const ATTR_NAME: Record<string, string> = Object.fromEntries(attributes.map((a) => [a.key, a.name]));
const FORMATION_NAMES = Object.keys(FORMATIONS).filter((f) => f !== OPP_FORMATION);
const SHOWN: Array<[OverlayKey, string]> = [['vision', 'Vision cone'], ['options', 'Decision options'], ['runs', 'Runs'], ['pressure', 'Press radii'], ['shape', 'Tactical positions'], ['trail', 'Trail']];

/** Which overlay makes an attribute's effect visible. */
const ATTR_OVERLAY: Partial<Record<AttrKey, OverlayKey>> = {
  vis: 'vision', wor: 'pressure', agg: 'pressure', otb: 'runs', ant: 'runs', tea: 'shape', pos: 'shape', pac: 'trail', acc: 'trail', sta: 'trail',
  dec: 'options', fla: 'options', pas: 'options', cmp: 'options', tec: 'options', dri: 'options', fin: 'options', lon: 'options', cro: 'options',
};

function playerDefaults(roleIP: string, roleOOP: string): Attrs {
  const a = defaultAttrs(12);
  for (const k of [...ROLE_BY_ID[roleIP].key, ...ROLE_BY_ID[roleOOP].key] as AttrKey[]) a[k] = 15;
  return a;
}

function fmt(v: number): string {
  const a = Math.abs(v);
  return a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : a >= 1 ? v.toFixed(2) : v.toFixed(3);
}

/** Before → after for every simulation rule that reads a changed attribute. */
function modelChanges(before: Attrs, after: Attrs, changed: AttrKey[]) {
  const opp = defaultAttrs(12);
  const seen = new Set<string>();
  const out: Array<{ key: string; text: string; better: boolean | null }> = [];
  for (const k of changed) {
    for (const [rk, r] of rulesUsing(k)) {
      if (seen.has(rk)) continue;
      seen.add(rk);
      let b: string, a: string, diff: number;
      if (rk === 'throughBallSeen') {
        const p = (x: Attrs) => Math.min(1, n(x.vis) / 0.45);
        diff = p(after) - p(before);
        b = `${Math.round(p(before) * 100)}%`;
        a = `${Math.round(p(after) * 100)}%`;
      } else {
        const ctx = { stamina: 1, pressure: 0.5, opp };
        const vb = attr(rk, before, ctx), va = attr(rk, after, ctx);
        diff = va - vb;
        const pct = rk === 'dribbleBeat' || rk === 'aerialWin';
        b = pct ? `${Math.round(vb * 100)}%` : `${fmt(vb)} ${r.unit}`;
        a = pct ? `${Math.round(va * 100)}%` : `${fmt(va)} ${r.unit}`;
      }
      if (Math.abs(diff) < 1e-9) continue;
      // Rules where a lower number is better (errors, delays, drain).
      const lowerIsBetter = /Err|reaction|decisionInterval|decisionTemp|percNoise|touchLoss|staminaDrain|markDist|gkReact/.test(rk);
      out.push({ key: rk, text: `${RULE_LABEL[rk as keyof typeof RULE_LABEL]}: ${b} → ${a}`, better: lowerIsBetter ? diff < 0 : diff > 0 });
    }
  }
  return out;
}

function count(w: WorldState, id: string, ...kinds: string[]) {
  return w.events.filter((e) => e.agent === id && kinds.includes(e.kind)).length;
}

/** What the selected player actually did differently from the comparison player so far. */
function observedChanges(live: WorldState, ref: WorldState, id: string) {
  const ml = metrics(live, id), mr = metrics(ref, id);
  const rows: Array<[string, number, number, string, number]> = [
    ['Distance covered', ml.distance, mr.distance, ' m', 3],
    ['Average depth', ml.avgDepth, mr.avgDepth, ' m', 1.5],
    ['Average distance from the centre line', ml.avgWidth, mr.avgWidth, ' m', 1.5],
    ['Runs made', count(live, id, 'run'), count(ref, id, 'run'), '', 1],
    ['Caught offside', count(live, id, 'offside'), count(ref, id, 'offside'), '', 1],
    ['Presses started', count(live, id, 'press'), count(ref, id, 'press'), '', 1],
    ['Tackles won', count(live, id, 'tackle'), count(ref, id, 'tackle'), '', 1],
    ['Passes', count(live, id, 'pass', 'through', 'cross'), count(ref, id, 'pass', 'through', 'cross'), '', 1],
    ['Through balls', count(live, id, 'through'), count(ref, id, 'through'), '', 1],
    ['Carries', count(live, id, 'carry'), count(ref, id, 'carry'), '', 1],
    ['Defenders beaten', count(live, id, 'dribble'), count(ref, id, 'dribble'), '', 1],
    ['Shots', count(live, id, 'shot'), count(ref, id, 'shot'), '', 1],
  ];
  return rows.filter(([, a, b, , min]) => Math.abs(a - b) >= min).map(([label, a, b, unit]) => {
    const d = a - b;
    return `${label}: ${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(unit ? 1 : 0)}${unit}`;
  });
}

export default function RoleExplorer({ roleId, base = '' }: { roleId: string; base?: string }) {
  const preset = ROLE_BY_ID[roleId];
  const home = ROLE_HOME[roleId];
  const [formation, setFormation] = useState(home.formation);
  const [slot, setSlot] = useState(home.slot);
  const slots = FORMATIONS[formation];
  const pick = (phase: 'IP' | 'OOP', code: string, wanted?: string) => {
    const valid = rolesFor(code, FORMATIONS[formation], phase).map((r) => r.id);
    return wanted && valid.includes(wanted) ? wanted : DEFAULT_ROLE[phase][groupOf(code)];
  };
  const [roleIP, setRoleIP] = useState(preset.phase === 'IP' ? roleId : DEFAULT_ROLE.IP[groupOf(home.slot)]);
  const [roleOOP, setRoleOOP] = useState(preset.phase === 'OOP' ? roleId : DEFAULT_ROLE.OOP[groupOf(home.slot)]);
  const [withBall, setWithBall] = useState(preset.phase === 'IP');
  const [changes, setChanges] = useState<Partial<Attrs>>({});

  const defaults = playerDefaults(roleIP, roleOOP);
  const attrsNow: Attrs = { ...defaults, ...changes };
  const changedKeys = (Object.keys(changes) as AttrKey[]).filter((k) => changes[k] !== defaults[k]);
  const key = JSON.stringify({ formation, slot, roleIP, roleOOP, withBall, changes });
  const scene = useMemo(() => roleScene({ formation, slot, roleIP, roleOOP, withBall, attrs: changes }), [key]);
  const baseline = useMemo(() => (changedKeys.length ? roleScene({ formation, slot, roleIP, roleOOP, withBall }) : null), [key]);
  const lab = useLab(scene, key, {
    loop: true,
    // One lesson per loop: restart 1.5 s after the situation is over (ball lost with it, or won back without it).
    restartWhen: (w) => (withBall ? w.possession === 1 && w.t - w.teams[0].lostAt > 1.5 : w.possession === 0 && w.t - w.teams[1].lostAt > 1.5),
    baseline,
    focusOnly: true,
    overlays: withBall ? { vision: true, runs: true, trail: true } : { vision: false, runs: false, pressure: true, shape: true, trail: true },
  });

  useEffect(() => {
    for (const k of changedKeys) {
      const o = ATTR_OVERLAY[k];
      if (o && !lab.overlays[o]) lab.setOverlay(o, true);
    }
  }, [changedKeys.join()]);

  useEffect(() => {
    const ov: Partial<Record<OverlayKey, boolean>> = withBall ? { vision: true, runs: true, pressure: false, shape: false } : { vision: false, runs: false, pressure: true, shape: true };
    for (const [k, v] of Object.entries(ov)) lab.setOverlay(k as OverlayKey, v);
  }, [withBall]);

  const chooseSlot = (code: string) => {
    setSlot(code);
    setRoleIP(pick('IP', code, roleIP));
    setRoleOOP(pick('OOP', code, roleOOP));
  };
  const chooseFormation = (f: string) => {
    setFormation(f);
    const sameGroup = FORMATIONS[f].find((s) => groupOf(s.code) === groupOf(slot))?.code ?? 'GK';
    const code = FORMATIONS[f].some((s) => s.code === slot) ? slot : sameGroup;
    setSlot(code);
    const valid = (phase: 'IP' | 'OOP', wanted: string) => (rolesFor(code, FORMATIONS[f], phase).some((r) => r.id === wanted) ? wanted : DEFAULT_ROLE[phase][groupOf(code)]);
    setRoleIP(valid('IP', roleIP));
    setRoleOOP(valid('OOP', roleOOP));
  };

  const activeRole = ROLE_BY_ID[withBall ? roleIP : roleOOP];
  const roleAttrs = [...new Set([...activeRole.key, ...activeRole.pref])] as AttrKey[];
  const otherAttrs = attributes.map((a) => a.key as AttrKey).filter((k) => !roleAttrs.includes(k));
  const w = lab.world.current;
  const ref = lab.baseline.current;
  const model = modelChanges(defaults, attrsNow, changedKeys);
  const observed = w && ref ? observedChanges(w, ref, scene.focus) : [];
  const setA = (k: AttrKey, v: number) => setChanges((c) => ({ ...c, [k]: v }));

  return (
    <section className="explorer" aria-label="Role explorer" data-testid="role-explorer">
      <div className="explorer-main">
        <div>
          <div className="explorer-bar">
            <SegmentedControl aria-label="Situation" value={withBall ? 'with' : 'without'} onValueChange={(v) => v && setWithBall(v === 'with')}>
              <SegmentedControlIndicator />
              <SegmentedControlItem value="with">With the ball: {ROLE_BY_ID[roleIP].ab}</SegmentedControlItem>
              <SegmentedControlItem value="without">Without the ball: {ROLE_BY_ID[roleOOP].ab}</SegmentedControlItem>
            </SegmentedControl>
          </div>
          <Stage lab={lab} />
          {changedKeys.length > 0 && (
            <div className="diff" aria-live="polite">
              <h3>What changes against the default {activeRole.name}</h3>
              <p className="panel-note">The faded player and white trail show the same player with default attributes (key attributes 15, others 12), replaying the same move.</p>
              <ul className="diff-list">
                {model.map((m) => (
                  <li key={m.key} data-better={m.better === null ? undefined : String(m.better)}>{m.text}</li>
                ))}
              </ul>
              <h4>What he did differently in this replay</h4>
              {observed.length ? (
                <ul className="diff-list">{observed.map((o) => <li key={o}>{o}</li>)}</ul>
              ) : (
                <p className="panel-note">No visible difference yet in this move. Some attributes only change how often or how well he does something; watch a few loops.</p>
              )}
            </div>
          )}
          {w && <WhyPanel world={w} focus={scene.focus} base={base} />}
        </div>

        <div className="lab-panel">
          <SelectField label="Formation" value={formation} options={FORMATION_NAMES.map((f) => ({ value: f, label: f }))} onChange={chooseFormation} />
          <Field>
            <FieldLabel>Position</FieldLabel>
            <RadioGroup className="slot-picker" value={slot} onValueChange={(v) => v && chooseSlot(String(v))}>
              <Pitch title={`${formation} positions`} />
              {slots.map((s) => {
                const p = fromLegacy(s);
                return (
                  <label key={s.code} className="slot" style={{ left: `${((p.x + 3) / 111) * 100}%`, top: `${((p.y + 3) / 74) * 100}%` }}>
                    <Radio value={s.code}>
                      <RadioIndicator />
                    </Radio>
                    <span>{s.code}</span>
                  </label>
                );
              })}
            </RadioGroup>
          </Field>
          <SelectField label="Role with the ball" value={roleIP} options={rolesFor(slot, slots, 'IP').map((r) => ({ value: r.id, label: roleLabel(r.id) }))} onChange={(v) => { setRoleIP(v); setWithBall(true); }} />
          <SelectField label="Role without the ball" value={roleOOP} options={rolesFor(slot, slots, 'OOP').map((r) => ({ value: r.id, label: roleLabel(r.id) }))} onChange={(v) => { setRoleOOP(v); setWithBall(false); }} />
          <p className="panel-note"><a href={`${base}/roles/${activeRole.id}`}>Read about the {activeRole.name}</a></p>

          <h3>Attributes of the {activeRole.name}</h3>
          {roleAttrs.map((k) => (
            <AttrSlider key={k} attr={k} name={ATTR_NAME[k]} value={attrsNow[k]} isKey={activeRole.key.includes(k)} changed={changedKeys.includes(k)} onChange={(v) => setA(k, v)} />
          ))}
          <Collapsible>
            <CollapsibleTrigger>All attributes</CollapsibleTrigger>
            <CollapsiblePanel>
              {otherAttrs.map((k) => (
                <AttrSlider key={k} attr={k} name={ATTR_NAME[k]} value={attrsNow[k]} isKey={false} changed={changedKeys.includes(k)} onChange={(v) => setA(k, v)} />
              ))}
            </CollapsiblePanel>
          </Collapsible>
          {changedKeys.length > 0 && <Button onClick={() => setChanges({})}>Reset attributes</Button>}

          <h3>Show on the pitch</h3>
          <div className="overlay-list">
            {SHOWN.map(([k, label]) => (
              <label key={k} className="check-row">
                <Checkbox checked={lab.overlays[k]} onCheckedChange={(c) => lab.setOverlay(k, c === true)}>
                  <CheckboxIndicator />
                </Checkbox>
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
