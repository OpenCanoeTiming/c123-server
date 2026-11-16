import { describe, it, expect } from 'vitest';
import { at, field, kit } from './kit.js';
import { createMergeCore } from '../index.js';
import type { MergePort } from '../../__tests__/conformance/port.js';

// #266 Q3 (DERIVATIONS §4.4): "Where the course is not configured, `provisional` stays `true` until the run is closed", in Kayak Cross too.
// Channels: TCP results row (unstamped: no `judgingComplete`, as a parser leaves it where no course binds) and the on-course stream (start, leave).
const dur = { kind: 'duration', runSeconds: 80, penaltySeconds: 0, totalSeconds: 80 };

// The row as the parser leaves it with no course bound (recorded: ingest parseTcp with no course): held `cells`, a Cross row with no `judgingComplete` stamp,
// a slalom row stamped `judgingComplete: null`.
const cells = [0, 0, 0, 2, 0, 0, 0, 0, 0, null, null, null];
for (const [label, phase, bib, stamp] of [['Kayak Cross time trial', 'K1M_XT_19', '5', {}], ['slalom control', 'K1M_BR1_19', '5', { judgingComplete: null }]] as const) {
  describe(`#266 Q3 ${label} (${phase})`, () => {
    it(`§4.4 ${label}: with no course configured, outcome and placement stay provisional until the run closes`, () => {
      const A = `${phase}:${bib}`;
      const k = kit(A, phase);
      const c = createMergeCore({ attemptId: A, xmlConfigured: false }) as unknown as MergePort;
      c.applyUnit(k.listing(at(0), at(-20)));
      c.applyUnit([k.snap('tcp', at(10), { outcome: dur, placement: { rank: 1, order: 1 }, cells, ...stamp })]);
      expect(field(c, A, 'outcome'), 'precondition: the row\'s outcome is presented from tcp').toMatchObject({ state: 'known', source: 'tcp', value: { kind: 'duration' } });
      expect(field(c, A, 'placement'), 'precondition: the row\'s placement is presented from tcp').toMatchObject({ state: 'known', source: 'tcp' });
      expect((c.oncourse() as { attemptIds: unknown[] }).attemptIds.map(String), 'precondition (on-course stream): still listed, no leave yet').toContain(A);
      expect(field(c, A, 'outcome').provisional, 'no course can bind: outcome provisional while the run is open').toBe(true);
      expect(field(c, A, 'placement').provisional, 'no course can bind: placement provisional while the run is open').toBe(true);

      c.applyUnit([k.event('oncourse-left', at(20))]);
      expect((c.oncourse() as { attemptIds: unknown[] }).attemptIds.map(String), 'precondition (on-course stream): the leave rule fired').not.toContain(A);
      expect(field(c, A, 'outcome').provisional, 'the run is closed: outcome settles').toBe(false);
      expect(field(c, A, 'placement').provisional, 'the run is closed: placement settles').toBe(false);
    });
  });
}
