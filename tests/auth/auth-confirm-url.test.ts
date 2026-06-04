import { expect, test } from "vitest";
import { toConfirmSignInUrl } from "@/lib/auth-confirm-url";

const VERIFY =
  "https://www.yoursfairytale.com/api/auth/magic-link/verify?token=abc123&callbackURL=%2Fapp";

test("rewrites a verify URL to the /sign-in/verify interstitial on the same origin", () => {
  const out = new URL(toConfirmSignInUrl(VERIFY));
  expect(out.origin).toBe("https://www.yoursfairytale.com");
  expect(out.pathname).toBe("/sign-in/verify");
  expect(out.searchParams.get("token")).toBe("abc123");
  expect(out.searchParams.get("callbackURL")).toBe("/app");
  // The raw consuming endpoint must NOT be what we email.
  expect(out.pathname).not.toContain("/api/auth/magic-link/verify");
});

test("defaults callbackURL to /app when absent", () => {
  const out = new URL(
    toConfirmSignInUrl("https://x.test/api/auth/magic-link/verify?token=t1"),
  );
  expect(out.searchParams.get("callbackURL")).toBe("/app");
  expect(out.searchParams.get("token")).toBe("t1");
});

test("returns the input unchanged when there is no token (defensive)", () => {
  const noToken = "https://x.test/api/auth/magic-link/verify";
  expect(toConfirmSignInUrl(noToken)).toBe(noToken);
});

test("returns the input unchanged when it is not a valid URL", () => {
  expect(toConfirmSignInUrl("not-a-url")).toBe("not-a-url");
});
