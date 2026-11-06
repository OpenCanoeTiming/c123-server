import { describe, it, expect } from 'vitest';
import { createMergeCore } from '../index.js';
import { REC } from './fixtures/real-excerpts.js';
import { connected, tcpUnit } from './streams.js';
import type { MergePort } from '../../__tests__/conformance/port.js';

// Row 9 (#203): CONTRACTS §1.6 "The unit of ingest is one upstream message ... at most one message per changed resource";
// CONFORMANCE-VECTORS §1 "Ingest units": the unit is applied whole, notified once after its last element. Units are real parser output.
const SLALOM_DAY = { C1M_BR1_19: '2026-09-19' };
const A = 'C1M_BR1_19:7';
const fresh = (): MergePort => createMergeCore({}) as MergePort;
const keyOf = (m: { type: string; [k: string]: unknown }): string =>
  `${m.type}:${String(m.attemptId ?? m.phaseId ?? m.entryId ?? m.classId ?? '')}`;

describe('one notification per unit (CONTRACTS §1.6)', () => {
  it('obligation §1.6: the OnCourse unit that finishes an Attempt (status, outcome, gates, ... at once) is one attempt.updated carrying every changed field', () => {
    const core = fresh();
    core.applyUnit(connected(REC.n1Start.observedAt));
    core.applyUnit(tcpUnit(REC.n1Start, SLALOM_DAY));
    const before = core.notifications().length;
    const unit = tcpUnit(REC.n3Finish, SLALOM_DAY);
    expect(unit.filter((e) => 'field' in e && e.attemptId === A).length).toBeGreaterThan(2); // the unit really holds many fields of one Attempt
    core.applyUnit(unit);
    const sent = core.notifications().slice(before);
    const forAttempt = sent.filter((m) => m.type === 'attempt.updated' && m.attemptId === A);
    expect(forAttempt).toHaveLength(1);
    expect(Object.keys(forAttempt[0]!.fields as object)).toEqual(expect.arrayContaining(['status', 'outcome']));
  });

  it('obligation §1.6: a unit never yields two messages for one resource, whatever the number of elements (every unit of a recorded episode)', () => {
    const core = fresh();
    core.applyUnit(connected(REC.n1Start.observedAt));
    for (const rec of [REC.n1Start, REC.n2Row, REC.n3Finish, REC.n4Wiped, REC.n5Gone, REC.n6Start, REC.n7Row, REC.n8Finish]) {
      const before = core.notifications().length;
      core.applyUnit(tcpUnit(rec, SLALOM_DAY));
      const keys = core.notifications().slice(before).map(keyOf);
      expect(new Set(keys).size, `${rec.ts}: ${keys.join(', ')}`).toBe(keys.length);
    }
    expect(core.notifications().length).toBeGreaterThan(0);
  });

  it('obligation §1.6: the unit that creates the Attempt sends it once, whole (a creation message counts once however many elements preceded it)', () => {
    const core = fresh();
    core.applyUnit(connected(REC.n1Start.observedAt));
    const unit = tcpUnit(REC.n1Start, SLALOM_DAY);
    expect(unit.length).toBeGreaterThan(1);
    core.applyUnit(unit);
    const created = core.notifications().filter((m) => m.type === 'attempt.updated' && m.attemptId === A);
    expect(created).toHaveLength(1);
    expect(created[0]!.fields).toMatchObject({ bib: expect.anything() });
  });

  it('obligation §1.6: a scope snapshot unit (a Results message of 8 rows) is one message per changed Attempt, not one per field', () => {
    const core = fresh();
    core.applyUnit(connected(REC.c2Final.observedAt));
    core.applyUnit(tcpUnit(REC.c2Final, { WX1_XER_26: '2026-04-26' }));
    const per = new Map<string, number>();
    for (const m of core.notifications()) if (m.type === 'attempt.updated') per.set(String(m.attemptId), (per.get(String(m.attemptId)) ?? 0) + 1);
    expect([...per.keys()].sort()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'].map((b) => `WX1_XER_26:${b}`));
    expect([...per.values()]).toEqual(Array(8).fill(1));
  });

  it('obligation §1.6 / INV-5: a unit that changes nothing sends nothing (an identical redelivery of the same message)', () => {
    const core = fresh();
    core.applyUnit(connected(REC.n2Row.observedAt));
    core.applyUnit(tcpUnit(REC.n2Row, SLALOM_DAY));
    expect(core.notifications().filter((m) => m.type === 'attempt.updated' && m.attemptId === A)).toHaveLength(1);
    const before = core.notifications().length;
    core.applyUnit(tcpUnit(REC.n2Row, SLALOM_DAY));
    expect(core.notifications().slice(before).filter((m) => m.type === 'attempt.updated')).toEqual([]);
  });
});
