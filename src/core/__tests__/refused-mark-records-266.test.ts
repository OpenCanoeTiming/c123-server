import { describe, it, expect } from 'vitest';
import { at, field, kit } from './kit.js';

// #266 Q7 (DERIVATIONS §4.11): "A row whose mark INV-7's guard refused records nothing either: the guard refuses the observation (CONTRACTS §2.6),
// and the snapshot that restates it and is admitted records then." Channels: the XML snapshot against TCP results rows (content-age guard, INV-2c);
// the on-course stream for the start and the later start. A TCP row with a time is retained until the finish, so it records nothing itself.
const A = 'K1M_BR2_19:7', P = 'K1M_BR2_19';
const dur = { kind: 'duration', runSeconds: 80, penaltySeconds: 0, totalSeconds: 80 };

function setup() {
  const k = kit(A, P);
  const c = k.core();
  c.applyUnit(k.listing(at(0), at(-20)));
  c.applyUnit([k.snap('tcp', at(10), { outcome: dur, judgingComplete: true })]);
  expect(field(c, A, 'run'), 'precondition (on-course stream): the first generation').toMatchObject({ value: 1 });
  return { k, c };
}

describe('#266 Q7: the refusal of a mark and the recording of a generation (DERIVATIONS §4.11)', () => {
  it('§4.11 a row whose mark the guard refused records no generation: the later start is a correction, run stays 1', () => {
    const { k, c } = setup();
    c.applyUnit(k.xml(at(30), at(5), { status: 'dnf' })); // content age 5 s is not later than the tcp delivery at 10 s: refused (INV-2c)
    expect(field(c, A, 'status'), 'precondition (refusal): the mark is not presented').not.toMatchObject({ value: 'dnf' });
    expect(field(c, A, 'status'), 'precondition (refusal): the status stands from tcp').toMatchObject({ source: 'tcp' });
    c.applyUnit(k.listing(at(40), at(35))); // a different start, no finish
    expect(field(c, A, 'run'), 'no recorded generation: a start correction').toMatchObject({ value: 1 });
  });

  it('§4.11 the admitted snapshot that restates the mark records then: the later start is a re-run, run 2', () => {
    const { k, c } = setup();
    c.applyUnit(k.xml(at(30), at(5), { status: 'dnf' })); // refused
    expect(field(c, A, 'status'), 'precondition (refusal): not presented').not.toMatchObject({ value: 'dnf' });
    expect(field(c, A, 'run'), 'precondition: nothing recorded yet').toMatchObject({ value: 1 });
    c.applyUnit(k.xml(at(50), at(45), { status: 'dnf' })); // content age later than the tcp delivery: admitted
    c.applyUnit(k.listing(at(60), at(55)));
    expect(field(c, A, 'run'), 'the admitted restatement recorded the generation: a re-run').toMatchObject({ value: 2 });
  });
});
