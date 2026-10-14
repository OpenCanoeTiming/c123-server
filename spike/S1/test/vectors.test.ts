import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runVector } from '../src/vectors.js';

const file = new URL('../../../docs/arch/vectors/tier1-conformance.json', import.meta.url);
const vectors = JSON.parse(readFileSync(file, 'utf8')).vectors as any[];

describe('tier-1 conformance vectors', () => {
  it('has 84 vectors', () => expect(vectors.length).toBe(84));
  for (const v of vectors) {
    it(`${v.id} [${v.invariant}]`, () => {
      const r = runVector(v);
      expect(r.failures).toEqual([]);
    });
  }
});
