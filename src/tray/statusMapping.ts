/**
 * Map a /api/status response (or a fetch failure) to a TrayStatus + message.
 *
 * This is the status-mapping core of the standalone tray monitor, extracted
 * as a pure function so it can be unit-tested without pulling in systray2.
 *
 * Priority (first match wins):
 *   error   — fetch failed, or any source is terminally `disconnected`
 *   warning — no sources configured, or any source is `connecting` (transient)
 *   ok      — all sources are `connected`
 *
 * Rationale:
 *   A permanently `disconnected` source (wrong XML path, dead TCP host) is a
 *   red state that won't recover on its own, so the tray should be red — not
 *   yellow "reconnecting". A `connecting` source, by contrast, is a normal
 *   transient state during reconnect backoff and stays yellow. The previous
 *   implementation conflated the two.
 */

import type { TrayStatus } from './icons.js';
import type { ServerStatusResponse, SourceStatusInfo } from '../admin/types.js';

export interface TrayStatusResult {
  status: TrayStatus;
  message: string;
}

/**
 * Subset of ServerStatusResponse that the tray monitor actually needs.
 * Using a subset (rather than the full type) keeps this function resilient
 * to non-breaking schema additions on the server side.
 */
export type MinimalStatusResponse = Pick<ServerStatusResponse, 'sources' | 'event'>;

/**
 * Map a status response (or a fetch failure) to tray state.
 *
 * @param data         parsed `/api/status` body, or `null` if fetch failed
 * @param fetchError   optional fetch error message — if set, always produces `error`
 */
export function mapStatusResponse(
  data: MinimalStatusResponse | null,
  fetchError?: string,
): TrayStatusResult {
  if (fetchError) {
    return { status: 'error', message: fetchError };
  }
  if (!data) {
    return { status: 'error', message: 'Server unreachable' };
  }

  const sources: SourceStatusInfo[] = data.sources ?? [];
  const disconnected = sources.filter((s) => s.status === 'disconnected');
  const connecting = sources.filter((s) => s.status === 'connecting');

  // disconnected wins over everything else: a terminal failure is red.
  if (disconnected.length > 0) {
    const names = disconnected.map((s) => s.name).join(', ');
    return {
      status: 'error',
      message: `${disconnected.length} source(s) disconnected: ${names}`,
    };
  }

  if (sources.length === 0) {
    return { status: 'warning', message: 'No data sources configured' };
  }

  if (connecting.length > 0) {
    const names = connecting.map((s) => s.name).join(', ');
    return {
      status: 'warning',
      message: `${connecting.length} source(s) reconnecting: ${names}`,
    };
  }

  // All sources connected.
  // `||` (not `??`) so an empty raceName string also falls through to the
  // default — otherwise the status bar would show "Status: " with nothing.
  const raceName = data.event?.raceName || 'C123 Server running';
  return { status: 'ok', message: raceName };
}
