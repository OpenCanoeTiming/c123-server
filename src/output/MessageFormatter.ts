import type { EventStateData } from '../state/types.js';
import type {
  TopMessage,
  CliOnCourseMessage,
  CompMessage,
  TopResultItem,
  OnCourseItem,
} from './types.js';

/**
 * Formats EventState data into CLI-compatible messages.
 *
 * Transforms internal state to JSON messages matching the
 * CanoeLiveInterface protocol for scoreboard compatibility.
 */

/**
 * Format results as CLI "top" message
 */
export function formatTopMessage(state: EventStateData): TopMessage | null {
  const { results, highlightBib, schedule, currentRaceId } = state;

  if (!results) {
    return null;
  }

  // Find current race in schedule for status
  const currentRace = schedule.find((r) => r.raceId === currentRaceId);
  const raceStatus = currentRace?.raceStatus?.toString() ?? '0';

  const list: TopResultItem[] = results.rows.map((row) => ({
    Rank: row.rank,
    Bib: row.bib,
    Name: row.name,
    Club: row.club,
    Total: row.total,
    Pen: row.pen,
    Behind: row.behind,
  }));

  return {
    msg: 'top',
    data: {
      RaceName: results.mainTitle || '',
      RaceStatus: raceStatus,
      HighlightBib: highlightBib || '',
      list,
    },
  };
}

/**
 * Format on-course competitors as CLI "oncourse" message
 */
export function formatOnCourseMessage(state: EventStateData): CliOnCourseMessage {
  const items: OnCourseItem[] = state.onCourse.map((comp, index) => ({
    Bib: comp.bib,
    BibKey: `${comp.raceId}-${comp.bib}`,
    Name: comp.name,
    Club: comp.club,
    Gates: comp.gates,
    Pen: comp.pen.toString(),
    Time: comp.time?.toString() ?? '',
    Total: comp.total?.toString() ?? '',
    dtFinish: comp.dtFinish ?? '',
    _pos: index + 1,
  }));

  return {
    msg: 'oncourse',
    data: items,
  };
}

/**
 * Format current competitor as CLI "comp" message
 *
 * Returns data for the competitor closest to finish (position 1)
 */
export function formatCompMessage(state: EventStateData): CompMessage | null {
  // Find competitor closest to finish (lowest position number)
  const sorted = [...state.onCourse].sort((a, b) => a.position - b.position);
  const current = sorted[0];

  if (!current) {
    return null;
  }

  return {
    msg: 'comp',
    data: {
      Bib: current.bib,
      Name: current.name,
      Club: current.club,
      Time: current.time?.toString() ?? '',
      Pen: current.pen.toString(),
      Gates: current.gates,
      Rank: current.rank.toString(),
      TTBDiff: current.ttbDiff,
      TTBName: current.ttbName,
    },
  };
}

/**
 * Format all relevant messages for current state
 */
export function formatAllMessages(state: EventStateData): string[] {
  const messages: string[] = [];

  const top = formatTopMessage(state);
  if (top) {
    messages.push(JSON.stringify(top));
  }

  const oncourse = formatOnCourseMessage(state);
  messages.push(JSON.stringify(oncourse));

  const comp = formatCompMessage(state);
  if (comp) {
    messages.push(JSON.stringify(comp));
  }

  return messages;
}
