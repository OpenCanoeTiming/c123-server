import { describe, it, expect } from 'vitest';
import { parseTcp, parseXmlSnapshot } from '../index.js';
import { TCP } from './fixtures/tcp.js';
import { ctx, xmlFixture, type El } from './helpers.js';

// CONFORMANCE-VECTORS §1 "Ingest units", CONTRACTS §1.6: one message is one unit; its elements share source and observedAt.
const stamps = (els: unknown): { source?: string; observedAt?: string }[] =>
  (els as El[]).map((e) => ({ source: e.source ?? e.snapshot?.source, observedAt: e.observedAt })).filter((s) => s.source !== undefined || s.observedAt !== undefined);

describe('unit', () => {
  it('one message is one unit: every element of a TCP message shares source "tcp" and the ctx observedAt', () => {
    for (const k of Object.keys(TCP) as (keyof typeof TCP)[]) {
      const els = parseTcp(TCP[k], ctx({ observedAt: '2026-09-19T09:09:09.123Z' }));
      const s = stamps(els);
      for (const x of s) {
        if (x.source !== undefined) expect(x.source, String(k)).toBe('tcp');
        expect(x.observedAt, String(k)).toBe('2026-09-19T09:09:09.123Z');
      }
    }
  });
  it('one message is one unit: a multi-observation OnCourse message (status, outcome, gates, courseOrder, onCourse) is >1 element, all with one observedAt', () => {
    const els = parseTcp(TCP.onCourseFinished, ctx()) as El[];
    expect(els.length).toBeGreaterThan(3);
    expect(new Set(els.map((e) => e.observedAt)).size).toBe(1);
  });
  it('one message is one unit: an XML snapshot\'s elements share source "xml" and observedAt', () => {
    for (const f of ['slalom.xml', 'cross.xml', 'cross-untimed.xml']) {
      const s = stamps(parseXmlSnapshot(xmlFixture(f), ctx()));
      expect(s.length).toBeGreaterThan(0);
      expect(new Set(s.map((x) => x.source))).toEqual(new Set(['xml']));
      expect(new Set(s.map((x) => x.observedAt)).size).toBe(1);
    }
  });
  it('one message is one unit: the same message parsed at two ctx times differs only in observedAt (pure of the clock)', () => {
    const a = JSON.stringify(parseTcp(TCP.onCourseFinished, ctx({ observedAt: '2026-09-19T08:00:00.000Z' }))).replace(/2026-09-19T08:00:00\.000Z/g, 'T');
    const b = JSON.stringify(parseTcp(TCP.onCourseFinished, ctx({ observedAt: '2026-09-19T08:00:05.000Z' }))).replace(/2026-09-19T08:00:05\.000Z/g, 'T');
    expect(a).toBe(b);
  });
  it('one message is one unit: parsing is deterministic and does not mutate ctx', () => {
    const c = ctx();
    const before = JSON.stringify(c);
    const a = JSON.stringify(parseXmlSnapshot(xmlFixture('slalom.xml'), c));
    const b = JSON.stringify(parseXmlSnapshot(xmlFixture('slalom.xml'), c));
    expect(a).toBe(b);
    expect(JSON.stringify(c)).toBe(before);
  });
});
