# FM27 Tactical Bible

An interactive, single-page tactical guide and pitch board for Football Manager 27 roles, team and player instructions, tactical concepts, attributes, and match-management playbooks.

> **Model disclaimer.** Pitch shapes, 3×3 ball-zone shifts, 35-zone coverage scores, and tactical diagnostics are an educational model of FM27 tactical intent, not the Football Manager match engine. Verified public references carry `CONF` citations; estimated tactical weights carry `EST` notes. Open **Guides → Sources & Model** for all 17 verified sources.

## Architecture

Single-project **Vite 7 + React 19 + TypeScript + `@ui-sdk/react`** SPA with a unified horizontal 105×68 SVG pitch (`src/components/PitchSvg.tsx`) and a pure deterministic tactical engine (`src/engine/`).

| Path | What it is |
| --- | --- |
| `src/data/` | Structured English knowledge base: 77 FM26/FM27 roles (39 IP + 38 OOP with FM24 legacy equivalents), 17 formations, 27 Team Instructions across 5 areas, 24 Player Instructions (including the 5 FM27 Box-Attacking PIs and symmetric mutual exclusions), 7 Mentalities, 6 validated FM27 tactical presets, 47 Attributes with `FM27_ME_WEIGHTS`, 10 Core Concepts, 6 Opponent Counter Guides, Opposition Instructions, 18 Player Traits, 12 Set-Piece Routines, 9 Troubleshooting Playbooks, FM27 In-Match Tweaks & Shouts, and 17 verified public sources. |
| `src/engine/` | Pure deterministic TypeScript engine (no DOM/React imports, no `Math.random`): `pitch.ts` (bounds-clamped 105×68 diagram builders for tactics, 3×3 ball zones, all 77 roles, all 27 TIs, and all 24 PIs), `analysis.ts` (7×5 35-zone coverage heatmap, valid role-swap suggestions, IP↔OOP transition distances, FM27 Tactical Complexity & coherence diagnostics), `roleTools.ts` (Role Fit Finder & Side-by-Side Role Comparator), and `tacticIO.ts` (URL hash serialization, lossless `tactical-bible-v1` JSON export/import, and `.fmf` binary inspection). |
| `src/components/` | Unified `PitchSvg`, 4-item responsive `Sidebar` (with mobile drawer), and global `Ctrl+K` / `⌘K` `SearchModal`. |
| `src/views/` | Four focused views: `TacticsView`, `RolesView`, `InstructionsView`, and `GuidesView`. |

## Four Sections

1. **Tactics Board** — Pitch-first workspace with `Shape`, `3×3 Zones`, and `Coverage` modes, `In Possession` / `Out of Possession` / `Combined` phase switching, 6 curated FM27 presets, shareable URL links, `.json` / `.fmf` import & export, clickable role-swap fixes, and a 3-tab right panel:
   - **Setup**: IP/OOP formations, Mentality, inline Opponent Counter & OI tips, and grouped Team Instructions with 1-click inspection links.
   - **Player**: Click any pitch token to edit paired IP & OOP roles and position-filtered Player Instructions (automatically enforcing mutual exclusions).
   - **Analysis**: Plain-English diagnostics (warnings first), FM27 Tactical Complexity & ~3-week decay guidance, structural metrics, and IP↔OOP shift distance table.
2. **Roles** — Searchable catalog of all 77 IP & OOP roles (including FM24 legacy names) with live pitch diagrams, **Role Fit Finder** (archetype presets + Pure Role vs FM27 ME-Weighted scoring), and **Compare Roles** side-by-side comparator.
3. **Instructions** — Interactive before/after pitch diagrams for all 27 Team Instructions and 24 Player Instructions (including FM27 Box-Attacking depth & target-zone PIs), attribute requirements, mutual exclusions, and 1-click "Open in Tactics Board".
4. **Guides** — Tabbed reference covering Core Concepts, Attributes (all 47 + FM27 ME weights), Opponent Counters, Opposition Instructions, Player Traits, Set Pieces, Troubleshooting, In-Match Tweaks & Shouts, and Sources & Model methodology.

Global **`Ctrl+K` / `⌘K`** quick search jumps straight to any preset, role, instruction, attribute, or guide from anywhere in the app.

## Commands

Requires Node 22 or newer.

```bash
npm install
npm run dev         # Vite dev server
npm test            # Vitest unit tests (data integrity + tactical engine)
npm run typecheck   # Strict TypeScript check (tsc --noEmit)
npm run build       # Production static bundle in dist/
npm run e2e         # Playwright E2E test suite against built preview
```

## Deployment

Hosted on Cloudflare Workers as static assets (Worker `tactical-bible-web`, config in `wrangler.jsonc`; unknown paths fall back to `index.html`). Every push to `main` that passes CI is deployed by the `deploy` job in `.github/workflows/ci.yml`. It needs two repository secrets: `CLOUDFLARE_API_TOKEN` (token with the *Workers Scripts: Edit* account permission) and `CLOUDFLARE_ACCOUNT_ID`.

Manual deploy: `npm run build && npx wrangler deploy`.
