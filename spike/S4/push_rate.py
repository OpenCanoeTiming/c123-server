#!/usr/bin/env python3
"""
S4 -- live ingest rate and coalescing.

Derives the bridge's would-be push stream under CONTRACTS.md Sec8.3 directly from a
recording's raw TCP/XML stream (offline: reads recorded `ts`/`data`, no player,
no real-time replay, no merge core). This is NOT the merge core (that is S1's
job) -- it is a push-counting simulation faithful enough to produce rate and
byte numbers that can be recomputed, with every modelling choice stated below
and in spike/S4-report.md.

ASSUMPTIONS (E4 unless stated otherwise; restated in the report):
  A1. Ingest reads only src=="tcp" OnCourse/Results/RaceConfig/Schedule
      messages, mirroring c123-server's actual TcpSource (verified: only
      TcpSource.ts/UdpDiscovery.ts exist under src/sources/; UdpDiscovery is
      discovery-only). UDP OnCourse (~equal volume on the wire) is therefore
      NOT double-counted.
  A2. Attempt status, for push-counting purposes only, is derived as:
        dtFinish non-empty      -> 'finished'      (immediate push, leaves set)
        dtStart non-empty       -> 'on-course'      (throttled push, in set)
        chStart=="1", else      -> 'at-start'       (in set, immediate on entry)
      This is DERIVATIONS Sec4.1's rule, simplified: it does not model
      left-without-finish's XML-snapshot-or-next-push fallback (S1's job);
      a silent disappearance is inferred here after a 2s gap with no
      dtFinish ever seen, and counted as one immediate push + one set-leave.
  A3. "Gate judgement" = the raw `Gates` cell string on the OnCourse Type=C
      row changes between two consecutive messages for the same (raceId,bib).
  A4. Per-Attempt coalescing (Sec8.3): while status=='on-course', a push is
      counted at most once per rolling second for that (raceId,bib); any
      status change or gate-judgement change forces an immediate push and
      resets the 1s window. "Uncoalesced" = a push counted on every message
      where the tuple (status, gates, pen, time) differs from the previous
      message for that key (i.e. coalescing switched off, duplicates still
      suppressed).
  A5. The on-course SET resource (Sec8.3) is modelled as one ordered list of
      currently-on-course/at-start keys, ordered by each key's last-seen
      `Position`. A "true" change event fires when a key enters/leaves the
      set, or any current member's Position changes. "Coalesced" collapses
      true-change events falling in the same whole wall-clock second to one
      push (Sec2.8: "the bridge coalesces per resource" -- under backlog,
      one current state per resource); "uncoalesced" counts every true-change
      event separately. `featuredByUpstream` is not observable on TCP
      (maintainer gap 21, CONTRACTS Sec8.3); this model never varies it, so
      a featured-only change can never be the trigger here -- stated as a
      DESIGN-GAP candidate, not simulated.
  A6. Results-row Attempt pushes: every Results message (Current=Y or N) is
      diffed, row by row, against the last presented snapshot of that RaceId
      (key: Bib, fields: Pen, Gates, Time, Total, Rank, RankOrder, IRM, PP, Q,
      HeatNr). An unchanged row costs 0 pushes; a changed or new row costs 1.
      This already implements "a rotation push of an unchanged race is zero
      pushes" literally.
  A7. Cold-start burst (a): the number of `<Results>` start-list entries
      (RaceId+Bib pairs) in the FIRST XmlSnapshot of the recording. One push
      per Attempt; no coalescing applies (Sec2.8 coalesces same-resource
      writes, and cold start touches each Attempt resource exactly once).
  A8. Re-baseline (b): zero occurrences in all 7 recordings (confirmed: the
      re-run wizard was used 0 times in every recording, per
      c123-recordings-profile.log.txt and TEST-ARCHITECTURE.md Sec"Re-baseline
      events in fixtures" -- "No recording contains one, because the
      operator never used the tool"). Reported as 0 actual; a hypothetical
      cost is computed separately from the largest Phase's attempt count.
  A9. TCP (re)connect burst, UPSTREAM-NEW (see DESIGN-GAPS.md S4-1): the
      FIRST live Results push this analysis ever sees for a given RaceId
      (after the xml_prefinished seed is applied) routinely carries most or
      all of that race's rows already placed -- not just the one row of a
      fresh finish. Measured directly (2026-04-19-jarni-ne-odp, first chunk):
      the first live sighting of C1M_BR1_19 arrived 2.9s after the window
      opened and already carried 47 of its eventual 68 rows. DERIVATIONS and
      CONTRACTS describe only the XML-snapshot cold start (a); they say
      nothing about what a fresh TCP connection (or a bridge reconnect
      mid-event) replays for the race(s) Canoe123 currently holds as
      "current". This is counted separately, as `connect_burst_rows`, and
      EXCLUDED from steady-state (c): charging it to (c) would overstate the
      ongoing per-minute rate with a one-time-per-race startup cost.

Usage: python3 push_rate.py <event-dir-under-.cache> [--limit-chunks N]
Output: spike/S4/out/<event>.json
"""
import sys
import os
import re
import json
import datetime
from collections import defaultdict, Counter

