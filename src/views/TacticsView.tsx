import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Button } from '@ui-sdk/react/button';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@ui-sdk/react/collapsible';
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@ui-sdk/react/dialog';
import { Field, FieldLabel } from '@ui-sdk/react/field';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from '@ui-sdk/react/menu';
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from '@ui-sdk/react/segmented-control';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectTrigger,
  SelectValue,
} from '@ui-sdk/react/select';
import { Switch, SwitchThumb } from '@ui-sdk/react/switch';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@ui-sdk/react/tabs';
import { PitchSvg } from '../components/PitchSvg';
import type { GuideTabId } from '../components/SearchModal';
import {
  FORMATIONS,
  GROUP_LABELS,
  MENTALITIES,
  OPPONENT_GUIDES,
  PI_BY_KEY,
  PLAYER_INSTRUCTIONS,
  ROLE_BY_ID,
  rolesForSlot,
  TACTICAL_PRESETS,
  TEAM_INSTRUCTIONS,
  TI_DEFAULTS,
  type FormationDef,
  type FormationSlot,
  type PIKey,
  type TIArea,
} from '../data';
import {
  analyzeTactic,
  buildTacticPitchDiagram,
  computeZoneCoverage,
  defaultTacticConfig,
  exportTacticJson,
  getFormation,
  parseTacticFile,
  resolveTacticPositions,
  serializeTacticToHash,
  type BallZone,
  type DiagnosticSeverity,
  type FmfImportResult,
  type TacticConfig,
  type ZoneCell,
  type ZoneRoleSwap,
} from '../engine';

export interface TacticsViewProps {
  config: TacticConfig;
  onChangeConfig: (next: TacticConfig) => void;
  onJumpToRole?: (roleId: string) => void;
  onJumpToInstruction?: (kind: 'ti' | 'pi', key: string) => void;
  onJumpToGuide?: (tab: GuideTabId) => void;
}

type BoardMode = 'shape' | 'zones' | 'coverage';
type PhaseSelection = 'ip' | 'oop' | 'combined';
type SideTab = 'setup' | 'player' | 'analysis';

const SETUP_TI_AREAS: readonly TIArea[] = [
  'Build-up',
  'Progression',
  'Final Third',
  'Out of Possession',
  'Transitions',
];

const SEVERITY_ORDER: Record<DiagnosticSeverity, number> = {
  error: 0,
  warn: 1,
  tip: 2,
  good: 3,
};

const THIRD_LABELS: Record<BallZone['third'], string> = {
  def: 'Defensive Third',
  mid: 'Middle Third',
  att: 'Final Third',
};

const LANE_LABELS: Record<BallZone['lane'], string> = {
  left: 'Left Lane',
  centre: 'Centre Lane',
  right: 'Right Lane',
};

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
      style={{ flexShrink: 0, opacity: 0.7 }}
    >
      <path d="M4.5 6.5L8 10l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M3.5 8.5L6.5 11.5L12.5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function findPairedSlot(
  slotCode: string,
  sourceForm: FormationDef,
  targetForm: FormationDef,
): FormationSlot | null {
  const exact = targetForm.slots.find((s) => s.code === slotCode);
  if (exact) return exact;
  const src = sourceForm.slots.find((s) => s.code === slotCode);
  if (!src) return targetForm.slots[0] ?? null;
  if (src.group === 'GK') return targetForm.slots.find((s) => s.group === 'GK') ?? null;

  let best: FormationSlot | null = null;
  let bestDist = Infinity;
  for (const candidate of targetForm.slots) {
    if (candidate.group === 'GK') continue;
    const d = Math.hypot(candidate.x - src.x, candidate.y - src.y);
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  return best;
}

function reconcileFormationRoles(
  formationId: string,
  prevRoles: Record<string, string>,
  phase: 'ip' | 'oop',
): Record<string, string> {
  const form = getFormation(formationId);
  const slotCodes = form.slots.map((s) => s.code);
  const next: Record<string, string> = {};
  for (const slot of form.slots) {
    const existing = prevRoles[slot.code];
    const allowed = rolesForSlot(slot.code, slotCodes, phase);
    if (existing && allowed.some((r) => r.id === existing)) {
      next[slot.code] = existing;
    } else {
      next[slot.code] = phase === 'ip' ? slot.defaultIpRole : slot.defaultOopRole;
    }
  }
  return next;
}

function mergeImportedTactic(base: TacticConfig, partial: Partial<TacticConfig>): TacticConfig {
  const ipFormation = partial.ipFormation ?? base.ipFormation;
  const oopFormation = partial.oopFormation ?? base.oopFormation;
  return {
    name: partial.name ?? base.name,
    ipFormation,
    oopFormation,
    mentality: partial.mentality ?? base.mentality,
    tis: { ...TI_DEFAULTS, ...(partial.tis ?? base.tis) },
    ipRoles: reconcileFormationRoles(ipFormation, partial.ipRoles ?? base.ipRoles, 'ip'),
    oopRoles: reconcileFormationRoles(oopFormation, partial.oopRoles ?? base.oopRoles, 'oop'),
    pis: partial.pis ?? {},
  };
}

interface TransitionRow {
  ipSlot: string;
  oopSlot: string;
  ipAbbr: string;
  oopAbbr: string;
  distance: number;
}

function computeTransitionRows(config: TacticConfig): TransitionRow[] {
  const ipOut = resolveTacticPositions(config, 'ip').filter((p) => p.slot.group !== 'GK');
  const oopOut = resolveTacticPositions(config, 'oop').filter((p) => p.slot.group !== 'GK');
  const used = new Set<string>();
  const rows: TransitionRow[] = [];
  const unmatched: typeof ipOut = [];

  for (const ip of ipOut) {
    const exact = oopOut.find((o) => o.slot.code === ip.slot.code && !used.has(o.slot.code));
    if (exact) {
      used.add(exact.slot.code);
      rows.push({
        ipSlot: ip.slot.code,
        oopSlot: exact.slot.code,
        ipAbbr: ip.role.abbr,
        oopAbbr: exact.role.abbr,
        distance: Math.round(Math.hypot(ip.x - exact.x, ip.y - exact.y) * 10) / 10,
      });
    } else {
      unmatched.push(ip);
    }
  }

  const remaining = oopOut.filter((o) => !used.has(o.slot.code));
  for (const ip of unmatched) {
    if (remaining.length === 0) break;
    let bestIdx = 0;
    let bestBaseDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const o = remaining[i];
      const d = Math.hypot(ip.slot.x - o.slot.x, ip.slot.y - o.slot.y);
      if (d < bestBaseDist) {
        bestBaseDist = d;
        bestIdx = i;
      }
    }
    const chosen = remaining.splice(bestIdx, 1)[0];
    rows.push({
      ipSlot: ip.slot.code,
      oopSlot: chosen.slot.code,
      ipAbbr: ip.role.abbr,
      oopAbbr: chosen.role.abbr,
      distance: Math.round(Math.hypot(ip.x - chosen.x, ip.y - chosen.y) * 10) / 10,
    });
  }

  return rows.sort((a, b) => b.distance - a.distance);
}

