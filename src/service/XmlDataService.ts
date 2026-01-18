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
 * Race info combining schedule data with status
 */
export interface XmlRace {
  raceId: string;
  classId: string;
  disId: string; // BR1, BR2, etc.
  name: string;
  startTime?: string | undefined;
  raceOrder?: number | undefined;
  raceStatus?: number | undefined;
  participantCount: number;
  hasResults: boolean;
}

/**
 * Race detail with related data
 */
export interface XmlRaceDetail extends XmlRace {
  startlistCount: number;
  resultsCount: number;
  relatedRaces: string[]; // Other runs of same class (BR1 <-> BR2)
}

/**
 * Startlist entry for a race
 */
export interface XmlStartlistEntry {
  startOrder: number;
  bib: string;
  participantId: string;
  startTime?: string | undefined;
  familyName: string;
  givenName: string;
  familyName2?: string | undefined;
  givenName2?: string | undefined;
  club: string;
}

/**
 * Course data from XML - gate configuration and split positions
 */
export interface XmlCourseData {
  courseNr: number;
  courseConfig: string; // "NNRNSNRNS..." including S for splits
  splits: number[]; // Gate numbers where splits occur (1-indexed)
}

/**
 * Merged result combining BR1 and BR2
 */
export interface XmlMergedResult {
  bib: string;
  participantId: string;
  familyName: string;
  givenName: string;
  familyName2?: string | undefined;
  givenName2?: string | undefined;
  club: string;
  run1?: {
    time?: number | undefined;
    pen?: number | undefined;
    total?: number | undefined;
    rank?: number | undefined;
    status?: string | undefined;
  } | undefined;
  run2?: {
    time?: number | undefined;
    pen?: number | undefined;
    total?: number | undefined;
    rank?: number | undefined;
    status?: string | undefined;
  } | undefined;
  bestTotal?: number | undefined;
  bestRank?: number | undefined;
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
   * Check if XML data is loaded and available
   */
  hasData(): boolean {
    return this.xmlPath !== null && this.cachedData !== null;
  }

