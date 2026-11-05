import { defineConfig } from 'vitest/config';

// Used only by meta.test.ts to run ratchet-fixture.ts in a child vitest. The fixture's name does not
// match the default `*.test.*` include, so the outer run never picks it up on its own.
export default defineConfig({ test: { include: ['ratchet-fixture.ts'], typecheck: { enabled: false } } });
