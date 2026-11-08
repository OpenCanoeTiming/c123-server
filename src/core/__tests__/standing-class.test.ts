/**
 * #210 review B6 non-blocking note, core tier (CONTRACTS §2.7, §5 step 1; round 27d-2): the Standing's classId is the class the Phase's rows state, never the RaceId
 * prefix, and no Standing is published while the Phase has none. The kit's id-derived class convention is switched off here, so a core that reads the class off the
 * RaceId fails at this tier too.
 */
import { describe, expect, it } from 'vitest';
import { R19 } from './fixtures/round19-excerpts.js';
import { connected, coreWith, derive, tcpUnit } from './streams.js';

const DAY = { C1M_BR2_18: '2026-04-18' };
type Msg = Record<string, any>;
const standings = (c: ReturnType<typeof coreWith>): Msg[] => (c.notifications() as Msg[]).filter((m) => m['type'] === 'standing.updated');

describe('Standing.classId is the stated class of the Phase (kit convention off)', () => {
  it('a Results row stating ClassId C1M-ST for RaceId C1M_BR2_18: every Standing carries C1M-ST and core.standings() agrees', () => {
    const row = derive(R19.c4RowB, { edit: (d) => d.replace('ClassId="C1M"', 'ClassId="C1M-ST"') });
    const c = coreWith([connected(row.observedAt), tcpUnit(row, DAY)], { classIdsFromIds: false });
    expect(standings(c).length).toBeGreaterThan(0);
    for (const m of standings(c)) expect(m['standing'].classId).toBe('C1M-ST');
    for (const s of c.standings()) expect(s.classId).toBe('C1M-ST');
  });

  it('a ranked on-course listing, before any message states the class: no Standing yet (held), the Results row then publishes it whole with the stated class', () => {
    const c = coreWith([connected(R19.c4Stage.observedAt), tcpUnit(R19.c4Stage, DAY), tcpUnit(R19.c4Start, DAY), tcpUnit(R19.c4Finish, DAY)], { classIdsFromIds: false });
    expect(/Rank="\d+"/.test(R19.c4Finish.data)).toBe(true);
    expect(standings(c), 'held while the Phase has no class').toEqual([]);
    expect(c.standings()).toEqual([]);
    const row = derive(R19.c4RowB, { edit: (d) => d.replace('ClassId="C1M"', 'ClassId="C1M-ST"') });
    const before = c.notifications().length;
    c.applyUnit(tcpUnit(row, DAY));
    const after = (c.notifications().slice(before) as Msg[]);
    const phaseAt = after.findIndex((m) => m['type'] === 'phase.updated' && m['phaseId'] === 'C1M_BR2_18');
    const standingAt = after.findIndex((m) => m['type'] === 'standing.updated');
    expect(phaseAt).toBeGreaterThanOrEqual(0);
    expect(standingAt).toBeGreaterThan(phaseAt);
    expect(after[standingAt]!['standing'].classId).toBe('C1M-ST');
  });
});
