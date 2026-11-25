# AGENTS.md

- Before using ui-sdk, read `node_modules/@ui-sdk/react/docs/llms.txt`, then only the component pages you need. Import from component entries (`@ui-sdk/react/select`), never package roots.
- Scope `modern-web-guidance` strictly to `apps/web` (HTML/CSS, Astro pages/layouts, accessibility, CWV/performance, PWA, and client-side DOM/UX outside PixiJS canvas internals in `apps/web/src/lab/PitchRenderer.ts`). Never trigger it for `packages/sim`, `packages/content`, or build/test tooling.
- Precedence between `ui-sdk` and `modern-web-guidance`: use `@ui-sdk/react` first for any interactive control it provides (do not replace `ui-sdk` primitives with raw HTML controls from `modern-web-guidance`). Apply `modern-web-guidance` to layout CSS, Astro/PWA patterns, accessibility, performance, and native web APIs not covered by `ui-sdk`, targeting Baseline Widely Available features (or applying the guide's fallbacks for newer features).
- `packages/sim` is pure TypeScript: no DOM, no React, no Astro imports. It must stay deterministic (seeded RNG only, no `Math.random`, no wall clock).
- Every simulation parameter (`ATTR_MODEL`, `TI_EFFECTS`, `PI_EFFECTS`, role profiles) carries `src: 'conf' | 'est'` and a `note`. Use `'conf'` only when the note names a public source.
- Tuning edits only `OVERRIDES` in `packages/content/src/roles/profiles.ts`, the instruction effects and `ATTR_MODEL` constants. Record what changed and why in the entry's `note` and in `packages/content/TUNING.md`.
- `packages/content/data/*.json` is the knowledge base. Edit it by hand; `profiles.generated.ts` and the MDX seeds are regenerated from it with the scripts in `packages/content/scripts/`.
- The UI is English only.
- Keep `README.md` updated in the same change as the code.
- Verify with `npm test`, `npm run build` and `npm run e2e`.
