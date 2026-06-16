/**
 * True when `value` (an ISO yyyy-mm-dd date string) is strictly before
 * `todayISO` (same format). Empty/missing values are never flagged — the caller
 * decides whether empty is allowed. String comparison is valid for zero-padded
 * ISO dates.
 */
export function isPastDate(value: string, todayISO: string): boolean {
  if (!value) return false;
  return value < todayISO;
}
