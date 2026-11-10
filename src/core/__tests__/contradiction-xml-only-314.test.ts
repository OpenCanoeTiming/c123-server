import { describe, it, expect } from 'vitest';
import type { GivenElement } from '../../__tests__/conformance/port.js';
import { attemptMessages, diagnosticKinds, field, kit } from './kit.js';

// #314, design-314.md "Ruling" and "Hand-off": an INV-2d contradiction takes countingRun to not-yet, but countingRun is XML-only (INV-2 rule 3;
// DERIVATIONS §4.4), so no tcp observation of it may be left for rule 2 to prefer; the next XML row presents it again. Recorded: nkz-19so
// K1M_BR2_19:67 (instants of vector contradiction-leaves-no-tcp-marker-on-xml-only-field). Hand stream, one kit per test, no real clock.
const A = 'K1M_BR2_19:67', P = 'K1M_BR2_19', ENTRY = '23028.K1M';
const T = (hms: string): string => `2026-09-19T${hms}Z`;
const START = T('09:37:39.440'), FALSE_FINISH = T('09:37:48.600'), REAL_FINISH = T('09:39:11.270');
const dur = (s: number) => ({ kind: 'duration', runSeconds: s, penaltySeconds: 0, totalSeconds: s });

/** The recorded sequence, one step per call; each returns after applying it. */
function run() {
  const k = kit(A, P);
  const c = k.core();
  let entryFields = 0;
  const entryField = (observedAt: string, name: string, value: unknown): GivenElement =>
    ({ ingestSeq: 1000 + ++entryFields, entryId: ENTRY, field: name, source: 'xml', kind: 'result-row', observedAt, value, confidence: 'authoritative' }) as unknown as GivenElement;
  const xmlRow = (observedAt: string, row: Record<string, unknown>, extra: GivenElement[] = []): void => {
    const ms = Date.parse(observedAt);
    c.applyUnit([...k.xml(observedAt, new Date(ms - 5000).toISOString(), row), ...extra]);
  };
  const steps = {
    // xml run-2 row, BetterRunNr 1, no time (pre-start); the Entry's xml-only fields ride with it
    xmlPre: () => xmlRow(T('09:37:12.135'), { placement: { rank: 25, order: 25 }, pairTotal: 89.82, countingRun: 1, timeEmpty: true },
      [k.obs('entry', 'xml', 'result-row', T('09:37:12.135'), { entryId: ENTRY }), entryField(T('09:37:12.135'), 'ageCategoryId', 'U23'), entryField(T('09:37:12.135'), 'eventBib', '67')]),
    atStart: () => c.applyUnit(k.listing(T('09:37:29.973'), null)),
    started: () => c.applyUnit(k.listing(T('09:37:39.298'), START)),
    falseRow: (at: string) => c.applyUnit([k.snap('tcp', at, { outcome: dur(9.16), placement: { rank: 1, order: 1 }, pairTotal: 9.16, judgingComplete: true })]),
    falseFinish: () => c.applyUnit(k.listing(T('09:37:49.229'), START, FALSE_FINISH, { runSeconds: 9.16 })),
    contradiction: () => c.applyUnit(k.listing(T('09:38:00.824'), START)),
    xmlFalse: () => xmlRow(T('09:38:22.255'), { outcome: dur(9.16), placement: { rank: 1, order: 1 }, pairTotal: 9.16, judgingComplete: true, countingRun: 2, finishTime: FALSE_FINISH }),
    realRow: () => c.applyUnit([k.snap('tcp', T('09:39:11.621'), { outcome: dur(91.83), placement: { rank: 25, order: 25 }, pairTotal: 89.82, judgingComplete: true })]),
    realFinish: () => c.applyUnit(k.listing(T('09:39:11.876'), START, REAL_FINISH, { runSeconds: 91.83 })),
    xmlReal: (countingRun = 1, at = T('09:39:32.365'), extra: GivenElement[] = []) =>
      xmlRow(at, { outcome: dur(91.83), placement: { rank: 25, order: 25 }, pairTotal: 89.82, judgingComplete: true, countingRun, finishTime: REAL_FINISH }, extra),
    restateEntry: (at: string) => [entryField(at, 'ageCategoryId', 'U23'), entryField(at, 'eventBib', '67')],
  };
  return { k, c, steps };
}

