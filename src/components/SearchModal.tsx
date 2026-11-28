import { useEffect, useState } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandItemText,
  CommandList,
  type CommandData,
  type CommandDataItem,
} from '@ui-sdk/react/command';
import {
  Dialog,
  DialogBackdrop,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@ui-sdk/react/dialog';
import {
  ATTRIBUTES,
  CONCEPTS,
  GROUP_LABELS,
  IN_MATCH_GUIDE,
  OPPONENT_GUIDES,
  OPPOSITION_INSTRUCTIONS,
  PLAYER_INSTRUCTIONS,
  PLAYER_TRAITS,
  ROLES,
  SET_PIECES,
  TACTICAL_PRESETS,
  TEAM_INSTRUCTIONS,
  TROUBLESHOOTING,
} from '../data';

export type GuideTabId =
  | 'attributes'
  | 'concepts'
  | 'opponents'
  | 'oi'
  | 'traits'
  | 'set-pieces'
  | 'troubleshooting'
  | 'in-match'
  | 'sources';

export type SearchTarget =
  | { section: 'tactics'; presetId?: string }
  | { section: 'roles'; roleId: string }
  | { section: 'instructions'; kind: 'ti' | 'pi'; key: string }
  | { section: 'guides'; tab: GuideTabId; itemId?: string };

export interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (target: SearchTarget) => void;
}

interface IndexedEntry {
  value: string;
  label: string;
  subtitle: string;
  badge: string;
  badgeTone: 'ip' | 'oop' | 'fm27' | 'info' | 'warn' | 'muted';
  keywords: string[];
  target: SearchTarget;
}

function formatLegacyEquiv(raw: string): string {
  const clean = raw.replace(/^FM24\s+/i, '').trim();
  return `Formerly FM24 ${clean}`;
}