CACHE_ROOT = "/workspace/timing/c123-protocol-docs/recordings/.cache"

ATTR_RE = re.compile(r'(\w+)="([^"]*)"')
PARTICIPANT_RE = re.compile(r'<Participant\b([^>]*)/>')
RESULT_RE = re.compile(r'<Result\b([^>]*)/>')
ONCOURSE_ENV_RE = re.compile(r'<OnCourse\b([^>]*)>')
RESULTS_ENV_RE = re.compile(r'<Results\b([^>]*)>')
ROW_RE = re.compile(r'<Row\b[^>]*>(.*?)</Row>', re.S)
XML_RESULTS_BLOCK_RE = re.compile(r'<Results>(.*?)</Results>', re.S)
XML_RACEID_RE = re.compile(r'<RaceId>(.*?)</RaceId>')
XML_BIB_RE = re.compile(r'<Bib>(.*?)</Bib>')
XML_DTFINISH_RE = re.compile(r'<dtFinish>([^<]*)</dtFinish>')
XML_RNK_RE = re.compile(r'<Rnk>([^<]*)</Rnk>')
XML_STATUS_RE = re.compile(r'<Status>([^<]*)</Status>')


def attrs(s):
    return dict(ATTR_RE.findall(s))


def parse_oncourse(data):
    """Returns (raceId, bib, status, gates, pen, time, position, total) or None."""
    m = PARTICIPANT_RE.search(data)
    if not m:
        return None
    pa = attrs(m.group(1))
    race_id = pa.get("RaceId", "")
    bib = pa.get("Bib", "").strip()
    env = ONCOURSE_ENV_RE.search(data)
    env_a = attrs(env.group(1)) if env else {}
    position = env_a.get("Position", "")
    total = env_a.get("Total", "")
    c_attrs, t_attrs = {}, {}
    for rm in RESULT_RE.finditer(data):
        ra = attrs(rm.group(1))
        if ra.get("Type") == "C":
            c_attrs = ra
        elif ra.get("Type") == "T":
            t_attrs = ra
    dt_finish = c_attrs.get("dtFinish", "")
    dt_start = c_attrs.get("dtStart", "")
    ch_start = c_attrs.get("chStart", "")
    gates = c_attrs.get("Gates", "")
    pen = t_attrs.get("Pen", "")
    time_v = t_attrs.get("Time", "")
    if dt_finish:
        status = "finished"
    elif dt_start:
        status = "on-course"
    elif ch_start == "1":
        status = "at-start"
    else:
        status = "other"
    return race_id, bib, status, gates, pen, time_v, position, total


