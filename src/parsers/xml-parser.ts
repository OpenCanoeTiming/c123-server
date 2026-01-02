import { XMLParser } from 'fast-xml-parser';
import type {
  ParsedMessage,
  OnCourseMessage,
  OnCourseCompetitor,
  ResultsMessage,
  ResultRow,
  TimeOfDayMessage,
  RaceConfigMessage,
  ScheduleMessage,
  ScheduleRace,
} from './types.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: false,
  trimValues: true,
});

/**
 * Parse a C123 XML message and return structured data.
 *
 * Messages are wrapped in <Canoe123 System="Main"> root element.
 * Multiple child elements can be present in one message.
 */
export function parseXmlMessage(xml: string): ParsedMessage[] {
  const results: ParsedMessage[] = [];

  try {
    const doc = parser.parse(xml);
    const root = doc.Canoe123;

    if (!root) {
      return [{ type: 'unknown', data: null }];
    }

    // Process each known element type
    if (root.OnCourse) {
      const oncourse = parseOnCourse(root.OnCourse);
      if (oncourse) {
        results.push({ type: 'oncourse', data: oncourse });
      }
    }

    if (root.Results) {
      const resultsData = parseResults(root.Results);
      if (resultsData) {
        results.push({ type: 'results', data: resultsData });
      }
    }

    if (root.TimeOfDay) {
      const timeOfDay = parseTimeOfDay(root.TimeOfDay);
      if (timeOfDay) {
        results.push({ type: 'timeofday', data: timeOfDay });
      }
    }

    if (root.RaceConfig) {
      const raceConfig = parseRaceConfig(root.RaceConfig);
      if (raceConfig) {
        results.push({ type: 'raceconfig', data: raceConfig });
      }
    }

    if (root.Schedule) {
      const schedule = parseSchedule(root.Schedule);
      if (schedule) {
        results.push({ type: 'schedule', data: schedule });
      }
    }

    if (results.length === 0) {
      return [{ type: 'unknown', data: null }];
    }

    return results;
  } catch {
    return [{ type: 'unknown', data: null }];
  }
}

/**
 * Parse OnCourse element.
 * Can contain multiple competitors, each in a nested OnCourse element.
 */
export function parseOnCourse(element: unknown): OnCourseMessage | null {
  if (!element || typeof element !== 'object') {
    return null;
  }

  const el = element as Record<string, unknown>;

  // Handle array of OnCourse elements (multiple competitors)
  if (Array.isArray(el)) {
    const competitors: OnCourseCompetitor[] = [];
    for (const item of el) {
      const comp = parseOnCourseEntry(item, competitors.length + 1);
      if (comp) {
        competitors.push(comp);
      }
    }
    return {
      total: competitors.length,
      competitors,
    };
  }

  // Single OnCourse element with attributes
  const total = parseInt(String(el['@_Total'] ?? '0'), 10) || 0;

  // Check for nested OnCourse elements (multiple competitors)
  const nestedOnCourse = el.OnCourse;
  if (nestedOnCourse) {
    const items = Array.isArray(nestedOnCourse) ? nestedOnCourse : [nestedOnCourse];
    const competitors: OnCourseCompetitor[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const position = parseInt(String(item?.['@_Position'] ?? (i + 1)), 10);
      const comp = parseOnCourseEntry(item, position);
      if (comp) {
        competitors.push(comp);
      }
    }

    return { total, competitors };
  }

  // Single competitor directly in OnCourse element
  const position = parseInt(String(el['@_Position'] ?? '1'), 10);
  const comp = parseOnCourseEntry(el, position);

  if (comp) {
    return { total: total || 1, competitors: [comp] };
  }

  return { total: 0, competitors: [] };
}

/**
 * Parse a single OnCourse entry (Participant + Result elements)
 */
