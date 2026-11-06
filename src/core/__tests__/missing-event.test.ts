import { describe, it, expect } from 'vitest';
import { createMergeCore } from '../index.js';
import { REC } from './fixtures/real-excerpts.js';
import { connected, ctxFor, tcpUnit } from './streams.js';
import { parseXmlSnapshot } from '../../ingest/index.js';
import type { GivenElement, MergePort } from '../../__tests__/conformance/port.js';

// Row 12 (#203): CONFORMANCE-VECTORS §1 "Content age": "The core reads content age from the event's `changedAfter` alone: absence as a key is
// a programming error, never `null` and never the interval" (round-18 ruling). The harness stamps the event; the core never invents it.
const J_DAY = { K1M_BR2_19: '2026-04-19' };
const fresh = (): MergePort => createMergeCore({}) as MergePort;
const xmlElements = (): GivenElement[] => parseXmlSnapshot(REC.j2Xml.data, ctxFor(REC.j2Xml, J_DAY)) as GivenElement[];

describe('a missing xml-rewrite-detected event is a programming error (round 18)', () => {
  it('rule round-18 content age: an xml unit with no rewrite event before it throws', () => {
    const core = fresh();
    core.applyUnit(connected(REC.j1Row.observedAt));
    core.applyUnit(tcpUnit(REC.j1Row, J_DAY));
    expect(() => core.applyUnit(xmlElements())).toThrow();
  });

  it('rule round-18 content age: an xml unit as the very first unit, with no event ever seen, throws', () => {
    expect(() => fresh().applyUnit(xmlElements())).toThrow();
  });

  it('rule round-18 content age: a rewrite event with no `changedAfter` key throws; the key is never defaulted to null or to the interval', () => {
    const event = { ingestSeq: 0, event: 'xml-rewrite-detected', observedAt: REC.j2Xml.observedAt } as GivenElement;
    expect(() => fresh().applyUnit([event, ...xmlElements()])).toThrow();
  });

  it('rule round-18 content age: with the event (changedAfter a Timestamp, or null) the same elements are accepted', () => {
    for (const changedAfter of ['2026-04-19T08:37:56.674Z', null]) {
      const event = { ingestSeq: 0, event: 'xml-rewrite-detected', observedAt: REC.j2Xml.observedAt, changedAfter } as GivenElement;
      expect(() => fresh().applyUnit([event, ...xmlElements()])).not.toThrow();
    }
  });

  it('rule round-18 content age: a failed unit leaves the presented state and the notifications as they were (nothing half-applied)', () => {
    const core = fresh();
    core.applyUnit(connected(REC.j1Row.observedAt));
    core.applyUnit(tcpUnit(REC.j1Row, J_DAY));
    const before = JSON.stringify([core.presented('K1M_BR2_19:22'), core.notifications(), core.diagnostics()]);
    expect(() => core.applyUnit(xmlElements())).toThrow();
    expect(JSON.stringify([core.presented('K1M_BR2_19:22'), core.notifications(), core.diagnostics()])).toBe(before);
  });
});