def parse_results_rows(data):
    """Yields (raceId, current, bib, content_tuple, placement_tuple) per row.

    Split per CONTRACTS Sec5.3: an unplaced (marked) Attempt is presented with
    `rank: null, order: null`, constant, regardless of upstream's own raw
    RankOrder (which upstream still increments for DNS/DNF rows purely as its
    own internal grid sort key -- see DESIGN-GAPS.md S4-2). So `placement`
    is forced constant ('', '') whenever IRM is non-empty; it is only a real,
    diffable field for an actually-placed (unmarked) row.
    """
    env = RESULTS_ENV_RE.search(data)
    env_a = attrs(env.group(1)) if env else {}
    race_id = env_a.get("RaceId", "")
    current = env_a.get("Current", "")
    rows = []
    for rm in ROW_RE.finditer(data):
        block = rm.group(1)
        pm = PARTICIPANT_RE.search(block)
        bib = attrs(pm.group(1)).get("Bib", "").strip() if pm else None
        tm = RESULT_RE.search(block)
        ra = attrs(tm.group(1)) if tm else {}
        irm = ra.get("IRM", "")
        content_tuple = (
            ra.get("Pen", ""), ra.get("Gates", ""), ra.get("Time", ""),
            ra.get("Total", ""), irm, ra.get("PP", ""), ra.get("Q", ""),
            ra.get("HeatNr", ""),
        )
        placement_tuple = (
            ("", "") if irm else (ra.get("Rank", ""), ra.get("RankOrder", ""))
        )
        if bib is not None:
            rows.append((bib, content_tuple, placement_tuple))
    return race_id, current, rows


def iter_chunk_lines(event_dir, limit_chunks=None):
    manifest_path = os.path.join(CACHE_ROOT, event_dir, "manifest.json")
    with open(manifest_path) as f:
        manifest = json.load(f)
    chunks = sorted(manifest["chunks"], key=lambda c: c["seq"])
    if limit_chunks:
        chunks = chunks[:limit_chunks]
    for chunk in chunks:
        path = os.path.join(CACHE_ROOT, event_dir, chunk["file"])
        with open(path, "r", encoding="utf-8") as f:
            first = f.readline()
            meta = json.loads(first)["_meta"]
            chunk_start = datetime.datetime.fromisoformat(
                meta["startTime"].replace("Z", "+00:00")
            )
            for line in f:
                yield chunk_start, line


def floor_second(dt):
    return dt.replace(microsecond=0)


def minute_key(dt):
    return dt.strftime("%Y-%m-%dT%H:%M")


