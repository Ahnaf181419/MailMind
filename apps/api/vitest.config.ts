import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/__tests__/*.test.ts'],
  },
  resolve: {
    alias: {
      '@mailmind/shared': new URL('../../../packages/shared/src/index.ts', import.meta.url).pathname,
      '@mailmind/shared/types': new URL('../../../packages/shared/src/types.ts', import.meta.url).pathname,
      '@mailmind/shared/categories': new URL('../../../packages/shared/src/categories.ts', import.meta.url).pathname,
      '@mailmind/shared/envelope': new URL('../../../packages/shared/src/envelope.ts', import.meta.url).pathname,
    },
  },
});
