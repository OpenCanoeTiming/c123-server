/**
 * #305 verifier defects on recorded input (record c123-server-305-verify.md): hand streams in the shape of the recorded cases, injected instants only.
 * (A) jarni-ne-odp K1W_BR2_19:16, slalom: the guard after the fallback. (B) cp3-cross WX1_XT_26:25, Cross time trial: no start observed, no left-without-finish.
 */
import { describe, expect, it } from 'vitest';
import { at, field, kit, type Core } from './kit.js';

const status = (c: Core, id: string): any => field(c, id, 'status');
const inSet = (c: Core, id: string): boolean => (c.oncourse() as { attemptIds: unknown[] }).attemptIds.map(String).includes(id);
const RUNNING = { kind: 'running', elapsedSeconds: 17, penaltySeconds: 0 };

describe('(A) jarni-ne-odp K1W_BR2_19:16: the XML content-age guard holds after the leave fallback (CONTRACTS §3.2, §4 INV-2 rule 2, INV-2c; gate 2 property 8)', () => {
  it('INV-2c after a leave: an XML DNS older than the latest TCP restatement of the row is refused, and never returns at the retraction; the row cleared returns to left-without-finish, outcome not-yet', () => {
    const ID = 'K1W_BR2_19:16';
    const k = kit(ID, 'K1W_BR2_19');
    const c = k.core();
    const LEFT = at(11);
    c.applyUnit([...k.listing(at(0), at(-17)), k.obs('outcome', 'tcp', 'inference', at(0), RUNNING)]);
    expect(field(c, ID, 'outcome'), 'precondition (on-course stream): running 17 s').toMatchObject({ value: { kind: 'running' } });
    c.applyUnit([k.snap('tcp', at(10), { status: 'dns' })]);
    expect(status(c, ID), 'precondition (TCP results row): dns presented from tcp').toMatchObject({ value: 'dns', source: 'tcp' });
    c.applyUnit([k.event('oncourse-left', LEFT)]);
    expect(inSet(c, ID), 'precondition (on-course stream): the leave rule fired').toBe(false);
    expect(status(c, ID), 'precondition: still the tcp dns').toMatchObject({ value: 'dns', source: 'tcp' });
    // the table restates the row (recorded: 12:59:59.4, 13:00:00.5), then an XML snapshot whose content age (at 43 s) is later than the first delivery
    // but earlier than the next restatement (at 51 s): the snapshot waits behind TCP's dns (INV-2 rule 2), the restatement is a later TCP observation (INV-2c)
    c.applyUnit([k.snap('tcp', at(30), { status: 'dns' })]);
    c.applyUnit([k.snap('tcp', at(31), { status: 'dns' })]);
    c.applyUnit(k.xml(at(48), at(43), { status: 'dns' }));
    c.applyUnit([k.snap('tcp', at(51), { status: 'dns' })]);
    expect(status(c, ID), 'the table still says dns: tcp, not the xml').toMatchObject({ value: 'dns', source: 'tcp' });
    expect(field(c, ID, 'outcome'), 'the outcome is not flipped to xml').not.toMatchObject({ source: 'xml' });
    c.applyUnit([k.snap('tcp', at(57), {})]);
    expect(status(c, ID), 'row cleared: left-without-finish, the leave\'s envelope').toMatchObject({ state: 'known', value: 'left-without-finish', source: 'tcp', observedAt: LEFT });
    expect(field(c, ID, 'outcome'), 'outcome not-yet, not the refused xml no-result').toEqual({ state: 'not-yet' });
  });
});

describe('(B) cp3-cross WX1_XT_26:25: a time-trial leave with no start listed at the leave is not-started (Q-TT; CONTRACTS §3.2; DERIVATIONS §4.1, §10 item 43 (c); round 19 F7)', () => {
  it('Q-TT: a start deleted, a finish impulse with no dtStart, the finish withdrawn, the leave: not-started, never left-without-finish; again after a re-listing', () => {
    const ID = 'WX1_XT_26:25';
    const k = kit(ID, 'WX1_XT_26');
    const c = k.core();
    // recorded order (07:14:00 to 07:21:07): a start listed (running), the start deleted (at-start, round 19 F7), a finish impulse with no dtStart and no Time,
    // the finish withdrawn (at-start), then the leave
    c.applyUnit([...k.listing(at(-10), at(-20)), k.obs('outcome', 'tcp', 'inference', at(-10), RUNNING)]);
    expect(status(c, ID).value, 'precondition (on-course stream): a start was listed').toBe('on-course');
    c.applyUnit(k.listing(at(-5), null));
    expect(status(c, ID).value, 'precondition: the start deleted, at-start').toBe('at-start');
    c.applyUnit([
      k.obs('onCourse', 'tcp', 'inference', at(0), { dtStart: null, dtFinish: at(-1) }),
      k.obs('status', 'tcp', 'inference', at(0), 'finished', { eventTime: at(-1) }),
    ]);
    expect(status(c, ID).value, 'precondition (on-course stream): the finish impulse presents finished').toBe('finished');
    c.applyUnit(k.listing(at(5), null));
    expect(status(c, ID).value, 'precondition (on-course stream): the finish withdrawn, at-start; no start is listed now').toBe('at-start');
    c.applyUnit([k.event('oncourse-left', at(10))]);
    expect(inSet(c, ID), 'precondition: the leave rule fired').toBe(false);
    expect(status(c, ID).value, 'the start was deleted and none listed at the leave: not-started').toBe('not-started');
    c.applyUnit(k.listing(at(15), null));
    expect(status(c, ID).value, 'precondition: listed again, at-start').toBe('at-start');
    c.applyUnit([k.event('oncourse-left', at(20))]);
    expect(inSet(c, ID), 'precondition: the second leave fired').toBe(false);
    expect(status(c, ID).value, 'not-started again').toBe('not-started');
  });
});
