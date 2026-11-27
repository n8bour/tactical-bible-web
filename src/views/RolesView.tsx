import { useEffect, useMemo, useState } from 'react';
import { Button } from '@ui-sdk/react/button';
import { Input, InputClear, InputGroup } from '@ui-sdk/react/input';
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from '@ui-sdk/react/segmented-control';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectItemIndicator,
  SelectTrigger,
  SelectValue,
  type ListData,
} from '@ui-sdk/react/select';
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
} from '@ui-sdk/react/slider';
import { PitchSvg } from '../components/PitchSvg';
import {
  ATTRIBUTE_BY_KEY,
  ATTRIBUTES,
  FM27_ME_WEIGHTS,
  getSources,
  GROUP_LABELS,
  PLAYER_ARCHETYPES,
  ROLE_BY_ID,
  ROLES,
  type AttrCategory,
  type AttrKey,
  type PositionGroup,
  type RoleDef,
} from '../data';
import {
  buildRoleDiagram,
  compareRoles,
  scoreRoleFit,
  suggestRolePairs,
  type RoleFitMode,
} from '../engine';

export interface RolesViewProps {
  initialRoleId?: string | null;
  initialSubTab?: 'browse' | 'finder' | 'compare';
  onJumpToAttribute?: (attrKey: string) => void;
}

type SubTab = 'browse' | 'finder' | 'compare';
type PhaseFilter = 'all' | 'ip' | 'oop';

const POSITION_GROUPS: readonly PositionGroup[] = [
  'GK',
  'DC',
  'D_LR',
  'WB_LR',
  'DM',
  'MC',
  'M_LR',
  'AMC',
  'AM_LR',
  'ST',
];

const ME_WEIGHT_MAP = new Map<AttrKey, (typeof FM27_ME_WEIGHTS)[number]>(
  FM27_ME_WEIGHTS.map((w) => [w.key, w]),
);

const GROUP_FILTER_ITEMS: ListData = [
  { value: 'ALL', label: 'All Positions' },
  ...POSITION_GROUPS.map((g) => ({ value: g, label: GROUP_LABELS[g] })),
];

const GROUP_SELECT_ITEMS: ListData = POSITION_GROUPS.map((g) => ({
  value: g,
  label: GROUP_LABELS[g],
}));

const IP_ROLES = ROLES.filter((r) => r.phase === 'ip');
const OOP_ROLES = ROLES.filter((r) => r.phase === 'oop');

const ROLE_SELECT_ITEMS: ListData = [
  {
    type: 'group',
    label: 'In Possession (IP)',
    items: IP_ROLES.map((r) => ({ value: r.id, label: `${r.name} (${r.abbr}) · IP` })),
  },
  {
    type: 'group',
    label: 'Out of Possession (OOP)',
    items: OOP_ROLES.map((r) => ({ value: r.id, label: `${r.name} (${r.abbr}) · OOP` })),
  },
];

function buildInitialAttrs(archetypeId: string): Record<AttrKey, number> {
  const base = Object.fromEntries(ATTRIBUTES.map((a) => [a.key, 10])) as Record<AttrKey, number>;
  const arch = PLAYER_ARCHETYPES.find((a) => a.id === archetypeId);
  if (arch) {
    for (const [k, v] of Object.entries(arch.attrs)) {
      if (typeof v === 'number') base[k as AttrKey] = v;
    }
  }
  return base;
}

function pickComparePartner(roleId: string): string {
  const role = ROLE_BY_ID[roleId];
  if (!role) return 'chm';
  const sameGroupSamePhase = ROLES.find(
    (r) =>
      r.id !== role.id &&
      r.phase === role.phase &&
      r.groups.some((g) => role.groups.includes(g)),
  );
  if (sameGroupSamePhase) return sameGroupSamePhase.id;
  const sameGroupAny = ROLES.find(
    (r) => r.id !== role.id && r.groups.some((g) => role.groups.includes(g)),
  );
  return sameGroupAny?.id ?? (role.id === 'b2b' ? 'chm' : 'b2b');
}

function ChevronIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      style={{ flexShrink: 0, opacity: 0.7 }}
    >
      <path d="M4.5 6.5 8 10l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M3.5 8.5 6.5 11.5 12.5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatProfileVal(metric: string, val: number): string {
  if (metric === 'depth' || metric === 'width') {
    return val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
  }
  return `${Math.round(val * 100)}%`;
}

function profilePercent(metric: string, val: number): number {
  if (metric === 'depth' || metric === 'width') {
    return Math.max(0, Math.min(100, ((val + 1) / 2) * 100));
  }
  return Math.max(0, Math.min(100, val * 100));
}

