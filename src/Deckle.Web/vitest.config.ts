import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
      '$env/dynamic/public': resolve(__dirname, 'src/test/mocks/env.ts')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}']
  }
});
