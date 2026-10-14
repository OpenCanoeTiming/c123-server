# S5 Results — on-site hardware

Filled by the maintainer, following `S5-RUNBOOK.md`.

## Machine

- Model / CPU / RAM:
- OS + build:
- Node.js version (`node -v`):
- Disk (SSD/HDD, local or network):
- Date and venue:

## 1x sanity check

- `[tcp] connected` seen: yes / no
- `[status]` attempts/deltas growing: yes / no
- Client 1 SUMMARY: `count=`, `p50Ms=`, `p95Ms=`, `maxMs=`
- Client 2 SUMMARY: `count=`, `p50Ms=`, `p95Ms=`, `maxMs=`

## 10x confirmed

- Player showed `10x` and position advanced ~10x wall-clock: yes / no (paste one `/status` line if handy)

## CPU / memory samples (server process)

| when | CpuSeconds | WorkingSetMB | PrivateMB | Threads |
|---|---|---|---|---|
| start | | | | |
| +1h | | | | |
| end | | | | |

## Push latency, full run (two clients, ~1h at 10x)

| client | count | p50Ms | p95Ms | maxMs | minMs |
|---|---|---|---|---|---|
| c1 | | | | | |
| c2 | | | | | |

## Server final counters (`[shutdown]` JSON)

```json
<paste here>
```

## Step 2b — Canoe123's own XML file (file-watch torn-read count)

- Canoe123 available on this laptop: yes / no
- If yes: event loaded, export timer interval:
- Duration watched:
- `xmlStats` from the `[shutdown]` JSON:

```json
<paste xmlStats here, or "not available">
```

## Anomalies / notes

-