export function RolesView({
  initialRoleId,
  initialSubTab,
  onJumpToAttribute,
}: RolesViewProps) {
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab ?? 'browse');

  // ── Browse Roles state ─────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    initialRoleId && ROLE_BY_ID[initialRoleId] ? initialRoleId : 'ifb',
  );

  // ── Role Fit Finder state ──────────────────────────────────────────────────
  const [finderGroup, setFinderGroup] = useState<PositionGroup>('MC');
  const [finderMode, setFinderMode] = useState<RoleFitMode>('role');
  const [activeArchetypeId, setActiveArchetypeId] = useState<string | null>('dynamic-channel-cm');
  const [attrs, setAttrs] = useState<Record<AttrKey, number>>(() =>
    buildInitialAttrs('dynamic-channel-cm'),
  );
  const [showAllFinderAttrs, setShowAllFinderAttrs] = useState(false);

  // ── Compare Roles state ────────────────────────────────────────────────────
  const [compareA, setCompareA] = useState<string>('b2b');
  const [compareB, setCompareB] = useState<string>('chm');

  // Sync external navigation props
  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (initialRoleId && ROLE_BY_ID[initialRoleId]) {
      setSelectedRoleId(initialRoleId);
      setSearch('');
      setPhaseFilter('all');
      setGroupFilter('ALL');
      if (!initialSubTab) {
        setSubTab('browse');
      }
    }
  }, [initialRoleId, initialSubTab]);

  // Filtered roles list for Browse
  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ROLES.filter((role) => {
      if (phaseFilter !== 'all' && role.phase !== phaseFilter) return false;
      if (groupFilter !== 'ALL' && !role.groups.includes(groupFilter as PositionGroup)) {
        return false;
      }
      if (!q) return true;
      return (
        role.name.toLowerCase().includes(q) ||
        role.abbr.toLowerCase().includes(q) ||
        role.id.toLowerCase().includes(q) ||
        (role.legacyEquiv?.toLowerCase().includes(q) ?? false) ||
        role.groups.some((g) => GROUP_LABELS[g].toLowerCase().includes(q))
      );
    });
  }, [search, phaseFilter, groupFilter]);

  const selectedRole: RoleDef = ROLE_BY_ID[selectedRoleId] ?? filteredRoles[0] ?? ROLES[0];
  const selectedDiagram = useMemo(() => buildRoleDiagram(selectedRole.id), [selectedRole.id]);
  const selectedSources = useMemo(
    () => getSources(selectedRole.sourceIds),
    [selectedRole.sourceIds],
  );

  // Role Fit Finder computations
  const relevantFinderAttrKeys = useMemo(() => {
    const isGk = finderGroup === 'GK';
    const keys = new Set<AttrKey>();
    for (const r of ROLES) {
      if (!r.groups.includes(finderGroup)) continue;
      for (const k of r.key) keys.add(k);
      for (const k of r.pref) keys.add(k);
    }
    for (const w of FM27_ME_WEIGHTS) {
      if (w.appliesTo === (isGk ? 'gk' : 'outfield')) {
        keys.add(w.key);
      }
    }
    return keys;
  }, [finderGroup]);

  const finderAttrGroups = useMemo(() => {
    const isGk = finderGroup === 'GK';
    const cats: AttrCategory[] = isGk
      ? ['Goalkeeping', 'Mental', 'Physical', 'Technical']
      : ['Technical', 'Mental', 'Physical'];
    return cats
      .map((category) => ({
        category,
        items: ATTRIBUTES.filter(
          (a) =>
            a.category === category &&
            (showAllFinderAttrs || relevantFinderAttrKeys.has(a.key)),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [finderGroup, relevantFinderAttrKeys, showAllFinderAttrs]);

  const pairFits = useMemo(
    () => suggestRolePairs(attrs, finderGroup, finderMode, 5),
    [attrs, finderGroup, finderMode],
  );
  const ipFits = useMemo(
    () => scoreRoleFit(attrs, { group: finderGroup, phase: 'ip', mode: finderMode, limit: 6 }),
    [attrs, finderGroup, finderMode],
  );
  const oopFits = useMemo(
    () => scoreRoleFit(attrs, { group: finderGroup, phase: 'oop', mode: finderMode, limit: 6 }),
    [attrs, finderGroup, finderMode],
  );

  // Role Comparator computations
  const comparison = useMemo(() => compareRoles(compareA, compareB), [compareA, compareB]);
  const compareDiagramA = useMemo(
    () => (comparison ? buildRoleDiagram(comparison.roleA.id) : null),
    [comparison],
  );
  const compareDiagramB = useMemo(
    () => (comparison ? buildRoleDiagram(comparison.roleB.id) : null),
    [comparison],
  );

  const handleInspectRole = (roleId: string) => {
    if (!ROLE_BY_ID[roleId]) return;
    setSelectedRoleId(roleId);
    setSearch('');
    setPhaseFilter('all');
    setGroupFilter('ALL');
    setSubTab('browse');
  };

  const handleCompareRole = (roleId: string, secondRoleId?: string) => {
    if (!ROLE_BY_ID[roleId]) return;
    setCompareA(roleId);
    setCompareB(secondRoleId && ROLE_BY_ID[secondRoleId] ? secondRoleId : pickComparePartner(roleId));
    setSubTab('compare');
  };

  const handleApplyArchetype = (archetypeId: string) => {
    const arch = PLAYER_ARCHETYPES.find((a) => a.id === archetypeId);
    if (!arch) return;
    setActiveArchetypeId(arch.id);
    setFinderGroup(arch.group);
    setAttrs(buildInitialAttrs(arch.id));
  };

  const handleResetAttrs = () => {
    setActiveArchetypeId(null);
    setAttrs(Object.fromEntries(ATTRIBUTES.map((a) => [a.key, 10])) as Record<AttrKey, number>);
  };

  const handleSetAttr = (key: AttrKey, val: number) => {
    setActiveArchetypeId(null);
    setAttrs((prev) => ({ ...prev, [key]: val }));
  };

  const renderAttrChip = (key: AttrKey, variant: 'key' | 'pref') => {
    const def = ATTRIBUTE_BY_KEY[key];
    const meSpec = ME_WEIGHT_MAP.get(key);
    const label = def?.name ?? key;
    if (!onJumpToAttribute) {
      return (
        <span key={key} className={`attr-chip attr-chip--${variant}`}>
          {label}
          {meSpec && <span className="pill pill--fm27" style={{ padding: '0 5px', fontSize: '0.66rem' }}>ME</span>}
        </span>
      );
    }
    return (
      <Button
        key={key}
        className={`attr-chip attr-chip--${variant}`}
        style={{ cursor: 'pointer' }}
        onClick={() => onJumpToAttribute(key)}
        title={`Inspect ${label} in Attributes Guide`}
      >
        {label}
        {meSpec && (
          <span className="pill pill--fm27" style={{ padding: '0 5px', fontSize: '0.66rem' }}>
            ME
          </span>
        )}
      </Button>
    );
  };

  return (
    <div className="page-container">
      <header className="section-header">
        <div>
          <h1 className="section-title">Roles</h1>
          <p className="section-subtitle">
            All 77 FM26/FM27 In Possession &amp; Out of Possession roles, fit finder, and comparator.
          </p>
        </div>
        <div className="section-actions">
          <SegmentedControl
            aria-label="Roles tool"
            value={subTab}
            onValueChange={(next) => {
              if (next === 'browse' || next === 'finder' || next === 'compare') {
                setSubTab(next);
              }
            }}
          >
            <SegmentedControlIndicator />
            <SegmentedControlItem value="browse">Browse Roles</SegmentedControlItem>
            <SegmentedControlItem value="finder">Role Fit Finder</SegmentedControlItem>
            <SegmentedControlItem value="compare">Compare Roles</SegmentedControlItem>
          </SegmentedControl>
        </div>
      </header>

      {/* ── SUB-TAB 1: BROWSE ROLES ────────────────────────────────────────── */}
      {subTab === 'browse' && (
        <div className="master-detail">
          <aside className="list-pane" aria-label="Roles directory">
            <div className="list-pane-header">
              <InputGroup>
                <Input
                  type="search"
                  aria-label="Filter roles by name, abbreviation, or FM24 equivalent"
                  placeholder="Search role, abbr, or FM24 name…"
                  value={search}
                  onValueChange={setSearch}
                />
                <InputClear aria-label="Clear role search">×</InputClear>
              </InputGroup>

              <SegmentedControl
                aria-label="Filter roles by phase"
                value={phaseFilter}
                onValueChange={(next) => {
                  if (next === 'all' || next === 'ip' || next === 'oop') {
                    setPhaseFilter(next);
                  }
                }}
              >
                <SegmentedControlIndicator />
                <SegmentedControlItem value="all">All</SegmentedControlItem>
                <SegmentedControlItem value="ip">In Possession</SegmentedControlItem>
                <SegmentedControlItem value="oop">Out of Possession</SegmentedControlItem>
              </SegmentedControl>

              <Select
                items={GROUP_FILTER_ITEMS}
                value={groupFilter}
                onValueChange={(next) => {
                  if (next) setGroupFilter(next);
                }}
              >
                <SelectTrigger aria-label="Filter roles by position group">
                  <SelectValue />
                  <ChevronIcon />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" label="All Positions">
                    All Positions
                    <SelectItemIndicator>
                      <CheckMark />
                    </SelectItemIndicator>
                  </SelectItem>
                  {POSITION_GROUPS.map((g) => (
                    <SelectItem key={g} value={g} label={GROUP_LABELS[g]}>
                      {GROUP_LABELS[g]}
                      <SelectItemIndicator>
                        <CheckMark />
                      </SelectItemIndicator>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="row-between text-xs text-muted">
                <span className="tabular-nums">
                  {filteredRoles.length} of {ROLES.length} roles
                </span>
                {(search || phaseFilter !== 'all' || groupFilter !== 'ALL') && (
                  <Button
                    className="btn btn--ghost btn--sm"
                    style={{ height: 22, padding: '0 6px' }}
                    onClick={() => {
                      setSearch('');
                      setPhaseFilter('all');
                      setGroupFilter('ALL');
                    }}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            <div className="list-pane-scroll">
              {filteredRoles.length === 0 ? (
                <div className="empty-state">
                  <p>No roles match your filters.</p>
                </div>
              ) : (
                filteredRoles.map((role) => {
                  const isSelected = role.id === selectedRole.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      className="list-row"
                      data-selected={isSelected ? '' : undefined}
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => setSelectedRoleId(role.id)}
                    >
                      <div className="stack-sm" style={{ gap: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: isSelected ? 650 : 500 }}>
                          {role.name}{' '}
                          <span className="text-muted text-xs">({role.abbr})</span>
                        </span>
                        {role.legacyEquiv && (
                          <span className="text-xs text-muted">FM24: {role.legacyEquiv}</span>
                        )}
                      </div>
                      <span className={`pill pill--${role.phase}`}>
                        {role.phase.toUpperCase()}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className="detail-pane" aria-label="Role details">
            <div className="card">
              <div className="card-header">
                <div className="stack-sm" style={{ gap: 6 }}>
                  <div className="row-wrap">
                    <h2 style={{ fontSize: '1.25rem' }}>
                      {selectedRole.name}{' '}
                      <span className="text-muted" style={{ fontWeight: 500 }}>
                        ({selectedRole.abbr})
                      </span>
                    </h2>
                    <span className={`pill pill--${selectedRole.phase}`}>
                      {selectedRole.phase === 'ip' ? 'In Possession' : 'Out of Possession'}
                    </span>
                    {selectedRole.legacyEquiv && (
                      <span className="pill pill--fm27">FM24: {selectedRole.legacyEquiv}</span>
                    )}
                    {selectedRole.wideCB && (
                      <span className="pill pill--info">Back-3 Wide CB</span>
                    )}
                  </div>
                  <p className="text-sm">{selectedRole.summary}</p>
                </div>

                <Button
                  className="btn btn--sm"
                  onClick={() => handleCompareRole(selectedRole.id)}
                >
                  Compare with another role
                </Button>
              </div>

              <PitchSvg
                diagram={selectedDiagram}
                compact
                ariaLabel={`${selectedRole.name} tactical movement diagram`}
              />

              {(selectedRole.moveNote || selectedDiagram.subtitle) && (
                <p className="text-xs text-muted">
                  {selectedRole.moveNote ?? selectedDiagram.subtitle}
                </p>
              )}

              <div className="card--subtle">
                <span className="text-xs text-muted" style={{ display: 'block', marginBottom: 3 }}>
                  TACTICAL TIP
                </span>
                <p className="text-sm">{selectedRole.tip}</p>
              </div>
            </div>

            <div className="card">
              <div className="stack">
                <div>
                  <h3 style={{ marginBottom: 8 }}>Valid Positions</h3>
                  <div className="row-wrap">
                    {selectedRole.groups.map((g) => (
                      <span key={g} className="pill">
                        {GROUP_LABELS[g]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="divider" />

                <div>
                  <div className="row-between" style={{ marginBottom: 8 }}>
                    <h3>Key Attributes</h3>
                    <span className="text-xs text-muted">Primary role drivers (2× weight)</span>
                  </div>
                  <div className="row-wrap">
                    {selectedRole.key.map((k) => renderAttrChip(k, 'key'))}
                  </div>
                </div>

                <div>
                  <div className="row-between" style={{ marginBottom: 8 }}>
                    <h3>Preferred Attributes</h3>
                    <span className="text-xs text-muted">Secondary role drivers (1× weight)</span>
                  </div>
                  <div className="row-wrap">
                    {selectedRole.pref.map((k) => renderAttrChip(k, 'pref'))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card card--subtle">
              <div className="row-between">
                <span className="text-xs text-muted">{selectedRole.srcNote}</span>
                <span className={`pill ${selectedRole.attrsConf ? 'pill--ok' : 'pill--muted'}`}>
                  {selectedRole.attrsConf ? 'Confirmed Attrs' : 'Estimated Attrs'}
                </span>
              </div>
              {selectedSources.length > 0 && (
                <p className="text-xs text-muted">
                  Sources: {selectedSources.map((s) => s.title).join(' · ')}
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ── SUB-TAB 2: ROLE FIT FINDER ─────────────────────────────────────── */}
      {subTab === 'finder' && (
        <div className="two-col" style={{ alignItems: 'start' }}>
          {/* Left: Player profile controls & sliders */}
          <div className="stack">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Player Profile</h2>
                <Button className="btn btn--ghost btn--sm" onClick={handleResetAttrs}>
                  Reset to 10s
                </Button>
              </div>

              <div className="two-col" style={{ gap: 12 }}>
                <div className="stack-sm">
                  <label className="text-xs text-muted" htmlFor="finder-group-trigger">
                    Position Group
                  </label>
                  <Select
                    items={GROUP_SELECT_ITEMS}
                    value={finderGroup}
                    onValueChange={(next) => {
                      if (next) {
                        setFinderGroup(next as PositionGroup);
                        setActiveArchetypeId(null);
                      }
                    }}
                  >
                    <SelectTrigger id="finder-group-trigger" aria-label="Position group">
                      <SelectValue />
                      <ChevronIcon />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITION_GROUPS.map((g) => (
                        <SelectItem key={g} value={g} label={GROUP_LABELS[g]}>
                          {GROUP_LABELS[g]}
                          <SelectItemIndicator>
                            <CheckMark />
                          </SelectItemIndicator>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="stack-sm">
                  <span className="text-xs text-muted">Scoring Mode</span>
                  <SegmentedControl
                    aria-label="Role fit scoring mode"
                    value={finderMode}
                    onValueChange={(next) => {
                      if (next === 'role' || next === 'fm27-me') {
                        setFinderMode(next);
                      }
                    }}
                  >
                    <SegmentedControlIndicator />
                    <SegmentedControlItem value="role">Pure FM Role</SegmentedControlItem>
                    <SegmentedControlItem value="fm27-me">FM27 ME-Weighted</SegmentedControlItem>
                  </SegmentedControl>
                </div>
              </div>

              {finderMode === 'fm27-me' && (
                <p className="text-xs text-muted">
                  Applies empirical FM27 Match Engine weights (Pace, Acceleration, Stamina, Jumping
                  Reach, Strength, Anticipation, Marking; GK Agility &amp; Reflexes).
                </p>
              )}

              <div className="divider" />

              <div className="stack-sm">
                <span className="text-xs text-muted">Quick Archetypes (1-click)</span>
                <div className="row-wrap">
                  {PLAYER_ARCHETYPES.map((arch) => {
                    const active = activeArchetypeId === arch.id;
                    return (
                      <Button
                        key={arch.id}
                        className={`btn btn--sm ${active ? 'btn--primary' : ''}`}
                        onClick={() => handleApplyArchetype(arch.id)}
                        title={arch.summary}
                      >
                        {arch.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Attributes (1–20)</h2>
                  <p className="text-xs text-muted">
                    Showing {showAllFinderAttrs ? 'all' : 'position-relevant'} attributes.{' '}
                    <span className="pill pill--fm27" style={{ padding: '0 5px', fontSize: '0.68rem' }}>
                      ME
                    </span>{' '}
                    marks FM27 high-impact stats.
                  </p>
                </div>
                <Button
                  className="btn btn--ghost btn--sm"
                  onClick={() => setShowAllFinderAttrs((v) => !v)}
                >
                  {showAllFinderAttrs ? 'Relevant only' : 'Show all'}
                </Button>
              </div>

              <div className="stack-lg">
                {finderAttrGroups.map((group) => (
                  <div key={group.category} className="stack-sm">
                    <h3 className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {group.category}
                    </h3>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))',
                        gap: '10px 16px',
                      }}
                    >
                      {group.items.map((attr) => {
                        const val = attrs[attr.key] ?? 10;
                        const isMe =
                          ME_WEIGHT_MAP.get(attr.key)?.appliesTo ===
                          (finderGroup === 'GK' ? 'gk' : 'outfield');
                        return (
                          <Slider
                            key={attr.key}
                            min={1}
                            max={20}
                            step={1}
                            value={val}
                            onValueChange={(next) => {
                              const num = Array.isArray(next) ? next[0] : next;
                              if (typeof num === 'number') handleSetAttr(attr.key, num);
                            }}
                          >
                            <div className="row-between" style={{ marginBottom: 4 }}>
                              <span className="row" style={{ gap: 5, fontSize: '0.82rem' }}>
                                {attr.name}
                                {isMe && (
                                  <span
                                    className="pill pill--fm27"
                                    style={{ padding: '0 4px', fontSize: '0.64rem' }}
                                  >
                                    ME
                                  </span>
                                )}
                              </span>
                              <span
                                className="tabular-nums text-xs"
                                style={{
                                  fontWeight: 700,
                                  color:
                                    val >= 15
                                      ? 'var(--accent)'
                                      : val <= 8
                                        ? 'var(--danger)'
                                        : 'var(--text)',
                                }}
                              >
                                {val}
                              </span>
                            </div>
                            <SliderControl>
                              <SliderTrack>
                                <SliderIndicator />
                                <SliderThumb aria-label={attr.name} />
                              </SliderTrack>
                            </SliderControl>
                          </Slider>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Live Results */}
          <div className="stack">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Top IP + OOP Pairings</h2>
                <span className="pill">{GROUP_LABELS[finderGroup]}</span>
              </div>

              <div className="stack-sm">
                {pairFits.map((pair) => (
                  <div key={`${pair.ip.role.id}-${pair.oop.role.id}`} className="card--subtle stack-sm">
                    <div className="row-between">
                      <div className="row-wrap" style={{ gap: 6 }}>
                        <span className="pill pill--ip">IP</span>
                        <strong>{pair.ip.role.name}</strong>
                        <span className="text-muted">+</span>
                        <span className="pill pill--oop">OOP</span>
                        <strong>{pair.oop.role.name}</strong>
                      </div>
                      <span className="pill pill--ok tabular-nums">{pair.combinedScore.toFixed(1)}</span>
                    </div>

                    <div className="stat-bar">
                      <div className="stat-bar-track">
                        <div
                          className="stat-bar-fill"
                          style={{ width: `${Math.min(100, pair.combinedScore)}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-muted">{pair.fitNote}</p>

                    <div className="row-wrap" style={{ gap: 6 }}>
                      <Button
                        className="btn btn--ghost btn--sm"
                        onClick={() => handleInspectRole(pair.ip.role.id)}
                      >
                        Inspect {pair.ip.role.abbr}
                      </Button>
                      <Button
                        className="btn btn--ghost btn--sm"
                        onClick={() => handleInspectRole(pair.oop.role.id)}
                      >
                        Inspect {pair.oop.role.abbr}
                      </Button>
                      <Button
                        className="btn btn--sm"
                        onClick={() => handleCompareRole(pair.ip.role.id, pair.oop.role.id)}
                      >
                        Compare Pair
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Top In Possession Roles</h2>
                <span className="pill pill--ip">IP</span>
              </div>
              <div className="stack-sm">
                {ipFits.map((fit) => (
                  <div key={fit.role.id} className="card--subtle stack-sm">
                    <div className="row-between">
                      <div className="row" style={{ gap: 6 }}>
                        <strong>{fit.role.name}</strong>
                        <span className="text-xs text-muted">({fit.role.abbr})</span>
                      </div>
                      <div className="row" style={{ gap: 6 }}>
                        {finderMode === 'fm27-me' && fit.meBonus !== 0 && (
                          <span className="pill pill--fm27 tabular-nums">
                            ME {fit.meBonus > 0 ? `+${fit.meBonus.toFixed(1)}` : fit.meBonus.toFixed(1)}
                          </span>
                        )}
                        <span className="pill pill--ip tabular-nums">{fit.score.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="stat-bar">
                      <div className="stat-bar-track">
                        <div
                          className="stat-bar-fill"
                          style={{ width: `${Math.min(100, fit.score)}%` }}
                        />
                      </div>
                    </div>
                    <div className="row-between">
                      <span className="text-xs text-muted tabular-nums">
                        Key avg {fit.keyAvg.toFixed(1)} · Pref avg {fit.prefAvg.toFixed(1)}
                      </span>
                      <div className="row" style={{ gap: 4 }}>
                        <Button
                          className="btn btn--ghost btn--sm"
                          onClick={() => handleInspectRole(fit.role.id)}
                        >
                          Inspect
                        </Button>
                        <Button
                          className="btn btn--ghost btn--sm"
                          onClick={() => handleCompareRole(fit.role.id)}
                        >
                          Compare
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Top Out of Possession Roles</h2>
                <span className="pill pill--oop">OOP</span>
              </div>
              <div className="stack-sm">
                {oopFits.map((fit) => (
                  <div key={fit.role.id} className="card--subtle stack-sm">
                    <div className="row-between">
                      <div className="row" style={{ gap: 6 }}>
                        <strong>{fit.role.name}</strong>
                        <span className="text-xs text-muted">({fit.role.abbr})</span>
                      </div>
                      <div className="row" style={{ gap: 6 }}>
                        {finderMode === 'fm27-me' && fit.meBonus !== 0 && (
                          <span className="pill pill--fm27 tabular-nums">
                            ME {fit.meBonus > 0 ? `+${fit.meBonus.toFixed(1)}` : fit.meBonus.toFixed(1)}
                          </span>
                        )}
                        <span className="pill pill--oop tabular-nums">{fit.score.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="stat-bar">
                      <div className="stat-bar-track">
                        <div
                          className="stat-bar-fill"
                          style={{
                            width: `${Math.min(100, fit.score)}%`,
                            background: 'var(--info)',
                          }}
                        />
                      </div>
                    </div>
                    <div className="row-between">
                      <span className="text-xs text-muted tabular-nums">
                        Key avg {fit.keyAvg.toFixed(1)} · Pref avg {fit.prefAvg.toFixed(1)}
                      </span>
                      <div className="row" style={{ gap: 4 }}>
                        <Button
                          className="btn btn--ghost btn--sm"
                          onClick={() => handleInspectRole(fit.role.id)}
                        >
                          Inspect
                        </Button>
                        <Button
                          className="btn btn--ghost btn--sm"
                          onClick={() => handleCompareRole(fit.role.id)}
                        >
                          Compare
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-TAB 3: COMPARE ROLES ───────────────────────────────────────── */}
      {subTab === 'compare' && (
        <div className="stack-lg">
          <div className="card">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                gap: 12,
                alignItems: 'end',
              }}
            >
              <div className="stack-sm">
                <label className="text-xs text-muted" htmlFor="compare-a-trigger">
                  Role A
                </label>
                <Select
                  items={ROLE_SELECT_ITEMS}
                  value={compareA}
                  onValueChange={(next) => {
                    if (next) setCompareA(next);
                  }}
                >
                  <SelectTrigger id="compare-a-trigger" aria-label="Select Role A">
                    <SelectValue />
                    <ChevronIcon />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectGroupLabel>In Possession (IP)</SelectGroupLabel>
                      {IP_ROLES.map((r) => (
                        <SelectItem
                          key={r.id}
                          value={r.id}
                          label={`${r.name} (${r.abbr}) · IP`}
                        >
                          {r.name} ({r.abbr})
                          <SelectItemIndicator>
                            <CheckMark />
                          </SelectItemIndicator>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectGroupLabel>Out of Possession (OOP)</SelectGroupLabel>
                      {OOP_ROLES.map((r) => (
                        <SelectItem
                          key={r.id}
                          value={r.id}
                          label={`${r.name} (${r.abbr}) · OOP`}
                        >
                          {r.name} ({r.abbr})
                          <SelectItemIndicator>
                            <CheckMark />
                          </SelectItemIndicator>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="btn"
                onClick={() => {
                  setCompareA(compareB);
                  setCompareB(compareA);
                }}
                aria-label="Swap Role A and Role B"
              >
                ⇄ Swap
              </Button>

              <div className="stack-sm">
                <label className="text-xs text-muted" htmlFor="compare-b-trigger">
                  Role B
                </label>
                <Select
                  items={ROLE_SELECT_ITEMS}
                  value={compareB}
                  onValueChange={(next) => {
                    if (next) setCompareB(next);
                  }}
                >
                  <SelectTrigger id="compare-b-trigger" aria-label="Select Role B">
                    <SelectValue />
                    <ChevronIcon />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectGroupLabel>In Possession (IP)</SelectGroupLabel>
                      {IP_ROLES.map((r) => (
                        <SelectItem
                          key={r.id}
                          value={r.id}
                          label={`${r.name} (${r.abbr}) · IP`}
                        >
                          {r.name} ({r.abbr})
                          <SelectItemIndicator>
                            <CheckMark />
                          </SelectItemIndicator>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectGroupLabel>Out of Possession (OOP)</SelectGroupLabel>
                      {OOP_ROLES.map((r) => (
                        <SelectItem
                          key={r.id}
                          value={r.id}
                          label={`${r.name} (${r.abbr}) · OOP`}
                        >
                          {r.name} ({r.abbr})
                          <SelectItemIndicator>
                            <CheckMark />
                          </SelectItemIndicator>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {comparison && (
            <>
              {/* Side-by-side overview cards */}
              <div className="two-col">
                {[
                  {
                    tag: 'Role A',
                    role: comparison.roleA,
                    diagram: compareDiagramA,
                    accent: 'var(--accent)',
                  },
                  {
                    tag: 'Role B',
                    role: comparison.roleB,
                    diagram: compareDiagramB,
                    accent: 'var(--info)',
                  },
                ].map(({ tag, role, diagram, accent }) => (
                  <div key={tag} className="card" style={{ borderTop: `3px solid ${accent}` }}>
                    <div className="card-header">
                      <div className="row-wrap">
                        <h2 className="card-title">
                          {role.name} <span className="text-muted">({role.abbr})</span>
                        </h2>
                        <span className={`pill pill--${role.phase}`}>
                          {role.phase.toUpperCase()}
                        </span>
                        {role.legacyEquiv && (
                          <span className="pill pill--fm27">FM24: {role.legacyEquiv}</span>
                        )}
                      </div>
                      <Button
                        className="btn btn--ghost btn--sm"
                        onClick={() => handleInspectRole(role.id)}
                      >
                        Inspect
                      </Button>
                    </div>
                    <p className="text-sm">{role.summary}</p>
                    {diagram && <PitchSvg diagram={diagram} compact />}
                    <div className="row-wrap">
                      {role.groups.map((g) => (
                        <span key={g} className="pill">
                          {GROUP_LABELS[g]}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Attribute Venn Breakdown */}
              <div className="card">
                <h2 className="card-title">Attribute Breakdown</h2>
                <div className="stack">
                  <div>
                    <h3 className="text-sm" style={{ marginBottom: 8 }}>
                      Key Attributes
                    </h3>
                    <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                      <div className="card--subtle stack-sm">
                        <span className="text-xs text-muted">
                          Shared ({comparison.keyAttrs.shared.length})
                        </span>
                        <div className="row-wrap">
                          {comparison.keyAttrs.shared.length > 0 ? (
                            comparison.keyAttrs.shared.map((k) => renderAttrChip(k, 'key'))
                          ) : (
                            <span className="text-xs text-muted">None</span>
                          )}
                        </div>
                      </div>
                      <div className="card--subtle stack-sm">
                        <span className="text-xs text-muted">
                          Only {comparison.roleA.abbr} ({comparison.keyAttrs.onlyA.length})
                        </span>
                        <div className="row-wrap">
                          {comparison.keyAttrs.onlyA.length > 0 ? (
                            comparison.keyAttrs.onlyA.map((k) => renderAttrChip(k, 'key'))
                          ) : (
                            <span className="text-xs text-muted">None</span>
                          )}
                        </div>
                      </div>
                      <div className="card--subtle stack-sm">
                        <span className="text-xs text-muted">
                          Only {comparison.roleB.abbr} ({comparison.keyAttrs.onlyB.length})
                        </span>
                        <div className="row-wrap">
                          {comparison.keyAttrs.onlyB.length > 0 ? (
                            comparison.keyAttrs.onlyB.map((k) => renderAttrChip(k, 'key'))
                          ) : (
                            <span className="text-xs text-muted">None</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm" style={{ marginBottom: 8 }}>
                      Preferred Attributes
                    </h3>
                    <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                      <div className="card--subtle stack-sm">
                        <span className="text-xs text-muted">
                          Shared ({comparison.prefAttrs.shared.length})
                        </span>
                        <div className="row-wrap">
                          {comparison.prefAttrs.shared.length > 0 ? (
                            comparison.prefAttrs.shared.map((k) => renderAttrChip(k, 'pref'))
                          ) : (
                            <span className="text-xs text-muted">None</span>
                          )}
                        </div>
                      </div>
                      <div className="card--subtle stack-sm">
                        <span className="text-xs text-muted">
                          Only {comparison.roleA.abbr} ({comparison.prefAttrs.onlyA.length})
                        </span>
                        <div className="row-wrap">
                          {comparison.prefAttrs.onlyA.length > 0 ? (
                            comparison.prefAttrs.onlyA.map((k) => renderAttrChip(k, 'pref'))
                          ) : (
                            <span className="text-xs text-muted">None</span>
                          )}
                        </div>
                      </div>
                      <div className="card--subtle stack-sm">
                        <span className="text-xs text-muted">
                          Only {comparison.roleB.abbr} ({comparison.prefAttrs.onlyB.length})
                        </span>
                        <div className="row-wrap">
                          {comparison.prefAttrs.onlyB.length > 0 ? (
                            comparison.prefAttrs.onlyB.map((k) => renderAttrChip(k, 'pref'))
                          ) : (
                            <span className="text-xs text-muted">None</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tactical Profile Diffs */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Tactical Profile Differences</h2>
                  <div className="row" style={{ gap: 10 }}>
                    <span className="pill pill--ip">A: {comparison.roleA.name}</span>
                    <span className="pill pill--oop">B: {comparison.roleB.name}</span>
                  </div>
                </div>
                <div className="stack">
                  {comparison.profileDiffs.map((item) => (
                    <div key={item.metric} className="stack-sm" style={{ gap: 4 }}>
                      <div className="row-between text-xs">
                        <strong>{item.label}</strong>
                        <span className="text-muted tabular-nums">
                          {comparison.roleA.abbr}: {formatProfileVal(item.metric, item.a)} ·{' '}
                          {comparison.roleB.abbr}: {formatProfileVal(item.metric, item.b)}
                        </span>
                      </div>
                      <div className="stat-bar-track">
                        <div
                          className="stat-bar-fill"
                          style={{ width: `${profilePercent(item.metric, item.a)}%` }}
                        />
                      </div>
                      <div className="stat-bar-track">
                        <div
                          className="stat-bar-fill"
                          style={{
                            width: `${profilePercent(item.metric, item.b)}%`,
                            background: 'var(--info)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
