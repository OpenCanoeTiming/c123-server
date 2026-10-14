#!/usr/bin/env bash
# BRIEFS S1 steps 4-5: replay each excerpt twice in separate processes, compare sha256 of the step log and the
# final state, then run the gate-2 checker over run 1.   Usage: ./run-determinism.sh <out dir>
set -u
Q=/workspace/timing/c123-protocol-docs/qa/excerpts
C=/workspace/timing/c123-protocol-docs/recordings/.cache
OUT=${1:?out dir}
cd "$(dirname "$0")"
for spec in nkz-19so-0750-0800:2026-09-19-2026-nkz-19so nkz-19so-0930-0945:2026-09-19-2026-nkz-19so \
            nkz-19so-1005-1030:2026-09-19-2026-nkz-19so nkz-19so-1044-1057:2026-09-19-2026-nkz-19so \
            cp3-cross-0845-0930:2026-04-26-cp3-cross; do
  w=${spec%%:*}; rec=${spec#*:}
  for run in 1 2; do
    node dist/replay.js --excerpt $Q/$w --recording $C/$rec --out $OUT/$w/run$run > $OUT/$w.run$run.log 2>&1
    echo "$w run$run exit=$? $(head -1 $OUT/$w.run$run.log)"
  done
  a=$(sha256sum $OUT/$w/run1/steps.jsonl | cut -c1-64); b=$(sha256sum $OUT/$w/run2/steps.jsonl | cut -c1-64)
  c=$(sha256sum $OUT/$w/run1/final-state.json | cut -c1-64); d=$(sha256sum $OUT/$w/run2/final-state.json | cut -c1-64)
  echo "$w steps.jsonl      $( [ "$a" = "$b" ] && echo MATCH || echo DIFFER ) $a $b"
  echo "$w final-state.json $( [ "$c" = "$d" ] && echo MATCH || echo DIFFER ) $c $d"
  node dist/checkerCli.js $OUT/$w/run1/steps.jsonl $OUT/$w.checker > $OUT/$w.checker.txt 2>&1; echo "$w checker exit=$?"
done
