// vitest.config.ts
// Vitest uses this file instead of vite.config.ts so tests run from the repo
// root rather than from src/renderer (which vite.config.ts uses for the
// Electron renderer bundle).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
    include: ['src/**/*.{test,spec}.ts'],
    environment: 'node',
    globals: false,
    passWithNoTests: false,
  },
});
