import { useEffect, useMemo, useState } from 'react';
import { Button } from '@ui-sdk/react/button';
import { Input, InputClear, InputGroup } from '@ui-sdk/react/input';
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from '@ui-sdk/react/segmented-control';
import type { GuideTabId } from '../components/SearchModal';
import {
  ATTR_CATEGORIES,
  ATTRIBUTE_BY_KEY,
  ATTRIBUTES,
  CONCEPTS,
  getSources,
  IN_MATCH_GUIDE,
  MENTALITIES,
  OPPONENT_GUIDES,
  OPPOSITION_INSTRUCTIONS,
  PI_BY_KEY,
  PLAYER_TRAITS,
  PRESET_BY_ID,
  PUBLIC_SOURCES,
  ROLE_BY_ID,
  ROLES,
  SET_PIECES,
  TI_BY_KEY,
  TROUBLESHOOTING,
  type AttrCategory,
  type AttrKey,
  type PIKey,
  type RoleDef,
  type SetPieceCategoryId,
  type SourceCategory,
  type TIKey,
  type TraitCategory,
  type TroubleshootingCategory,
} from '../data';

export interface GuidesViewProps {
  initialTab?: GuideTabId;
  initialItemId?: string | null;
  onJumpToRole?: (roleId: string) => void;
  onJumpToInstruction?: (kind: 'ti' | 'pi', key: string) => void;
  onLoadPresetInTactics?: (presetId: string) => void;
}

interface GuideTopicItem {
  id: GuideTabId;
  label: string;
  meta: string;
}

const GUIDE_TOPICS: readonly GuideTopicItem[] = [
  { id: 'concepts', label: 'Core Concepts', meta: `${CONCEPTS.length} fundamentals` },
  { id: 'attributes', label: 'Attributes', meta: `${ATTRIBUTES.length} stats` },
  {
    id: 'oi',
    label: 'Opposition Instructions',
    meta: `${OPPOSITION_INSTRUCTIONS.actions.length} actions`,
  },
  { id: 'opponents', label: 'Counter-Tactics', meta: `${OPPONENT_GUIDES.length} shapes` },
  { id: 'set-pieces', label: 'Set Pieces', meta: '12 routines' },
  { id: 'traits', label: 'Player Traits', meta: `${PLAYER_TRAITS.length} PPMs` },
  { id: 'troubleshooting', label: 'Troubleshooting', meta: `${TROUBLESHOOTING.length} fixes` },
  { id: 'in-match', label: 'In-Match & Mentalities', meta: 'Ladder · Tweaks · Shouts' },
  { id: 'sources', label: 'Sources & Model', meta: `${PUBLIC_SOURCES.length} verified` },
];

const TRAIT_CATEGORIES: readonly TraitCategory[] = [
  'Movement',
  'Passing & Tempo',
  'Dribbling & Shooting',
  'Defending',
];

const TROUBLESHOOTING_CATEGORIES: readonly TroubleshootingCategory[] = [
  'Defence & Transitions',
  'Attack & Chance Creation',
  'Build-Up & Possession',
  'Fitness & Tactical Decay',
];

const SOURCE_CATEGORY_LABELS: Record<SourceCategory, string> = {
  official: 'Official SI',
  guide: 'Guide',
  'engine-test': 'Engine Test',
  forum: 'Forum',
};

function formatShift(v: number): string {
  if (v === 0) return '0';
  const steps = Math.round(v * 3.33);
  if (steps > 0) return `+${steps}`;
  return `${steps}`;
}

