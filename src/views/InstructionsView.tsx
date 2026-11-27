import { useEffect, useMemo, useState } from 'react';
import { Button } from '@ui-sdk/react/button';
import { Input, InputClear, InputGroup } from '@ui-sdk/react/input';
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from '@ui-sdk/react/segmented-control';
import { PitchSvg } from '../components/PitchSvg';
import {
  ATTRIBUTE_BY_KEY,
  GROUP_LABELS,
  PI_BY_KEY,
  PLAYER_INSTRUCTIONS,
  TEAM_INSTRUCTIONS,
  TI_AREAS,
  TI_BY_KEY,
  type AttrKey,
  type PIFamily,
  type PIKey,
  type PlayerInstructionDef,
  type TeamInstructionDef,
  type TIKey,
} from '../data';
import { buildPlayerInstructionDiagram, buildTeamInstructionDiagram } from '../engine';

export interface InstructionsViewProps {
  initialKind?: 'ti' | 'pi';
  initialKey?: string | null;
  onJumpToAttribute?: (attrKey: string) => void;
  onOpenInTactics?: (patch: { ti?: [string, number]; pi?: string }) => void;
}

type InstructionMode = 'ti-ip' | 'ti-oop' | 'pi';

interface PIOptionItem {
  id: string;
  label: string;
  piKey?: PIKey;
  diagramOption?: string;
}

interface PIOptionFamily {
  label: string;
  options: readonly PIOptionItem[];
}

const PI_OPTION_FAMILIES: readonly PIOptionFamily[] = [
  {
    label: 'Attack Box — Depth (FM27)',
    options: [
      { id: 'standard', label: 'Standard', diagramOption: 'standard' },
      {
        id: 'arrive_late',
        label: 'Arrive Late',
        piKey: 'arrive_late',
        diagramOption: 'arrive_late',
      },
      {
        id: 'attack_the_defensive_line',
        label: 'Attack the Defensive Line',
        piKey: 'attack_the_defensive_line',
        diagramOption: 'attack_the_defensive_line',
      },
    ],
  },
  {
    label: 'Attack Box — Target Zone (FM27)',
    options: [
      { id: 'target_near_post', label: 'Near Post', piKey: 'target_near_post' },
      { id: 'target_centre', label: 'Centre', piKey: 'target_centre' },
      { id: 'target_far_post', label: 'Far Post', piKey: 'target_far_post' },
    ],
  },
  {
    label: 'Shooting',
    options: [
      { id: 'shoot_less', label: 'Shoot Less', piKey: 'shoot_less' },
      { id: 'shoot_more', label: 'Shoot More', piKey: 'shoot_more' },
    ],
  },
  {
    label: 'Dribbling',
    options: [
      { id: 'dribble_less', label: 'Dribble Less', piKey: 'dribble_less' },
      { id: 'dribble_more', label: 'Dribble More', piKey: 'dribble_more' },
    ],
  },
  {
    label: 'Passing Risk',
    options: [
      { id: 'take_fewer_risks', label: 'Take Fewer Risks', piKey: 'take_fewer_risks' },
      { id: 'take_more_risks', label: 'Take More Risks', piKey: 'take_more_risks' },
    ],
  },
  {
    label: 'Crossing Zone',
    options: [
      { id: 'cross_from_deep', label: 'Cross From Deep', piKey: 'cross_from_deep' },
      { id: 'cross_from_byline', label: 'Cross From Byline', piKey: 'cross_from_byline' },
    ],
  },
  {
    label: 'Width',
    options: [
      { id: 'sit_narrower', label: 'Sit Narrower', piKey: 'sit_narrower' },
      { id: 'stay_wider', label: 'Stay Wider', piKey: 'stay_wider' },
    ],
  },
  {
    label: 'Vertical Depth',
    options: [
      { id: 'hold_position', label: 'Hold Position', piKey: 'hold_position' },
      { id: 'get_further_forward', label: 'Get Further Forward', piKey: 'get_further_forward' },
    ],
  },
  {
    label: 'Pressing',
    options: [
      { id: 'press_less', label: 'Press Less', piKey: 'press_less' },
      { id: 'press_more', label: 'Press More', piKey: 'press_more' },
    ],
  },
  {
    label: 'Tackling',
    options: [
      { id: 'ease_off_tackles', label: 'Ease Off Tackles', piKey: 'ease_off_tackles' },
      { id: 'tackle_harder', label: 'Tackle Harder', piKey: 'tackle_harder' },
    ],
  },
];

