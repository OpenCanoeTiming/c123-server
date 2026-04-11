import { describe, it, expect } from 'vitest';
import { compareVersions, APP_VERSION } from '../appVersion.js';

describe('compareVersions', () => {
  describe('main version parts', () => {
    it('equal versions compare to 0', () => {
      expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
      expect(compareVersions('0.0.0', '0.0.0')).toBe(0);
    });

    it('higher major wins', () => {
      expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
    });

    it('higher minor wins when major equal', () => {
      expect(compareVersions('1.2.0', '1.1.9')).toBe(1);
      expect(compareVersions('1.1.0', '1.2.0')).toBe(-1);
    });

    it('higher patch wins when major+minor equal', () => {
      expect(compareVersions('1.0.2', '1.0.1')).toBe(1);
      expect(compareVersions('1.0.1', '1.0.2')).toBe(-1);
    });

    it('missing parts default to 0', () => {
      expect(compareVersions('1.2', '1.2.0')).toBe(0);
      expect(compareVersions('1', '1.0.0')).toBe(0);
      expect(compareVersions('1.2.1', '1.2')).toBe(1);
    });

    it('strips leading v prefix', () => {
      expect(compareVersions('v1.2.3', '1.2.3')).toBe(0);
      expect(compareVersions('V2.0.0', 'v1.9.9')).toBe(1);
    });

    it('trims whitespace', () => {
      expect(compareVersions(' 1.2.3 ', '1.2.3')).toBe(0);
    });

    it('non-numeric segments default to 0', () => {
      expect(compareVersions('1.x.3', '1.0.3')).toBe(0);
    });
  });

  describe('pre-release ordering (semver §11)', () => {
    it('release > pre-release of the same main version', () => {
      expect(compareVersions('1.0.0', '1.0.0-rc.1')).toBe(1);
      expect(compareVersions('1.0.0-rc.1', '1.0.0')).toBe(-1);
      expect(compareVersions('1.0.0', '1.0.0-alpha')).toBe(1);
    });

    it('two pre-releases compare their identifiers', () => {
      expect(compareVersions('1.0.0-alpha', '1.0.0-beta')).toBe(-1);
      expect(compareVersions('1.0.0-beta', '1.0.0-alpha')).toBe(1);
      expect(compareVersions('1.0.0-rc.1', '1.0.0-rc.1')).toBe(0);
    });

    it('numeric pre-release identifiers compare numerically (not lexically)', () => {
      // The critical bug that plain string comparison would get wrong:
      // lex: "rc.10" < "rc.2". Numeric: rc.10 > rc.2.
      expect(compareVersions('1.0.0-rc.10', '1.0.0-rc.2')).toBe(1);
      expect(compareVersions('1.0.0-rc.2', '1.0.0-rc.10')).toBe(-1);
      expect(compareVersions('1.0.0-beta.2', '1.0.0-beta.10')).toBe(-1);
    });

    it('numeric identifiers have lower precedence than non-numeric', () => {
      // Per semver §11: "1.0.0-1" < "1.0.0-alpha"
      expect(compareVersions('1.0.0-1', '1.0.0-alpha')).toBe(-1);
      expect(compareVersions('1.0.0-alpha', '1.0.0-1')).toBe(1);
    });

    it('longer identifier set wins when shared prefix is equal', () => {
      expect(compareVersions('1.0.0-alpha', '1.0.0-alpha.1')).toBe(-1);
      expect(compareVersions('1.0.0-alpha.1', '1.0.0-alpha')).toBe(1);
    });

    it('follows the canonical semver example chain', () => {
      // semver.org §11 example:
      // 1.0.0-alpha < 1.0.0-alpha.1 < 1.0.0-alpha.beta < 1.0.0-beta <
      // 1.0.0-beta.2 < 1.0.0-beta.11 < 1.0.0-rc.1 < 1.0.0
      const chain = [
        '1.0.0-alpha',
        '1.0.0-alpha.1',
        '1.0.0-alpha.beta',
        '1.0.0-beta',
        '1.0.0-beta.2',
        '1.0.0-beta.11',
        '1.0.0-rc.1',
        '1.0.0',
      ];
      for (let i = 0; i < chain.length - 1; i++) {
        expect(compareVersions(chain[i]!, chain[i + 1]!)).toBe(-1);
        expect(compareVersions(chain[i + 1]!, chain[i]!)).toBe(1);
      }
    });
  });

  describe('build metadata (semver §10)', () => {
    it('ignores build metadata for precedence', () => {
      expect(compareVersions('1.0.0+build.1', '1.0.0+build.2')).toBe(0);
      expect(compareVersions('1.0.0+abc', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.0-rc.1+a', '1.0.0-rc.1+b')).toBe(0);
    });
  });
});

describe('APP_VERSION', () => {
  it('is read from package.json and not the fallback', () => {
    // Guards against the readVersion() catch path silently returning "0.0.0"
    // if appVersion.ts is ever moved to a different depth.
    expect(APP_VERSION).not.toBe('0.0.0');
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
