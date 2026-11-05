import { XMLParser } from 'fast-xml-parser';
import type { ClassificationRow, Faults, Gate, ResultMark, Stage } from '@opencanoetiming/c123-contract';
import type { CourseSlot, IngestContext, IngestElement } from './types.js';

// ---------------------------------------------------------------- reading the document

const tcpParser = new XMLParser({
  ignoreAttributes: false, attributeNamePrefix: '@', parseAttributeValue: false, parseTagValue: false,
  trimValues: false, ignoreDeclaration: true, isArray: (n) => n === 'Row' || n === 'Result' || n === 'Race',
});
const XML_TABLES = new Set(['Events', 'Classes', 'Categories', 'Schedule', 'CourseData', 'Participants', 'Results']);
const xmlParser = new XMLParser({
  ignoreAttributes: false, attributeNamePrefix: '@', parseAttributeValue: false, parseTagValue: false,
  trimValues: false, ignoreDeclaration: true, isArray: (n) => XML_TABLES.has(n),
});

export type Node = Record<string, unknown>;
export type Doc = { ok: true; root: Node } | { ok: false; reason: string; text: string };

/** Parse a whole document; a torn or foreign one is reported, never half-read. */
export function readDoc(text: unknown, rootName: 'Canoe123' | 'Canoe123Data'): Doc {
  const sample = typeof text === 'string' ? text.slice(0, 120) : String(text).slice(0, 120);
  if (typeof text !== 'string' || text.trim() === '') return { ok: false, reason: 'empty', text: sample };
  const t = text.trim();
  if (!t.startsWith('<')) return { ok: false, reason: 'not-xml', text: sample };
  const open = t.indexOf(`<${rootName}`);
  if (open < 0 || (open > 0 && !t.startsWith('<?xml'))) return { ok: false, reason: 'unknown-root', text: sample };
  if (!t.endsWith(`</${rootName}>`) && !t.endsWith('/>')) return { ok: false, reason: 'truncated', text: sample };
  try {
    const parsed = (rootName === 'Canoe123' ? tcpParser : xmlParser).parse(t) as Node;
    const root = parsed[rootName];
    if (root === undefined) return { ok: false, reason: 'unknown-root', text: sample };
    return { ok: true, root: typeof root === 'object' && root !== null ? (root as Node) : {} };
  } catch {
    return { ok: false, reason: 'parse-error', text: sample };
  }
}

export const asArray = (v: unknown): Node[] => (v === undefined ? [] : Array.isArray(v) ? (v as Node[]) : [v as Node]);
/** Attribute value, '' when absent. */
export const at = (n: Node | undefined, k: string): string => {
  const v = n?.['@' + k];
  return typeof v === 'string' ? v : '';
};
/** Child element text, '' when absent or empty. */
export const tx = (n: Node | undefined, k: string): string => {
  const v = n?.[k];
  return typeof v === 'string' ? v : '';
};
export const has = (n: Node, k: string): boolean => n[k] !== undefined;

// ---------------------------------------------------------------- numbers

const NUM = /^[+-]?\d+(\.\d+)?$/;
const INT = /^[+-]?\d+$/;
/** An empty or non-numeric text is absent, never zero (§0.1). */
export const num = (s: string): number | undefined => {
  const t = s.trim();
  return NUM.test(t) ? Number(t) : undefined;
};
export const int = (s: string): number | undefined => {
  const t = s.trim();
  return INT.test(t) ? Number(t) : undefined;
};
/** XML milliseconds to contract seconds. */
export const ms = (s: string): number | undefined => {
  const n = int(s);
  return n === undefined ? undefined : n / 1000;
};
export const r3 = (x: number): number => Math.round(x * 1000) / 1000;

// ---------------------------------------------------------------- §0.2 eventTime

const formatters = new Map<string, Intl.DateTimeFormat>();
/** Zone offset (local minus UTC, ms) at the UTC instant `t`. Throws for an unknown zone. */
function offsetMs(zone: string, t: number): number {
  let f = formatters.get(zone);
  if (f === undefined) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    formatters.set(zone, f);
  }
  const p: Record<string, number> = {};
  for (const part of f.formatToParts(new Date(t))) if (part.type !== 'literal') p[part.type] = Number(part.value);
  const wall = Date.UTC(p['year'] ?? 0, (p['month'] ?? 1) - 1, p['day'] ?? 1, p['hour'] ?? 0, p['minute'] ?? 0, p['second'] ?? 0);
  return wall - Math.floor(t / 1000) * 1000;
}

