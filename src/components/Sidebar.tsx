import { useState, type ReactNode } from 'react';
import { Button } from '@ui-sdk/react/button';
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from '@ui-sdk/react/drawer';

export type NavSection = 'tactics' | 'roles' | 'instructions' | 'guides';

export interface SidebarProps {
  active: NavSection;
  onNavigate: (section: NavSection) => void;
  onOpenSearch: () => void;
  onOpenSources: () => void;
}

interface NavItem {
  id: NavSection;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'tactics',
    label: 'Tactics Board',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="2.25" y="3.5" width="15.5" height="13" rx="2" />
        <line x1="10" y1="3.5" x2="10" y2="16.5" />
        <circle cx="10" cy="10" r="2.3" />
      </svg>
    ),
  },
  {
    id: 'roles',
    label: 'Roles',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="10" cy="6.5" r="3" />
        <path d="M4.5 16c0-2.6 2.5-4.5 5.5-4.5s5.5 1.9 5.5 4.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'instructions',
    label: 'Instructions',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <line x1="3.5" y1="6" x2="16.5" y2="6" strokeLinecap="round" />
        <circle cx="7.5" cy="6" r="1.75" fill="var(--surface)" />
        <line x1="3.5" y1="10.5" x2="16.5" y2="10.5" strokeLinecap="round" />
        <circle cx="13" cy="10.5" r="1.75" fill="var(--surface)" />
        <line x1="3.5" y1="15" x2="16.5" y2="15" strokeLinecap="round" />
        <circle cx="9" cy="15" r="1.75" fill="var(--surface)" />
      </svg>
    ),
  },
  {
    id: 'guides',
    label: 'Guides',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path
          d="M4 4.5A2 2 0 0 1 6 3h4v13.5H6a2 2 0 0 0-2 1.5V4.5Z"
          strokeLinejoin="round"
        />
        <path
          d="M16 4.5A2 2 0 0 0 14 3h-4v13.5h4a2 2 0 0 1 2 1.5V4.5Z"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

function BrandMark() {
  return (
    <div className="sidebar-brand">
      <span className="sidebar-brand-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
          <line x1="12" y1="4.5" x2="12" y2="19.5" />
          <circle cx="12" cy="12" r="2.8" />
        </svg>
      </span>
      <span className="sidebar-brand-text">
        <strong>FM27</strong> Tactical Bible
      </span>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="9" cy="9" r="5.5" />
      <line x1="13.2" y1="13.2" x2="16.8" y2="16.8" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <line x1="3.5" y1="5.5" x2="16.5" y2="5.5" strokeLinecap="round" />
      <line x1="3.5" y1="10" x2="16.5" y2="10" strokeLinecap="round" />
      <line x1="3.5" y1="14.5" x2="16.5" y2="14.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <line x1="5" y1="5" x2="15" y2="15" strokeLinecap="round" />
      <line x1="15" y1="5" x2="5" y2="15" strokeLinecap="round" />
    </svg>
  );
}

function SidebarBody({
  active,
  onNavigate,
  onOpenSearch,
  onOpenSources,
  onAfterAction,
}: SidebarProps & { onAfterAction?: () => void }) {
  const isApple =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform ?? '');

  return (
    <>
      <Button
        className="sidebar-search"
        onClick={() => {
          onAfterAction?.();
          onOpenSearch();
        }}
        aria-label="Open command search"
      >
        <span className="sidebar-search-left">
          <SearchIcon />
          <span>Search…</span>
        </span>
        <kbd className="kbd">{isApple ? '⌘K' : 'Ctrl+K'}</kbd>
      </Button>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const isCurrent = active === item.id;
          return (
            <Button
              key={item.id}
              className="sidebar-nav-btn"
              data-active={isCurrent || undefined}
              aria-current={isCurrent ? 'page' : undefined}
              onClick={() => {
                onNavigate(item.id);
                onAfterAction?.();
              }}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <Button
          className="sidebar-sources-link"
          onClick={() => {
            onOpenSources();
            onAfterAction?.();
          }}
        >
          Sources &amp; Model
        </Button>
        <p className="sidebar-disclaimer">Model guide, not the game engine</p>
      </div>
    </>
  );
}

export function Sidebar({ active, onNavigate, onOpenSearch, onOpenSources }: SidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar + slide-over navigation drawer (< 900px) */}
      <header className="mobile-topbar">
        <Drawer side="left" open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger className="mobile-icon-btn" aria-label="Open navigation menu">
            <MenuIcon />
          </DrawerTrigger>
          <DrawerBackdrop />
          <DrawerContent className="mobile-nav-drawer">
            <div className="mobile-nav-drawer-header">
              <DrawerTitle className="sr-only">Navigation</DrawerTitle>
              <BrandMark />
              <DrawerClose className="mobile-icon-btn" aria-label="Close navigation menu">
                <CloseIcon />
              </DrawerClose>
            </div>
            <div className="mobile-nav-drawer-body">
              <SidebarBody
                active={active}
                onNavigate={onNavigate}
                onOpenSearch={onOpenSearch}
                onOpenSources={onOpenSources}
                onAfterAction={() => setDrawerOpen(false)}
              />
            </div>
          </DrawerContent>
        </Drawer>

        <BrandMark />

        <Button
          className="mobile-icon-btn"
          aria-label="Search"
          onClick={onOpenSearch}
        >
          <SearchIcon />
        </Button>
      </header>

      {/* Desktop persistent left sidebar (>= 900px) */}
      <aside className="sidebar" aria-label="Sidebar">
        <BrandMark />
        <SidebarBody
          active={active}
          onNavigate={onNavigate}
          onOpenSearch={onOpenSearch}
          onOpenSources={onOpenSources}
        />
      </aside>
    </>
  );
}
