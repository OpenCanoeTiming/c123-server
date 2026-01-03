import fsPromises from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';

/**
 * Parsed participant from XML
 */
export interface XmlParticipant {
  id: string;
  classId: string;
  bib: string;
  icfId?: string | undefined;
  familyName: string;
  givenName: string;
  familyName2?: string | undefined;
  givenName2?: string | undefined;
  club: string;
  ranking?: string | undefined;
  year?: string | undefined;
  catId?: string | undefined;
  isTeam: boolean;
}

/**
 * Parsed schedule item from XML
 */
export interface XmlScheduleItem {
  raceId: string;
  raceOrder?: number | undefined;
  startTime?: string | undefined;
  time?: string | undefined;
  classId?: string | undefined;
  disId?: string | undefined;
  firstBib?: string | undefined;
  startInterval?: string | undefined;
  raceStatus?: number | undefined;
  customTitle?: string | undefined;
}

/**
 * Parsed result row from XML
 */
export interface XmlResultRow {
  raceId: string;
  id: string;
  startOrder: number;
  bib: string;
  startTime?: string | undefined;
  status?: string | undefined;
  time?: number | undefined;
  pen?: number | undefined;
  total?: number | undefined;
  rank?: number | undefined;
  catRank?: number | undefined;
  prevTime?: number | undefined;
  prevPen?: number | undefined;
  prevTotal?: number | undefined;
  prevRank?: number | undefined;
}

/**
 * XML data status
 */
export interface XmlDataStatus {
  available: boolean;
  path: string | null;
  lastModified: string | null;
  checksum: string | null;
  participantCount: number;
  scheduleCount: number;
}

/**
 * Service for reading and parsing C123 XML data files.
 *
 * Provides access to:
 * - Participants (all competitors)
 * - Schedule (race list with times)
 * - Results (per-race results)
 */
export class XmlDataService {
  private xmlPath: string | null = null;
  private lastModified: Date | null = null;
  private cachedData: Canoe123Data | null = null;
  private checksum: string | null = null;

