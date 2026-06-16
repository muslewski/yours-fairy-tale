/** Order statuses that end the production relationship and warrant a confirm step. */
const DESTRUCTIVE_STATUSES = new Set(["cancelled", "refunded"]);

export function isDestructiveStatus(status: string): boolean {
  return DESTRUCTIVE_STATUSES.has(status);
}
