# AGENTS.md

## Context & Token Hygiene

- **Do not read, search, or list** generated or vendored paths:
  - `node_modules/`
  - `dist/`
  - `.wrangler/`
  - `test-results/`, `playwright-report/`
  - `.git/`
  - `package-lock.json` (large lockfile — check `package.json` instead)
- When searching or listing files, scope to `src/`, `test/`, `e2e/`, or `public/` rather than recursing from the repository root.

## Project Structure

- `src/data/` — Structured tactical knowledge base (roles, formations, instructions, attributes, guides, sources).
- `src/engine/` — Pure deterministic TypeScript tactical engine (no DOM/React imports, no `Math.random`).
- `src/components/` & `src/views/` — React 19 + `@ui-sdk/react` UI (`TacticsView`, `RolesView`, `InstructionsView`, `GuidesView`).
- `test/` — Vitest unit tests (data integrity + engine).
- `e2e/` — Playwright end-to-end tests.

## Commands

Requires Node `>=22`:

- `npm run typecheck` — Strict TypeScript check (`tsc --noEmit`)
- `npm test` — Vitest unit tests (`vitest run`)
- `npm run build` — Production build (`vite build` → `dist/`)
- `npm run e2e` — Playwright E2E suite (runs against built preview)

## Conventions

- Keep `README.md` updated in the same change as the code.
- Keep `src/engine/` pure and deterministic (no React/DOM imports or `Math.random`).
