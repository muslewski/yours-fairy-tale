import { expect, test } from "vitest";
import { buildMagicLinkEmail } from "@/lib/auth-emails";

test("magic-link email contains the sign-in url and a CTA", () => {
  const url = "https://yoursfairytale.com/api/auth/magic-link/verify?token=abc";
  const html = buildMagicLinkEmail(url);
  expect(html).toContain(url);
  expect(html).toContain("Sign in");
  expect(html).toContain("Your sign-in link");
});
