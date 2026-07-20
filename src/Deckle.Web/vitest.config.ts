import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  // The Svelte plugin lets component tests (`// @vitest-environment jsdom`)
  // compile `.svelte` files; pure-module tests still run on node by default.
  plugins: [svelte(), svelteTesting()],
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
      '$env/dynamic/public': resolve(__dirname, 'src/test/mocks/env.ts'),
      // SvelteKit runtime modules aren't provided by the bare Svelte plugin;
      // mock them so component tests can import editor UI that touches them.
      '$app/stores': resolve(__dirname, 'src/test/mocks/app-stores.ts'),
      '$app/navigation': resolve(__dirname, 'src/test/mocks/app-navigation.ts')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}']
  }
});