  /**
   * Get event name from XML (MainTitle element)
   * Returns null if not available
   */
  async getEventName(): Promise<string | null> {
    if (!this.xmlPath) {
      return null;
    }

    try {
      await this.loadIfNeeded();
      if (!this.cachedData) {
        return null;
      }

      // MainTitle is at the root level of Canoe123Data
      const mainTitle = (this.cachedData as Canoe123DataWithEvent).MainTitle;
      return mainTitle ? String(mainTitle) : null;
    } catch {
      return null;
    }
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
   * Get list of all races with basic info
   */
  async getRaces(): Promise<XmlRace[]> {
    await this.loadIfNeeded();
    const schedule = this.getScheduleFromCache();
    const results = this.getResultsFromCache();
    const participants = this.getParticipantsFromCache();

    // Count participants per class
    const participantsByClass = new Map<string, number>();
    for (const p of participants) {
      const count = participantsByClass.get(p.classId) ?? 0;
      participantsByClass.set(p.classId, count + 1);
    }

    return schedule.map((s) => ({
      raceId: s.raceId,
      classId: s.classId ?? '',
      disId: s.disId ?? '',
      name: s.customTitle ?? s.raceId,
      startTime: s.startTime,
      raceOrder: s.raceOrder,
      raceStatus: s.raceStatus,
      participantCount: participantsByClass.get(s.classId ?? '') ?? 0,
      hasResults: results.has(s.raceId),
    }));
  }

  /**
   * Get detailed info for a specific race
   */
  async getRaceDetail(raceId: string): Promise<XmlRaceDetail | null> {
    await this.loadIfNeeded();
    const schedule = this.getScheduleFromCache();
    const scheduleItem = schedule.find((s) => s.raceId === raceId);

    if (!scheduleItem) {
      return null;
    }

    const results = this.getResultsFromCache();
    const participants = this.getParticipantsFromCache();

    // Count participants for this class
    const classId = scheduleItem.classId ?? '';
    const participantCount = participants.filter((p) => p.classId === classId).length;

    // Find related races (same class, different run)
    const relatedRaces = schedule
      .filter((s) => s.classId === classId && s.raceId !== raceId)
      .map((s) => s.raceId);

    const raceResults = results.get(raceId) ?? [];

    return {
      raceId: scheduleItem.raceId,
      classId,
      disId: scheduleItem.disId ?? '',
      name: scheduleItem.customTitle ?? scheduleItem.raceId,
      startTime: scheduleItem.startTime,
      raceOrder: scheduleItem.raceOrder,
      raceStatus: scheduleItem.raceStatus,
      participantCount,
      hasResults: raceResults.length > 0,
      startlistCount: participantCount,
      resultsCount: raceResults.length,
      relatedRaces,
    };
  }

  /**
   * Get startlist for a specific race
   */
  async getStartlist(raceId: string): Promise<XmlStartlistEntry[] | null> {
    await this.loadIfNeeded();
    const schedule = this.getScheduleFromCache();
    const scheduleItem = schedule.find((s) => s.raceId === raceId);

    if (!scheduleItem) {
      return null;
    }

    const participants = this.getParticipantsFromCache();
    const results = this.getResultsFromCache();
    const raceResults = results.get(raceId) ?? [];

    // Get participants for this class
    const classId = scheduleItem.classId ?? '';
    const classParticipants = participants.filter((p) => p.classId === classId);

    // Build startlist from results (if available) or from participants
    if (raceResults.length > 0) {
      // Use results order
      return raceResults
        .sort((a, b) => a.startOrder - b.startOrder)
        .map((r) => {
          const participant = participants.find((p) => p.id === r.id);
          return {
            startOrder: r.startOrder,
            bib: r.bib,
            participantId: r.id,
            startTime: r.startTime,
            familyName: participant?.familyName ?? '',
            givenName: participant?.givenName ?? '',
            familyName2: participant?.familyName2,
            givenName2: participant?.givenName2,
            club: participant?.club ?? '',
          };
        });
    }

    // Fallback: use participants sorted by bib
    return classParticipants
      .sort((a, b) => Number(a.bib) - Number(b.bib))
      .map((p, index) => ({
        startOrder: index + 1,
        bib: p.bib,
        participantId: p.id,
        startTime: undefined,
        familyName: p.familyName,
        givenName: p.givenName,
        familyName2: p.familyName2,
        givenName2: p.givenName2,
        club: p.club,
      }));
  }

  /**
   * Get results for a specific race with participant data
   */
  async getResultsWithParticipants(raceId: string): Promise<(XmlResultRow & { participant?: XmlParticipant | undefined })[] | null> {
    await this.loadIfNeeded();
    const results = this.getResultsFromCache();
    const raceResults = results.get(raceId);

    if (!raceResults) {
      return null;
    }

    const participants = this.getParticipantsFromCache();
    const participantMap = new Map(participants.map((p) => [p.id, p]));

    return raceResults
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
      .map((r) => ({
        ...r,
        participant: participantMap.get(r.id),
      }));
  }

  /**
   * Get merged results for both runs of a class
   */
  async getMergedResults(classId: string): Promise<XmlMergedResult[]> {
    await this.loadIfNeeded();
    const schedule = this.getScheduleFromCache();
    const results = this.getResultsFromCache();
    const participants = this.getParticipantsFromCache();

    // Find BR1 and BR2 races for this class
    const br1Race = schedule.find((s) => s.classId === classId && s.disId === 'BR1');
    const br2Race = schedule.find((s) => s.classId === classId && s.disId === 'BR2');

    const br1Results = br1Race ? results.get(br1Race.raceId) ?? [] : [];
    const br2Results = br2Race ? results.get(br2Race.raceId) ?? [] : [];

    // Build participant map
    const participantMap = new Map(participants.map((p) => [p.id, p]));

    // Merge results by participant ID
    const mergedMap = new Map<string, XmlMergedResult>();

    for (const r of br1Results) {
      const participant = participantMap.get(r.id);
      mergedMap.set(r.id, {
        bib: r.bib,
        participantId: r.id,
        familyName: participant?.familyName ?? '',
        givenName: participant?.givenName ?? '',
        familyName2: participant?.familyName2,
        givenName2: participant?.givenName2,
        club: participant?.club ?? '',
        run1: {
          time: r.time,
          pen: r.pen,
          total: r.total,
          rank: r.rank,
          status: r.status,
        },
      });
    }

    for (const r of br2Results) {
      const existing = mergedMap.get(r.id);
      if (existing) {
        existing.run2 = {
          time: r.time,
          pen: r.pen,
          total: r.total,
          rank: r.rank,
          status: r.status,
        };
      } else {
        const participant = participantMap.get(r.id);
        mergedMap.set(r.id, {
          bib: r.bib,
          participantId: r.id,
          familyName: participant?.familyName ?? '',
          givenName: participant?.givenName ?? '',
          familyName2: participant?.familyName2,
          givenName2: participant?.givenName2,
          club: participant?.club ?? '',
          run2: {
            time: r.time,
            pen: r.pen,
            total: r.total,
            rank: r.rank,
            status: r.status,
          },
        });
      }
    }

    // Calculate best total and rank
    const merged = Array.from(mergedMap.values()).map((m) => {
      const run1Total = m.run1?.total;
      const run2Total = m.run2?.total;

      if (run1Total !== undefined && run2Total !== undefined) {
        m.bestTotal = Math.min(run1Total, run2Total);
      } else if (run1Total !== undefined) {
        m.bestTotal = run1Total;
      } else if (run2Total !== undefined) {
        m.bestTotal = run2Total;
      }

      return m;
    });

    // Sort by best total and assign rank
    merged.sort((a, b) => (a.bestTotal ?? Infinity) - (b.bestTotal ?? Infinity));
    merged.forEach((m, index) => {
      if (m.bestTotal !== undefined) {
        m.bestRank = index + 1;
      }
    });

    return merged;
  }

  /**
   * Get course data with gate configuration and split positions
   */
  async getCourses(): Promise<XmlCourseData[]> {
    await this.loadIfNeeded();
    return this.getCoursesFromCache();
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
   * Extract course data from cached data
   * Calculates split positions from CourseConfig string
   */
  private getCoursesFromCache(): XmlCourseData[] {
    if (!this.cachedData?.CourseData) {
      return [];
    }

    const courses = Array.isArray(this.cachedData.CourseData)
      ? this.cachedData.CourseData
      : [this.cachedData.CourseData];

    return courses.map((c) => {
      const courseConfig = String(c.CourseConfig ?? '');
      // Calculate split positions - find gate numbers where 'S' occurs
      // Each character represents a gate (N=normal, R=reverse, S=split)
      const splits: number[] = [];
      for (let i = 0; i < courseConfig.length; i++) {
        if (courseConfig[i] === 'S') {
          splits.push(i + 1); // 1-indexed gate number
        }
      }

      return {
        courseNr: Number(c.CourseNr ?? 0),
        courseConfig,
        splits,
      };
    });
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
  CourseData?: RawCourseData | RawCourseData[];
  Classes?: unknown;
}

/**
 * Extended Canoe123Data with event-level fields
 */
interface Canoe123DataWithEvent extends Canoe123Data {
  MainTitle?: string;
  CompetitionCode?: string;
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

interface RawCourseData {
  CourseNr?: string | number;
  CourseConfig?: string;
}
