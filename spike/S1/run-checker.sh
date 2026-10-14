#!/usr/bin/env bash
# Replays the four nkz-19so excerpts once and runs the gate-2 checker over each step log.
set -u
EXC=/workspace/timing/c123-protocol-docs/qa/excerpts
REC=/workspace/timing/c123-protocol-docs/recordings/.cache/2026-09-19-2026-nkz-19so
OUT=${1:?out dir}
cd "$(dirname "$0")"
for w in ${WINDOWS:-0750-0800 0930-0945 1005-1030 1044-1057}; do
  node dist/replay.js --excerpt $EXC/nkz-19so-$w --recording $REC --out $OUT/$w > $OUT/$w.replay.log 2>&1 || echo "$w replay exit $?"
  node dist/checkerCli.js $OUT/$w/steps.jsonl $OUT/$w.checker.json > $OUT/$w.checker.txt 2>&1 || echo "$w checker exit $?"
  echo "== $w $(head -1 $OUT/$w.replay.log)"; grep -E 'violations [1-9]' $OUT/$w.checker.txt
done
