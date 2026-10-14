// Spike S1 utilities: canonical JSON, number normalisation, time construction (DERIVATIONS §0.2).
import { createHash } from 'node:crypto';

/** Round to milliseconds so that float sums (81.37 + 6) never leak representation noise. */
export function r3(x: number): number {
  const v = Math.round(x * 1000) / 1000;
  return Object.is(v, -0) ? 0 : v;
}

/** Canonical JSON: sorted keys, numbers via r3-stable formatting, undefined dropped. */
export function canonical(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      const x = (v as Record<string, unknown>)[k];
      if (x !== undefined) out[k] = sortDeep(x);
    }
    return out;
  }
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`non-finite number in canonical state: ${v}`);
    return r3(v);
  }
  return v;
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export function deepEqual(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

/**
 * DERIVATIONS §0.2: eventTime = Phase.date + time of day + venue zone offset, expressed in UTC.
 * `tod` is upstream's bare H:MM:SS(.fff); returns null when unparseable or no date/zone.
 */
export function eventTimeOf(date: string | undefined | null, tod: string | undefined | null, zone: string | null): string | null {
  if (!date || !tod || !zone) return null;
  const m = /^\s*(\d{1,2}):(\d{2}):(\d{2})(?:[.,](\d{1,3}))?\s*$/.exec(tod);
  if (!m) return null;
  const ms = (m[4] ?? '0').padEnd(3, '0');
  const iso = `${date}T${m[1]!.padStart(2, '0')}:${m[2]}:${m[3]}.${ms}${zone}`;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** Venue-local calendar date of a UTC instant, for a fixed zone offset like "+02:00". */
export function localDate(isoUtc: string, zone: string): string {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(zone);
  const off = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  return new Date(Date.parse(isoUtc) + off * 60000).toISOString().slice(0, 10);
}

export function isoPlusMs(iso: string, ms: number): string {
  return new Date(Date.parse(iso) + ms).toISOString();
}

export function msBetween(a: string, b: string): number {
  return Date.parse(b) - Date.parse(a);
}

/** Bib comparison of §5 step 3: numeric where both are integers, string otherwise. */
export function compareBib(a: string, b: string): number {
  const ia = /^\d+$/.test(a), ib = /^\d+$/.test(b);
  if (ia && ib) return Number(a) - Number(b);
  return a < b ? -1 : a > b ? 1 : 0;
}
