import { useCallback, useState } from 'react';
import './styles/app.css';
import { Sidebar, type NavSection } from './components/Sidebar';
import { SearchModal, type GuideTabId, type SearchTarget } from './components/SearchModal';
import { PI_BY_KEY, TI_DEFAULTS, type PIKey } from './data';
import {
  defaultTacticConfig,
  getFormation,
  parseTacticFromHash,
  type TacticConfig,
} from './engine';
import { TacticsView } from './views/TacticsView';
import { RolesView } from './views/RolesView';
import { InstructionsView } from './views/InstructionsView';
import { GuidesView } from './views/GuidesView';

function hydrateInitialTactic(): TacticConfig {
  const base = defaultTacticConfig('high-press-433');
  if (typeof window === 'undefined' || !window.location.hash) return base;
  const parsed = parseTacticFromHash(window.location.hash);
  if (!parsed) return base;

  const ipFormation = parsed.ipFormation ?? base.ipFormation;
  const oopFormation = parsed.oopFormation ?? base.oopFormation;
  const ipForm = getFormation(ipFormation);
  const oopForm = getFormation(oopFormation);

  const ipRoles: Record<string, string> = {};
  for (const s of ipForm.slots) {
    ipRoles[s.code] = parsed.ipRoles?.[s.code] ?? base.ipRoles[s.code] ?? s.defaultIpRole;
  }

  const oopRoles: Record<string, string> = {};
  for (const s of oopForm.slots) {
    oopRoles[s.code] = parsed.oopRoles?.[s.code] ?? base.oopRoles[s.code] ?? s.defaultOopRole;
  }

  return {
    name: parsed.name ?? base.name,
    ipFormation,
    oopFormation,
    mentality: parsed.mentality ?? base.mentality,
    tis: { ...TI_DEFAULTS, ...(parsed.tis ?? base.tis) },
    ipRoles,
    oopRoles,
    pis: parsed.pis ?? base.pis,
  };
}

export function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('tactics');
  const [config, setConfig] = useState<TacticConfig>(() => hydrateInitialTactic());
  const [searchOpen, setSearchOpen] = useState(false);

  const [rolesFocus, setRolesFocus] = useState<{
    roleId: string | null;
    subTab: 'browse' | 'finder' | 'compare';
    nonce: number;
  }>({ roleId: null, subTab: 'browse', nonce: 0 });

  const [instructionsFocus, setInstructionsFocus] = useState<{
    kind: 'ti' | 'pi';
    key: string | null;
    nonce: number;
  }>({ kind: 'ti', key: null, nonce: 0 });

  const [guidesFocus, setGuidesFocus] = useState<{
    tab: GuideTabId;
    itemId: string | null;
    nonce: number;
  }>({ tab: 'concepts', itemId: null, nonce: 0 });

  const jumpToRole = useCallback((roleId: string, subTab: 'browse' | 'finder' | 'compare' = 'browse') => {
    setRolesFocus((prev) => ({ roleId, subTab, nonce: prev.nonce + 1 }));
    setActiveSection('roles');
  }, []);

  const jumpToInstruction = useCallback((kind: 'ti' | 'pi', key: string) => {
    setInstructionsFocus((prev) => ({ kind, key, nonce: prev.nonce + 1 }));
    setActiveSection('instructions');
  }, []);

  const jumpToGuide = useCallback((tab: GuideTabId, itemId: string | null = null) => {
    setGuidesFocus((prev) => ({ tab, itemId, nonce: prev.nonce + 1 }));
    setActiveSection('guides');
  }, []);

  const jumpToAttribute = useCallback(
    (attrKey: string) => {
      jumpToGuide('attributes', attrKey);
    },
    [jumpToGuide],
  );

  const loadPresetInTactics = useCallback((presetId: string) => {
    setConfig(defaultTacticConfig(presetId));
    setActiveSection('tactics');
  }, []);

  const openInstructionInTactics = useCallback(
    (patch: { ti?: [string, number]; pi?: string }) => {
      setConfig((prev) => {
        let next = { ...prev };
        if (patch.ti) {
          const [tiKey, optIdx] = patch.ti;
          next = {
            ...next,
            tis: { ...next.tis, [tiKey]: optIdx },
          };
        }
        if (patch.pi) {
          const piKey = patch.pi as PIKey;
          const def = PI_BY_KEY[piKey];
          if (def) {
            const form = getFormation(next.ipFormation);
            const targetSlot =
              form.slots.find((s) => def.allowedGroups.includes(s.group) && s.group === 'ST') ??
              form.slots.find((s) => def.allowedGroups.includes(s.group));
            if (targetSlot) {
              const existing = next.pis[targetSlot.code] ?? [];
              const incompatible = new Set(def.incompatibleWith);
              const updatedList = [
                ...existing.filter((k) => k !== piKey && !incompatible.has(k)),
                piKey,
              ];
              next = {
                ...next,
                pis: { ...next.pis, [targetSlot.code]: updatedList },
              };
            }
          }
        }
        return next;
      });
      setActiveSection('tactics');
    },
    [],
  );

  const handleSearchSelect = useCallback(
    (target: SearchTarget) => {
      if (target.section === 'tactics') {
        if (target.presetId) {
          setConfig(defaultTacticConfig(target.presetId));
        }
        setActiveSection('tactics');
      } else if (target.section === 'roles') {
        jumpToRole(target.roleId, 'browse');
      } else if (target.section === 'instructions') {
        jumpToInstruction(target.kind, target.key);
      } else if (target.section === 'guides') {
        jumpToGuide(target.tab, target.itemId ?? null);
      }
    },
    [jumpToGuide, jumpToInstruction, jumpToRole],
  );

  return (
    <div className="app-shell">
      <Sidebar
        active={activeSection}
        onNavigate={setActiveSection}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenSources={() => jumpToGuide('sources')}
      />

      <main className="main-pane">
        {activeSection === 'tactics' && (
          <TacticsView
            config={config}
            onChangeConfig={setConfig}
            onJumpToRole={(roleId: string) => jumpToRole(roleId)}
            onJumpToInstruction={jumpToInstruction}
            onJumpToGuide={(tab) => jumpToGuide(tab)}
          />
        )}

        {activeSection === 'roles' && (
          <RolesView
            key={`roles-${rolesFocus.nonce}`}
            initialRoleId={rolesFocus.roleId}
            initialSubTab={rolesFocus.subTab}
            onJumpToAttribute={jumpToAttribute}
          />
        )}

        {activeSection === 'instructions' && (
          <InstructionsView
            key={`instructions-${instructionsFocus.nonce}`}
            initialKind={instructionsFocus.kind}
            initialKey={instructionsFocus.key}
            onJumpToAttribute={jumpToAttribute}
            onOpenInTactics={openInstructionInTactics}
          />
        )}

        {activeSection === 'guides' && (
          <GuidesView
            key={`guides-${guidesFocus.nonce}`}
            initialTab={guidesFocus.tab}
            initialItemId={guidesFocus.itemId}
            onJumpToRole={(roleId: string) => jumpToRole(roleId)}
            onJumpToInstruction={jumpToInstruction}
            onLoadPresetInTactics={loadPresetInTactics}
          />
        )}
      </main>

      <SearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={handleSearchSelect}
      />
    </div>
  );
}
