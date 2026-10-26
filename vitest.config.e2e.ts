// vitest.config.e2e.ts
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup-env.ts'],
    fileParallelism: false, // os arquivos compartilham o mesmo banco
    testTimeout: 20000,
    hookTimeout: 30000, // subir o app na primeira vez pode demorar
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});