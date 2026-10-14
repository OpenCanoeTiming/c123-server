// DERIVATIONS §2.3 (course layout) and §4.6 (gate strings).
import type { Gate } from './types.js';

export type Layout = {
  gates: { number: number; kind: 'downstream' | 'upstream' }[];
  slots: { slot: number; kind: 'gate' | 'start-ramp' | 'roll-zone'; gateNumber?: number; caption?: string }[];
  sectorEndsAfterGate: number[];
  splitsAfterGate: number[];
};

/** N downstream gate, R upstream gate, S sector end, I split, D start ramp, E roll zone. */
export function parseLayout(layout: string, captions?: string[]): Layout {
  const out: Layout = { gates: [], slots: [], sectorEndsAfterGate: [], splitsAfterGate: [] };
  let gate = 0;
  for (const ch of layout) {
    if (ch === 'N' || ch === 'R') {
      gate++;
      out.gates.push({ number: gate, kind: ch === 'N' ? 'downstream' : 'upstream' });
      out.slots.push({ slot: out.slots.length + 1, kind: 'gate', gateNumber: gate });
    } else if (ch === 'D' || ch === 'E') {
      out.slots.push({ slot: out.slots.length + 1, kind: ch === 'D' ? 'start-ramp' : 'roll-zone' });
    } else if (ch === 'S') out.sectorEndsAfterGate.push(gate);
    else if (ch === 'I') out.splitsAfterGate.push(gate);
  }
  if (captions) out.slots.forEach((s, i) => { if (captions[i] !== undefined && captions[i] !== '') s.caption = captions[i]; });
  return out;
}

/** §2.3: upstream fabricated the course when any of these holds. */
export function fabricatedCourse(gateConfig: string, captions: string, nrGates: number): boolean {
  const stringGates = [...gateConfig].filter((c) => c === 'N' || c === 'R' || c === 'D' || c === 'E').length;
  if (gateConfig === '' && nrGates !== 0) return true;
  if (captions === '' && gateConfig !== '') return true;
  return stringGates !== nrGates;
}

export type CellParse = { cells: (number | null)[]; unparseable: { slot: number; text: string }[] };

/** §4.6(b): fixed width, 3 characters per cell, chunked from the left; never split on whitespace. */
export function parseFixedWidth(s: string, slotCount: number): CellParse {
  const cells: (number | null)[] = [];
  const unparseable: { slot: number; text: string }[] = [];
  for (let i = 0; i < slotCount; i++) {
    const chunk = s.slice(i * 3, i * 3 + 3).trim();
    if (chunk === '') { cells.push(null); continue; }
    if (/^-?\d+$/.test(chunk)) cells.push(parseInt(chunk, 10));
    else { cells.push(null); unparseable.push({ slot: i + 1, text: chunk }); }
  }
  return { cells, unparseable };
}

/** §4.6(a): comma-separated, dense, one token per slot; "" is null; keep the first slotCount tokens. */
export function parseComma(s: string, slotCount: number): CellParse {
  const toks = s.split(',');
  const cells: (number | null)[] = [];
  const unparseable: { slot: number; text: string }[] = [];
  for (let i = 0; i < slotCount; i++) {
    const t = (toks[i] ?? '').trim();
    if (t === '') { cells.push(null); continue; }
    if (/^-?\d+$/.test(t)) cells.push(parseInt(t, 10));
    else { cells.push(null); unparseable.push({ slot: i + 1, text: t }); }
  }
  return { cells, unparseable };
}

/** Cells (per slot) to Gate[] (per gate): on a slalom course every slot is a gate. */
export function cellsToGates(cells: (number | null)[], layout: Layout): Gate[] {
  const out: Gate[] = [];
  layout.slots.forEach((s, i) => { if (s.kind === 'gate') out.push({ number: s.gateNumber!, penalty: cells[i] ?? null }); });
  return out;
}
