/**
 * Turn a Better Auth magic-link *verify* URL into a link to our confirmation
 * interstitial (`/sign-in/verify`).
 *
 * WHY: the raw verify endpoint (`/api/auth/magic-link/verify`) consumes the
 * single-use token on the FIRST GET (Better Auth deletes it atomically). Emailing
 * that URL directly lets email security scanners, link-preview bots, and antivirus
 * proxies burn the token before the human clicks — the human's click then fails
 * with INVALID_TOKEN. The interstitial is a plain GET page that consumes NOTHING;
 * only a human form submit (a POST server action) proceeds to the real verify
 * endpoint, so automated GETs can no longer break sign-in.
 *
 * Pure and defensive: if the input can't be parsed or carries no token, it is
 * returned unchanged so sign-in never breaks on an unexpected URL shape.
 */
export function toConfirmSignInUrl(verifyUrl: string): string {
  try {
    const u = new URL(verifyUrl);
    const token = u.searchParams.get("token");
    if (!token) return verifyUrl;
    const callbackURL = u.searchParams.get("callbackURL") ?? "/app";
    const confirm = new URL("/sign-in/verify", u.origin);
    confirm.searchParams.set("token", token);
    confirm.searchParams.set("callbackURL", callbackURL);
    return confirm.toString();
  } catch {
    return verifyUrl;
  }
}
