import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@text-trace/core': fileURLToPath(new URL('../packages/core/src/index.ts', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0'
  }
});