const TOD = /^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
/**
 * Phase.date + time of day + the venue's IANA zone (§0.2). undefined when the date, the zone or the time is missing or
 * unreadable. In the repeated autumn hour the later instant (standard time) is returned; a time in the skipped spring hour is
 * shifted forward by the gap (DERIVATIONS §0.2).
 */
export function zonedInstant(date: string | undefined, tod: string, zone: string | undefined): string | undefined {
  if (date === undefined || zone === undefined || zone === '') return undefined;
  const d = DATE.exec(date);
  const t = TOD.exec(tod.trim());
  if (d === null || t === null) return undefined;
  const local = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]), Number(t[3]), Number((t[4] ?? '').padEnd(3, '0') || 0));
  try {
    const guess = local - offsetMs(zone, local);
    return new Date(local - offsetMs(zone, guess)).toISOString();
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------- §2.1 format vocabulary (CONTRACTS §2.4)

export interface Fmt {
  token: string;
  known: boolean;
  stage: Stage;
  kind: 'race' | 'classification';
  scoringKind: 'duration' | 'ordinal';
  heats: boolean;
  pair: { role: 'first' | 'second'; combination: 'best' | 'sum'; siblings: string[] } | null;
  /** Kayak Cross format: judging cells are fault marks (§4.6(d)). */
  cross: boolean;
  /** A format whose rows can carry a progression mark (Q). */
  progression: boolean;
}

const TABLE = new Map<string, Fmt>();
function def(tokens: string[], stage: Stage, o: Partial<Fmt> = {}): void {
  for (const token of tokens) {
    TABLE.set(token, { token, known: true, stage, kind: 'race', scoringKind: 'duration', heats: false, pair: null, cross: false, progression: false, ...o });
  }
}
const pair = (role: 'first' | 'second', combination: 'best' | 'sum', ...siblings: string[]) => ({ role, combination, siblings });
for (const [a, combination] of [['BR', 'best'], ['HT', 'best'], ['EL', 'best'], ['TR', 'best'], ['SR', 'sum']] as const) {
  def([`${a}1`], 'run', { pair: pair('first', combination, `${a}2`) });
  def([`${a}2`], 'run', { pair: pair('second', combination, `${a}1`) });
}
def(['NHT2'], 'run'); // pair null until its first-run token is known (DERIVATIONS §10 item 21)
def(['TS1', 'TS2', 'TSR', 'SP1', 'SP2'], 'run');
def(['QF'], 'quarter-final', { progression: true });
def(['SF', 'SFB'], 'semi-final', { progression: true });
def(['FI', 'FIB', 'SPF', 'TSF', 'TFI'], 'final');
def(['SUF'], 'super-final', { pair: pair('second', 'sum', 'BR2') });
def(['XT', 'XT1', 'XT2'], 'time-trial', { cross: true, progression: true });
def(['X8'], 'heats', { scoringKind: 'ordinal', heats: true, cross: true, progression: true });
def(['X4'], 'quarter-final', { scoringKind: 'ordinal', heats: true, cross: true, progression: true });
def(['XS'], 'semi-final', { scoringKind: 'ordinal', heats: true, cross: true, progression: true });
def(['XF'], 'final', { scoringKind: 'ordinal', heats: true, cross: true });
def(['XER', 'RXER'], 'classification', { kind: 'classification', scoringKind: 'ordinal', cross: true });
def(['SLER', 'WWER'], 'classification', { kind: 'classification', scoringKind: 'ordinal' });

export const fmtOf = (token: string): Fmt =>
  TABLE.get(token) ?? { token, known: false, stage: 'run', kind: 'race', scoringKind: 'duration', heats: false, pair: null, cross: false, progression: false };

/**
 * `RaceId` is `<class>_<format token>_<day number>[_<attribute>]`. The token is the part before the day number
 * (§2.1); it is read here only as the TCP fallback for `DisId`, never to identify anything.
 */
export function splitRaceId(raceId: string): { classKey: string; token: string; rest: string } {
  const parts = raceId.split('_');
  let i = 1;
  while (i < parts.length && !/^\d+$/.test(parts[i] ?? '')) i++;
  if (i < 2 || i >= parts.length) return { classKey: raceId, token: '', rest: '' };
  return { classKey: parts.slice(0, i - 1).join('_'), token: parts[i - 1] ?? '', rest: parts.slice(i).join('_') };
}

export const UNASSIGNED = '<unassigned>';
/** §0.4: the pseudo-class `NA` takes its Schedule rows, Phases and result rows with it; the class is the `RaceId`'s first part. */
export const isNaRace = (raceId: string, classId = ''): boolean => classId === 'NA' || splitRaceId(raceId).classKey === 'NA';

/** §4.10: one classification row. `decidedIn` is the XML `RecordType` verbatim, null where the source carries none (TCP). A row without a `RankOrder` is reported, not guessed. */
export function classificationRow(u: Unit, where: string, f: { entryId: string; bib: string; rank: string; order: string; decidedIn: string }): ClassificationRow | undefined {
  const order = int(f.order);
  if (order === undefined) {
    u.diagnostic({ kind: 'unparseable-field', where, name: 'RankOrder', text: f.order });
    return undefined;
  }
  return { entryId: f.entryId, bib: f.bib.trim(), rank: int(f.rank) ?? null, order, decidedIn: f.decidedIn.trim() === '' ? null : f.decidedIn.trim() };
}

// ---------------------------------------------------------------- §4.1 marks

const MARKS: Record<string, ResultMark> = { DNS: 'dns', DNF: 'dnf', CAP: 'cap', RAL: 'ral', DSQ: 'dsq', 'DSQ-R': 'dsq-r', DQB: 'dqb', 'NON-RK': 'non-ranked' };
/** undefined: no mark. '*' is under review, not a status. Anything unknown is `other`. */
export function markOf(raw: string): ResultMark | '*' | undefined {
  const s = raw.trim();
  if (s === '') return undefined;
  if (s === '*') return '*';
  return MARKS[s] ?? 'other';
}

// ---------------------------------------------------------------- §4.6 gate cells

export type Cells = (number | null)[];
export type CellProblem = { slot: number; text: string };

/** `cross`: the cells are fault marks, only empty, 0 and 2 are valid (§4.6(d)). */
const cell = (raw: string, slot: number, limit: number, bad: CellProblem[], cross: boolean): number | null => {
  const t = raw.trim();
  if (t === '') return null;
  const n = int(t);
  if (n === undefined || (cross && n !== 0 && n !== 2)) {
    if (slot <= limit) bad.push({ slot, text: raw });
    return null;
  }
  return n;
};

/** (a) `OnCourse.Result[C]@Gates`: comma separated, one token per slot. `limit` is the slot count of the known course, 0 when none is bound. */
export function commaCells(s: string, limit: number, bad: CellProblem[], cross = false): Cells {
  return s.split(',').map((tok, i) => cell(tok, i + 1, limit, bad, cross));
}
/** (b) `Results.Result@Gates` / `XML.Results.Gates`: 3 characters per cell, 30 cells, whatever the course. `limit` as in (a). */
export function fixedCells(s: string, limit: number, bad: CellProblem[], cross = false): Cells {
  const out: Cells = [];
  for (let i = 0; i < 30; i++) out.push(i * 3 < s.length ? cell(s.slice(i * 3, i * 3 + 3), i + 1, limit, bad, cross) : null);
  return out;
}

export const gateSlots = (slots: CourseSlot[]): CourseSlot[] => slots.filter((s) => s.kind === 'gate');
export const usable = (slots: CourseSlot[] | undefined): slots is CourseSlot[] => slots !== undefined && slots.length > 0;

export const sumJudged = (cells: Cells, slots: CourseSlot[] | undefined): number => {
  const picked = usable(slots) ? gateSlots(slots).map((s) => cells[s.slot - 1] ?? null) : cells;
  return picked.reduce<number>((a, v) => a + (v ?? 0), 0);
};
/** Every gate of the course judged; null when no course is bound (completeness cannot be judged). */
export const judgingComplete = (cells: Cells, slots: CourseSlot[] | undefined): boolean | null =>
  usable(slots) ? gateSlots(slots).every((s) => (cells[s.slot - 1] ?? null) !== null) : null;

export function gatesFromCells(cells: Cells, slots: CourseSlot[]): Gate[] {
  return gateSlots(slots).map((s) => ({ number: s.gateNumber ?? s.slot, penalty: cells[s.slot - 1] ?? null }));
}

const caption = (s: CourseSlot): string => s.caption ?? (s.gateNumber !== undefined ? String(s.gateNumber) : s.kind === 'start-ramp' ? 'ST' : 'RZ');
/** (d) Kayak Cross: cells are fault marks (0 / 2). undefined when nothing has been judged. */
export function faultsFromCells(cells: Cells, slots: CourseSlot[]): Faults | undefined {
  if (!slots.some((s) => (cells[s.slot - 1] ?? null) !== null)) return undefined;
  const gates: string[] = [];
  let lastCleanSlot = 0;
  for (const s of slots) {
    const v = cells[s.slot - 1] ?? null;
    if (v === 2) gates.push(caption(s));
    else if (v === 0 && gates.length === 0) lastCleanSlot = s.slot;
  }
  return { count: gates.length, gates, lastCleanSlot };
}

// ---------------------------------------------------------------- §2.3 course layout

export interface Layout {
  slots: CourseSlot[];
  gates: { number: number; kind: 'downstream' | 'upstream' }[];
  sectorEndsAfterGate: number[];
  splitsAfterGate: number[];
  unknownChars: string[];
}
export function parseLayout(layout: string, captions?: string[]): Layout {
  const out: Layout = { slots: [], gates: [], sectorEndsAfterGate: [], splitsAfterGate: [], unknownChars: [] };
  let gate = 0;
  for (const ch of layout.trim()) {
    if (ch === 'N' || ch === 'R') {
      gate++;
      out.gates.push({ number: gate, kind: ch === 'N' ? 'downstream' : 'upstream' });
      out.slots.push({ slot: out.slots.length + 1, kind: 'gate', gateNumber: gate });
    } else if (ch === 'D' || ch === 'E') {
      out.slots.push({ slot: out.slots.length + 1, kind: ch === 'D' ? 'start-ramp' : 'roll-zone' });
    } else if (ch === 'S') { if (gate > 0) out.sectorEndsAfterGate.push(gate); } // before the first gate records nothing (§2.3)
    else if (ch === 'I') { if (gate > 0) out.splitsAfterGate.push(gate); }
    else out.unknownChars.push(ch);
  }
  if (captions !== undefined) {
    out.slots = out.slots.map((s, i) => {
      const c = captions[i];
      return c === undefined ? s : { ...s, caption: c };
    });
  }
  return out;
}

// ---------------------------------------------------------------- output builder

type Key = Record<string, string>;
/** Collects the elements of one unit; `finish` stamps them. */
export class Unit {
  private readonly els: Record<string, unknown>[] = [];
  constructor(readonly source: 'tcp' | 'xml', readonly observedAt: string) {}

  obs(kind: string, field: string, key: Key, value: unknown, confidence: 'authoritative' | 'inferred' = 'authoritative', extra: Record<string, unknown> = {}): void {
    this.els.push({ field, ...key, source: this.source, kind, value, confidence, ...extra });
  }
  unavailable(kind: string, field: string, key: Key, reason: 'not-applicable' | 'not-configured'): void {
    this.els.push({ field, ...key, source: this.source, kind, state: 'unavailable', reason });
  }
  notYet(kind: string, field: string, key: Key): void {
    this.els.push({ field, ...key, source: this.source, kind, state: 'not-yet' });
  }
  diagnostic(d: Record<string, unknown>): void {
    this.els.push({ diagnostic: d, source: this.source });
  }
  add(e: Record<string, unknown>): void {
    this.els.push({ ...e, source: this.source });
  }
  finish(): IngestElement[] {
    return this.els.map((e, i) => ({ ingestSeq: i, observedAt: this.observedAt, ...e }));
  }
}

export const unparseableUnit = (source: 'tcp' | 'xml', ctx: IngestContext, reason: string, text: string): IngestElement[] => [
  { ingestSeq: 0, observedAt: ctx.observedAt, source, unparseable: { reason, text } },
];
