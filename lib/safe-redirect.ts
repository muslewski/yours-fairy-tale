/**
 * Open-redirect guard for post-auth `callbackURL`/`next` values: only same-site
 * relative paths are allowed. A protocol-relative (`//host`) or absolute URL, or
 * anything not starting with `/`, falls back. Shared by the sign-in + verify pages.
 */
export function safeRelativePath(
  path: string | null | undefined,
  fallback = "/app",
): string {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}
