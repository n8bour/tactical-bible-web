import {
  boardScene, DEFAULT_ROLE, FORMATIONS, groupOf, mentalities, OPP_FORMATION, pairSlots, playerInstructions, ROLE_BY_ID, rolesFor, teamInstructions, type BoardOpts,
} from '@tb/content';
import { metrics, type PIKey } from '@tb/sim';
import { Button } from '@ui-sdk/react/button';
import { Checkbox, CheckboxIndicator } from '@ui-sdk/react/checkbox';
import { SegmentedControl, SegmentedControlIndicator, SegmentedControlItem } from '@ui-sdk/react/segmented-control';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@ui-sdk/react/tabs';
import { useMemo, useState } from 'react';
import { roleLabel, SelectField, SwitchRow } from './Controls';
import { OVERLAYS, type OverlayKey } from './PitchRenderer';
import { Stage } from './Stage';
import { useLab, type LabApi } from './useLab';

const FORMATION_NAMES = Object.keys(FORMATIONS).filter((f) => f !== OPP_FORMATION);
const OVERLAY_LABEL: Record<OverlayKey, string> = {
  vision: 'Vision cone (selected player)', options: 'Decision options (selected player)', pressure: 'Press radii', runs: 'Runs', shape: 'Tactical positions', lines: 'Lines and block', trail: 'Trail (selected player)',
};
const EXCLUSIVE: PIKey[][] = [
  ['shoot_more', 'shoot_less'], ['dribble_more', 'dribble_less'], ['take_more_risks', 'take_fewer_risks'], ['press_more', 'press_less'],
  ['tackle_harder', 'ease_off_tackles'], ['stay_wider', 'sit_narrower'], ['cross_from_byline', 'cross_from_deep'], ['target_near_post', 'target_centre', 'target_far_post'],
];

interface Config {
  formationIP: string;
  formationOOP: string;
  awayFormation: string;
  mentality: number;
  tis: Record<string, number>;
  roles: Record<string, [string?, string?]>;
  pis: Partial<Record<string, PIKey[]>>;
  attack: boolean;
  focus: string;
}

function initialConfig(): Config {
  const q = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
  const formationIP = '4-3-3 DM Wide';
  const tis: Record<string, number> = {};
  for (const part of (q.get('ti') ?? '').split(',').filter(Boolean)) {
    const [k, v] = part.split(':');
    if (teamInstructions.some((t) => t.key === k)) tis[k] = Number(v);
  }
  const slot = q.get('slot');
  const focus = slot && FORMATIONS[formationIP].some((s) => s.code === slot) ? slot : 'MCL';
  const pi = q.get('pi');
  const pis: Config['pis'] = pi && playerInstructions.some((p) => p.key === pi) ? { [focus]: [pi as PIKey] } : {};
  return { formationIP, formationOOP: '4-1-4-1 DM Wide', awayFormation: OPP_FORMATION, mentality: 3, tis, roles: {}, pis, attack: q.get('tab') !== 'oop', focus };
}

