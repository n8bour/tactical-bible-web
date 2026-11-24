import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['packages/content/scripts/tuning-report.test.ts'] } });
