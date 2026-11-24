# AGENTS.md

- Before using ui-sdk, read `node_modules/@ui-sdk/react/docs/llms.txt`, then only the component pages you need. Import from component entries (`@ui-sdk/react/select`), never package roots.
- `packages/sim` is pure TypeScript: no DOM, no React, no Astro imports. It must stay deterministic (seeded RNG only, no `Math.random`, no wall clock).
- Every simulation parameter (`ATTR_MODEL`, `TI_EFFECTS`, `PI_EFFECTS`, role profiles) carries `src: 'conf' | 'est'` and a `note`. Use `'conf'` only when the note names a public source.
- Tuning edits only `OVERRIDES` in `packages/content/src/roles/profiles.ts`, the instruction effects and `ATTR_MODEL` constants. Record what changed and why in the entry's `note` and in `packages/content/TUNING.md`.
- `packages/content/data/*.json` is the knowledge base. Edit it by hand; `profiles.generated.ts` and the MDX seeds are regenerated from it with the scripts in `packages/content/scripts/`.
- The UI is English only.
- Keep `README.md` updated in the same change as the code.
- Verify with `npm test`, `npm run build` and `npm run e2e`.
