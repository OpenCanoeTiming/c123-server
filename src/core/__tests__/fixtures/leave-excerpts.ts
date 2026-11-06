// Real records for the leave-rule tests (#204), cut BY SCRIPT from /workspace/timing/c123-protocol-docs/recordings/.cache, never typed.
// Every `src:"tcp"` record of a window (the cold80 and coldXt8 windows only the one Attempt's OnCourse listings and its Results row, the other rows dropped), verbatim, in file order (all message types: the leave rule is evaluated at every ingested TCP
// message, DERIVATIONS §4.1). `observedAt` = chunk _meta.startTime + ts. Windows (recording, interval, record count, chunk, lines):
//   stall10: 2026-04-26-cp3-cross 2026-04-26T09:18:36.000Z..2026-04-26T09:18:51.000Z: 26 tcp records, 009-0858-time-limit.jsonl line 36051..36342
//   stall21: 2026-09-20-2026-nkz-20ne 2026-09-20T11:53:50.000Z..2026-09-20T11:54:15.000Z: 10 tcp records, 011-1153-time-limit.jsonl line 259..337
//   gap304: 2026-04-19-jarni-ne-do 2026-04-19T07:03:24.500Z..2026-04-19T07:03:29.100Z: 33 tcp records, 001-0654-setup.jsonl line 18132..18283
//   gap368: 2026-04-26-cp3-cross 2026-04-26T07:35:52.500Z..2026-04-26T07:36:30.000Z: 143 tcp records, 006-0728-manual-split.jsonl line 6974..7678
//   gap386: 2026-09-20-2026-nkz-20ne 2026-09-20T13:01:37.200Z..2026-09-20T13:01:42.700Z: 37 tcp records, 013-1236-c1m-2nd-run.jsonl line 47867..48033
//   forListing: 2026-09-20-2026-nkz-20ne 2026-09-20T11:58:29.600Z..2026-09-20T11:58:29.660Z: 1 tcp records, 011-1153-time-limit.jsonl line 3550..3550
//   cold80: 2026-09-19-2026-nkz-19so 2026-09-19T09:28:49.000Z..2026-09-19T09:30:05.400Z: 141 tcp records, 006-0926-time-limit.jsonl line 5594..8122
//   coldXt8: 2026-04-26-cp3-cross 2026-04-26T08:44:30.000Z..2026-04-26T08:45:01.300Z: 48 tcp records, 008-0828-time-limit.jsonl line 17553..18218
//   b3: 2026-04-26-cp3-cross 2026-04-26T07:35:52.500Z..2026-04-26T07:37:56.500Z: 158 tcp records, 006-0728-manual-split.jsonl line 6986..9354
//   gap429: 2026-04-19-jarni-ne-do 2026-04-19T09:14:05.600Z..2026-04-19T09:14:11.600Z: 83 tcp records, 005-0854-time-limit.jsonl line 26821..27114
export interface LeaveRec { readonly recording: string; readonly chunk: string; readonly line: number; readonly ts: number; readonly observedAt: string; readonly data: string }
export const LEAVE: Record<'stall10' | 'stall21' | 'gap304' | 'gap368' | 'gap386' | 'forListing' | 'cold80' | 'coldXt8' | 'b3' | 'gap429', readonly LeaveRec[]> = {
 "stall10": [
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36051,
   "ts": 1185327,
   "observedAt": "2026-04-26T09:18:36.027Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:18:36</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36061,
   "ts": 1185737,
   "observedAt": "2026-04-26T09:18:36.437Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"1\" Bib=\"1\" Id=\"119208.WX1J\" Name=\"KOČÍŘOVÁ Valentýna\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36062,
   "ts": 1185737,
   "observedAt": "2026-04-26T09:18:36.437Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"4\" Id=\"129041.WX1J\" Name=\"ŠTĚPÁNKOVÁ Markéta\" Club=\"TJ Dukla\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36063,
   "ts": 1185738,
   "observedAt": "2026-04-26T09:18:36.438Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"3\" Bib=\"5\" Id=\"121014.WX1J\" Name=\"LEBEDOVÁ Adéla\" Club=\"KK Opava\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36064,
   "ts": 1185738,
   "observedAt": "2026-04-26T09:18:36.438Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"4\" Bib=\"8\" Id=\"9109.WX1J\" Name=\"JUMROVÁ Johana\" Club=\"USK Pha\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36080,
   "ts": 1186339,
   "observedAt": "2026-04-26T09:18:37.039Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:18:37</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36091,
   "ts": 1186749,
   "observedAt": "2026-04-26T09:18:37.449Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"1\" Bib=\"1\" Id=\"119208.WX1J\" Name=\"KOČÍŘOVÁ Valentýna\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36092,
   "ts": 1186750,
   "observedAt": "2026-04-26T09:18:37.450Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"4\" Id=\"129041.WX1J\" Name=\"ŠTĚPÁNKOVÁ Markéta\" Club=\"TJ Dukla\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36093,
   "ts": 1186750,
   "observedAt": "2026-04-26T09:18:37.450Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"3\" Bib=\"5\" Id=\"121014.WX1J\" Name=\"LEBEDOVÁ Adéla\" Club=\"KK Opava\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36094,
   "ts": 1186751,
   "observedAt": "2026-04-26T09:18:37.451Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"4\" Bib=\"8\" Id=\"9109.WX1J\" Name=\"JUMROVÁ Johana\" Club=\"USK Pha\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36110,
   "ts": 1187357,
   "observedAt": "2026-04-26T09:18:38.057Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:18:38</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36120,
   "ts": 1187762,
   "observedAt": "2026-04-26T09:18:38.462Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"1\" Bib=\"1\" Id=\"119208.WX1J\" Name=\"KOČÍŘOVÁ Valentýna\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36121,
   "ts": 1187763,
   "observedAt": "2026-04-26T09:18:38.463Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"4\" Id=\"129041.WX1J\" Name=\"ŠTĚPÁNKOVÁ Markéta\" Club=\"TJ Dukla\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36122,
   "ts": 1187763,
   "observedAt": "2026-04-26T09:18:38.463Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"3\" Bib=\"5\" Id=\"121014.WX1J\" Name=\"LEBEDOVÁ Adéla\" Club=\"KK Opava\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36123,
   "ts": 1187763,
   "observedAt": "2026-04-26T09:18:38.463Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"4\" Bib=\"8\" Id=\"9109.WX1J\" Name=\"JUMROVÁ Johana\" Club=\"USK Pha\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36303,
   "ts": 1198445,
   "observedAt": "2026-04-26T09:18:49.145Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:18:49</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36307,
   "ts": 1198452,
   "observedAt": "2026-04-26T09:18:49.152Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"1\" Bib=\"1\" Id=\"119208.WX1J\" Name=\"KOČÍŘOVÁ Valentýna\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36308,
   "ts": 1198452,
   "observedAt": "2026-04-26T09:18:49.152Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"4\" Id=\"129041.WX1J\" Name=\"ŠTĚPÁNKOVÁ Markéta\" Club=\"TJ Dukla\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36309,
   "ts": 1198453,
   "observedAt": "2026-04-26T09:18:49.153Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"3\" Bib=\"5\" Id=\"121014.WX1J\" Name=\"LEBEDOVÁ Adéla\" Club=\"KK Opava\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36310,
   "ts": 1198453,
   "observedAt": "2026-04-26T09:18:49.153Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"4\" Bib=\"8\" Id=\"9109.WX1J\" Name=\"JUMROVÁ Johana\" Club=\"USK Pha\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36311,
   "ts": 1198453,
   "observedAt": "2026-04-26T09:18:49.153Z",
   "data": "<Canoe123 System=\"Main\"><RaceConfig NrSplits=\"0\" NrGates=\"9\" GateConfig=\"DNNRNNNER\" GateCaptions=\"ST,1,2,3,4,5,6,RZ,7\" /></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36332,
   "ts": 1199362,
   "observedAt": "2026-04-26T09:18:50.062Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:18:50</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36339,
   "ts": 1199566,
   "observedAt": "2026-04-26T09:18:50.266Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"1\" Bib=\"1\" Id=\"119208.WX1J\" Name=\"KOČÍŘOVÁ Valentýna\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36340,
   "ts": 1199566,
   "observedAt": "2026-04-26T09:18:50.266Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"4\" Id=\"129041.WX1J\" Name=\"ŠTĚPÁNKOVÁ Markéta\" Club=\"TJ Dukla\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36341,
   "ts": 1199567,
   "observedAt": "2026-04-26T09:18:50.267Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"3\" Bib=\"5\" Id=\"121014.WX1J\" Name=\"LEBEDOVÁ Adéla\" Club=\"KK Opava\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "009-0858-time-limit.jsonl",
   "line": 36342,
   "ts": 1199567,
   "observedAt": "2026-04-26T09:18:50.267Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"4\" Bib=\"8\" Id=\"9109.WX1J\" Name=\"JUMROVÁ Johana\" Club=\"USK Pha\" Nat=\"\" Race=\"WX1 JUN Semifinal\" RaceId=\"WX1J_XS_26_JUN\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  }
 ],
 "stall21": [
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "011-1153-time-limit.jsonl",
   "line": 259,
   "ts": 23081,
   "observedAt": "2026-09-20T11:53:50.073Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>13:53:50</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "011-1153-time-limit.jsonl",
   "line": 263,
   "ts": 23085,
   "observedAt": "2026-09-20T11:53:50.077Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"0\" Position=\"0\" /></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "011-1153-time-limit.jsonl",
   "line": 267,
   "ts": 24047,
   "observedAt": "2026-09-20T11:53:51.039Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>13:53:51</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "011-1153-time-limit.jsonl",
   "line": 271,
   "ts": 24050,
   "observedAt": "2026-09-20T11:53:51.042Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"0\" Position=\"0\" /></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "011-1153-time-limit.jsonl",
   "line": 276,
   "ts": 24871,
   "observedAt": "2026-09-20T11:53:51.863Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>13:53:52</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "011-1153-time-limit.jsonl",
   "line": 280,
   "ts": 24880,
   "observedAt": "2026-09-20T11:53:51.872Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"0\" Position=\"0\" /></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "011-1153-time-limit.jsonl",
   "line": 323,
   "ts": 46412,
   "observedAt": "2026-09-20T11:54:13.404Z",
   "data": "<Canoe123 System=\"Main\"><RaceConfig NrSplits=\"0\" NrGates=\"23\" GateConfig=\"RNNNNRNNRNNRNNNNRNNRNNN\" GateCaptions=\"1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23\" /></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "011-1153-time-limit.jsonl",
   "line": 326,
   "ts": 46413,
   "observedAt": "2026-09-20T11:54:13.405Z",
   "data": "<Canoe123 System=\"Main\"><Schedule><Race Order=\"1\" RaceId=\"FOR_BR1_19\" Race=\"Předjezdci 1. jízda\" MainTitle=\"Předjezdci\" SubTitle=\"1st Run\" ShortTitle=\"Předjezdci 1. jízda\" RaceStatus=\"5\"><StartTime /></Race><Race Order=\"2\" RaceId=\"K1M_BR1_19\" Race=\"K1 muži 1. jízda\" MainTitle=\"K1 muži\" SubTitle=\"1st Run\" ShortTitle=\"K1 muži 1. jízda\" RaceStatus=\"5\"><StartTime /></Race><Race Order=\"3\" RaceId=\"C1W_BR1_19\" Race=\"C1 ženy 1. jízda\" MainTitle=\"C1 ženy\" SubTitle=\"1st Run\" ShortTitle=\"C1 ženy 1. jízda\" RaceStatus=\"5\"><StartTime /></Race><Race Order=\"4\" RaceId=\"K1M_BR2_19\" Race=\"K1 muži 2. jízda\" MainTitle=\"K1 muži\" SubTitle=\"1st and 2nd Run\" ShortTitle=\"K1 muži 2. jízda\" RaceStatus=\"5\"><StartTime /></Race><Race Order=\"5\" RaceId=\"C1W_BR2_19\" Race=\"C1 ženy 2. jízda\" MainTitle=\"C1 ženy\" SubTitle=\"1st and 2nd Run\" ShortTitle=\"C1 ženy 2. jízda\" RaceStatus=\"5\"><StartTime /></Race><Race Order=\"6\" RaceId=\"FOR_BR2_19\" Race=\"Předjezdci 2. jízda\" MainTitle=\"Předjezdci\" SubTitle=\"1st and 2nd Run\" ShortTitle=\"Předjezdci 2. jízda\" RaceStatus=\"4\"><StartTime /></Race><Race Order=\"7\" RaceId=\"C1M_BR1_19\" Race=\"C1 muži 1. jízda\" MainTitle=\"C1 muži\" SubTitle=\"1st Run\" ShortTitle=\"C1 muži 1. jízda\" RaceStatus=\"5\"><StartTime /></Race><Race Order=\"8\" RaceId=\"K1W_BR1_19\" Race=\"K1 ženy 1. jízda\" MainTitle=\"K1 ženy\" SubTitle=\"1st Run\" ShortTitle=\"K1 ženy 1. jízda\" RaceStatus=\"5\"><StartTime /></Race><Race Order=\"9\" RaceId=\"C1M_BR2_19\" Race=\"C1 muži 2. jízda\" MainTitle=\"C1 muži\" SubTitle=\"1st and 2nd Run\" ShortTitle=\"C1 muži 2. jízda\" RaceStatus=\"5\"><StartTime /></Race><Race Order=\"10\" RaceId=\"K1W_BR2_19\" Race=\"K1 ženy 2. jízda\" MainTitle=\"K1 ženy\" SubTitle=\"1st and 2nd Run\" ShortTitle=\"K1 ženy 2. jízda\" RaceStatus=\"5\"><StartTime /></Race><Race Order=\"11\" RaceId=\"FOR_BR1_20\" Race=\"Předjezdci 1. jízda\" MainTitle=\"Předjezdci\" SubTitle=\"1st Run\" ShortTitle=\"Předjezdci 1. jízda\" RaceStatus=\"5\"><StartTime /></Race><Race Order=\"12\" RaceId=\"K1M_BR1_20\" Race=\"K1 muži 1. jízda\" MainTitle=\"K1 muži\" SubTitle=\"1st Run\" ShortTitle=\"K1 muži 1. jízda\" RaceStatus=\"5\"><StartTime /></Race><Race Order=\"13\" RaceId=\"C1W_BR1_20\" Race=\"C1 ženy 1. jízda\" MainTitle=\"C1 ženy\" SubTitle=\"1st Run\" ShortTitle=\"C1 ženy 1. jízda\" RaceStatus=\"5\"><StartTime /></Race><Race Order=\"14\" RaceId=\"K1M_BR2_20\" Race=\"K1 muži 2. jízda\" MainTitle=\"K1 muži\" SubTitle=\"1st and 2nd Run\" ShortTitle=\"K1 muži 2. jízda\" RaceStatus=\"5\"><StartTime /></Race><Race Order=\"15\" RaceId=\"C1W_BR2_20\" Race=\"C1 ženy 2. jízda\" MainTitle=\"C1 ženy\" SubTitle=\"1st and 2nd Run\" ShortTitle=\"C1 ženy 2. jízda\" RaceStatus=\"5\"><StartTime /></Race><Race Order=\"16\" RaceId=\"FOR_BR2_20\" Race=\"Předjezdci 2. jízda\" MainTitle=\"Předjezdci\" SubTitle=\"1st and 2nd Run\" ShortTitle=\"Předjezdci 2. jízda\" RaceStatus=\"1\"><StartTime /></Race><Race Order=\"17\" RaceId=\"C1M_BR1_20\" Race=\"C1 muži 1. jízda\" MainTitle=\"C1 muži\" SubTitle=\"1st Run\" ShortTitle=\"C1 muži 1. jízda\" RaceStatus=\"0\"><StartTime /></Race><Race Order=\"18\" RaceId=\"K1W_BR1_20\" Race=\"K1 ženy 1. jízda\" MainTitle=\"K1 ženy\" SubTitle=\"1st Run\" ShortTitle=\"K1 ženy 1. jízda\" RaceStatus=\"0\"><StartTime /></Race><Race Order=\"19\" RaceId=\"C1M_BR2_20\" Race=\"C1 muži 2. jízda\" MainTitle=\"C1 muži\" SubTitle=\"1st and 2nd Run\" ShortTitle=\"C1 muži 2. jízda\" RaceStatus=\"0\"><StartTime /></Race><Race Order=\"20\" RaceId=\"K1W_BR2_20\" Race=\"K1 ženy 2. jízda\" MainTitle=\"K1 ženy\" SubTitle=\"1st and 2nd Run\" ShortTitle=\"K1 ženy 2. jízda\" RaceStatus=\"0\"><StartTime /></Race></Schedule></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "011-1153-time-limit.jsonl",
   "line": 333,
   "ts": 47019,
   "observedAt": "2026-09-20T11:54:14.011Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>13:54:14</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "011-1153-time-limit.jsonl",
   "line": 337,
   "ts": 47030,
   "observedAt": "2026-09-20T11:54:14.022Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"0\" Position=\"0\" /></Canoe123>"
  }
 ],
 "gap304": [
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18132,
   "ts": 530699,
   "observedAt": "2026-04-19T07:03:24.576Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:03:25</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18140,
   "ts": 530900,
   "observedAt": "2026-04-19T07:03:24.777Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"1\"><Participant StartOrder=\"44\" Bib=\"44\" Id=\"121007.K1M\" Name=\"STROPEK Tobiáš\" Club=\"KK Opava\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:02:00.090\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:03:11.630\" /><Result Type=\"T\" Pen=\"4\" Time=\"71.54\" Total=\"75.54\" TTBDiff=\"+8.69\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18141,
   "ts": 530901,
   "observedAt": "2026-04-19T07:03:24.778Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"45\" Id=\"23064.K1M\" Name=\"PLOCEK Matyáš Jan\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:02:38.100\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"47   \" Total=\"47   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18142,
   "ts": 530903,
   "observedAt": "2026-04-19T07:03:24.780Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"3\"><Participant StartOrder=\"47\" Bib=\"47\" Id=\"14023.K1M\" Name=\"HRON Robin\" Club=\"TJ KRALUPY, z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:03:21.030\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"4   \" Total=\"4   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18143,
   "ts": 530904,
   "observedAt": "2026-04-19T07:03:24.781Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"48\" Bib=\"48\" Id=\"9156.K1M\" Name=\"HANUŠ Jakub\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18144,
   "ts": 530904,
   "observedAt": "2026-04-19T07:03:24.781Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"5\"><Participant StartOrder=\"51\" Bib=\"51\" Id=\"9069.K1M\" Name=\"KOLÁŘ Lukáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18145,
   "ts": 530905,
   "observedAt": "2026-04-19T07:03:24.782Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"6\"><Participant StartOrder=\"50\" Bib=\"50\" Id=\"1137.K1M\" Name=\"ZACHYSTAL Adam\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18167,
   "ts": 531716,
   "observedAt": "2026-04-19T07:03:25.593Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:03:26</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18174,
   "ts": 531926,
   "observedAt": "2026-04-19T07:03:25.803Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"1\"><Participant StartOrder=\"44\" Bib=\"44\" Id=\"121007.K1M\" Name=\"STROPEK Tobiáš\" Club=\"KK Opava\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:02:00.090\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:03:11.630\" /><Result Type=\"T\" Pen=\"4\" Time=\"71.54\" Total=\"75.54\" TTBDiff=\"+8.69\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18175,
   "ts": 531927,
   "observedAt": "2026-04-19T07:03:25.804Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"45\" Id=\"23064.K1M\" Name=\"PLOCEK Matyáš Jan\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:02:38.100\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"48   \" Total=\"48   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18176,
   "ts": 531928,
   "observedAt": "2026-04-19T07:03:25.805Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"3\"><Participant StartOrder=\"47\" Bib=\"47\" Id=\"14023.K1M\" Name=\"HRON Robin\" Club=\"TJ KRALUPY, z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:03:21.030\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"5   \" Total=\"5   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18177,
   "ts": 531929,
   "observedAt": "2026-04-19T07:03:25.806Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"48\" Bib=\"48\" Id=\"9156.K1M\" Name=\"HANUŠ Jakub\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18178,
   "ts": 531930,
   "observedAt": "2026-04-19T07:03:25.807Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"5\"><Participant StartOrder=\"51\" Bib=\"51\" Id=\"9069.K1M\" Name=\"KOLÁŘ Lukáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18179,
   "ts": 531930,
   "observedAt": "2026-04-19T07:03:25.807Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"6\"><Participant StartOrder=\"50\" Bib=\"50\" Id=\"1137.K1M\" Name=\"ZACHYSTAL Adam\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18200,
   "ts": 532738,
   "observedAt": "2026-04-19T07:03:26.615Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:03:27</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18210,
   "ts": 533098,
   "observedAt": "2026-04-19T07:03:26.975Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"1\"><Participant StartOrder=\"44\" Bib=\"44\" Id=\"121007.K1M\" Name=\"STROPEK Tobiáš\" Club=\"KK Opava\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:02:00.090\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:03:11.630\" /><Result Type=\"T\" Pen=\"4\" Time=\"71.54\" Total=\"75.54\" TTBDiff=\"+8.69\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18211,
   "ts": 533099,
   "observedAt": "2026-04-19T07:03:26.976Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"45\" Id=\"23064.K1M\" Name=\"PLOCEK Matyáš Jan\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:02:38.100\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"49   \" Total=\"49   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18212,
   "ts": 533099,
   "observedAt": "2026-04-19T07:03:26.976Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"47\" Bib=\"47\" Id=\"14023.K1M\" Name=\"HRON Robin\" Club=\"TJ KRALUPY, z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:03:21.030\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"6   \" Total=\"6   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18213,
   "ts": 533099,
   "observedAt": "2026-04-19T07:03:26.976Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"48\" Bib=\"48\" Id=\"9156.K1M\" Name=\"HANUŠ Jakub\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18214,
   "ts": 533099,
   "observedAt": "2026-04-19T07:03:26.976Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"50\" Bib=\"50\" Id=\"1137.K1M\" Name=\"ZACHYSTAL Adam\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18229,
   "ts": 533547,
   "observedAt": "2026-04-19T07:03:27.424Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:03:28</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18240,
   "ts": 533963,
   "observedAt": "2026-04-19T07:03:27.840Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"45\" Id=\"23064.K1M\" Name=\"PLOCEK Matyáš Jan\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:02:38.100\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"50   \" Total=\"50   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18241,
   "ts": 533964,
   "observedAt": "2026-04-19T07:03:27.841Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"47\" Bib=\"47\" Id=\"14023.K1M\" Name=\"HRON Robin\" Club=\"TJ KRALUPY, z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:03:21.030\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"7   \" Total=\"7   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18247,
   "ts": 534152,
   "observedAt": "2026-04-19T07:03:28.029Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"1\"><Participant StartOrder=\"44\" Bib=\"44\" Id=\"121007.K1M\" Name=\"STROPEK Tobiáš\" Club=\"KK Opava\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:02:00.090\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:03:11.630\" /><Result Type=\"T\" Pen=\"4\" Time=\"71.54\" Total=\"75.54\" TTBDiff=\"+8.69\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18248,
   "ts": 534154,
   "observedAt": "2026-04-19T07:03:28.031Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"48\" Bib=\"48\" Id=\"9156.K1M\" Name=\"HANUŠ Jakub\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18249,
   "ts": 534155,
   "observedAt": "2026-04-19T07:03:28.032Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"50\" Bib=\"50\" Id=\"1137.K1M\" Name=\"ZACHYSTAL Adam\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18261,
   "ts": 534613,
   "observedAt": "2026-04-19T07:03:28.490Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:03:29</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18271,
   "ts": 534966,
   "observedAt": "2026-04-19T07:03:28.843Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"45\" Id=\"23064.K1M\" Name=\"PLOCEK Matyáš Jan\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:02:38.100\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"51   \" Total=\"51   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18272,
   "ts": 534966,
   "observedAt": "2026-04-19T07:03:28.843Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"3\"><Participant StartOrder=\"47\" Bib=\"47\" Id=\"14023.K1M\" Name=\"HRON Robin\" Club=\"TJ KRALUPY, z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:03:21.030\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"8   \" Total=\"8   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18273,
   "ts": 534967,
   "observedAt": "2026-04-19T07:03:28.844Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"6\"><Participant StartOrder=\"51\" Bib=\"51\" Id=\"9069.K1M\" Name=\"KOLÁŘ Lukáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18280,
   "ts": 535168,
   "observedAt": "2026-04-19T07:03:29.045Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"1\"><Participant StartOrder=\"44\" Bib=\"44\" Id=\"121007.K1M\" Name=\"STROPEK Tobiáš\" Club=\"KK Opava\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:02:00.090\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:03:11.630\" /><Result Type=\"T\" Pen=\"4\" Time=\"71.54\" Total=\"75.54\" TTBDiff=\"+8.69\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18282,
   "ts": 535168,
   "observedAt": "2026-04-19T07:03:29.045Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"48\" Bib=\"48\" Id=\"9156.K1M\" Name=\"HANUŠ Jakub\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "001-0654-setup.jsonl",
   "line": 18283,
   "ts": 535169,
   "observedAt": "2026-04-19T07:03:29.046Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"5\"><Participant StartOrder=\"50\" Bib=\"50\" Id=\"1137.K1M\" Name=\"ZACHYSTAL Adam\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  }
 ],
 "gap368": [
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 6974,
   "ts": 445852,
   "observedAt": "2026-04-26T07:35:52.963Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"53   \" Total=\"53   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 6979,
   "ts": 446060,
   "observedAt": "2026-04-26T07:35:53.171Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:35:53</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 6986,
   "ts": 446262,
   "observedAt": "2026-04-26T07:35:53.373Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 6999,
   "ts": 446878,
   "observedAt": "2026-04-26T07:35:53.989Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:35:54</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7003,
   "ts": 446883,
   "observedAt": "2026-04-26T07:35:53.994Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"54   \" Total=\"54   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7008,
   "ts": 447082,
   "observedAt": "2026-04-26T07:35:54.193Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"Y\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7013,
   "ts": 447284,
   "observedAt": "2026-04-26T07:35:54.395Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"1\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"54   \" Total=\"54   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7026,
   "ts": 447899,
   "observedAt": "2026-04-26T07:35:55.010Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:35:55</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7030,
   "ts": 447905,
   "observedAt": "2026-04-26T07:35:55.016Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"1\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"55   \" Total=\"55   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7033,
   "ts": 447915,
   "observedAt": "2026-04-26T07:35:55.026Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"1\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"55   \" Total=\"55   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7035,
   "ts": 447931,
   "observedAt": "2026-04-26T07:35:55.042Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"1\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"55   \" Total=\"55   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7036,
   "ts": 447935,
   "observedAt": "2026-04-26T07:35:55.046Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"1\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"55   \" Total=\"55   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7039,
   "ts": 447961,
   "observedAt": "2026-04-26T07:35:55.072Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"1\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"55   \" Total=\"55   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7042,
   "ts": 448005,
   "observedAt": "2026-04-26T07:35:55.116Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"1\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"55   \" Total=\"55   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7046,
   "ts": 448101,
   "observedAt": "2026-04-26T07:35:55.212Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"1\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"55   \" Total=\"55   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7048,
   "ts": 448109,
   "observedAt": "2026-04-26T07:35:55.220Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"1\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"55   \" Total=\"55   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7050,
   "ts": 448121,
   "observedAt": "2026-04-26T07:35:55.232Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"1\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"55   \" Total=\"55   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7066,
   "ts": 448928,
   "observedAt": "2026-04-26T07:35:56.039Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:35:56</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7070,
   "ts": 448933,
   "observedAt": "2026-04-26T07:35:56.044Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"1\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"56   \" Total=\"56   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7089,
   "ts": 449950,
   "observedAt": "2026-04-26T07:35:57.061Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:35:57</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7093,
   "ts": 449954,
   "observedAt": "2026-04-26T07:35:57.065Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"1\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"57   \" Total=\"57   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7108,
   "ts": 450766,
   "observedAt": "2026-04-26T07:35:57.877Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7109,
   "ts": 450766,
   "observedAt": "2026-04-26T07:35:57.877Z",
   "data": "<Canoe123 System=\"Main\"><TVS Odd_Bib=\"19\" Odd_RaceId=\"WX1_XT_26\" Even_Bib=\"20\" Even_RaceId=\"WX1_XT_26\" /></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7114,
   "ts": 450968,
   "observedAt": "2026-04-26T07:35:58.079Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:35:58</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7118,
   "ts": 450973,
   "observedAt": "2026-04-26T07:35:58.084Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"58   \" Total=\"58   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7119,
   "ts": 450974,
   "observedAt": "2026-04-26T07:35:58.085Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7120,
   "ts": 450975,
   "observedAt": "2026-04-26T07:35:58.086Z",
   "data": "<Canoe123 System=\"Main\"><Schedule><Race Order=\"1\" RaceId=\"WX1_XT_26\" Race=\"WX1 Individual\" MainTitle=\"Women's Kayak Cross\" SubTitle=\"Time Trial\" ShortTitle=\"WX1 Individual\" RaceStatus=\"3\"><StartTime /></Race><Race Order=\"2\" RaceId=\"MX1_XT_26\" Race=\"MX1 Individual\" MainTitle=\"Men's Kayak Cross\" SubTitle=\"Time Trial\" ShortTitle=\"MX1 Individual\" RaceStatus=\"1\"><StartTime /></Race><Race Order=\"3\" RaceId=\"WX1J_XT_26_JUN\" Race=\"WX1 JUN Individual\" MainTitle=\"Women's Kayak Cross Juniors\" SubTitle=\"Time Trial\" ShortTitle=\"WX1 JUN Individual\" RaceStatus=\"7\"><StartTime /></Race><Race Order=\"4\" RaceId=\"MX1J_XT_26_JUN\" Race=\"MX1 JUN Individual\" MainTitle=\"Men's Kayak Cross Juniors\" SubTitle=\"Time Trial\" ShortTitle=\"MX1 JUN Individual\" RaceStatus=\"7\"><StartTime /></Race><Race Order=\"5\" RaceId=\"WX1_XS_26\" Race=\"WX1 Semifinal\" MainTitle=\"Women's Kayak Cross\" SubTitle=\"Semifinals\" ShortTitle=\"WX1 Semifinal\" RaceStatus=\"0\"><StartTime /></Race><Race Order=\"6\" RaceId=\"MX1_XS_26\" Race=\"MX1 Semifinal\" MainTitle=\"Men's Kayak Cross\" SubTitle=\"Semifinals\" ShortTitle=\"MX1 Semifinal\" RaceStatus=\"0\"><StartTime /></Race><Race Order=\"7\" RaceId=\"WX1J_XS_26_JUN\" Race=\"WX1 JUN Semifinal\" MainTitle=\"Women's Kayak Cross Juniors\" SubTitle=\"Semifinals\" ShortTitle=\"WX1 JUN Semifinal\" RaceStatus=\"0\"><StartTime /></Race><Race Order=\"8\" RaceId=\"MX1J_XS_26_JUN\" Race=\"MX1 JUN Semifinal\" MainTitle=\"Men's Kayak Cross Juniors\" SubTitle=\"Semifinals\" ShortTitle=\"MX1 JUN Semifinal\" RaceStatus=\"0\"><StartTime /></Race><Race Order=\"9\" RaceId=\"WX1_XF_26\" Race=\"WX1 Final\" MainTitle=\"Women's Kayak Cross\" SubTitle=\"Finals\" ShortTitle=\"WX1 Final\" RaceStatus=\"0\"><StartTime /></Race><Race Order=\"10\" RaceId=\"MX1_XF_26\" Race=\"MX1 Final\" MainTitle=\"Men's Kayak Cross\" SubTitle=\"Finals\" ShortTitle=\"MX1 Final\" RaceStatus=\"0\"><StartTime /></Race><Race Order=\"11\" RaceId=\"WX1J_XF_26_JUN\" Race=\"WX1 JUN Final\" MainTitle=\"Women's Kayak Cross Juniors\" SubTitle=\"Finals\" ShortTitle=\"WX1 JUN Final\" RaceStatus=\"0\"><StartTime /></Race><Race Order=\"12\" RaceId=\"MX1J_XF_26_JUN\" Race=\"MX1 JUN Final\" MainTitle=\"Men's Kayak Cross Juniors\" SubTitle=\"Finals\" ShortTitle=\"MX1 JUN Final\" RaceStatus=\"0\"><StartTime /></Race><Race Order=\"13\" RaceId=\"WX1_XER_26\" Race=\"WX1 Results\" MainTitle=\"Women's Kayak Cross\" SubTitle=\"Final Result\" ShortTitle=\"WX1 Results\" RaceStatus=\"0\"><StartTime /></Race><Race Order=\"14\" RaceId=\"MX1_XER_26\" Race=\"MX1 Results\" MainTitle=\"Men's Kayak Cross\" SubTitle=\"Final Result\" ShortTitle=\"MX1 Results\" RaceStatus=\"0\"><StartTime /></Race><Race Order=\"15\" RaceId=\"WX1J_XER_26_JUN\" Race=\"WX1 JUN Results\" MainTitle=\"Women's Kayak Cross Juniors\" SubTitle=\"Final Result\" ShortTitle=\"WX1 JUN Results\" RaceStatus=\"0\"><StartTime /></Race><Race Order=\"16\" RaceId=\"MX1J_XER_26_JUN\" Race=\"MX1 JUN Results\" MainTitle=\"Men's Kayak Cross Juniors\" SubTitle=\"Final Result\" ShortTitle=\"MX1 JUN Results\" RaceStatus=\"0\"><StartTime /></Race></Schedule></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7127,
   "ts": 451293,
   "observedAt": "2026-04-26T07:35:58.404Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"58   \" Total=\"58   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7128,
   "ts": 451294,
   "observedAt": "2026-04-26T07:35:58.405Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7140,
   "ts": 451775,
   "observedAt": "2026-04-26T07:35:58.886Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"59   \" Total=\"59   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7145,
   "ts": 451946,
   "observedAt": "2026-04-26T07:35:59.057Z",
   "data": "<Canoe123 System=\"Main\"><TimingInput ChannelFunction='channelSTF' ChannelNr='0' Time='9:35:59.069' /></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7146,
   "ts": 451979,
   "observedAt": "2026-04-26T07:35:59.090Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:35:59</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7155,
   "ts": 452365,
   "observedAt": "2026-04-26T07:35:59.476Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"0.00\" Total=\"0   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7156,
   "ts": 452365,
   "observedAt": "2026-04-26T07:35:59.476Z",
   "data": "<Canoe123 System=\"Main\"><RaceConfig NrSplits=\"0\" NrGates=\"9\" GateConfig=\"DNNRNNNER\" GateCaptions=\"ST,1,2,3,4,5,6,RZ,7\" /></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7157,
   "ts": 452368,
   "observedAt": "2026-04-26T07:35:59.479Z",
   "data": "<Canoe123 System=\"Main\"><TimingInput ChannelFunction='channelSTM' ChannelNr='1' Time='9:35:59.481' /></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7166,
   "ts": 452801,
   "observedAt": "2026-04-26T07:35:59.912Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"60   \" Total=\"60   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7170,
   "ts": 453005,
   "observedAt": "2026-04-26T07:36:00.116Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:00</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7175,
   "ts": 453194,
   "observedAt": "2026-04-26T07:36:00.305Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"1   \" Total=\"1   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7184,
   "ts": 453812,
   "observedAt": "2026-04-26T07:36:00.923Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"61   \" Total=\"61   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7188,
   "ts": 454016,
   "observedAt": "2026-04-26T07:36:01.127Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:01</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7194,
   "ts": 454221,
   "observedAt": "2026-04-26T07:36:01.332Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"2   \" Total=\"2   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7202,
   "ts": 454821,
   "observedAt": "2026-04-26T07:36:01.932Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"62   \" Total=\"62   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7205,
   "ts": 455023,
   "observedAt": "2026-04-26T07:36:02.134Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:02</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7211,
   "ts": 455229,
   "observedAt": "2026-04-26T07:36:02.340Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"3   \" Total=\"3   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7217,
   "ts": 455841,
   "observedAt": "2026-04-26T07:36:02.952Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"63   \" Total=\"63   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7220,
   "ts": 456044,
   "observedAt": "2026-04-26T07:36:03.155Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:03</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7225,
   "ts": 456238,
   "observedAt": "2026-04-26T07:36:03.349Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"63   \" Total=\"63   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7226,
   "ts": 456239,
   "observedAt": "2026-04-26T07:36:03.350Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"4   \" Total=\"4   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7227,
   "ts": 456239,
   "observedAt": "2026-04-26T07:36:03.350Z",
   "data": "<Canoe123 System=\"Main\"><Results RaceId=\"MX1J_XS_26_JUN\" ClassId=\"MX1J\" Current=\"N\" MainTitle=\"Men's Kayak Cross Juniors\" SubTitle=\"Semifinals - Start List\" /></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7228,
   "ts": 456240,
   "observedAt": "2026-04-26T07:36:03.351Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"4   \" Total=\"4   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7240,
   "ts": 456870,
   "observedAt": "2026-04-26T07:36:03.981Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:04</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7244,
   "ts": 456874,
   "observedAt": "2026-04-26T07:36:03.985Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"64   \" Total=\"64   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7250,
   "ts": 457281,
   "observedAt": "2026-04-26T07:36:04.392Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"5   \" Total=\"5   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7256,
   "ts": 457893,
   "observedAt": "2026-04-26T07:36:05.004Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:05</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7260,
   "ts": 457898,
   "observedAt": "2026-04-26T07:36:05.009Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"65   \" Total=\"65   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7264,
   "ts": 458302,
   "observedAt": "2026-04-26T07:36:05.413Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"6   \" Total=\"6   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7271,
   "ts": 458902,
   "observedAt": "2026-04-26T07:36:06.013Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:06</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7275,
   "ts": 458906,
   "observedAt": "2026-04-26T07:36:06.017Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"66   \" Total=\"66   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7278,
   "ts": 459230,
   "observedAt": "2026-04-26T07:36:06.341Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"66   \" Total=\"66   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7279,
   "ts": 459230,
   "observedAt": "2026-04-26T07:36:06.341Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"7   \" Total=\"7   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7280,
   "ts": 459232,
   "observedAt": "2026-04-26T07:36:06.343Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"7   \" Total=\"7   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7288,
   "ts": 459533,
   "observedAt": "2026-04-26T07:36:06.644Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"66   \" Total=\"66   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7289,
   "ts": 459534,
   "observedAt": "2026-04-26T07:36:06.645Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"7   \" Total=\"7   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7296,
   "ts": 459923,
   "observedAt": "2026-04-26T07:36:07.034Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:07</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7300,
   "ts": 459928,
   "observedAt": "2026-04-26T07:36:07.039Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"67   \" Total=\"67   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7305,
   "ts": 460319,
   "observedAt": "2026-04-26T07:36:07.430Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"8   \" Total=\"8   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7313,
   "ts": 460930,
   "observedAt": "2026-04-26T07:36:08.041Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:08</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7317,
   "ts": 460934,
   "observedAt": "2026-04-26T07:36:08.045Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"68   \" Total=\"68   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7322,
   "ts": 461335,
   "observedAt": "2026-04-26T07:36:08.446Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"9   \" Total=\"9   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7329,
   "ts": 461950,
   "observedAt": "2026-04-26T07:36:09.061Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:09</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7333,
   "ts": 461954,
   "observedAt": "2026-04-26T07:36:09.065Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"69   \" Total=\"69   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7337,
   "ts": 462359,
   "observedAt": "2026-04-26T07:36:09.470Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"10   \" Total=\"10   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7342,
   "ts": 462769,
   "observedAt": "2026-04-26T07:36:09.880Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"70   \" Total=\"70   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7345,
   "ts": 462960,
   "observedAt": "2026-04-26T07:36:10.071Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:10</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7351,
   "ts": 463369,
   "observedAt": "2026-04-26T07:36:10.480Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"11   \" Total=\"11   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7356,
   "ts": 463780,
   "observedAt": "2026-04-26T07:36:10.891Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"71   \" Total=\"71   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7359,
   "ts": 463985,
   "observedAt": "2026-04-26T07:36:11.096Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:11</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7364,
   "ts": 464189,
   "observedAt": "2026-04-26T07:36:11.300Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"12   \" Total=\"12   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7370,
   "ts": 464802,
   "observedAt": "2026-04-26T07:36:11.913Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"72   \" Total=\"72   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7373,
   "ts": 465006,
   "observedAt": "2026-04-26T07:36:12.117Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:12</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7378,
   "ts": 465207,
   "observedAt": "2026-04-26T07:36:12.318Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"13   \" Total=\"13   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7385,
   "ts": 465808,
   "observedAt": "2026-04-26T07:36:12.919Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"73   \" Total=\"73   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7388,
   "ts": 466015,
   "observedAt": "2026-04-26T07:36:13.126Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:13</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7393,
   "ts": 466220,
   "observedAt": "2026-04-26T07:36:13.331Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"14   \" Total=\"14   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7399,
   "ts": 466830,
   "observedAt": "2026-04-26T07:36:13.941Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"74   \" Total=\"74   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7402,
   "ts": 467038,
   "observedAt": "2026-04-26T07:36:14.149Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:14</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7407,
   "ts": 467226,
   "observedAt": "2026-04-26T07:36:14.337Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"15   \" Total=\"15   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7412,
   "ts": 467839,
   "observedAt": "2026-04-26T07:36:14.950Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"75   \" Total=\"75   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7416,
   "ts": 468046,
   "observedAt": "2026-04-26T07:36:15.157Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:15</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7421,
   "ts": 468249,
   "observedAt": "2026-04-26T07:36:15.360Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"16   \" Total=\"16   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7426,
   "ts": 468861,
   "observedAt": "2026-04-26T07:36:15.972Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:16</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7431,
   "ts": 468865,
   "observedAt": "2026-04-26T07:36:15.976Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"76   \" Total=\"76   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7434,
   "ts": 469271,
   "observedAt": "2026-04-26T07:36:16.382Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"17   \" Total=\"17   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7441,
   "ts": 469888,
   "observedAt": "2026-04-26T07:36:16.999Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:17</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7445,
   "ts": 469892,
   "observedAt": "2026-04-26T07:36:17.003Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"77   \" Total=\"77   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7449,
   "ts": 470297,
   "observedAt": "2026-04-26T07:36:17.408Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"18   \" Total=\"18   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7454,
   "ts": 470696,
   "observedAt": "2026-04-26T07:36:17.807Z",
   "data": "<Canoe123 System=\"Main\"><TimingInput ChannelFunction='channelFIF' ChannelNr='2' Time='9:36:17.813' /></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7456,
   "ts": 470896,
   "observedAt": "2026-04-26T07:36:18.007Z",
   "data": "<Canoe123 System=\"Main\"><TimingInput ChannelFunction='channelFIM' ChannelNr='3' Time='9:36:18.009' /></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7457,
   "ts": 470908,
   "observedAt": "2026-04-26T07:36:18.019Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:18</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7461,
   "ts": 470913,
   "observedAt": "2026-04-26T07:36:18.024Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"78   \" Total=\"78   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7462,
   "ts": 470926,
   "observedAt": "2026-04-26T07:36:18.037Z",
   "data": "<Canoe123 System=\"Main\"><Results RaceId=\"WX1_XT_26\" ClassId=\"WX1\" Current=\"Y\" MainTitle=\"Women's Kayak Cross\" SubTitle=\"Time Trial\"><Row Number=\"1\"><Participant Bib=\"  21\" Id=\"12067.WX1\" Name=\"MICHALOVÁ Tereza\" Club=\"TJ Dukla\" Nat=\"\" GivenName=\"Tereza\" FamilyName=\"MICHALOVÁ\" StartOrder=\"5\" StartTime=\"9:34:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"0\" Gates=\"  0  0  0  0  0  0  0  0  0                                                               \" Time=\"66.80\" Total=\"66.80\" Rank=\"1\" RankOrder=\"1\" Behind=\"\" PP=\"\" /></Row><Row Number=\"2\"><Participant Bib=\"  22\" Id=\"11080.WX1\" Name=\"VENCOVÁ Alžběta\" Club=\"KK Brand\" Nat=\"\" GivenName=\"Alžběta\" FamilyName=\"VENCOVÁ\" StartOrder=\"4\" StartTime=\"9:33:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"0\" Gates=\"  0  0  0  0  0  0  0  0  0                                                               \" Time=\"72.72\" Total=\"72.72\" Rank=\"2\" RankOrder=\"2\" Behind=\"+5.92\" PP=\"\" /></Row><Row Number=\"3\"><Participant Bib=\"  24\" Id=\"9109.WX1\" Name=\"JUMROVÁ Johana\" Club=\"USK Pha\" Nat=\"\" GivenName=\"Johana\" FamilyName=\"JUMROVÁ\" StartOrder=\"2\" StartTime=\"9:31:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"0\" Gates=\"  0  0  0  0  0  0  0  0  0                                                               \" Time=\"77.44\" Total=\"77.44\" Rank=\"3\" RankOrder=\"3\" Behind=\"+10.64\" PP=\"\" /></Row><Row Number=\"4\"><Participant Bib=\"  20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" GivenName=\"Tereza\" FamilyName=\"MAROUSKOVÁ\" StartOrder=\"6\" StartTime=\"9:35:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"0\" Gates=\"  0  0  0  0  0  0  0  0  0                                                               \" Time=\"78.15\" Total=\"78.15\" Rank=\"4\" RankOrder=\"4\" Behind=\"+11.35\" PP=\"\" /></Row><Row Number=\"5\"><Participant Bib=\"  23\" Id=\"121081.WX1\" Name=\"FOLTYSOVÁ Tereza Abigail\" Club=\"KK Opava\" Nat=\"\" GivenName=\"Tereza Abigail\" FamilyName=\"FOLTYSOVÁ\" StartOrder=\"3\" StartTime=\"9:32:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"0\" Gates=\"  0  0  0  2  0  0  0  0  0                                                               \" Time=\"87.60\" Total=\"87.60\" Rank=\"5\" RankOrder=\"5\" Behind=\"+20.80\" PP=\"\" /></Row><Row Number=\"6\"><Participant Bib=\"  25\" Id=\"14012.WX1\" Name=\"VYBULKOVÁ Julie\" Club=\"Kralupy\" Nat=\"\" GivenName=\"Julie\" FamilyName=\"VYBULKOVÁ\" StartOrder=\"1\" StartTime=\"9:30:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"DNS\" Pen=\"0\" Gates=\"                                                                                          \" Time=\"\" Total=\"\" Rank=\"6\" RankOrder=\"6\" Behind=\"\" PP=\"\" /></Row></Results></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7466,
   "ts": 471111,
   "observedAt": "2026-04-26T07:36:18.222Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:36:17.813\" /><Result Type=\"T\" Pen=\"0\" Time=\"78.15\" Total=\"78.15\" TTBDiff=\"+11.35\" TTBName=\"T. MICHALOVÁ\" Rank=\"4\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7467,
   "ts": 471112,
   "observedAt": "2026-04-26T07:36:18.223Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"18   \" Total=\"18   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7473,
   "ts": 471316,
   "observedAt": "2026-04-26T07:36:18.427Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"19   \" Total=\"19   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7482,
   "ts": 471914,
   "observedAt": "2026-04-26T07:36:19.025Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:19</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7488,
   "ts": 472117,
   "observedAt": "2026-04-26T07:36:19.228Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:36:17.813\" /><Result Type=\"T\" Pen=\"0\" Time=\"78.15\" Total=\"78.15\" TTBDiff=\"+11.35\" TTBName=\"T. MICHALOVÁ\" Rank=\"4\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7492,
   "ts": 472323,
   "observedAt": "2026-04-26T07:36:19.434Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"20   \" Total=\"20   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7515,
   "ts": 472525,
   "observedAt": "2026-04-26T07:36:19.636Z",
   "data": "<Canoe123 System=\"Main\"><RaceConfig NrSplits=\"0\" NrGates=\"9\" GateConfig=\"DNNRNNNER\" GateCaptions=\"ST,1,2,3,4,5,6,RZ,7\" /></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7520,
   "ts": 472936,
   "observedAt": "2026-04-26T07:36:20.047Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:20</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7526,
   "ts": 473140,
   "observedAt": "2026-04-26T07:36:20.251Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:36:17.813\" /><Result Type=\"T\" Pen=\"0\" Time=\"78.15\" Total=\"78.15\" TTBDiff=\"+11.35\" TTBName=\"T. MICHALOVÁ\" Rank=\"4\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7530,
   "ts": 473347,
   "observedAt": "2026-04-26T07:36:20.458Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"21   \" Total=\"21   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7537,
   "ts": 473761,
   "observedAt": "2026-04-26T07:36:20.872Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:36:17.813\" /><Result Type=\"T\" Pen=\"0\" Time=\"78.15\" Total=\"78.15\" TTBDiff=\"+11.35\" TTBName=\"T. MICHALOVÁ\" Rank=\"4\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7538,
   "ts": 473762,
   "observedAt": "2026-04-26T07:36:20.873Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"21   \" Total=\"21   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7542,
   "ts": 473959,
   "observedAt": "2026-04-26T07:36:21.070Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:21</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7549,
   "ts": 474351,
   "observedAt": "2026-04-26T07:36:21.462Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"22   \" Total=\"22   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7556,
   "ts": 474963,
   "observedAt": "2026-04-26T07:36:22.074Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:22</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7560,
   "ts": 474967,
   "observedAt": "2026-04-26T07:36:22.078Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:36:17.813\" /><Result Type=\"T\" Pen=\"0\" Time=\"78.15\" Total=\"78.15\" TTBDiff=\"+11.35\" TTBName=\"T. MICHALOVÁ\" Rank=\"4\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7565,
   "ts": 475370,
   "observedAt": "2026-04-26T07:36:22.481Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"23   \" Total=\"23   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7570,
   "ts": 475778,
   "observedAt": "2026-04-26T07:36:22.889Z",
   "data": "<Canoe123 System=\"Main\"><TVS Odd_Bib=\"19\" Odd_RaceId=\"WX1_XT_26\" Even_Bib=\"\" Even_RaceId=\"\" /></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7572,
   "ts": 475984,
   "observedAt": "2026-04-26T07:36:23.095Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:23</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7576,
   "ts": 475988,
   "observedAt": "2026-04-26T07:36:23.099Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:36:17.813\" /><Result Type=\"T\" Pen=\"0\" Time=\"78.15\" Total=\"78.15\" TTBDiff=\"+11.35\" TTBName=\"T. MICHALOVÁ\" Rank=\"4\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7579,
   "ts": 476186,
   "observedAt": "2026-04-26T07:36:23.297Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"24   \" Total=\"24   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7582,
   "ts": 476273,
   "observedAt": "2026-04-26T07:36:23.384Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:36:17.813\" /><Result Type=\"T\" Pen=\"0\" Time=\"78.15\" Total=\"78.15\" TTBDiff=\"+11.35\" TTBName=\"T. MICHALOVÁ\" Rank=\"4\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7583,
   "ts": 476274,
   "observedAt": "2026-04-26T07:36:23.385Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"24   \" Total=\"24   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7593,
   "ts": 477004,
   "observedAt": "2026-04-26T07:36:24.115Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:24</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7598,
   "ts": 477194,
   "observedAt": "2026-04-26T07:36:24.305Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"25   \" Total=\"25   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7601,
   "ts": 477396,
   "observedAt": "2026-04-26T07:36:24.507Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:36:17.813\" /><Result Type=\"T\" Pen=\"0\" Time=\"78.15\" Total=\"78.15\" TTBDiff=\"+11.35\" TTBName=\"T. MICHALOVÁ\" Rank=\"4\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7608,
   "ts": 478011,
   "observedAt": "2026-04-26T07:36:25.122Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:25</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7613,
   "ts": 478216,
   "observedAt": "2026-04-26T07:36:25.327Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"26   \" Total=\"26   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7616,
   "ts": 478419,
   "observedAt": "2026-04-26T07:36:25.530Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:36:17.813\" /><Result Type=\"T\" Pen=\"0\" Time=\"78.15\" Total=\"78.15\" TTBDiff=\"+11.35\" TTBName=\"T. MICHALOVÁ\" Rank=\"4\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7623,
   "ts": 479032,
   "observedAt": "2026-04-26T07:36:26.143Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:26</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7628,
   "ts": 479234,
   "observedAt": "2026-04-26T07:36:26.345Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"27   \" Total=\"27   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7631,
   "ts": 479437,
   "observedAt": "2026-04-26T07:36:26.548Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:36:17.813\" /><Result Type=\"T\" Pen=\"0\" Time=\"78.15\" Total=\"78.15\" TTBDiff=\"+11.35\" TTBName=\"T. MICHALOVÁ\" Rank=\"4\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7637,
   "ts": 480039,
   "observedAt": "2026-04-26T07:36:27.150Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:27</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7642,
   "ts": 480244,
   "observedAt": "2026-04-26T07:36:27.355Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"28   \" Total=\"28   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7645,
   "ts": 480447,
   "observedAt": "2026-04-26T07:36:27.558Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:36:17.813\" /><Result Type=\"T\" Pen=\"0\" Time=\"78.15\" Total=\"78.15\" TTBDiff=\"+11.35\" TTBName=\"T. MICHALOVÁ\" Rank=\"4\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7651,
   "ts": 481063,
   "observedAt": "2026-04-26T07:36:28.174Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:28</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7656,
   "ts": 481265,
   "observedAt": "2026-04-26T07:36:28.376Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"29   \" Total=\"29   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7659,
   "ts": 481471,
   "observedAt": "2026-04-26T07:36:28.582Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:36:17.813\" /><Result Type=\"T\" Pen=\"0\" Time=\"78.15\" Total=\"78.15\" TTBDiff=\"+11.35\" TTBName=\"T. MICHALOVÁ\" Rank=\"4\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7664,
   "ts": 481867,
   "observedAt": "2026-04-26T07:36:28.978Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:29</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7670,
   "ts": 482274,
   "observedAt": "2026-04-26T07:36:29.385Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"30   \" Total=\"30   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7673,
   "ts": 482476,
   "observedAt": "2026-04-26T07:36:29.587Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"6\" Bib=\"20\" Id=\"119177.WX1\" Name=\"MAROUSKOVÁ Tereza\" Club=\"Olomouc\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:34:59.657\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:36:17.813\" /><Result Type=\"T\" Pen=\"0\" Time=\"78.15\" Total=\"78.15\" TTBDiff=\"+11.35\" TTBName=\"T. MICHALOVÁ\" Rank=\"4\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7678,
   "ts": 482883,
   "observedAt": "2026-04-26T07:36:29.994Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:36:30</TimeOfDay></Canoe123>"
  }
 ],
 "gap386": [
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47867,
   "ts": 1507350,
   "observedAt": "2026-09-20T13:01:37.492Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"15\" Bib=\"49\" Id=\"103024.K1W\" Name=\"NĚMCOVÁ Marie\" Club=\"KK Brno\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"14:59:39.390\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"15:01:29.470\" /><Result Type=\"T\" Pen=\"2\" Time=\"110.08\" Total=\"112.08\" TTBDiff=\"+8.18\" TTBName=\"J. VYBULKOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47868,
   "ts": 1507351,
   "observedAt": "2026-09-20T13:01:37.493Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"16\" Bib=\"48\" Id=\"52046.K1W\" Name=\"PETRIKOVÁ Barbora\" Club=\"Loko Žatec\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,2,0,0,0,0,50,0,0,0,0,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"15:00:19.400\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"52\" Time=\"78   \" Total=\"130   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47869,
   "ts": 1507351,
   "observedAt": "2026-09-20T13:01:37.493Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"17\" Bib=\"47\" Id=\"118004.K1W\" Name=\"MICHAJLOVIČOVÁ Ester\" Club=\"Ostrava\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:00:59.360\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"38   \" Total=\"38   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47870,
   "ts": 1507351,
   "observedAt": "2026-09-20T13:01:37.493Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"18\" Bib=\"46\" Id=\"133016.K1W\" Name=\"LOVECKÁ Nela\" Club=\"SKVeselí\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47882,
   "ts": 1507762,
   "observedAt": "2026-09-20T13:01:37.904Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:01:38</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47897,
   "ts": 1508371,
   "observedAt": "2026-09-20T13:01:38.513Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"15\" Bib=\"49\" Id=\"103024.K1W\" Name=\"NĚMCOVÁ Marie\" Club=\"KK Brno\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"14:59:39.390\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"15:01:29.470\" /><Result Type=\"T\" Pen=\"2\" Time=\"110.08\" Total=\"112.08\" TTBDiff=\"+8.18\" TTBName=\"J. VYBULKOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47898,
   "ts": 1508372,
   "observedAt": "2026-09-20T13:01:38.514Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"16\" Bib=\"48\" Id=\"52046.K1W\" Name=\"PETRIKOVÁ Barbora\" Club=\"Loko Žatec\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,2,0,0,0,0,50,0,0,0,0,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"15:00:19.400\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"52\" Time=\"79   \" Total=\"131   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47899,
   "ts": 1508372,
   "observedAt": "2026-09-20T13:01:38.514Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"17\" Bib=\"47\" Id=\"118004.K1W\" Name=\"MICHAJLOVIČOVÁ Ester\" Club=\"Ostrava\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:00:59.360\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"39   \" Total=\"39   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47900,
   "ts": 1508372,
   "observedAt": "2026-09-20T13:01:38.514Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"18\" Bib=\"46\" Id=\"133016.K1W\" Name=\"LOVECKÁ Nela\" Club=\"SKVeselí\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47911,
   "ts": 1508765,
   "observedAt": "2026-09-20T13:01:38.907Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:01:39</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47916,
   "ts": 1508849,
   "observedAt": "2026-09-20T13:01:38.991Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"15\" Bib=\"49\" Id=\"103024.K1W\" Name=\"NĚMCOVÁ Marie\" Club=\"KK Brno\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"14:59:39.390\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"15:01:29.470\" /><Result Type=\"T\" Pen=\"2\" Time=\"110.08\" Total=\"112.08\" TTBDiff=\"+8.18\" TTBName=\"J. VYBULKOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47917,
   "ts": 1508849,
   "observedAt": "2026-09-20T13:01:38.991Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"16\" Bib=\"48\" Id=\"52046.K1W\" Name=\"PETRIKOVÁ Barbora\" Club=\"Loko Žatec\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,2,0,0,0,0,50,0,0,0,0,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"15:00:19.400\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"52\" Time=\"79   \" Total=\"131   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47918,
   "ts": 1508850,
   "observedAt": "2026-09-20T13:01:38.992Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"17\" Bib=\"47\" Id=\"118004.K1W\" Name=\"MICHAJLOVIČOVÁ Ester\" Club=\"Ostrava\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:00:59.360\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"39   \" Total=\"39   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47919,
   "ts": 1508854,
   "observedAt": "2026-09-20T13:01:38.996Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"16\" Bib=\"48\" Id=\"52046.K1W\" Name=\"PETRIKOVÁ Barbora\" Club=\"Loko Žatec\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,2,0,0,0,0,50,0,0,0,0,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"15:00:19.400\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"52\" Time=\"79   \" Total=\"131   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47920,
   "ts": 1508854,
   "observedAt": "2026-09-20T13:01:38.996Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"17\" Bib=\"47\" Id=\"118004.K1W\" Name=\"MICHAJLOVIČOVÁ Ester\" Club=\"Ostrava\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:00:59.360\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"39   \" Total=\"39   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47933,
   "ts": 1509227,
   "observedAt": "2026-09-20T13:01:39.369Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"15\" Bib=\"49\" Id=\"103024.K1W\" Name=\"NĚMCOVÁ Marie\" Club=\"KK Brno\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"14:59:39.390\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"15:01:29.470\" /><Result Type=\"T\" Pen=\"2\" Time=\"110.08\" Total=\"112.08\" TTBDiff=\"+8.18\" TTBName=\"J. VYBULKOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47934,
   "ts": 1509228,
   "observedAt": "2026-09-20T13:01:39.370Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"16\" Bib=\"48\" Id=\"52046.K1W\" Name=\"PETRIKOVÁ Barbora\" Club=\"Loko Žatec\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,2,0,0,0,0,50,0,0,0,0,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"15:00:19.400\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"52\" Time=\"79   \" Total=\"131   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47935,
   "ts": 1509229,
   "observedAt": "2026-09-20T13:01:39.371Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"17\" Bib=\"47\" Id=\"118004.K1W\" Name=\"MICHAJLOVIČOVÁ Ester\" Club=\"Ostrava\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:00:59.360\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"39   \" Total=\"39   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47942,
   "ts": 1509373,
   "observedAt": "2026-09-20T13:01:39.515Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"16\" Bib=\"48\" Id=\"52046.K1W\" Name=\"PETRIKOVÁ Barbora\" Club=\"Loko Žatec\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,2,0,0,0,0,50,0,0,0,0,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"15:00:19.400\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"52\" Time=\"80   \" Total=\"132   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47943,
   "ts": 1509374,
   "observedAt": "2026-09-20T13:01:39.516Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"17\" Bib=\"47\" Id=\"118004.K1W\" Name=\"MICHAJLOVIČOVÁ Ester\" Club=\"Ostrava\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:00:59.360\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"40   \" Total=\"40   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47949,
   "ts": 1509570,
   "observedAt": "2026-09-20T13:01:39.712Z",
   "data": "<Canoe123 System=\"Main\"><TimingInput ChannelFunction='channelSTF' ChannelNr='0' Time='15:01:39.870' /></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47951,
   "ts": 1509644,
   "observedAt": "2026-09-20T13:01:39.786Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"15\" Bib=\"49\" Id=\"103024.K1W\" Name=\"NĚMCOVÁ Marie\" Club=\"KK Brno\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"14:59:39.390\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"15:01:29.470\" /><Result Type=\"T\" Pen=\"2\" Time=\"110.08\" Total=\"112.08\" TTBDiff=\"+8.18\" TTBName=\"J. VYBULKOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47952,
   "ts": 1509645,
   "observedAt": "2026-09-20T13:01:39.787Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"16\" Bib=\"48\" Id=\"52046.K1W\" Name=\"PETRIKOVÁ Barbora\" Club=\"Loko Žatec\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,2,0,0,0,0,50,0,0,0,0,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"15:00:19.400\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"52\" Time=\"80   \" Total=\"132   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47953,
   "ts": 1509646,
   "observedAt": "2026-09-20T13:01:39.788Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"17\" Bib=\"47\" Id=\"118004.K1W\" Name=\"MICHAJLOVIČOVÁ Ester\" Club=\"Ostrava\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:00:59.360\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"40   \" Total=\"40   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47957,
   "ts": 1509656,
   "observedAt": "2026-09-20T13:01:39.798Z",
   "data": "<Canoe123 System=\"Main\"><TimingInput ChannelFunction='channelSTM' ChannelNr='1' Time='15:01:39.940' /></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47960,
   "ts": 1509779,
   "observedAt": "2026-09-20T13:01:39.921Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:01:40</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47975,
   "ts": 1510389,
   "observedAt": "2026-09-20T13:01:40.531Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"16\" Bib=\"48\" Id=\"52046.K1W\" Name=\"PETRIKOVÁ Barbora\" Club=\"Loko Žatec\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,2,0,0,0,0,50,0,0,0,0,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"15:00:19.400\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"52\" Time=\"81   \" Total=\"133   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47976,
   "ts": 1510390,
   "observedAt": "2026-09-20T13:01:40.532Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"17\" Bib=\"47\" Id=\"118004.K1W\" Name=\"MICHAJLOVIČOVÁ Ester\" Club=\"Ostrava\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:00:59.360\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"41   \" Total=\"41   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47986,
   "ts": 1510800,
   "observedAt": "2026-09-20T13:01:40.942Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:01:41</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 47990,
   "ts": 1510805,
   "observedAt": "2026-09-20T13:01:40.947Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"15\" Bib=\"49\" Id=\"103024.K1W\" Name=\"NĚMCOVÁ Marie\" Club=\"KK Brno\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"14:59:39.390\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"15:01:29.470\" /><Result Type=\"T\" Pen=\"2\" Time=\"110.08\" Total=\"112.08\" TTBDiff=\"+8.18\" TTBName=\"J. VYBULKOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 48002,
   "ts": 1511413,
   "observedAt": "2026-09-20T13:01:41.555Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"16\" Bib=\"48\" Id=\"52046.K1W\" Name=\"PETRIKOVÁ Barbora\" Club=\"Loko Žatec\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,2,0,0,0,0,50,0,0,0,0,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"15:00:19.400\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"52\" Time=\"82   \" Total=\"134   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 48003,
   "ts": 1511414,
   "observedAt": "2026-09-20T13:01:41.556Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"17\" Bib=\"47\" Id=\"118004.K1W\" Name=\"MICHAJLOVIČOVÁ Ester\" Club=\"Ostrava\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:00:59.360\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"42   \" Total=\"42   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 48013,
   "ts": 1511821,
   "observedAt": "2026-09-20T13:01:41.963Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:01:42</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 48017,
   "ts": 1511826,
   "observedAt": "2026-09-20T13:01:41.968Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"15\" Bib=\"49\" Id=\"103024.K1W\" Name=\"NĚMCOVÁ Marie\" Club=\"KK Brno\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"14:59:39.390\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"15:01:29.470\" /><Result Type=\"T\" Pen=\"2\" Time=\"110.08\" Total=\"112.08\" TTBDiff=\"+8.18\" TTBName=\"J. VYBULKOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 48026,
   "ts": 1512234,
   "observedAt": "2026-09-20T13:01:42.376Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"18\" Bib=\"46\" Id=\"133016.K1W\" Name=\"LOVECKÁ Nela\" Club=\"SKVeselí\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 48032,
   "ts": 1512456,
   "observedAt": "2026-09-20T13:01:42.598Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"16\" Bib=\"48\" Id=\"52046.K1W\" Name=\"PETRIKOVÁ Barbora\" Club=\"Loko Žatec\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,2,0,0,0,0,50,0,0,0,0,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"15:00:19.400\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"52\" Time=\"83   \" Total=\"135   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "013-1236-c1m-2nd-run.jsonl",
   "line": 48033,
   "ts": 1512456,
   "observedAt": "2026-09-20T13:01:42.598Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"17\" Bib=\"47\" Id=\"118004.K1W\" Name=\"MICHAJLOVIČOVÁ Ester\" Club=\"Ostrava\" Nat=\"\" Race=\"K1 ženy 1. jízda\" RaceId=\"K1W_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:00:59.360\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"43   \" Total=\"43   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  }
 ],
 "forListing": [
  {
   "recording": "2026-09-20-2026-nkz-20ne",
   "chunk": "011-1153-time-limit.jsonl",
   "line": 3550,
   "ts": 302649,
   "observedAt": "2026-09-20T11:58:29.641Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"1\" Position=\"1\"><Participant StartOrder=\"1\" Bib=\"5\" Id=\"23129.FOR\" Name=\"ŠITRA Štěpán\" Club=\"SKVSČB\" Nat=\"\" Race=\"Předjezdci 2. jízda\" RaceId=\"FOR_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+122.51\" TTBName=\"Š. DOLEŽAL\" Rank=\"5\" /></OnCourse></Canoe123>"
  }
 ],
 "cold80": [
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5594,
   "ts": 163857,
   "observedAt": "2026-09-19T09:28:50.251Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+13.80\" TTBName=\"M. KOPEČEK\" Rank=\"30\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5618,
   "ts": 164599,
   "observedAt": "2026-09-19T09:28:50.993Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+13.80\" TTBName=\"M. KOPEČEK\" Rank=\"30\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5621,
   "ts": 164609,
   "observedAt": "2026-09-19T09:28:51.003Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+13.80\" TTBName=\"M. KOPEČEK\" Rank=\"30\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5625,
   "ts": 164620,
   "observedAt": "2026-09-19T09:28:51.014Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+13.80\" TTBName=\"M. KOPEČEK\" Rank=\"30\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5629,
   "ts": 164622,
   "observedAt": "2026-09-19T09:28:51.016Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+13.80\" TTBName=\"M. KOPEČEK\" Rank=\"30\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5632,
   "ts": 164635,
   "observedAt": "2026-09-19T09:28:51.029Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+13.80\" TTBName=\"M. KOPEČEK\" Rank=\"30\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5636,
   "ts": 164643,
   "observedAt": "2026-09-19T09:28:51.037Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+13.80\" TTBName=\"M. KOPEČEK\" Rank=\"30\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5639,
   "ts": 164650,
   "observedAt": "2026-09-19T09:28:51.044Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+13.80\" TTBName=\"M. KOPEČEK\" Rank=\"30\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5691,
   "ts": 165794,
   "observedAt": "2026-09-19T09:28:52.188Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+13.80\" TTBName=\"M. KOPEČEK\" Rank=\"30\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5695,
   "ts": 165807,
   "observedAt": "2026-09-19T09:28:52.201Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+13.80\" TTBName=\"M. KOPEČEK\" Rank=\"30\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5725,
   "ts": 166816,
   "observedAt": "2026-09-19T09:28:53.210Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+13.80\" TTBName=\"M. KOPEČEK\" Rank=\"30\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5759,
   "ts": 168081,
   "observedAt": "2026-09-19T09:28:54.475Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+13.80\" TTBName=\"M. KOPEČEK\" Rank=\"30\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5791,
   "ts": 169255,
   "observedAt": "2026-09-19T09:28:55.649Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+13.80\" TTBName=\"M. KOPEČEK\" Rank=\"30\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5819,
   "ts": 170273,
   "observedAt": "2026-09-19T09:28:56.667Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+13.80\" TTBName=\"M. KOPEČEK\" Rank=\"30\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5848,
   "ts": 171365,
   "observedAt": "2026-09-19T09:28:57.759Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+13.80\" TTBName=\"M. KOPEČEK\" Rank=\"30\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5882,
   "ts": 172508,
   "observedAt": "2026-09-19T09:28:58.902Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+13.80\" TTBName=\"M. KOPEČEK\" Rank=\"30\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5901,
   "ts": 173214,
   "observedAt": "2026-09-19T09:28:59.608Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"0.00\" Total=\"0   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5908,
   "ts": 173316,
   "observedAt": "2026-09-19T09:28:59.710Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"0.00\" Total=\"0   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5937,
   "ts": 174340,
   "observedAt": "2026-09-19T09:29:00.734Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"1   \" Total=\"1   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5953,
   "ts": 174764,
   "observedAt": "2026-09-19T09:29:01.158Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"1   \" Total=\"1   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5968,
   "ts": 175155,
   "observedAt": "2026-09-19T09:29:01.549Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"1   \" Total=\"1   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5976,
   "ts": 175362,
   "observedAt": "2026-09-19T09:29:01.756Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"2   \" Total=\"2   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5989,
   "ts": 175601,
   "observedAt": "2026-09-19T09:29:01.995Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"2   \" Total=\"2   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 5999,
   "ts": 175859,
   "observedAt": "2026-09-19T09:29:02.253Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"2   \" Total=\"2   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6015,
   "ts": 176379,
   "observedAt": "2026-09-19T09:29:02.773Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"3   \" Total=\"3   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6043,
   "ts": 177393,
   "observedAt": "2026-09-19T09:29:03.787Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"4   \" Total=\"4   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6071,
   "ts": 178384,
   "observedAt": "2026-09-19T09:29:04.778Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"5   \" Total=\"5   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6073,
   "ts": 178386,
   "observedAt": "2026-09-19T09:29:04.780Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"5   \" Total=\"5   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6096,
   "ts": 178951,
   "observedAt": "2026-09-19T09:29:05.345Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"5   \" Total=\"5   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6111,
   "ts": 179368,
   "observedAt": "2026-09-19T09:29:05.762Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"6   \" Total=\"6   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6113,
   "ts": 179373,
   "observedAt": "2026-09-19T09:29:05.767Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"6   \" Total=\"6   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6168,
   "ts": 180436,
   "observedAt": "2026-09-19T09:29:06.830Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"7   \" Total=\"7   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6195,
   "ts": 181459,
   "observedAt": "2026-09-19T09:29:07.853Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"8   \" Total=\"8   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6225,
   "ts": 182467,
   "observedAt": "2026-09-19T09:29:08.861Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"9   \" Total=\"9   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6257,
   "ts": 183501,
   "observedAt": "2026-09-19T09:29:09.895Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"10   \" Total=\"10   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6285,
   "ts": 184522,
   "observedAt": "2026-09-19T09:29:10.916Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"11   \" Total=\"11   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6304,
   "ts": 185342,
   "observedAt": "2026-09-19T09:29:11.736Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"12   \" Total=\"12   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6334,
   "ts": 186368,
   "observedAt": "2026-09-19T09:29:12.762Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"13   \" Total=\"13   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6362,
   "ts": 187394,
   "observedAt": "2026-09-19T09:29:13.788Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"14   \" Total=\"14   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6390,
   "ts": 188403,
   "observedAt": "2026-09-19T09:29:14.797Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"15   \" Total=\"15   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6408,
   "ts": 188920,
   "observedAt": "2026-09-19T09:29:15.314Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"15   \" Total=\"15   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6420,
   "ts": 189223,
   "observedAt": "2026-09-19T09:29:15.617Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"15   \" Total=\"15   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6427,
   "ts": 189255,
   "observedAt": "2026-09-19T09:29:15.649Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"15   \" Total=\"15   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6434,
   "ts": 189432,
   "observedAt": "2026-09-19T09:29:15.826Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"16   \" Total=\"16   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6445,
   "ts": 189598,
   "observedAt": "2026-09-19T09:29:15.992Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"16   \" Total=\"16   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6452,
   "ts": 189624,
   "observedAt": "2026-09-19T09:29:16.018Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"16   \" Total=\"16   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6462,
   "ts": 189882,
   "observedAt": "2026-09-19T09:29:16.276Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"16   \" Total=\"16   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6473,
   "ts": 190082,
   "observedAt": "2026-09-19T09:29:16.476Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"16   \" Total=\"16   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6483,
   "ts": 190454,
   "observedAt": "2026-09-19T09:29:16.848Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"17   \" Total=\"17   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6513,
   "ts": 191482,
   "observedAt": "2026-09-19T09:29:17.876Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"18   \" Total=\"18   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6518,
   "ts": 191694,
   "observedAt": "2026-09-19T09:29:18.088Z",
   "data": "<Canoe123 System=\"Main\"><Results RaceId=\"K1M_BR2_19\" ClassId=\"K1M\" Current=\"Y\" MainTitle=\"K1 muži\" SubTitle=\"1st and 2nd Run\"><Row Number=\"31\"><Participant Bib=\"  80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" GivenName=\"Matěj\" FamilyName=\"SEKANINA\" StartOrder=\"38\" StartTime=\"11:29:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"2\" Gates=\"\" Time=\"\" Total=\"91.42\" Rank=\"31\" RankOrder=\"31\" Behind=\"+13.80\" PP=\"\" /></Row></Results></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6532,
   "ts": 191887,
   "observedAt": "2026-09-19T09:29:18.281Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"18   \" Total=\"18   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6553,
   "ts": 192505,
   "observedAt": "2026-09-19T09:29:18.899Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"19   \" Total=\"19   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6574,
   "ts": 193239,
   "observedAt": "2026-09-19T09:29:19.633Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"19   \" Total=\"19   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6587,
   "ts": 193534,
   "observedAt": "2026-09-19T09:29:19.928Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"20   \" Total=\"20   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6595,
   "ts": 193719,
   "observedAt": "2026-09-19T09:29:20.113Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"20   \" Total=\"20   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6609,
   "ts": 194068,
   "observedAt": "2026-09-19T09:29:20.462Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"20   \" Total=\"20   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6617,
   "ts": 194349,
   "observedAt": "2026-09-19T09:29:20.743Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"21   \" Total=\"21   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6645,
   "ts": 195368,
   "observedAt": "2026-09-19T09:29:21.762Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"22   \" Total=\"22   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6673,
   "ts": 196389,
   "observedAt": "2026-09-19T09:29:22.783Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"23   \" Total=\"23   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6701,
   "ts": 197410,
   "observedAt": "2026-09-19T09:29:23.804Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"24   \" Total=\"24   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6728,
   "ts": 198436,
   "observedAt": "2026-09-19T09:29:24.830Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"25   \" Total=\"25   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6756,
   "ts": 199438,
   "observedAt": "2026-09-19T09:29:25.832Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"26   \" Total=\"26   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6784,
   "ts": 200462,
   "observedAt": "2026-09-19T09:29:26.856Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"27   \" Total=\"27   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6804,
   "ts": 201050,
   "observedAt": "2026-09-19T09:29:27.444Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"27   \" Total=\"27   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6815,
   "ts": 201280,
   "observedAt": "2026-09-19T09:29:27.674Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"27   \" Total=\"27   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6822,
   "ts": 201471,
   "observedAt": "2026-09-19T09:29:27.865Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"28   \" Total=\"28   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6831,
   "ts": 201521,
   "observedAt": "2026-09-19T09:29:27.915Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"28   \" Total=\"28   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6855,
   "ts": 202483,
   "observedAt": "2026-09-19T09:29:28.877Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"29   \" Total=\"29   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6887,
   "ts": 203511,
   "observedAt": "2026-09-19T09:29:29.905Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"30   \" Total=\"30   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6896,
   "ts": 203689,
   "observedAt": "2026-09-19T09:29:30.083Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"30   \" Total=\"32   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6913,
   "ts": 204178,
   "observedAt": "2026-09-19T09:29:30.572Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"30   \" Total=\"32   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6927,
   "ts": 204530,
   "observedAt": "2026-09-19T09:29:30.924Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"31   \" Total=\"33   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6933,
   "ts": 204547,
   "observedAt": "2026-09-19T09:29:30.941Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"31   \" Total=\"33   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6938,
   "ts": 204555,
   "observedAt": "2026-09-19T09:29:30.949Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"31   \" Total=\"33   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6942,
   "ts": 204570,
   "observedAt": "2026-09-19T09:29:30.964Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"31   \" Total=\"33   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6947,
   "ts": 204576,
   "observedAt": "2026-09-19T09:29:30.970Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"31   \" Total=\"33   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6951,
   "ts": 204584,
   "observedAt": "2026-09-19T09:29:30.978Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"31   \" Total=\"33   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6955,
   "ts": 204596,
   "observedAt": "2026-09-19T09:29:30.990Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"31   \" Total=\"33   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 6983,
   "ts": 204656,
   "observedAt": "2026-09-19T09:29:31.050Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"31   \" Total=\"33   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7010,
   "ts": 205539,
   "observedAt": "2026-09-19T09:29:31.933Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"32   \" Total=\"34   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7034,
   "ts": 206439,
   "observedAt": "2026-09-19T09:29:32.833Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"33   \" Total=\"35   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7062,
   "ts": 207369,
   "observedAt": "2026-09-19T09:29:33.763Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"34   \" Total=\"36   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7068,
   "ts": 207474,
   "observedAt": "2026-09-19T09:29:33.868Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"34   \" Total=\"36   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7086,
   "ts": 207762,
   "observedAt": "2026-09-19T09:29:34.156Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"34   \" Total=\"36   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7101,
   "ts": 208082,
   "observedAt": "2026-09-19T09:29:34.476Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"34   \" Total=\"36   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7112,
   "ts": 208348,
   "observedAt": "2026-09-19T09:29:34.742Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"35   \" Total=\"37   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7114,
   "ts": 208350,
   "observedAt": "2026-09-19T09:29:34.744Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"35   \" Total=\"37   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7130,
   "ts": 208515,
   "observedAt": "2026-09-19T09:29:34.909Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"35   \" Total=\"37   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7143,
   "ts": 208747,
   "observedAt": "2026-09-19T09:29:35.141Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"35   \" Total=\"37   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7162,
   "ts": 209399,
   "observedAt": "2026-09-19T09:29:35.793Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"36   \" Total=\"38   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7216,
   "ts": 210431,
   "observedAt": "2026-09-19T09:29:36.825Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"37   \" Total=\"39   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7242,
   "ts": 211114,
   "observedAt": "2026-09-19T09:29:37.508Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"37   \" Total=\"39   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7256,
   "ts": 211601,
   "observedAt": "2026-09-19T09:29:37.995Z",
   "data": "<Canoe123 System=\"Main\"><Results RaceId=\"K1M_BR2_19\" ClassId=\"K1M\" Current=\"Y\" MainTitle=\"K1 muži\" SubTitle=\"1st and 2nd Run\"><Row Number=\"31\"><Participant Bib=\"  80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" GivenName=\"Matěj\" FamilyName=\"SEKANINA\" StartOrder=\"38\" StartTime=\"11:29:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"2\" Gates=\"\" Time=\"\" Total=\"91.42\" Rank=\"31\" RankOrder=\"31\" Behind=\"+13.80\" PP=\"\" /></Row></Results></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7260,
   "ts": 211775,
   "observedAt": "2026-09-19T09:29:38.169Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"38   \" Total=\"40   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7273,
   "ts": 212059,
   "observedAt": "2026-09-19T09:29:38.453Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"38   \" Total=\"40   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7285,
   "ts": 212465,
   "observedAt": "2026-09-19T09:29:38.859Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"39   \" Total=\"41   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7317,
   "ts": 213496,
   "observedAt": "2026-09-19T09:29:39.890Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"40   \" Total=\"42   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7352,
   "ts": 214531,
   "observedAt": "2026-09-19T09:29:40.925Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"41   \" Total=\"43   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7372,
   "ts": 215348,
   "observedAt": "2026-09-19T09:29:41.742Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"42   \" Total=\"44   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7402,
   "ts": 216358,
   "observedAt": "2026-09-19T09:29:42.752Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"43   \" Total=\"45   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7430,
   "ts": 217379,
   "observedAt": "2026-09-19T09:29:43.773Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"44   \" Total=\"46   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7457,
   "ts": 218407,
   "observedAt": "2026-09-19T09:29:44.801Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"45   \" Total=\"47   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7485,
   "ts": 219429,
   "observedAt": "2026-09-19T09:29:45.823Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"46   \" Total=\"48   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7513,
   "ts": 220455,
   "observedAt": "2026-09-19T09:29:46.849Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"47   \" Total=\"49   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7545,
   "ts": 221489,
   "observedAt": "2026-09-19T09:29:47.883Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"48   \" Total=\"50   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7574,
   "ts": 222505,
   "observedAt": "2026-09-19T09:29:48.899Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"49   \" Total=\"51   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7581,
   "ts": 222639,
   "observedAt": "2026-09-19T09:29:49.033Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"49   \" Total=\"51   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7594,
   "ts": 222996,
   "observedAt": "2026-09-19T09:29:49.390Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"49   \" Total=\"51   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7606,
   "ts": 223353,
   "observedAt": "2026-09-19T09:29:49.747Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"50   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7608,
   "ts": 223354,
   "observedAt": "2026-09-19T09:29:49.748Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"50   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7646,
   "ts": 224554,
   "observedAt": "2026-09-19T09:29:50.948Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"51   \" Total=\"53   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7666,
   "ts": 225348,
   "observedAt": "2026-09-19T09:29:51.742Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"52   \" Total=\"54   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7694,
   "ts": 226373,
   "observedAt": "2026-09-19T09:29:52.767Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"53   \" Total=\"55   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7721,
   "ts": 227399,
   "observedAt": "2026-09-19T09:29:53.793Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"54   \" Total=\"56   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7727,
   "ts": 227413,
   "observedAt": "2026-09-19T09:29:53.807Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"54   \" Total=\"56   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7755,
   "ts": 228422,
   "observedAt": "2026-09-19T09:29:54.816Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"55   \" Total=\"57   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7774,
   "ts": 228963,
   "observedAt": "2026-09-19T09:29:55.357Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"55   \" Total=\"57   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7787,
   "ts": 229442,
   "observedAt": "2026-09-19T09:29:55.836Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"56   \" Total=\"58   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7793,
   "ts": 229475,
   "observedAt": "2026-09-19T09:29:55.869Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"56   \" Total=\"58   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7810,
   "ts": 229860,
   "observedAt": "2026-09-19T09:29:56.254Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"56   \" Total=\"58   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7819,
   "ts": 230027,
   "observedAt": "2026-09-19T09:29:56.421Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"56   \" Total=\"58   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7827,
   "ts": 230146,
   "observedAt": "2026-09-19T09:29:56.540Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"56   \" Total=\"58   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7838,
   "ts": 230455,
   "observedAt": "2026-09-19T09:29:56.849Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"57   \" Total=\"59   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7840,
   "ts": 230457,
   "observedAt": "2026-09-19T09:29:56.851Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"57   \" Total=\"59   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7844,
   "ts": 230472,
   "observedAt": "2026-09-19T09:29:56.866Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"57   \" Total=\"59   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7862,
   "ts": 230737,
   "observedAt": "2026-09-19T09:29:57.131Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"57   \" Total=\"59   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7867,
   "ts": 230743,
   "observedAt": "2026-09-19T09:29:57.137Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"57   \" Total=\"59   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7893,
   "ts": 231501,
   "observedAt": "2026-09-19T09:29:57.895Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"58   \" Total=\"60   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7921,
   "ts": 232525,
   "observedAt": "2026-09-19T09:29:58.919Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"59   \" Total=\"61   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7942,
   "ts": 233351,
   "observedAt": "2026-09-19T09:29:59.745Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"60   \" Total=\"62   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7953,
   "ts": 233476,
   "observedAt": "2026-09-19T09:29:59.870Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"60   \" Total=\"62   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7963,
   "ts": 233698,
   "observedAt": "2026-09-19T09:30:00.092Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"60   \" Total=\"62   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 7982,
   "ts": 234372,
   "observedAt": "2026-09-19T09:30:00.766Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"61   \" Total=\"63   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 8014,
   "ts": 235420,
   "observedAt": "2026-09-19T09:30:01.814Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"62   \" Total=\"64   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 8042,
   "ts": 236443,
   "observedAt": "2026-09-19T09:30:02.837Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"63   \" Total=\"65   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 8063,
   "ts": 237257,
   "observedAt": "2026-09-19T09:30:03.651Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"64   \" Total=\"66   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 8091,
   "ts": 238292,
   "observedAt": "2026-09-19T09:30:04.686Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"65   \" Total=\"67   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 8105,
   "ts": 238541,
   "observedAt": "2026-09-19T09:30:04.935Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"65   \" Total=\"67   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 8114,
   "ts": 238647,
   "observedAt": "2026-09-19T09:30:05.041Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"38\" Bib=\"80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" Race=\"K1 muži 2. jízda\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,2,0,0,0,0,0,0,0,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:28:59.600\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"2\" Time=\"65   \" Total=\"67   \" TTBDiff=\"\" TTBName=\"M. KOPEČEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-09-19-2026-nkz-19so",
   "chunk": "006-0926-time-limit.jsonl",
   "line": 8122,
   "ts": 238871,
   "observedAt": "2026-09-19T09:30:05.265Z",
   "data": "<Canoe123 System=\"Main\"><Results RaceId=\"K1M_BR2_19\" ClassId=\"K1M\" Current=\"Y\" MainTitle=\"K1 muži\" SubTitle=\"1st and 2nd Run\"><Row Number=\"31\"><Participant Bib=\"  80\" Id=\"128018.K1M\" Name=\"SEKANINA Matěj\" Club=\"Šumperk\" Nat=\"\" GivenName=\"Matěj\" FamilyName=\"SEKANINA\" StartOrder=\"38\" StartTime=\"11:29:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"2\" Gates=\"\" Time=\"\" Total=\"91.42\" Rank=\"31\" RankOrder=\"31\" Behind=\"+13.80\" PP=\"\" /></Row></Results></Canoe123>"
  }
 ],
 "coldXt8": [
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17553,
   "ts": 940707,
   "observedAt": "2026-04-26T08:44:30.964Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"32   \" Total=\"32   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17567,
   "ts": 941717,
   "observedAt": "2026-04-26T08:44:31.974Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"33   \" Total=\"33   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17575,
   "ts": 942526,
   "observedAt": "2026-04-26T08:44:32.783Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"34   \" Total=\"34   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17587,
   "ts": 942926,
   "observedAt": "2026-04-26T08:44:33.183Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"34   \" Total=\"34   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17594,
   "ts": 943551,
   "observedAt": "2026-04-26T08:44:33.808Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"35   \" Total=\"35   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17609,
   "ts": 944569,
   "observedAt": "2026-04-26T08:44:34.826Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"36   \" Total=\"36   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17624,
   "ts": 945558,
   "observedAt": "2026-04-26T08:44:35.815Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"37   \" Total=\"37   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17625,
   "ts": 945560,
   "observedAt": "2026-04-26T08:44:35.817Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"37   \" Total=\"37   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17644,
   "ts": 946610,
   "observedAt": "2026-04-26T08:44:36.867Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"38   \" Total=\"38   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17659,
   "ts": 947616,
   "observedAt": "2026-04-26T08:44:37.873Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"39   \" Total=\"39   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17673,
   "ts": 948644,
   "observedAt": "2026-04-26T08:44:38.901Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"40   \" Total=\"40   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17687,
   "ts": 949649,
   "observedAt": "2026-04-26T08:44:39.906Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"41   \" Total=\"41   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17701,
   "ts": 950667,
   "observedAt": "2026-04-26T08:44:40.924Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"42   \" Total=\"42   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17719,
   "ts": 951697,
   "observedAt": "2026-04-26T08:44:41.954Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"43   \" Total=\"43   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17727,
   "ts": 952428,
   "observedAt": "2026-04-26T08:44:42.685Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"43   \" Total=\"43   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17737,
   "ts": 952704,
   "observedAt": "2026-04-26T08:44:42.961Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"44   \" Total=\"44   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17751,
   "ts": 953724,
   "observedAt": "2026-04-26T08:44:43.981Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"45   \" Total=\"45   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17759,
   "ts": 954534,
   "observedAt": "2026-04-26T08:44:44.791Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"46   \" Total=\"46   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17774,
   "ts": 955556,
   "observedAt": "2026-04-26T08:44:45.813Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"47   \" Total=\"47   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17788,
   "ts": 956572,
   "observedAt": "2026-04-26T08:44:46.829Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"48   \" Total=\"48   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17801,
   "ts": 957490,
   "observedAt": "2026-04-26T08:44:47.747Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"48   \" Total=\"48   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17805,
   "ts": 957591,
   "observedAt": "2026-04-26T08:44:47.848Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"49   \" Total=\"49   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17821,
   "ts": 958613,
   "observedAt": "2026-04-26T08:44:48.870Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"50   \" Total=\"50   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17840,
   "ts": 959630,
   "observedAt": "2026-04-26T08:44:49.887Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"51   \" Total=\"51   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17886,
   "ts": 960636,
   "observedAt": "2026-04-26T08:44:50.893Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"52   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17901,
   "ts": 960856,
   "observedAt": "2026-04-26T08:44:51.113Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"52   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17907,
   "ts": 960872,
   "observedAt": "2026-04-26T08:44:51.129Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"52   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17913,
   "ts": 960876,
   "observedAt": "2026-04-26T08:44:51.133Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"52   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17920,
   "ts": 960940,
   "observedAt": "2026-04-26T08:44:51.197Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"52   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17926,
   "ts": 960944,
   "observedAt": "2026-04-26T08:44:51.201Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"52   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17932,
   "ts": 960948,
   "observedAt": "2026-04-26T08:44:51.205Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"52   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17938,
   "ts": 960952,
   "observedAt": "2026-04-26T08:44:51.209Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"52   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17944,
   "ts": 960955,
   "observedAt": "2026-04-26T08:44:51.212Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"52   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17950,
   "ts": 960959,
   "observedAt": "2026-04-26T08:44:51.216Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"52   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17976,
   "ts": 961738,
   "observedAt": "2026-04-26T08:44:51.995Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"53   \" Total=\"53   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17981,
   "ts": 961864,
   "observedAt": "2026-04-26T08:44:52.121Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"53   \" Total=\"53   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 17998,
   "ts": 962664,
   "observedAt": "2026-04-26T08:44:52.921Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"54   \" Total=\"54   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 18027,
   "ts": 963693,
   "observedAt": "2026-04-26T08:44:53.950Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"55   \" Total=\"55   \" TTBDiff=\"59.85\" TTBName=\"V. PŘINDIŠ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 18052,
   "ts": 964707,
   "observedAt": "2026-04-26T08:44:54.964Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"56   \" Total=\"56   \" TTBDiff=\"59.85\" TTBName=\"V. PŘINDIŠ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 18079,
   "ts": 965717,
   "observedAt": "2026-04-26T08:44:55.974Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"57   \" Total=\"57   \" TTBDiff=\"59.85\" TTBName=\"V. PŘINDIŠ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 18097,
   "ts": 966539,
   "observedAt": "2026-04-26T08:44:56.796Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"58   \" Total=\"58   \" TTBDiff=\"59.85\" TTBName=\"V. PŘINDIŠ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 18122,
   "ts": 967559,
   "observedAt": "2026-04-26T08:44:57.816Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"59   \" Total=\"59   \" TTBDiff=\"59.85\" TTBName=\"V. PŘINDIŠ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 18147,
   "ts": 968584,
   "observedAt": "2026-04-26T08:44:58.841Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"60   \" Total=\"60   \" TTBDiff=\"59.85\" TTBName=\"V. PŘINDIŠ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 18175,
   "ts": 969592,
   "observedAt": "2026-04-26T08:44:59.849Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"61   \" Total=\"61   \" TTBDiff=\"59.85\" TTBName=\"V. PŘINDIŠ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 18199,
   "ts": 970518,
   "observedAt": "2026-04-26T08:45:00.775Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"61   \" Total=\"61   \" TTBDiff=\"59.85\" TTBName=\"V. PŘINDIŠ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 18206,
   "ts": 970601,
   "observedAt": "2026-04-26T08:45:00.858Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"62   \" Total=\"62   \" TTBDiff=\"59.85\" TTBName=\"V. PŘINDIŠ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 18207,
   "ts": 970646,
   "observedAt": "2026-04-26T08:45:00.903Z",
   "data": "<Canoe123 System=\"Main\"><Results RaceId=\"MX1_XT_26\" ClassId=\"MX1\" Current=\"Y\" MainTitle=\"Men's Kayak Cross\" SubTitle=\"Time Trial\"><Row Number=\"3\"><Participant Bib=\"   8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" GivenName=\"Vojtěch\" FamilyName=\"HEGER\" StartOrder=\"45\" StartTime=\"10:44:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"0\" Gates=\"  0  0  0  0  0  0  0  0  0                                                               \" Time=\"62.09\" Total=\"62.09\" Rank=\"3\" RankOrder=\"3\" Behind=\"+2.24\" PP=\"\" /></Row></Results></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "008-0828-time-limit.jsonl",
   "line": 18218,
   "ts": 970810,
   "observedAt": "2026-04-26T08:45:01.067Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"45\" Bib=\"8\" Id=\"12019.MX1\" Name=\"HEGER Vojtěch\" Club=\"TJ Dukla\" Nat=\"\" Race=\"MX1 Individual\" RaceId=\"MX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:43:58.597\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"10:45:00.690\" /><Result Type=\"T\" Pen=\"0\" Time=\"62.09\" Total=\"62.09\" TTBDiff=\"+2.24\" TTBName=\"V. PŘINDIŠ\" Rank=\"3\" /></OnCourse></Canoe123>"
  }
 ],
 "b3": [
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 6986,
   "ts": 446262,
   "observedAt": "2026-04-26T07:35:53.373Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7008,
   "ts": 447082,
   "observedAt": "2026-04-26T07:35:54.193Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"Y\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7108,
   "ts": 450766,
   "observedAt": "2026-04-26T07:35:57.877Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7119,
   "ts": 450974,
   "observedAt": "2026-04-26T07:35:58.085Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7128,
   "ts": 451294,
   "observedAt": "2026-04-26T07:35:58.405Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7155,
   "ts": 452365,
   "observedAt": "2026-04-26T07:35:59.476Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"0.00\" Total=\"0   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7175,
   "ts": 453194,
   "observedAt": "2026-04-26T07:36:00.305Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"1   \" Total=\"1   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7194,
   "ts": 454221,
   "observedAt": "2026-04-26T07:36:01.332Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"2   \" Total=\"2   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7211,
   "ts": 455229,
   "observedAt": "2026-04-26T07:36:02.340Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"3   \" Total=\"3   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7226,
   "ts": 456239,
   "observedAt": "2026-04-26T07:36:03.350Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"4   \" Total=\"4   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7228,
   "ts": 456240,
   "observedAt": "2026-04-26T07:36:03.351Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"4   \" Total=\"4   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7250,
   "ts": 457281,
   "observedAt": "2026-04-26T07:36:04.392Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"5   \" Total=\"5   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7264,
   "ts": 458302,
   "observedAt": "2026-04-26T07:36:05.413Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"6   \" Total=\"6   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7279,
   "ts": 459230,
   "observedAt": "2026-04-26T07:36:06.341Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"7   \" Total=\"7   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7280,
   "ts": 459232,
   "observedAt": "2026-04-26T07:36:06.343Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"7   \" Total=\"7   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7289,
   "ts": 459534,
   "observedAt": "2026-04-26T07:36:06.645Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"7   \" Total=\"7   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7305,
   "ts": 460319,
   "observedAt": "2026-04-26T07:36:07.430Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"8   \" Total=\"8   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7322,
   "ts": 461335,
   "observedAt": "2026-04-26T07:36:08.446Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"9   \" Total=\"9   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7337,
   "ts": 462359,
   "observedAt": "2026-04-26T07:36:09.470Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"10   \" Total=\"10   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7351,
   "ts": 463369,
   "observedAt": "2026-04-26T07:36:10.480Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"11   \" Total=\"11   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7364,
   "ts": 464189,
   "observedAt": "2026-04-26T07:36:11.300Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"12   \" Total=\"12   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7378,
   "ts": 465207,
   "observedAt": "2026-04-26T07:36:12.318Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"13   \" Total=\"13   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7393,
   "ts": 466220,
   "observedAt": "2026-04-26T07:36:13.331Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"14   \" Total=\"14   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7407,
   "ts": 467226,
   "observedAt": "2026-04-26T07:36:14.337Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"15   \" Total=\"15   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7421,
   "ts": 468249,
   "observedAt": "2026-04-26T07:36:15.360Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"16   \" Total=\"16   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7434,
   "ts": 469271,
   "observedAt": "2026-04-26T07:36:16.382Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"17   \" Total=\"17   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7449,
   "ts": 470297,
   "observedAt": "2026-04-26T07:36:17.408Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"18   \" Total=\"18   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7467,
   "ts": 471112,
   "observedAt": "2026-04-26T07:36:18.223Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"18   \" Total=\"18   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7473,
   "ts": 471316,
   "observedAt": "2026-04-26T07:36:18.427Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"19   \" Total=\"19   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7492,
   "ts": 472323,
   "observedAt": "2026-04-26T07:36:19.434Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"20   \" Total=\"20   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7530,
   "ts": 473347,
   "observedAt": "2026-04-26T07:36:20.458Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"21   \" Total=\"21   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7538,
   "ts": 473762,
   "observedAt": "2026-04-26T07:36:20.873Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"21   \" Total=\"21   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7549,
   "ts": 474351,
   "observedAt": "2026-04-26T07:36:21.462Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"22   \" Total=\"22   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7565,
   "ts": 475370,
   "observedAt": "2026-04-26T07:36:22.481Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"23   \" Total=\"23   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7579,
   "ts": 476186,
   "observedAt": "2026-04-26T07:36:23.297Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"24   \" Total=\"24   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7583,
   "ts": 476274,
   "observedAt": "2026-04-26T07:36:23.385Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"24   \" Total=\"24   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7598,
   "ts": 477194,
   "observedAt": "2026-04-26T07:36:24.305Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"25   \" Total=\"25   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7613,
   "ts": 478216,
   "observedAt": "2026-04-26T07:36:25.327Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"26   \" Total=\"26   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7628,
   "ts": 479234,
   "observedAt": "2026-04-26T07:36:26.345Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"27   \" Total=\"27   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7642,
   "ts": 480244,
   "observedAt": "2026-04-26T07:36:27.355Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"28   \" Total=\"28   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7656,
   "ts": 481265,
   "observedAt": "2026-04-26T07:36:28.376Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"29   \" Total=\"29   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7670,
   "ts": 482274,
   "observedAt": "2026-04-26T07:36:29.385Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"30   \" Total=\"30   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7684,
   "ts": 483292,
   "observedAt": "2026-04-26T07:36:30.403Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"31   \" Total=\"31   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7690,
   "ts": 483568,
   "observedAt": "2026-04-26T07:36:30.679Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"31   \" Total=\"31   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7704,
   "ts": 484311,
   "observedAt": "2026-04-26T07:36:31.422Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"32   \" Total=\"32   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7719,
   "ts": 485318,
   "observedAt": "2026-04-26T07:36:32.429Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"33   \" Total=\"33   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7733,
   "ts": 486342,
   "observedAt": "2026-04-26T07:36:33.453Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"34   \" Total=\"34   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7750,
   "ts": 487365,
   "observedAt": "2026-04-26T07:36:34.476Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"35   \" Total=\"35   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7763,
   "ts": 488183,
   "observedAt": "2026-04-26T07:36:35.294Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"36   \" Total=\"36   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7778,
   "ts": 489133,
   "observedAt": "2026-04-26T07:36:36.244Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"36   \" Total=\"36   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7781,
   "ts": 489204,
   "observedAt": "2026-04-26T07:36:36.315Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"37   \" Total=\"37   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7796,
   "ts": 490210,
   "observedAt": "2026-04-26T07:36:37.321Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"38   \" Total=\"38   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7813,
   "ts": 491233,
   "observedAt": "2026-04-26T07:36:38.344Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"39   \" Total=\"39   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7831,
   "ts": 492241,
   "observedAt": "2026-04-26T07:36:39.352Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"40   \" Total=\"40   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7836,
   "ts": 492284,
   "observedAt": "2026-04-26T07:36:39.395Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"40   \" Total=\"40   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7854,
   "ts": 493263,
   "observedAt": "2026-04-26T07:36:40.374Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"41   \" Total=\"41   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7871,
   "ts": 494273,
   "observedAt": "2026-04-26T07:36:41.384Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"42   \" Total=\"42   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7885,
   "ts": 495299,
   "observedAt": "2026-04-26T07:36:42.410Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"43   \" Total=\"43   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7900,
   "ts": 496308,
   "observedAt": "2026-04-26T07:36:43.419Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"44   \" Total=\"44   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7914,
   "ts": 497335,
   "observedAt": "2026-04-26T07:36:44.446Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"45   \" Total=\"45   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7928,
   "ts": 498354,
   "observedAt": "2026-04-26T07:36:45.465Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"46   \" Total=\"46   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7942,
   "ts": 499375,
   "observedAt": "2026-04-26T07:36:46.486Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"47   \" Total=\"47   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7955,
   "ts": 500181,
   "observedAt": "2026-04-26T07:36:47.292Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"48   \" Total=\"48   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7969,
   "ts": 501198,
   "observedAt": "2026-04-26T07:36:48.309Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"49   \" Total=\"49   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 7983,
   "ts": 502223,
   "observedAt": "2026-04-26T07:36:49.334Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"50   \" Total=\"50   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8018,
   "ts": 503229,
   "observedAt": "2026-04-26T07:36:50.340Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"51   \" Total=\"51   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8036,
   "ts": 504065,
   "observedAt": "2026-04-26T07:36:51.176Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"51   \" Total=\"51   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8042,
   "ts": 504070,
   "observedAt": "2026-04-26T07:36:51.181Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"51   \" Total=\"51   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8049,
   "ts": 504079,
   "observedAt": "2026-04-26T07:36:51.190Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"51   \" Total=\"51   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8055,
   "ts": 504084,
   "observedAt": "2026-04-26T07:36:51.195Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"51   \" Total=\"51   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8061,
   "ts": 504088,
   "observedAt": "2026-04-26T07:36:51.199Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"51   \" Total=\"51   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8067,
   "ts": 504092,
   "observedAt": "2026-04-26T07:36:51.203Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"51   \" Total=\"51   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8074,
   "ts": 504182,
   "observedAt": "2026-04-26T07:36:51.293Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"52   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8075,
   "ts": 504184,
   "observedAt": "2026-04-26T07:36:51.295Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"52   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8082,
   "ts": 504188,
   "observedAt": "2026-04-26T07:36:51.299Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"52   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8111,
   "ts": 505270,
   "observedAt": "2026-04-26T07:36:52.381Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"53   \" Total=\"53   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8118,
   "ts": 505353,
   "observedAt": "2026-04-26T07:36:52.464Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"53   \" Total=\"53   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8139,
   "ts": 505993,
   "observedAt": "2026-04-26T07:36:53.104Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"53   \" Total=\"53   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8149,
   "ts": 506281,
   "observedAt": "2026-04-26T07:36:53.392Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"54   \" Total=\"54   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8176,
   "ts": 507298,
   "observedAt": "2026-04-26T07:36:54.409Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"55   \" Total=\"55   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8205,
   "ts": 508319,
   "observedAt": "2026-04-26T07:36:55.430Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"56   \" Total=\"56   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8209,
   "ts": 508408,
   "observedAt": "2026-04-26T07:36:55.519Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"56   \" Total=\"56   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8234,
   "ts": 509336,
   "observedAt": "2026-04-26T07:36:56.447Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"57   \" Total=\"57   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8257,
   "ts": 510361,
   "observedAt": "2026-04-26T07:36:57.472Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"58   \" Total=\"58   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8281,
   "ts": 511161,
   "observedAt": "2026-04-26T07:36:58.272Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"58   \" Total=\"58   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8290,
   "ts": 511381,
   "observedAt": "2026-04-26T07:36:58.492Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"59   \" Total=\"59   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8312,
   "ts": 512184,
   "observedAt": "2026-04-26T07:36:59.295Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"60   \" Total=\"60   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8331,
   "ts": 513208,
   "observedAt": "2026-04-26T07:37:00.319Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"61   \" Total=\"61   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8347,
   "ts": 514021,
   "observedAt": "2026-04-26T07:37:01.132Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"61   \" Total=\"61   \" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8353,
   "ts": 514222,
   "observedAt": "2026-04-26T07:37:01.333Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"62   \" Total=\"62   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8371,
   "ts": 515239,
   "observedAt": "2026-04-26T07:37:02.350Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"63   \" Total=\"63   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8387,
   "ts": 516240,
   "observedAt": "2026-04-26T07:37:03.351Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"64   \" Total=\"64   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8404,
   "ts": 517258,
   "observedAt": "2026-04-26T07:37:04.369Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"65   \" Total=\"65   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8419,
   "ts": 518283,
   "observedAt": "2026-04-26T07:37:05.394Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"66   \" Total=\"66   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8433,
   "ts": 519307,
   "observedAt": "2026-04-26T07:37:06.418Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"67   \" Total=\"67   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8439,
   "ts": 519803,
   "observedAt": "2026-04-26T07:37:06.914Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"67   \" Total=\"67   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8453,
   "ts": 520329,
   "observedAt": "2026-04-26T07:37:07.440Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"68   \" Total=\"68   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8469,
   "ts": 521348,
   "observedAt": "2026-04-26T07:37:08.459Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"69   \" Total=\"69   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8484,
   "ts": 522356,
   "observedAt": "2026-04-26T07:37:09.467Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"70   \" Total=\"70   \" TTBDiff=\"66.80\" TTBName=\"T. MICHALOVÁ\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8499,
   "ts": 522988,
   "observedAt": "2026-04-26T07:37:10.099Z",
   "data": "<Canoe123 System=\"Main\"><Results RaceId=\"WX1_XT_26\" ClassId=\"WX1\" Current=\"Y\" MainTitle=\"Women's Kayak Cross\" SubTitle=\"Time Trial\"><Row Number=\"2\"><Participant Bib=\"  19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" GivenName=\"Bára\" FamilyName=\"GALUŠKOVÁ\" StartOrder=\"7\" StartTime=\"9:36:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"0\" Gates=\"  0  0  0  0  0  0  0  0  0                                                               \" Time=\"70.49\" Total=\"70.49\" Rank=\"2\" RankOrder=\"2\" Behind=\"+3.69\" PP=\"\" /></Row></Results></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8502,
   "ts": 523169,
   "observedAt": "2026-04-26T07:37:10.280Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8522,
   "ts": 524193,
   "observedAt": "2026-04-26T07:37:11.304Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8541,
   "ts": 525214,
   "observedAt": "2026-04-26T07:37:12.325Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8556,
   "ts": 526235,
   "observedAt": "2026-04-26T07:37:13.346Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8571,
   "ts": 527241,
   "observedAt": "2026-04-26T07:37:14.352Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8576,
   "ts": 527650,
   "observedAt": "2026-04-26T07:37:14.761Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8592,
   "ts": 528672,
   "observedAt": "2026-04-26T07:37:15.783Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8604,
   "ts": 529191,
   "observedAt": "2026-04-26T07:37:16.302Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8622,
   "ts": 530294,
   "observedAt": "2026-04-26T07:37:17.405Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8638,
   "ts": 531315,
   "observedAt": "2026-04-26T07:37:18.426Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8657,
   "ts": 532322,
   "observedAt": "2026-04-26T07:37:19.433Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8694,
   "ts": 533202,
   "observedAt": "2026-04-26T07:37:20.313Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8713,
   "ts": 534361,
   "observedAt": "2026-04-26T07:37:21.472Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8727,
   "ts": 535388,
   "observedAt": "2026-04-26T07:37:22.499Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8742,
   "ts": 536410,
   "observedAt": "2026-04-26T07:37:23.521Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8756,
   "ts": 537415,
   "observedAt": "2026-04-26T07:37:24.526Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8770,
   "ts": 538435,
   "observedAt": "2026-04-26T07:37:25.546Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8784,
   "ts": 539452,
   "observedAt": "2026-04-26T07:37:26.563Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8798,
   "ts": 540461,
   "observedAt": "2026-04-26T07:37:27.572Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8812,
   "ts": 541482,
   "observedAt": "2026-04-26T07:37:28.593Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8826,
   "ts": 542510,
   "observedAt": "2026-04-26T07:37:29.621Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8840,
   "ts": 543531,
   "observedAt": "2026-04-26T07:37:30.642Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8854,
   "ts": 544505,
   "observedAt": "2026-04-26T07:37:31.616Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8872,
   "ts": 545554,
   "observedAt": "2026-04-26T07:37:32.665Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8886,
   "ts": 546583,
   "observedAt": "2026-04-26T07:37:33.694Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8903,
   "ts": 547585,
   "observedAt": "2026-04-26T07:37:34.696Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8917,
   "ts": 548607,
   "observedAt": "2026-04-26T07:37:35.718Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8932,
   "ts": 549616,
   "observedAt": "2026-04-26T07:37:36.727Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8941,
   "ts": 549906,
   "observedAt": "2026-04-26T07:37:37.017Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8960,
   "ts": 551058,
   "observedAt": "2026-04-26T07:37:38.169Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8974,
   "ts": 552079,
   "observedAt": "2026-04-26T07:37:39.190Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 8983,
   "ts": 552781,
   "observedAt": "2026-04-26T07:37:39.892Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9007,
   "ts": 553918,
   "observedAt": "2026-04-26T07:37:41.029Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9022,
   "ts": 554944,
   "observedAt": "2026-04-26T07:37:42.055Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9036,
   "ts": 555963,
   "observedAt": "2026-04-26T07:37:43.074Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9051,
   "ts": 556988,
   "observedAt": "2026-04-26T07:37:44.099Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9065,
   "ts": 557996,
   "observedAt": "2026-04-26T07:37:45.107Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9079,
   "ts": 559022,
   "observedAt": "2026-04-26T07:37:46.133Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9093,
   "ts": 560029,
   "observedAt": "2026-04-26T07:37:47.140Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9107,
   "ts": 561051,
   "observedAt": "2026-04-26T07:37:48.162Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9121,
   "ts": 562061,
   "observedAt": "2026-04-26T07:37:49.172Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9156,
   "ts": 563083,
   "observedAt": "2026-04-26T07:37:50.194Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9163,
   "ts": 563653,
   "observedAt": "2026-04-26T07:37:50.764Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9177,
   "ts": 563900,
   "observedAt": "2026-04-26T07:37:51.011Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9183,
   "ts": 563908,
   "observedAt": "2026-04-26T07:37:51.019Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9189,
   "ts": 563945,
   "observedAt": "2026-04-26T07:37:51.056Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9195,
   "ts": 563978,
   "observedAt": "2026-04-26T07:37:51.089Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9202,
   "ts": 564006,
   "observedAt": "2026-04-26T07:37:51.117Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9208,
   "ts": 564035,
   "observedAt": "2026-04-26T07:37:51.146Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9215,
   "ts": 564043,
   "observedAt": "2026-04-26T07:37:51.154Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9224,
   "ts": 564193,
   "observedAt": "2026-04-26T07:37:51.304Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9232,
   "ts": 564298,
   "observedAt": "2026-04-26T07:37:51.409Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9261,
   "ts": 565314,
   "observedAt": "2026-04-26T07:37:52.425Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9289,
   "ts": 566330,
   "observedAt": "2026-04-26T07:37:53.441Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9316,
   "ts": 567348,
   "observedAt": "2026-04-26T07:37:54.459Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9347,
   "ts": 568358,
   "observedAt": "2026-04-26T07:37:55.469Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9352,
   "ts": 568520,
   "observedAt": "2026-04-26T07:37:55.631Z",
   "data": "<Canoe123 System=\"Main\"><Results RaceId=\"WX1_XT_26\" ClassId=\"WX1\" Current=\"Y\" MainTitle=\"Women's Kayak Cross\" SubTitle=\"Time Trial\"><Row Number=\"2\"><Participant Bib=\"  19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" GivenName=\"Bára\" FamilyName=\"GALUŠKOVÁ\" StartOrder=\"7\" StartTime=\"9:36:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"0\" Gates=\"  0  0  0  0  0  0  0  0  0                                                               \" Time=\"70.49\" Total=\"70.49\" Rank=\"2\" RankOrder=\"2\" Behind=\"+3.69\" PP=\"\" /></Row></Results></Canoe123>"
  },
  {
   "recording": "2026-04-26-cp3-cross",
   "chunk": "006-0728-manual-split.jsonl",
   "line": 9354,
   "ts": 568565,
   "observedAt": "2026-04-26T07:37:55.676Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"7\" Bib=\"19\" Id=\"42006.WX1\" Name=\"GALUŠKOVÁ Bára\" Club=\"Sušice\" Nat=\"\" Race=\"WX1 Individual\" RaceId=\"WX1_XT_26\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0\" Completed=\"Y\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"9:35:59.069\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"9:37:09.560\" /><Result Type=\"T\" Pen=\"0\" Time=\"70.49\" Total=\"70.49\" TTBDiff=\"+3.69\" TTBName=\"T. MICHALOVÁ\" Rank=\"2\" /></OnCourse></Canoe123>"
  }
 ],
 "gap429": [
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26821,
   "ts": 1170220,
   "observedAt": "2026-04-19T09:14:05.747Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26851,
   "ts": 1170429,
   "observedAt": "2026-04-19T09:14:05.956Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"83\" Bib=\"83\" Id=\"11003.K1M\" Name=\"ZACH Jeroným\" Club=\"Kajak klub Brandýs nad Labem, z. s.\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+26.54\" TTBName=\"A. REZEK\" Rank=\"67\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26856,
   "ts": 1170637,
   "observedAt": "2026-04-19T09:14:06.164Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"46   \" Total=\"50   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26857,
   "ts": 1170638,
   "observedAt": "2026-04-19T09:14:06.165Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"4   \" Total=\"4   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26867,
   "ts": 1171041,
   "observedAt": "2026-04-19T09:14:06.568Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:14:07</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26874,
   "ts": 1171250,
   "observedAt": "2026-04-19T09:14:06.777Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26880,
   "ts": 1171440,
   "observedAt": "2026-04-19T09:14:06.967Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"83\" Bib=\"83\" Id=\"11003.K1M\" Name=\"ZACH Jeroným\" Club=\"Kajak klub Brandýs nad Labem, z. s.\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+26.54\" TTBName=\"A. REZEK\" Rank=\"67\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26885,
   "ts": 1171642,
   "observedAt": "2026-04-19T09:14:07.169Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"47   \" Total=\"51   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26886,
   "ts": 1171643,
   "observedAt": "2026-04-19T09:14:07.170Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"5   \" Total=\"5   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26893,
   "ts": 1171862,
   "observedAt": "2026-04-19T09:14:07.389Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:14:08</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26903,
   "ts": 1172254,
   "observedAt": "2026-04-19T09:14:07.781Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26904,
   "ts": 1172256,
   "observedAt": "2026-04-19T09:14:07.783Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"47   \" Total=\"51   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26905,
   "ts": 1172260,
   "observedAt": "2026-04-19T09:14:07.787Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"5   \" Total=\"5   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26913,
   "ts": 1172464,
   "observedAt": "2026-04-19T09:14:07.991Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"6   \" Total=\"6   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26919,
   "ts": 1172659,
   "observedAt": "2026-04-19T09:14:08.186Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"48   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26924,
   "ts": 1172869,
   "observedAt": "2026-04-19T09:14:08.396Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:14:09</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26929,
   "ts": 1172911,
   "observedAt": "2026-04-19T09:14:08.438Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26930,
   "ts": 1172912,
   "observedAt": "2026-04-19T09:14:08.439Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"48   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26931,
   "ts": 1172914,
   "observedAt": "2026-04-19T09:14:08.441Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"6   \" Total=\"6   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26935,
   "ts": 1172917,
   "observedAt": "2026-04-19T09:14:08.444Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26936,
   "ts": 1172919,
   "observedAt": "2026-04-19T09:14:08.446Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"48   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26937,
   "ts": 1172920,
   "observedAt": "2026-04-19T09:14:08.447Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"6   \" Total=\"6   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26941,
   "ts": 1172924,
   "observedAt": "2026-04-19T09:14:08.451Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26942,
   "ts": 1172925,
   "observedAt": "2026-04-19T09:14:08.452Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"48   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26943,
   "ts": 1172926,
   "observedAt": "2026-04-19T09:14:08.453Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"6   \" Total=\"6   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26947,
   "ts": 1172929,
   "observedAt": "2026-04-19T09:14:08.456Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26948,
   "ts": 1172930,
   "observedAt": "2026-04-19T09:14:08.457Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"48   \" Total=\"52   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26949,
   "ts": 1172931,
   "observedAt": "2026-04-19T09:14:08.458Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"6   \" Total=\"6   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26963,
   "ts": 1173489,
   "observedAt": "2026-04-19T09:14:09.016Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"7   \" Total=\"7   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26968,
   "ts": 1173692,
   "observedAt": "2026-04-19T09:14:09.219Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"49   \" Total=\"53   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26973,
   "ts": 1173905,
   "observedAt": "2026-04-19T09:14:09.432Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:14:10</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26981,
   "ts": 1174105,
   "observedAt": "2026-04-19T09:14:09.632Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26987,
   "ts": 1174314,
   "observedAt": "2026-04-19T09:14:09.841Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"82\" Bib=\"82\" Id=\"9159.K1M\" Name=\"KRÁL Vít\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+82.14\" TTBName=\"A. REZEK\" Rank=\"104\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26992,
   "ts": 1174515,
   "observedAt": "2026-04-19T09:14:10.042Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"8   \" Total=\"8   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 26997,
   "ts": 1174716,
   "observedAt": "2026-04-19T09:14:10.243Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"50   \" Total=\"54   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27003,
   "ts": 1174918,
   "observedAt": "2026-04-19T09:14:10.445Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:14:11</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27007,
   "ts": 1174939,
   "observedAt": "2026-04-19T09:14:10.466Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27008,
   "ts": 1174944,
   "observedAt": "2026-04-19T09:14:10.471Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"50   \" Total=\"54   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27009,
   "ts": 1174948,
   "observedAt": "2026-04-19T09:14:10.475Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"8   \" Total=\"8   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27010,
   "ts": 1174952,
   "observedAt": "2026-04-19T09:14:10.479Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"82\" Bib=\"82\" Id=\"9159.K1M\" Name=\"KRÁL Vít\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+82.14\" TTBName=\"A. REZEK\" Rank=\"104\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27015,
   "ts": 1174960,
   "observedAt": "2026-04-19T09:14:10.487Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27016,
   "ts": 1174962,
   "observedAt": "2026-04-19T09:14:10.489Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"50   \" Total=\"54   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27017,
   "ts": 1174963,
   "observedAt": "2026-04-19T09:14:10.490Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"8   \" Total=\"8   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27018,
   "ts": 1174965,
   "observedAt": "2026-04-19T09:14:10.492Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"82\" Bib=\"82\" Id=\"9159.K1M\" Name=\"KRÁL Vít\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+82.14\" TTBName=\"A. REZEK\" Rank=\"104\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27023,
   "ts": 1174968,
   "observedAt": "2026-04-19T09:14:10.495Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27024,
   "ts": 1174970,
   "observedAt": "2026-04-19T09:14:10.497Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"50   \" Total=\"54   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27026,
   "ts": 1174971,
   "observedAt": "2026-04-19T09:14:10.498Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"8   \" Total=\"8   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27027,
   "ts": 1174973,
   "observedAt": "2026-04-19T09:14:10.500Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"82\" Bib=\"82\" Id=\"9159.K1M\" Name=\"KRÁL Vít\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+82.14\" TTBName=\"A. REZEK\" Rank=\"104\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27029,
   "ts": 1174975,
   "observedAt": "2026-04-19T09:14:10.502Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27030,
   "ts": 1174977,
   "observedAt": "2026-04-19T09:14:10.504Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"50   \" Total=\"54   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27031,
   "ts": 1174979,
   "observedAt": "2026-04-19T09:14:10.506Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"8   \" Total=\"8   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27032,
   "ts": 1174980,
   "observedAt": "2026-04-19T09:14:10.507Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"82\" Bib=\"82\" Id=\"9159.K1M\" Name=\"KRÁL Vít\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+82.14\" TTBName=\"A. REZEK\" Rank=\"104\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27040,
   "ts": 1174984,
   "observedAt": "2026-04-19T09:14:10.511Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27041,
   "ts": 1174985,
   "observedAt": "2026-04-19T09:14:10.512Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"50   \" Total=\"54   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27042,
   "ts": 1174987,
   "observedAt": "2026-04-19T09:14:10.514Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"8   \" Total=\"8   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27043,
   "ts": 1174989,
   "observedAt": "2026-04-19T09:14:10.516Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"82\" Bib=\"82\" Id=\"9159.K1M\" Name=\"KRÁL Vít\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+82.14\" TTBName=\"A. REZEK\" Rank=\"104\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27048,
   "ts": 1174992,
   "observedAt": "2026-04-19T09:14:10.519Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27049,
   "ts": 1174993,
   "observedAt": "2026-04-19T09:14:10.520Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"50   \" Total=\"54   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27050,
   "ts": 1174994,
   "observedAt": "2026-04-19T09:14:10.521Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"8   \" Total=\"8   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27051,
   "ts": 1174995,
   "observedAt": "2026-04-19T09:14:10.522Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"82\" Bib=\"82\" Id=\"9159.K1M\" Name=\"KRÁL Vít\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+82.14\" TTBName=\"A. REZEK\" Rank=\"104\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27065,
   "ts": 1175525,
   "observedAt": "2026-04-19T09:14:11.052Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"51   \" Total=\"55   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27066,
   "ts": 1175530,
   "observedAt": "2026-04-19T09:14:11.057Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"9   \" Total=\"9   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27073,
   "ts": 1175735,
   "observedAt": "2026-04-19T09:14:11.262Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"83\" Bib=\"83\" Id=\"11003.K1M\" Name=\"ZACH Jeroným\" Club=\"Kajak klub Brandýs nad Labem, z. s.\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+26.54\" TTBName=\"A. REZEK\" Rank=\"60\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27078,
   "ts": 1175934,
   "observedAt": "2026-04-19T09:14:11.461Z",
   "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:14:12</TimeOfDay></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27082,
   "ts": 1175953,
   "observedAt": "2026-04-19T09:14:11.480Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27083,
   "ts": 1175956,
   "observedAt": "2026-04-19T09:14:11.483Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"51   \" Total=\"55   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27084,
   "ts": 1175959,
   "observedAt": "2026-04-19T09:14:11.486Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"9   \" Total=\"9   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27085,
   "ts": 1175961,
   "observedAt": "2026-04-19T09:14:11.488Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"82\" Bib=\"82\" Id=\"9159.K1M\" Name=\"KRÁL Vít\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+82.14\" TTBName=\"A. REZEK\" Rank=\"104\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27086,
   "ts": 1175964,
   "observedAt": "2026-04-19T09:14:11.491Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"83\" Bib=\"83\" Id=\"11003.K1M\" Name=\"ZACH Jeroným\" Club=\"Kajak klub Brandýs nad Labem, z. s.\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+26.54\" TTBName=\"A. REZEK\" Rank=\"60\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27092,
   "ts": 1175968,
   "observedAt": "2026-04-19T09:14:11.495Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27094,
   "ts": 1175971,
   "observedAt": "2026-04-19T09:14:11.498Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"51   \" Total=\"55   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27095,
   "ts": 1175974,
   "observedAt": "2026-04-19T09:14:11.501Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"9   \" Total=\"9   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27096,
   "ts": 1175977,
   "observedAt": "2026-04-19T09:14:11.504Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"82\" Bib=\"82\" Id=\"9159.K1M\" Name=\"KRÁL Vít\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+82.14\" TTBName=\"A. REZEK\" Rank=\"104\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27097,
   "ts": 1175979,
   "observedAt": "2026-04-19T09:14:11.506Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"83\" Bib=\"83\" Id=\"11003.K1M\" Name=\"ZACH Jeroným\" Club=\"Kajak klub Brandýs nad Labem, z. s.\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+26.54\" TTBName=\"A. REZEK\" Rank=\"60\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27103,
   "ts": 1176027,
   "observedAt": "2026-04-19T09:14:11.554Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27104,
   "ts": 1176032,
   "observedAt": "2026-04-19T09:14:11.559Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"51   \" Total=\"55   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27106,
   "ts": 1176036,
   "observedAt": "2026-04-19T09:14:11.563Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"9   \" Total=\"9   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27107,
   "ts": 1176040,
   "observedAt": "2026-04-19T09:14:11.567Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"82\" Bib=\"82\" Id=\"9159.K1M\" Name=\"KRÁL Vít\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+82.14\" TTBName=\"A. REZEK\" Rank=\"104\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27108,
   "ts": 1176046,
   "observedAt": "2026-04-19T09:14:11.573Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"83\" Bib=\"83\" Id=\"11003.K1M\" Name=\"ZACH Jeroným\" Club=\"Kajak klub Brandýs nad Labem, z. s.\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+26.54\" TTBName=\"A. REZEK\" Rank=\"60\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27111,
   "ts": 1176054,
   "observedAt": "2026-04-19T09:14:11.581Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"1\"><Participant StartOrder=\"78\" Bib=\"78\" Id=\"23016.K1M\" Name=\"PINKAVA Lukáš\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"11:12:40.490\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"11:14:01.450\" /><Result Type=\"T\" Pen=\"2\" Time=\"80.96\" Total=\"82.96\" TTBDiff=\"+16.11\" TTBName=\"A. REZEK\" Rank=\"39\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27112,
   "ts": 1176060,
   "observedAt": "2026-04-19T09:14:11.587Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"2\"><Participant StartOrder=\"80\" Bib=\"80\" Id=\"9002.K1M\" Name=\"DVORNÍK Jonáš\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"0,0,2,0,0,2,0,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"11:13:20.430\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"4\" Time=\"51   \" Total=\"55   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27113,
   "ts": 1176066,
   "observedAt": "2026-04-19T09:14:11.593Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"81\" Bib=\"81\" Id=\"9176.K1M\" Name=\"VOTAVA Michal\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"11:14:02.350\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"9   \" Total=\"9   \" TTBDiff=\"\" TTBName=\"A. REZEK\" Rank=\"\" /></OnCourse></Canoe123>"
  },
  {
   "recording": "2026-04-19-jarni-ne-do",
   "chunk": "005-0854-time-limit.jsonl",
   "line": 27114,
   "ts": 1176071,
   "observedAt": "2026-04-19T09:14:11.598Z",
   "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"82\" Bib=\"82\" Id=\"9159.K1M\" Name=\"KRÁL Vít\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+82.14\" TTBName=\"A. REZEK\" Rank=\"104\" /></OnCourse></Canoe123>"
  }
 ]
};
