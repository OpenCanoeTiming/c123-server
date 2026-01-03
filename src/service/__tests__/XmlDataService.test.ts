import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { XmlDataService } from '../XmlDataService.js';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('XmlDataService', () => {
  let service: XmlDataService;
  let tempDir: string;
  let xmlPath: string;

  const sampleXml = `<?xml version="1.0" standalone="yes"?>
<Canoe123Data xmlns="http://siwidata.com/Canoe123/Data.xsd">
  <Participants>
    <Id>12054.K1M_ST</Id>
    <ClassId>K1M_ST</ClassId>
    <EventBib>1</EventBib>
    <ICFId>12054</ICFId>
    <FamilyName>PRSKAVEC</FamilyName>
    <GivenName>Jiří</GivenName>
    <Club>USK Praha</Club>
    <Ranking>1</Ranking>
    <Year>1993</Year>
    <CatId>A</CatId>
    <IsTeam>false</IsTeam>
  </Participants>
  <Participants>
    <Id>12055.K1M_ST</Id>
    <ClassId>K1M_ST</ClassId>
    <EventBib>2</EventBib>
    <ICFId>12055</ICFId>
    <FamilyName>FUKSA</FamilyName>
    <GivenName>Martin</GivenName>
    <Club>DUKLA Praha</Club>
    <Ranking>2</Ranking>
    <Year>1987</Year>
    <CatId>A</CatId>
    <IsTeam>false</IsTeam>
  </Participants>
  <Schedule>
    <RaceId>K1M_ST_BR1_6</RaceId>
    <RaceOrder>101</RaceOrder>
    <StartTime>2024-04-06T08:30:00+02:00</StartTime>
    <Time>08:30:00</Time>
    <ClassId>K1M_ST</ClassId>
    <DisId>BR1</DisId>
    <FirstBib>1</FirstBib>
    <StartInterval>0:45</StartInterval>
    <RaceStatus>5</RaceStatus>
    <CustomTitle>K1m - střední trať - 1. jízda</CustomTitle>
  </Schedule>
  <Schedule>
    <RaceId>K1M_ST_BR2_6</RaceId>
    <RaceOrder>104</RaceOrder>
    <StartTime>2024-04-06T10:06:45+02:00</StartTime>
    <Time>+1:30</Time>
    <ClassId>K1M_ST</ClassId>
    <DisId>BR2</DisId>
    <FirstBib>1</FirstBib>
    <StartInterval>0:45</StartInterval>
    <RaceStatus>3</RaceStatus>
    <CustomTitle>K1m - střední trať - 2. jízda</CustomTitle>
  </Schedule>
  <Results>
    <RaceId>K1M_ST_BR1_6</RaceId>
    <Id>12054.K1M_ST</Id>
    <StartOrder>1</StartOrder>
    <Bib>   1</Bib>
    <StartTime>8:30:00</StartTime>
    <Time>76990</Time>
    <Pen>2</Pen>
    <Total>78990</Total>
    <Rnk>1</Rnk>
    <CatRnk>1</CatRnk>
  </Results>
  <Results>
    <RaceId>K1M_ST_BR1_6</RaceId>
    <Id>12055.K1M_ST</Id>
    <StartOrder>2</StartOrder>
    <Bib>   2</Bib>
    <StartTime>8:30:45</StartTime>
    <Time>79500</Time>
    <Pen>0</Pen>
    <Total>79500</Total>
    <Rnk>2</Rnk>
    <CatRnk>2</CatRnk>
  </Results>
</Canoe123Data>`;

  beforeEach(async () => {
    service = new XmlDataService();
    tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'xml-service-test-'));
    xmlPath = path.join(tempDir, 'test.xml');
    await fsPromises.writeFile(xmlPath, sampleXml);
  });

  afterEach(async () => {
    await fsPromises.rm(tempDir, { recursive: true, force: true });
  });

  describe('getStatus', () => {
    it('returns unavailable when path not set', async () => {
      const status = await service.getStatus();

      expect(status.available).toBe(false);
      expect(status.path).toBeNull();
      expect(status.participantCount).toBe(0);
      expect(status.scheduleCount).toBe(0);
    });

    it('returns status with correct counts', async () => {
      service.setPath(xmlPath);
      const status = await service.getStatus();

      expect(status.available).toBe(true);
      expect(status.path).toBe(xmlPath);
      expect(status.participantCount).toBe(2);
      expect(status.scheduleCount).toBe(2);
      expect(status.lastModified).not.toBeNull();
      expect(status.checksum).not.toBeNull();
    });

    it('returns unavailable when file does not exist', async () => {
      service.setPath('/nonexistent/path/file.xml');
      const status = await service.getStatus();

      expect(status.available).toBe(false);
      expect(status.path).toBe('/nonexistent/path/file.xml');
    });
  });

  describe('getParticipants', () => {
    it('returns parsed participants', async () => {
      service.setPath(xmlPath);
      const participants = await service.getParticipants();

      expect(participants).toHaveLength(2);

      expect(participants[0]).toMatchObject({
        id: '12054.K1M_ST',
        classId: 'K1M_ST',
        bib: '1',
        familyName: 'PRSKAVEC',
        givenName: 'Jiří',
        club: 'USK Praha',
        isTeam: false,
      });

      expect(participants[1]).toMatchObject({
        id: '12055.K1M_ST',
        familyName: 'FUKSA',
        givenName: 'Martin',
      });
    });

    it('throws when path not set', async () => {
      await expect(service.getParticipants()).rejects.toThrow('XML path not configured');
    });
  });

  describe('getSchedule', () => {
    it('returns parsed schedule', async () => {
      service.setPath(xmlPath);
      const schedule = await service.getSchedule();

      expect(schedule).toHaveLength(2);

      expect(schedule[0]).toMatchObject({
        raceId: 'K1M_ST_BR1_6',
        raceOrder: 101,
        classId: 'K1M_ST',
        disId: 'BR1',
        raceStatus: 5,
        customTitle: 'K1m - střední trať - 1. jízda',
      });

      expect(schedule[1]).toMatchObject({
        raceId: 'K1M_ST_BR2_6',
        raceOrder: 104,
        disId: 'BR2',
        raceStatus: 3,
      });
    });
  });

  describe('getAllResults', () => {
    it('returns results grouped by raceId', async () => {
      service.setPath(xmlPath);
      const results = await service.getAllResults();

      expect(results.size).toBe(1);
      expect(results.has('K1M_ST_BR1_6')).toBe(true);

      const raceResults = results.get('K1M_ST_BR1_6')!;
      expect(raceResults).toHaveLength(2);

      expect(raceResults[0]).toMatchObject({
        raceId: 'K1M_ST_BR1_6',
        id: '12054.K1M_ST',
        bib: '1',
        time: 76990,
        pen: 2,
        total: 78990,
        rank: 1,
      });
    });
  });

  describe('getResultsForRace', () => {
    it('returns results for specific race', async () => {
      service.setPath(xmlPath);
      const results = await service.getResultsForRace('K1M_ST_BR1_6');

      expect(results).not.toBeNull();
      expect(results).toHaveLength(2);
    });

    it('returns null for non-existent race', async () => {
      service.setPath(xmlPath);
      const results = await service.getResultsForRace('NONEXISTENT');

      expect(results).toBeNull();
    });
  });

  describe('caching', () => {
    it('caches data and reuses on subsequent calls', async () => {
      service.setPath(xmlPath);

      const participants1 = await service.getParticipants();
      const participants2 = await service.getParticipants();

      expect(participants1).toEqual(participants2);
    });

    it('reloads data when file is modified', async () => {
      service.setPath(xmlPath);

      await service.getParticipants();

      // Modify file with delay to ensure mtime changes
      await new Promise((resolve) => setTimeout(resolve, 10));
      const modifiedXml = sampleXml.replace('PRSKAVEC', 'MODIFIED');
      await fsPromises.writeFile(xmlPath, modifiedXml);

      const participants = await service.getParticipants();
      expect(participants[0].familyName).toBe('MODIFIED');
    });

    it('clearCache forces reload', async () => {
      service.setPath(xmlPath);
      await service.getParticipants();

      service.clearCache();

      // Should reload without error
      const participants = await service.getParticipants();
      expect(participants).toHaveLength(2);
    });
  });

  describe('single element handling', () => {
    it('handles single participant', async () => {
      const singleXml = `<?xml version="1.0"?>
<Canoe123Data>
  <Participants>
    <Id>1</Id>
    <ClassId>K1M</ClassId>
    <EventBib>1</EventBib>
    <FamilyName>TEST</FamilyName>
    <GivenName>User</GivenName>
    <Club>Club</Club>
    <IsTeam>false</IsTeam>
  </Participants>
</Canoe123Data>`;

      await fsPromises.writeFile(xmlPath, singleXml);
      service.setPath(xmlPath);

      const participants = await service.getParticipants();
      expect(participants).toHaveLength(1);
      expect(participants[0].familyName).toBe('TEST');
    });
  });

  describe('invalid XML', () => {
    it('throws on non-Canoe123 XML', async () => {
      await fsPromises.writeFile(xmlPath, '<root><data>test</data></root>');
      service.setPath(xmlPath);

      await expect(service.getParticipants()).rejects.toThrow('Invalid XML: not a Canoe123 file');
    });
  });

  describe('getRaces', () => {
    it('returns list of races with basic info', async () => {
      service.setPath(xmlPath);
      const races = await service.getRaces();

      expect(races).toHaveLength(2);

      expect(races[0]).toMatchObject({
        raceId: 'K1M_ST_BR1_6',
        classId: 'K1M_ST',
        disId: 'BR1',
        name: 'K1m - střední trať - 1. jízda',
        participantCount: 2,
        hasResults: true,
      });

      expect(races[1]).toMatchObject({
        raceId: 'K1M_ST_BR2_6',
        classId: 'K1M_ST',
        disId: 'BR2',
        name: 'K1m - střední trať - 2. jízda',
        participantCount: 2,
        hasResults: false,
      });
    });
  });

  describe('getRaceDetail', () => {
    it('returns detailed race info', async () => {
      service.setPath(xmlPath);
      const race = await service.getRaceDetail('K1M_ST_BR1_6');

      expect(race).not.toBeNull();
      expect(race).toMatchObject({
        raceId: 'K1M_ST_BR1_6',
        classId: 'K1M_ST',
        disId: 'BR1',
        name: 'K1m - střední trať - 1. jízda',
        participantCount: 2,
        hasResults: true,
        startlistCount: 2,
        resultsCount: 2,
      });
      expect(race!.relatedRaces).toContain('K1M_ST_BR2_6');
    });

    it('returns null for non-existent race', async () => {
      service.setPath(xmlPath);
      const race = await service.getRaceDetail('NONEXISTENT');

      expect(race).toBeNull();
    });
  });

  describe('getStartlist', () => {
    it('returns startlist from results data', async () => {
      service.setPath(xmlPath);
      const startlist = await service.getStartlist('K1M_ST_BR1_6');

      expect(startlist).not.toBeNull();
      expect(startlist).toHaveLength(2);

      expect(startlist![0]).toMatchObject({
        startOrder: 1,
        bib: '1',
        participantId: '12054.K1M_ST',
        familyName: 'PRSKAVEC',
        givenName: 'Jiří',
        club: 'USK Praha',
      });
    });

    it('returns startlist from participants when no results', async () => {
      service.setPath(xmlPath);
      const startlist = await service.getStartlist('K1M_ST_BR2_6');

      expect(startlist).not.toBeNull();
      expect(startlist).toHaveLength(2);
      expect(startlist![0].bib).toBe('1');
      expect(startlist![1].bib).toBe('2');
    });

    it('returns null for non-existent race', async () => {
      service.setPath(xmlPath);
      const startlist = await service.getStartlist('NONEXISTENT');

      expect(startlist).toBeNull();
    });
  });

  describe('getResultsWithParticipants', () => {
    it('returns results with participant data', async () => {
      service.setPath(xmlPath);
      const results = await service.getResultsWithParticipants('K1M_ST_BR1_6');

      expect(results).not.toBeNull();
      expect(results).toHaveLength(2);

      // Sorted by rank
      expect(results![0].rank).toBe(1);
      expect(results![0].participant).toMatchObject({
        familyName: 'PRSKAVEC',
        givenName: 'Jiří',
      });

      expect(results![1].rank).toBe(2);
      expect(results![1].participant).toMatchObject({
        familyName: 'FUKSA',
        givenName: 'Martin',
      });
    });

    it('returns null for non-existent race', async () => {
      service.setPath(xmlPath);
      const results = await service.getResultsWithParticipants('NONEXISTENT');

      expect(results).toBeNull();
    });
  });

  describe('getMergedResults', () => {
    const xmlWithBothRuns = `<?xml version="1.0"?>
<Canoe123Data>
  <Participants>
    <Id>12054.K1M_ST</Id>
    <ClassId>K1M_ST</ClassId>
    <EventBib>1</EventBib>
    <FamilyName>PRSKAVEC</FamilyName>
    <GivenName>Jiří</GivenName>
    <Club>USK Praha</Club>
    <IsTeam>false</IsTeam>
  </Participants>
  <Participants>
    <Id>12055.K1M_ST</Id>
    <ClassId>K1M_ST</ClassId>
    <EventBib>2</EventBib>
    <FamilyName>FUKSA</FamilyName>
    <GivenName>Martin</GivenName>
    <Club>DUKLA Praha</Club>
    <IsTeam>false</IsTeam>
  </Participants>
  <Schedule>
    <RaceId>K1M_ST_BR1_6</RaceId>
    <ClassId>K1M_ST</ClassId>
    <DisId>BR1</DisId>
  </Schedule>
  <Schedule>
    <RaceId>K1M_ST_BR2_6</RaceId>
    <ClassId>K1M_ST</ClassId>
    <DisId>BR2</DisId>
  </Schedule>
  <Results>
    <RaceId>K1M_ST_BR1_6</RaceId>
    <Id>12054.K1M_ST</Id>
    <Bib>1</Bib>
    <Total>80000</Total>
    <Rnk>2</Rnk>
  </Results>
  <Results>
    <RaceId>K1M_ST_BR1_6</RaceId>
    <Id>12055.K1M_ST</Id>
    <Bib>2</Bib>
    <Total>78000</Total>
    <Rnk>1</Rnk>
  </Results>
  <Results>
    <RaceId>K1M_ST_BR2_6</RaceId>
    <Id>12054.K1M_ST</Id>
    <Bib>1</Bib>
    <Total>77000</Total>
    <Rnk>1</Rnk>
  </Results>
  <Results>
    <RaceId>K1M_ST_BR2_6</RaceId>
    <Id>12055.K1M_ST</Id>
    <Bib>2</Bib>
    <Total>79000</Total>
    <Rnk>2</Rnk>
  </Results>
</Canoe123Data>`;

    it('merges results from both runs', async () => {
      await fsPromises.writeFile(xmlPath, xmlWithBothRuns);
      service.setPath(xmlPath);

      const merged = await service.getMergedResults('K1M_ST');

      expect(merged).toHaveLength(2);

      // Sorted by best total
      expect(merged[0].bib).toBe('1'); // Best: 77000 from BR2
      expect(merged[0].run1?.total).toBe(80000);
      expect(merged[0].run2?.total).toBe(77000);
      expect(merged[0].bestTotal).toBe(77000);
      expect(merged[0].bestRank).toBe(1);

      expect(merged[1].bib).toBe('2'); // Best: 78000 from BR1
      expect(merged[1].run1?.total).toBe(78000);
      expect(merged[1].run2?.total).toBe(79000);
      expect(merged[1].bestTotal).toBe(78000);
      expect(merged[1].bestRank).toBe(2);
    });

    it('handles participants with only one run', async () => {
      const xmlOneRun = `<?xml version="1.0"?>
<Canoe123Data>
  <Participants>
    <Id>12054.K1M_ST</Id>
    <ClassId>K1M_ST</ClassId>
    <EventBib>1</EventBib>
    <FamilyName>PRSKAVEC</FamilyName>
    <GivenName>Jiří</GivenName>
    <Club>USK Praha</Club>
    <IsTeam>false</IsTeam>
  </Participants>
  <Schedule>
    <RaceId>K1M_ST_BR1_6</RaceId>
    <ClassId>K1M_ST</ClassId>
    <DisId>BR1</DisId>
  </Schedule>
  <Schedule>
    <RaceId>K1M_ST_BR2_6</RaceId>
    <ClassId>K1M_ST</ClassId>
    <DisId>BR2</DisId>
  </Schedule>
  <Results>
    <RaceId>K1M_ST_BR1_6</RaceId>
    <Id>12054.K1M_ST</Id>
    <Bib>1</Bib>
    <Total>80000</Total>
    <Rnk>1</Rnk>
  </Results>
</Canoe123Data>`;

      await fsPromises.writeFile(xmlPath, xmlOneRun);
      service.setPath(xmlPath);

      const merged = await service.getMergedResults('K1M_ST');

      expect(merged).toHaveLength(1);
      expect(merged[0].run1?.total).toBe(80000);
      expect(merged[0].run2).toBeUndefined();
      expect(merged[0].bestTotal).toBe(80000);
      expect(merged[0].bestRank).toBe(1);
    });

    it('returns empty array for non-existent class', async () => {
      service.setPath(xmlPath);
      const merged = await service.getMergedResults('NONEXISTENT');

      expect(merged).toHaveLength(0);
    });
  });
});
