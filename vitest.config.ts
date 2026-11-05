import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['dist/**', 'node_modules/**'],
    // Type-level tests of the contract package (issue #199): expectTypeOf is a no-op at
    // runtime, so exactly these files are run through tsc by vitest's typecheck mode.
    typecheck: {
      enabled: true,
      include: ['packages/c123-contract/__tests__/*.test-d.ts'],
      tsconfig: 'packages/c123-contract/__tests__/tsconfig.json',
    },
  },
});
