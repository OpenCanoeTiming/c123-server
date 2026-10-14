#!/usr/bin/env bash
# Spike S2 pipeline (BRIEFS S2 step 2), one excerpt end to end:
#   extract-excerpt → S1 ingest, twice → S1 gate-2 checker → capture, twice → admit → fixture file.
# Usage: PD=<protocol-docs checkout at main> pipeline.sh <work dir> <fixture dir>
set -uo pipefail
PD=${PD:?protocol-docs checkout at main 4ab91d2 or later}
REC=${REC:-/workspace/timing/c123-protocol-docs/recordings/.cache/2026-09-19-2026-nkz-19so}
EXC=${EXC:-/workspace/timing/c123-protocol-docs/qa/excerpts/nkz-19so-0930-0945-v2}
FROM=${FROM:-9235773} TO=${TO:-10135773}     # 09:30:00–09:45:00 UTC from the recording's start (06:56:04.227Z)
ID=${ID:-nkz-19so-0930-0945}
WORK=${1:?work dir} FIX=${2:?fixture dir}
S2=$(cd "$(dirname "$0")" && pwd)
S1=$S2/../S1
REPLAY=${REPLAY:-$S1/dist/replay.js}
mkdir -p "$WORK" "$FIX"
run() { local t0=$SECONDS; "$@"; local rc=$?; echo "exit=$rc $((SECONDS-t0))s :: $*" >&2; return $rc; }

run node "$PD/tools/extract-excerpt.js" "$REC" --output "$EXC" --from "$FROM" --to "$TO" --label "nkz-19so 0930-0945 UTC (S2 spike)" || exit 1
(cd "$S1" && run npm run --silent build) || exit 1
for r in 1 2; do run node "$REPLAY" --excerpt "$EXC" --recording "$REC" --out "$WORK/run$r" || exit 1; done
run node "$S1/dist/checkerCli.js" "$WORK/run1/steps.jsonl" "$WORK/checker" > "$WORK/checker.txt" || exit 1
for r in 1 2; do
  run node "$S2/capture.mjs" --steps "$WORK/run$r/steps.jsonl" --excerpt "$EXC" --fixture-id "$ID" \
    --version-from "$S2/../../src/unified/UnifiedServer.ts" --out "$WORK/candidate$r.json" \
    --final-state "$WORK/run$r/final-state.json" --summary "$WORK/capture$r.json" > /dev/null || exit 1
done
run node "$S2/admit.mjs" --candidate "$WORK/candidate1.json" --candidate2 "$WORK/candidate2.json" \
  --run1 "$WORK/run1" --run2 "$WORK/run2" --checker "$WORK/checker.summary.json" --excerpt "$EXC" --recording "$REC" \
  --out "$FIX/$ID.fixture.json" --report "$FIX/$ID.gate3.json" > "$WORK/admit.json" || exit 1
cat "$WORK/admit.json"