def analyze(event_dir, limit_chunks=None):
    # Attempt (on-course) coalescing state
    last_status = {}
    last_gates = {}
    last_pen = {}
    last_time = {}
    last_push_time = {}
    last_seen_time = {}
    never_finished_since = {}  # key -> True once 'finished' seen, to avoid double 'left' detection

    # on-course SET state
    set_members = {}       # key -> position (string)
    set_order_snapshot = []  # last pushed ordering, as list of keys

    # Results-row diff state
    results_state = {}      # raceId -> {bib: field_tuple}
    race_first_live_seen = set()  # raceId already seen live at least once
    connect_burst_rows = 0

    cold_start_count = None
    xml_snapshot_seen = False
    xml_prefinished = set()  # (raceId, bib) already carrying a presented result
                              # before this recording's window -- seeded from
                              # the first XmlSnapshot so the first live TCP
                              # sighting of a pre-existing finished row is not
                              # double-counted against the cold-start burst (a).
                              # See report "Cold-start / TCP-reconnect overlap".

    minute_attempt_coalesced = Counter()
    minute_attempt_uncoalesced = Counter()
    minute_set_coalesced = Counter()
    minute_set_uncoalesced = Counter()
    minute_results_rows = Counter()

    total_attempt_coalesced = 0
    total_attempt_uncoalesced = 0
    total_set_coalesced = 0
    total_set_uncoalesced = 0
    total_results_rows = 0
    total_results_rows_content = 0
    total_results_rows_placement_only = 0
    total_oncourse_messages = 0
    total_results_messages = 0
    left_without_finish_inferred = 0

    pending_true_change_seconds = set()  # which whole-seconds had >=1 true SET change

    first_ts = None
    last_ts = None

    for chunk_start, line in iter_chunk_lines(event_dir, limit_chunks):
        # Fast pre-filter before JSON parsing.
        if '"type":"OnCourse"' in line:
            if '"src":"tcp"' not in line:
                continue
            rec = json.loads(line)
            abs_time = chunk_start + datetime.timedelta(milliseconds=rec["ts"])
            if first_ts is None:
                first_ts = abs_time
            last_ts = abs_time
            parsed = parse_oncourse(rec["data"])
            if parsed is None:
                continue
            race_id, bib, status, gates, pen, time_v, position, total = parsed
            if not race_id or not bib:
                continue
            key = (race_id, bib)
            total_oncourse_messages += 1

            prev_status = last_status.get(key)
            prev_gates = last_gates.get(key)
            prev_pen = last_pen.get(key)
            prev_time = last_time.get(key)
            true_change = (
                status != prev_status or gates != prev_gates or
                pen != prev_pen or time_v != prev_time
            )
            status_changed = status != prev_status
            gates_changed = gates != prev_gates and prev_gates is not None

            if true_change:
                total_attempt_uncoalesced += 1
                minute_attempt_uncoalesced[minute_key(abs_time)] += 1

            if status_changed or gates_changed:
                total_attempt_coalesced += 1
                minute_attempt_coalesced[minute_key(abs_time)] += 1
                last_push_time[key] = abs_time
            elif status == "on-course":
                lp = last_push_time.get(key)
                if lp is None or (abs_time - lp).total_seconds() >= 1.0:
                    total_attempt_coalesced += 1
                    minute_attempt_coalesced[minute_key(abs_time)] += 1
                    last_push_time[key] = abs_time

            last_status[key] = status
            last_gates[key] = gates
            last_pen[key] = pen
            last_time[key] = time_v
            last_seen_time[key] = abs_time

            # on-course SET membership
            set_true_change = False
            if status in ("at-start", "on-course"):
                prev_pos = set_members.get(key)
                if prev_pos != position:
                    set_true_change = True
                set_members[key] = position
            elif status == "finished":
                if key in set_members:
                    del set_members[key]
                    set_true_change = True

            # left-without-finish: scan for stale 'on-course'/'at-start' keys not
            # seen in >2s with no finish ever -- cheap approximate sweep, only
            # when we've just touched this race (bounded cost: dict is small,
            # at most a handful of simultaneous on-course keys in this format).
            stale = [
                k for k, t in list(last_seen_time.items())
                if k in set_members and (abs_time - t).total_seconds() > 2.0
            ]
            for k in stale:
                del set_members[k]
                left_without_finish_inferred += 1
                set_true_change = True
                total_attempt_uncoalesced += 1
                total_attempt_coalesced += 1
                minute_attempt_uncoalesced[minute_key(abs_time)] += 1
                minute_attempt_coalesced[minute_key(abs_time)] += 1

            if set_true_change:
                ordered = sorted(set_members.items(), key=lambda kv: kv[0])
                ordered_keys = tuple(k for k, _ in sorted(
                    set_members.items(), key=lambda kv: (kv[1] or "", kv[0])
                ))
                if ordered_keys != tuple(set_order_snapshot):
                    total_set_uncoalesced += 1
                    minute_set_uncoalesced[minute_key(abs_time)] += 1
                    pending_true_change_seconds.add(floor_second(abs_time))
                    set_order_snapshot = list(ordered_keys)

        elif '"type":"Results"' in line:
            if '"src":"tcp"' not in line:
                continue
            rec = json.loads(line)
            abs_time = chunk_start + datetime.timedelta(milliseconds=rec["ts"])
            if first_ts is None:
                first_ts = abs_time
            last_ts = abs_time
            race_id, current, rows = parse_results_rows(rec["data"])
            if not race_id:
                continue
            total_results_messages += 1
            prev = results_state.setdefault(race_id, {})
            is_connect_burst = race_id not in race_first_live_seen
            race_first_live_seen.add(race_id)
            changed = 0
            changed_content = 0
            changed_placement_only = 0
            for bib, content_tuple, placement_tuple in rows:
                key = (race_id, bib)
                combined = (content_tuple, placement_tuple)
                if bib not in prev and key in xml_prefinished:
                    # First live sighting of a row the cold-start XML snapshot
                    # already carried a result for: baseline-establishing,
                    # already counted once under (a), not a fresh push.
                    prev[bib] = combined
                    continue
                prev_combined = prev.get(bib)
                if prev_combined != combined:
                    content_changed = prev_combined is None or prev_combined[0] != content_tuple
                    placement_changed = prev_combined is None or prev_combined[1] != placement_tuple
                    if is_connect_burst:
                        connect_burst_rows += 1
                    else:
                        changed += 1
                        if content_changed:
                            changed_content += 1
                        elif placement_changed:
                            changed_placement_only += 1
                    prev[bib] = combined
            if changed:
                total_results_rows += changed
                total_results_rows_content += changed_content
                total_results_rows_placement_only += changed_placement_only
                minute_results_rows[minute_key(abs_time)] += changed

        elif '"type":"XmlSnapshot"' in line and not xml_snapshot_seen:
            rec = json.loads(line)
            xml_snapshot_seen = True
            data = rec["data"]
            blocks = XML_RESULTS_BLOCK_RE.findall(data)
            pairs = set()
            for b in blocks:
                rid = XML_RACEID_RE.search(b)
                bib = XML_BIB_RE.search(b)
                if not (rid and bib):
                    continue
                key = (rid.group(1), bib.group(1).strip())
                pairs.add(key)
                dtf = XML_DTFINISH_RE.search(b)
                rnk = XML_RNK_RE.search(b)
                status = XML_STATUS_RE.search(b)
                if (dtf and dtf.group(1).strip()) or \
                   (rnk and rnk.group(1).strip()) or \
                   (status and status.group(1).strip()):
                    xml_prefinished.add(key)
            cold_start_count = len(pairs)
        else:
            continue

    # finalize SET coalescing: number of distinct whole-seconds containing a
    # true-change event
    total_set_coalesced = len(pending_true_change_seconds)
    for sec in pending_true_change_seconds:
        minute_set_coalesced[minute_key(sec)] += 1

    def busiest(counter):
        if not counter:
            return None, 0
        k, v = max(counter.items(), key=lambda kv: kv[1])
        return k, v

    combined = Counter()
    for c in (minute_attempt_coalesced, minute_set_coalesced, minute_results_rows):
        for k, v in c.items():
            combined[k] += v

    result = {
        "event": event_dir,
        "window": {
            "first_ts": first_ts.isoformat() if first_ts else None,
            "last_ts": last_ts.isoformat() if last_ts else None,
            "duration_s": (last_ts - first_ts).total_seconds() if first_ts and last_ts else None,
        },
        "cold_start_attempt_count": cold_start_count,
        "connect_burst_rows": connect_burst_rows,
        "steady_state": {
            "attempt_pushes_uncoalesced": total_attempt_uncoalesced,
            "attempt_pushes_coalesced": total_attempt_coalesced,
            "oncourse_set_pushes_uncoalesced": total_set_uncoalesced,
            "oncourse_set_pushes_coalesced": total_set_coalesced,
            "results_row_pushes": total_results_rows,
            "results_row_pushes_content": total_results_rows_content,
            "results_row_pushes_placement_only": total_results_rows_placement_only,
            "oncourse_messages_total": total_oncourse_messages,
            "results_messages_total": total_results_messages,
            "left_without_finish_inferred": left_without_finish_inferred,
            "busiest_minute_attempt_coalesced": busiest(minute_attempt_coalesced),
            "busiest_minute_attempt_uncoalesced": busiest(minute_attempt_uncoalesced),
            "busiest_minute_set_coalesced": busiest(minute_set_coalesced),
            "busiest_minute_set_uncoalesced": busiest(minute_set_uncoalesced),
            "busiest_minute_results_rows": busiest(minute_results_rows),
            "busiest_minute_all_coalesced_pushes_combined": busiest(combined),
        },
    }
    return result


if __name__ == "__main__":
    event = sys.argv[1]
    limit = None
    if "--limit-chunks" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit-chunks") + 1])
    out = analyze(event, limit)
    out_dir = os.path.join(os.path.dirname(__file__), "out")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{event}.json")
    with open(out_path, "w") as f:
        json.dump(out, f, indent=2)
    print(json.dumps(out, indent=2))
