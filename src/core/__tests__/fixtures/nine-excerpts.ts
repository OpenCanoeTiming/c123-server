// Real records for the #258 O1 instances (design-round20 CQ1; P12), cut BY SCRIPT from /workspace/timing/c123-protocol-docs/recordings/.cache.
// Per instance: every TCP record naming the Attempt (and every TimeOfDay tick: other TCP messages keep arriving, DERIVATIONS §4.1) in the 45 s before the first record at which the pre-round-20 core presented an outcome
// no-result its presented status did not carry, to 4 s after; a Results push is cut to the Attempt's row (the other <Row> elements dropped, the kept
// one verbatim); the last XML snapshot read at or before then, reduced to the root, Classes, CourseData, Attributes, the race's Schedule and the
// Attempt's own Participants and Results blocks (changedAfter = observedAt minus the 5 s poll interval, the reader's steady state).
// Expected values are NOT stored here: the tests apply the contract (P12) to what the core presents.
export interface NineStep { readonly kind: 'tcp' | 'xml'; readonly observedAt: string; readonly changedAfter?: string; readonly data: string; readonly chunk: string; readonly line: number }
export interface NineCase { readonly id: string; readonly recording: string; readonly at: string; readonly status: string; readonly steps: readonly NineStep[] }
export const NINE: readonly NineCase[] = [
 {
  "id": "K1M_BR1_19:52",
  "recording": "2026-04-19-jarni-ne-do",
  "at": "2026-04-19T07:04:39.699Z",
  "status": "not-started",
  "steps": [
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:03:55.595Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:03:56</TimeOfDay></Canoe123>",
    "line": 19303,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:03:56.607Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:03:57</TimeOfDay></Canoe123>",
    "line": 19336,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:03:57.423Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:03:58</TimeOfDay></Canoe123>",
    "line": 19365,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:03:58.651Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:03:59</TimeOfDay></Canoe123>",
    "line": 19431,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:03:59.472Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:00</TimeOfDay></Canoe123>",
    "line": 19466,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:03:59.483Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"6\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19470,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:00.490Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:01</TimeOfDay></Canoe123>",
    "line": 19500,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:00.510Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"6\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19505,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:00.527Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"6\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19514,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:00.541Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"6\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19526,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:00.555Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"6\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19537,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:00.565Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"6\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19550,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:00.574Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"6\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19563,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:00.584Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"6\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19570,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:01.511Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:02</TimeOfDay></Canoe123>",
    "line": 19600,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:01.717Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"6\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19614,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:02.410Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19636,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:02.512Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:03</TimeOfDay></Canoe123>",
    "line": 19643,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:02.556Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19652,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:03.531Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:04</TimeOfDay></Canoe123>",
    "line": 19677,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:03.734Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19690,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:04.548Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:05</TimeOfDay></Canoe123>",
    "line": 19731,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:04.751Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19745,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:05.749Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:06</TimeOfDay></Canoe123>",
    "line": 19772,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:05.753Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19779,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:06.579Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:07</TimeOfDay></Canoe123>",
    "line": 19801,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:06.786Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19813,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:07.590Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:08</TimeOfDay></Canoe123>",
    "line": 19833,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:07.797Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19844,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:08.413Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:09</TimeOfDay></Canoe123>",
    "line": 19859,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:08.824Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19876,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:09.445Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:10</TimeOfDay></Canoe123>",
    "line": 19892,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:09.861Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19909,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:10.472Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:11</TimeOfDay></Canoe123>",
    "line": 19924,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:10.881Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19940,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:11.446Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:12</TimeOfDay></Canoe123>",
    "line": 19955,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:11.474Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19964,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:11.908Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 19986,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:12.345Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20003,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:12.511Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:13</TimeOfDay></Canoe123>",
    "line": 20012,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:13.513Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:14</TimeOfDay></Canoe123>",
    "line": 20037,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:13.533Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20044,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:14.542Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:15</TimeOfDay></Canoe123>",
    "line": 20069,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:14.561Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20076,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:15.559Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:16</TimeOfDay></Canoe123>",
    "line": 20103,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:15.580Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20109,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:16.597Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:17</TimeOfDay></Canoe123>",
    "line": 20135,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:16.610Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20142,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:17.419Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:18</TimeOfDay></Canoe123>",
    "line": 20163,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:17.624Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"5\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20174,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:18.572Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:19</TimeOfDay></Canoe123>",
    "line": 20203,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:18.870Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20220,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:19.147Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20233,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:19.454Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:20</TimeOfDay></Canoe123>",
    "line": 20243,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:19.472Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20252,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:19.478Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20260,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:19.519Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20269,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:19.525Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20277,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:19.835Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20291,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:20.444Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:21</TimeOfDay></Canoe123>",
    "line": 20306,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:20.469Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20314,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:21.482Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:22</TimeOfDay></Canoe123>",
    "line": 20340,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:21.490Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20346,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:22.504Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:23</TimeOfDay></Canoe123>",
    "line": 20370,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:22.523Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20376,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:23.521Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:24</TimeOfDay></Canoe123>",
    "line": 20399,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:23.540Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20405,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:24.540Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:25</TimeOfDay></Canoe123>",
    "line": 20429,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:24.555Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20435,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:25.107Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20456,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:25.555Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:26</TimeOfDay></Canoe123>",
    "line": 20469,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:26.153Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20489,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:26.571Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:27</TimeOfDay></Canoe123>",
    "line": 20500,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:26.866Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20515,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:27.142Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20528,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:27.457Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:28</TimeOfDay></Canoe123>",
    "line": 20540,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:27.467Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20547,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:28.602Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:29</TimeOfDay></Canoe123>",
    "line": 20576,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:28.612Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20581,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:29.611Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:30</TimeOfDay></Canoe123>",
    "line": 20605,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:29.630Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"52\" Bib=\"52\" Id=\"24079.K1M\" Name=\"MYŠKA Matěj\" Club=\"SK Vltava Č. Krumlov z.s.\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 20611,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:30.429Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:31</TimeOfDay></Canoe123>",
    "line": 20634,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:31.450Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:32</TimeOfDay></Canoe123>",
    "line": 20686,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:32.475Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:33</TimeOfDay></Canoe123>",
    "line": 20710,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:33.494Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:34</TimeOfDay></Canoe123>",
    "line": 20738,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:34.507Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:35</TimeOfDay></Canoe123>",
    "line": 20788,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:35.530Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:36</TimeOfDay></Canoe123>",
    "line": 20816,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:36.558Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:37</TimeOfDay></Canoe123>",
    "line": 20845,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:37.572Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:38</TimeOfDay></Canoe123>",
    "line": 20876,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:38.416Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:39</TimeOfDay></Canoe123>",
    "line": 20900,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:39.597Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:40</TimeOfDay></Canoe123>",
    "line": 20938,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "xml",
    "observedAt": "2026-04-19T07:04:39.699Z",
    "changedAfter": "2026-04-19T07:04:34.699Z",
    "data": "<?xml version=\"1.0\" standalone=\"yes\"?>\r\n<Canoe123Data xmlns=\"http://siwidata.com/Canoe123/Data.xsd\">\n<Participants>\r\n    <Id>24079.K1M</Id>\r\n    <ClassId>K1M</ClassId>\r\n    <EventBib>52</EventBib>\r\n    <ICFId>24079</ICFId>\r\n    <FamilyName>MYŠKA</FamilyName>\r\n    <GivenName>Matěj</GivenName>\r\n    <Club>SK Vltava Č. Krumlov z.s.</Club>\r\n    <Ranking>  52</Ranking>\r\n    <RankingPoints>52</RankingPoints>\r\n    <Birthdate>2009-01-01T11:00:00+01:00</Birthdate>\r\n    <Year>2009</Year>\r\n    <CatId>DS</CatId>\r\n    <IsTeam>false</IsTeam>\r\n    <Draw>00A000052083850</Draw>\r\n    <_Bib>2</_Bib>\r\n  </Participants>\n<Classes>\r\n    <ClassId>K1M</ClassId>\r\n    <Class>K1M</Class>\r\n    <LongTitle>K1M</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>K1W</ClassId>\r\n    <Class>K1Ž</Class>\r\n    <LongTitle>K1Ž</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1M</ClassId>\r\n    <Class>C1M</Class>\r\n    <LongTitle>C1M</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1W</ClassId>\r\n    <Class>C1Ž</Class>\r\n    <LongTitle>C1Ž</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2X</ClassId>\r\n    <Class>C2 mix</Class>\r\n    <LongTitle>C2 mix</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>PZK</ClassId>\r\n    <Class>PZK</Class>\r\n    <LongTitle>PZK</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>PZK</CatId>\r\n      <ClassId>PZK</ClassId>\r\n      <Category>K1 předžáci</Category>\r\n      <FirstYear>6</FirstYear>\r\n      <LastYear>10</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>NA</ClassId>\r\n    <Class>Not entered/assigned</Class>\r\n    <LongTitle>Not entered or not assigned</LongTitle>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2M</ClassId>\r\n    <Class>C2 muži</Class>\r\n    <LongTitle>C2 muži</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Dorot starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>PZC</ClassId>\r\n    <Class>C1 předžáci</Class>\r\n    <LongTitle>C1 předžáci</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>PZC</CatId>\r\n      <ClassId>PZC</ClassId>\r\n      <Category>C1 předžáci</Category>\r\n      <FirstYear>6</FirstYear>\r\n      <LastYear>10</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2W</ClassId>\r\n    <Class>C2 ženy</Class>\r\n    <LongTitle>C2 ženy</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veterání</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Schedule>\r\n    <RaceId>K1M_BR1_19</RaceId>\r\n    <RaceOrder>19</RaceOrder>\r\n    <StartTime>2026-04-19T08:40:00+02:00</StartTime>\r\n    <Time>08:40:00</Time>\r\n    <ClassId>K1M</ClassId>\r\n    <DisId>BR1</DisId>\r\n    <StartInterval>0:40</StartInterval>\r\n    <JuryNr>1</JuryNr>\r\n    <CourseNr>2</CourseNr>\r\n    <RaceStatus>1</RaceStatus>\r\n    <WorldRankingEvent>false</WorldRankingEvent>\r\n  </Schedule>\n<Results>\r\n    <RaceId>K1M_BR1_19</RaceId>\r\n    <Id>24079.K1M</Id>\r\n    <StartOrder>52</StartOrder>\r\n    <Bib>  52</Bib>\r\n    <StartTime>9:14:00</StartTime>\r\n    <Status>DNS</Status>\r\n    <Gates xml:space=\"preserve\">                                                                                          </Gates>\r\n    <Pen>0</Pen>\r\n    <RnkOrder>49</RnkOrder>\r\n    <CatId>DS</CatId>\r\n    <ExtraStartInt>0</ExtraStartInt>\r\n    <CheckListPrintIndex>0</CheckListPrintIndex>\r\n    <CheckListPrinted>false</CheckListPrinted>\r\n    <CheckListCorrected>false</CheckListCorrected>\r\n    <Tag />\r\n    <Selected>false</Selected>\r\n    <IsRanked>false</IsRanked>\r\n    <RecordType />\r\n    <BetterRunNr>0</BetterRunNr>\r\n    <HeatNr>0</HeatNr>\r\n    <HasWildcard>false</HasWildcard>\r\n    <LastCleanGate>0</LastCleanGate>\r\n    <NrFLT>0</NrFLT>\r\n    <FLT />\r\n  </Results>\n<CourseData>\r\n    <CourseNr>1</CourseNr>\r\n    <CourseConfig>NNRRSNNNRSNRNSNNNSNRNSNRS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>2</CourseNr>\r\n    <CourseConfig>NRRSNNRSNNRSNNNSRNSRNNNS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>3</CourseNr>\r\n    <CourseConfig />\r\n  </CourseData>\n</Canoe123Data>",
    "line": 20948,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:40.423Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:41</TimeOfDay></Canoe123>",
    "line": 20964,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:41.434Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:42</TimeOfDay></Canoe123>",
    "line": 21047,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:42.477Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:43</TimeOfDay></Canoe123>",
    "line": 21089,
    "chunk": "001-0654-setup.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:04:43.482Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:04:44</TimeOfDay></Canoe123>",
    "line": 21119,
    "chunk": "001-0654-setup.jsonl"
   }
  ]
 },
 {
  "id": "K1M_BR1_19:110",
  "recording": "2026-04-19-jarni-ne-do",
  "at": "2026-04-19T07:41:27.517Z",
  "status": "not-started",
  "steps": [
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:42.552Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:40:43</TimeOfDay></Canoe123>",
    "line": 36694,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:42.965Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 36709,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:43.567Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:40:44</TimeOfDay></Canoe123>",
    "line": 36728,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:43.981Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 36742,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:44.577Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:40:45</TimeOfDay></Canoe123>",
    "line": 36761,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:44.992Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 36776,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:45.592Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:40:46</TimeOfDay></Canoe123>",
    "line": 36795,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:46.001Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 36810,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:46.322Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 36827,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:46.404Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:40:47</TimeOfDay></Canoe123>",
    "line": 36838,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:47.430Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:40:48</TimeOfDay></Canoe123>",
    "line": 36865,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:47.446Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 36871,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:48.091Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 36896,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:48.439Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:40:49</TimeOfDay></Canoe123>",
    "line": 36911,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:48.588Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 36923,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:49.450Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:40:50</TimeOfDay></Canoe123>",
    "line": 36951,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:49.656Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 36960,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:50.473Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:40:51</TimeOfDay></Canoe123>",
    "line": 36985,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:50.676Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 36994,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:51.484Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:40:52</TimeOfDay></Canoe123>",
    "line": 37018,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:51.690Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37028,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:52.416Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:40:53</TimeOfDay></Canoe123>",
    "line": 37051,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:52.574Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37063,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:53.516Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:40:54</TimeOfDay></Canoe123>",
    "line": 37093,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:53.723Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37103,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:54.541Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:40:55</TimeOfDay></Canoe123>",
    "line": 37127,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:54.733Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37137,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:54.951Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37151,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:55.405Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:40:56</TimeOfDay></Canoe123>",
    "line": 37170,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:55.414Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37177,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:56.594Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:40:57</TimeOfDay></Canoe123>",
    "line": 37215,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:56.611Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37220,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:57.416Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:40:58</TimeOfDay></Canoe123>",
    "line": 37246,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:57.630Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37255,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:58.440Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:40:59</TimeOfDay></Canoe123>",
    "line": 37288,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:58.645Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37295,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:59.460Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:00</TimeOfDay></Canoe123>",
    "line": 37323,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:40:59.664Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37330,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:00.479Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:01</TimeOfDay></Canoe123>",
    "line": 37356,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:00.687Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37364,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:01.521Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:02</TimeOfDay></Canoe123>",
    "line": 37391,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:01.725Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37399,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:02.543Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:03</TimeOfDay></Canoe123>",
    "line": 37424,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:02.746Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37433,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:03.558Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:04</TimeOfDay></Canoe123>",
    "line": 37458,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:03.761Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37467,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:04.573Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:05</TimeOfDay></Canoe123>",
    "line": 37515,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:04.765Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37523,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:05.582Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:06</TimeOfDay></Canoe123>",
    "line": 37549,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:05.793Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37557,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:06.401Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:07</TimeOfDay></Canoe123>",
    "line": 37576,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:06.806Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37591,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:07.433Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:08</TimeOfDay></Canoe123>",
    "line": 37611,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:07.828Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37625,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:08.448Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:09</TimeOfDay></Canoe123>",
    "line": 37645,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:08.844Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37658,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:08.892Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37669,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:09.116Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37687,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:09.333Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37702,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:09.395Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37715,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:09.454Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:10</TimeOfDay></Canoe123>",
    "line": 37726,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:10.470Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:11</TimeOfDay></Canoe123>",
    "line": 37754,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:10.476Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"7\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37759,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:10.494Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"7\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37771,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:10.505Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"7\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37786,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:10.518Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"7\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37800,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:10.530Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"7\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37814,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:10.541Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"7\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37828,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:10.552Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"7\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37842,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:10.879Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"7\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37860,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:11.498Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:12</TimeOfDay></Canoe123>",
    "line": 37878,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:11.899Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"7\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37897,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:11.937Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"7\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37904,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:12.470Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:13</TimeOfDay></Canoe123>",
    "line": 37927,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:12.486Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"7\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37935,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:13.104Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"7\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 37962,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:13.532Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:14</TimeOfDay></Canoe123>",
    "line": 37982,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:14.147Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"7\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 38000,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:14.550Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:15</TimeOfDay></Canoe123>",
    "line": 38019,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:15.171Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"7\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 38037,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:15.577Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:16</TimeOfDay></Canoe123>",
    "line": 38054,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:15.690Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"7\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 38063,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:16.404Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:17</TimeOfDay></Canoe123>",
    "line": 38090,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:16.821Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"7\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 38104,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:17.434Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:18</TimeOfDay></Canoe123>",
    "line": 38126,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:18.067Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"7\" Position=\"4\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 38145,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:18.256Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"3\"><Participant StartOrder=\"110\" Bib=\"110\" Id=\"90037.K1M\" Name=\"BERAN Tomáš\" Club=\"Wild Water Canoe Club FROL\" Nat=\"\" Race=\"K1M 1st Run\" RaceId=\"K1M_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 38165,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:18.454Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:19</TimeOfDay></Canoe123>",
    "line": 38178,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:19.477Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:20</TimeOfDay></Canoe123>",
    "line": 38215,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:20.485Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:21</TimeOfDay></Canoe123>",
    "line": 38312,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:21.520Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:22</TimeOfDay></Canoe123>",
    "line": 38344,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:22.534Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:23</TimeOfDay></Canoe123>",
    "line": 38378,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:23.552Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:24</TimeOfDay></Canoe123>",
    "line": 38410,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:24.595Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:25</TimeOfDay></Canoe123>",
    "line": 38442,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:25.413Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:26</TimeOfDay></Canoe123>",
    "line": 38466,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:26.404Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:27</TimeOfDay></Canoe123>",
    "line": 38507,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:27.450Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:28</TimeOfDay></Canoe123>",
    "line": 38555,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "xml",
    "observedAt": "2026-04-19T07:41:27.517Z",
    "changedAfter": "2026-04-19T07:41:22.517Z",
    "data": "<?xml version=\"1.0\" standalone=\"yes\"?>\r\n<Canoe123Data xmlns=\"http://siwidata.com/Canoe123/Data.xsd\">\n<Participants>\r\n    <Id>90037.K1M</Id>\r\n    <ClassId>K1M</ClassId>\r\n    <EventBib>110</EventBib>\r\n    <ICFId>90037</ICFId>\r\n    <FamilyName>BERAN</FamilyName>\r\n    <GivenName>Tomáš</GivenName>\r\n    <Club>Wild Water Canoe Club FROL</Club>\r\n    <Ranking> 110</Ranking>\r\n    <RankingPoints>110</RankingPoints>\r\n    <Birthdate>1979-01-01T11:00:00+01:00</Birthdate>\r\n    <Year>1979</Year>\r\n    <CatId>V</CatId>\r\n    <IsTeam>false</IsTeam>\r\n    <Draw>00A000110087718</Draw>\r\n    <_Bib>3</_Bib>\r\n  </Participants>\n<Classes>\r\n    <ClassId>K1M</ClassId>\r\n    <Class>K1M</Class>\r\n    <LongTitle>K1M</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>K1W</ClassId>\r\n    <Class>K1Ž</Class>\r\n    <LongTitle>K1Ž</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1M</ClassId>\r\n    <Class>C1M</Class>\r\n    <LongTitle>C1M</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1W</ClassId>\r\n    <Class>C1Ž</Class>\r\n    <LongTitle>C1Ž</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2X</ClassId>\r\n    <Class>C2 mix</Class>\r\n    <LongTitle>C2 mix</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>PZK</ClassId>\r\n    <Class>PZK</Class>\r\n    <LongTitle>PZK</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>PZK</CatId>\r\n      <ClassId>PZK</ClassId>\r\n      <Category>K1 předžáci</Category>\r\n      <FirstYear>6</FirstYear>\r\n      <LastYear>10</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>NA</ClassId>\r\n    <Class>Not entered/assigned</Class>\r\n    <LongTitle>Not entered or not assigned</LongTitle>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2M</ClassId>\r\n    <Class>C2 muži</Class>\r\n    <LongTitle>C2 muži</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Dorot starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>PZC</ClassId>\r\n    <Class>C1 předžáci</Class>\r\n    <LongTitle>C1 předžáci</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>PZC</CatId>\r\n      <ClassId>PZC</ClassId>\r\n      <Category>C1 předžáci</Category>\r\n      <FirstYear>6</FirstYear>\r\n      <LastYear>10</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2W</ClassId>\r\n    <Class>C2 ženy</Class>\r\n    <LongTitle>C2 ženy</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veterání</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Schedule>\r\n    <RaceId>K1M_BR1_19</RaceId>\r\n    <RaceOrder>19</RaceOrder>\r\n    <StartTime>2026-04-19T08:40:00+02:00</StartTime>\r\n    <Time>08:40:00</Time>\r\n    <ClassId>K1M</ClassId>\r\n    <DisId>BR1</DisId>\r\n    <StartInterval>0:40</StartInterval>\r\n    <JuryNr>1</JuryNr>\r\n    <CourseNr>2</CourseNr>\r\n    <RaceStatus>1</RaceStatus>\r\n    <WorldRankingEvent>false</WorldRankingEvent>\r\n  </Schedule>\n<Results>\r\n    <RaceId>K1M_BR1_19</RaceId>\r\n    <Id>90037.K1M</Id>\r\n    <StartOrder>110</StartOrder>\r\n    <Bib> 110</Bib>\r\n    <StartTime>9:52:40</StartTime>\r\n    <Status>DNS</Status>\r\n    <Gates xml:space=\"preserve\">                                                                                          </Gates>\r\n    <Pen>0</Pen>\r\n    <RnkOrder>108</RnkOrder>\r\n    <CatId>V</CatId>\r\n    <ExtraStartInt>0</ExtraStartInt>\r\n    <CheckListPrintIndex>0</CheckListPrintIndex>\r\n    <CheckListPrinted>false</CheckListPrinted>\r\n    <CheckListCorrected>false</CheckListCorrected>\r\n    <Tag />\r\n    <Selected>false</Selected>\r\n    <IsRanked>false</IsRanked>\r\n    <RecordType />\r\n    <BetterRunNr>0</BetterRunNr>\r\n    <HeatNr>0</HeatNr>\r\n    <HasWildcard>false</HasWildcard>\r\n    <LastCleanGate>0</LastCleanGate>\r\n    <NrFLT>0</NrFLT>\r\n    <FLT />\r\n  </Results>\n<CourseData>\r\n    <CourseNr>1</CourseNr>\r\n    <CourseConfig>NNRRSNNNRSNRNSNNNSNRNSNRS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>2</CourseNr>\r\n    <CourseConfig>NRRSNNRSNNRSNNNSRNSRNNNS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>3</CourseNr>\r\n    <CourseConfig />\r\n  </CourseData>\n</Canoe123Data>",
    "line": 38562,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:28.481Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:29</TimeOfDay></Canoe123>",
    "line": 38588,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:29.516Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:30</TimeOfDay></Canoe123>",
    "line": 38620,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:41:30.549Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>09:41:31</TimeOfDay></Canoe123>",
    "line": 38655,
    "chunk": "002-0724-time-limit.jsonl"
   }
  ]
 },
 {
  "id": "C1W_BR1_19:2",
  "recording": "2026-04-19-jarni-ne-do",
  "at": "2026-04-19T08:01:19.001Z",
  "status": "not-started",
  "steps": [
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:49:27.843Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"C1W_BR1_19\" ClassId=\"C1W\" Current=\"N\" MainTitle=\"C1Ž\" SubTitle=\"1st Run - Start List\"><Row Number=\"2\"><Participant Bib=\"   2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" GivenName=\"Emílie\" FamilyName=\"LINHARTOVÁ\" StartOrder=\"2\" StartTime=\"10:16:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"\" Gates=\"\" Time=\"\" Total=\"\" Rank=\"\" RankOrder=\"\" Behind=\"\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 57076,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:59:30.162Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"C1W_BR1_19\" ClassId=\"C1W\" Current=\"N\" MainTitle=\"C1Ž\" SubTitle=\"1st Run - Start List\"><Row Number=\"2\"><Participant Bib=\"   2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" GivenName=\"Emílie\" FamilyName=\"LINHARTOVÁ\" StartOrder=\"2\" StartTime=\"10:16:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"\" Gates=\"\" Time=\"\" Total=\"\" Rank=\"\" RankOrder=\"\" Behind=\"\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 11275,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:34.491Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:35</TimeOfDay></Canoe123>",
    "line": 13064,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:35.530Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:36</TimeOfDay></Canoe123>",
    "line": 13113,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:36.659Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:37</TimeOfDay></Canoe123>",
    "line": 13146,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:37.597Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:38</TimeOfDay></Canoe123>",
    "line": 13172,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:38.425Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:39</TimeOfDay></Canoe123>",
    "line": 13195,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:39.452Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:40</TimeOfDay></Canoe123>",
    "line": 13221,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:40.473Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:41</TimeOfDay></Canoe123>",
    "line": 13247,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:41.490Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:42</TimeOfDay></Canoe123>",
    "line": 13275,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:42.521Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:43</TimeOfDay></Canoe123>",
    "line": 13302,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:43.554Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:44</TimeOfDay></Canoe123>",
    "line": 13328,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:44.560Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:45</TimeOfDay></Canoe123>",
    "line": 13355,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:45.415Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:46</TimeOfDay></Canoe123>",
    "line": 13379,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:46.410Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:47</TimeOfDay></Canoe123>",
    "line": 13416,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:47.692Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:48</TimeOfDay></Canoe123>",
    "line": 13452,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:48.460Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:49</TimeOfDay></Canoe123>",
    "line": 13474,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:49.918Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:50</TimeOfDay></Canoe123>",
    "line": 13509,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:50.484Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:51</TimeOfDay></Canoe123>",
    "line": 13530,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:51.503Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:52</TimeOfDay></Canoe123>",
    "line": 13564,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:52.553Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:53</TimeOfDay></Canoe123>",
    "line": 13588,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:53.569Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:54</TimeOfDay></Canoe123>",
    "line": 13612,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:54.580Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:55</TimeOfDay></Canoe123>",
    "line": 13636,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:55.594Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:56</TimeOfDay></Canoe123>",
    "line": 13671,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:56.409Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:57</TimeOfDay></Canoe123>",
    "line": 13691,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:57.631Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:58</TimeOfDay></Canoe123>",
    "line": 13719,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:58.445Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:00:59</TimeOfDay></Canoe123>",
    "line": 13739,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:00:59.465Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:00</TimeOfDay></Canoe123>",
    "line": 13763,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:00.467Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:01</TimeOfDay></Canoe123>",
    "line": 13790,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:01.483Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:02</TimeOfDay></Canoe123>",
    "line": 13815,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:02.498Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:03</TimeOfDay></Canoe123>",
    "line": 13839,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:03.515Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:04</TimeOfDay></Canoe123>",
    "line": 13866,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:04.536Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:05</TimeOfDay></Canoe123>",
    "line": 13890,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:05.545Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:06</TimeOfDay></Canoe123>",
    "line": 13937,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:06.575Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:07</TimeOfDay></Canoe123>",
    "line": 13962,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:07.192Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 13976,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:07.405Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:08</TimeOfDay></Canoe123>",
    "line": 13983,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:07.437Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 13988,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:07.441Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 13991,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:07.446Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 13993,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:07.457Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 14001,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:07.459Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 14004,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:07.462Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 14009,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:08.416Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:09</TimeOfDay></Canoe123>",
    "line": 14030,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:08.440Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 14036,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:08.448Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 14042,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:08.453Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 14048,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:08.459Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 14052,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:08.465Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 14056,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:08.471Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 14066,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:09.431Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:10</TimeOfDay></Canoe123>",
    "line": 14088,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:09.624Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 14098,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:10.439Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:11</TimeOfDay></Canoe123>",
    "line": 14116,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:10.649Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 14126,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:11.454Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:12</TimeOfDay></Canoe123>",
    "line": 14144,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:11.658Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"2\"><Participant StartOrder=\"2\" Bib=\"2\" Id=\"9119.C1W\" Name=\"LINHARTOVÁ Emílie\" Club=\"Univerzitní sportovní klub Praha\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 14153,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:12.476Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:13</TimeOfDay></Canoe123>",
    "line": 14176,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:13.488Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:14</TimeOfDay></Canoe123>",
    "line": 14202,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:14.510Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:15</TimeOfDay></Canoe123>",
    "line": 14227,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:15.540Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:16</TimeOfDay></Canoe123>",
    "line": 14253,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:16.572Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:17</TimeOfDay></Canoe123>",
    "line": 14279,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:17.397Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:18</TimeOfDay></Canoe123>",
    "line": 14298,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:18.411Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:19</TimeOfDay></Canoe123>",
    "line": 14324,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "xml",
    "observedAt": "2026-04-19T08:01:19.001Z",
    "changedAfter": "2026-04-19T08:01:14.001Z",
    "data": "<?xml version=\"1.0\" standalone=\"yes\"?>\r\n<Canoe123Data xmlns=\"http://siwidata.com/Canoe123/Data.xsd\">\n<Participants>\r\n    <Id>9119.C1W</Id>\r\n    <ClassId>C1W</ClassId>\r\n    <EventBib>2</EventBib>\r\n    <ICFId>9119</ICFId>\r\n    <FamilyName>LINHARTOVÁ</FamilyName>\r\n    <GivenName>Emílie</GivenName>\r\n    <Club>Univerzitní sportovní klub Praha</Club>\r\n    <Ranking>   2</Ranking>\r\n    <RankingPoints>2</RankingPoints>\r\n    <Birthdate>2009-01-01T11:00:00+01:00</Birthdate>\r\n    <Year>2009</Year>\r\n    <CatId>DS</CatId>\r\n    <IsTeam>false</IsTeam>\r\n    <Draw>00A000002036979</Draw>\r\n    <_Bib>2+</_Bib>\r\n  </Participants>\n<Classes>\r\n    <ClassId>K1M</ClassId>\r\n    <Class>K1M</Class>\r\n    <LongTitle>K1M</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>K1W</ClassId>\r\n    <Class>K1Ž</Class>\r\n    <LongTitle>K1Ž</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1M</ClassId>\r\n    <Class>C1M</Class>\r\n    <LongTitle>C1M</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1W</ClassId>\r\n    <Class>C1Ž</Class>\r\n    <LongTitle>C1Ž</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2X</ClassId>\r\n    <Class>C2 mix</Class>\r\n    <LongTitle>C2 mix</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>PZK</ClassId>\r\n    <Class>PZK</Class>\r\n    <LongTitle>PZK</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>PZK</CatId>\r\n      <ClassId>PZK</ClassId>\r\n      <Category>K1 předžáci</Category>\r\n      <FirstYear>6</FirstYear>\r\n      <LastYear>10</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>NA</ClassId>\r\n    <Class>Not entered/assigned</Class>\r\n    <LongTitle>Not entered or not assigned</LongTitle>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2M</ClassId>\r\n    <Class>C2 muži</Class>\r\n    <LongTitle>C2 muži</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Dorot starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>PZC</ClassId>\r\n    <Class>C1 předžáci</Class>\r\n    <LongTitle>C1 předžáci</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>PZC</CatId>\r\n      <ClassId>PZC</ClassId>\r\n      <Category>C1 předžáci</Category>\r\n      <FirstYear>6</FirstYear>\r\n      <LastYear>10</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2W</ClassId>\r\n    <Class>C2 ženy</Class>\r\n    <LongTitle>C2 ženy</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veterání</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Schedule>\r\n    <RaceId>C1W_BR1_19</RaceId>\r\n    <RaceOrder>20</RaceOrder>\r\n    <StartTime>2026-04-19T10:15:20+02:00</StartTime>\r\n    <Time>+0:02:00</Time>\r\n    <ClassId>C1W</ClassId>\r\n    <DisId>BR1</DisId>\r\n    <StartInterval>0:40</StartInterval>\r\n    <JuryNr>1</JuryNr>\r\n    <CourseNr>2</CourseNr>\r\n    <RaceStatus>3</RaceStatus>\r\n    <WorldRankingEvent>false</WorldRankingEvent>\r\n  </Schedule>\n<Results>\r\n    <RaceId>C1W_BR1_19</RaceId>\r\n    <Id>9119.C1W</Id>\r\n    <StartOrder>2</StartOrder>\r\n    <Bib>   2</Bib>\r\n    <StartTime>10:16:00</StartTime>\r\n    <Status>DNS</Status>\r\n    <Gates xml:space=\"preserve\">                                                                                          </Gates>\r\n    <Pen>0</Pen>\r\n    <RnkOrder>1</RnkOrder>\r\n    <CatId>DS</CatId>\r\n    <ExtraStartInt>0</ExtraStartInt>\r\n    <CheckListPrintIndex>0</CheckListPrintIndex>\r\n    <CheckListPrinted>false</CheckListPrinted>\r\n    <CheckListCorrected>false</CheckListCorrected>\r\n    <Tag />\r\n    <Selected>false</Selected>\r\n    <IsRanked>false</IsRanked>\r\n    <RecordType />\r\n    <BetterRunNr>0</BetterRunNr>\r\n    <HeatNr>0</HeatNr>\r\n    <HasWildcard>false</HasWildcard>\r\n    <LastCleanGate>0</LastCleanGate>\r\n    <NrFLT>0</NrFLT>\r\n    <FLT />\r\n  </Results>\n<CourseData>\r\n    <CourseNr>1</CourseNr>\r\n    <CourseConfig>NNRRSNNNRSNRNSNNNSNRNSNRS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>2</CourseNr>\r\n    <CourseConfig>NRRSNNRSNNRSNNNSRNSRNNNS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>3</CourseNr>\r\n    <CourseConfig />\r\n  </CourseData>\n</Canoe123Data>",
    "line": 14348,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:19.439Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:20</TimeOfDay></Canoe123>",
    "line": 14357,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:20.475Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:21</TimeOfDay></Canoe123>",
    "line": 14385,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:21.499Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:22</TimeOfDay></Canoe123>",
    "line": 14411,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:01:22.515Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:01:23</TimeOfDay></Canoe123>",
    "line": 14437,
    "chunk": "003-0754-time-limit.jsonl"
   }
  ]
 },
 {
  "id": "C1W_BR1_19:12",
  "recording": "2026-04-19-jarni-ne-do",
  "at": "2026-04-19T08:06:31.973Z",
  "status": "not-started",
  "steps": [
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:49:27.843Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"C1W_BR1_19\" ClassId=\"C1W\" Current=\"N\" MainTitle=\"C1Ž\" SubTitle=\"1st Run - Start List\"><Row Number=\"12\"><Participant Bib=\"  12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" GivenName=\"Rozárie\" FamilyName=\"ŠVEHLOVÁ\" StartOrder=\"12\" StartTime=\"10:22:40\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"\" Gates=\"\" Time=\"\" Total=\"\" Rank=\"\" RankOrder=\"\" Behind=\"\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 57076,
    "chunk": "002-0724-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T07:59:30.162Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"C1W_BR1_19\" ClassId=\"C1W\" Current=\"N\" MainTitle=\"C1Ž\" SubTitle=\"1st Run - Start List\"><Row Number=\"12\"><Participant Bib=\"  12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" GivenName=\"Rozárie\" FamilyName=\"ŠVEHLOVÁ\" StartOrder=\"12\" StartTime=\"10:22:40\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"\" Gates=\"\" Time=\"\" Total=\"\" Rank=\"\" RankOrder=\"\" Behind=\"\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 11275,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:47.208Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"10\" Position=\"7\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 25780,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:47.398Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:05:48</TimeOfDay></Canoe123>",
    "line": 25802,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:47.421Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"10\" Position=\"7\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 25809,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:47.610Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"10\" Position=\"7\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 25832,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:48.381Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"10\" Position=\"7\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 25870,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:48.424Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:05:49</TimeOfDay></Canoe123>",
    "line": 25885,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:49.577Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:05:50</TimeOfDay></Canoe123>",
    "line": 25921,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:49.591Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"10\" Position=\"7\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 25925,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:50.402Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:05:51</TimeOfDay></Canoe123>",
    "line": 25951,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:50.610Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"10\" Position=\"7\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 25967,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:51.426Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:05:52</TimeOfDay></Canoe123>",
    "line": 25994,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:51.627Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"10\" Position=\"7\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26009,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:52.440Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:05:53</TimeOfDay></Canoe123>",
    "line": 26035,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:52.652Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"10\" Position=\"7\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26052,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:53.465Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:05:54</TimeOfDay></Canoe123>",
    "line": 26081,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:53.678Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26102,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:54.067Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26126,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:54.496Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:05:55</TimeOfDay></Canoe123>",
    "line": 26150,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:55.114Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26169,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:55.524Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:05:56</TimeOfDay></Canoe123>",
    "line": 26190,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:56.142Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26210,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:56.552Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:05:57</TimeOfDay></Canoe123>",
    "line": 26230,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:57.164Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26250,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:57.578Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:05:58</TimeOfDay></Canoe123>",
    "line": 26270,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:58.195Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26290,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:58.397Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:05:59</TimeOfDay></Canoe123>",
    "line": 26306,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:59.222Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26330,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:59.279Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26348,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:05:59.424Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:00</TimeOfDay></Canoe123>",
    "line": 26364,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:00.459Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:01</TimeOfDay></Canoe123>",
    "line": 26390,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:00.463Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26397,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:01.172Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26440,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:01.479Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:02</TimeOfDay></Canoe123>",
    "line": 26460,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:01.801Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26478,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:02.399Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:03</TimeOfDay></Canoe123>",
    "line": 26509,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:02.412Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26516,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:03.365Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26555,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:03.400Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:04</TimeOfDay></Canoe123>",
    "line": 26570,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:03.839Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26589,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:03.875Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26609,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:04.555Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:05</TimeOfDay></Canoe123>",
    "line": 26636,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:04.969Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26675,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:05.578Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:06</TimeOfDay></Canoe123>",
    "line": 26699,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:05.991Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26716,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:06.404Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:07</TimeOfDay></Canoe123>",
    "line": 26735,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:07.024Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26756,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:07.425Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:08</TimeOfDay></Canoe123>",
    "line": 26776,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:08.050Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26797,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:08.461Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:09</TimeOfDay></Canoe123>",
    "line": 26816,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:08.500Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26826,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:09.479Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:10</TimeOfDay></Canoe123>",
    "line": 26862,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:09.676Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26873,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:10.485Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:11</TimeOfDay></Canoe123>",
    "line": 26902,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:10.702Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26913,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:11.064Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26936,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:11.416Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:12</TimeOfDay></Canoe123>",
    "line": 26957,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:11.437Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 26966,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:12.542Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:13</TimeOfDay></Canoe123>",
    "line": 27006,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:12.553Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27012,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:13.560Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:14</TimeOfDay></Canoe123>",
    "line": 27046,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:13.578Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27052,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:14.577Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:15</TimeOfDay></Canoe123>",
    "line": 27085,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:14.581Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27091,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:15.596Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:16</TimeOfDay></Canoe123>",
    "line": 27131,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:15.601Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27139,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:16.407Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:17</TimeOfDay></Canoe123>",
    "line": 27169,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:16.615Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27180,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:17.441Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:18</TimeOfDay></Canoe123>",
    "line": 27209,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:17.647Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27220,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:18.004Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27244,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:18.414Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:19</TimeOfDay></Canoe123>",
    "line": 27266,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:18.432Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27275,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:18.850Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27302,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:19.489Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:20</TimeOfDay></Canoe123>",
    "line": 27330,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:19.907Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27345,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:20.509Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:21</TimeOfDay></Canoe123>",
    "line": 27370,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:20.938Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27385,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:21.541Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:22</TimeOfDay></Canoe123>",
    "line": 27410,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:21.958Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27425,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:22.561Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:23</TimeOfDay></Canoe123>",
    "line": 27450,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:23.000Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27465,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:23.070Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27483,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:23.238Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27506,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:23.458Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:24</TimeOfDay></Canoe123>",
    "line": 27522,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:23.491Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27532,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:23.798Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27556,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:24.408Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:25</TimeOfDay></Canoe123>",
    "line": 27583,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:24.827Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27599,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:25.433Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:26</TimeOfDay></Canoe123>",
    "line": 27623,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:25.862Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27639,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:26.483Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:27</TimeOfDay></Canoe123>",
    "line": 27664,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:26.896Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"6\"><Participant StartOrder=\"12\" Bib=\"12\" Id=\"23015.C1W\" Name=\"ŠVEHLOVÁ Rozárie\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"C1Ž 1st Run\" RaceId=\"C1W_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 27680,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:27.518Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:28</TimeOfDay></Canoe123>",
    "line": 27704,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:28.521Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:29</TimeOfDay></Canoe123>",
    "line": 27745,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "xml",
    "observedAt": "2026-04-19T08:06:29.397Z",
    "changedAfter": "2026-04-19T08:06:24.397Z",
    "data": "<?xml version=\"1.0\" standalone=\"yes\"?>\r\n<Canoe123Data xmlns=\"http://siwidata.com/Canoe123/Data.xsd\">\n<Participants>\r\n    <Id>23015.C1W</Id>\r\n    <ClassId>C1W</ClassId>\r\n    <EventBib>12</EventBib>\r\n    <ICFId>23015</ICFId>\r\n    <FamilyName>ŠVEHLOVÁ</FamilyName>\r\n    <GivenName>Rozárie</GivenName>\r\n    <Club>SK Vodní slalom České Budějovice</Club>\r\n    <Ranking>  12</Ranking>\r\n    <RankingPoints>12</RankingPoints>\r\n    <Birthdate>2008-01-01T11:00:00+01:00</Birthdate>\r\n    <Year>2008</Year>\r\n    <CatId>DS</CatId>\r\n    <IsTeam>false</IsTeam>\r\n    <Draw>00A000012092117</Draw>\r\n    <_Bib>3+</_Bib>\r\n  </Participants>\n<Classes>\r\n    <ClassId>K1M</ClassId>\r\n    <Class>K1M</Class>\r\n    <LongTitle>K1M</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>K1W</ClassId>\r\n    <Class>K1Ž</Class>\r\n    <LongTitle>K1Ž</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1M</ClassId>\r\n    <Class>C1M</Class>\r\n    <LongTitle>C1M</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1W</ClassId>\r\n    <Class>C1Ž</Class>\r\n    <LongTitle>C1Ž</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2X</ClassId>\r\n    <Class>C2 mix</Class>\r\n    <LongTitle>C2 mix</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>PZK</ClassId>\r\n    <Class>PZK</Class>\r\n    <LongTitle>PZK</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>PZK</CatId>\r\n      <ClassId>PZK</ClassId>\r\n      <Category>K1 předžáci</Category>\r\n      <FirstYear>6</FirstYear>\r\n      <LastYear>10</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>NA</ClassId>\r\n    <Class>Not entered/assigned</Class>\r\n    <LongTitle>Not entered or not assigned</LongTitle>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2M</ClassId>\r\n    <Class>C2 muži</Class>\r\n    <LongTitle>C2 muži</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Dorot starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>PZC</ClassId>\r\n    <Class>C1 předžáci</Class>\r\n    <LongTitle>C1 předžáci</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>PZC</CatId>\r\n      <ClassId>PZC</ClassId>\r\n      <Category>C1 předžáci</Category>\r\n      <FirstYear>6</FirstYear>\r\n      <LastYear>10</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2W</ClassId>\r\n    <Class>C2 ženy</Class>\r\n    <LongTitle>C2 ženy</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veterání</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Schedule>\r\n    <RaceId>C1W_BR1_19</RaceId>\r\n    <RaceOrder>20</RaceOrder>\r\n    <StartTime>2026-04-19T10:15:20+02:00</StartTime>\r\n    <Time>+0:02:00</Time>\r\n    <ClassId>C1W</ClassId>\r\n    <DisId>BR1</DisId>\r\n    <StartInterval>0:40</StartInterval>\r\n    <JuryNr>1</JuryNr>\r\n    <CourseNr>2</CourseNr>\r\n    <RaceStatus>3</RaceStatus>\r\n    <WorldRankingEvent>false</WorldRankingEvent>\r\n  </Schedule>\n<Results>\r\n    <RaceId>C1W_BR1_19</RaceId>\r\n    <Id>23015.C1W</Id>\r\n    <StartOrder>12</StartOrder>\r\n    <Bib>  12</Bib>\r\n    <StartTime>10:22:40</StartTime>\r\n    <Status>DNS</Status>\r\n    <Gates xml:space=\"preserve\">                                                                                          </Gates>\r\n    <Pen>0</Pen>\r\n    <RnkOrder>8</RnkOrder>\r\n    <CatId>DS</CatId>\r\n    <ExtraStartInt>0</ExtraStartInt>\r\n    <CheckListPrintIndex>0</CheckListPrintIndex>\r\n    <CheckListPrinted>false</CheckListPrinted>\r\n    <CheckListCorrected>false</CheckListCorrected>\r\n    <Tag />\r\n    <Selected>false</Selected>\r\n    <IsRanked>false</IsRanked>\r\n    <RecordType />\r\n    <BetterRunNr>0</BetterRunNr>\r\n    <HeatNr>0</HeatNr>\r\n    <HasWildcard>false</HasWildcard>\r\n    <LastCleanGate>0</LastCleanGate>\r\n    <NrFLT>0</NrFLT>\r\n    <FLT />\r\n  </Results>\n<CourseData>\r\n    <CourseNr>1</CourseNr>\r\n    <CourseConfig>NNRRSNNNRSNRNSNNNSNRNSNRS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>2</CourseNr>\r\n    <CourseConfig>NRRSNNRSNNRSNNNSRNSRNNNS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>3</CourseNr>\r\n    <CourseConfig />\r\n  </CourseData>\n</Canoe123Data>",
    "line": 27795,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:29.536Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:30</TimeOfDay></Canoe123>",
    "line": 27799,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:30.548Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:31</TimeOfDay></Canoe123>",
    "line": 27837,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:31.561Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:32</TimeOfDay></Canoe123>",
    "line": 27875,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:32.579Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:33</TimeOfDay></Canoe123>",
    "line": 27915,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:33.400Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:34</TimeOfDay></Canoe123>",
    "line": 27948,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:34.435Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:35</TimeOfDay></Canoe123>",
    "line": 27986,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:06:35.452Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:06:36</TimeOfDay></Canoe123>",
    "line": 28063,
    "chunk": "003-0754-time-limit.jsonl"
   }
  ]
 },
 {
  "id": "PZK_BR1_19:204",
  "recording": "2026-04-19-jarni-ne-do",
  "at": "2026-04-19T08:24:00.595Z",
  "status": "on-course",
  "steps": [
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:10:02.314Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"PZK_BR1_19\" ClassId=\"PZK\" Current=\"N\" MainTitle=\"PZK\" SubTitle=\"1st Run - Start List\"><Row Number=\"4\"><Participant Bib=\" 204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" GivenName=\"Vendelín\" FamilyName=\"RUSSWURM\" StartOrder=\"4\" StartTime=\"10:34:40\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"\" Gates=\"\" Time=\"\" Total=\"\" Rank=\"\" RankOrder=\"\" Behind=\"\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 37396,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:20:04.784Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"PZK_BR1_19\" ClassId=\"PZK\" Current=\"N\" MainTitle=\"PZK\" SubTitle=\"1st Run - Start List\"><Row Number=\"4\"><Participant Bib=\" 204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" GivenName=\"Vendelín\" FamilyName=\"RUSSWURM\" StartOrder=\"4\" StartTime=\"10:34:40\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"\" Gates=\"\" Time=\"\" Total=\"\" Rank=\"\" RankOrder=\"\" Behind=\"\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 60699,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:15.976Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"151   \" Total=\"205   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 66875,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:16.595Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:17</TimeOfDay></Canoe123>",
    "line": 66887,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:17.009Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"152   \" Total=\"206   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 66901,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:17.418Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:18</TimeOfDay></Canoe123>",
    "line": 66910,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:17.548Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"152   \" Total=\"206   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 66918,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:17.829Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"153   \" Total=\"207   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 66928,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:18.437Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:19</TimeOfDay></Canoe123>",
    "line": 66940,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:18.843Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"154   \" Total=\"208   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 66953,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:19.456Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:20</TimeOfDay></Canoe123>",
    "line": 66966,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:19.859Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"155   \" Total=\"209   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 66979,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:20.469Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:21</TimeOfDay></Canoe123>",
    "line": 66991,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:20.884Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"156   \" Total=\"210   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67005,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:21.488Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:22</TimeOfDay></Canoe123>",
    "line": 67017,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:21.891Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"157   \" Total=\"211   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67031,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:22.511Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:23</TimeOfDay></Canoe123>",
    "line": 67043,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:22.931Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"158   \" Total=\"212   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67057,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:23.537Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:24</TimeOfDay></Canoe123>",
    "line": 67069,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:23.944Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"159   \" Total=\"213   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67082,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:24.559Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:25</TimeOfDay></Canoe123>",
    "line": 67094,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:24.953Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"160   \" Total=\"214   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67108,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:25.571Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:26</TimeOfDay></Canoe123>",
    "line": 67120,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:25.980Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"161   \" Total=\"215   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67134,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:26.591Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:27</TimeOfDay></Canoe123>",
    "line": 67146,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:27.003Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"162   \" Total=\"216   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67160,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:27.406Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:28</TimeOfDay></Canoe123>",
    "line": 67169,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:27.811Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"163   \" Total=\"217   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67181,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:27.894Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"163   \" Total=\"217   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67186,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:28.322Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"163   \" Total=\"217   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67197,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:28.426Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:29</TimeOfDay></Canoe123>",
    "line": 67203,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:29.030Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"164   \" Total=\"218   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67219,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:29.437Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:30</TimeOfDay></Canoe123>",
    "line": 67228,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:29.849Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"165   \" Total=\"219   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67241,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:30.512Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:31</TimeOfDay></Canoe123>",
    "line": 67258,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:30.708Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"165   \" Total=\"219   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67271,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:30.861Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"166   \" Total=\"220   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67278,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:31.470Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:32</TimeOfDay></Canoe123>",
    "line": 67291,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:31.874Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"167   \" Total=\"221   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67302,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:32.496Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:33</TimeOfDay></Canoe123>",
    "line": 67317,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:32.905Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"168   \" Total=\"222   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67329,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:33.525Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:34</TimeOfDay></Canoe123>",
    "line": 67343,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:33.922Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"169   \" Total=\"223   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67355,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:34.529Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:35</TimeOfDay></Canoe123>",
    "line": 67369,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:34.944Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"170   \" Total=\"224   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67380,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:35.549Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:36</TimeOfDay></Canoe123>",
    "line": 67418,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:35.969Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"171   \" Total=\"225   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67434,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:36.582Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:37</TimeOfDay></Canoe123>",
    "line": 67446,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:36.986Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"172   \" Total=\"226   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67460,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:37.397Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:38</TimeOfDay></Canoe123>",
    "line": 67469,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:37.812Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"173   \" Total=\"227   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67480,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:38.425Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:39</TimeOfDay></Canoe123>",
    "line": 67495,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:38.829Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"2\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"174   \" Total=\"228   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67506,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:39.460Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:40</TimeOfDay></Canoe123>",
    "line": 67521,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:39.866Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"175   \" Total=\"229   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67534,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:40.478Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:41</TimeOfDay></Canoe123>",
    "line": 67549,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:40.498Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"175   \" Total=\"229   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67553,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:40.508Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"175   \" Total=\"229   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67558,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:40.517Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"175   \" Total=\"229   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67565,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:40.526Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"175   \" Total=\"229   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67570,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:40.533Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"175   \" Total=\"229   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67577,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:40.537Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"175   \" Total=\"229   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67584,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:40.885Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"176   \" Total=\"230   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67596,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:41.485Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:42</TimeOfDay></Canoe123>",
    "line": 67609,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:41.894Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"177   \" Total=\"231   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67623,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:42.502Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:43</TimeOfDay></Canoe123>",
    "line": 67636,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:42.916Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"178   \" Total=\"232   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67652,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:43.526Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:44</TimeOfDay></Canoe123>",
    "line": 67665,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:43.926Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"179   \" Total=\"233   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67680,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:44.532Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:45</TimeOfDay></Canoe123>",
    "line": 67693,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:44.951Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"180   \" Total=\"234   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67709,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:45.580Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:46</TimeOfDay></Canoe123>",
    "line": 67721,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:45.992Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"181   \" Total=\"235   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67736,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:46.395Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:47</TimeOfDay></Canoe123>",
    "line": 67745,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:47.017Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"182   \" Total=\"236   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67765,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:47.433Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:48</TimeOfDay></Canoe123>",
    "line": 67773,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:47.838Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"183   \" Total=\"237   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67784,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:48.438Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:49</TimeOfDay></Canoe123>",
    "line": 67801,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:48.847Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"184   \" Total=\"238   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67814,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:49.458Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:50</TimeOfDay></Canoe123>",
    "line": 67831,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:49.483Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"184   \" Total=\"238   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67837,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:49.501Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"184   \" Total=\"238   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67842,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:49.509Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"184   \" Total=\"238   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67854,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:49.517Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"184   \" Total=\"238   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67862,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:49.525Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"184   \" Total=\"238   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67870,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:49.532Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"184   \" Total=\"238   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67878,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:49.862Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"185   \" Total=\"239   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67892,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:50.472Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:51</TimeOfDay></Canoe123>",
    "line": 67906,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:50.878Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"1\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"186   \" Total=\"240   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67926,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:51.490Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:52</TimeOfDay></Canoe123>",
    "line": 67943,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:51.899Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"187   \" Total=\"241   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67954,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:52.523Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:53</TimeOfDay></Canoe123>",
    "line": 67972,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:52.912Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"188   \" Total=\"242   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 67982,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:53.528Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:54</TimeOfDay></Canoe123>",
    "line": 67999,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:53.927Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"189   \" Total=\"243   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 68010,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:54.532Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:55</TimeOfDay></Canoe123>",
    "line": 68027,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:54.939Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"190   \" Total=\"244   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 68038,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:55.545Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:56</TimeOfDay></Canoe123>",
    "line": 68055,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:55.957Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"191   \" Total=\"245   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 68066,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:56.562Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:57</TimeOfDay></Canoe123>",
    "line": 68083,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:56.973Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"1\"><Participant StartOrder=\"4\" Bib=\"204\" Id=\"200449.PZK\" Name=\"RUSSWURM Vendelín\" Club=\"TJ Loko Plzeň\" Nat=\"\" Race=\"PZK 1st Run\" RaceId=\"PZK_BR1_19\" Warning=\"\" /><Result Type=\"C\" Gates=\"2,0,0,0,0,2,50,0,0,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"1\" chSplit2=\"1\" chFinish=\"0\" dtStart=\"10:20:45.170\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"54\" Time=\"192   \" Total=\"246   \" TTBDiff=\"95.23\" TTBName=\"T. VOLF\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 68093,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:57.587Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:58</TimeOfDay></Canoe123>",
    "line": 68111,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:58.389Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:23:59</TimeOfDay></Canoe123>",
    "line": 68136,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:23:59.409Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:24:00</TimeOfDay></Canoe123>",
    "line": 68182,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:24:00.420Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:24:01</TimeOfDay></Canoe123>",
    "line": 68208,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "xml",
    "observedAt": "2026-04-19T08:24:00.595Z",
    "changedAfter": "2026-04-19T08:23:55.595Z",
    "data": "<?xml version=\"1.0\" standalone=\"yes\"?>\r\n<Canoe123Data xmlns=\"http://siwidata.com/Canoe123/Data.xsd\">\n<Participants>\r\n    <Id>200449.PZK</Id>\r\n    <ClassId>PZK</ClassId>\r\n    <EventBib>204</EventBib>\r\n    <ICFId>200449</ICFId>\r\n    <FamilyName>RUSSWURM</FamilyName>\r\n    <GivenName>Vendelín</GivenName>\r\n    <Club>TJ Loko Plzeň</Club>\r\n    <Ranking> 204</Ranking>\r\n    <RankingPoints>204</RankingPoints>\r\n    <Birthdate>2016-01-01T11:00:00+01:00</Birthdate>\r\n    <Year>2016</Year>\r\n    <CatId>PZ</CatId>\r\n    <IsTeam>false</IsTeam>\r\n    <Draw>00A000204053551</Draw>\r\n    <_Bib />\r\n  </Participants>\n<Classes>\r\n    <ClassId>K1M</ClassId>\r\n    <Class>K1M</Class>\r\n    <LongTitle>K1M</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>K1W</ClassId>\r\n    <Class>K1Ž</Class>\r\n    <LongTitle>K1Ž</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1M</ClassId>\r\n    <Class>C1M</Class>\r\n    <LongTitle>C1M</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1W</ClassId>\r\n    <Class>C1Ž</Class>\r\n    <LongTitle>C1Ž</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2X</ClassId>\r\n    <Class>C2 mix</Class>\r\n    <LongTitle>C2 mix</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>PZK</ClassId>\r\n    <Class>PZK</Class>\r\n    <LongTitle>PZK</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>PZK</CatId>\r\n      <ClassId>PZK</ClassId>\r\n      <Category>K1 předžáci</Category>\r\n      <FirstYear>6</FirstYear>\r\n      <LastYear>10</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>NA</ClassId>\r\n    <Class>Not entered/assigned</Class>\r\n    <LongTitle>Not entered or not assigned</LongTitle>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2M</ClassId>\r\n    <Class>C2 muži</Class>\r\n    <LongTitle>C2 muži</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Dorot starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>PZC</ClassId>\r\n    <Class>C1 předžáci</Class>\r\n    <LongTitle>C1 předžáci</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>PZC</CatId>\r\n      <ClassId>PZC</ClassId>\r\n      <Category>C1 předžáci</Category>\r\n      <FirstYear>6</FirstYear>\r\n      <LastYear>10</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2W</ClassId>\r\n    <Class>C2 ženy</Class>\r\n    <LongTitle>C2 ženy</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veterání</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Schedule>\r\n    <RaceId>PZK_BR1_19</RaceId>\r\n    <RaceOrder>22</RaceOrder>\r\n    <StartTime>2026-04-19T10:32:40+02:00</StartTime>\r\n    <Time>+0:02:00</Time>\r\n    <ClassId>PZK</ClassId>\r\n    <DisId>BR1</DisId>\r\n    <StartInterval>0:40</StartInterval>\r\n    <JuryNr>1</JuryNr>\r\n    <CourseNr>2</CourseNr>\r\n    <RaceStatus>3</RaceStatus>\r\n    <WorldRankingEvent>false</WorldRankingEvent>\r\n  </Schedule>\n<Results>\r\n    <RaceId>PZK_BR1_19</RaceId>\r\n    <Id>200449.PZK</Id>\r\n    <StartOrder>4</StartOrder>\r\n    <Bib> 204</Bib>\r\n    <StartTime>10:34:40</StartTime>\r\n    <Status>DNF</Status>\r\n    <dtStart>10:20:45.170</dtStart>\r\n    <Gates>  2  0  0  0  0  2 50  0  0                                                               </Gates>\r\n    <GateTimes>37250120;37260673;37270183;37299306;37299679;37300051;37321653;37323452;37323980;0;0;0;0;0;0;0;0;0;</GateTimes>\r\n    <Pen>54</Pen>\r\n    <RnkOrder>5</RnkOrder>\r\n    <CatId>PZ</CatId>\r\n    <ExtraStartInt>0</ExtraStartInt>\r\n    <CheckListPrintIndex>0</CheckListPrintIndex>\r\n    <CheckListPrinted>false</CheckListPrinted>\r\n    <CheckListCorrected>false</CheckListCorrected>\r\n    <Tag />\r\n    <Selected>false</Selected>\r\n    <IsRanked>false</IsRanked>\r\n    <RecordType />\r\n    <BetterRunNr>0</BetterRunNr>\r\n    <HeatNr>0</HeatNr>\r\n    <HasWildcard>false</HasWildcard>\r\n    <LastCleanGate>0</LastCleanGate>\r\n    <NrFLT>0</NrFLT>\r\n    <FLT />\r\n  </Results>\n<CourseData>\r\n    <CourseNr>1</CourseNr>\r\n    <CourseConfig>NNRRSNNNRSNRNSNNNSNRNSNRS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>2</CourseNr>\r\n    <CourseConfig>NRRSNNRSNNRSNNNSRNSRNNNS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>3</CourseNr>\r\n    <CourseConfig />\r\n  </CourseData>\n</Canoe123Data>",
    "line": 68215,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:24:01.437Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:24:02</TimeOfDay></Canoe123>",
    "line": 68234,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:24:02.461Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:24:03</TimeOfDay></Canoe123>",
    "line": 68260,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:24:03.488Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:24:04</TimeOfDay></Canoe123>",
    "line": 68286,
    "chunk": "003-0754-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:24:04.503Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:24:05</TimeOfDay></Canoe123>",
    "line": 68314,
    "chunk": "003-0754-time-limit.jsonl"
   }
  ]
 },
 {
  "id": "K1M_BR2_19:62",
  "recording": "2026-04-19-jarni-ne-do",
  "at": "2026-04-19T08:55:33.034Z",
  "status": "not-started",
  "steps": [
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:53:46.704Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"K1M_BR2_19\" ClassId=\"K1M\" Current=\"Y\" MainTitle=\"K1M\" SubTitle=\"1st and 2nd Run\"><Row Number=\"61\"><Participant Bib=\"  62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" GivenName=\"Václav\" FamilyName=\"HOTOVÝ\" StartOrder=\"62\" StartTime=\"11:18:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"4\" Gates=\"\" Time=\"\" Total=\"91.06\" Rank=\"61\" RankOrder=\"61\" Behind=\"+24.21\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 85029,
    "chunk": "004-0824-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:05.659Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"K1M_BR2_19\" ClassId=\"K1M\" Current=\"Y\" MainTitle=\"K1M\" SubTitle=\"1st and 2nd Run\"><Row Number=\"62\"><Participant Bib=\"  62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" GivenName=\"Václav\" FamilyName=\"HOTOVÝ\" StartOrder=\"62\" StartTime=\"11:18:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"4\" Gates=\"\" Time=\"\" Total=\"91.06\" Rank=\"62\" RankOrder=\"62\" Behind=\"+24.21\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 86004,
    "chunk": "004-0824-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:48.384Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"K1M_BR2_19\" ClassId=\"K1M\" Current=\"Y\" MainTitle=\"K1M\" SubTitle=\"1st and 2nd Run\"><Row Number=\"62\"><Participant Bib=\"  62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" GivenName=\"Václav\" FamilyName=\"HOTOVÝ\" StartOrder=\"62\" StartTime=\"11:18:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"4\" Gates=\"\" Time=\"\" Total=\"91.06\" Rank=\"62\" RankOrder=\"62\" Behind=\"+24.21\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 603,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:48.594Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:54:49</TimeOfDay></Canoe123>",
    "line": 609,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:48.599Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 616,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:49.559Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:54:50</TimeOfDay></Canoe123>",
    "line": 650,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:49.755Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 660,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:50.580Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:54:51</TimeOfDay></Canoe123>",
    "line": 690,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:50.798Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 701,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:50.906Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 718,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:51.371Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 746,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:51.381Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:54:52</TimeOfDay></Canoe123>",
    "line": 748,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:51.864Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 779,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:52.421Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:54:53</TimeOfDay></Canoe123>",
    "line": 806,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:53.039Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 825,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:53.441Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:54:54</TimeOfDay></Canoe123>",
    "line": 846,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:54.054Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 864,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:54.461Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:54:55</TimeOfDay></Canoe123>",
    "line": 886,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:55.061Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 905,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:55.466Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:54:56</TimeOfDay></Canoe123>",
    "line": 926,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:56.080Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 945,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:56.198Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 962,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:56.486Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:54:57</TimeOfDay></Canoe123>",
    "line": 984,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:57.309Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1007,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:57.508Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:54:58</TimeOfDay></Canoe123>",
    "line": 1024,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:58.329Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1048,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:58.533Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:54:59</TimeOfDay></Canoe123>",
    "line": 1065,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:59.354Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1087,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:54:59.546Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:00</TimeOfDay></Canoe123>",
    "line": 1105,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:00.368Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1127,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:00.573Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:01</TimeOfDay></Canoe123>",
    "line": 1145,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:00.842Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1158,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:01.380Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:02</TimeOfDay></Canoe123>",
    "line": 1183,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:01.999Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1202,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:02.409Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:03</TimeOfDay></Canoe123>",
    "line": 1223,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:03.015Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1242,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:03.421Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:04</TimeOfDay></Canoe123>",
    "line": 1265,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:04.059Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1282,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:04.463Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:05</TimeOfDay></Canoe123>",
    "line": 1305,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:05.076Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1323,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:05.497Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:06</TimeOfDay></Canoe123>",
    "line": 1346,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:06.097Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1386,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:06.511Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:07</TimeOfDay></Canoe123>",
    "line": 1408,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:07.112Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1426,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:07.532Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:08</TimeOfDay></Canoe123>",
    "line": 1448,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:08.147Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"9\" Position=\"4\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1466,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:08.557Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"K1M_BR2_19\" ClassId=\"K1M\" Current=\"Y\" MainTitle=\"K1M\" SubTitle=\"1st and 2nd Run\"><Row Number=\"62\"><Participant Bib=\"  62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" GivenName=\"Václav\" FamilyName=\"HOTOVÝ\" StartOrder=\"62\" StartTime=\"11:18:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"4\" Gates=\"\" Time=\"\" Total=\"91.06\" Rank=\"62\" RankOrder=\"62\" Behind=\"+24.21\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 1486,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:08.782Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:09</TimeOfDay></Canoe123>",
    "line": 1496,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:08.968Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1505,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:09.413Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:10</TimeOfDay></Canoe123>",
    "line": 1529,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:09.427Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1535,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:09.994Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1561,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:10.405Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:11</TimeOfDay></Canoe123>",
    "line": 1584,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:10.453Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1593,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:11.432Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:12</TimeOfDay></Canoe123>",
    "line": 1626,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:11.635Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1636,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:12.444Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:13</TimeOfDay></Canoe123>",
    "line": 1664,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:12.541Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1674,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:13.460Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:14</TimeOfDay></Canoe123>",
    "line": 1706,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:13.664Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1715,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:14.493Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:15</TimeOfDay></Canoe123>",
    "line": 1746,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:14.693Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1755,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:15.519Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:16</TimeOfDay></Canoe123>",
    "line": 1786,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:15.717Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1795,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:16.535Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:17</TimeOfDay></Canoe123>",
    "line": 1823,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:16.744Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1833,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:16.941Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1850,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:17.365Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1876,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:17.547Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:18</TimeOfDay></Canoe123>",
    "line": 1893,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:18.571Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:19</TimeOfDay></Canoe123>",
    "line": 1919,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:18.577Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1924,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:19.184Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"K1M_BR2_19\" ClassId=\"K1M\" Current=\"Y\" MainTitle=\"K1M\" SubTitle=\"1st and 2nd Run\"><Row Number=\"62\"><Participant Bib=\"  62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" GivenName=\"Václav\" FamilyName=\"HOTOVÝ\" StartOrder=\"62\" StartTime=\"11:18:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"4\" Gates=\"\" Time=\"\" Total=\"91.06\" Rank=\"62\" RankOrder=\"62\" Behind=\"+24.21\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 1949,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:19.405Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:20</TimeOfDay></Canoe123>",
    "line": 1956,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:19.591Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1967,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:20.161Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 1990,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:20.407Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:21</TimeOfDay></Canoe123>",
    "line": 2005,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:21.227Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 2036,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:21.430Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:22</TimeOfDay></Canoe123>",
    "line": 2044,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:22.036Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 2072,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:22.379Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:23</TimeOfDay></Canoe123>",
    "line": 2098,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:22.386Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 2102,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:22.835Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 2126,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:22.847Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 2129,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:23.479Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:24</TimeOfDay></Canoe123>",
    "line": 2158,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:23.878Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 2172,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:24.492Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:25</TimeOfDay></Canoe123>",
    "line": 2199,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:24.902Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 2212,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:25.501Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:26</TimeOfDay></Canoe123>",
    "line": 2237,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:25.908Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 2250,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:26.089Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 2265,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:26.527Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:27</TimeOfDay></Canoe123>",
    "line": 2291,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:27.139Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"8\" Position=\"3\"><Participant StartOrder=\"62\" Bib=\"62\" Id=\"23057.K1M\" Name=\"HOTOVÝ Václav\" Club=\"SK Vodní slalom České Budějovice\" Nat=\"\" Race=\"K1M 2nd Run\" RaceId=\"K1M_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.21\" TTBName=\"A. REZEK\" Rank=\"62\" /></OnCourse></Canoe123>",
    "line": 2306,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:27.511Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:28</TimeOfDay></Canoe123>",
    "line": 2328,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:28.548Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:29</TimeOfDay></Canoe123>",
    "line": 2380,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:29.759Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:30</TimeOfDay></Canoe123>",
    "line": 2461,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:30.577Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:31</TimeOfDay></Canoe123>",
    "line": 2494,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:31.393Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:32</TimeOfDay></Canoe123>",
    "line": 2523,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:32.414Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:33</TimeOfDay></Canoe123>",
    "line": 2562,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "xml",
    "observedAt": "2026-04-19T08:55:33.034Z",
    "changedAfter": "2026-04-19T08:55:28.034Z",
    "data": "<?xml version=\"1.0\" standalone=\"yes\"?>\r\n<Canoe123Data xmlns=\"http://siwidata.com/Canoe123/Data.xsd\">\n<Participants>\r\n    <Id>23057.K1M</Id>\r\n    <ClassId>K1M</ClassId>\r\n    <EventBib>62</EventBib>\r\n    <ICFId>23057</ICFId>\r\n    <FamilyName>HOTOVÝ</FamilyName>\r\n    <GivenName>Václav</GivenName>\r\n    <Club>SK Vodní slalom České Budějovice</Club>\r\n    <Ranking>  62</Ranking>\r\n    <RankingPoints>62</RankingPoints>\r\n    <Birthdate>2006-01-01T11:00:00+01:00</Birthdate>\r\n    <Year>2006</Year>\r\n    <CatId />\r\n    <IsTeam>false</IsTeam>\r\n    <Draw>00A000062070628</Draw>\r\n    <_Bib>3+</_Bib>\r\n  </Participants>\n<Classes>\r\n    <ClassId>K1M</ClassId>\r\n    <Class>K1M</Class>\r\n    <LongTitle>K1M</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>K1W</ClassId>\r\n    <Class>K1Ž</Class>\r\n    <LongTitle>K1Ž</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1M</ClassId>\r\n    <Class>C1M</Class>\r\n    <LongTitle>C1M</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1W</ClassId>\r\n    <Class>C1Ž</Class>\r\n    <LongTitle>C1Ž</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2X</ClassId>\r\n    <Class>C2 mix</Class>\r\n    <LongTitle>C2 mix</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Veterán starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2X</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>PZK</ClassId>\r\n    <Class>PZK</Class>\r\n    <LongTitle>PZK</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>PZK</CatId>\r\n      <ClassId>PZK</ClassId>\r\n      <Category>K1 předžáci</Category>\r\n      <FirstYear>6</FirstYear>\r\n      <LastYear>10</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>NA</ClassId>\r\n    <Class>Not entered/assigned</Class>\r\n    <LongTitle>Not entered or not assigned</LongTitle>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2M</ClassId>\r\n    <Class>C2 muži</Class>\r\n    <LongTitle>C2 muži</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Dorot starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>PZC</ClassId>\r\n    <Class>C1 předžáci</Class>\r\n    <LongTitle>C1 předžáci</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>PZC</CatId>\r\n      <ClassId>PZC</ClassId>\r\n      <Category>C1 předžáci</Category>\r\n      <FirstYear>6</FirstYear>\r\n      <LastYear>10</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C2W</ClassId>\r\n    <Class>C2 ženy</Class>\r\n    <LongTitle>C2 ženy</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veterání</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C2W</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Schedule>\r\n    <RaceId>K1M_BR2_19</RaceId>\r\n    <RaceOrder>23</RaceOrder>\r\n    <StartTime>2026-04-19T10:37:20+02:00</StartTime>\r\n    <Time>+0:02:00</Time>\r\n    <ClassId>K1M</ClassId>\r\n    <DisId>BR2</DisId>\r\n    <StartInterval>0:40</StartInterval>\r\n    <JuryNr>1</JuryNr>\r\n    <CourseNr>2</CourseNr>\r\n    <RaceStatus>3</RaceStatus>\r\n    <WorldRankingEvent>false</WorldRankingEvent>\r\n  </Schedule>\n<Results>\r\n    <RaceId>K1M_BR2_19</RaceId>\r\n    <Id>23057.K1M</Id>\r\n    <StartOrder>62</StartOrder>\r\n    <Bib>  62</Bib>\r\n    <StartTime>11:18:00</StartTime>\r\n    <PrevStatus />\r\n    <PrevTime>87060</PrevTime>\r\n    <PrevPen>4</PrevPen>\r\n    <PrevTotal>91060</PrevTotal>\r\n    <PrevRnk>55</PrevRnk>\r\n    <PrevRnkOrder>55</PrevRnkOrder>\r\n    <PrevCatRnk>7</PrevCatRnk>\r\n    <PrevCatRnkOrder>7</PrevCatRnkOrder>\r\n    <Status>DNS</Status>\r\n    <Gates xml:space=\"preserve\">                                                                                          </Gates>\r\n    <Pen>0</Pen>\r\n    <RnkOrder>60</RnkOrder>\r\n    <TotalTotal>91060</TotalTotal>\r\n    <TotalTotalBehind>+24.21</TotalTotalBehind>\r\n    <catTotalTotalBehind>+20.36</catTotalTotalBehind>\r\n    <TotalRnk>62</TotalRnk>\r\n    <TotalRnkOrder>62</TotalRnkOrder>\r\n    <TotalCatRnk>7</TotalCatRnk>\r\n    <TotalCatRnkOrder>7</TotalCatRnkOrder>\r\n    <CatId />\r\n    <ExtraStartInt>0</ExtraStartInt>\r\n    <CheckListPrintIndex>0</CheckListPrintIndex>\r\n    <CheckListPrinted>false</CheckListPrinted>\r\n    <CheckListCorrected>false</CheckListCorrected>\r\n    <Tag />\r\n    <Selected>false</Selected>\r\n    <IsRanked>false</IsRanked>\r\n    <RecordType />\r\n    <BetterRunNr>1</BetterRunNr>\r\n    <HeatNr>0</HeatNr>\r\n    <HasWildcard>false</HasWildcard>\r\n    <LastCleanGate>0</LastCleanGate>\r\n    <NrFLT>0</NrFLT>\r\n    <FLT />\r\n  </Results>\n<CourseData>\r\n    <CourseNr>1</CourseNr>\r\n    <CourseConfig>NNRRSNNNRSNRNSNNNSNRNSNRS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>2</CourseNr>\r\n    <CourseConfig>NRRSNNRSNNRSNNNSRNSRNNNS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>3</CourseNr>\r\n    <CourseConfig />\r\n  </CourseData>\n</Canoe123Data>",
    "line": 2675,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:33.421Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:34</TimeOfDay></Canoe123>",
    "line": 2685,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:34.435Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:35</TimeOfDay></Canoe123>",
    "line": 2761,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:35.464Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:36</TimeOfDay></Canoe123>",
    "line": 2896,
    "chunk": "005-0854-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-04-19T08:55:36.484Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>10:55:37</TimeOfDay></Canoe123>",
    "line": 2959,
    "chunk": "005-0854-time-limit.jsonl"
   }
  ]
 },
 {
  "id": "C1W_BR2_19:35",
  "recording": "2026-09-19-2026-nkz-19so",
  "at": "2026-09-19T10:29:41.453Z",
  "status": "not-started",
  "steps": [
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:28:38.952Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"C1W_BR2_19\" ClassId=\"C1W\" Current=\"Y\" MainTitle=\"C1 ženy\" SubTitle=\"1st and 2nd Run\"><Row Number=\"17\"><Participant Bib=\"  35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" GivenName=\"Julie\" FamilyName=\"PODUŠKOVÁ\" StartOrder=\"7\" StartTime=\"12:28:20\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"8\" Gates=\"\" Time=\"\" Total=\"117.30\" Rank=\"17\" RankOrder=\"17\" Behind=\"+24.29\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 5766,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:28:51.120Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"C1W_BR2_19\" ClassId=\"C1W\" Current=\"Y\" MainTitle=\"C1 ženy\" SubTitle=\"1st and 2nd Run\"><Row Number=\"18\"><Participant Bib=\"  35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" GivenName=\"Julie\" FamilyName=\"PODUŠKOVÁ\" StartOrder=\"7\" StartTime=\"12:28:20\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"8\" Gates=\"\" Time=\"\" Total=\"117.30\" Rank=\"18\" RankOrder=\"18\" Behind=\"+24.29\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 6249,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:28:56.986Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:28:57</TimeOfDay></Canoe123>",
    "line": 6436,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:28:57.397Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6451,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:28:57.799Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:28:58</TimeOfDay></Canoe123>",
    "line": 6463,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:28:58.414Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6483,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:28:58.816Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:28:59</TimeOfDay></Canoe123>",
    "line": 6496,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:28:59.434Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6515,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:28:59.600Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6524,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:28:59.845Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:00</TimeOfDay></Canoe123>",
    "line": 6538,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:00.664Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6562,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:00.864Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:01</TimeOfDay></Canoe123>",
    "line": 6570,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:01.677Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6596,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:01.880Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:02</TimeOfDay></Canoe123>",
    "line": 6602,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:02.155Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"C1W_BR2_19\" ClassId=\"C1W\" Current=\"Y\" MainTitle=\"C1 ženy\" SubTitle=\"1st and 2nd Run\"><Row Number=\"18\"><Participant Bib=\"  35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" GivenName=\"Julie\" FamilyName=\"PODUŠKOVÁ\" StartOrder=\"7\" StartTime=\"12:28:20\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"8\" Gates=\"\" Time=\"\" Total=\"117.30\" Rank=\"18\" RankOrder=\"18\" Behind=\"+24.29\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 6615,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:02.689Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6630,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:02.895Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:03</TimeOfDay></Canoe123>",
    "line": 6636,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:03.119Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6651,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:03.430Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6666,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:03.816Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:04</TimeOfDay></Canoe123>",
    "line": 6681,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:03.824Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6689,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:04.067Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6705,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:04.923Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:05</TimeOfDay></Canoe123>",
    "line": 6729,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:05.127Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6740,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:05.949Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:06</TimeOfDay></Canoe123>",
    "line": 6762,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:06.151Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6773,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:06.955Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:07</TimeOfDay></Canoe123>",
    "line": 6794,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:07.162Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6805,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:07.980Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:08</TimeOfDay></Canoe123>",
    "line": 6849,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:08.183Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6860,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:08.800Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:09</TimeOfDay></Canoe123>",
    "line": 6874,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:09.203Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6892,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:09.818Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:10</TimeOfDay></Canoe123>",
    "line": 6906,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:10.224Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6924,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:10.836Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:11</TimeOfDay></Canoe123>",
    "line": 6938,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:11.244Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6957,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:11.852Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:12</TimeOfDay></Canoe123>",
    "line": 6971,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:12.253Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 6988,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:12.878Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:13</TimeOfDay></Canoe123>",
    "line": 7004,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:13.282Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7020,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:13.890Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:14</TimeOfDay></Canoe123>",
    "line": 7035,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:14.299Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7052,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:14.907Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:15</TimeOfDay></Canoe123>",
    "line": 7069,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:15.320Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7084,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:15.929Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:16</TimeOfDay></Canoe123>",
    "line": 7101,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:16.340Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7116,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:16.950Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:17</TimeOfDay></Canoe123>",
    "line": 7133,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:17.356Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7148,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:17.953Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:18</TimeOfDay></Canoe123>",
    "line": 7165,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:18.373Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7180,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:18.972Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:19</TimeOfDay></Canoe123>",
    "line": 7197,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:19.388Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7211,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:19.795Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:20</TimeOfDay></Canoe123>",
    "line": 7222,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:20.397Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7243,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:20.797Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:21</TimeOfDay></Canoe123>",
    "line": 7254,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:21.409Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7275,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:21.818Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:22</TimeOfDay></Canoe123>",
    "line": 7286,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:22.442Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7307,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:22.530Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7315,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:22.841Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"C1W_BR2_19\" ClassId=\"C1W\" Current=\"Y\" MainTitle=\"C1 ženy\" SubTitle=\"1st and 2nd Run\"><Row Number=\"18\"><Participant Bib=\"  35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" GivenName=\"Julie\" FamilyName=\"PODUŠKOVÁ\" StartOrder=\"7\" StartTime=\"12:28:20\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"8\" Gates=\"\" Time=\"\" Total=\"117.30\" Rank=\"18\" RankOrder=\"18\" Behind=\"+24.29\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 7328,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:22.845Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:23</TimeOfDay></Canoe123>",
    "line": 7329,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:22.858Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,0,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7338,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:22.974Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,0,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7350,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:23.108Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,0,0,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7368,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:23.392Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,0,0,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7383,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:23.679Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,0,0,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7398,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:23.871Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:24</TimeOfDay></Canoe123>",
    "line": 7408,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:24.074Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,0,0,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7423,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:24.441Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,0,0,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7441,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:24.748Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,0,0,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7457,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:24.893Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:25</TimeOfDay></Canoe123>",
    "line": 7468,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:24.925Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,0,0,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7477,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:24.933Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,0,0,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7484,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:24.941Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,0,0,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7491,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:24.999Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,0,0,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7497,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:24.999Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,0,0,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7503,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:24.999Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,0,0,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7509,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:25.000Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,0,0,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7515,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:25.660Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,0,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7575,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:25.914Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:26</TimeOfDay></Canoe123>",
    "line": 7590,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:26.032Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7602,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:26.924Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:27</TimeOfDay></Canoe123>",
    "line": 7628,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:27.126Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7640,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:27.351Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7653,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:27.938Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:28</TimeOfDay></Canoe123>",
    "line": 7674,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:28.360Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7690,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:28.978Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:29</TimeOfDay></Canoe123>",
    "line": 7708,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:29.377Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7724,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:29.787Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:30</TimeOfDay></Canoe123>",
    "line": 7736,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:30.397Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7759,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:30.806Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:31</TimeOfDay></Canoe123>",
    "line": 7770,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:31.412Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7793,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:31.824Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:32</TimeOfDay></Canoe123>",
    "line": 7804,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:32.424Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7827,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:32.828Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:33</TimeOfDay></Canoe123>",
    "line": 7838,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:33.347Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7860,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:33.848Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:34</TimeOfDay></Canoe123>",
    "line": 7877,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:34.472Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"6\" Position=\"4\"><Participant StartOrder=\"7\" Bib=\"35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 ženy 2. jízda\" RaceId=\"C1W_BR2_19\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"+24.29\" TTBName=\"K. VOJTÍKOVÁ\" Rank=\"18\" /></OnCourse></Canoe123>",
    "line": 7898,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:34.877Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:35</TimeOfDay></Canoe123>",
    "line": 7911,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:35.898Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:36</TimeOfDay></Canoe123>",
    "line": 7950,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:36.840Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:37</TimeOfDay></Canoe123>",
    "line": 7993,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:37.936Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:38</TimeOfDay></Canoe123>",
    "line": 8066,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:38.957Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:39</TimeOfDay></Canoe123>",
    "line": 8106,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:39.972Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:40</TimeOfDay></Canoe123>",
    "line": 8138,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:40.988Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:41</TimeOfDay></Canoe123>",
    "line": 8170,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "xml",
    "observedAt": "2026-09-19T10:29:41.453Z",
    "changedAfter": "2026-09-19T10:29:36.453Z",
    "data": "<?xml version=\"1.0\" standalone=\"yes\"?>\r\n<Canoe123Data xmlns=\"http://siwidata.com/Canoe123/Data.xsd\">\n<Participants>\r\n    <Id>9128.C1W</Id>\r\n    <ClassId>C1W</ClassId>\r\n    <EventBib>35</EventBib>\r\n    <ICFId>9128</ICFId>\r\n    <FamilyName>PODUŠKOVÁ</FamilyName>\r\n    <GivenName>Julie</GivenName>\r\n    <Club>USK Pha</Club>\r\n    <Ranking>  35</Ranking>\r\n    <RankingPoints>35</RankingPoints>\r\n    <Birthdate>2010-01-01T11:00:00+01:00</Birthdate>\r\n    <Year>2010</Year>\r\n    <CatId>DM</CatId>\r\n    <IsTeam>false</IsTeam>\r\n    <Draw>00A000035021788</Draw>\r\n    <_Bib>2</_Bib>\r\n  </Participants>\n<Classes>\r\n    <ClassId>K1M</ClassId>\r\n    <Class>K1 muži</Class>\r\n    <LongTitle>K1 muži</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žási starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>K1W</ClassId>\r\n    <Class>K1 ženy</Class>\r\n    <LongTitle>K1 ženy</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1M</ClassId>\r\n    <Class>C1 muži</Class>\r\n    <LongTitle>C1 muži</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1W</ClassId>\r\n    <Class>C1 ženy</Class>\r\n    <LongTitle>C1 ženy</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>NA</ClassId>\r\n    <Class>Not entered/assigned</Class>\r\n    <LongTitle>Not entered or not assigned</LongTitle>\r\n  </Classes>\n<Classes>\r\n    <ClassId>FOR</ClassId>\r\n    <Class>Předjezdci</Class>\r\n    <LongTitle>Předjezdci</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n  </Classes>\n<Schedule>\r\n    <RaceId>C1W_BR2_19</RaceId>\r\n    <RaceOrder>5</RaceOrder>\r\n    <StartTime>2026-09-19T12:24:20+02:00</StartTime>\r\n    <Time>+0:02:40</Time>\r\n    <ClassId>C1W</ClassId>\r\n    <DisId>BR2</DisId>\r\n    <FirstBib>1</FirstBib>\r\n    <StartInterval>0:40</StartInterval>\r\n    <JuryNr>1</JuryNr>\r\n    <CourseNr>1</CourseNr>\r\n    <RaceStatus>3</RaceStatus>\r\n    <CustomTitle>C1 ženy 2. jízda</CustomTitle>\r\n    <WorldRankingEvent>false</WorldRankingEvent>\r\n  </Schedule>\n<Results>\r\n    <RaceId>C1W_BR2_19</RaceId>\r\n    <Id>9128.C1W</Id>\r\n    <StartOrder>7</StartOrder>\r\n    <Bib>  35</Bib>\r\n    <StartTime>12:28:20</StartTime>\r\n    <PrevStatus />\r\n    <PrevTime>109300</PrevTime>\r\n    <PrevPen>8</PrevPen>\r\n    <PrevTotal>117300</PrevTotal>\r\n    <PrevRnk>17</PrevRnk>\r\n    <PrevRnkOrder>17</PrevRnkOrder>\r\n    <PrevCatRnk>5</PrevCatRnk>\r\n    <PrevCatRnkOrder>5</PrevCatRnkOrder>\r\n    <Status>DNS</Status>\r\n    <Gates xml:space=\"preserve\">                                                                                          </Gates>\r\n    <Pen>0</Pen>\r\n    <RnkOrder>7</RnkOrder>\r\n    <TotalTotal>117300</TotalTotal>\r\n    <TotalTotalBehind>+24.29</TotalTotalBehind>\r\n    <catTotalTotalBehind>+12.19</catTotalTotalBehind>\r\n    <TotalRnk>18</TotalRnk>\r\n    <TotalRnkOrder>18</TotalRnkOrder>\r\n    <TotalCatRnk>6</TotalCatRnk>\r\n    <TotalCatRnkOrder>6</TotalCatRnkOrder>\r\n    <CatId>DM</CatId>\r\n    <ExtraStartInt>0</ExtraStartInt>\r\n    <CheckListPrintIndex>0</CheckListPrintIndex>\r\n    <CheckListPrinted>false</CheckListPrinted>\r\n    <CheckListCorrected>false</CheckListCorrected>\r\n    <Tag />\r\n    <Selected>false</Selected>\r\n    <IsRanked>false</IsRanked>\r\n    <RecordType />\r\n    <BetterRunNr>1</BetterRunNr>\r\n    <HeatNr>0</HeatNr>\r\n    <HasWildcard>false</HasWildcard>\r\n    <LastCleanGate>0</LastCleanGate>\r\n    <NrFLT>0</NrFLT>\r\n    <FLT />\r\n  </Results>\n<CourseData>\r\n    <CourseNr>1</CourseNr>\r\n    <CourseConfig>RNNNSNRNSNRNSNRNSNNNRSNNRSNNNS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>2</CourseNr>\r\n    <CourseConfig>NNNNSRNRSNNRSNNRSRNSRNNS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>3</CourseNr>\r\n    <CourseConfig />\r\n  </CourseData>\n</Canoe123Data>",
    "line": 8186,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:41.806Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:42</TimeOfDay></Canoe123>",
    "line": 8197,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:42.832Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:43</TimeOfDay></Canoe123>",
    "line": 8230,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:43.847Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:44</TimeOfDay></Canoe123>",
    "line": 8261,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:43.940Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"C1W_BR2_19\" ClassId=\"C1W\" Current=\"Y\" MainTitle=\"C1 ženy\" SubTitle=\"1st and 2nd Run\"><Row Number=\"18\"><Participant Bib=\"  35\" Id=\"9128.C1W\" Name=\"PODUŠKOVÁ Julie\" Club=\"USK Pha\" Nat=\"\" GivenName=\"Julie\" FamilyName=\"PODUŠKOVÁ\" StartOrder=\"7\" StartTime=\"12:28:20\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"DNS\" Pen=\"8\" Gates=\"                                                                                          \" Time=\"\" Total=\"117.30\" Rank=\"18\" RankOrder=\"18\" Behind=\"+24.29\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 8269,
    "chunk": "008-1026-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-19T10:29:44.880Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>12:29:45</TimeOfDay></Canoe123>",
    "line": 8299,
    "chunk": "008-1026-time-limit.jsonl"
   }
  ]
 },
 {
  "id": "C1M_BR1_20:64",
  "recording": "2026-09-20-2026-nkz-20ne",
  "at": "2026-09-20T09:40:06.907Z",
  "status": "not-started",
  "steps": [
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:28:45.443Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"C1M_BR1_20\" ClassId=\"C1M\" Current=\"N\" MainTitle=\"C1 muži\" SubTitle=\"1st Run - Start List\"><Row Number=\"4\"><Participant Bib=\"  64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" GivenName=\"Petr\" FamilyName=\"KARÁSEK\" StartOrder=\"4\" StartTime=\"14:02:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"\" Gates=\"\" Time=\"\" Total=\"\" Rank=\"\" RankOrder=\"\" Behind=\"\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 10225,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:38:47.528Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"C1M_BR1_20\" ClassId=\"C1M\" Current=\"N\" MainTitle=\"C1 muži\" SubTitle=\"1st Run - Start List\"><Row Number=\"4\"><Participant Bib=\"  64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" GivenName=\"Petr\" FamilyName=\"KARÁSEK\" StartOrder=\"4\" StartTime=\"14:02:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"\" Gates=\"\" Time=\"\" Total=\"\" Rank=\"\" RankOrder=\"\" Behind=\"\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 30205,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:22.027Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:22</TimeOfDay></Canoe123>",
    "line": 31362,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:22.854Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:23</TimeOfDay></Canoe123>",
    "line": 31384,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:23.875Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:24</TimeOfDay></Canoe123>",
    "line": 31412,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:24.896Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:25</TimeOfDay></Canoe123>",
    "line": 31442,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:25.919Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:26</TimeOfDay></Canoe123>",
    "line": 31493,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:26.948Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:27</TimeOfDay></Canoe123>",
    "line": 31521,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:27.976Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:28</TimeOfDay></Canoe123>",
    "line": 31549,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:28.896Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:29</TimeOfDay></Canoe123>",
    "line": 31581,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:30.007Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:30</TimeOfDay></Canoe123>",
    "line": 31624,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:30.011Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31628,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:30.837Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:31</TimeOfDay></Canoe123>",
    "line": 31649,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:31.228Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"4\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31661,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:31.236Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31666,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:31.237Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31668,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:31.247Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31671,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:31.252Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31675,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:31.257Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31684,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:31.278Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31688,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:31.283Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31692,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:31.286Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31697,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:31.838Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:32</TimeOfDay></Canoe123>",
    "line": 31725,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:32.447Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31743,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:32.847Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:33</TimeOfDay></Canoe123>",
    "line": 31753,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:33.463Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31771,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:33.875Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:34</TimeOfDay></Canoe123>",
    "line": 31781,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:34.493Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31799,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:34.900Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:35</TimeOfDay></Canoe123>",
    "line": 31811,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:35.107Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31819,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:35.930Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:36</TimeOfDay></Canoe123>",
    "line": 31840,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:36.129Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31847,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:36.946Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:37</TimeOfDay></Canoe123>",
    "line": 31868,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:37.152Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31875,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:37.971Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:38</TimeOfDay></Canoe123>",
    "line": 31895,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:38.178Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31903,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:38.274Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31908,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:38.986Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:39</TimeOfDay></Canoe123>",
    "line": 31932,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:39.390Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31943,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:40.000Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:40</TimeOfDay></Canoe123>",
    "line": 31961,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:40.409Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 31972,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:41.026Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:41</TimeOfDay></Canoe123>",
    "line": 31989,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:41.422Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32001,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:41.834Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:42</TimeOfDay></Canoe123>",
    "line": 32013,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:42.450Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32029,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:42.842Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:43</TimeOfDay></Canoe123>",
    "line": 32041,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:43.456Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32057,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:43.866Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:44</TimeOfDay></Canoe123>",
    "line": 32068,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:44.193Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32082,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:44.571Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32096,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:44.808Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32107,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:44.888Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:45</TimeOfDay></Canoe123>",
    "line": 32112,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:45.911Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:46</TimeOfDay></Canoe123>",
    "line": 32139,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:45.918Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32143,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:46.922Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:47</TimeOfDay></Canoe123>",
    "line": 32167,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:46.927Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32171,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:47.952Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:48</TimeOfDay></Canoe123>",
    "line": 32197,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:47.954Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32201,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:48.140Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32207,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:48.970Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:49</TimeOfDay></Canoe123>",
    "line": 32227,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:49.177Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32235,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:50.001Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:50</TimeOfDay></Canoe123>",
    "line": 32256,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:50.204Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32263,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:51.023Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:51</TimeOfDay></Canoe123>",
    "line": 32283,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:51.226Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32291,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:51.322Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32296,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:51.791Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32313,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:51.838Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:52</TimeOfDay></Canoe123>",
    "line": 32318,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:52.117Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32329,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:52.831Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32351,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:52.851Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:53</TimeOfDay></Canoe123>",
    "line": 32356,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:52.868Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32362,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:53.038Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32373,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:53.049Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32378,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:53.055Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32383,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:53.067Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32387,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:53.075Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32392,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:53.081Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32397,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:53.860Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:54</TimeOfDay></Canoe123>",
    "line": 32435,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:54.275Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32448,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:54.911Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:55</TimeOfDay></Canoe123>",
    "line": 32467,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:55.407Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32508,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:55.890Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:56</TimeOfDay></Canoe123>",
    "line": 32525,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:56.500Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"1\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32541,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:56.917Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:57</TimeOfDay></Canoe123>",
    "line": 32555,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:57.124Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32563,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:57.926Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:58</TimeOfDay></Canoe123>",
    "line": 32585,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:58.127Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32592,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:58.951Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:39:59</TimeOfDay></Canoe123>",
    "line": 32615,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:59.156Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32622,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:39:59.975Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:40:00</TimeOfDay></Canoe123>",
    "line": 32645,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:40:00.177Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32652,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:40:00.277Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32660,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:40:00.699Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32678,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:40:00.992Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:40:01</TimeOfDay></Canoe123>",
    "line": 32688,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:40:01.810Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"4\" Bib=\"64\" Id=\"9018.C1M\" Name=\"KARÁSEK Petr\" Club=\"USK Pha\" Nat=\"\" Race=\"C1 muži 1. jízda\" RaceId=\"C1M_BR1_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"\" Total=\"0.00\" TTBDiff=\"\" TTBName=\"\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 32711,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:40:02.010Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:40:02</TimeOfDay></Canoe123>",
    "line": 32719,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:40:03.026Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:40:03</TimeOfDay></Canoe123>",
    "line": 32749,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:40:03.843Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:40:04</TimeOfDay></Canoe123>",
    "line": 32773,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:40:04.852Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:40:05</TimeOfDay></Canoe123>",
    "line": 32801,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:40:05.837Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:40:06</TimeOfDay></Canoe123>",
    "line": 32826,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "xml",
    "observedAt": "2026-09-20T09:40:06.618Z",
    "changedAfter": "2026-09-20T09:40:01.618Z",
    "data": "<?xml version=\"1.0\" standalone=\"yes\"?>\r\n<Canoe123Data xmlns=\"http://siwidata.com/Canoe123/Data.xsd\">\n<Participants>\r\n    <Id>9018.C1M</Id>\r\n    <ClassId>C1M</ClassId>\r\n    <EventBib>64</EventBib>\r\n    <ICFId>9018</ICFId>\r\n    <FamilyName>KARÁSEK</FamilyName>\r\n    <GivenName>Petr</GivenName>\r\n    <Club>USK Pha</Club>\r\n    <Ranking>  64</Ranking>\r\n    <RankingPoints>64</RankingPoints>\r\n    <Birthdate>1986-01-01T11:00:00+01:00</Birthdate>\r\n    <Year>1986</Year>\r\n    <CatId>VM</CatId>\r\n    <IsTeam>false</IsTeam>\r\n    <Draw>00A000064031078</Draw>\r\n    <_Bib>2</_Bib>\r\n  </Participants>\n<Classes>\r\n    <ClassId>K1M</ClassId>\r\n    <Class>K1 muži</Class>\r\n    <LongTitle>K1 muži</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žási starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>K1W</ClassId>\r\n    <Class>K1 ženy</Class>\r\n    <LongTitle>K1 ženy</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1M</ClassId>\r\n    <Class>C1 muži</Class>\r\n    <LongTitle>C1 muži</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1W</ClassId>\r\n    <Class>C1 ženy</Class>\r\n    <LongTitle>C1 ženy</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>NA</ClassId>\r\n    <Class>Not entered/assigned</Class>\r\n    <LongTitle>Not entered or not assigned</LongTitle>\r\n  </Classes>\n<Classes>\r\n    <ClassId>FOR</ClassId>\r\n    <Class>Předjezdci</Class>\r\n    <LongTitle>Předjezdci</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n  </Classes>\n<Schedule>\r\n    <RaceId>C1M_BR1_20</RaceId>\r\n    <RaceOrder>17</RaceOrder>\r\n    <StartTime>2026-09-20T14:00:00+02:00</StartTime>\r\n    <Time>14:00:00</Time>\r\n    <ClassId>C1M</ClassId>\r\n    <DisId>BR1</DisId>\r\n    <FirstBib>+1</FirstBib>\r\n    <StartInterval>0:40</StartInterval>\r\n    <JuryNr>1</JuryNr>\r\n    <CourseNr>2</CourseNr>\r\n    <RaceStatus>1</RaceStatus>\r\n    <CustomTitle>C1 muži 1. jízda</CustomTitle>\r\n    <WorldRankingEvent>false</WorldRankingEvent>\r\n  </Schedule>\n<Results>\r\n    <RaceId>C1M_BR1_20</RaceId>\r\n    <Id>9018.C1M</Id>\r\n    <StartOrder>4</StartOrder>\r\n    <Bib>  64</Bib>\r\n    <StartTime>14:02:00</StartTime>\r\n    <Status>DNS</Status>\r\n    <Gates xml:space=\"preserve\">                                                                                          </Gates>\r\n    <Pen>0</Pen>\r\n    <RnkOrder>1</RnkOrder>\r\n    <CatId>VM</CatId>\r\n    <ExtraStartInt>0</ExtraStartInt>\r\n    <CheckListPrintIndex>0</CheckListPrintIndex>\r\n    <CheckListPrinted>false</CheckListPrinted>\r\n    <CheckListCorrected>false</CheckListCorrected>\r\n    <Tag />\r\n    <Selected>false</Selected>\r\n    <IsRanked>false</IsRanked>\r\n    <RecordType />\r\n    <BetterRunNr>0</BetterRunNr>\r\n    <HeatNr>0</HeatNr>\r\n    <HasWildcard>false</HasWildcard>\r\n    <LastCleanGate>0</LastCleanGate>\r\n    <NrFLT>0</NrFLT>\r\n    <FLT />\r\n  </Results>\n<CourseData>\r\n    <CourseNr>1</CourseNr>\r\n    <CourseConfig>RNNNSNRNSNRNSNRNSNNNRSNNRSNNNS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>2</CourseNr>\r\n    <CourseConfig>NNRNSNNNSRRNNSNNNSNRNNSNRRSNNS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>3</CourseNr>\r\n    <CourseConfig />\r\n  </CourseData>\n</Canoe123Data>",
    "line": 32851,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:40:06.907Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:40:07</TimeOfDay></Canoe123>",
    "line": 32858,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:40:07.945Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:40:08</TimeOfDay></Canoe123>",
    "line": 32886,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:40:08.963Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:40:09</TimeOfDay></Canoe123>",
    "line": 32914,
    "chunk": "006-0923-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T09:40:09.842Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>11:40:10</TimeOfDay></Canoe123>",
    "line": 32939,
    "chunk": "006-0923-time-limit.jsonl"
   }
  ]
 },
 {
  "id": "C1M_BR2_20:38",
  "recording": "2026-09-20-2026-nkz-20ne",
  "at": "2026-09-20T13:57:16.856Z",
  "status": "left-without-finish",
  "steps": [
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:16.727Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"C1M_BR2_20\" ClassId=\"C1M\" Current=\"Y\" MainTitle=\"C1 muži\" SubTitle=\"1st and 2nd Run\"><Row Number=\"67\"><Participant Bib=\"  38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" GivenName=\"Vojtěch\" FamilyName=\"TÁBORSKÝ\" StartOrder=\"30\" StartTime=\"15:50:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"\" Gates=\"\" Time=\"\" Total=\"\" Rank=\"\" RankOrder=\"67\" Behind=\"\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 39422,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:18.899Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"C1M_BR2_20\" ClassId=\"C1M\" Current=\"Y\" MainTitle=\"C1 muži\" SubTitle=\"1st and 2nd Run\"><Row Number=\"67\"><Participant Bib=\"  38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" GivenName=\"Vojtěch\" FamilyName=\"TÁBORSKÝ\" StartOrder=\"30\" StartTime=\"15:50:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"\" Gates=\"\" Time=\"\" Total=\"\" Rank=\"\" RankOrder=\"67\" Behind=\"\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 39516,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:31.876Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:32</TimeOfDay></Canoe123>",
    "line": 39953,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:31.881Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"14   \" Total=\"14   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 39957,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:32.896Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:33</TimeOfDay></Canoe123>",
    "line": 39980,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:32.901Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"15   \" Total=\"15   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 39984,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:33.907Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:34</TimeOfDay></Canoe123>",
    "line": 40009,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:33.913Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"16   \" Total=\"16   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40014,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:34.933Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:35</TimeOfDay></Canoe123>",
    "line": 40036,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:34.937Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"17   \" Total=\"17   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40041,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:35.381Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"17   \" Total=\"17   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40053,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:35.730Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"17   \" Total=\"17   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40066,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:35.966Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:36</TimeOfDay></Canoe123>",
    "line": 40075,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:35.971Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"18   \" Total=\"18   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40081,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:36.170Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"18   \" Total=\"18   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40089,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:36.988Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:37</TimeOfDay></Canoe123>",
    "line": 40109,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:36.994Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"19   \" Total=\"19   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40114,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:38.001Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:38</TimeOfDay></Canoe123>",
    "line": 40138,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:38.006Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"20   \" Total=\"20   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40143,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:39.026Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:39</TimeOfDay></Canoe123>",
    "line": 40165,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:39.033Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"21   \" Total=\"21   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40171,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:39.846Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:40</TimeOfDay></Canoe123>",
    "line": 40189,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:40.051Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"22   \" Total=\"22   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40198,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:40.870Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:41</TimeOfDay></Canoe123>",
    "line": 40216,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:40.874Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"23   \" Total=\"23   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40220,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:41.898Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:42</TimeOfDay></Canoe123>",
    "line": 40245,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:41.904Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"24   \" Total=\"24   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40250,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:42.156Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"24   \" Total=\"24   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40260,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:42.642Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"24   \" Total=\"24   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40275,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:42.831Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"24   \" Total=\"24   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40285,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:42.926Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:43</TimeOfDay></Canoe123>",
    "line": 40290,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:42.932Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"25   \" Total=\"25   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40295,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:43.938Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:44</TimeOfDay></Canoe123>",
    "line": 40317,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:43.944Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"26   \" Total=\"26   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40322,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:44.955Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:45</TimeOfDay></Canoe123>",
    "line": 40347,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:44.961Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"27   \" Total=\"27   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40352,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:45.984Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:46</TimeOfDay></Canoe123>",
    "line": 40376,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:45.990Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"28   \" Total=\"28   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40381,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:46.111Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"C1M_BR2_20\" ClassId=\"C1M\" Current=\"Y\" MainTitle=\"C1 muži\" SubTitle=\"1st and 2nd Run\"><Row Number=\"67\"><Participant Bib=\"  38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" GivenName=\"Vojtěch\" FamilyName=\"TÁBORSKÝ\" StartOrder=\"30\" StartTime=\"15:50:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"\" Gates=\"\" Time=\"\" Total=\"\" Rank=\"\" RankOrder=\"67\" Behind=\"\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 40384,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:46.486Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"C1M_BR2_20\" ClassId=\"C1M\" Current=\"Y\" MainTitle=\"C1 muži\" SubTitle=\"1st and 2nd Run\"><Row Number=\"67\"><Participant Bib=\"  38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" GivenName=\"Vojtěch\" FamilyName=\"TÁBORSKÝ\" StartOrder=\"30\" StartTime=\"15:50:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"\" Gates=\"\" Time=\"\" Total=\"\" Rank=\"\" RankOrder=\"67\" Behind=\"\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 40398,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:46.623Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"28   \" Total=\"28   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40404,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:46.630Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"28   \" Total=\"28   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40407,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:47.012Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:47</TimeOfDay></Canoe123>",
    "line": 40423,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:47.020Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,0,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"29   \" Total=\"29   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40428,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:47.267Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,0,0,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"29   \" Total=\"29   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40435,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:47.488Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,0,0,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"29   \" Total=\"29   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40445,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:48.036Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:48</TimeOfDay></Canoe123>",
    "line": 40461,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:48.039Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,0,0,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"30   \" Total=\"30   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40465,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:48.145Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,0,0,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"30   \" Total=\"30   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40471,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:48.857Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:49</TimeOfDay></Canoe123>",
    "line": 40488,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:49.062Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"3\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,0,0,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"31   \" Total=\"31   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40496,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:49.876Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:50</TimeOfDay></Canoe123>",
    "line": 40515,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:49.880Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,0,0,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"32   \" Total=\"32   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40520,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:49.885Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,0,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"32   \" Total=\"32   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40523,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:50.164Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,0,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"32   \" Total=\"32   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40537,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:50.453Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"32   \" Total=\"32   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40548,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:50.912Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:51</TimeOfDay></Canoe123>",
    "line": 40561,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:50.919Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"33   \" Total=\"33   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40565,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:50.929Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"33   \" Total=\"33   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40569,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:50.945Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"33   \" Total=\"33   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40573,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:50.961Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"33   \" Total=\"33   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40578,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:50.976Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"33   \" Total=\"33   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40582,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:50.982Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"33   \" Total=\"33   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40587,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:50.996Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"33   \" Total=\"33   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40591,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:51.937Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:52</TimeOfDay></Canoe123>",
    "line": 40636,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:51.942Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"34   \" Total=\"34   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40640,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:51.946Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"34   \" Total=\"34   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40643,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:52.377Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"34   \" Total=\"34   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40660,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:52.856Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:53</TimeOfDay></Canoe123>",
    "line": 40676,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:52.863Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"34   \" Total=\"34   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40682,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:52.961Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"35   \" Total=\"35   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40690,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:53.224Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"35   \" Total=\"35   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40699,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:53.976Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:54</TimeOfDay></Canoe123>",
    "line": 40719,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:53.980Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"36   \" Total=\"36   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40723,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:55.003Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:55</TimeOfDay></Canoe123>",
    "line": 40748,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:55.008Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"37   \" Total=\"37   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40752,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:56.028Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:56</TimeOfDay></Canoe123>",
    "line": 40780,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:56.032Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"38   \" Total=\"38   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40784,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:56.048Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"38   \" Total=\"38   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40789,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:56.059Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"38   \" Total=\"38   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40795,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:56.064Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"38   \" Total=\"38   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40801,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:56.072Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"38   \" Total=\"38   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40807,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:56.080Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"38   \" Total=\"38   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40814,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:56.089Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"38   \" Total=\"38   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40820,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:56.109Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"38   \" Total=\"38   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40839,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:57.038Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:57</TimeOfDay></Canoe123>",
    "line": 40876,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:57.042Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"39   \" Total=\"39   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40880,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:57.852Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:58</TimeOfDay></Canoe123>",
    "line": 40908,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:58.059Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"40   \" Total=\"40   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40916,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:58.881Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:56:59</TimeOfDay></Canoe123>",
    "line": 40962,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:58.885Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"41   \" Total=\"41   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40966,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:59.875Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:00</TimeOfDay></Canoe123>",
    "line": 40993,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:56:59.880Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"42   \" Total=\"42   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 40997,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:00.481Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"42   \" Total=\"42   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41019,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:00.894Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:01</TimeOfDay></Canoe123>",
    "line": 41032,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:00.898Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"43   \" Total=\"43   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41036,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:01.360Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"43   \" Total=\"43   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41052,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:01.840Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:02</TimeOfDay></Canoe123>",
    "line": 41073,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:01.846Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"43   \" Total=\"43   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41078,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:01.908Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"44   \" Total=\"44   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41087,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:02.306Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"44   \" Total=\"44   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41098,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:02.923Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:03</TimeOfDay></Canoe123>",
    "line": 41120,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:02.926Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"45   \" Total=\"45   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41124,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:03.938Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:04</TimeOfDay></Canoe123>",
    "line": 41151,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:03.943Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"46   \" Total=\"46   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41155,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:04.814Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"46   \" Total=\"46   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41188,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:04.952Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:05</TimeOfDay></Canoe123>",
    "line": 41198,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:04.958Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"47   \" Total=\"47   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41203,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:05.539Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"47   \" Total=\"47   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41220,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:05.980Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:06</TimeOfDay></Canoe123>",
    "line": 41238,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:06.093Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"C1M_BR2_20\" ClassId=\"C1M\" Current=\"Y\" MainTitle=\"C1 muži\" SubTitle=\"1st and 2nd Run\"><Row Number=\"67\"><Participant Bib=\"  38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" GivenName=\"Vojtěch\" FamilyName=\"TÁBORSKÝ\" StartOrder=\"30\" StartTime=\"15:50:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"\" Gates=\"\" Time=\"\" Total=\"\" Rank=\"\" RankOrder=\"67\" Behind=\"\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 41244,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:06.203Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"5\" Position=\"3\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"48   \" Total=\"48   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41247,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:06.402Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"48   \" Total=\"48   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41256,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:06.701Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"48   \" Total=\"48   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41273,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:06.936Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:07</TimeOfDay></Canoe123>",
    "line": 41284,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:06.942Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"49   \" Total=\"49   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41289,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:06.942Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"0\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"49   \" Total=\"49   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41291,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:07.262Z",
    "data": "<Canoe123 System=\"Main\"><Results RaceId=\"C1M_BR2_20\" ClassId=\"C1M\" Current=\"Y\" MainTitle=\"C1 muži\" SubTitle=\"1st and 2nd Run\"><Row Number=\"67\"><Participant Bib=\"  38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" GivenName=\"Vojtěch\" FamilyName=\"TÁBORSKÝ\" StartOrder=\"30\" StartTime=\"15:50:00\" /><Result Type=\"T\" HeatNr=\"0\" Q=\"\" IRM=\"\" Pen=\"\" Gates=\"\" Time=\"\" Total=\"\" Rank=\"\" RankOrder=\"67\" Behind=\"\" PP=\"\" /></Row></Results></Canoe123>",
    "line": 41309,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:07.376Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"49   \" Total=\"49   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41315,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:07.377Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"49   \" Total=\"49   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41316,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:07.514Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"49   \" Total=\"49   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41329,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:08.025Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:08</TimeOfDay></Canoe123>",
    "line": 41345,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:08.029Z",
    "data": "<Canoe123 System=\"Main\"><OnCourse Total=\"4\" Position=\"2\"><Participant StartOrder=\"30\" Bib=\"38\" Id=\"66028.C1M\" Name=\"TÁBORSKÝ Vojtěch\" Club=\"Horš.Týn\" Nat=\"\" Race=\"C1 muži 2. jízda\" RaceId=\"C1M_BR2_20\" Warning=\"\" /><Result Type=\"C\" Gates=\",,,,,,,,,,,,,,,,,,,,,,\" Completed=\"N\" chStart=\"0\" chSplit1=\"0\" chSplit2=\"0\" chFinish=\"1\" dtStart=\"15:56:17.780\" dtSplit1=\"\" dtSplit2=\"\" dtFinish=\"\" /><Result Type=\"T\" Pen=\"0\" Time=\"50   \" Total=\"50   \" TTBDiff=\"\" TTBName=\"T. INDRUCH\" Rank=\"\" /></OnCourse></Canoe123>",
    "line": 41349,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:09.362Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:09</TimeOfDay></Canoe123>",
    "line": 41380,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:09.850Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:10</TimeOfDay></Canoe123>",
    "line": 41400,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:10.877Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:11</TimeOfDay></Canoe123>",
    "line": 41461,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:11.892Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:12</TimeOfDay></Canoe123>",
    "line": 41489,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:12.913Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:13</TimeOfDay></Canoe123>",
    "line": 41516,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:13.920Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:14</TimeOfDay></Canoe123>",
    "line": 41543,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:14.953Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:15</TimeOfDay></Canoe123>",
    "line": 41579,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:16.001Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:16</TimeOfDay></Canoe123>",
    "line": 41676,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "xml",
    "observedAt": "2026-09-20T13:57:16.856Z",
    "changedAfter": "2026-09-20T13:57:11.856Z",
    "data": "<?xml version=\"1.0\" standalone=\"yes\"?>\r\n<Canoe123Data xmlns=\"http://siwidata.com/Canoe123/Data.xsd\">\n<Participants>\r\n    <Id>66028.C1M</Id>\r\n    <ClassId>C1M</ClassId>\r\n    <EventBib>38</EventBib>\r\n    <ICFId>66028</ICFId>\r\n    <FamilyName>TÁBORSKÝ</FamilyName>\r\n    <GivenName>Vojtěch</GivenName>\r\n    <Club>Horš.Týn</Club>\r\n    <Ranking>  38</Ranking>\r\n    <RankingPoints>38</RankingPoints>\r\n    <Birthdate>2010-01-01T11:00:00+01:00</Birthdate>\r\n    <Year>2010</Year>\r\n    <CatId>DM</CatId>\r\n    <IsTeam>false</IsTeam>\r\n    <Draw>00A000038093030</Draw>\r\n    <_Bib>2</_Bib>\r\n  </Participants>\n<Classes>\r\n    <ClassId>K1M</ClassId>\r\n    <Class>K1 muži</Class>\r\n    <LongTitle>K1 muži</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Žási starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Dorost starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Veterán starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>K1W</ClassId>\r\n    <Class>K1 ženy</Class>\r\n    <LongTitle>K1 ženy</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>K1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1M</ClassId>\r\n    <Class>C1 muži</Class>\r\n    <LongTitle>C1 muži</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Žáci starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Dorostenci starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Veteráni starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1M</ClassId>\r\n      <Category>Super veteráni</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>C1W</ClassId>\r\n    <Class>C1 ženy</Class>\r\n    <LongTitle>C1 ženy</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n    <Categories>\r\n      <CatId>ZM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně mladší</Category>\r\n      <FirstYear>11</FirstYear>\r\n      <LastYear>12</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>ZS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Žákyně starší</Category>\r\n      <FirstYear>13</FirstYear>\r\n      <LastYear>14</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky mladší</Category>\r\n      <FirstYear>15</FirstYear>\r\n      <LastYear>16</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>DS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Dorostenky starší</Category>\r\n      <FirstYear>17</FirstYear>\r\n      <LastYear>18</LastYear>\r\n      <EntryFee>100</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VM</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky mladší</Category>\r\n      <FirstYear>35</FirstYear>\r\n      <LastYear>44</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>V</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky</Category>\r\n      <FirstYear>45</FirstYear>\r\n      <LastYear>54</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>VS</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Veteránky starší</Category>\r\n      <FirstYear>55</FirstYear>\r\n      <LastYear>64</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n    <Categories>\r\n      <CatId>SV</CatId>\r\n      <ClassId>C1W</ClassId>\r\n      <Category>Super veteránky</Category>\r\n      <FirstYear>65</FirstYear>\r\n      <LastYear>100</LastYear>\r\n      <EntryFee>200</EntryFee>\r\n    </Categories>\r\n  </Classes>\n<Classes>\r\n    <ClassId>NA</ClassId>\r\n    <Class>Not entered/assigned</Class>\r\n    <LongTitle>Not entered or not assigned</LongTitle>\r\n  </Classes>\n<Classes>\r\n    <ClassId>FOR</ClassId>\r\n    <Class>Předjezdci</Class>\r\n    <LongTitle>Předjezdci</LongTitle>\r\n    <EntryFee>200</EntryFee>\r\n  </Classes>\n<Schedule>\r\n    <RaceId>C1M_BR2_20</RaceId>\r\n    <RaceOrder>19</RaceOrder>\r\n    <StartTime>2026-09-20T15:30:40+02:00</StartTime>\r\n    <Time>+0:02:40</Time>\r\n    <ClassId>C1M</ClassId>\r\n    <DisId>BR2</DisId>\r\n    <FirstBib>+1</FirstBib>\r\n    <StartInterval>0:40</StartInterval>\r\n    <JuryNr>1</JuryNr>\r\n    <CourseNr>2</CourseNr>\r\n    <RaceStatus>3</RaceStatus>\r\n    <CustomTitle>C1 muži 2. jízda</CustomTitle>\r\n    <WorldRankingEvent>false</WorldRankingEvent>\r\n  </Schedule>\n<Results>\r\n    <RaceId>C1M_BR2_20</RaceId>\r\n    <Id>66028.C1M</Id>\r\n    <StartOrder>30</StartOrder>\r\n    <Bib>  38</Bib>\r\n    <StartTime>15:50:00</StartTime>\r\n    <PrevStatus>DNS</PrevStatus>\r\n    <PrevPen>0</PrevPen>\r\n    <PrevRnkOrder>67</PrevRnkOrder>\r\n    <Status>DNS</Status>\r\n    <dtStart>15:56:17.780</dtStart>\r\n    <Gates xml:space=\"preserve\">                                                                                          </Gates>\r\n    <Pen>0</Pen>\r\n    <RnkOrder>30</RnkOrder>\r\n    <TotalRnkOrder>67</TotalRnkOrder>\r\n    <CatId>DM</CatId>\r\n    <ExtraStartInt>0</ExtraStartInt>\r\n    <CheckListPrintIndex>0</CheckListPrintIndex>\r\n    <CheckListPrinted>false</CheckListPrinted>\r\n    <CheckListCorrected>false</CheckListCorrected>\r\n    <Tag />\r\n    <Selected>false</Selected>\r\n    <IsRanked>false</IsRanked>\r\n    <RecordType />\r\n    <BetterRunNr>0</BetterRunNr>\r\n    <HeatNr>0</HeatNr>\r\n    <HasWildcard>false</HasWildcard>\r\n    <LastCleanGate>0</LastCleanGate>\r\n    <NrFLT>0</NrFLT>\r\n    <FLT />\r\n  </Results>\n<CourseData>\r\n    <CourseNr>1</CourseNr>\r\n    <CourseConfig>RNNNSNRNSNRNNSRNNSNNRNSNRNSNNS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>2</CourseNr>\r\n    <CourseConfig>NNRNSNNNSRRNNSNNNSNRNNSNRRSNNS</CourseConfig>\r\n  </CourseData>\n<CourseData>\r\n    <CourseNr>3</CourseNr>\r\n    <CourseConfig />\r\n  </CourseData>\n</Canoe123Data>",
    "line": 41703,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:17.032Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:17</TimeOfDay></Canoe123>",
    "line": 41707,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:17.847Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:18</TimeOfDay></Canoe123>",
    "line": 41741,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:18.869Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:19</TimeOfDay></Canoe123>",
    "line": 41790,
    "chunk": "015-1336-time-limit.jsonl"
   },
   {
    "kind": "tcp",
    "observedAt": "2026-09-20T13:57:19.888Z",
    "data": "<Canoe123 System=\"Main\"><TimeOfDay>15:57:20</TimeOfDay></Canoe123>",
    "line": 41815,
    "chunk": "015-1336-time-limit.jsonl"
   }
  ]
 }
];