export function GuidesView({
  initialTab,
  initialItemId,
  onJumpToRole,
  onJumpToInstruction,
  onLoadPresetInTactics,
}: GuidesViewProps) {
  const [activeTab, setActiveTab] = useState<GuideTabId>(initialTab ?? 'concepts');
  const [focusedItemId, setFocusedItemId] = useState<string | null>(initialItemId ?? null);

  // Per-topic filters
  const [attrCategory, setAttrCategory] = useState<'All' | AttrCategory>('All');
  const [attrSearch, setAttrSearch] = useState('');
  const [meOnly, setMeOnly] = useState(false);

  const [traitCategory, setTraitCategory] = useState<'All' | TraitCategory>('All');
  const [traitSearch, setTraitSearch] = useState('');

  const [setPieceCat, setSetPieceCat] = useState<'all' | SetPieceCategoryId>('all');
  const [fixCategory, setFixCategory] = useState<'All' | TroubleshootingCategory>('All');
  const [sourceFilter, setSourceFilter] = useState<'all' | SourceCategory>('all');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!initialItemId) return;
    setFocusedItemId(initialItemId);
    // Clear filters so target item is guaranteed visible
    setAttrCategory('All');
    setAttrSearch('');
    setMeOnly(false);
    setTraitCategory('All');
    setTraitSearch('');
    setSetPieceCat('all');
    setFixCategory('All');
  }, [initialItemId, initialTab]);

  useEffect(() => {
    if (!focusedItemId) return;
    const id = `guide-item-${focusedItemId}`;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 40);
    return () => window.clearTimeout(timer);
  }, [focusedItemId, activeTab]);

  const jumpToAttributeHere = (attrKey: AttrKey) => {
    setActiveTab('attributes');
    setAttrCategory('All');
    setAttrSearch('');
    setMeOnly(false);
    setFocusedItemId(attrKey);
  };

  // Precompute roles per attribute for the Attributes guide
  const rolesByAttr = useMemo(() => {
    const map = new Map<AttrKey, { keyRoles: RoleDef[]; prefRoles: RoleDef[] }>();
    for (const a of ATTRIBUTES) {
      map.set(a.key, { keyRoles: [], prefRoles: [] });
    }
    for (const role of ROLES) {
      for (const k of role.key) map.get(k)?.keyRoles.push(role);
      for (const p of role.pref) map.get(p)?.prefRoles.push(role);
    }
    return map;
  }, []);

  const filteredAttributes = useMemo(() => {
    const q = attrSearch.trim().toLowerCase();
    return ATTRIBUTES.filter((a) => {
      if (attrCategory !== 'All' && a.category !== attrCategory) return false;
      if (meOnly && !a.meImpact) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.key.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.watchOut.toLowerCase().includes(q)
      );
    });
  }, [attrCategory, attrSearch, meOnly]);

  const filteredTraits = useMemo(() => {
    const q = traitSearch.trim().toLowerCase();
    return PLAYER_TRAITS.filter((t) => {
      if (traitCategory !== 'All' && t.category !== traitCategory) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.effect.toLowerCase().includes(q) ||
        t.conflictNote.toLowerCase().includes(q)
      );
    });
  }, [traitCategory, traitSearch]);

  const filteredSetPieces = useMemo(
    () =>
      setPieceCat === 'all'
        ? SET_PIECES.categories
        : SET_PIECES.categories.filter((c) => c.id === setPieceCat),
    [setPieceCat],
  );

  const filteredFixes = useMemo(
    () =>
      fixCategory === 'All'
        ? TROUBLESHOOTING
        : TROUBLESHOOTING.filter((t) => t.category === fixCategory),
    [fixCategory],
  );

  const filteredSources = useMemo(
    () =>
      sourceFilter === 'all'
        ? PUBLIC_SOURCES
        : PUBLIC_SOURCES.filter((s) => s.category === sourceFilter),
    [sourceFilter],
  );

  const highlightStyle = (itemId: string) =>
    focusedItemId === itemId
      ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 1px var(--accent-border)' }
      : undefined;

  const renderRoleButton = (roleId: string) => {
    const role = ROLE_BY_ID[roleId];
    if (!role) return null;
    if (!onJumpToRole) {
      return (
        <span key={roleId} className="meta-line">
          <span className={`phase-tag phase-tag--${role.phase}`}>
            {role.name} ({role.abbr})
          </span>
        </span>
      );
    }
    return (
      <Button
        key={roleId}
        className="interactive-chip"
        onClick={() => onJumpToRole(role.id)}
      >
        <span className={`phase-tag phase-tag--${role.phase}`}>{role.phase.toUpperCase()}</span>
        <span>
          {role.name} ({role.abbr})
        </span>
      </Button>
    );
  };

  const renderAttrChip = (key: AttrKey, variant: 'key' | 'pref' = 'pref') => {
    const label = ATTRIBUTE_BY_KEY[key]?.name ?? key;
    return (
      <Button
        key={key}
        className={`interactive-chip interactive-chip--${variant}`}
        onClick={() => jumpToAttributeHere(key)}
      >
        {label}
      </Button>
    );
  };

  return (
    <div className="page-container">
      <header className="section-header">
        <div>
          <h1 className="section-title">Guides &amp; Reference</h1>
          <p className="section-subtitle">
            Plain-English FM26/FM27 tactical playbook: concepts, attributes, counters, set pieces,
            troubleshooting, and sources.
          </p>
        </div>
      </header>

      <div className="master-detail">
        {/* Left Topic Navigation */}
        <aside className="list-pane" aria-label="Guide topics">
          <div className="list-pane-header">
            <span className="list-group-label" style={{ padding: 0 }}>
              Reference topics
            </span>
          </div>
          <div className="list-pane-scroll">
            {GUIDE_TOPICS.map((topic) => {
              const isSelected = topic.id === activeTab;
              return (
                <button
                  key={topic.id}
                  type="button"
                  className="list-row"
                  data-selected={isSelected ? '' : undefined}
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() => {
                    setActiveTab(topic.id);
                    setFocusedItemId(null);
                  }}
                >
                  <div className="stack-sm" style={{ gap: 2 }}>
                    <span style={{ fontWeight: isSelected ? 600 : 500 }}>{topic.label}</span>
                    <span className="text-sm text-muted">{topic.meta}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Content Pane */}
        <section className="detail-pane" aria-label="Guide content">
          {/* ── 1. CORE CONCEPTS ─────────────────────────────────────────── */}
          {activeTab === 'concepts' && (
            <>
              <div className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Core FM26 / FM27 Tactical Concepts</h2>
                    <p className="text-body text-muted prose">
                      The ten structural principles behind modern dual-phase Football Manager tactics.
                    </p>
                  </div>
                  <Button
                    className="btn btn--sm"
                    onClick={() => setActiveTab('in-match')}
                  >
                    View Mentality Ladder →
                  </Button>
                </div>
              </div>

              {CONCEPTS.map((c) => {
                const srcs = getSources(c.sourceIds);
                return (
                  <article
                    key={c.key}
                    id={`guide-item-${c.key}`}
                    className="card"
                    style={highlightStyle(c.key)}
                  >
                    <div className="card-header">
                      <h3 style={{ fontSize: 'var(--text-heading)', fontFamily: 'var(--font-display)' }}>
                        {c.name}
                      </h3>
                      {c.name.includes('FM27') && (
                        <span className="text-sm" style={{ color: 'var(--warn)', fontWeight: 600 }}>
                          FM27
                        </span>
                      )}
                    </div>
                    <p className="text-body prose" style={{ fontWeight: 500 }}>
                      {c.summary}
                    </p>
                    <p className="text-body text-muted prose">{c.detail}</p>
                    <div className="diag-item diag-item--tip">
                      <strong className="text-sm">Rule of thumb</strong>
                      <span className="prose">{c.ruleOfThumb}</span>
                    </div>
                    {srcs.length > 0 && (
                      <p className="text-sm text-muted">
                        Sources: {srcs.map((s) => s.title).join(' · ')}
                      </p>
                    )}
                  </article>
                );
              })}
            </>
          )}

          {/* ── 2. ATTRIBUTES (47) ───────────────────────────────────────── */}
          {activeTab === 'attributes' && (
            <>
              <div className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Attributes Guide ({ATTRIBUTES.length})</h2>
                    <p className="text-body text-muted prose">
                      What every attribute governs, IP vs OOP distinctions, FM27 ME impact, and the
                      roles that rely on it.
                    </p>
                  </div>
                  <Button
                    className={`btn btn--sm ${meOnly ? 'btn--primary' : ''}`}
                    aria-pressed={meOnly}
                    onClick={() => setMeOnly((v) => !v)}
                  >
                    FM27 ME Drivers Only
                  </Button>
                </div>

                <div className="row-wrap">
                  <SegmentedControl
                    aria-label="Filter attributes by category"
                    value={attrCategory}
                    onValueChange={(next) => {
                      if (next) setAttrCategory(next as 'All' | AttrCategory);
                    }}
                  >
                    <SegmentedControlIndicator />
                    <SegmentedControlItem value="All">All</SegmentedControlItem>
                    {ATTR_CATEGORIES.map((cat) => (
                      <SegmentedControlItem key={cat} value={cat}>
                        {cat}
                      </SegmentedControlItem>
                    ))}
                  </SegmentedControl>
                </div>

                <InputGroup>
                  <Input
                    type="search"
                    aria-label="Search attributes"
                    placeholder="Search attributes (e.g. Off the Ball, Pace, Composure, Reflexes)…"
                    value={attrSearch}
                    onValueChange={setAttrSearch}
                  />
                  <InputClear aria-label="Clear attribute search">×</InputClear>
                </InputGroup>
              </div>

              {filteredAttributes.length === 0 ? (
                <div className="card empty-state">No attributes match your filter.</div>
              ) : (
                filteredAttributes.map((attr) => {
                  const usage = rolesByAttr.get(attr.key);
                  const keyRoles = usage?.keyRoles ?? [];
                  const prefRoles = usage?.prefRoles ?? [];
                  return (
                    <article
                      key={attr.key}
                      id={`guide-item-${attr.key}`}
                      className="card"
                      style={highlightStyle(attr.key)}
                    >
                      <div className="card-header">
                        <div className="stack-sm" style={{ gap: 2 }}>
                          <h3 style={{ fontSize: 'var(--text-heading)', fontFamily: 'var(--font-display)' }}>
                            {attr.name}
                          </h3>
                          <div className="meta-line">
                            <span>{attr.category}</span>
                            {attr.meImpact && (
                              <>
                                <span>·</span>
                                <span
                                  className="tabular-nums"
                                  style={{ color: 'var(--warn)', fontWeight: 600 }}
                                >
                                  FM27 ME ×{attr.meImpact.weight.toFixed(2)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-muted tabular-nums">
                          Key for {keyRoles.length} · Pref for {prefRoles.length}
                        </span>
                      </div>

                      <p className="text-body prose" style={{ fontWeight: 500 }}>
                        {attr.summary}
                      </p>
                      <p className="text-body text-muted prose">{attr.whatItGoverns}</p>

                      <div className="diag-item diag-item--warn">
                        <strong className="text-sm">Watch out</strong>
                        <span className="prose">{attr.watchOut}</span>
                      </div>

                      {attr.meImpact && (
                        <p className="text-sm text-muted prose">
                          FM27 ME testing: {attr.meImpact.note}
                        </p>
                      )}

                      <div className="row-wrap" style={{ gap: 6 }}>
                        <span className="text-sm text-muted">Pairs with:</span>
                        {attr.pairsWith.map((pairKey) => renderAttrChip(pairKey, 'pref'))}
                      </div>

                      {keyRoles.length > 0 && (
                        <div className="stack-sm">
                          <span className="text-sm text-muted">Key for roles:</span>
                          <div className="row-wrap" style={{ gap: 6 }}>
                            {keyRoles.slice(0, 12).map((r) => renderRoleButton(r.id))}
                            {keyRoles.length > 12 && (
                              <span className="text-sm text-muted">
                                +{keyRoles.length - 12} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </>
          )}

          {/* ── 3. OPPOSITION INSTRUCTIONS ───────────────────────────────── */}
          {activeTab === 'oi' && (
            <>
              <div className="card">
                <h2 className="card-title">Opposition Instructions (OI) Principles</h2>
                <ul className="stack-sm prose" style={{ margin: 0, paddingLeft: 18 }}>
                  {OPPOSITION_INSTRUCTIONS.principles.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>

              {OPPOSITION_INSTRUCTIONS.actions.map((action) => (
                <article
                  key={action.key}
                  id={`guide-item-${action.key}`}
                  className="card"
                  style={highlightStyle(action.key)}
                >
                  <div className="card-header">
                    <h3 style={{ fontSize: 'var(--text-heading)', fontFamily: 'var(--font-display)' }}>
                      {action.name}
                    </h3>
                    <span className="text-sm text-muted">{action.options.join(' / ')}</span>
                  </div>
                  <p className="text-body text-muted prose">{action.summary}</p>
                  <div className="two-col">
                    <div className="diag-item diag-item--good">
                      <strong className="text-sm">When to use</strong>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                        {action.whenToUse.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="diag-item diag-item--error">
                      <strong className="text-sm">Traps to avoid</strong>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                        {action.whenNeverToUse.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="row-wrap" style={{ gap: 6 }}>
                    {action.targetAttributes.targetWhenLow && (
                      <>
                        <span className="text-sm text-muted">Target when low:</span>
                        {action.targetAttributes.targetWhenLow.map((k) =>
                          renderAttrChip(k, 'key'),
                        )}
                      </>
                    )}
                    {action.targetAttributes.avoidWhenHigh && (
                      <>
                        <span className="text-sm text-muted" style={{ marginLeft: 8 }}>
                          Avoid when high:
                        </span>
                        {action.targetAttributes.avoidWhenHigh.map((k) =>
                          renderAttrChip(k, 'pref'),
                        )}
                      </>
                    )}
                  </div>
                </article>
              ))}

              <div className="card">
                <h2 className="card-title">7 Opponent Archetypes: Quick OI Playbook</h2>
                <div className="divided-list">
                  {OPPOSITION_INSTRUCTIONS.archetypes.map((arch) => (
                    <div key={arch.id} className="stack-sm">
                      <div className="row-between row-wrap">
                        <strong>{arch.archetype}</strong>
                        <div className="row-wrap" style={{ gap: 6 }}>
                          {arch.exampleRoles.map((rId) => renderRoleButton(rId))}
                        </div>
                      </div>
                      <div className="meta-line">
                        <span>Press: {arch.recommended.triggerPress}</span>
                        <span>·</span>
                        <span>Mark: {arch.recommended.tightMarking}</span>
                        <span>·</span>
                        <span>Tackle: {arch.recommended.tackling}</span>
                        <span>·</span>
                        <span>Foot: {arch.recommended.showOntoFoot}</span>
                      </div>
                      <p className="text-body prose">{arch.why}</p>
                      <p className="text-sm" style={{ color: 'var(--warn)' }}>
                        Trap: {arch.trapToAvoid}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── 4. COUNTER-TACTICS (6 OPPONENT SHAPES) ───────────────────── */}
          {activeTab === 'opponents' && (
            <>
              <div className="card">
                <h2 className="card-title">Counter-Tactics by Opponent Formation</h2>
                <p className="text-body text-muted prose">
                  Structural counters, danger signs, and selective Opposition Instructions against
                  the 6 most common opposition shapes.
                </p>
              </div>

              {OPPONENT_GUIDES.map((opp) => (
                <article
                  key={opp.key}
                  id={`guide-item-${opp.key}`}
                  className="card"
                  style={highlightStyle(opp.key)}
                >
                  <div className="card-header">
                    <h3 style={{ fontSize: 'var(--text-heading)', fontFamily: 'var(--font-display)' }}>
                      Countering {opp.formation}
                    </h3>
                    <span className="phase-tag phase-tag--oop">Opponent shape</span>
                  </div>
                  <div className="diag-item diag-item--good">
                    <strong className="text-sm">Structural counter</strong>
                    <span className="prose">{opp.structuralCounter}</span>
                  </div>
                  <div className="diag-item diag-item--warn">
                    <strong className="text-sm">Watch for</strong>
                    <span className="prose">{opp.watchFor}</span>
                  </div>
                  <div className="stack-sm">
                    <span className="text-sm text-muted" style={{ fontWeight: 600 }}>
                      OI tips
                    </span>
                    <ul className="stack-sm prose" style={{ margin: 0, paddingLeft: 18 }}>
                      {opp.oiTips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </>
          )}

          {/* ── 5. SET PIECES (4 CATEGORIES, 12 ROUTINES) ────────────────── */}
          {activeTab === 'set-pieces' && (
            <>
              <div className="card">
                <h2 className="card-title">Set Pieces Playbook</h2>
                <p className="text-body text-muted prose">{SET_PIECES.overview}</p>
                <SegmentedControl
                  aria-label="Filter set piece category"
                  value={setPieceCat}
                  onValueChange={(next) => {
                    if (next) setSetPieceCat(next as 'all' | SetPieceCategoryId);
                  }}
                >
                  <SegmentedControlIndicator />
                  <SegmentedControlItem value="all">All</SegmentedControlItem>
                  {SET_PIECES.categories.map((cat) => (
                    <SegmentedControlItem key={cat.id} value={cat.id}>
                      {cat.title.split(' (')[0]}
                    </SegmentedControlItem>
                  ))}
                </SegmentedControl>
              </div>

              {filteredSetPieces.map((cat) => (
                <div key={cat.id} className="stack">
                  <div className="row-between">
                    <h2>{cat.title}</h2>
                    <span className="text-sm text-muted">{cat.routines.length} routines</span>
                  </div>
                  <p className="text-body text-muted prose">{cat.summary}</p>
                  {cat.routines.map((routine) => (
                    <article
                      key={routine.id}
                      id={`guide-item-${routine.id}`}
                      className="card"
                      style={highlightStyle(routine.id)}
                    >
                      <h3 style={{ fontSize: 'var(--text-heading)', fontFamily: 'var(--font-display)' }}>
                        {routine.name}
                      </h3>
                      <p className="text-body prose">
                        <strong>Delivery:</strong> {routine.delivery}
                      </p>
                      <p className="text-body text-muted prose">{routine.setup}</p>

                      <div className="two-col">
                        <div className="diag-item diag-item--good">
                          <strong className="text-sm">Best when</strong>
                          <span className="prose">{routine.bestWhen}</span>
                        </div>
                        <div className="diag-item diag-item--tip">
                          <strong className="text-sm">Rest-defence</strong>
                          <span className="prose">{routine.restDefence}</span>
                        </div>
                      </div>

                      <div className="stack-sm">
                        <span className="text-sm text-muted" style={{ fontWeight: 600 }}>
                          Key assignments &amp; target attributes
                        </span>
                        <div className="divided-list">
                          {routine.keyRoles.map((kr) => (
                            <div key={kr.assignment} className="stack-sm">
                              <div className="row-between row-wrap">
                                <strong className="text-body">{kr.assignment}</strong>
                                <div className="row-wrap" style={{ gap: 6 }}>
                                  {kr.targetAttrs.map((a) => renderAttrChip(a, 'key'))}
                                </div>
                              </div>
                              <p className="text-sm text-muted prose">{kr.note}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="stack-sm">
                        <span className="text-sm text-muted" style={{ fontWeight: 600 }}>
                          Pitfalls
                        </span>
                        <ul className="stack-sm prose text-muted" style={{ margin: 0, paddingLeft: 18 }}>
                          {routine.pitfalls.map((pit) => (
                            <li key={pit}>{pit}</li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  ))}
                </div>
              ))}
            </>
          )}

          {/* ── 6. PLAYER TRAITS (18 PPMs) ───────────────────────────────── */}
          {activeTab === 'traits' && (
            <>
              <div className="card">
                <h2 className="card-title">Player Traits / PPMs ({PLAYER_TRAITS.length})</h2>
                <p className="text-body text-muted prose">
                  Player traits can reinforce a role or silently override your Team and Player
                  Instructions.
                </p>
                <div className="row-wrap">
                  <SegmentedControl
                    aria-label="Filter traits by category"
                    value={traitCategory}
                    onValueChange={(next) => {
                      if (next) setTraitCategory(next as 'All' | TraitCategory);
                    }}
                  >
                    <SegmentedControlIndicator />
                    <SegmentedControlItem value="All">All</SegmentedControlItem>
                    {TRAIT_CATEGORIES.map((cat) => (
                      <SegmentedControlItem key={cat} value={cat}>
                        {cat}
                      </SegmentedControlItem>
                    ))}
                  </SegmentedControl>
                </div>
                <InputGroup>
                  <Input
                    type="search"
                    aria-label="Search player traits"
                    placeholder="Filter traits (e.g. Killer Balls, Cuts Inside, Arrives Late)…"
                    value={traitSearch}
                    onValueChange={setTraitSearch}
                  />
                  <InputClear aria-label="Clear trait search">×</InputClear>
                </InputGroup>
              </div>

              {filteredTraits.length === 0 ? (
                <div className="card empty-state">No player traits match your filter.</div>
              ) : (
                filteredTraits.map((trait) => (
                  <article
                    key={trait.id}
                    id={`guide-item-${trait.id}`}
                    className="card"
                    style={highlightStyle(trait.id)}
                  >
                    <div className="card-header">
                      <h3 style={{ fontSize: 'var(--text-heading)', fontFamily: 'var(--font-display)' }}>
                        {trait.name}
                      </h3>
                      <span className="text-sm text-muted">{trait.category}</span>
                    </div>
                    <p className="text-body prose">{trait.effect}</p>

                    <div className="diag-item diag-item--warn">
                      <strong className="text-sm">Conflict &amp; synergy note</strong>
                      <span className="prose">{trait.conflictNote}</span>
                    </div>

                    {(trait.bestRolesIP.length > 0 || trait.bestRolesOOP.length > 0) && (
                      <div className="row-wrap" style={{ gap: 6 }}>
                        <span className="text-sm text-muted">Best-fit roles:</span>
                        {trait.bestRolesIP.map((r) => renderRoleButton(r))}
                        {trait.bestRolesOOP.map((r) => renderRoleButton(r))}
                      </div>
                    )}

                    {(trait.conflictsWithTIs.length > 0 || trait.conflictsWithPIs.length > 0) && (
                      <div className="row-wrap" style={{ gap: 6 }}>
                        <span className="text-sm text-muted">Watch conflicts with:</span>
                        {trait.conflictsWithTIs.map((tiKey) => {
                          const ti = TI_BY_KEY[tiKey as TIKey];
                          if (!ti) return null;
                          return onJumpToInstruction ? (
                            <Button
                              key={tiKey}
                              className="interactive-chip interactive-chip--danger"
                              onClick={() => onJumpToInstruction('ti', tiKey)}
                            >
                              TI: {ti.name}
                            </Button>
                          ) : (
                            <span key={tiKey} className="text-sm" style={{ color: 'var(--danger)' }}>
                              TI: {ti.name}
                            </span>
                          );
                        })}
                        {trait.conflictsWithPIs.map((piKey) => {
                          const pi = PI_BY_KEY[piKey as PIKey];
                          if (!pi) return null;
                          return onJumpToInstruction ? (
                            <Button
                              key={piKey}
                              className="interactive-chip interactive-chip--danger"
                              onClick={() => onJumpToInstruction('pi', piKey)}
                            >
                              PI: {pi.name}
                            </Button>
                          ) : (
                            <span key={piKey} className="text-sm" style={{ color: 'var(--danger)' }}>
                              PI: {pi.name}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="row-wrap" style={{ gap: 6 }}>
                      <span className="text-sm text-muted">Moderated by:</span>
                      {trait.moderationAttrs.map((k) => renderAttrChip(k, 'pref'))}
                    </div>
                  </article>
                ))
              )}
            </>
          )}

          {/* ── 7. TROUBLESHOOTING (9 SYMPTOMS) ──────────────────────────── */}
          {activeTab === 'troubleshooting' && (
            <>
              <div className="card">
                <h2 className="card-title">Tactical Troubleshooting</h2>
                <p className="text-body text-muted prose">
                  Diagnose common match symptoms and fix them one variable at a time.
                </p>
                <div className="row-wrap">
                  <SegmentedControl
                    aria-label="Filter troubleshooting category"
                    value={fixCategory}
                    onValueChange={(next) => {
                      if (next) setFixCategory(next as 'All' | TroubleshootingCategory);
                    }}
                  >
                    <SegmentedControlIndicator />
                    <SegmentedControlItem value="All">All</SegmentedControlItem>
                    {TROUBLESHOOTING_CATEGORIES.map((cat) => (
                      <SegmentedControlItem key={cat} value={cat}>
                        {cat}
                      </SegmentedControlItem>
                    ))}
                  </SegmentedControl>
                </div>
              </div>

              {filteredFixes.map((item) => {
                const preset = item.presetId ? PRESET_BY_ID[item.presetId] : undefined;
                return (
                  <article
                    key={item.id}
                    id={`guide-item-${item.id}`}
                    className="card"
                    style={highlightStyle(item.id)}
                  >
                    <div className="card-header">
                      <div className="stack-sm" style={{ gap: 4 }}>
                        <div className="meta-line">
                          <span style={{ color: 'var(--warn)', fontWeight: 600 }}>
                            {item.category}
                          </span>
                        </div>
                        <h3 style={{ fontSize: 'var(--text-heading)', fontFamily: 'var(--font-display)' }}>
                          {item.symptom}
                        </h3>
                        <p className="text-body text-muted prose">{item.summary}</p>
                      </div>
                      {preset && onLoadPresetInTactics && (
                        <Button
                          className="btn btn--primary btn--sm"
                          onClick={() => onLoadPresetInTactics(preset.id)}
                        >
                          Load {preset.name} in Tactics Board
                        </Button>
                      )}
                    </div>

                    <div className="two-col">
                      <div className="diag-item diag-item--error">
                        <strong className="text-sm">Root causes</strong>
                        <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                          {item.rootCauses.map((rc) => (
                            <li key={rc}>{rc}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="diag-item diag-item--good">
                        <strong className="text-sm">1-variable fixes</strong>
                        <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                          {item.fixes.map((fx) => (
                            <li key={fx}>{fx}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="diag-item diag-item--tip">
                      <strong className="text-sm">Rule of thumb</strong>
                      <span className="prose">{item.ruleOfThumb}</span>
                    </div>

                    <div className="row-wrap" style={{ gap: 6 }}>
                      {item.relatedRoles.map((rId) => renderRoleButton(rId))}
                      {item.relatedTIs.map((tiKey) => {
                        const ti = TI_BY_KEY[tiKey as TIKey];
                        if (!ti) return null;
                        return onJumpToInstruction ? (
                          <Button
                            key={tiKey}
                            className="interactive-chip interactive-chip--pref"
                            onClick={() => onJumpToInstruction('ti', tiKey)}
                          >
                            TI: {ti.name}
                          </Button>
                        ) : (
                          <span key={tiKey} className="text-sm" style={{ color: 'var(--info)' }}>
                            TI: {ti.name}
                          </span>
                        );
                      })}
                      {item.relatedPIs.map((piKey) => {
                        const pi = PI_BY_KEY[piKey as PIKey];
                        if (!pi) return null;
                        return onJumpToInstruction ? (
                          <Button
                            key={piKey}
                            className="interactive-chip interactive-chip--warn"
                            onClick={() => onJumpToInstruction('pi', piKey)}
                          >
                            PI: {pi.name}
                          </Button>
                        ) : (
                          <span key={piKey} className="text-sm" style={{ color: 'var(--warn)' }}>
                            PI: {pi.name}
                          </span>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </>
          )}

          {/* ── 8. IN-MATCH & MENTALITIES ────────────────────────────────── */}
          {activeTab === 'in-match' && (
            <>
              {/* 7-Step Mentality Ladder */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">The 7-Step Mentality Ladder</h2>
                    <p className="text-body text-muted prose">
                      Mentality sets the global baseline for risk, tempo, directness, width, lines,
                      and pressing. Team Instructions stack relatively on top.
                    </p>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Mentality</th>
                        <th>Risk</th>
                        <th>Tempo</th>
                        <th>Width</th>
                        <th>Line</th>
                        <th>Press</th>
                        <th>When to use</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MENTALITIES.map((m) => (
                        <tr key={m.index}>
                          <td>
                            <strong>{m.name}</strong>
                          </td>
                          <td className="tabular-nums">{formatShift(m.shifts.risk)}</td>
                          <td className="tabular-nums">{formatShift(m.shifts.tempo)}</td>
                          <td className="tabular-nums">{formatShift(m.shifts.width)}</td>
                          <td className="tabular-nums">{formatShift(m.shifts.line)}</td>
                          <td className="tabular-nums">{formatShift(m.shifts.pressing)}</td>
                          <td className="text-sm text-muted">{m.whenToUse}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FM27 Tactical Tweaks */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">FM27 Tactical Tweaks</h2>
                  <span className="text-sm" style={{ color: 'var(--warn)', fontWeight: 600 }}>
                    New in FM27
                  </span>
                </div>
                <p className="text-body text-muted prose">{IN_MATCH_GUIDE.tweaksOverview}</p>
                <ul className="stack-sm prose" style={{ margin: 0, paddingLeft: 18 }}>
                  {IN_MATCH_GUIDE.tweaksVsMainTactic.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <div className="divided-list">
                  {IN_MATCH_GUIDE.tweaks.map((tw) => (
                    <div
                      key={tw.id}
                      id={`guide-item-${tw.id}`}
                      className="stack-sm"
                      style={highlightStyle(tw.id)}
                    >
                      <div className="row-between">
                        <strong>{tw.name}</strong>
                        <span className="text-sm text-muted">{tw.category}</span>
                      </div>
                      <p className="text-body prose">
                        <strong>When:</strong> {tw.whenToUse}
                      </p>
                      <p className="text-sm text-muted prose">
                        <strong>Adjusts:</strong> {tw.whatItAdjusts}
                      </p>
                      <p className="text-sm prose" style={{ color: 'var(--warn)' }}>
                        Caution: {tw.caution}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rebuilt FM27 Shouts */}
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Rebuilt FM27 Touchline Shouts</h2>
                  <span className="text-sm" style={{ color: 'var(--warn)', fontWeight: 600 }}>
                    Mood-based
                  </span>
                </div>
                <p className="text-body text-muted prose">{IN_MATCH_GUIDE.shoutsOverview}</p>
                <div className="grid-cards">
                  {IN_MATCH_GUIDE.shouts.map((sh) => (
                    <div
                      key={sh.id}
                      id={`guide-item-${sh.id}`}
                      className="inset-callout"
                      style={highlightStyle(sh.id)}
                    >
                      <strong>{sh.name}</strong>
                      <p className="text-sm">
                        <strong>Match state:</strong> {sh.bestMatchState}
                      </p>
                      <p className="text-sm text-muted">
                        <strong>Best mood/personality:</strong> {sh.bestMoodOrPersonality}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--danger)' }}>
                        <strong>Avoid:</strong> {sh.avoidWhen}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--accent)' }}>
                        <strong>Effect:</strong> {sh.expectedEffect}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Half-Time Checklist */}
              <div className="card">
                <h2 className="card-title">Half-Time Adjustment Checklist</h2>
                <ol className="stack-sm prose" style={{ margin: 0, paddingLeft: 20 }}>
                  {IN_MATCH_GUIDE.halfTimeChecklist.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            </>
          )}

          {/* ── 9. SOURCES & MODEL TRANSPARENCY ──────────────────────────── */}
          {activeTab === 'sources' && (
            <>
              <div className="card">
                <h2 className="card-title">Model Transparency &amp; Provenance</h2>
                <p className="text-body text-muted prose">
                  Tactical Bible clearly separates verified public Football Manager documentation
                  from deterministic tactical model estimates:
                </p>
                <div className="two-col">
                  <div className="diag-item diag-item--good">
                    <strong>Confirmed (conf)</strong>
                    <span className="text-body prose">
                      Role roster (77 IP &amp; OOP roles), FM27 Tactical Effectiveness pillars
                      (50/25/15/10), ~3-week tactical training decay, FM27 ME attribute testing
                      weights, and official feature reveals cite named public sources below.
                    </span>
                  </div>
                  <div className="diag-item diag-item--tip">
                    <strong>Estimated model (est)</strong>
                    <span className="text-body prose">
                      Pitch coordinates, 3×3 ball-zone shifts, 35-zone coverage scores, role
                      profile vectors, and diagnostic thresholds are transparent, deterministic
                      tactical heuristics, never hidden Sports Interactive Match Engine formulas.
                    </span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Verified Public Sources ({PUBLIC_SOURCES.length})</h2>
                  <SegmentedControl
                    aria-label="Filter sources by category"
                    value={sourceFilter}
                    onValueChange={(next) => {
                      if (next) setSourceFilter(next as 'all' | SourceCategory);
                    }}
                  >
                    <SegmentedControlIndicator />
                    <SegmentedControlItem value="all">All</SegmentedControlItem>
                    <SegmentedControlItem value="official">Official SI</SegmentedControlItem>
                    <SegmentedControlItem value="guide">Guides</SegmentedControlItem>
                    <SegmentedControlItem value="engine-test">Engine Tests</SegmentedControlItem>
                    <SegmentedControlItem value="forum">Forums</SegmentedControlItem>
                  </SegmentedControl>
                </div>

                <div className="divided-list">
                  {filteredSources.map((src) => (
                    <div key={src.id} className="stack-sm">
                      <div className="row-between row-wrap">
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontWeight: 600 }}
                        >
                          {src.title} ↗
                        </a>
                        <div className="meta-line">
                          <span>{src.publisher}</span>
                          <span>·</span>
                          <span
                            style={{
                              color:
                                src.category === 'official'
                                  ? 'var(--accent)'
                                  : src.category === 'engine-test'
                                    ? 'var(--warn)'
                                    : 'var(--muted)',
                              fontWeight: 600,
                            }}
                          >
                            {SOURCE_CATEGORY_LABELS[src.category]}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted prose">{src.scope}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
