/**
 * #210 row 15 diagnosis V1 (CONTRACTS §1.2 as amended by rounds 27e and 27e-2; DERIVATIONS §4.6; INV-5): with no course bound, the TCP cells a listing
 * states are retained until a snapshot binds the course. An identical re-delivery moves nothing (INV-5): the bound `gates` envelope's instant is the later of the
 * presented row's element and the element that last CHANGED the presented cells, not the newest delivery. Real jarni-ne-do K1M_BR2_19:51 listings, cut from the
 * recording; the re-deliveries and the change are derived copies of a recorded listing (no new text invented).
 */
import { describe, expect, it } from 'vitest';
import { JA51, JA51_XML } from './fixtures/round24-excerpts.js';
import { connected, coreWith, derive, tcpUnit, xmlUnit } from './streams.js';

const JA = 'K1M_BR2_19:51';
const DAY = { K1M_BR2_19: '2026-04-19' };
const T = (r: { observedAt: string }, ms: number): string => new Date(Date.parse(r.observedAt) + ms).toISOString();
// the first recorded listing that states twelve cells (08:50:09.491): ',' separated, six blanks after them
const TWELVE = '0,0,0,0,0,0,0,0,0,0,0,0,,,,,,';
const THIRTEEN = '0,0,0,0,0,0,0,0,0,0,0,0,0,,,,,';
const base = JA51.find((r) => r.data.includes(`Gates="${TWELVE}"`) && r.data.includes('<OnCourse'))!;

const gatesInstant = (c: ReturnType<typeof coreWith>): string => (c.presented(JA)['gates'] as { state: string; observedAt: string }).observedAt;

function run(change: boolean): { instant: string; state: string } {
  const core = coreWith([connected(base.observedAt)]);
  core.applyUnit(tcpUnit(base, DAY, { courses: {} })); // t1: the cells change from nothing to twelve cells
  const second = change ? derive(base, { observedAt: T(base, 1000), edit: (d) => d.replace(`Gates="${TWELVE}"`, `Gates="${THIRTEEN}"`) }) : derive(base, { observedAt: T(base, 1000) });
  core.applyUnit(tcpUnit(second, DAY, { courses: {} })); // t2
  core.applyUnit(tcpUnit(derive(second, { observedAt: T(base, 2000) }), DAY, { courses: {} })); // t3: identical to t2
  const read = derive(JA51_XML, { observedAt: T(base, 3000) }); // the snapshot binds the course
  core.applyUnit(xmlUnit(read, DAY, JA51_XML.observedAt));
  return { instant: gatesInstant(core), state: (core.presented(JA)['gates'] as { state: string }).state };
}

describe('retained cells with no course bound (INV-5, §1.2 later-of rule)', () => {
  it('the recorded listing is what the test says: twelve cells, blanks after', () => {
    expect(base).toBeDefined();
    expect(base.observedAt).toBe('2026-04-19T08:50:09.491Z');
  });

  it('cells change at t1, are re-delivered identical at t2 and t3, then the snapshot binds the course: the gates envelope\'s instant is t1', () => {
    const r = run(false);
    expect(r.state).toBe('known');
    expect(r.instant).toBe(base.observedAt);
  });

  it('a real change at t2 (a thirteenth cell), identical again at t3: the instant moves to t2, not t3 and not t1', () => {
    const r = run(true);
    expect(r.state).toBe('known');
    expect(r.instant).toBe(T(base, 1000));
  });
});