function parseOnCourseEntry(entry: unknown, position: number): OnCourseCompetitor | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const el = entry as Record<string, unknown>;
  const participant = el.Participant as Record<string, unknown> | undefined;

  if (!participant) {
    return null;
  }

  const bib = String(participant['@_Bib'] ?? '');
  if (!bib) {
    return null;
  }

  // Find Result elements
  const resultElements = el.Result;
  let resultC: Record<string, unknown> | null = null;
  let resultT: Record<string, unknown> | null = null;

  if (resultElements) {
    const results = Array.isArray(resultElements) ? resultElements : [resultElements];
    for (const r of results) {
      const res = r as Record<string, unknown>;
      if (res['@_Type'] === 'C') {
        resultC = res;
      } else if (res['@_Type'] === 'T') {
        resultT = res;
      }
    }
  }

  return {
    bib,
    name: String(participant['@_Name'] ?? ''),
    club: String(participant['@_Club'] ?? ''),
    nat: String(participant['@_Nat'] ?? ''),
    raceId: String(participant['@_RaceId'] ?? ''),
    raceName: String(participant['@_Race'] ?? ''),
    startOrder: parseInt(String(participant['@_StartOrder'] ?? '0'), 10) || 0,
    warning: String(participant['@_Warning'] ?? ''),
    gates: String(resultC?.['@_Gates'] ?? ''),
    completed: resultC?.['@_Completed'] === 'Y',
    dtStart: resultC?.['@_dtStart'] ? String(resultC['@_dtStart']) : null,
    dtFinish: resultC?.['@_dtFinish'] ? String(resultC['@_dtFinish']) : null,
    pen: parseInt(String(resultT?.['@_Pen'] ?? '0'), 10) || 0,
    time: resultT?.['@_Time'] ? parseInt(String(resultT['@_Time']), 10) : null,
    total: resultT?.['@_Total'] ? parseInt(String(resultT['@_Total']), 10) : null,
    ttbDiff: String(resultT?.['@_TTBDiff'] ?? ''),
    ttbName: String(resultT?.['@_TTBName'] ?? ''),
    rank: parseInt(String(resultT?.['@_Rank'] ?? '0'), 10) || 0,
    position,
  };
}

/**
 * Parse Results element.
 */
export function parseResults(element: unknown): ResultsMessage | null {
  if (!element || typeof element !== 'object') {
    return null;
  }

  const el = element as Record<string, unknown>;

  const raceId = String(el['@_RaceId'] ?? '');
  const classId = String(el['@_ClassId'] ?? '');
  const isCurrent = el['@_Current'] === 'Y';
  const mainTitle = String(el['@_MainTitle'] ?? '');
  const subTitle = String(el['@_SubTitle'] ?? '');

  const rows: ResultRow[] = [];

  // Parse Row elements
  const rowElements = el.Row;
  if (rowElements) {
    const rowArray = Array.isArray(rowElements) ? rowElements : [rowElements];

    for (const row of rowArray) {
      const rowData = row as Record<string, unknown>;
      const participant = rowData.Participant as Record<string, unknown> | undefined;

      if (!participant) continue;

      const bib = String(participant['@_Bib'] ?? '');
      if (!bib) continue;

      // Find Result Type="T"
      let resultT: Record<string, unknown> | null = null;
      const resultElements = rowData.Result;
      if (resultElements) {
        const results = Array.isArray(resultElements) ? resultElements : [resultElements];
        for (const r of results) {
          const res = r as Record<string, unknown>;
          if (res['@_Type'] === 'T') {
            resultT = res;
            break;
          }
        }
      }

      const rowNumber = parseInt(String(rowData['@_Number'] ?? '0'), 10) || 0;
      const rank = parseInt(String(resultT?.['@_Rank'] ?? rowNumber), 10) || rowNumber;

      // Parse BR1/BR2 fields if present
      const prevTimeRaw = resultT?.['@_PrevTime'];
      const prevPenRaw = resultT?.['@_PrevPen'];
      const prevTotalRaw = resultT?.['@_PrevTotal'];
      const prevRankRaw = resultT?.['@_PrevRank'];
      const totalTotalRaw = resultT?.['@_TotalTotal'];
      const totalRankRaw = resultT?.['@_TotalRank'];
      const betterRunRaw = resultT?.['@_BetterRunNr'];

      const resultRow: ResultRow = {
        rank,
        bib,
        name: String(participant['@_Name'] ?? ''),
        givenName: String(participant['@_GivenName'] ?? ''),
        familyName: String(participant['@_FamilyName'] ?? ''),
        club: String(participant['@_Club'] ?? ''),
        nat: String(participant['@_Nat'] ?? ''),
        startOrder: parseInt(String(participant['@_StartOrder'] ?? '0'), 10) || 0,
        startTime: String(participant['@_StartTime'] ?? ''),
        gates: String(resultT?.['@_Gates'] ?? ''),
        pen: parseInt(String(resultT?.['@_Pen'] ?? '0'), 10) || 0,
        time: String(resultT?.['@_Time'] ?? ''),
        total: String(resultT?.['@_Total'] ?? ''),
        behind: String(resultT?.['@_Behind'] ?? ''),
      };

      // Add optional BR1/BR2 fields
      if (prevTimeRaw !== undefined) {
        resultRow.prevTime = parseInt(String(prevTimeRaw), 10) || 0;
      }
      if (prevPenRaw !== undefined) {
        resultRow.prevPen = parseInt(String(prevPenRaw), 10) || 0;
      }
      if (prevTotalRaw !== undefined) {
        resultRow.prevTotal = parseInt(String(prevTotalRaw), 10) || 0;
      }
      if (prevRankRaw !== undefined) {
        resultRow.prevRank = parseInt(String(prevRankRaw), 10) || 0;
      }
      if (totalTotalRaw !== undefined) {
        resultRow.totalTotal = parseInt(String(totalTotalRaw), 10) || 0;
      }
      if (totalRankRaw !== undefined) {
        resultRow.totalRank = parseInt(String(totalRankRaw), 10) || 0;
      }
      if (betterRunRaw !== undefined) {
        resultRow.betterRun = parseInt(String(betterRunRaw), 10) || 0;
      }

      rows.push(resultRow);
    }
  }

  // Sort by rank
  rows.sort((a, b) => a.rank - b.rank);

  return {
    raceId,
    classId,
    isCurrent,
    mainTitle,
    subTitle,
    rows,
  };
}

