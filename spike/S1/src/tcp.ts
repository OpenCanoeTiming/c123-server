// TCP push messages (DERIVATIONS §0 notation): OnCourse, Results, Schedule, RaceConfig, TimeOfDay, TVS.
import { child, parseXml, type XNode } from './xml.js';

export type OnCourseMsg = {
  type: 'OnCourse'; system: string | null; total: number | null; position: number | null; empty: boolean;
  p: Record<string, string> | null; c: Record<string, string> | null; t: Record<string, string> | null;
};
export type ResultsMsg = {
  type: 'Results'; system: string | null; raceId: string; classId: string; current: string; mainTitle: string;
  rows: { p: Record<string, string>; r: Record<string, string> }[];
};
export type TcpMsg =
  | OnCourseMsg
  | ResultsMsg
  | { type: 'Schedule'; system: string | null; races: Record<string, string>[] }
  | { type: 'RaceConfig'; system: string | null; a: Record<string, string> }
  | { type: 'TimeOfDay'; system: string | null; time: string }
  | { type: 'TVS'; system: string | null; a: Record<string, string> }
  | { type: 'TimingInput'; system: string | null }
  | { type: 'unknown'; system: string | null; name: string };

export function parseTcp(text: string): TcpMsg {
  const s = text.endsWith('|') ? text.slice(0, -1) : text;
  const root = parseXml(s);
  if (root.name !== 'Canoe123') return { type: 'unknown', system: null, name: root.name };
  const system = root.attrs.System ?? null;
  const body: XNode | undefined = root.children[0];
  if (!body) return { type: 'unknown', system, name: '(empty)' };
  switch (body.name) {
    case 'OnCourse': {
      const p = child(body, 'Participant');
      const results = body.children.filter((x) => x.name === 'Result');
      const c = results.find((x) => x.attrs.Type === 'C');
      const t = results.find((x) => x.attrs.Type === 'T');
      const num = (v: string | undefined) => (v === undefined || v.trim() === '' ? null : Number(v));
      return { type: 'OnCourse', system, total: num(body.attrs.Total), position: num(body.attrs.Position), empty: !p,
        p: p ? p.attrs : null, c: c ? c.attrs : null, t: t ? t.attrs : null };
    }
    case 'Results':
      return {
        type: 'Results', system, raceId: body.attrs.RaceId ?? '', classId: body.attrs.ClassId ?? '', current: body.attrs.Current ?? '',
        mainTitle: body.attrs.MainTitle ?? '',
        rows: body.children.filter((x) => x.name === 'Row').map((row) => ({ p: child(row, 'Participant')?.attrs ?? {}, r: child(row, 'Result')?.attrs ?? {} })),
      };
    case 'Schedule': return { type: 'Schedule', system, races: body.children.filter((x) => x.name === 'Race').map((x) => x.attrs) };
    case 'RaceConfig': return { type: 'RaceConfig', system, a: body.attrs };
    case 'TimeOfDay': return { type: 'TimeOfDay', system, time: body.text.trim() };
    case 'TVS': return { type: 'TVS', system, a: body.attrs };
    case 'TimingInput': return { type: 'TimingInput', system };
    default: return { type: 'unknown', system, name: body.name };
  }
}
