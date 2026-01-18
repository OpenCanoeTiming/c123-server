import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScoringService, type ScoringRequest, type RemoveFromCourseRequest, type TimingRequest } from '../ScoringService.js';
import type { WritableSource } from '../../sources/types.js';
import { EventEmitter } from 'node:events';

/**
 * Mock WritableSource for testing
 */
class MockWritableSource extends EventEmitter implements WritableSource {
  status = 'connected' as const;
  isWritable = true;
  writtenMessages: string[] = [];
  shouldFail = false;

  start(): void {}
  stop(): void {}

  async write(xml: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Write failed');
    }
    this.writtenMessages.push(xml);
  }
}

describe('ScoringService', () => {
  let source: MockWritableSource;
  let service: ScoringService;

  beforeEach(() => {
    source = new MockWritableSource();
    service = new ScoringService(source);
  });

  describe('isReady', () => {
    it('should return true when source is writable', () => {
      source.isWritable = true;
      expect(service.isReady).toBe(true);
    });

    it('should return false when source is not writable', () => {
      source.isWritable = false;
      expect(service.isReady).toBe(false);
    });
  });

  describe('sendScoring', () => {
    it('should format and send scoring XML for valid request', async () => {
      const request: ScoringRequest = {
        bib: '10',
        gate: 5,
        value: 2,
      };

      await service.sendScoring(request);

      expect(source.writtenMessages).toHaveLength(1);
      expect(source.writtenMessages[0]).toContain('<Canoe123 System="Main">');
      expect(source.writtenMessages[0]).toContain('<Scoring Bib="10">');
      expect(source.writtenMessages[0]).toContain('<Penalty Gate="5" Value="2" />');
    });

    it('should handle all penalty values (0, 2, 50)', async () => {
      for (const value of [0, 2, 50] as const) {
        source.writtenMessages = [];
        await service.sendScoring({ bib: '1', gate: 1, value });
        expect(source.writtenMessages[0]).toContain(`Value="${value}"`);
      }
    });

    it('should handle null value (delete penalty)', async () => {
      await service.sendScoring({ bib: '1', gate: 1, value: null });
      expect(source.writtenMessages[0]).toContain('Value=""');
    });

    it('should use PenaltyCorrection format when raceId is provided', async () => {
      await service.sendScoring({ raceId: 'K1M_BR1', bib: '5', gate: 3, value: 2 });
      expect(source.writtenMessages[0]).toContain('<PenaltyCorrection');
      expect(source.writtenMessages[0]).toContain('RaceId="K1M_BR1"');
      expect(source.writtenMessages[0]).toContain('Bib="5"');
      expect(source.writtenMessages[0]).toContain('Gate="3"');
      expect(source.writtenMessages[0]).toContain('Value="2"');
    });

    it('should use Scoring format when raceId is not provided', async () => {
      await service.sendScoring({ bib: '5', gate: 3, value: 2 });
      expect(source.writtenMessages[0]).toContain('<Scoring');
      expect(source.writtenMessages[0]).not.toContain('<PenaltyCorrection');
    });

    it('should escape XML special characters in bib', async () => {
      await service.sendScoring({ bib: '<test&">', gate: 1, value: 0 });
      expect(source.writtenMessages[0]).toContain('Bib="&lt;test&amp;&quot;&gt;"');
    });

    describe('validation', () => {
      it('should throw error for empty bib', async () => {
        await expect(service.sendScoring({ bib: '', gate: 1, value: 0 }))
          .rejects.toThrow('Bib is required');
      });

      it('should throw error for whitespace-only bib', async () => {
        await expect(service.sendScoring({ bib: '   ', gate: 1, value: 0 }))
          .rejects.toThrow('Bib is required');
      });

      it('should throw error for gate < 1', async () => {
        await expect(service.sendScoring({ bib: '10', gate: 0, value: 0 }))
          .rejects.toThrow('Gate must be a number between 1 and 24');
      });

      it('should throw error for gate > 24', async () => {
        await expect(service.sendScoring({ bib: '10', gate: 25, value: 0 }))
          .rejects.toThrow('Gate must be a number between 1 and 24');
      });

      it('should throw error for invalid penalty value', async () => {
        await expect(service.sendScoring({ bib: '10', gate: 1, value: 5 as any }))
          .rejects.toThrow('Value must be 0, 2, 50, or null');
      });
    });

    it('should propagate write errors', async () => {
      source.shouldFail = true;
      await expect(service.sendScoring({ bib: '10', gate: 1, value: 0 }))
        .rejects.toThrow('Write failed');
    });
  });

  describe('sendRemoveFromCourse', () => {
    it('should format and send RemoveFromCourse XML with default position', async () => {
      const request: RemoveFromCourseRequest = {
        bib: '10',
        reason: 'DNS',
      };

      await service.sendRemoveFromCourse(request);

      expect(source.writtenMessages).toHaveLength(1);
      expect(source.writtenMessages[0]).toContain('<Canoe123 System="Main">');
      expect(source.writtenMessages[0]).toContain('<RemoveFromCourse Bib="10" Position="1" Reason="DNS" />');
    });

    it('should handle custom position', async () => {
      await service.sendRemoveFromCourse({ bib: '10', reason: 'DNF', position: 2 });
      expect(source.writtenMessages[0]).toContain('Position="2"');
    });

    it('should handle all reason codes (DNS, DNF, CAP)', async () => {
      for (const reason of ['DNS', 'DNF', 'CAP'] as const) {
        source.writtenMessages = [];
        await service.sendRemoveFromCourse({ bib: '1', reason });
        expect(source.writtenMessages[0]).toContain(`Reason="${reason}"`);
      }
    });

    describe('validation', () => {
      it('should throw error for empty bib', async () => {
        await expect(service.sendRemoveFromCourse({ bib: '', reason: 'DNS' }))
          .rejects.toThrow('Bib is required');
      });

      it('should throw error for invalid reason', async () => {
        await expect(service.sendRemoveFromCourse({ bib: '10', reason: 'INVALID' as any }))
          .rejects.toThrow('Reason must be DNS, DNF, or CAP');
      });
    });
  });

  describe('sendTiming', () => {
    it('should format and send Timing XML', async () => {
      const request: TimingRequest = {
        bib: '10',
        channelPosition: 'Start',
      };

      await service.sendTiming(request);

      expect(source.writtenMessages).toHaveLength(1);
      expect(source.writtenMessages[0]).toContain('<Canoe123 System="Main">');
      expect(source.writtenMessages[0]).toContain('<Timing Bib="10" ChannelPosition="Start" HasChannel="1" />');
    });

    it('should handle all channel positions', async () => {
      for (const channelPosition of ['Start', 'Finish', 'Split1', 'Split2'] as const) {
        source.writtenMessages = [];
        await service.sendTiming({ bib: '1', channelPosition });
        expect(source.writtenMessages[0]).toContain(`ChannelPosition="${channelPosition}"`);
      }
    });

    describe('validation', () => {
      it('should throw error for empty bib', async () => {
        await expect(service.sendTiming({ bib: '', channelPosition: 'Start' }))
          .rejects.toThrow('Bib is required');
      });

      it('should throw error for invalid channelPosition', async () => {
        await expect(service.sendTiming({ bib: '10', channelPosition: 'Invalid' as any }))
          .rejects.toThrow('ChannelPosition must be Start, Finish, Split1, or Split2');
      });
    });
  });
});