  private readonly parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      allowBooleanAttributes: true,
      parseTagValue: true,
      trimValues: true,
    });
  }

  /**
   * Set the XML file path
   */
  setPath(path: string | null): void {
    this.xmlPath = path;
    this.cachedData = null;
    this.lastModified = null;
    this.checksum = null;
  }

  /**
   * Get the current XML file path
   */
  getPath(): string | null {
    return this.xmlPath;
  }

  /**
   * Get XML data status
   */
  async getStatus(): Promise<XmlDataStatus> {
    if (!this.xmlPath) {
      return {
        available: false,
        path: null,
        lastModified: null,
        checksum: null,
        participantCount: 0,
        scheduleCount: 0,
      };
    }

    try {
      await this.loadIfNeeded();

      return {
        available: true,
        path: this.xmlPath,
        lastModified: this.lastModified?.toISOString() ?? null,
        checksum: this.checksum,
        participantCount: this.getParticipantsFromCache().length,
        scheduleCount: this.getScheduleFromCache().length,
      };
    } catch {
      return {
        available: false,
        path: this.xmlPath,
        lastModified: null,
        checksum: null,
        participantCount: 0,
        scheduleCount: 0,
      };
    }
  }

  /**
   * Get all participants
   */
  async getParticipants(): Promise<XmlParticipant[]> {
    await this.loadIfNeeded();
    return this.getParticipantsFromCache();
  }

  /**
   * Get race schedule
   */
  async getSchedule(): Promise<XmlScheduleItem[]> {
    await this.loadIfNeeded();
    return this.getScheduleFromCache();
  }

  /**
   * Get results for all races
   */
  async getAllResults(): Promise<Map<string, XmlResultRow[]>> {
    await this.loadIfNeeded();
    return this.getResultsFromCache();
  }

  /**
   * Get results for a specific race
   */
  async getResultsForRace(raceId: string): Promise<XmlResultRow[] | null> {
    await this.loadIfNeeded();
    const results = this.getResultsFromCache();
    return results.get(raceId) ?? null;
  }

  /**
   * Load XML file if not already loaded or if it has changed
   */
  private async loadIfNeeded(): Promise<void> {
    if (!this.xmlPath) {
      throw new Error('XML path not configured');
    }

    const stats = await fsPromises.stat(this.xmlPath);
    const mtime = stats.mtime;

    // Check if file has changed
    if (this.lastModified && mtime.getTime() === this.lastModified.getTime() && this.cachedData) {
      return;
    }

    const content = await fsPromises.readFile(this.xmlPath, 'utf-8');

    // Calculate simple checksum (hash of length + first/last chars)
    this.checksum = `${content.length}-${content.charCodeAt(100) || 0}-${content.charCodeAt(content.length - 100) || 0}`;
    this.lastModified = mtime;

    // Parse XML
    const parsed = this.parser.parse(content);

    if (!parsed.Canoe123Data) {
      throw new Error('Invalid XML: not a Canoe123 file');
    }

    this.cachedData = parsed.Canoe123Data;
  }

  /**
   * Extract participants from cached data
   */
  private getParticipantsFromCache(): XmlParticipant[] {
    if (!this.cachedData?.Participants) {
      return [];
    }

    const participants = Array.isArray(this.cachedData.Participants)
      ? this.cachedData.Participants
      : [this.cachedData.Participants];

    return participants.map((p) => ({
      id: String(p.Id ?? ''),
      classId: String(p.ClassId ?? ''),
      bib: String(p.EventBib ?? '').trim(),
      icfId: p.ICFId ? String(p.ICFId) : undefined,
      familyName: String(p.FamilyName ?? ''),
      givenName: String(p.GivenName ?? ''),
      familyName2: p.FamilyName2 ? String(p.FamilyName2) : undefined,
      givenName2: p.GivenName2 ? String(p.GivenName2) : undefined,
      club: String(p.Club ?? ''),
      ranking: p.Ranking ? String(p.Ranking).trim() : undefined,
      year: p.Year ? String(p.Year) : undefined,
      catId: p.CatId ? String(p.CatId) : undefined,
      isTeam: p.IsTeam === 'true' || p.IsTeam === true,
    }));
  }

  /**
   * Extract schedule from cached data
   */
  private getScheduleFromCache(): XmlScheduleItem[] {
    if (!this.cachedData?.Schedule) {
      return [];
    }

    const schedule = Array.isArray(this.cachedData.Schedule)
      ? this.cachedData.Schedule
      : [this.cachedData.Schedule];

    return schedule
      .filter((s) => s.RaceId && !String(s.RaceId).includes('unassigned'))
      .map((s) => ({
        raceId: String(s.RaceId),
        raceOrder: s.RaceOrder ? Number(s.RaceOrder) : undefined,
        startTime: s.StartTime ? String(s.StartTime) : undefined,
        time: s.Time ? String(s.Time) : undefined,
        classId: s.ClassId ? String(s.ClassId) : undefined,
        disId: s.DisId ? String(s.DisId) : undefined,
        firstBib: s.FirstBib ? String(s.FirstBib) : undefined,
        startInterval: s.StartInterval ? String(s.StartInterval) : undefined,
        raceStatus: s.RaceStatus !== undefined ? Number(s.RaceStatus) : undefined,
        customTitle: s.CustomTitle ? String(s.CustomTitle) : undefined,
      }));
  }

  /**
   * Extract results from cached data, grouped by raceId
   */
  private getResultsFromCache(): Map<string, XmlResultRow[]> {
    const resultsMap = new Map<string, XmlResultRow[]>();

    if (!this.cachedData?.Results) {
      return resultsMap;
    }

    const results = Array.isArray(this.cachedData.Results)
      ? this.cachedData.Results
      : [this.cachedData.Results];

    for (const r of results) {
      const raceId = String(r.RaceId ?? '');
      if (!raceId) continue;

      const row: XmlResultRow = {
        raceId,
        id: String(r.Id ?? ''),
        startOrder: Number(r.StartOrder ?? 0),
        bib: String(r.Bib ?? '').trim(),
        startTime: r.StartTime ? String(r.StartTime) : undefined,
        status: r.Status ? String(r.Status) : undefined,
        time: r.Time !== undefined ? Number(r.Time) : undefined,
        pen: r.Pen !== undefined ? Number(r.Pen) : undefined,
        total: r.Total !== undefined ? Number(r.Total) : undefined,
        rank: r.Rnk !== undefined ? Number(r.Rnk) : undefined,
        catRank: r.CatRnk !== undefined ? Number(r.CatRnk) : undefined,
        prevTime: r.PrevTime !== undefined ? Number(r.PrevTime) : undefined,
        prevPen: r.PrevPen !== undefined ? Number(r.PrevPen) : undefined,
        prevTotal: r.PrevTotal !== undefined ? Number(r.PrevTotal) : undefined,
        prevRank: r.PrevRnk !== undefined ? Number(r.PrevRnk) : undefined,
      };

      if (!resultsMap.has(raceId)) {
        resultsMap.set(raceId, []);
      }
      resultsMap.get(raceId)!.push(row);
    }

    return resultsMap;
  }

  /**
   * Force reload of XML data (clears cache)
   */
  clearCache(): void {
    this.cachedData = null;
    this.lastModified = null;
    this.checksum = null;
  }
}

/**
 * Raw parsed Canoe123Data structure
 */
interface Canoe123Data {
  Participants?: RawParticipant | RawParticipant[];
  Schedule?: RawSchedule | RawSchedule[];
  Results?: RawResult | RawResult[];
  Classes?: unknown;
}

interface RawParticipant {
  Id?: string;
  ClassId?: string;
  EventBib?: string | number;
  ICFId?: string | number;
  FamilyName?: string;
  GivenName?: string;
  FamilyName2?: string;
  GivenName2?: string;
  Club?: string;
  Ranking?: string | number;
  Year?: string | number;
  CatId?: string;
  IsTeam?: string | boolean;
}

interface RawSchedule {
  RaceId?: string;
  RaceOrder?: string | number;
  StartTime?: string;
  Time?: string;
  ClassId?: string;
  DisId?: string;
  FirstBib?: string;
  StartInterval?: string;
  RaceStatus?: string | number;
  CustomTitle?: string;
}

interface RawResult {
  RaceId?: string;
  Id?: string;
  StartOrder?: string | number;
  Bib?: string;
  StartTime?: string;
  Status?: string;
  Time?: string | number;
  Pen?: string | number;
  Total?: string | number;
  Rnk?: string | number;
  CatRnk?: string | number;
  PrevTime?: string | number;
  PrevPen?: string | number;
  PrevTotal?: string | number;
  PrevRnk?: string | number;
}
