// Creates one MDX file per role, instruction, concept and attribute in apps/web/src/content from data/*.json.
// Existing files are kept (they hold curated text); pass --force to overwrite.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const data = (f) => JSON.parse(readFileSync(join(here, '../data', f), 'utf8'));
const out = join(here, '../../../apps/web/src/content');
const force = process.argv.includes('--force');

const yaml = (v) => JSON.stringify(v);
const front = (obj) => `---\n${Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${yaml(v)}`).join('\n')}\n---\n`;
let written = 0;
function write(dir, name, fm, body) {
  mkdirSync(join(out, dir), { recursive: true });
  const file = join(out, dir, `${name}.mdx`);
  if (existsSync(file) && !force) return;
  writeFileSync(file, `${front(fm)}\n${body.trim()}\n`);
  written++;
}
const TODO = 'TODO(content)';

for (const r of data('roles.json')) {
  write('roles', r.id, {
    id: r.id, name: r.name, ab: r.ab, phase: r.phase, groups: r.groups, summary: r.desc, tip: r.tip,
    keyAttrs: r.key, prefAttrs: r.pref, scenes: [`role-${r.id}`], src: r.src,
  }, `
## What it does by phase

${r.moveNote ? `Key moment (${r.movePhase}): ${r.moveNote}.` : r.desc}

${TODO}

## How attributes change it

${TODO}

## Pairs well with

${r.tip}

${TODO}

## Common mistakes

${TODO}
`);
}

for (const t of data('team-instructions.json')) {
  write('team-instructions', t.key, {
    key: t.key, name: t.name, phase: t.phase, options: t.options, default: t.default, summary: t.desc,
    scenes: [`ti-${t.key}`], src: 'est', fm27: t.fm27,
  }, `
## What it changes

${t.desc}

${TODO}

## Who needs which attributes

${TODO}

## Pros / cons

- **Pros:** ${t.pro}
- **Cons:** ${t.con}
`);
}

for (const p of data('player-instructions.json')) {
  write('player-instructions', p.key, {
    key: p.key, name: p.name, summary: p.desc, scenes: [`pi-${p.key}`], src: 'est', fm27: p.fm27,
  }, `
## What it changes

${p.desc}

${TODO}

## Who needs which attributes

${p.tip}

${TODO}

## Pros / cons

${TODO}
`);
}

for (const c of data('concepts.json')) {
  write('concepts', c.key, { key: c.key, name: c.name, summary: c.text.split('. ')[0] + '.', scenes: c.scene ? [`concept-${c.key}`] : [], src: 'est' }, `
${c.text}

${TODO}
`);
}

for (const a of data('attributes.json')) {
  write('attributes', a.key, { key: a.key, name: a.name, cat: a.cat, summary: `${a.name}.` }, `
${TODO}
`);
}

console.log('written', written);
