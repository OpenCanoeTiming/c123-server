/** #328 defect 3 (#145): the dual-stack listener lets the same local scoreboard arrive as `::1`, `::ffff:127.0.0.1` or `127.0.0.1`; one key. */
import { describe, expect, it } from 'vitest';
import { normalizeIp } from '../clients.js';

describe('#145: client IP key', () => {
  it('::1 is 127.0.0.1 and ::ffff:a.b.c.d is a.b.c.d', () => {
    expect(normalizeIp('::1')).toBe('127.0.0.1');
    expect(normalizeIp('::ffff:192.168.1.20')).toBe('192.168.1.20');
    expect(normalizeIp('192.168.1.20')).toBe('192.168.1.20');
  });
  it('a clientId passes through unchanged', () => {
    expect(normalizeIp('finish-line')).toBe('finish-line');
  });
});
