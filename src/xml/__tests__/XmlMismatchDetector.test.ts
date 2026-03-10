import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { XmlMismatchDetector } from '../XmlMismatchDetector.js';
import type { MismatchState } from '../XmlMismatchDetector.js';
import { EventState } from '../../state/EventState.js';
import { XmlDataService } from '../../service/XmlDataService.js';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('XmlMismatchDetector', () => {
  let eventState: EventState;
  let xmlDataService: XmlDataService;
  let detector: XmlMismatchDetector;
  let tempDir: string;
  let xmlPath: string;

  const makeXml = (raceIds: string[]) => {
    const schedules = raceIds
      .map(
        (id, i) => `  <Schedule>
    <RaceId>${id}</RaceId>
    <RaceOrder>${i + 1}</RaceOrder>
    <ClassId>K1M</ClassId>
    <DisId>BR1</DisId>
  </Schedule>`,
      )
      .join('\n');

    return `<?xml version="1.0"?>
<Canoe123Data>
  <Participants>
    <Id>1.K1M</Id>
    <ClassId>K1M</ClassId>
    <EventBib>1</EventBib>
    <FamilyName>TEST</FamilyName>
    <GivenName>User</GivenName>
    <Club>Club</Club>
    <IsTeam>false</IsTeam>
  </Participants>
${schedules}
</Canoe123Data>`;
  };

  beforeEach(async () => {
    eventState = new EventState();
    xmlDataService = new XmlDataService();
    xmlDataService.setCacheTtl(0); // Disable TTL for tests

    tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'mismatch-test-'));
    xmlPath = path.join(tempDir, 'test.xml');
  });

  afterEach(async () => {
    detector?.stop();
    eventState.destroy();
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  });

  describe('matching schedules', () => {
    it('does not emit mismatch when fingerprints match', async () => {
      const raceIds = ['K1M_BR1', 'K1M_BR2'];
      await fsPromises.writeFile(xmlPath, makeXml(raceIds));
      xmlDataService.setPath(xmlPath);

      // Simulate TCP schedule with same races
      eventState.processMessage({
        type: 'schedule',
        data: {
          races: raceIds.map((id, i) => ({ raceId: id, order: i + 1 })),
        },
      });

      detector = new XmlMismatchDetector(eventState, xmlDataService, {
        gracePeriodMs: 10,
        recheckIntervalMs: 10000,
      });

      const mismatchSpy = vi.fn();
      detector.on('mismatch', mismatchSpy);
      detector.start();

      await detector.checkMismatch();

      expect(mismatchSpy).not.toHaveBeenCalled();
      expect(detector.mismatchState.detected).toBe(false);
    });
  });

  describe('mismatched schedules', () => {
    it('emits mismatch after grace period when fingerprints differ', async () => {
      // XML has races A, B
      await fsPromises.writeFile(xmlPath, makeXml(['K1M_BR1', 'K1M_BR2']));
      xmlDataService.setPath(xmlPath);

      // TCP has races C, D (different event)
      eventState.processMessage({
        type: 'schedule',
        data: {
          races: [
            { raceId: 'C1M_BR1', order: 1 },
            { raceId: 'C1M_BR2', order: 2 },
          ],
        },
      });

      detector = new XmlMismatchDetector(eventState, xmlDataService, {
        gracePeriodMs: 20,
        recheckIntervalMs: 10000,
      });

      const mismatchPromise = new Promise<MismatchState>((resolve) => {
        detector.on('mismatch', resolve);
      });

      detector.start();
      await detector.checkMismatch();

      const state = await mismatchPromise;

      expect(state.detected).toBe(true);
      expect(state.tcpFingerprint).toBe('C1M_BR1|C1M_BR2');
      expect(state.xmlFingerprint).toBe('K1M_BR1|K1M_BR2');
      expect(state.unmatchedRaceIds).toContain('C1M_BR1');
      expect(state.unmatchedRaceIds).toContain('C1M_BR2');
      expect(state.message).toContain('2 unmatched races');
    });
  });

  describe('auto-resolution', () => {
    it('emits resolved when fingerprints match again after mismatch', async () => {
      // Start with mismatch
      await fsPromises.writeFile(xmlPath, makeXml(['K1M_BR1']));
      xmlDataService.setPath(xmlPath);

      eventState.processMessage({
        type: 'schedule',
        data: { races: [{ raceId: 'C1M_BR1', order: 1 }] },
      });

      detector = new XmlMismatchDetector(eventState, xmlDataService, {
        gracePeriodMs: 10,
        recheckIntervalMs: 30,
      });

      detector.start();
      await detector.checkMismatch();

      // Wait for grace period to confirm mismatch
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(detector.mismatchState.detected).toBe(true);

      // Now fix — update XML to match TCP
      await fsPromises.writeFile(xmlPath, makeXml(['C1M_BR1']));
      xmlDataService.clearCache();

      const resolvedPromise = new Promise<void>((resolve) => {
        detector.on('resolved', resolve);
      });

      // Wait for recheck to auto-resolve
      await resolvedPromise;
      expect(detector.mismatchState.detected).toBe(false);
    });
  });

  describe('race ID check', () => {
    it('triggers mismatch check when TCP race ID not in XML', async () => {
      await fsPromises.writeFile(xmlPath, makeXml(['K1M_BR1']));
      xmlDataService.setPath(xmlPath);

      // TCP schedule with different race
      eventState.processMessage({
        type: 'schedule',
        data: { races: [{ raceId: 'UNKNOWN_RACE', order: 1 }] },
      });

      detector = new XmlMismatchDetector(eventState, xmlDataService, {
        gracePeriodMs: 10,
        recheckIntervalMs: 10000,
      });
      detector.start();

      await detector.checkMismatch();

      // Wait for grace period
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(detector.mismatchState.detected).toBe(true);
      expect(detector.mismatchState.unmatchedRaceIds).toContain('UNKNOWN_RACE');
    });
  });

  describe('edge cases', () => {
    it('does not emit when no TCP schedule', async () => {
      await fsPromises.writeFile(xmlPath, makeXml(['K1M_BR1']));
      xmlDataService.setPath(xmlPath);

      detector = new XmlMismatchDetector(eventState, xmlDataService, {
        gracePeriodMs: 10,
      });

      const mismatchSpy = vi.fn();
      detector.on('mismatch', mismatchSpy);
      detector.start();

      await detector.checkMismatch();

      expect(mismatchSpy).not.toHaveBeenCalled();
    });

    it('does not emit when no XML data', async () => {
      // Don't set XML path
      eventState.processMessage({
        type: 'schedule',
        data: { races: [{ raceId: 'K1M_BR1', order: 1 }] },
      });

      detector = new XmlMismatchDetector(eventState, xmlDataService, {
        gracePeriodMs: 10,
      });

      const mismatchSpy = vi.fn();
      detector.on('mismatch', mismatchSpy);
      detector.start();

      await detector.checkMismatch();

      expect(mismatchSpy).not.toHaveBeenCalled();
    });

    it('grace period cancels if resolved before expiry', async () => {
      await fsPromises.writeFile(xmlPath, makeXml(['K1M_BR1']));
      xmlDataService.setPath(xmlPath);

      eventState.processMessage({
        type: 'schedule',
        data: { races: [{ raceId: 'C1M_BR1', order: 1 }] },
      });

      detector = new XmlMismatchDetector(eventState, xmlDataService, {
        gracePeriodMs: 100, // Long grace period
        recheckIntervalMs: 10000,
      });

      const mismatchSpy = vi.fn();
      detector.on('mismatch', mismatchSpy);
      detector.start();

      await detector.checkMismatch(); // Starts grace period

      // Fix XML before grace period expires
      await fsPromises.writeFile(xmlPath, makeXml(['C1M_BR1']));
      await detector.checkMismatch(); // Should cancel grace period

      // Wait longer than grace period
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mismatchSpy).not.toHaveBeenCalled();
      expect(detector.mismatchState.detected).toBe(false);
    });
  });

  describe('lifecycle', () => {
    it('stop cleans up timers and listeners', async () => {
      await fsPromises.writeFile(xmlPath, makeXml(['K1M_BR1']));
      xmlDataService.setPath(xmlPath);

      detector = new XmlMismatchDetector(eventState, xmlDataService, {
        gracePeriodMs: 10,
      });
      detector.start();
      detector.stop();

      const mismatchSpy = vi.fn();
      detector.on('mismatch', mismatchSpy);

      // Trigger schedule change — should not cause check since stopped
      eventState.processMessage({
        type: 'schedule',
        data: { races: [{ raceId: 'NEW_RACE', order: 1 }] },
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mismatchSpy).not.toHaveBeenCalled();
    });
  });
});