function buildSearchIndex(): {
  allItems: CommandData;
  emptyItems: CommandData;
  entryMap: Map<string, IndexedEntry>;
} {
  const entryMap = new Map<string, IndexedEntry>();

  const toItem = (entry: IndexedEntry): CommandDataItem => {
    entryMap.set(entry.value, entry);
    return {
      value: entry.value,
      label: entry.label,
      keywords: entry.keywords,
    };
  };

  const presetItems = TACTICAL_PRESETS.map((preset) =>
    toItem({
      value: `preset:${preset.id}`,
      label: preset.name,
      subtitle: `${preset.style} · ${preset.ipFormation} / ${preset.oopFormation}`,
      badge: 'Preset',
      badgeTone: 'ip',
      keywords: [preset.style, preset.ipFormation, preset.oopFormation, preset.summary],
      target: { section: 'tactics', presetId: preset.id },
    }),
  );

  const roleItems = ROLES.map((role) => {
    const groupsText = role.groups.map((g) => GROUP_LABELS[g]).join(', ');
    const subtitleParts = [groupsText];
    if (role.legacyEquiv) subtitleParts.push(formatLegacyEquiv(role.legacyEquiv));
    return toItem({
      value: `role:${role.id}`,
      label: `${role.name} (${role.abbr})`,
      subtitle: subtitleParts.join(' · '),
      badge: role.phase.toUpperCase(),
      badgeTone: role.phase === 'ip' ? 'ip' : 'oop',
      keywords: [
        role.abbr,
        role.phase,
        role.phase === 'ip' ? 'in possession' : 'out of possession',
        ...(role.legacyEquiv ? [role.legacyEquiv, 'fm24', 'legacy'] : []),
        ...role.groups,
        ...role.groups.map((g) => GROUP_LABELS[g]),
        ...role.tags,
        role.summary,
      ],
      target: { section: 'roles', roleId: role.id },
    });
  });

  const tiItems = TEAM_INSTRUCTIONS.map((ti) =>
    toItem({
      value: `ti:${ti.key}`,
      label: ti.name,
      subtitle: `${ti.area} · ${ti.options.join(' / ')}`,
      badge: 'TI',
      badgeTone: ti.phase === 'ip' ? 'ip' : 'oop',
      keywords: [ti.key, ti.area, ...ti.options, ti.description],
      target: { section: 'instructions', kind: 'ti', key: ti.key },
    }),
  );

  const piItems = PLAYER_INSTRUCTIONS.map((pi) =>
    toItem({
      value: `pi:${pi.key}`,
      label: pi.name,
      subtitle: `${pi.family} · ${pi.description}`,
      badge: pi.fm27 ? 'FM27 PI' : 'PI',
      badgeTone: pi.fm27 ? 'fm27' : 'info',
      keywords: [pi.key, pi.family, pi.fm27 ? 'fm27 box' : '', pi.description],
      target: { section: 'instructions', kind: 'pi', key: pi.key },
    }),
  );

  const attrItems = ATTRIBUTES.map((attr) =>
    toItem({
      value: `attr:${attr.key}`,
      label: attr.name,
      subtitle: `${attr.category}${attr.meImpact ? ` · FM27 ME ×${attr.meImpact.weight.toFixed(2)}` : ''} · ${attr.summary}`,
      badge: attr.meImpact ? 'ME Attr' : 'Attr',
      badgeTone: attr.meImpact ? 'fm27' : 'muted',
      keywords: [attr.key, attr.category, attr.summary, attr.whatItGoverns, attr.meImpact ? 'meta engine weight' : ''],
      target: { section: 'guides', tab: 'attributes', itemId: attr.key },
    }),
  );

  const conceptItems = CONCEPTS.map((c) =>
    toItem({
      value: `concept:${c.key}`,
      label: c.name,
      subtitle: c.summary,
      badge: 'Concept',
      badgeTone: 'info',
      keywords: [c.key, c.summary, c.ruleOfThumb],
      target: { section: 'guides', tab: 'concepts', itemId: c.key },
    }),
  );

  const troubleshootingItems = TROUBLESHOOTING.map((t) =>
    toItem({
      value: `fix:${t.id}`,
      label: t.symptom,
      subtitle: `${t.category} · ${t.summary}`,
      badge: 'Fix',
      badgeTone: 'warn',
      keywords: [t.category, t.summary, ...t.relatedRoles, ...t.relatedTIs, ...t.relatedPIs],
      target: { section: 'guides', tab: 'troubleshooting', itemId: t.id },
    }),
  );

  const opponentItems = [
    ...OPPONENT_GUIDES.map((g) =>
      toItem({
        value: `opp:${g.key}`,
        label: `Counter ${g.formation}`,
        subtitle: g.structuralCounter,
        badge: 'Counter',
        badgeTone: 'oop',
        keywords: [g.formation, 'opponent', 'counter', g.watchFor],
        target: { section: 'guides', tab: 'opponents', itemId: g.key },
      }),
    ),
    ...OPPOSITION_INSTRUCTIONS.actions.map((a) =>
      toItem({
        value: `oi:${a.key}`,
        label: `OI: ${a.name}`,
        subtitle: `${a.options.join(' / ')} · ${a.summary}`,
        badge: 'OI',
        badgeTone: 'oop',
        keywords: ['opposition instructions', ...a.options, a.summary],
        target: { section: 'guides', tab: 'oi', itemId: a.key },
      }),
    ),
  ];

  const traitItems = PLAYER_TRAITS.map((tr) =>
    toItem({
      value: `trait:${tr.id}`,
      label: tr.name,
      subtitle: `${tr.category} · ${tr.effect}`,
      badge: 'Trait',
      badgeTone: 'muted',
      keywords: ['ppm', 'trait', tr.category, tr.effect, tr.conflictNote],
      target: { section: 'guides', tab: 'traits', itemId: tr.id },
    }),
  );

  const setPieceItems = SET_PIECES.categories.flatMap((cat) =>
    cat.routines.map((r) =>
      toItem({
        value: `sp:${r.id}`,
        label: r.name,
        subtitle: `${cat.title} · ${r.delivery}`,
        badge: 'Set Piece',
        badgeTone: 'info',
        keywords: [cat.title, r.delivery, r.bestWhen],
        target: { section: 'guides', tab: 'set-pieces', itemId: r.id },
      }),
    ),
  );

  const inMatchItems = [
    ...IN_MATCH_GUIDE.tweaks.map((tw) =>
      toItem({
        value: `tweak:${tw.id}`,
        label: `Tweak: ${tw.name}`,
        subtitle: `${tw.category} · ${tw.whenToUse}`,
        badge: 'FM27 Tweak',
        badgeTone: 'fm27',
        keywords: ['tactical tweak', 'in-match', tw.category, tw.whenToUse],
        target: { section: 'guides', tab: 'in-match', itemId: tw.id },
      }),
    ),
    ...IN_MATCH_GUIDE.shouts.map((sh) =>
      toItem({
        value: `shout:${sh.id}`,
        label: `Shout: ${sh.name}`,
        subtitle: sh.bestMatchState,
        badge: 'Shout',
        badgeTone: 'muted',
        keywords: ['touchline shout', 'in-match', sh.bestMatchState, sh.expectedEffect],
        target: { section: 'guides', tab: 'in-match', itemId: sh.id },
      }),
    ),
  ];

  const allItems: CommandData = [
    { type: 'group', label: 'Tactical Presets', items: presetItems },
    { type: 'group', label: 'Roles (IP & OOP)', items: roleItems },
    { type: 'group', label: 'Team Instructions', items: tiItems },
    { type: 'group', label: 'Player Instructions', items: piItems },
    { type: 'group', label: 'Attributes', items: attrItems },
    { type: 'group', label: 'Troubleshooting', items: troubleshootingItems },
    { type: 'group', label: 'Core Concepts', items: conceptItems },
    { type: 'group', label: 'Opponent Counters & OI', items: opponentItems },
    { type: 'group', label: 'Player Traits (PPMs)', items: traitItems },
    { type: 'group', label: 'Set Pieces', items: setPieceItems },
    { type: 'group', label: 'In-Match Tweaks & Shouts', items: inMatchItems },
  ];

  const quickPick = (values: string[]): CommandDataItem[] =>
    values
      .map((v) => entryMap.get(v))
      .filter((e): e is IndexedEntry => Boolean(e))
      .map((e) => ({ value: e.value, label: e.label, keywords: e.keywords }));

  const emptyItems: CommandData = [
    {
      type: 'group',
      label: 'Quick Presets',
      items: quickPick(['preset:high-press-433', 'preset:positional-325', 'preset:asymmetric-4231']),
    },
    {
      type: 'group',
      label: 'Popular Roles & FM27 Box PIs',
      items: quickPick([
        'role:ifb',
        'role:chm',
        'role:f9',
        'role:swk',
        'pi:arrive_late',
        'pi:target_far_post',
      ]),
    },
    {
      type: 'group',
      label: 'Essential Guides & Fixes',
      items: quickPick([
        'concept:effectiveness',
        'concept:rest_def',
        'fix:mid-season-slump',
        'fix:high-possession-low-xg',
      ]),
    },
  ];

  return { allItems, emptyItems, entryMap };
}

