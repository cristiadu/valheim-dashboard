import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

/**
 * Vite setup: one Node server serves the pages. Unit tests check one file, and integration tests follow a real
 * log folder through several files at once.
 */
export default defineConfig({
  plugins: [sveltekit({ adapter: adapter() })],
  test: {
    projects: [
      { extends: true, test: { name: 'unit', include: ['src/**/*.test.ts'], exclude: ['src/**/*.integration.test.ts'] } },
      { extends: true, test: { name: 'integration', include: ['src/**/*.integration.test.ts'] } },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,svelte}'],
      exclude: ['src/**/*.test.ts', 'src/lib/test-*.ts'],
      reporter: ['cobertura', 'text-summary'],
    },
  },
});