const toLift = (s: ReturnType<typeof run>['steps']) => { s.xmlPre(); s.atStart(); s.started(); s.falseRow(T('09:37:48.972')); s.falseFinish(); s.contradiction(); };

describe('row 2: countingRun across a contradiction and the lift (CONTRACTS §4 INV-2 rule 3, INV-2d, INV-7; nkz-19so K1M_BR2_19:67)', () => {
  it('vector contradiction-leaves-no-tcp-marker-on-xml-only-field: the XML run-2 row presents countingRun 1 from xml, not provisional', () => {
    const { c, steps } = run(); steps.xmlPre();
    expect(field(c, A, 'countingRun')).toMatchObject({ state: 'known', value: 1, source: 'xml', provisional: false });
  });

  it('vector contradiction-leaves-no-tcp-marker-on-xml-only-field: the first listing carries countingRun provisional (CONTRACTS §1.2); the false TCP row does not restate it', () => {
    const { c, steps } = run(); steps.xmlPre(); steps.atStart(); steps.started();
    expect(field(c, A, 'countingRun')).toMatchObject({ state: 'known', value: 1, source: 'xml', provisional: true });
    steps.falseRow(T('09:37:48.972'));
    expect(field(c, A, 'countingRun'), 'a tcp row has no countingRun column (INV-7)').toMatchObject({ state: 'known', value: 1, source: 'xml', provisional: true });
  });

  it('vector contradiction-leaves-no-tcp-marker-on-xml-only-field: the contradiction takes countingRun, placement, pairTotal to not-yet and raises contradicted-finish', () => {
    const { c, steps } = run(); toLift(steps);
    for (const f of ['countingRun', 'placement', 'pairTotal']) expect(field(c, A, f), f).toEqual({ state: 'not-yet' });
    expect(field(c, A, 'status')).toMatchObject({ state: 'known', value: 'on-course' });
    expect(c.diagnostics()).toContainEqual(expect.objectContaining({ kind: 'contradicted-finish', attemptId: A, finishTime: FALSE_FINISH, runSeconds: 9.16 }));
  });

  it('INV-2d bullet 3: the XML row carrying the contradicted finish (BetterRunNr 2) stays unpresented whole; countingRun stays not-yet, not 2, and the diagnostic stands', () => {
    const { c, steps } = run(); toLift(steps); steps.xmlFalse();
    expect(field(c, A, 'countingRun')).toEqual({ state: 'not-yet' });
    expect(diagnosticKinds(c)).toContain('contradicted-finish');
  });

  it('vector contradiction-leaves-no-tcp-marker-on-xml-only-field: the re-pushed false TCP row leaves countingRun not-yet', () => {
    const { c, steps } = run(); toLift(steps); steps.xmlFalse(); steps.falseRow(T('09:39:05.373'));
    expect(field(c, A, 'countingRun')).toEqual({ state: 'not-yet' });
  });

  it('INV-2d bullet 4 + INV-7 (countingRun outside a TCP row): the real TCP row lifts the contradiction, placement/pairTotal return from it, countingRun stays not-yet', () => {
    const { c, steps } = run(); toLift(steps); steps.xmlFalse(); steps.falseRow(T('09:39:05.373')); steps.realRow(); steps.realFinish();
    expect(field(c, A, 'countingRun')).toEqual({ state: 'not-yet' });
    expect(field(c, A, 'placement')).toMatchObject({ state: 'known', value: { rank: 25, order: 25 }, provisional: false });
    expect(field(c, A, 'pairTotal')).toMatchObject({ state: 'known', value: 89.82, provisional: false });
    expect(field(c, A, 'status')).toMatchObject({ state: 'known', value: 'finished' });
    expect(diagnosticKinds(c)).not.toContain('contradicted-finish');
  });

  it('vector contradiction-leaves-no-tcp-marker-on-xml-only-field (INV-2 rule 3): the later XML row, real finish, BetterRunNr 1, presents countingRun 1 from xml, pushed as a change, no source-disagreement', () => {
    const { c, steps } = run(); toLift(steps); steps.xmlFalse(); steps.falseRow(T('09:39:05.373')); steps.realRow(); steps.realFinish();
    const from = c.notifications().length;
    steps.xmlReal();
    expect(field(c, A, 'countingRun')).toMatchObject({ state: 'known', value: 1, source: 'xml', provisional: false });
    expect(attemptMessages(c, from, A).some((m) => 'countingRun' in m.fields), 'the change is pushed').toBe(true);
    expect((c.diagnostics() as Array<{ kind: string; field?: string }>).filter((d) => d.kind === 'source-disagreement' && d.field === 'countingRun')).toEqual([]);
  });

  it('INV-2 rule 3 / INV-2c same-source order: a further XML row with BetterRunNr 2 presents known 2 from xml', () => {
    const { c, steps } = run(); toLift(steps); steps.xmlFalse(); steps.falseRow(T('09:39:05.373')); steps.realRow(); steps.realFinish();
    steps.xmlReal(1); steps.xmlReal(2, T('09:40:02.000'));
    expect(field(c, A, 'countingRun')).toMatchObject({ state: 'known', value: 2, source: 'xml' });
  });

  it('INV-2 rule 3 (retained state): at no step is countingRun presented with source tcp', () => {
    const { c, steps } = run();
    const seen: unknown[] = [];
    const look = () => seen.push(field(c, A, 'countingRun'));
    steps.xmlPre(); look(); steps.atStart(); look(); steps.started(); look(); steps.falseRow(T('09:37:48.972')); look(); steps.falseFinish(); look();
    steps.contradiction(); look(); steps.xmlFalse(); look(); steps.falseRow(T('09:39:05.373')); look(); steps.realRow(); look(); steps.realFinish(); look(); steps.xmlReal(); look();
    expect(seen.filter((e: any) => e?.source === 'tcp')).toEqual([]);
  });
});