function TeamStats({ lab }: { lab: LabApi }) {
  const w = lab.world.current;
  const b = lab.baseline.current;
  if (!w) return null;
  const live = metrics(w, lab.focus);
  const base = b ? metrics(b, lab.focus) : null;
  const rows: Array<[string, number, number | null, string]> = [
    ['Team avg depth', live.teamAvgDepth, base?.teamAvgDepth ?? null, ' m'],
    ['Team avg width', live.teamAvgWidth, base?.teamAvgWidth ?? null, ' m'],
    ['Passes', live.passes, base?.passes ?? null, ''],
    ['Completed', live.passesCompleted, base?.passesCompleted ?? null, ''],
    ['Progressive', live.progressive, base?.progressive ?? null, ''],
  ];
  return (
    <dl className="metrics" aria-label="Team numbers">
      {rows.map(([label, v, bv, unit]) => {
        const d = bv === null ? null : v - bv;
        const sign = d === null ? undefined : d > 0.05 ? 'pos' : d < -0.05 ? 'neg' : 'zero';
        return (
          <div key={label}>
            <dt>{label}</dt>
            <dd data-sign={sign}>
              {v.toFixed(unit ? 1 : 0)}{unit}
              {d !== null && <small> ({d >= 0 ? '+' : '−'}{Math.abs(d).toFixed(unit ? 1 : 0)})</small>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export default function TacticsBoard({ base = '' }: { base?: string }) {
  const [cfg, setCfg] = useState<Config>(initialConfig);
  const [compareDefaults, setCompareDefaults] = useState(() => Object.keys(cfg.tis).length > 0 || Object.keys(cfg.pis).length > 0);
  const set = (patch: Partial<Config>) => setCfg((c) => ({ ...c, ...patch }));

  const opts: BoardOpts = cfg;
  const scene = useMemo(() => boardScene(opts), [JSON.stringify(cfg)]);
  const changed = Object.keys(cfg.tis).length > 0 || Object.keys(cfg.pis).length > 0;
  const baseline = useMemo(() => (compareDefaults && changed ? boardScene({ ...opts, tis: {}, pis: {} }) : null), [compareDefaults, JSON.stringify(cfg)]);
  const lab = useLab(scene, JSON.stringify(cfg) + compareDefaults, {
    loop: true,
    restartWhen: (w) => (cfg.attack ? w.possession === 1 && w.t - w.teams[0].lostAt > 2 : w.possession === 0 && w.t - w.teams[1].lostAt > 2),
    baseline,
    overlays: cfg.attack ? { runs: true, lines: false, pressure: false, vision: false } : { runs: false, lines: true, pressure: true, vision: false },
  });

  const slotsIP = FORMATIONS[cfg.formationIP];
  const pair = pairSlots(cfg.formationIP, cfg.formationOOP);
  const phase = cfg.attack ? 'IP' : 'OOP';
  const shownTis = teamInstructions.filter((t) => t.phase === phase);
  const focusPis = cfg.pis[cfg.focus] ?? [];

  const setRole = (code: string, which: 0 | 1, id: string) => {
    const cur = cfg.roles[code] ?? [];
    const next: [string?, string?] = which === 0 ? [id, cur[1]] : [cur[0], id];
    set({ roles: { ...cfg.roles, [code]: next } });
  };
  const setPi = (key: PIKey, on: boolean) => {
    let list = focusPis.filter((k) => k !== key);
    if (on) {
      const group = EXCLUSIVE.find((g) => g.includes(key)) ?? [];
      list = [...list.filter((k) => !group.includes(k)), key];
    }
    set({ pis: { ...cfg.pis, [cfg.focus]: list } });
  };

  return (
    <section className="board" aria-label="Tactics board" data-testid="tactics-board">
      <div className="board-bar">
        <SegmentedControl aria-label="Phase" value={cfg.attack ? 'ip' : 'oop'} onValueChange={(v) => v && set({ attack: v === 'ip' })}>
          <SegmentedControlIndicator />
          <SegmentedControlItem value="ip">In possession: we attack</SegmentedControlItem>
          <SegmentedControlItem value="oop">Out of possession: we defend</SegmentedControlItem>
        </SegmentedControl>
        <SelectField label="Our shape with the ball" value={cfg.formationIP} options={FORMATION_NAMES.map((f) => ({ value: f, label: f }))} onChange={(v) => set({ formationIP: v, roles: {}, pis: {}, focus: FORMATIONS[v].find((s) => /^(MC|DM)/.test(s.code))?.code ?? 'GK' })} />
        <SelectField label="Our shape without the ball" value={cfg.formationOOP} options={FORMATION_NAMES.map((f) => ({ value: f, label: f }))} onChange={(v) => set({ formationOOP: v, roles: Object.fromEntries(Object.entries(cfg.roles).map(([k, r]) => [k, [r[0], undefined]])) })} />
        <SelectField label="Opponent" value={cfg.awayFormation} options={[{ value: OPP_FORMATION, label: '4-2-3-1 (default opponent)' }, ...FORMATION_NAMES.map((f) => ({ value: f, label: f }))]} onChange={(v) => set({ awayFormation: v })} />
        <SelectField label="Mentality" value={String(cfg.mentality)} options={mentalities.map((m, i) => ({ value: String(i), label: m.name }))} onChange={(v) => set({ mentality: Number(v) })} />
      </div>

      <div className="board-main">
        <Stage lab={lab}>
          <TeamStats lab={lab} />
          <p className="hint">
            {cfg.attack
              ? 'Your team builds from the goalkeeper and attacks to the right. The move restarts on its own.'
              : 'The opponent builds from its goalkeeper and attacks to the left; watch your block, pressing and lines.'}
          </p>
        </Stage>

        <div className="lab-panel">
          <Tabs defaultValue="instructions">
            <TabsList aria-label="Board controls">
              <TabsTab value="instructions">Team instructions</TabsTab>
              <TabsTab value="players">Players</TabsTab>
              <TabsTab value="view">View</TabsTab>
            </TabsList>

            <TabsPanel value="instructions">
              <p className="panel-note">{cfg.attack ? 'In-possession instructions.' : 'Out-of-possession instructions.'} Switch phase above to see the others.</p>
              {shownTis.map((t) => {
                const value = cfg.tis[t.key] ?? t.default;
                return (
                  <div key={t.key} className="ti-row" data-changed={value !== t.default ? '' : undefined}>
                    <SelectField
                      label={t.name + (t.unconf ? ' (options unconfirmed)' : '')}
                      value={String(value)}
                      options={t.options.map((o, i) => ({ value: String(i), label: o + (i === t.default ? ' (default)' : '') }))}
                      onChange={(v) => {
                        const n = Number(v);
                        const tis = { ...cfg.tis };
                        if (n === t.default) delete tis[t.key];
                        else tis[t.key] = n;
                        set({ tis });
                      }}
                    />
                    <p>{t.desc} <a href={`${base}/instructions/team/${t.key}`}>More</a></p>
                  </div>
                );
              })}
              {changed && <Button onClick={() => set({ tis: {}, pis: {} })}>Reset all instructions</Button>}
            </TabsPanel>

            <TabsPanel value="players">
              <SelectField
                label="Selected player"
                value={cfg.focus}
                options={slotsIP.map((s) => ({ value: s.code, label: `${s.code} · ${ROLE_BY_ID[cfg.roles[s.code]?.[0] ?? DEFAULT_ROLE.IP[groupOf(s.code)]].ab}` }))}
                onChange={(v) => set({ focus: v })}
              />
              {(() => {
                const code = cfg.focus;
                const oopCode = pair[code];
                return (
                  <>
                    <SelectField
                      label={`Role with the ball (${code})`}
                      value={cfg.roles[code]?.[0] ?? DEFAULT_ROLE.IP[groupOf(code)]}
                      options={rolesFor(code, slotsIP, 'IP').map((r) => ({ value: r.id, label: roleLabel(r.id) }))}
                      onChange={(v) => setRole(code, 0, v)}
                    />
                    <SelectField
                      label={`Role without the ball (${oopCode})`}
                      value={cfg.roles[code]?.[1] ?? DEFAULT_ROLE.OOP[groupOf(oopCode)]}
                      options={rolesFor(oopCode, FORMATIONS[cfg.formationOOP], 'OOP').map((r) => ({ value: r.id, label: roleLabel(r.id) }))}
                      onChange={(v) => setRole(code, 1, v)}
                    />
                    <h3>Player instructions</h3>
                    {playerInstructions.map((p) => (
                      <SwitchRow key={p.key} label={p.name} checked={focusPis.includes(p.key as PIKey)} onChange={(on) => setPi(p.key as PIKey, on)} />
                    ))}
                  </>
                );
              })()}
            </TabsPanel>

            <TabsPanel value="view">
              <SwitchRow label="Compare with default instructions" checked={compareDefaults} onChange={setCompareDefaults} />
              {compareDefaults && !changed && <p className="panel-note">Change an instruction to see the faded default team next to yours.</p>}
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
        </div>
      </div>
    </section>
  );
}
