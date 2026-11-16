import { describe, it, expect } from 'vitest';
import { at, field, kit, diagnosticKinds } from './kit.js';

// #266 Q7 (DERIVATIONS §4.11): "A row whose mark INV-7's guard refused records nothing either: the guard refuses the observation (CONTRACTS §2.6),
// and the snapshot that restates it and is admitted records then." The refused XML mark is the ONLY element that could record the generation here:
// the stream shows the Attempt `at-start` (its start deleted after the first start was recorded), no TCP results row exists, so nothing else can
// be attributed. The mark is INV-2 rule 2's silent-path exception (a DNS over a presented tcp `at-start`), which INV-2c's content-age guard
// refuses when the snapshot's `changedAfter` is not later than the listing's delivery.
const A = 'K1M_BR2_19:7', P = 'K1M_BR2_19';

function setup() {
  const k = kit(A, P);
  const c = k.core();
  c.applyUnit(k.listing(at(0), at(-20))); // the first start is recorded: run 1
  c.applyUnit(k.listing(at(10), null)); // the start impulse deleted: at-start, delivered by tcp at t10
  expect(field(c, A, 'status'), 'precondition (on-course stream): at-start from tcp').toMatchObject({ value: 'at-start', source: 'tcp' });
  expect(field(c, A, 'run'), 'precondition: the first generation').toMatchObject({ value: 1 });
  return { k, c };
}

describe('#266 Q7: the refusal of a mark and the recording of a generation (DERIVATIONS §4.11)', () => {
  // mutant: recordsGeneration runs before the guard's refusal -> the refused DNS records, the new start is a re-run: run 2, red.
  it('rule DERIVATIONS §4.11 refused-mark: a row whose mark the guard refused records no generation, the later start is a correction (run 1)', () => {
    const { k, c } = setup();
    c.applyUnit(k.xml(at(30), at(5), { status: 'dns' })); // content age 5 s is not later than the delivery at 10 s: refused
    expect(field(c, A, 'status'), 'precondition (refusal): the mark is not presented').toMatchObject({ value: 'at-start', source: 'tcp' });
    expect(diagnosticKinds(c), 'precondition (refusal): no stale-mark diagnostic is a rule here, only the refusal itself').not.toContain('source-disagreement');
    c.applyUnit(k.listing(at(40), at(35))); // a different start, no finish
    expect(field(c, A, 'run'), 'no recorded generation: a start correction').toMatchObject({ value: 1 });
  });

  // mutant: a fix that never records a mark (also not the admitted one) leaves run 1 -> red here.
  it('rule DERIVATIONS §4.11 refused-mark: the admitted snapshot that restates the mark records then, the later start is a re-run (run 2)', () => {
    const { k, c } = setup();
    c.applyUnit(k.xml(at(30), at(5), { status: 'dns' })); // refused
    expect(field(c, A, 'status'), 'precondition (refusal): not presented').toMatchObject({ value: 'at-start' });
    c.applyUnit(k.xml(at(50), at(45), { status: 'dns' })); // content age later than the delivery: admitted
    expect(field(c, A, 'status'), 'precondition (admission): the mark is presented').toMatchObject({ value: 'dns', source: 'xml' });
    expect(field(c, A, 'run'), 'recording is visible only at the next start').toMatchObject({ value: 1 });
    c.applyUnit(k.listing(at(60), at(55)));
    expect(field(c, A, 'run'), 'the admitted restatement recorded the generation: a re-run').toMatchObject({ value: 2 });
  });
});