/**
 * Parse TimeOfDay element.
 */
export function parseTimeOfDay(element: unknown): TimeOfDayMessage | null {
  if (element === null || element === undefined) {
    return null;
  }

  // TimeOfDay can be a simple string or an object with text content
  let time: string;
  if (typeof element === 'string') {
    time = element;
  } else if (typeof element === 'object') {
    const el = element as Record<string, unknown>;
    time = String(el['#text'] ?? '');
  } else {
    time = String(element);
  }

  return { time };
}

/**
 * Parse RaceConfig element.
 */
export function parseRaceConfig(element: unknown): RaceConfigMessage | null {
  if (!element || typeof element !== 'object') {
    return null;
  }

  const el = element as Record<string, unknown>;

  return {
    nrSplits: parseInt(String(el['@_NrSplits'] ?? '0'), 10) || 0,
    nrGates: parseInt(String(el['@_NrGates'] ?? '0'), 10) || 0,
    gateConfig: String(el['@_GateConfig'] ?? ''),
    gateCaptions: String(el['@_GateCaptions'] ?? ''),
  };
}

/**
 * Parse Schedule element.
 */
export function parseSchedule(element: unknown): ScheduleMessage | null {
  if (!element || typeof element !== 'object') {
    return null;
  }

  const el = element as Record<string, unknown>;
  const races: ScheduleRace[] = [];

  const raceElements = el.Race;
  if (raceElements) {
    const raceArray = Array.isArray(raceElements) ? raceElements : [raceElements];

    for (const race of raceArray) {
      const raceData = race as Record<string, unknown>;

      races.push({
        order: parseInt(String(raceData['@_Order'] ?? '0'), 10) || 0,
        raceId: String(raceData['@_RaceId'] ?? ''),
        race: String(raceData['@_Race'] ?? ''),
        mainTitle: String(raceData['@_MainTitle'] ?? ''),
        subTitle: String(raceData['@_SubTitle'] ?? ''),
        shortTitle: String(raceData['@_ShortTitle'] ?? ''),
        raceStatus: parseInt(String(raceData['@_RaceStatus'] ?? '0'), 10) || 0,
        startTime: String((raceData.StartTime as Record<string, unknown>)?.['#text'] ?? ''),
      });
    }
  }

  return { races };
}
