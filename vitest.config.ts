import { defineConfig } from 'vitest/config';

// Tests laufen ohne DOM: Scoring, Import und Statistik sind reine Funktionen.
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts', 'worker/**/*.test.ts'] },
});
