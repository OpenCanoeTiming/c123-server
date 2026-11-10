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
  // data gate: committed re-run excerpts and one real window through replay-direct and the gate-2 checker (issue #207)
  'scripts/__tests__/rerun-paths.test.ts',
  // data gate: synthetic outage recording and stated real outages through replay-direct and the gate-2 checker (issue #208)
  'scripts/__tests__/outage.test.ts',
  // the on-site process fed by player.js over real sockets, compared with the direct-injection replay (issue #210)
  'scripts/__tests__/onsite-process.test.ts',
  // the write path against player.js (issue #212)
  'scripts/__tests__/onsite-write.test.ts',
  // the production clock wiring of the on-site entry, a real child process (issue #210)
  'src/onsite/__tests__/main-clock.real.test.ts',
  // `npm run gates` against a fake protocol-docs directory; its stub data-gate test files run only as children of it (issue #313)
  'scripts/__tests__/gates.test.ts',
  'scripts/__tests__/fixtures/gates/stub-pass.test.ts',
  'scripts/__tests__/fixtures/gates/stub-skip.test.ts',
  'scripts/__tests__/fixtures/gates/stub-env.test.ts',
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
