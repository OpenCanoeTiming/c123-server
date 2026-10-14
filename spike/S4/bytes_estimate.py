#!/usr/bin/env python3
"""
S4 step 2 -- bytes/s from the push counts in out/*.json, using the assumed
per-push body-size constants documented below and in S4-report.md. Body
bytes only (JSON PUT body); HTTP request-line/header overhead is NOT
included and is noted separately as a fixed per-request addend.

Sizes are hand-counted from one representative envelope of each shape
(CONTRACTS Sec1.2's Observed<T> wire shape), not measured on the wire --
restated here so the figure can be recomputed with different assumptions.
"""
import json
import glob
import os

# -- assumed body bytes per push kind (see S4-report.md "Bytes" for the
# counted envelope each figure is based on) --
NR_GATES = 23  # most common course at these events (RaceConfig NrGates=23)
GATES_ARRAY_BYTES = 20 * NR_GATES + 40          # {"number":N,"penalty":0}, x23, + wrapper
RUNNING_PUSH_BYTES = 420                         # outcome{running} + timeToBeat, no gates
GATE_OR_STATUS_PUSH_BYTES = 345 + GATES_ARRAY_BYTES  # + full gates[] resend (Sec8.3: whole field)
SET_PUSH_BYTES = 150                             # attemptIds[<=4] + featuredByUpstream
CONTENT_PUSH_BYTES = 345 + GATES_ARRAY_BYTES + 130  # outcome(duration)+gates+placement
PLACEMENT_ONLY_PUSH_BYTES = 160                  # placement:{rank,order} alone
COLD_START_BYTES_PER_ATTEMPT = 1000              # blended: ~70% not-yet (~600B), ~30% finished (~1800B)
REBASELINE_ATTEMPT_BYTES = 1800                  # a fully-populated finished Attempt
LARGEST_PHASE_ATTEMPTS = 117                      # K1M_BR1_19/BR2_19/_20, nkz-19so cold-start XML

# blend for the on-course attempt_pushes_coalesced bucket: most throttled
# pushes are plain running ticks; a minority are the immediate status/gate
# pushes that also resend the gates array.
RUNNING_BLEND_GATE_FRACTION = 0.10


def attempt_push_bytes(n):
    return n * (
        (1 - RUNNING_BLEND_GATE_FRACTION) * RUNNING_PUSH_BYTES
        + RUNNING_BLEND_GATE_FRACTION * GATE_OR_STATUS_PUSH_BYTES
    )


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "out")
    rows = []
    for f in sorted(glob.glob(os.path.join(out_dir, "*.json"))):
        d = json.load(open(f))
        s = d["steady_state"]
        dur = d["window"]["duration_s"]

        cold_bytes = d["cold_start_attempt_count"] * COLD_START_BYTES_PER_ATTEMPT
        connect_burst_bytes = d["connect_burst_rows"] * CONTENT_PUSH_BYTES
        rebaseline_bytes = LARGEST_PHASE_ATTEMPTS * REBASELINE_ATTEMPT_BYTES

        steady_bytes = (
            attempt_push_bytes(s["attempt_pushes_coalesced"])
            + s["oncourse_set_pushes_coalesced"] * SET_PUSH_BYTES
            + s["results_row_pushes_content"] * CONTENT_PUSH_BYTES
            + s["results_row_pushes_placement_only"] * PLACEMENT_ONLY_PUSH_BYTES
        )
        steady_bytes_per_s = steady_bytes / dur

        busiest_min, busiest_count = s["busiest_minute_all_coalesced_pushes_combined"]
        # approximate mix: scale the recording's overall per-push-kind byte
        # mix onto the busiest minute's push count (stated assumption: the
        # busiest minute's mix matches the recording's overall mix).
        total_pushes = (
            s["attempt_pushes_coalesced"]
            + s["oncourse_set_pushes_coalesced"]
            + s["results_row_pushes_content"]
            + s["results_row_pushes_placement_only"]
        )
        avg_bytes_per_push = steady_bytes / total_pushes if total_pushes else 0
        busiest_minute_bytes_per_s = (busiest_count * avg_bytes_per_push) / 60.0

        rows.append({
            "event": d["event"],
            "duration_h": round(dur / 3600, 2),
            "cold_start_bytes": cold_bytes,
            "connect_burst_bytes": connect_burst_bytes,
            "steady_bytes_total": round(steady_bytes),
            "steady_bytes_per_s_avg": round(steady_bytes_per_s, 1),
            "busiest_minute_combined_pushes": busiest_count,
            "busiest_minute_bytes_per_s_approx": round(busiest_minute_bytes_per_s, 1),
            "busiest_minute_pushes_per_s": round(busiest_count / 60, 2),
        })

    print(json.dumps(rows, indent=2))
    print()
    print("Re-baseline (b) hypothetical, largest observed Phase "
          f"({LARGEST_PHASE_ATTEMPTS} Attempts): "
          f"{LARGEST_PHASE_ATTEMPTS * REBASELINE_ATTEMPT_BYTES} bytes, one push, never observed (0/7).")
    print()
    maxrow = max(rows, key=lambda r: r["busiest_minute_pushes_per_s"])
    print("7-recording maximum (busiest minute, coalesced, all resource kinds):",
          maxrow["event"], maxrow["busiest_minute_combined_pushes"], "pushes/min =",
          maxrow["busiest_minute_pushes_per_s"], "pushes/s,",
          maxrow["busiest_minute_bytes_per_s_approx"], "bytes/s (approx)")


if __name__ == "__main__":
    main()