describe('row 3: the other rule-3 xml-only fields are untouched by the contradiction and the lift (INV-2d names only outcome, placement, pairTotal, countingRun)', () => {
  const entry = (c: ReturnType<typeof run>['c']) => c.entry() as Record<string, any>;

  it('INV-2 rule 3: ageCategoryId and eventBib of bib 67 stay known, source xml, through the whole sequence', () => {
    const { c, steps } = run();
    const check = (label: string) => {
      expect(entry(c)['ageCategoryId'], `ageCategoryId ${label}`).toMatchObject({ state: 'known', value: 'U23', source: 'xml' });
      expect(entry(c)['eventBib'], `eventBib ${label}`).toMatchObject({ state: 'known', value: '67', source: 'xml' });
    };
    steps.xmlPre(); check('pre-start'); steps.atStart(); steps.started(); steps.falseRow(T('09:37:48.972')); steps.falseFinish(); check('false finish');
    steps.contradiction(); check('contradiction'); steps.xmlFalse(); check('false-finish snapshot'); steps.falseRow(T('09:39:05.373')); check('re-pushed false row');
    steps.realRow(); steps.realFinish(); check('lift');
  });

  it('INV-5: a later XML row restating ageCategoryId and eventBib is a no-op, no notification carries them', () => {
    const { c, steps } = run(); toLift(steps); steps.xmlFalse(); steps.falseRow(T('09:39:05.373')); steps.realRow(); steps.realFinish();
    const from = c.notifications().length;
    steps.xmlReal(1, T('09:39:32.365'), steps.restateEntry(T('09:39:32.365')));
    const sent = JSON.stringify(c.notifications().slice(from));
    expect(sent).not.toContain('ageCategoryId');
    expect(sent).not.toContain('eventBib');
  });
});
