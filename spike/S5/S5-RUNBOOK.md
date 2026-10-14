# S5 Runbook — on-site hardware (Windows laptop)

Goal: CPU/memory/push-latency of a real ingest process at 1x and 10x replay with two WS clients, plus
(if Canoe123 is on the laptop) how often a read lands mid-write on its real XML file. Budget: ~1 hour.
No developer tooling needed beyond **Node.js** and **git** at the venue (see "Before you leave the office").
This never touches c123-server's production code — it only runs a throwaway spike process.

## Before you leave the office (needs internet; do this once, ahead of time)

```powershell
# c123-server checkout, spike/m0 branch (brings spike/S1 AND spike/S5)
cd <your c123-server checkout>; git fetch origin; git checkout spike/m0; git pull --ff-only
cd spike\S1; npm install; npm run build
cd ..\S5;    npm install; npm run build

# c123-protocol-docs checkout (player.js + the recording). Needs gh CLI authenticated once
# (repo scope) to fetch from the private GitHub Release — see recordings/README.md.
cd ..\..\..\c123-protocol-docs
node tools\recordings-cli.js fetch 2026-09-19-2026-nkz-19so
```

If the venue has no internet, everything above is done; nothing below needs it.

## At the venue

Open 4 terminal windows (PowerShell): **Player**, **Server**, **Client 1**, **Client 2**.

**1. Sanity check at 1x (~1 min).** Player window:
```powershell
cd c123-protocol-docs
node tools\player.js "$(node tools\recordings-cli.js path 2026-09-19-2026-nkz-19so)" `
  --autoplay --speed 1 --xml-out C:\temp\c123-replay.xml
```
Server window:
```powershell
cd c123-server\spike\S5
node dist\S5\src\server.js --xml C:\temp\c123-replay.xml --tcp-port 27333 --ws-port 27501
```
Confirm `[tcp] connected` and `[status]` lines with `attempts` and `deltas` both growing. Note the server's
Node process PID (`Get-Process node | Select Id,StartTime` — match the newest one, or Task Manager → Details
tab, right-click column header → add "Command line").

**2. Two clients, still at 1x (~1 min):**
```powershell
node dist\S5\src\client.js --url ws://localhost:27501 --label c1
node dist\S5\src\client.js --url ws://localhost:27501 --label c2
```
Let them run a minute, `Ctrl+C` each, copy the printed `SUMMARY {...}` line (count, p50Ms, p95Ms, maxMs) into
`S5-RESULTS.md`. Restart both clients (they'll run through the rest of the hour).

**3. Confirm 10x and switch (already confirmed on Linux — see S5-report.md — trust it, don't approximate with
repeated `/seek` calls).** In the Player window, `Ctrl+C`, then restart with `--speed 10` (same command line,
`--speed 10`). The whole day's recording (~8h52m) plays in ~53 min at 10x — about the hour you have.

**4. "Start" sample.** In a 5th window:
```powershell
powershell -File c123-server\spike\S5\sampler.ps1 -ProcessId <server PID>
```
Paste the output into `S5-RESULTS.md` under **start**.

**5. Let it run ~1 hour.** Leave Player (10x), Server, Client 1, Client 2 running.

**6. Step 2b — only if Canoe123 itself is installed and loaded with an event on this laptop.** In Canoe123,
turn on the XML export timer (10 min) for any loaded event. In a 6th window, point a second S5 server at
Canoe123's real export file (TCP doesn't matter here — leave `--tcp-port` pointing anywhere; ignore its
reconnect log lines):
```powershell
node dist\S5\src\server.js --xml "C:\Canoe123\Data\event.xml" --tcp-port 1 --ws-port 27502 --poll-ms 5000
```
Let it run ~10 minutes, then `Ctrl+C` it and copy the printed `[shutdown]` JSON block — specifically
`xmlStats` (`ticks`, `changed`, `validationFailures`, `retriesUsed`, `recoveredAfterRetry`, `gaveUpAfterRetries`)
— into `S5-RESULTS.md`. If Canoe123 is not on this laptop, write "not available" in that section instead.

**7. "After one hour" sample.** Same as step 4, same PID, into `S5-RESULTS.md` under **+1h**.

**8. Finish.** `Ctrl+C`, in order: Client 1 and Client 2 (copy their final `SUMMARY`), Server (copy the
`[shutdown]` JSON — `ingestStats`, `domainStats`, `xmlStats`, `totalDeltas`), Player. One more sample
(step 4) into `S5-RESULTS.md` under **end**. Send back the filled `S5-RESULTS.md`.

## Troubleshooting

- **Port already in use:** add `--ws-port 27511` / `--tcp-port 27334` consistently to server + player + clients.
- **`recordings-cli.js fetch` needs `gh` auth and you're offline:** fetch at the office (above), or copy
  `c123-protocol-docs/recordings/.cache/2026-09-19-2026-nkz-19so/` to the laptop via USB.
- **Several `node.exe` in Task Manager:** match by command line (contains `dist\S5\src\server.js`), not by
  CPU/memory — there may be a Player `node.exe` too.
