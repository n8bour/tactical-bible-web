# FM27 Tactical Bible (web)

An interactive, installable guide to Football Manager 27 roles, team and player instructions, and tactical concepts.
Every role and instruction page embeds a live 2D pitch: change a player's attributes, roles or instructions and see the effect on him and on the team, side by side with an unchanged baseline.

> **Model disclaimer.** The simulation is a model of the FM match engine's intent, tuned by hand. It is not the engine.
> Every parameter carries a source tag: **CONF** = confirmed by public sources, **EST** = estimated.

## What's inside

| Path | What it is |
| --- | --- |
| `packages/sim` | Deterministic agent simulation in pure TypeScript (no DOM). Attributes drive perception, decisions, movement and execution through `ATTR_MODEL` (`src/attributes.ts`); team shape and phases live in `src/tactics.ts`; `resolveMods` (`src/mods.ts`) is the only place role profiles, team instructions and player instructions combine. |
| `packages/content` | The knowledge base (`data/*.json`), role profiles (`src/roles/profiles.ts` = generated drafts + hand `OVERRIDES`), instruction effects (`src/instructions/effects.ts`) and the 136 lesson scenes (`src/scenes/`). |
| `apps/web` | Astro 5 static site with React 19 islands, PixiJS v8 renderer and ui-sdk controls. MDX content lives in `src/content/`. |

### Pages

- **Tactics board** (`/tactics`): choose your shapes with and without the ball, the opponent, mentality and every team instruction. "In possession" shows your team attacking, "Out of possession" shows the opponent attacking your block. Instruction pages deep-link into it (`?tab=ip|oop&ti=key:option`, `&pi=key&slot=CODE`).
- **Role explorer** (every `/roles/<id>` page): pick formation and position, the role with and without the ball, then change attributes. The same move replays beside a faded default player and a "What changes" box lists the model numbers before/after and what he did differently.
- **Instruction pages**: a static, build-time before/after diagram computed from the simulation, plus an "Open in tactics board" button.
- **Concept pages**: explanatory pitch diagrams; interactive only where a control teaches something (width, pressing coherence, IP/OOP, rest-defence, box, outlets).
- **Sandbox** (`/lab`): free play on either team.

Overlays: vision cone, decision options, press radii, runs, tactical positions, lines, trail. The "Why" panel shows the latest decision with its top terms. Attribute pages and role pages generate their model tables from `ATTR_MODEL`.

## Commands

Node 22 or newer.

```bash
npm install
npm run dev -w apps/web     # local dev server
npm test                    # Vitest: sim behaviour + instruction effects + coverage
npm run typecheck           # tsc for sim/content, astro check for the web app
npm run build               # static site in apps/web/dist (PWA included)
npm run e2e                 # Playwright: Stay Wider widens the winger against the baseline
npm run tuning:report       # regenerates packages/content/TUNING.md from the scenes
npm run draft:profiles      # regenerates profiles.generated.ts from data/roles.json + role-anchors.json
npm run seed:content        # creates missing MDX pages from data/*.json (never overwrites; --force to reset)
npm run icons -w apps/web   # regenerates PWA icons from apps/web/public/icon.svg
```

## Tuning

Tune only `OVERRIDES` in `packages/content/src/roles/profiles.ts`, `TI_EFFECTS`/`PI_EFFECTS` in `packages/content/src/instructions/effects.ts` and the constants in `packages/sim/src/attributes.ts`. Record the reason in the entry's `note`, regenerate `TUNING.md`, and set the row's status (`ok`, `tuned`, `open`) by hand after watching the scene.

## Knowledge base

`packages/content/data/*.json` is this repo's own English knowledge base (77 roles, 27 team instructions, 24 player instructions, 10 concepts, 47 attributes, formations, mentalities, opponents and per-role reference positions). It was extracted once from the earlier Tactical Architect app and is now edited here directly; nothing reads that app at build or run time.

## Hosting

The build output is plain static files with relative-to-`base` URLs, so any static host works. On Cloudflare Pages use build command `npm run build` and output directory `apps/web/dist`. The site is a PWA: it is precached, works offline and can be installed.
