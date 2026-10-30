import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

/** Vite setup: one Node server serves the pages, and unit tests run with Vitest. */
export default defineConfig({
  plugins: [sveltekit({ adapter: adapter() })],
  test: { include: ['src/**/*.test.ts'] },
});
