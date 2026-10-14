#!/usr/bin/env bash
# BRIEFS S1 step 4: replay each excerpt twice in separate processes; compare sha256 of the step log and final state.
set -u
EXC=/workspace/timing/c123-protocol-docs/qa/excerpts
REC=/workspace/timing/c123-protocol-docs/recordings/.cache/2026-09-19-2026-nkz-19so
OUT=${1:?out dir}
cd "$(dirname "$0")"
for w in 0750-0800 0930-0945 1005-1030 1044-1057; do
  for run in 1 2; do
    node dist/replay.js --excerpt $EXC/nkz-19so-$w --recording $REC --out $OUT/$w/run$run > $OUT/$w.run$run.log 2>&1
    echo "$w run$run exit=$? $(tail -3 $OUT/$w.run$run.log | tr '\n' ' ')"
  done
  a=$(sha256sum $OUT/$w/run1/steps.jsonl | cut -c1-64); b=$(sha256sum $OUT/$w/run2/steps.jsonl | cut -c1-64)
  c=$(sha256sum $OUT/$w/run1/final-state.json | cut -c1-64); d=$(sha256sum $OUT/$w/run2/final-state.json | cut -c1-64)
  echo "$w steps $( [ "$a" = "$b" ] && echo MATCH || echo DIFFER ) $a $b"
  echo "$w state $( [ "$c" = "$d" ] && echo MATCH || echo DIFFER ) $c $d"
done
