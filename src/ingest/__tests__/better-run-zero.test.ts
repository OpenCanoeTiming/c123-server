import { describe, it, expect } from 'vitest';
import { parseXmlSnapshot } from '../index.js';
import { ctx, xmlFixture, rowOf } from './helpers.js';

// Round 26b (#278), DERIVATIONS §4.4: "countingRun = BetterRunNr ... 0 means no pair yet, giving `not-yet`". Real shape: jarni-ne-odp
// C1M_BR2_19:64, XML read 11:40:25.507Z, BetterRunNr 1 -> 0 with the pair no longer totalled (Status DNF, no TotalTotal, no TotalRnk).
// Synthetic from slalom.xml: the BR2 row of bib 108 with BetterRunNr 0 (the key must be present as null so the core's writeRow states not-yet).
const br2Row108 = (betterRun: string) => {
  const xml = xmlFixture('slalom.xml');
  const at = xml.indexOf('<RaceId>K1M_BR2_19</RaceId>\r\n    <Id>9047.K1M</Id>');
  if (at < 0) throw new Error('fixture row missing');
  const head = xml.slice(0, at);
  const tail = xml.slice(at).replace('<BetterRunNr>1</BetterRunNr>', `<BetterRunNr>${betterRun}</BetterRunNr>`);
  return rowOf(parseXmlSnapshot(head + tail, ctx()), 'K1M_BR2_19', '108');
};

describe('round 26b (#278): BetterRunNr 0 on a second-run best-pair XML row (DERIVATIONS §4.4; ne-odp C1M_BR2_19:64, 11:40:25.507Z)', () => {
  it('§4.4 BetterRunNr 0: the row carries countingRun as a present key with null (not dropped), so the core presents not-yet', () => {
    const r = br2Row108('0');
    expect('countingRun' in r, 'the key is present so the core\'s writeRow states not-yet').toBe(true);
    expect(r.countingRun).toBeNull();
  });
  it('§4.4 control: BetterRunNr 1 still gives countingRun 1', () => {
    expect(br2Row108('1').countingRun).toBe(1);
  });
  it('round 26b design (12:49:11.285Z run-2 row), §4.4: BetterRunNr 2 gives countingRun 2 (the core presents 2)', () => {
    expect(br2Row108('2').countingRun).toBe(2);
  });
});
