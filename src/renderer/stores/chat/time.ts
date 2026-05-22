/** Normalize a timestamp to milliseconds. Handles both seconds and ms. */
export function toMs(ts: number): number {
  // Timestamps < 1e12 are in seconds (before ~2033); >= 1e12 are milliseconds.
  return ts < 1e12 ? ts * 1000 : ts;
}
