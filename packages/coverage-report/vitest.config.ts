import { defineConfig } from 'vitest/config';

/** Test setup: unit tests check one file, integration tests run the command on real coverage files. */
export default defineConfig({
  test: {
    projects: [
      { extends: true, test: { name: 'unit', include: ['test/**/*.test.ts'], exclude: ['test/**/*.integration.test.ts'] } },
      { extends: true, test: { name: 'integration', include: ['test/**/*.integration.test.ts'] } },
    ],
    coverage: { provider: 'v8', include: ['src/**/*.ts'], reporter: ['cobertura', 'text-summary'] },
  },
});
