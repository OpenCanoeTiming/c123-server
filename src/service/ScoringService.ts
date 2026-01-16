import type { WritableSource } from '../sources/types.js';
import { Logger } from '../utils/logger.js';

/**
 * Penalty values supported by C123
 */
export type PenaltyValue = 0 | 2 | 50;

/**
 * Reason codes for removing competitor from course
 */
export type RemoveReason = 'DNS' | 'DNF' | 'CAP';

/**
 * Channel positions for timing impulses
 */
export type ChannelPosition = 'Start' | 'Finish' | 'Split1' | 'Split2';

/**
 * Scoring request payload
 */
export interface ScoringRequest {
  bib: string;
  gate: number;
  value: PenaltyValue;
}

/**
 * RemoveFromCourse request payload
 */
export interface RemoveFromCourseRequest {
  bib: string;
  reason: RemoveReason;
  position?: number;
}

/**
 * Timing request payload
 */
export interface TimingRequest {
  bib: string;
  channelPosition: ChannelPosition;
}

/**
 * Service for sending scoring and timing commands to C123.
 *
 * Formats requests into C123 XML protocol and sends them via TCP.
 */
export class ScoringService {
  private readonly source: WritableSource;

  constructor(source: WritableSource) {
    this.source = source;
  }

  /**
   * Check if the service is ready to send commands
   */
  get isReady(): boolean {
    return this.source.isWritable;
  }

  /**
   * Send a penalty scoring command to C123.
   *
   * @param request - Scoring request with bib, gate, and penalty value
   * @throws Error if validation fails or write fails
   */
  async sendScoring(request: ScoringRequest): Promise<void> {
    this.validateScoringRequest(request);

    const xml = this.formatScoringXml(request);
    Logger.info('ScoringService', `Sending penalty: Bib=${request.bib} Gate=${request.gate} Value=${request.value}`);

    await this.source.write(xml);
  }

  /**
   * Send a RemoveFromCourse command to C123.
   *
   * @param request - Remove request with bib and reason
   * @throws Error if validation fails or write fails
   */
  async sendRemoveFromCourse(request: RemoveFromCourseRequest): Promise<void> {
    this.validateRemoveRequest(request);

    const xml = this.formatRemoveFromCourseXml(request);
    Logger.info('ScoringService', `Sending remove: Bib=${request.bib} Reason=${request.reason}`);

    await this.source.write(xml);
  }

  /**
   * Send a manual timing impulse command to C123.
   *
   * @param request - Timing request with bib and channel position
   * @throws Error if validation fails or write fails
   */
  async sendTiming(request: TimingRequest): Promise<void> {
    this.validateTimingRequest(request);

    const xml = this.formatTimingXml(request);
    Logger.info('ScoringService', `Sending timing: Bib=${request.bib} Position=${request.channelPosition}`);

    await this.source.write(xml);
  }

  /**
   * Validate scoring request
   */
  private validateScoringRequest(request: ScoringRequest): void {
    if (!request.bib || request.bib.trim() === '') {
      throw new Error('Bib is required');
    }

    if (typeof request.gate !== 'number' || request.gate < 1 || request.gate > 24) {
      throw new Error('Gate must be a number between 1 and 24');
    }

    if (![0, 2, 50].includes(request.value)) {
      throw new Error('Value must be 0, 2, or 50');
    }
  }

  /**
   * Validate remove from course request
   */
  private validateRemoveRequest(request: RemoveFromCourseRequest): void {
    if (!request.bib || request.bib.trim() === '') {
      throw new Error('Bib is required');
    }

    if (!['DNS', 'DNF', 'CAP'].includes(request.reason)) {
      throw new Error('Reason must be DNS, DNF, or CAP');
    }
  }

  /**
   * Validate timing request
   */
  private validateTimingRequest(request: TimingRequest): void {
    if (!request.bib || request.bib.trim() === '') {
      throw new Error('Bib is required');
    }

    if (!['Start', 'Finish', 'Split1', 'Split2'].includes(request.channelPosition)) {
      throw new Error('ChannelPosition must be Start, Finish, Split1, or Split2');
    }
  }

  /**
   * Format scoring request as C123 XML
   */
  private formatScoringXml(request: ScoringRequest): string {
    return `<Canoe123 System="Main">
  <Scoring Bib="${this.escapeXml(request.bib)}">
    <Penalty Gate="${request.gate}" Value="${request.value}" />
  </Scoring>
</Canoe123>`;
  }

  /**
   * Format remove from course request as C123 XML
   */
  private formatRemoveFromCourseXml(request: RemoveFromCourseRequest): string {
    const positionAttr = request.position !== undefined ? ` Position="${request.position}"` : ' Position="1"';
    return `<Canoe123 System="Main">
  <RemoveFromCourse Bib="${this.escapeXml(request.bib)}"${positionAttr} Reason="${request.reason}" />
</Canoe123>`;
  }

  /**
   * Format timing request as C123 XML
   */
  private formatTimingXml(request: TimingRequest): string {
    return `<Canoe123 System="Main">
  <Timing Bib="${this.escapeXml(request.bib)}" ChannelPosition="${request.channelPosition}" HasChannel="1" />
</Canoe123>`;
  }

  /**
   * Escape special XML characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
