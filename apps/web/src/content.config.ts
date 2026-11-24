import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const src = z.enum(['conf', 'est']);

const roles = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/roles' }),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    ab: z.string(),
    phase: z.enum(['IP', 'OOP']),
    groups: z.array(z.string()),
    summary: z.string(),
    tip: z.string(),
    keyAttrs: z.array(z.string()),
    prefAttrs: z.array(z.string()),
    scenes: z.array(z.string()),
    src,
  }),
});

const instruction = z.object({
  key: z.string(),
  name: z.string(),
  phase: z.string().optional(),
  options: z.array(z.string()).optional(),
  default: z.number().optional(),
  summary: z.string(),
  scenes: z.array(z.string()),
  src,
  fm27: z.boolean().optional(),
});

const teamInstructions = defineCollection({ loader: glob({ pattern: '*.mdx', base: './src/content/team-instructions' }), schema: instruction });
const playerInstructions = defineCollection({ loader: glob({ pattern: '*.mdx', base: './src/content/player-instructions' }), schema: instruction });

const concepts = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/concepts' }),
  schema: z.object({ key: z.string(), name: z.string(), summary: z.string(), scenes: z.array(z.string()), src }),
});

const attributes = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/attributes' }),
  schema: z.object({ key: z.string(), name: z.string(), cat: z.enum(['T', 'M', 'F', 'G']), summary: z.string() }),
});

export const collections = { roles, 'team-instructions': teamInstructions, 'player-instructions': playerInstructions, concepts, attributes };