const SEARCH_INDEX = buildSearchIndex();

function RenderCommandEntries({
  items,
  entryMap,
}: {
  items: CommandData;
  entryMap: Map<string, IndexedEntry>;
}) {
  return (
    <>
      {items.map((entry, idx) => {
        if (typeof entry !== 'string' && 'type' in entry) {
          if (entry.type === 'separator') {
            return <div key={`sep-${idx}`} className="divider" />;
          }
          return (
            <CommandGroup key={entry.label}>
              <CommandGroupLabel>{entry.label}</CommandGroupLabel>
              <RenderCommandEntries items={entry.items} entryMap={entryMap} />
            </CommandGroup>
          );
        }
        const item: CommandDataItem =
          typeof entry === 'string' ? { value: entry, label: entry } : entry;
        const meta = entryMap.get(item.value);
        return (
          <CommandItem
            key={item.value}
            value={item.value}
            label={item.label}
            keywords={item.keywords}
            className="search-item"
          >
            <div className="search-item-main">
              <CommandItemText className="search-item-title" />
              {meta?.subtitle && <span className="search-item-sub">{meta.subtitle}</span>}
            </div>
            {meta && (
              <span className={`search-item-kind search-item-kind--${meta.badgeTone}`}>
                {meta.badge}
              </span>
            )}
          </CommandItem>
        );
      })}
    </>
  );
}

export function SearchModal({ open, onOpenChange, onSelect }: SearchModalProps) {
  const [query, setQuery] = useState('');

  // Global Ctrl+K / Cmd+K shortcut.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setQuery('');
    onOpenChange(next);
  };

  const handleAction = (value: string) => {
    const meta = SEARCH_INDEX.entryMap.get(value);
    if (!meta) return;
    setQuery('');
    onOpenChange(false);
    onSelect(meta.target);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogBackdrop />
      <DialogContent className="search-dialog">
        <DialogTitle className="sr-only">Search FM27 Tactical Bible</DialogTitle>
        <DialogDescription className="sr-only">
          Jump to any role, team or player instruction, attribute, guide, trait, set piece, or
          troubleshooting fix.
        </DialogDescription>

        <Command
          className="search-command"
          items={SEARCH_INDEX.allItems}
          emptyItems={SEARCH_INDEX.emptyItems}
          query={query}
          onQueryChange={setQuery}
          onAction={handleAction}
          filter="fuzzy"
          autoHighlight
          loop
        >
          <div className="search-input-row">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <circle cx="9" cy="9" r="5.5" />
              <line x1="13.2" y1="13.2" x2="16.8" y2="16.8" strokeLinecap="round" />
            </svg>
            <CommandInput
              aria-label="Search roles, instructions, attributes, and guides"
              placeholder="Search roles, FM24 equivalents, TIs, PIs, attributes, fixes…"
              autoFocus
            />
            <kbd className="kbd">Esc</kbd>
          </div>

          <CommandEmpty className="search-empty">
            No matching role, instruction, attribute, or guide found.
          </CommandEmpty>

          <CommandList className="search-list">
            {(state) => (
              <RenderCommandEntries items={state.items} entryMap={SEARCH_INDEX.entryMap} />
            )}
          </CommandList>

          <div className="search-footer" aria-hidden="true">
            <span>
              <kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> Navigate
            </span>
            <span>
              <kbd className="kbd">Enter</kbd> Jump to item
            </span>
            <span>
              <kbd className="kbd">Esc</kbd> Close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
