// CONTRACTS §2.4: structural properties of a Phase from upstream's format token (E1 table).

export type FormatInfo = {
  format: string;
  kind: 'race' | 'classification';
  scoringKind: 'duration' | 'ordinal';
  heats: boolean;
  stage: string;
  pairRole: 'first' | 'second' | null;
  pairWith: string | null;        // the sibling's format token
  combination: 'best' | 'sum' | null;
  cross: boolean;
};

const BEST_SECOND: Record<string, string> = { BR2: 'BR1', HT2: 'HT1', EL2: 'EL1', TR2: 'TR1', NHT2: 'NHT1' };
const SUM_SECOND: Record<string, string> = { SR2: 'SR1', SUF: 'BR2' };
const FIRST: Record<string, string> = { BR1: 'BR2', HT1: 'HT2', EL1: 'EL2', TR1: 'TR2', SR1: 'SR2' };
const CROSS_HEATS = ['X8', 'X4', 'XS', 'XF'];
const CLASSIFICATION = ['XER', 'SLER', 'WWER', 'RXER'];
const CROSS = ['X8', 'X4', 'XS', 'XF', 'XT', 'XT1', 'XT2', 'XER'];

export function stageOf(fmt: string): string {
  if (/^(BR[12]|HT\d*|EL\d*|TR\d*|SR\d*|TS[12])$/.test(fmt)) return 'run';
  if (['XT', 'XT1', 'XT2'].includes(fmt)) return 'time-trial';
  if (fmt === 'X8') return 'heats';
  if (['X4', 'QF'].includes(fmt)) return 'quarter-final';
  if (['XS', 'SF', 'SFB'].includes(fmt)) return 'semi-final';
  if (['XF', 'FI', 'FIB', 'TSF', 'TFI', 'SPF'].includes(fmt)) return 'final';
  if (fmt === 'SUF') return 'super-final';
  if (/ER$/.test(fmt)) return 'classification';
  return 'run';
}

export function formatInfo(fmt: string): FormatInfo {
  const base = { format: fmt, stage: stageOf(fmt), cross: CROSS.includes(fmt) };
  if (CLASSIFICATION.includes(fmt)) {
    return { ...base, kind: 'classification', scoringKind: 'ordinal', heats: false, pairRole: null, pairWith: null, combination: null };
  }
  if (CROSS_HEATS.includes(fmt)) {
    return { ...base, kind: 'race', scoringKind: 'ordinal', heats: true, pairRole: null, pairWith: null, combination: null };
  }
  if (BEST_SECOND[fmt]) return { ...base, kind: 'race', scoringKind: 'duration', heats: false, pairRole: 'second', pairWith: BEST_SECOND[fmt]!, combination: 'best' };
  if (SUM_SECOND[fmt]) return { ...base, kind: 'race', scoringKind: 'duration', heats: false, pairRole: 'second', pairWith: SUM_SECOND[fmt]!, combination: 'sum' };
  if (FIRST[fmt]) return { ...base, kind: 'race', scoringKind: 'duration', heats: false, pairRole: 'first', pairWith: FIRST[fmt]!, combination: fmt === 'SR1' ? 'sum' : 'best' };
  return { ...base, kind: 'race', scoringKind: 'duration', heats: false, pairRole: null, pairWith: null, combination: null };
}

/** DERIVATIONS §2.1: on TCP the format is the RaceId token before the day number. */
export function formatFromRaceId(raceId: string): string {
  const t = raceId.split('_');
  for (let i = t.length - 1; i > 0; i--) if (/^\d+$/.test(t[i]!)) return t[i - 1]!;
  return t[t.length - 1] ?? raceId;
}

/** Sibling RaceId by token substitution; used only when no class/schedule is known (vector adapter). */
export function siblingRaceIdByToken(raceId: string, toFormat: string): string {
  const fmt = formatFromRaceId(raceId);
  const t = raceId.split('_');
  const i = t.lastIndexOf(fmt);
  if (i < 0) return raceId;
  t[i] = toFormat;
  return t.join('_');
}
