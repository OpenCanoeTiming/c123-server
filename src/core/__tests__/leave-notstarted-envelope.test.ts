/**
 * #386 (regression of #383): a retraction after an at-start leave.
 * TEST-ARCHITECTURE §3.2 property 1, the "A retraction" bullet: what a retraction presents is the retained stream inference with its own element's
 * envelope where one is retained (the listing's, or for the leave's `left-without-finish` the `oncourse-left`'s); else `not-started` on the retraction's
 * own instant and `source`. A leave that draws `not-started` retains nothing, so its envelope is never returned to. CONTRACTS §3.2; DERIVATIONS §4.1, §4.12.
 * Channels: on-course stream (kit `listing` / `oncourse-left`), a TCP results row (`snap('tcp')`), the XML snapshot (`xml`).
 * Mutant argument: a core that retains the leave's `not-started` inference (retraction.ts) returns it with the leave's instant (at(30)) after the
 * retraction: the asserts on `observedAt` of the TCP test (leave first) go red; the `left-without-finish` guard stays green. The XML variant is green
 * under that mutant: with a retained floor and the XML retraction marker both `not-started`, the later `seq` wins (precedence), so it guards that
 * floor-precedence path, not #386 (review of PR #387, O2). The table-first test pins the other half of the fix (the leave records no `not-started`
 * behind a table value): a core that records it again returns at(30) there (review O1; recorded case 1, C1M_BR2_18:51, `dns` before the leave).
 */
import { describe, expect, it } from 'vitest';
import { at, field, kit } from './kit.js';

const SLALOM = { phase: 'K1M_BR1_6', id: 'K1M_BR1_6:9' };
const LEAVE_AT = at(30);

describe('P1 "A retraction": a leave from at-start, a table mark, the mark cleared → not-started on the retraction\'s instant (#386)', () => {
  it('P1 retraction, table first (recorded case 1 order, review O1): at-start, TCP DNS row, the leave, row cleared → not-started, source tcp, observedAt the clearing message', () => {
    const k = kit(SLALOM.id, SLALOM.phase);
    const c = k.core();
    c.applyUnit(k.listing(at(0), null));
    expect(field(c, SLALOM.id, 'status').value, 'precondition (on-course stream): at-start, no start').toBe('at-start');
    c.applyUnit([k.snap('tcp', at(20), { status: 'dns' })]);
    expect(field(c, SLALOM.id, 'status'), 'precondition (TCP results row): dns presented from tcp before the leave').toMatchObject({ value: 'dns', source: 'tcp' });
    c.applyUnit([k.event('oncourse-left', LEAVE_AT)]);
    expect((c.oncourse() as { attemptIds: unknown[] }).attemptIds.map(String), 'precondition (on-course stream): the leave rule fired').not.toContain(SLALOM.id);
    expect(field(c, SLALOM.id, 'status').value, 'precondition: status still the table\'s dns').toBe('dns');
    c.applyUnit([k.snap('tcp', at(50), {})]);
    const s = field(c, SLALOM.id, 'status');
    expect(s, 'not-started on the retraction\'s own source and instant').toMatchObject({ state: 'known', value: 'not-started', source: 'tcp', observedAt: at(50) });
    expect(s.observedAt, 'never the leave\'s instant').not.toBe(LEAVE_AT);
  });

  it('P1 retraction (TCP mark): at-start, leave, TCP DNS row, row cleared → not-started, source tcp, observedAt the clearing message', () => {
    const k = kit(SLALOM.id, SLALOM.phase);
    const c = k.core();
    c.applyUnit(k.listing(at(0), null));
    expect(field(c, SLALOM.id, 'status').value, 'precondition (on-course stream): at-start, no start').toBe('at-start');
    c.applyUnit([k.event('oncourse-left', LEAVE_AT)]);
    expect(field(c, SLALOM.id, 'status'), 'precondition (on-course stream): the leave presented not-started').toMatchObject({ value: 'not-started' });
    c.applyUnit([k.snap('tcp', at(40), { status: 'dns' })]);
    expect(field(c, SLALOM.id, 'status'), 'precondition (TCP results row): dns presented from tcp').toMatchObject({ value: 'dns', source: 'tcp' });
    c.applyUnit([k.snap('tcp', at(50), {})]);
    const s = field(c, SLALOM.id, 'status');
    expect(s, 'not-started on the retraction\'s own source and instant, not the leave\'s').toMatchObject({ state: 'known', value: 'not-started', source: 'tcp', observedAt: at(50) });
    expect(s.observedAt, 'never the leave\'s instant').not.toBe(LEAVE_AT);
  });

  it('P1 retraction (XML mark): at-start, leave, XML CAP, admitted XML row with no mark → not-started, source xml, observedAt the XML snapshot', () => {
    const k = kit(SLALOM.id, SLALOM.phase);
    const c = k.core();
    c.applyUnit(k.listing(at(0), null));
    c.applyUnit([k.event('oncourse-left', LEAVE_AT)]);
    expect(field(c, SLALOM.id, 'status'), 'precondition (on-course stream): the leave presented not-started').toMatchObject({ value: 'not-started' });
    c.applyUnit(k.xml(at(45), at(41), { status: 'cap' }));
    expect(field(c, SLALOM.id, 'status'), 'precondition (XML snapshot): cap presented from xml').toMatchObject({ value: 'cap', source: 'xml' });
    c.applyUnit(k.xml(at(60), at(56), {}));
    const s = field(c, SLALOM.id, 'status');
    expect(s, 'not-started on the retraction\'s own source and instant, not the leave\'s').toMatchObject({ state: 'known', value: 'not-started', source: 'xml', observedAt: at(60) });
    expect(s.observedAt, 'never the leave\'s instant').not.toBe(LEAVE_AT);
  });
});
