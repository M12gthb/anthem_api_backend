import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup-env.ts'],
    fileParallelism: false, 
    testTimeout: 20000,
    hookTimeout: 30000, 
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});