export function TacticsView({
  config,
  onChangeConfig,
  onJumpToRole,
  onJumpToInstruction,
  onJumpToGuide,
}: TacticsViewProps) {
  const [mode, setMode] = useState<BoardMode>('shape');
  const [phase, setPhase] = useState<PhaseSelection>('ip');
  const [sideTab, setSideTab] = useState<SideTab>('setup');
  const [selectedSlot, setSelectedSlot] = useState<string>('ST');
  const [ballZone, setBallZone] = useState<BallZone>({ third: 'mid', lane: 'centre' });
  const [selectedCell, setSelectedCell] = useState<ZoneCell | null>(null);
  const [opponentKey, setOpponentKey] = useState<string>('4231');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [ioOpen, setIoOpen] = useState(false);
  const [importResult, setImportResult] = useState<FmfImportResult | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [jsonCopyStatus, setJsonCopyStatus] = useState<'idle' | 'copied'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ipForm = useMemo(() => getFormation(config.ipFormation), [config.ipFormation]);
  const oopForm = useMemo(() => getFormation(config.oopFormation), [config.oopFormation]);
  const ipSlotCodes = useMemo(() => ipForm.slots.map((s) => s.code), [ipForm]);
  const oopSlotCodes = useMemo(() => oopForm.slots.map((s) => s.code), [oopForm]);

  const diagramPhase: 'ip' | 'oop' = phase === 'oop' ? 'oop' : 'ip';
  const activeForm = diagramPhase === 'ip' ? ipForm : oopForm;

  // Ensure selectedSlot always points to a valid slot in the current formation
  const resolvedSelectedSlot = useMemo(() => {
    if (activeForm.slots.some((s) => s.code === selectedSlot)) return selectedSlot;
    return (
      activeForm.slots.find((s) => s.group === 'ST')?.code ??
      activeForm.slots[activeForm.slots.length - 1]?.code ??
      'GK'
    );
  }, [activeForm, selectedSlot]);

  const diagram = useMemo(
    () => buildTacticPitchDiagram(config, diagramPhase, mode === 'zones' ? ballZone : undefined),
    [config, diagramPhase, mode, ballZone],
  );

  const coverageReport = useMemo(
    () => (mode === 'coverage' ? computeZoneCoverage(config, phase) : null),
    [config, mode, phase],
  );

  const analysis = useMemo(() => analyzeTactic(config), [config]);
  const transitionRows = useMemo(() => computeTransitionRows(config), [config]);

  const sortedDiagnostics = useMemo(
    () =>
      [...analysis.diagnostics].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
      ),
    [analysis.diagnostics],
  );

  const warningCount = useMemo(
    () => analysis.diagnostics.filter((d) => d.severity === 'error' || d.severity === 'warn').length,
    [analysis.diagnostics],
  );

  const matchedPresetId = useMemo(() => {
    const match = TACTICAL_PRESETS.find(
      (p) =>
        p.name === config.name &&
        p.ipFormation === config.ipFormation &&
        p.oopFormation === config.oopFormation,
    );
    return match?.id ?? null;
  }, [config]);

  const selectedOpponent = useMemo(
    () => OPPONENT_GUIDES.find((o) => o.key === opponentKey) ?? null,
    [opponentKey],
  );

  const currentMentality = MENTALITIES[config.mentality] ?? MENTALITIES[3];

  // Resolve paired IP and OOP slots for the Player inspector tab
  const selectedIpSlot = useMemo(
    () =>
      diagramPhase === 'ip'
        ? ipForm.slots.find((s) => s.code === resolvedSelectedSlot) ?? ipForm.slots[0]
        : findPairedSlot(resolvedSelectedSlot, oopForm, ipForm) ?? ipForm.slots[0],
    [diagramPhase, ipForm, oopForm, resolvedSelectedSlot],
  );

  const selectedOopSlot = useMemo(
    () =>
      diagramPhase === 'oop'
        ? oopForm.slots.find((s) => s.code === resolvedSelectedSlot) ?? oopForm.slots[0]
        : findPairedSlot(resolvedSelectedSlot, ipForm, oopForm) ?? oopForm.slots[0],
    [diagramPhase, ipForm, oopForm, resolvedSelectedSlot],
  );

  const ipRoleOptions = useMemo(
    () => rolesForSlot(selectedIpSlot.code, ipSlotCodes, 'ip'),
    [selectedIpSlot.code, ipSlotCodes],
  );
  const oopRoleOptions = useMemo(
    () => rolesForSlot(selectedOopSlot.code, oopSlotCodes, 'oop'),
    [selectedOopSlot.code, oopSlotCodes],
  );

  const currentIpRoleId = config.ipRoles[selectedIpSlot.code] ?? selectedIpSlot.defaultIpRole;
  const currentOopRoleId = config.oopRoles[selectedOopSlot.code] ?? selectedOopSlot.defaultOopRole;
  const currentIpRole = ROLE_BY_ID[currentIpRoleId];
  const currentOopRole = ROLE_BY_ID[currentOopRoleId];

  const allowedPisByFamily = useMemo(() => {
    const allowed = PLAYER_INSTRUCTIONS.filter((pi) =>
      pi.allowedGroups.includes(selectedIpSlot.group),
    );
    const map = new Map<string, typeof allowed>();
    for (const pi of allowed) {
      const list = map.get(pi.family) ?? [];
      list.push(pi);
      map.set(pi.family, list);
    }
    return [...map.entries()];
  }, [selectedIpSlot.group]);

  const activeSlotPis: PIKey[] = config.pis[selectedIpSlot.code] ?? [];

  const shiftedPlayers = useMemo(
    () => diagram.players.filter((p) => Boolean(p.note)),
    [diagram.players],
  );

  // Handlers
  const handleModeChange = (next: string | null) => {
    if (!next) return;
    const nextMode = next as BoardMode;
    setMode(nextMode);
    if (nextMode !== 'coverage' && phase === 'combined') {
      setPhase('ip');
    }
    if (nextMode !== 'coverage') {
      setSelectedCell(null);
    }
  };

  const handlePhaseChange = (next: string | null) => {
    if (!next) return;
    setPhase(next as PhaseSelection);
  };

  const handlePresetChange = (presetId: string | null) => {
    if (!presetId) return;
    onChangeConfig(defaultTacticConfig(presetId));
    setSelectedCell(null);
  };

  const handleIpFormationChange = (formId: string | null) => {
    if (!formId) return;
    const nextIpRoles = reconcileFormationRoles(formId, config.ipRoles, 'ip');
    const nextForm = getFormation(formId);
    const validSlots = new Set(nextForm.slots.map((s) => s.code));
    const nextPis: Record<string, PIKey[]> = {};
    for (const [slotCode, list] of Object.entries(config.pis)) {
      if (validSlots.has(slotCode)) {
        const slot = nextForm.slots.find((s) => s.code === slotCode);
        if (slot) {
          const validList = list.filter((k) => PI_BY_KEY[k]?.allowedGroups.includes(slot.group));
          if (validList.length > 0) nextPis[slotCode] = validList;
        }
      }
    }
    onChangeConfig({
      ...config,
      name: 'Custom Tactic',
      ipFormation: formId,
      ipRoles: nextIpRoles,
      pis: nextPis,
    });
  };

  const handleOopFormationChange = (formId: string | null) => {
    if (!formId) return;
    const nextOopRoles = reconcileFormationRoles(formId, config.oopRoles, 'oop');
    onChangeConfig({
      ...config,
      name: 'Custom Tactic',
      oopFormation: formId,
      oopRoles: nextOopRoles,
    });
  };

  const handleMentalityChange = (val: string | null) => {
    if (val === null) return;
    const idx = Number(val);
    if (!Number.isInteger(idx) || idx < 0 || idx >= MENTALITIES.length) return;
    onChangeConfig({ ...config, mentality: idx });
  };

  const handleTiChange = (tiKey: string, optionIdx: string | null) => {
    if (optionIdx === null) return;
    const num = Number(optionIdx);
    if (!Number.isInteger(num)) return;
    onChangeConfig({
      ...config,
      tis: { ...config.tis, [tiKey]: num },
    });
  };

  const handleIpRoleChange = (roleId: string | null) => {
    if (!roleId) return;
    onChangeConfig({
      ...config,
      ipRoles: { ...config.ipRoles, [selectedIpSlot.code]: roleId },
    });
  };

  const handleOopRoleChange = (roleId: string | null) => {
    if (!roleId) return;
    onChangeConfig({
      ...config,
      oopRoles: { ...config.oopRoles, [selectedOopSlot.code]: roleId },
    });
  };

  const handleTogglePi = (piKey: PIKey, checked: boolean) => {
    const slotCode = selectedIpSlot.code;
    const existing = config.pis[slotCode] ?? [];
    let nextList: PIKey[];
    if (checked) {
      const def = PI_BY_KEY[piKey];
      const incompatible = new Set(def?.incompatibleWith ?? []);
      nextList = [...existing.filter((k) => k !== piKey && !incompatible.has(k)), piKey];
    } else {
      nextList = existing.filter((k) => k !== piKey);
    }
    const nextPis = { ...config.pis };
    if (nextList.length > 0) {
      nextPis[slotCode] = nextList;
    } else {
      delete nextPis[slotCode];
    }
    onChangeConfig({ ...config, pis: nextPis });
  };

  const handleApplySwap = (swap: ZoneRoleSwap) => {
    if (swap.phase === 'ip') {
      onChangeConfig({
        ...config,
        ipRoles: { ...config.ipRoles, [swap.slot]: swap.suggestedRoleId },
      });
    } else {
      onChangeConfig({
        ...config,
        oopRoles: { ...config.oopRoles, [swap.slot]: swap.suggestedRoleId },
      });
    }
  };

  const handleCopyLink = async () => {
    const hash = serializeTacticToHash(config);
    const nextHash = `#tactic?${hash}`;
    try {
      window.history.replaceState(null, '', nextHash);
      const url = `${window.location.origin}${window.location.pathname}${nextHash}`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 2000);
    } catch {
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const handleDownloadJson = () => {
    const json = exportTacticJson(config);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const slug = (config.name ?? 'tactic')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug || 'tactic'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(exportTacticJson(config));
      }
      setJsonCopyStatus('copied');
      window.setTimeout(() => setJsonCopyStatus('idle'), 2000);
    } catch {
      setJsonCopyStatus('copied');
      window.setTimeout(() => setJsonCopyStatus('idle'), 2000);
    }
  };

  const processFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const result = await parseTacticFile(new Uint8Array(buffer), file.name);
    setImportResult(result);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
    e.target.value = '';
  };

  const handleFileDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleApplyImport = () => {
    if (!importResult?.ok) return;
    onChangeConfig(mergeImportedTactic(config, importResult.tactic));
    setImportResult(null);
    setIoOpen(false);
  };

  const handleReset = () => {
    onChangeConfig(defaultTacticConfig('high-press-433'));
    setSelectedCell(null);
    setBallZone({ third: 'mid', lane: 'centre' });
  };

  const presetItems = useMemo(
    () => TACTICAL_PRESETS.map((p) => ({ value: p.id, label: p.name })),
    [],
  );
  const formationItems = useMemo(
    () => FORMATIONS.map((f) => ({ value: f.id, label: f.name })),
    [],
  );
  const mentalityItems = useMemo(
    () => MENTALITIES.map((m) => ({ value: String(m.index), label: m.name })),
    [],
  );
  const opponentItems = useMemo(
    () => [
      { value: 'none', label: 'None (general)' },
      ...OPPONENT_GUIDES.map((o) => ({ value: o.key, label: `vs ${o.formation}` })),
    ],
    [],
  );
  const ipRoleItems = useMemo(
    () => ipRoleOptions.map((r) => ({ value: r.id, label: `${r.name} (${r.abbr})` })),
    [ipRoleOptions],
  );
  const oopRoleItems = useMemo(
    () => oopRoleOptions.map((r) => ({ value: r.id, label: `${r.name} (${r.abbr})` })),
    [oopRoleOptions],
  );

  const slotItems = useMemo(
    () =>
      activeForm.slots.map((slot) => {
        const roleId =
          diagramPhase === 'ip'
            ? (config.ipRoles[slot.code] ?? slot.defaultIpRole)
            : (config.oopRoles[slot.code] ?? slot.defaultOopRole);
        const role = ROLE_BY_ID[roleId];
        return {
          value: slot.code,
          label: `${slot.code}: ${role?.name ?? slot.code}`,
        };
      }),
    [activeForm.slots, diagramPhase, config.ipRoles, config.oopRoles],
  );

  const selectedCellLive = useMemo(() => {
    if (!selectedCell || !coverageReport) return null;
    return (
      coverageReport.cells.find(
        (c) => c.col === selectedCell.col && c.row === selectedCell.row,
      ) ?? null
    );
  }, [selectedCell, coverageReport]);

  return (
    <div className="page-container">
      {/* Compact top header with H1 + preset + actions */}
      <header className="section-header" style={{ alignItems: 'center' }}>
        <div className="stack-sm" style={{ gap: 2 }}>
          <h1 className="section-title">{config.name || 'Custom Tactic'}</h1>
          <p className="text-sm text-muted">
            {config.ipFormation} IP · {config.oopFormation} OOP · {currentMentality.name}
          </p>
        </div>

        <div className="section-actions">
          <div style={{ minWidth: 190 }}>
            <Select
              items={presetItems}
              value={matchedPresetId}
              placeholder={config.name || 'Choose preset'}
              onValueChange={handlePresetChange}
            >
              <SelectTrigger aria-label="Tactical preset" style={{ width: '100%' }}>
                <SelectValue />
                <ChevronIcon />
              </SelectTrigger>
              <SelectContent>
                {TACTICAL_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id} label={preset.name}>
                    <span>{preset.name}</span>
                    <SelectItemIndicator>
                      <CheckIcon />
                    </SelectItemIndicator>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Dialog
            open={ioOpen}
            onOpenChange={(next) => {
              setIoOpen(next);
              if (!next) setImportResult(null);
            }}
          >
            <DialogTrigger className="btn btn--sm">Import / Export</DialogTrigger>
            <DialogBackdrop />
            <DialogContent
              style={{
                width: 'min(540px, calc(100vw - 24px))',
                background: 'var(--surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px 22px',
              }}
            >
              <div className="stack">
                <div className="row-between">
                  <DialogTitle>Import / Export Tactic</DialogTitle>
                  <DialogClose className="btn btn--ghost btn--sm" aria-label="Close dialog">
                    Close
                  </DialogClose>
                </div>
                <DialogDescription className="text-muted text-sm">
                  Export a lossless Tactical Bible JSON file or import a saved <code>.json</code> or
                  Football Manager <code>.fmf</code> file.
                </DialogDescription>

                <div className="inset-callout">
                  <div className="row-between">
                    <div>
                      <strong className="text-sm">Export current tactic</strong>
                      <p className="text-sm text-muted">
                        {config.name ?? 'Custom Tactic'} · {config.ipFormation} /{' '}
                        {config.oopFormation}
                      </p>
                    </div>
                    <div className="row">
                      <Button className="btn btn--sm" onClick={handleCopyJson}>
                        {jsonCopyStatus === 'copied' ? 'Copied JSON' : 'Copy JSON'}
                      </Button>
                      <Button className="btn btn--primary btn--sm" onClick={handleDownloadJson}>
                        Download .json
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="divider" />

                <div className="stack-sm">
                  <strong className="text-sm">Import .fmf or .json</strong>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={handleFileDrop}
                    style={{
                      border: `1.5px dashed ${isDraggingFile ? 'var(--accent)' : 'var(--border-strong)'}`,
                      background: isDraggingFile ? 'var(--accent-soft)' : 'var(--bg)',
                      borderRadius: 'var(--radius)',
                      padding: '18px 16px',
                      textAlign: 'center',
                    }}
                  >
                    <p className="text-sm" style={{ marginBottom: 10 }}>
                      Drop a <code>.fmf</code> or <code>.json</code> file here, or choose from disk.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".fmf,.json"
                      className="sr-only"
                      aria-label="Choose tactic file"
                      onChange={handleFileInputChange}
                    />
                    <Button
                      className="btn btn--sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose file…
                    </Button>
                  </div>

                  {importResult && (
                    <div className="inset-callout" aria-live="polite">
                      <div className="row-between">
                        <strong className="text-sm">{importResult.tacticName}</strong>
                        <span
                          className={`phase-tag ${
                            importResult.confidence === 'exact'
                              ? 'phase-tag--ok'
                              : importResult.confidence === 'partial'
                                ? 'phase-tag--warn'
                                : 'phase-tag--danger'
                          }`}
                        >
                          {importResult.format.toUpperCase()} · {importResult.confidence}
                        </span>
                      </div>

                      {importResult.error && (
                        <p className="text-sm" style={{ color: 'var(--danger)' }}>
                          {importResult.error}
                        </p>
                      )}

                      {importResult.matched.length > 0 && (
                        <div className="stack-sm">
                          <span className="text-sm text-muted">
                            Matched ({importResult.matched.length}):{' '}
                            {importResult.matched.slice(0, 10).join(', ')}
                            {importResult.matched.length > 10
                              ? ` +${importResult.matched.length - 10} more`
                              : ''}
                          </span>
                        </div>
                      )}

                      {importResult.warnings.length > 0 && (
                        <ul
                          className="text-sm text-muted"
                          style={{ margin: 0, paddingLeft: 18 }}
                        >
                          {importResult.warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      )}

                      {importResult.ok && (
                        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                          <Button className="btn btn--primary btn--sm" onClick={handleApplyImport}>
                            Apply imported tactic
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Menu>
            <MenuTrigger className="btn btn--sm">
              <span>{copyStatus === 'copied' ? 'Link copied' : 'More'}</span>
              <ChevronIcon />
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem value="copy-link" label="Copy share link" onSelect={handleCopyLink}>
                Copy share link
              </MenuItem>
              <MenuSeparator />
              <MenuItem value="reset" label="Reset to default" onSelect={handleReset}>
                Reset to default
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </header>

      {/* Main 2-column Tactics Layout */}
      <div className="tactics-layout">
        {/* Left Sticky Pitch Column */}
        <section className="tactics-main" aria-label="Tactical pitch">
          <div className="pitch-toolbar">
            <SegmentedControl
              aria-label="Board view mode"
              value={mode}
              onValueChange={handleModeChange}
            >
              <SegmentedControlIndicator />
              <SegmentedControlItem value="shape">Shape</SegmentedControlItem>
              <SegmentedControlItem value="zones">3×3 Zones</SegmentedControlItem>
              <SegmentedControlItem value="coverage">Coverage</SegmentedControlItem>
            </SegmentedControl>

            <SegmentedControl
              aria-label="Tactical phase"
              value={phase}
              onValueChange={handlePhaseChange}
            >
              <SegmentedControlIndicator />
              <SegmentedControlItem value="ip">In Possession</SegmentedControlItem>
              <SegmentedControlItem value="oop">Out of Possession</SegmentedControlItem>
              {mode === 'coverage' && (
                <SegmentedControlItem value="combined">Combined</SegmentedControlItem>
              )}
            </SegmentedControl>
          </div>

          <PitchSvg
            diagram={diagram}
            selectedSlot={resolvedSelectedSlot}
            onSelectSlot={(slot) => {
              setSelectedSlot(slot);
              setSideTab('player');
            }}
            ballZone={mode === 'zones' ? ballZone : undefined}
            onSelectBallZone={mode === 'zones' ? setBallZone : undefined}
            coverage={coverageReport}
            selectedCell={
              selectedCellLive ? { col: selectedCellLive.col, row: selectedCellLive.row } : null
            }
            onSelectCell={mode === 'coverage' ? setSelectedCell : undefined}
            ariaLabel={`${config.name ?? 'Tactic'} pitch diagram: ${diagram.subtitle}`}
          />

          {/* Compact typographic metric strip */}
          <div className="metric-strip" aria-label="Tactic summary metrics">
            <div className="metric-strip-items">
              <div className="metric-pair">
                <span className="metric-pair-label">Status</span>
                <span
                  className={`metric-pair-value ${
                    warningCount === 0 ? 'metric-pair-value--ok' : 'metric-pair-value--warn'
                  }`}
                >
                  {warningCount === 0
                    ? 'Balanced'
                    : `${warningCount} warning${warningCount === 1 ? '' : 's'}`}
                </span>
              </div>
              <div className="metric-pair">
                <span className="metric-pair-label">Complexity</span>
                <span
                  className={`metric-pair-value ${
                    analysis.complexityTier === 'Very Complex'
                      ? 'metric-pair-value--warn'
                      : analysis.complexityTier === 'Complex'
                        ? 'metric-pair-value--info'
                        : 'metric-pair-value--ok'
                  }`}
                >
                  {analysis.complexityTier} ({analysis.complexityScore})
                </span>
              </div>
              <div className="metric-pair">
                <span className="metric-pair-label">Max shift</span>
                <span
                  className={`metric-pair-value ${
                    analysis.maxTravelDistance >= 28 ? 'metric-pair-value--warn' : ''
                  }`}
                >
                  {analysis.maxTravelDistance} m
                </span>
              </div>
              <div className="metric-pair">
                <span className="metric-pair-label">Rest defence</span>
                <span
                  className={`metric-pair-value ${
                    analysis.restDefenceCount < 3 ? 'metric-pair-value--danger' : ''
                  }`}
                >
                  {analysis.restDefenceCount}
                </span>
              </div>
            </div>
            {sideTab !== 'analysis' && (
              <Button
                className="btn btn--ghost btn--sm"
                onClick={() => setSideTab('analysis')}
              >
                Full analysis →
              </Button>
            )}
          </div>

          {/* 3×3 Ball Zone note */}
          {mode === 'zones' && (
            <div className="card">
              <div className="row-between row-wrap">
                <h2 className="card-title">
                  Ball in {THIRD_LABELS[ballZone.third]} · {LANE_LABELS[ballZone.lane]}
                </h2>
                <span className="text-sm text-muted">Click any pitch zone to shift</span>
              </div>
              {shiftedPlayers.length > 0 ? (
                <div className="divided-list">
                  {shiftedPlayers.map((p) => (
                    <div key={p.id} className="row-between text-sm">
                      <strong>
                        {p.slot} ({p.label})
                      </strong>
                      <span className="text-muted">{p.note}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted prose">
                  Neutral centre reference shape. Click another zone to inspect ball-side shifts and
                  ghost deltas.
                </p>
              )}
            </div>
          )}

          {/* 35-Zone Coverage bands + clickable Role-Swap Suggestions */}
          {mode === 'coverage' && coverageReport && (
            <div className="card stack">
              <div className="card-header">
                <h2 className="card-title">Zone Coverage ({phase.toUpperCase()})</h2>
                <div className="meta-line tabular-nums">
                  <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                    {coverageReport.gaps.length} gaps
                  </span>
                  <span>·</span>
                  <span>{coverageReport.crowded.length} crowded</span>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 14,
                }}
              >
                {(
                  [
                    ['Defense', coverageReport.bandGrades.defense],
                    ['Midfield', coverageReport.bandGrades.midfield],
                    ['Attack', coverageReport.bandGrades.attack],
                  ] as const
                ).map(([label, score]) => (
                  <div key={label} className="stat-bar">
                    <div className="row-between text-sm">
                      <span>{label}</span>
                      <strong className="tabular-nums">{score}%</strong>
                    </div>
                    <div className="stat-bar-track">
                      <div
                        className="stat-bar-fill"
                        style={{
                          width: `${score}%`,
                          background:
                            score >= 75
                              ? 'var(--ok)'
                              : score >= 55
                                ? 'var(--warn)'
                                : 'var(--danger)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {selectedCellLive && (
                <div className="inset-callout">
                  <div className="row-between row-wrap">
                    <strong className="text-sm">{selectedCellLive.label}</strong>
                    <span
                      className={`phase-tag tabular-nums ${
                        selectedCellLive.status === 'gap'
                          ? 'phase-tag--danger'
                          : selectedCellLive.status === 'light'
                            ? 'phase-tag--warn'
                            : 'phase-tag--ok'
                      }`}
                    >
                      {selectedCellLive.status} · {selectedCellLive.score}
                    </span>
                  </div>
                  <span className="text-sm text-muted">
                    {selectedCellLive.contributors.length > 0
                      ? `Covered by: ${selectedCellLive.contributors.join(', ')}`
                      : 'No players reaching this zone'}
                  </span>
                </div>
              )}

              <div className="stack-sm">
                <h3>Role-Swap Suggestions</h3>
                {coverageReport.swaps.length === 0 ? (
                  <p className="text-sm text-muted prose">
                    No urgent role swaps needed. All key zones have balanced coverage.
                  </p>
                ) : (
                  <div className="divided-list">
                    {coverageReport.swaps.map((swap) => {
                      const fromRole = ROLE_BY_ID[swap.currentRoleId];
                      const toRole = ROLE_BY_ID[swap.suggestedRoleId];
                      return (
                        <div
                          key={swap.id}
                          className="row-between row-wrap"
                          style={{ gap: 10 }}
                        >
                          <div className="stack-sm" style={{ gap: 2, flex: '1 1 220px' }}>
                            <div className="row-wrap" style={{ gap: 8 }}>
                              <span
                                className={`phase-tag ${
                                  swap.phase === 'ip' ? 'phase-tag--ip' : 'phase-tag--oop'
                                }`}
                              >
                                {swap.phase.toUpperCase()} · {swap.slot}
                              </span>
                              <strong className="text-sm">
                                {fromRole?.name ?? swap.currentRoleId} →{' '}
                                {toRole?.name ?? swap.suggestedRoleId}
                              </strong>
                            </div>
                            <span className="text-sm text-muted">
                              {swap.zoneLabel}: {swap.reason}
                            </span>
                          </div>
                          <Button
                            className="btn btn--primary btn--sm"
                            onClick={() => handleApplySwap(swap)}
                          >
                            Apply swap
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right Inspector Panel (3 clean tabs) */}
        <aside className="tactics-side" aria-label="Tactic controls">
          <div className="card">
            <Tabs
              value={sideTab}
              onValueChange={(next) => {
                if (next) setSideTab(next as SideTab);
              }}
            >
              <TabsList aria-label="Tactic panel sections">
                <TabsTab value="setup">Setup</TabsTab>
                <TabsTab value="player">Player ({resolvedSelectedSlot})</TabsTab>
                <TabsTab value="analysis">Analysis</TabsTab>
              </TabsList>

              {/* ── SETUP TAB ──────────────────────────────────────────────── */}
              <TabsPanel value="setup">
                <div className="stack" style={{ paddingTop: 14 }}>
                  <div className="two-col" style={{ gap: 10 }}>
                    <Field>
                      <FieldLabel className="text-xs text-muted">IP Formation</FieldLabel>
                      <Select
                        items={formationItems}
                        value={config.ipFormation}
                        onValueChange={handleIpFormationChange}
                      >
                        <SelectTrigger aria-label="In possession formation" style={{ width: '100%' }}>
                          <SelectValue />
                          <ChevronIcon />
                        </SelectTrigger>
                        <SelectContent>
                          {FORMATIONS.map((f) => (
                            <SelectItem key={f.id} value={f.id} label={f.name}>
                              <span>{f.name}</span>
                              <SelectItemIndicator>
                                <CheckIcon />
                              </SelectItemIndicator>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel className="text-xs text-muted">OOP Formation</FieldLabel>
                      <Select
                        items={formationItems}
                        value={config.oopFormation}
                        onValueChange={handleOopFormationChange}
                      >
                        <SelectTrigger
                          aria-label="Out of possession formation"
                          style={{ width: '100%' }}
                        >
                          <SelectValue />
                          <ChevronIcon />
                        </SelectTrigger>
                        <SelectContent>
                          {FORMATIONS.map((f) => (
                            <SelectItem key={f.id} value={f.id} label={f.name}>
                              <span>{f.name}</span>
                              <SelectItemIndicator>
                                <CheckIcon />
                              </SelectItemIndicator>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <div className="two-col" style={{ gap: 10 }}>
                    <Field>
                      <FieldLabel className="text-xs text-muted">Mentality</FieldLabel>
                      <Select
                        items={mentalityItems}
                        value={String(config.mentality)}
                        onValueChange={handleMentalityChange}
                      >
                        <SelectTrigger aria-label="Team mentality" style={{ width: '100%' }}>
                          <SelectValue />
                          <ChevronIcon />
                        </SelectTrigger>
                        <SelectContent>
                          {MENTALITIES.map((m) => (
                            <SelectItem key={m.index} value={String(m.index)} label={m.name}>
                              <span>{m.name}</span>
                              <SelectItemIndicator>
                                <CheckIcon />
                              </SelectItemIndicator>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel className="text-xs text-muted">Opponent</FieldLabel>
                      <Select
                        items={opponentItems}
                        value={opponentKey}
                        onValueChange={(next) => {
                          if (next) setOpponentKey(next);
                        }}
                      >
                        <SelectTrigger aria-label="Opponent formation" style={{ width: '100%' }}>
                          <SelectValue />
                          <ChevronIcon />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" label="None (general)">
                            <span>None (general)</span>
                            <SelectItemIndicator>
                              <CheckIcon />
                            </SelectItemIndicator>
                          </SelectItem>
                          {OPPONENT_GUIDES.map((opp) => (
                            <SelectItem
                              key={opp.key}
                              value={opp.key}
                              label={`vs ${opp.formation}`}
                            >
                              <span>vs {opp.formation}</span>
                              <SelectItemIndicator>
                                <CheckIcon />
                              </SelectItemIndicator>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <p className="text-sm text-muted">{currentMentality.summary}</p>

                  {/* Inline Opponent Counter Advice & OI Tips (visible directly, never hidden) */}
                  {selectedOpponent && (
                    <div className="inset-callout" aria-label="Opponent counter plan">
                      <div className="row-between">
                        <strong className="text-sm">Counter vs {selectedOpponent.formation}</strong>
                        {onJumpToGuide && (
                          <Button
                            className="btn btn--ghost btn--sm"
                            onClick={() => onJumpToGuide('opponents')}
                          >
                            All counters ↗
                          </Button>
                        )}
                      </div>
                      <p className="text-sm">
                        <strong>Threat:</strong> {selectedOpponent.watchFor}
                      </p>
                      <p className="text-sm text-muted">
                        <strong style={{ color: 'var(--text)' }}>Counter:</strong>{' '}
                        {selectedOpponent.structuralCounter}
                      </p>
                      <div className="stack-sm" style={{ gap: 3 }}>
                        <span className="text-sm" style={{ fontWeight: 600 }}>
                          Opposition instruction tips
                        </span>
                        <ul
                          className="text-sm text-muted"
                          style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 3 }}
                        >
                          {selectedOpponent.oiTips.map((tip, idx) => (
                            <li key={idx} className="text-sm">
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="divider" />

                  {/* Team Instructions grouped cleanly in collapsible areas */}
                  <div className="stack-sm">
                    {SETUP_TI_AREAS.map((area) => {
                      const items = TEAM_INSTRUCTIONS.filter((ti) => ti.area === area);
                      const activeCount = items.filter(
                        (ti) => (config.tis[ti.key] ?? ti.defaultIndex) !== ti.defaultIndex,
                      ).length;

                      return (
                        <Collapsible
                          key={area}
                          defaultOpen={
                            area === 'Build-up' || area === 'Out of Possession' || activeCount > 0
                          }
                          className="ti-group"
                        >
                          <CollapsibleTrigger className="ti-group-trigger">
                            <span>{area}</span>
                            {activeCount > 0 && (
                              <span className="ti-group-count tabular-nums">
                                {activeCount} active
                              </span>
                            )}
                            <ChevronIcon className="ti-group-chevron" />
                          </CollapsibleTrigger>

                          <CollapsiblePanel className="ti-group-panel stack-sm">
                            {items.map((ti) => {
                              const currentVal = config.tis[ti.key] ?? ti.defaultIndex;
                              const isCustom = currentVal !== ti.defaultIndex;
                              const optionItems = ti.options.map((opt, idx) => ({
                                value: String(idx),
                                label: opt,
                              }));

                              return (
                                <div
                                  key={ti.key}
                                  className="row-between"
                                  style={{ gap: 8, alignItems: 'center' }}
                                >
                                  <div className="row" style={{ gap: 4, minWidth: 0 }}>
                                    <span
                                      className="text-sm"
                                      style={{
                                        color: isCustom ? 'var(--text)' : 'var(--muted)',
                                        fontWeight: isCustom ? 600 : 400,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {ti.name}
                                    </span>
                                    {onJumpToInstruction && (
                                      <Button
                                        className="btn btn--ghost btn--sm"
                                        style={{ height: 24, padding: '0 6px' }}
                                        aria-label={`Inspect ${ti.name} instruction`}
                                        onClick={() => onJumpToInstruction('ti', ti.key)}
                                      >
                                        ↗
                                      </Button>
                                    )}
                                  </div>

                                  <div style={{ width: 164, flexShrink: 0 }}>
                                    <Select
                                      items={optionItems}
                                      value={String(currentVal)}
                                      onValueChange={(v) => handleTiChange(ti.key, v)}
                                    >
                                      <SelectTrigger
                                        aria-label={ti.name}
                                        style={{
                                          width: '100%',
                                          height: 32,
                                          fontSize: 'var(--text-sm)',
                                          borderColor: isCustom
                                            ? 'var(--accent-border)'
                                            : undefined,
                                        }}
                                      >
                                        <SelectValue />
                                        <ChevronIcon />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ti.options.map((opt, idx) => (
                                          <SelectItem key={idx} value={String(idx)} label={opt}>
                                            <span>{opt}</span>
                                            <SelectItemIndicator>
                                              <CheckIcon />
                                            </SelectItemIndicator>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              );
                            })}
                          </CollapsiblePanel>
                        </Collapsible>
                      );
                    })}
                  </div>
                </div>
              </TabsPanel>

              {/* ── PLAYER TAB ─────────────────────────────────────────────── */}
              <TabsPanel value="player">
                <div className="stack" style={{ paddingTop: 14 }}>
                  <Field>
                    <div className="row-between">
                      <FieldLabel className="text-sm text-muted">
                        Selected player ({GROUP_LABELS[selectedIpSlot.group]})
                      </FieldLabel>
                      <span className="text-sm text-muted">Or click pitch token</span>
                    </div>
                    <Select
                      items={slotItems}
                      value={resolvedSelectedSlot}
                      onValueChange={(next) => {
                        if (next) setSelectedSlot(next);
                      }}
                    >
                      <SelectTrigger aria-label="Selected player slot" style={{ width: '100%' }}>
                        <SelectValue />
                        <ChevronIcon />
                      </SelectTrigger>
                      <SelectContent>
                        {slotItems.map((item) => (
                          <SelectItem key={item.value} value={item.value} label={item.label}>
                            <span>{item.label}</span>
                            <SelectItemIndicator>
                              <CheckIcon />
                            </SelectItemIndicator>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="divider" />

                  {/* IP Role */}
                  <div className="stack-sm">
                    <div className="row-between">
                      <span className="phase-tag phase-tag--ip">
                        IP · {selectedIpSlot.code}
                      </span>
                      {onJumpToRole && currentIpRole && (
                        <Button
                          className="btn btn--ghost btn--sm"
                          onClick={() => onJumpToRole(currentIpRole.id)}
                        >
                          Inspect {currentIpRole.abbr} ↗
                        </Button>
                      )}
                    </div>
                    <Select
                      items={ipRoleItems}
                      value={currentIpRoleId}
                      onValueChange={handleIpRoleChange}
                    >
                      <SelectTrigger aria-label="In possession role" style={{ width: '100%' }}>
                        <SelectValue />
                        <ChevronIcon />
                      </SelectTrigger>
                      <SelectContent>
                        {ipRoleOptions.map((r) => (
                          <SelectItem key={r.id} value={r.id} label={`${r.name} (${r.abbr})`}>
                            <span>
                              {r.name} ({r.abbr})
                            </span>
                            <SelectItemIndicator>
                              <CheckIcon />
                            </SelectItemIndicator>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {currentIpRole && <p className="text-sm text-muted">{currentIpRole.summary}</p>}
                  </div>

                  {/* OOP Role */}
                  <div className="stack-sm">
                    <div className="row-between">
                      <span className="phase-tag phase-tag--oop">
                        OOP · {selectedOopSlot.code}
                      </span>
                      {onJumpToRole && currentOopRole && (
                        <Button
                          className="btn btn--ghost btn--sm"
                          onClick={() => onJumpToRole(currentOopRole.id)}
                        >
                          Inspect {currentOopRole.abbr} ↗
                        </Button>
                      )}
                    </div>
                    <Select
                      items={oopRoleItems}
                      value={currentOopRoleId}
                      onValueChange={handleOopRoleChange}
                    >
                      <SelectTrigger aria-label="Out of possession role" style={{ width: '100%' }}>
                        <SelectValue />
                        <ChevronIcon />
                      </SelectTrigger>
                      <SelectContent>
                        {oopRoleOptions.map((r) => (
                          <SelectItem key={r.id} value={r.id} label={`${r.name} (${r.abbr})`}>
                            <span>
                              {r.name} ({r.abbr})
                            </span>
                            <SelectItemIndicator>
                              <CheckIcon />
                            </SelectItemIndicator>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {currentOopRole && (
                      <p className="text-sm text-muted">{currentOopRole.summary}</p>
                    )}
                  </div>

                  <div className="divider" />

                  {/* Position-filtered Player Instructions */}
                  <div className="stack">
                    <div className="row-between">
                      <h3>Player instructions ({selectedIpSlot.code})</h3>
                      {activeSlotPis.length > 0 && (
                        <span className="text-sm tabular-nums" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                          {activeSlotPis.length} active
                        </span>
                      )}
                    </div>

                    {allowedPisByFamily.length === 0 ? (
                      <p className="text-sm text-muted">
                        Goalkeepers do not take outfield Player Instructions. Configure keeper
                        distribution under Setup → Build-up.
                      </p>
                    ) : (
                      allowedPisByFamily.map(([family, pis]) => (
                        <div key={family} className="stack-sm">
                          <span className="text-sm text-muted" style={{ fontWeight: 600 }}>
                            {family}
                          </span>
                          <div className="divided-list">
                            {pis.map((pi) => {
                              const isChecked = activeSlotPis.includes(pi.key);
                              const conflictingNames = pi.incompatibleWith
                                .filter((k) => activeSlotPis.includes(k))
                                .map((k) => PI_BY_KEY[k]?.name ?? k);

                              return (
                                <div
                                  key={pi.key}
                                  className="row-between"
                                  style={{ gap: 8 }}
                                >
                                  <div className="stack-sm" style={{ gap: 2, minWidth: 0 }}>
                                    <div className="row-wrap" style={{ gap: 6 }}>
                                      <span className="text-sm" style={{ fontWeight: 500 }}>
                                        {pi.name}
                                      </span>
                                      {pi.fm27 && (
                                        <span className="text-sm" style={{ color: 'var(--warn)', fontWeight: 600 }}>
                                          FM27
                                        </span>
                                      )}
                                      {onJumpToInstruction && (
                                        <Button
                                          className="btn btn--ghost btn--sm"
                                          style={{ height: 22, padding: '0 5px' }}
                                          aria-label={`Inspect ${pi.name} player instruction`}
                                          onClick={() => onJumpToInstruction('pi', pi.key)}
                                        >
                                          ↗
                                        </Button>
                                      )}
                                    </div>
                                    {conflictingNames.length > 0 && (
                                      <span className="text-sm" style={{ color: 'var(--warn)' }}>
                                        Replaces {conflictingNames.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                  <Switch
                                    aria-label={pi.name}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => handleTogglePi(pi.key, checked)}
                                  >
                                    <SwitchThumb />
                                  </Switch>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsPanel>

              {/* ── ANALYSIS TAB ───────────────────────────────────────────── */}
              <TabsPanel value="analysis">
                <div className="stack" style={{ paddingTop: 14 }}>
                  {/* Diagnostics (warnings first) */}
                  <div className="stack-sm">
                    <div className="row-between">
                      <h3>Tactical diagnostics</h3>
                      <span
                        className={`phase-tag ${
                          warningCount === 0 ? 'phase-tag--ok' : 'phase-tag--warn'
                        }`}
                      >
                        {warningCount === 0
                          ? 'All clear'
                          : `${warningCount} issue${warningCount === 1 ? '' : 's'}`}
                      </span>
                    </div>
                    {sortedDiagnostics.map((diag) => (
                      <div key={diag.id} className={`diag-item diag-item--${diag.severity}`}>
                        <strong className="text-sm">{diag.title}</strong>
                        <p className="text-sm text-muted">{diag.detail}</p>
                        {diag.fix && (
                          <p className="text-sm" style={{ color: 'var(--text)' }}>
                            <strong>Fix:</strong> {diag.fix}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* FM27 Complexity meter */}
                  <div className="inset-callout">
                    <div className="row-between">
                      <strong className="text-sm">FM27 Tactical Complexity</strong>
                      <span className="text-sm tabular-nums" style={{ color: 'var(--warn)', fontWeight: 600 }}>
                        {analysis.complexityTier} · {analysis.complexityScore}/100
                      </span>
                    </div>
                    <div className="stat-bar-track">
                      <div
                        className="stat-bar-fill"
                        style={{
                          width: `${analysis.complexityScore}%`,
                          background:
                            analysis.complexityScore >= 76
                              ? 'var(--danger)'
                              : analysis.complexityScore >= 52
                                ? 'var(--warn)'
                                : 'var(--accent)',
                        }}
                      />
                    </div>
                    <p className="text-sm text-muted">
                      Neglecting weekly tactical training triggers FM27&apos;s ~3-week Tactical
                      Understanding decay clock. Higher complexity decays faster unless backed by
                      high Decisions, Anticipation, Composure, and Concentration.
                    </p>
                    {onJumpToGuide && (
                      <div>
                        <Button
                          className="btn btn--ghost btn--sm"
                          onClick={() => onJumpToGuide('concepts')}
                        >
                          Read FM27 Effectiveness &amp; Complexity guide ↗
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Structural balance metrics */}
                  <div className="metric-grid">
                    <div className="metric-grid-cell">
                      <span className="text-sm text-muted">Rest defence</span>
                      <strong className="text-body tabular-nums">
                        {analysis.restDefenceCount} players
                      </strong>
                      <span className="text-sm text-muted">Target: 3–5 behind ball</span>
                    </div>
                    <div className="metric-grid-cell">
                      <span className="text-sm text-muted">Box occupation</span>
                      <strong className="text-body tabular-nums">
                        {analysis.boxRunnersCount} runners
                      </strong>
                      <span className="text-sm text-muted">Target: 2–4 staggered</span>
                    </div>
                    <div className="metric-grid-cell">
                      <span className="text-sm text-muted">Flank width</span>
                      <strong className="text-sm">
                        L: {analysis.leftWidthHolders.join(', ') || 'None'} · R:{' '}
                        {analysis.rightWidthHolders.join(', ') || 'None'}
                      </strong>
                    </div>
                    <div className="metric-grid-cell">
                      <span className="text-sm text-muted">OOP line gap</span>
                      <strong className="text-body tabular-nums">{analysis.lineGap} m</strong>
                      <span className="text-sm text-muted">
                        Def {analysis.defLineX} → LoE {analysis.loeX}
                      </span>
                    </div>
                  </div>

                  {/* IP ↔ OOP Shift Table */}
                  <div className="stack-sm">
                    <h3>IP ↔ OOP transition distances</h3>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>IP</th>
                          <th>OOP</th>
                          <th>Shift</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transitionRows.map((row) => (
                          <tr key={`${row.ipSlot}-${row.oopSlot}`}>
                            <td>
                              {row.ipSlot} <span className="text-sm text-muted">({row.ipAbbr})</span>
                            </td>
                            <td>
                              {row.oopSlot}{' '}
                              <span className="text-sm text-muted">({row.oopAbbr})</span>
                            </td>
                            <td className="tabular-nums">
                              <span
                                style={{
                                  color: row.distance >= 28 ? 'var(--warn)' : 'var(--text)',
                                  fontWeight: row.distance >= 28 ? 600 : 400,
                                }}
                              >
                                {row.distance.toFixed(1)} m
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsPanel>
            </Tabs>
          </div>
        </aside>
      </div>
    </div>
  );
}
