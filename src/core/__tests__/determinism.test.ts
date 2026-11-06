import { describe, it, expect } from 'vitest';
import { REC } from './fixtures/real-excerpts.js';
import { R19 } from './fixtures/round19-excerpts.js';
import { connected, coreWith, disconnected, tcpUnit, xmlUnit, type Unit } from './streams.js';

// Row 11 (#203): CONTRACTS §4 determinism paragraph: given the same sequence of elements the core presents the same state, sends the same
// notifications and records the same diagnostics. Two fresh cores, the same recorded streams, nothing shared between them.
const SLALOM_DAY = { C1M_BR1_19: '2026-09-19' };
const J_DAY = { K1M_BR2_19: '2026-04-19' };
const X_DAY = { WX1_XF_26: '2026-04-26' };

const streams: Record<string, { units: () => Unit[]; attemptIds: string[] }> = {
  'nkz-19so re-run of C1M_BR1_19 bib 7': {
    units: () => [
      connected(REC.n1Start.observedAt),
      ...[REC.n1Start, REC.n2Row, REC.n3Finish, REC.n4Wiped, REC.n5Gone, REC.n6Start, REC.n7Row, REC.n8Finish].map((r) => tcpUnit(r, SLALOM_DAY)),
    ],
    attemptIds: ['C1M_BR1_19:7', 'C1M_BR1_19:64'],
  },
  'cp3-cross WX1_XF_26 final': {
    units: () => [connected(R19.xfStartList.observedAt), tcpUnit(R19.xfStartList, X_DAY), tcpUnit(R19.xfFinal, X_DAY)],
    attemptIds: ['1', '2', '3', '4', '5', '6', '7', '8'].map((b) => `WX1_XF_26:${b}`),
  },
  'jarni-ne-do outage and XML takeover': {
    units: () => [
      connected(REC.j1Row.observedAt),
      tcpUnit(REC.j1Row, J_DAY),
      disconnected('2026-04-19T08:37:30.000Z'),
      xmlUnit(REC.j2Xml, J_DAY, new Date(Date.parse(REC.j2Xml.observedAt) - 5000).toISOString()),
    ],
    attemptIds: ['K1M_BR2_19:22'],
  },
};

describe('determinism (CONTRACTS §4 determinism paragraph)', () => {
  for (const [name, s] of Object.entries(streams)) {
    it(`obligation §4 determinism, real ${name}: two cores fed the same units present, notify and record identically`, () => {
      const a = coreWith(s.units());
      const b = coreWith(s.units());
      expect(a.notifications().length).toBeGreaterThan(0);
      expect(b.notifications()).toEqual(a.notifications());
      expect(b.diagnostics()).toEqual(a.diagnostics());
      expect(b.attempts()).toEqual(a.attempts());
      expect(b.oncourse()).toEqual(a.oncourse());
      for (const id of s.attemptIds) expect(b.presented(id), id).toEqual(a.presented(id));
    });
  }

  it('obligation §4 determinism: one core is not affected by another running beside it (no module state)', () => {
    const s = streams['nkz-19so re-run of C1M_BR1_19 bib 7']!;
    const alone = coreWith(s.units());
    const other = coreWith(streams['cp3-cross WX1_XF_26 final']!.units());
    const again = coreWith(s.units());
    expect(other.attempts().length).toBeGreaterThan(0);
    expect(again.presented('C1M_BR1_19:7')).toEqual(alone.presented('C1M_BR1_19:7'));
    expect(again.notifications()).toEqual(alone.notifications());
  });
});