const PI_FAMILIES_ORDER: readonly PIFamily[] = [
  'Box (FM27)',
  'Movement',
  'Passing',
  'Shooting',
  'Dribbling',
  'Crossing',
  'Pressing',
  'Defending',
];

function findPIOptionFamily(piKey: PIKey): PIOptionFamily | null {
  return (
    PI_OPTION_FAMILIES.find((fam) => fam.options.some((opt) => opt.piKey === piKey)) ?? null
  );
}

function getInitialMode(kind?: 'ti' | 'pi', key?: string | null): InstructionMode {
  if (kind === 'pi') return 'pi';
  if (key && TI_BY_KEY[key as TIKey]) {
    return TI_BY_KEY[key as TIKey].phase === 'oop' ? 'ti-oop' : 'ti-ip';
  }
  return 'ti-ip';
}

export function InstructionsView({
  initialKind,
  initialKey,
  onJumpToAttribute,
  onOpenInTactics,
}: InstructionsViewProps) {
  const [mode, setMode] = useState<InstructionMode>(() => getInitialMode(initialKind, initialKey));
  const [search, setSearch] = useState('');
  const [selectedTiKey, setSelectedTiKey] = useState<TIKey>(() =>
    initialKind !== 'pi' && initialKey && TI_BY_KEY[initialKey as TIKey]
      ? (initialKey as TIKey)
      : 'width',
  );
  const [tiOptIdx, setTiOptIdx] = useState<number>(() => {
    const ti =
      initialKind !== 'pi' && initialKey && TI_BY_KEY[initialKey as TIKey]
        ? TI_BY_KEY[initialKey as TIKey]
        : TI_BY_KEY.width;
    return ti.defaultIndex;
  });

  const [selectedPiKey, setSelectedPiKey] = useState<PIKey>(() =>
    initialKind === 'pi' && initialKey && PI_BY_KEY[initialKey as PIKey]
      ? (initialKey as PIKey)
      : 'arrive_late',
  );
  const [piPreviewOpt, setPiPreviewOpt] = useState<string | undefined>(undefined);

  // Sync external navigation props
  useEffect(() => {
    if (initialKind === 'pi') {
      setMode('pi');
      if (initialKey && PI_BY_KEY[initialKey as PIKey]) {
        setSelectedPiKey(initialKey as PIKey);
        setPiPreviewOpt(undefined);
        setSearch('');
      }
      return;
    }
    if (initialKind === 'ti' && initialKey && TI_BY_KEY[initialKey as TIKey]) {
      const ti = TI_BY_KEY[initialKey as TIKey];
      setMode(ti.phase === 'oop' ? 'ti-oop' : 'ti-ip');
      setSelectedTiKey(ti.key);
      setTiOptIdx(ti.defaultIndex);
      setSearch('');
    }
  }, [initialKind, initialKey]);

  const selectTi = (ti: TeamInstructionDef) => {
    setSelectedTiKey(ti.key);
    setTiOptIdx(ti.defaultIndex);
  };

  const selectPi = (piKey: PIKey) => {
    setMode('pi');
    setSelectedPiKey(piKey);
    setPiPreviewOpt(undefined);
  };

  // Filtered lists
  const groupedTIs = useMemo(() => {
    const targetPhase = mode === 'ti-oop' ? 'oop' : 'ip';
    const q = search.trim().toLowerCase();
    const list = TEAM_INSTRUCTIONS.filter((ti) => {
      if (ti.phase !== targetPhase) return false;
      if (!q) return true;
      return (
        ti.name.toLowerCase().includes(q) ||
        ti.area.toLowerCase().includes(q) ||
        ti.description.toLowerCase().includes(q) ||
        ti.options.some((o) => o.toLowerCase().includes(q))
      );
    });
    return TI_AREAS.map((area) => ({
      area,
      items: list.filter((ti) => ti.area === area),
    })).filter((g) => g.items.length > 0);
  }, [mode, search]);

  const groupedPIs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = PLAYER_INSTRUCTIONS.filter((pi) => {
      if (!q) return true;
      return (
        pi.name.toLowerCase().includes(q) ||
        pi.family.toLowerCase().includes(q) ||
        pi.description.toLowerCase().includes(q) ||
        (pi.fm27 && 'fm27'.includes(q))
      );
    });
    return PI_FAMILIES_ORDER.map((family) => ({
      family,
      items: list.filter((pi) => pi.family === family),
    })).filter((g) => g.items.length > 0);
  }, [search]);

  // Keep active TI aligned with the selected IP / OOP tab
  const activeTi: TeamInstructionDef = useMemo(() => {
    const candidate = TI_BY_KEY[selectedTiKey];
    const targetPhase = mode === 'ti-oop' ? 'oop' : 'ip';
    if (candidate && candidate.phase === targetPhase) return candidate;
    return TEAM_INSTRUCTIONS.find((t) => t.phase === targetPhase) ?? TEAM_INSTRUCTIONS[0];
  }, [mode, selectedTiKey]);

  const safeOptIdx = Math.max(0, Math.min(activeTi.options.length - 1, tiOptIdx));
  const activePi: PlayerInstructionDef = PI_BY_KEY[selectedPiKey] ?? PLAYER_INSTRUCTIONS[0];
  const piOptionFamily = useMemo(() => findPIOptionFamily(activePi.key), [activePi.key]);

  const tiDiagram = useMemo(
    () => buildTeamInstructionDiagram(activeTi.key, safeOptIdx),
    [activeTi.key, safeOptIdx],
  );
  const piDiagram = useMemo(
    () => buildPlayerInstructionDiagram(activePi.key, piPreviewOpt),
    [activePi.key, piPreviewOpt],
  );

  const renderAttrChip = (key: AttrKey) => {
    const label = ATTRIBUTE_BY_KEY[key]?.name ?? key;
    if (!onJumpToAttribute) {
      return (
        <span key={key} className="attr-chip attr-chip--key">
          {label}
        </span>
      );
    }
    return (
      <Button
        key={key}
        className="attr-chip attr-chip--key"
        style={{ cursor: 'pointer' }}
        onClick={() => onJumpToAttribute(key)}
        title={`Inspect ${label} in Attributes Guide`}
      >
        {label}
      </Button>
    );
  };

  return (
    <div className="page-container">
      <header className="section-header">
        <div>
          <h1 className="section-title">Instructions</h1>
          <p className="section-subtitle">
            Interactive pitch previews for all 27 Team Instructions and 24 Player Instructions.
          </p>
        </div>
      </header>

      <div className="master-detail">
        {/* Left List Pane */}
        <aside className="list-pane" aria-label="Instructions directory">
          <div className="list-pane-header">
            <SegmentedControl
              aria-label="Instruction category"
              value={mode}
              onValueChange={(next) => {
                if (next === 'ti-ip' || next === 'ti-oop' || next === 'pi') {
                  setMode(next);
                  if (next === 'ti-ip' || next === 'ti-oop') {
                    const phase = next === 'ti-oop' ? 'oop' : 'ip';
                    if (TI_BY_KEY[selectedTiKey]?.phase !== phase) {
                      const first = TEAM_INSTRUCTIONS.find((t) => t.phase === phase);
                      if (first) {
                        setSelectedTiKey(first.key);
                        setTiOptIdx(first.defaultIndex);
                      }
                    }
                  }
                }
              }}
            >
              <SegmentedControlIndicator />
              <SegmentedControlItem value="ti-ip">Team IP</SegmentedControlItem>
              <SegmentedControlItem value="ti-oop">Team OOP</SegmentedControlItem>
              <SegmentedControlItem value="pi">Player</SegmentedControlItem>
            </SegmentedControl>

            <InputGroup>
              <Input
                type="search"
                aria-label="Filter instructions"
                placeholder={
                  mode === 'pi' ? 'Filter player instructions…' : 'Filter team instructions…'
                }
                value={search}
                onValueChange={setSearch}
              />
              <InputClear aria-label="Clear filter">×</InputClear>
            </InputGroup>
          </div>

          <div className="list-pane-scroll">
            {mode !== 'pi' ? (
              groupedTIs.length === 0 ? (
                <div className="empty-state">No matching team instructions.</div>
              ) : (
                groupedTIs.map((group) => (
                  <div key={group.area} className="stack-sm" style={{ gap: 2, marginBottom: 8 }}>
                    <span
                      className="text-xs text-muted"
                      style={{
                        padding: '6px 10px 2px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {group.area}
                    </span>
                    {group.items.map((ti) => {
                      const isSelected = ti.key === activeTi.key;
                      return (
                        <button
                          key={ti.key}
                          type="button"
                          className="list-row"
                          data-selected={isSelected ? '' : undefined}
                          aria-current={isSelected ? 'true' : undefined}
                          onClick={() => selectTi(ti)}
                        >
                          <span style={{ fontWeight: isSelected ? 650 : 500 }}>{ti.name}</span>
                          <span className="pill pill--muted tabular-nums">
                            {ti.options.length} opts
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )
            ) : groupedPIs.length === 0 ? (
              <div className="empty-state">No matching player instructions.</div>
            ) : (
              groupedPIs.map((group) => (
                <div key={group.family} className="stack-sm" style={{ gap: 2, marginBottom: 8 }}>
                  <span
                    className="text-xs text-muted"
                    style={{
                      padding: '6px 10px 2px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {group.family}
                  </span>
                  {group.items.map((pi) => {
                    const isSelected = pi.key === activePi.key;
                    return (
                      <button
                        key={pi.key}
                        type="button"
                        className="list-row"
                        data-selected={isSelected ? '' : undefined}
                        aria-current={isSelected ? 'true' : undefined}
                        onClick={() => selectPi(pi.key)}
                      >
                        <span style={{ fontWeight: isSelected ? 650 : 500 }}>{pi.name}</span>
                        <span className={`pill ${pi.fm27 ? 'pill--fm27' : `pill--${pi.phase}`}`}>
                          {pi.fm27 ? 'FM27' : pi.phase.toUpperCase()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Right Detail Pane */}
        <section className="detail-pane" aria-label="Instruction preview and guide">
          {mode !== 'pi' ? (
            <>
              <div className="card">
                <div className="card-header">
                  <div className="stack-sm" style={{ gap: 6 }}>
                    <div className="row-wrap">
                      <h2 style={{ fontSize: '1.25rem' }}>{activeTi.name}</h2>
                      <span className={`pill pill--${activeTi.phase}`}>
                        {activeTi.phase === 'ip' ? 'In Possession' : 'Out of Possession'}
                      </span>
                      <span className="pill">{activeTi.area}</span>
                      <span className="pill pill--muted tabular-nums">
                        Complexity +{activeTi.complexity}
                      </span>
                    </div>
                    <p className="text-sm text-muted">{activeTi.description}</p>
                  </div>

                  {onOpenInTactics && (
                    <Button
                      className="btn btn--primary btn--sm"
                      onClick={() => onOpenInTactics({ ti: [activeTi.key, safeOptIdx] })}
                    >
                      Try in Tactics Board
                    </Button>
                  )}
                </div>

                {/* Live option selector right above the SVG pitch */}
                <div className="row-wrap" role="group" aria-label={`${activeTi.name} options`}>
                  {activeTi.options.map((optLabel, idx) => {
                    const isActive = idx === safeOptIdx;
                    return (
                      <Button
                        key={optLabel}
                        className={`btn btn--sm ${isActive ? 'btn--primary' : ''}`}
                        aria-pressed={isActive}
                        onClick={() => setTiOptIdx(idx)}
                      >
                        {optLabel}
                      </Button>
                    );
                  })}
                </div>

                <PitchSvg
                  diagram={tiDiagram}
                  ariaLabel={`${activeTi.name}: ${activeTi.options[safeOptIdx]}`}
                />

                <div className="card--subtle">
                  <div className="row-between" style={{ marginBottom: 4 }}>
                    <strong className="text-sm">{activeTi.options[safeOptIdx]}</strong>
                    {safeOptIdx === activeTi.defaultIndex && (
                      <span className="pill pill--muted">Default</span>
                    )}
                  </div>
                  <p className="text-sm">
                    {activeTi.optionNotes[safeOptIdx] ?? activeTi.description}
                  </p>
                </div>
              </div>

              <div className="card">
                <div className="two-col">
                  <div className="diag-item diag-item--good">
                    <strong className="text-xs" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Strength
                    </strong>
                    <span>{activeTi.pro}</span>
                  </div>
                  <div className="diag-item diag-item--warn">
                    <strong className="text-xs" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Trade-Off
                    </strong>
                    <span>{activeTi.con}</span>
                  </div>
                </div>

                {(activeTi.need.low?.length || activeTi.need.high?.length) && (
                  <>
                    <div className="divider" />
                    <div className="stack">
                      {activeTi.need.low && activeTi.need.low.length > 0 && (
                        <div className="stack-sm">
                          <span className="text-xs text-muted">
                            Key Attributes for {activeTi.options[0]}
                          </span>
                          <div className="row-wrap">
                            {activeTi.need.low.map((k) => renderAttrChip(k))}
                          </div>
                        </div>
                      )}
                      {activeTi.need.high && activeTi.need.high.length > 0 && (
                        <div className="stack-sm">
                          <span className="text-xs text-muted">
                            Key Attributes for{' '}
                            {activeTi.options[activeTi.options.length - 1]}
                          </span>
                          <div className="row-wrap">
                            {activeTi.need.high.map((k) => renderAttrChip(k))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <p className="text-xs text-muted">{activeTi.note}</p>
              </div>
            </>
          ) : (
            <>
              <div className="card">
                <div className="card-header">
                  <div className="stack-sm" style={{ gap: 6 }}>
                    <div className="row-wrap">
                      <h2 style={{ fontSize: '1.25rem' }}>{activePi.name}</h2>
                      <span className={`pill pill--${activePi.phase}`}>
                        {activePi.phase === 'ip' ? 'In Possession' : 'Out of Possession'}
                      </span>
                      <span className="pill">{activePi.family}</span>
                      {activePi.fm27 && <span className="pill pill--fm27">FM27 New</span>}
                    </div>
                    <p className="text-sm text-muted">{activePi.description}</p>
                  </div>

                  {onOpenInTactics && (
                    <Button
                      className="btn btn--primary btn--sm"
                      onClick={() => onOpenInTactics({ pi: activePi.key })}
                    >
                      Try in Tactics Board
                    </Button>
                  )}
                </div>

                {/* Multi-option PI family switcher directly above the pitch */}
                {piOptionFamily && (
                  <div className="stack-sm" style={{ gap: 6 }}>
                    <span className="text-xs text-muted">{piOptionFamily.label}</span>
                    <div className="row-wrap" role="group" aria-label={piOptionFamily.label}>
                      {piOptionFamily.options.map((opt) => {
                        const isActive = piPreviewOpt
                          ? opt.diagramOption === piPreviewOpt
                          : opt.piKey === activePi.key;
                        return (
                          <Button
                            key={opt.id}
                            className={`btn btn--sm ${isActive ? 'btn--primary' : ''}`}
                            aria-pressed={isActive}
                            onClick={() => {
                              if (opt.piKey) {
                                setSelectedPiKey(opt.piKey);
                                setPiPreviewOpt(undefined);
                              } else if (opt.diagramOption) {
                                setPiPreviewOpt(opt.diagramOption);
                              }
                            }}
                          >
                            {opt.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <PitchSvg diagram={piDiagram} ariaLabel={`${piDiagram.title} diagram`} />

                <div className="card--subtle">
                  <strong className="text-sm" style={{ display: 'block', marginBottom: 4 }}>
                    {piDiagram.title}
                  </strong>
                  <p className="text-sm">{piPreviewOpt === 'standard' ? piDiagram.subtitle : activePi.tip}</p>
                </div>
              </div>

              <div className="card">
                <div className="stack">
                  <div>
                    <h3 style={{ marginBottom: 8 }}>Valid Positions</h3>
                    <div className="row-wrap">
                      {activePi.allowedGroups.map((g) => (
                        <span key={g} className="pill">
                          {GROUP_LABELS[g]}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="divider" />

                  <div>
                    <h3 style={{ marginBottom: 8 }}>Required Attributes</h3>
                    <div className="row-wrap">
                      {activePi.need.map((k) => renderAttrChip(k))}
                    </div>
                  </div>

                  {activePi.incompatibleWith.length > 0 && (
                    <>
                      <div className="divider" />
                      <div>
                        <h3 style={{ marginBottom: 8 }}>Mutually Exclusive With</h3>
                        <div className="row-wrap">
                          {activePi.incompatibleWith.map((otherKey) => {
                            const other = PI_BY_KEY[otherKey];
                            if (!other) return null;
                            return (
                              <Button
                                key={otherKey}
                                className="btn btn--sm"
                                onClick={() => selectPi(otherKey)}
                                title={`Switch to ${other.name}`}
                              >
                                {other.name}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  <p className="text-xs text-muted">{activePi.note}</p>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
