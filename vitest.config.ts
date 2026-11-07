import { defineConfig } from 'vitest/config';

// Real-process / real-port tests ("tools": dev-env spawns servers and stubs, pack runs
// `npm pack`) must never overlap with unit tests that bind ephemeral or random ports and
// assert on connection counts (issue #232). Two projects: units first, tools after, and
// tools run one file at a time. One `npm run test -- --run` still runs everything.
const TOOLS = [
  'scripts/__tests__/dev-env.test.ts',
  'packages/c123-contract/__tests__/pack.test.ts',
  // child vitest processes: the real conformance suite and the ratchet fixture (issue #200)
  'src/__tests__/conformance/suite-runs.test.ts',
  // a real child process rewriting a real file under the real XML reader (issue #202)
  'src/ingest/__tests__/xml-reader.real.test.ts',
  // a real child process killed between the temporary file and the rename (issue #211)
  'src/store/__tests__/checks.real.test.ts',
  // child processes replaying recordings through the real parsers and core (issue #242)
  'scripts/__tests__/replay-direct.test.ts',
];
const EXCLUDE = ['dist/**', 'node_modules/**'];

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          exclude: [...EXCLUDE, ...TOOLS],
          sequence: { groupOrder: 1 },
          // Type-level tests of the contract package (issue #199): expectTypeOf is a no-op at
          // runtime, so exactly these files are run through tsc by vitest's typecheck mode.
          typecheck: {
            enabled: true,
            include: ['packages/c123-contract/__tests__/*.test-d.ts'],
            tsconfig: 'packages/c123-contract/__tests__/tsconfig.json',
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'tools',
          include: TOOLS,
          exclude: EXCLUDE,
          sequence: { groupOrder: 2 },
          fileParallelism: false,
        },
      },
    ],
  },
});
